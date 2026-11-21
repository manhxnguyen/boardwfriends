import type { ClassicRoleId, ErrorCode, GameView, RoomView, SetupView } from '@bwf/protocol';
import { buildDeck, canDeal, EMPTY_SETUP, validateSetup, type Setup } from './classic/setup.ts';
import {
  applyLobby,
  createLobby,
  lobbyView,
  type EngineContext,
  type LobbyAction,
  type LobbyEvent,
  type LobbyState,
} from './lobby.ts';
import { shuffle, type Random } from './random.ts';

/**
 * A room = lobby (who is here) + game (M1: the "digital card deck").
 *
 * M1 flow: the host builds a deck in `setup`, deals it, everyone privately looks at their card,
 * and a human moderator (a player without a card) runs the game with the night script.
 */

export interface RoomContext extends EngineContext {
  random: Random;
}

export type GameState =
  | { phase: 'setup'; setup: Setup; round: number }
  | {
      phase: 'dealt';
      setup: Setup;
      round: number;
      /** playerId → card. The moderator and late joiners have no entry. */
      assignments: Record<string, ClassicRoleId>;
      /** Players who confirmed they looked at their card. */
      seen: string[];
    };

export interface RoomState {
  lobby: LobbyState;
  game: GameState;
}

export type RoomAction =
  | LobbyAction
  | { type: 'setup'; by: string; setup: Setup }
  | { type: 'deal'; by: string }
  | { type: 'seen'; playerId: string }
  | { type: 'reset'; by: string };

export type RoomEvent = LobbyEvent | { type: 'dealt'; round: number } | { type: 'reset' };

export type RoomResult =
  { ok: true; state: RoomState; events: RoomEvent[] } | { ok: false; error: ErrorCode };

export function createRoomState(code: string, now: number): RoomState {
  return { lobby: createLobby(code, now), game: { phase: 'setup', setup: EMPTY_SETUP, round: 0 } };
}

export function applyRoom(state: RoomState, action: RoomAction, ctx: RoomContext): RoomResult {
  switch (action.type) {
    case 'setup':
      return setup(state, action.by, action.setup, ctx);
    case 'deal':
      return deal(state, action.by, ctx);
    case 'seen':
      return markSeen(state, action.playerId, ctx);
    case 'reset':
      return reset(state, action.by, ctx);
    case 'join':
      // New faces cannot sit down mid-round; known tokens (reconnects) are always welcome.
      if (
        state.game.phase === 'dealt' &&
        !state.lobby.players.some((p) => p.token === action.token)
      ) {
        return { ok: false, error: 'game_in_progress' };
      }
      return lobbyStep(state, action, ctx);
    default:
      return lobbyStep(state, action, ctx);
  }
}

// ---------------------------------------------------------------------------
// Projections

/** What one player may see. Never includes tokens or other players' cards (except for the moderator). */
export function roomView(state: RoomState, playerId: string): RoomView {
  return { lobby: lobbyView(state.lobby), game: gameView(state, playerId) };
}

function gameView(state: RoomState, playerId: string): GameView {
  const { game } = state;
  const isHost = state.lobby.hostId === playerId;
  const isModerator = game.setup.moderatorId === playerId;
  const setupVisible = game.setup.publicRoles || isHost || isModerator;
  const setup: SetupView | null = setupVisible
    ? { ...game.setup, roles: { ...game.setup.roles } }
    : null;

  if (game.phase === 'setup') return { phase: 'setup', setup };

  const dealt = Object.keys(game.assignments);
  return {
    phase: 'dealt',
    round: game.round,
    setup,
    moderatorId: game.setup.moderatorId,
    yourRole: game.assignments[playerId] ?? null,
    youSeen: game.seen.includes(playerId),
    seenCount: game.seen.length,
    dealtCount: dealt.length,
    assignments: isModerator
      ? state.lobby.players
          .filter((p) => game.assignments[p.id])
          .map((p) => ({
            playerId: p.id,
            role: game.assignments[p.id]!,
            seen: game.seen.includes(p.id),
          }))
      : null,
  };
}

// ---------------------------------------------------------------------------

function lobbyStep(state: RoomState, action: LobbyAction, ctx: RoomContext): RoomResult {
  const result = applyLobby(state.lobby, action, ctx);
  if (!result.ok) return result;
  let game = state.game;
  for (const event of result.events) {
    if (event.type === 'left' || event.type === 'kicked') game = forgetPlayer(game, event.playerId);
  }
  return { ok: true, state: { lobby: result.state, game }, events: result.events };
}

/** A player who leaves loses their card and, if they were the moderator, that job. */
function forgetPlayer(game: GameState, playerId: string): GameState {
  const setup =
    game.setup.moderatorId === playerId ? { ...game.setup, moderatorId: null } : game.setup;
  if (game.phase === 'setup') return { ...game, setup };
  const { [playerId]: _removed, ...assignments } = game.assignments;
  return { ...game, setup, assignments, seen: game.seen.filter((id) => id !== playerId) };
}

function setup(state: RoomState, by: string, next: Setup, ctx: RoomContext): RoomResult {
  if (by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
  if (state.game.phase !== 'setup') return { ok: false, error: 'wrong_phase' };
  if (next.moderatorId !== null && !state.lobby.players.some((p) => p.id === next.moderatorId)) {
    return { ok: false, error: 'invalid_setup' };
  }
  const roles = Object.fromEntries(Object.entries(next.roles).filter(([, n]) => (n ?? 0) > 0));
  return {
    ok: true,
    state: touch({ ...state, game: { ...state.game, setup: { ...next, roles } } }, ctx),
    events: [],
  };
}

function deal(state: RoomState, by: string, ctx: RoomContext): RoomResult {
  if (by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
  if (state.game.phase !== 'setup') return { ok: false, error: 'wrong_phase' };
  const { setup } = state.game;
  const playerIds = state.lobby.players.map((p) => p.id);
  if (!canDeal(validateSetup(setup, playerIds))) return { ok: false, error: 'invalid_setup' };

  const seats = playerIds.filter((id) => id !== setup.moderatorId);
  const deck = shuffle(buildDeck(setup.roles), ctx.random);
  const assignments = Object.fromEntries(seats.map((id, i) => [id, deck[i]!]));
  const round = state.game.round + 1;
  return {
    ok: true,
    state: touch({ ...state, game: { phase: 'dealt', setup, round, assignments, seen: [] } }, ctx),
    events: [{ type: 'dealt', round }],
  };
}

function markSeen(state: RoomState, playerId: string, ctx: RoomContext): RoomResult {
  const { game } = state;
  if (game.phase !== 'dealt') return { ok: false, error: 'wrong_phase' };
  if (!game.assignments[playerId]) return { ok: false, error: 'no_card' };
  if (game.seen.includes(playerId)) return { ok: true, state, events: [] };
  return {
    ok: true,
    state: touch({ ...state, game: { ...game, seen: [...game.seen, playerId] } }, ctx),
    events: [],
  };
}

function reset(state: RoomState, by: string, ctx: RoomContext): RoomResult {
  if (by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
  if (state.game.phase !== 'dealt') return { ok: false, error: 'wrong_phase' };
  const { setup, round } = state.game;
  return {
    ok: true,
    state: touch({ ...state, game: { phase: 'setup', setup, round } }, ctx),
    events: [{ type: 'reset' }],
  };
}

function touch(state: RoomState, ctx: RoomContext): RoomState {
  return { ...state, lobby: { ...state.lobby, lastActivityAt: ctx.now } };
}
