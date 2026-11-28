import {
  CHAT_MAX_LENGTH,
  type ChatEntry,
  type ClassicRoleId,
  type ErrorCode,
  type GameClock,
  type GameView,
  type RoomView,
  type SetupView,
} from '@bwf/protocol';
import {
  applyClassic,
  classicDeadline,
  classicView,
  startClassic,
  type ClassicAction,
  type ClassicGame,
} from './classic/game.ts';
import { buildDeck, canDeal, EMPTY_SETUP, validateSetup, type Setup } from './classic/setup.ts';
import {
  applyLobby,
  createLobby,
  lobbyView,
  nextWakeAt,
  type EngineContext,
  type LobbyAction,
  type LobbyEvent,
  type LobbyState,
} from './lobby.ts';
import {
  applyOneNight,
  buildOneNightDeck,
  oneNightDeadline,
  oneNightView,
  startOneNight,
  type OneNightAction,
  type OneNightGame,
} from './one-night/game.ts';
import { validateOneNight } from './one-night/roles.ts';
import { shuffle, type Random } from './random.ts';

/**
 * A room = lobby (who is here) + game.
 *
 * - manual classic (M1): the host deals, a human moderator runs the game with the script.
 * - auto classic (M2): the app deals, narrates and resolves everything.
 * - one night (M3): the app deals and announces; always automatic.
 */

export interface RoomContext extends EngineContext {
  random: Random;
}

export type Play =
  { kind: 'classic'; game: ClassicGame } | { kind: 'one-night'; game: OneNightGame };

export type GameState =
  | { phase: 'setup'; setup: Setup; round: number }
  | {
      phase: 'dealt';
      setup: Setup;
      round: number;
      /** playerId → card. The moderator and late joiners have no entry. */
      assignments: Record<string, ClassicRoleId>;
      seen: string[];
      /** Night/day counter driven by the moderator (saved rooms: missing = not started). */
      clock?: GameClock | null;
      /** Players the moderator marked as eliminated. */
      dead?: string[];
    }
  | { phase: 'playing'; setup: Setup; round: number; play: Play };

export interface RoomState {
  lobby: LobbyState;
  game: GameState;
  /** Chat of eliminated players for the current round (saved rooms: missing = empty). */
  chat?: ChatEntry[];
}

/** Messages kept per round; older ones drop off. */
export const CHAT_HISTORY = 100;

export type VoiceCommand = 'nominate' | 'second' | 'start-vote' | 'pause' | 'resume' | 'end-day';

/** In-game actions from a player, or from the narrator display's microphone (`voice`). */
export type PlayAction =
  | { type: 'start'; by: string }
  | {
      type: 'act';
      playerId: string;
      players: string[];
      center: number[];
      witch?: 'save' | 'kill' | 'pass' | undefined;
    }
  | { type: 'nominate'; by: string; target: string }
  | { type: 'second'; by: string }
  | { type: 'vote'; playerId: string; choice: 'keep' | 'eliminate' }
  | { type: 'accuse'; playerId: string; target: string }
  | { type: 'pause'; by: string; paused: boolean }
  | { type: 'skip'; by: string }
  | { type: 'voice'; cmd: VoiceCommand; target?: string | undefined };

export type RoomAction =
  | LobbyAction
  | { type: 'setup'; by: string; setup: Setup }
  | { type: 'deal'; by: string }
  | { type: 'seen'; playerId: string }
  | { type: 'reset'; by: string }
  | { type: 'clock'; by: string; step: 1 | -1 }
  | { type: 'mark-dead'; by: string; playerId: string; dead: boolean }
  | { type: 'chat'; by: string; text: string }
  | PlayAction;

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
    case 'clock':
      return moveClock(state, action.by, action.step, ctx);
    case 'mark-dead':
      return markDead(state, action.by, action.playerId, action.dead, ctx);
    case 'chat':
      return chat(state, action.by, action.text, ctx);
    case 'reorder':
      if (state.game.phase !== 'setup') return { ok: false, error: 'wrong_phase' };
      return lobbyStep(state, action, ctx);
    case 'join':
      // New faces cannot sit down mid-round; known tokens (reconnects) are always welcome.
      if (
        state.game.phase !== 'setup' &&
        !state.lobby.players.some((p) => p.token === action.token)
      ) {
        return { ok: false, error: 'game_in_progress' };
      }
      return lobbyStep(state, action, ctx);
    case 'tick': {
      const lobby = lobbyStep(state, action, ctx);
      if (!lobby.ok || state.game.phase !== 'playing') return lobby;
      return playStep(lobby.state, { type: 'tick' }, ctx, lobby.events);
    }
    case 'start':
    case 'pause':
    case 'skip':
      if (action.by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
      return play(state, action, ctx);
    case 'act':
    case 'nominate':
    case 'second':
    case 'vote':
    case 'accuse':
      return play(state, action, ctx);
    case 'voice':
      if (state.game.phase !== 'playing' || !state.game.setup.voice) {
        return { ok: false, error: 'not_allowed' };
      }
      return play(state, action, ctx);
    default:
      return lobbyStep(state, action, ctx);
  }
}

/** Next game timer (night step, day clock, vote…), or null if no game is running or it is paused. */
export function gameDeadline(state: RoomState): number | null {
  const { game } = state;
  if (game.phase !== 'playing') return null;
  return game.play.kind === 'classic'
    ? classicDeadline(game.play.game)
    : oneNightDeadline(game.play.game);
}

/** Earliest moment the room needs a `tick` (lobby housekeeping or a game timer). */
export function roomWakeAt(state: RoomState): number {
  const lobbyAt = nextWakeAt(state.lobby);
  const gameAt = gameDeadline(state);
  return gameAt === null ? lobbyAt : Math.min(lobbyAt, gameAt);
}

// ---------------------------------------------------------------------------
// Projections

/**
 * What one viewer may see. `viewer` null = narrator display (public information only).
 * Never includes tokens or other players' cards (except for the manual-mode moderator).
 */
export function roomView(
  state: RoomState,
  viewer: string | null,
  now: number,
  displays = 0,
): RoomView {
  return {
    lobby: lobbyView(state.lobby, displays),
    game: gameView(state, viewer, now),
    deadChat: viewer !== null && canDeadChat(state, viewer) ? [...(state.chat ?? [])] : null,
    display: viewer === null,
  };
}

/** Eliminated players (manual: marked by the moderator) and the human moderator. */
export function canDeadChat(state: RoomState, playerId: string): boolean {
  const { game } = state;
  if (game.phase === 'dealt') {
    return game.setup.moderatorId === playerId || (game.dead ?? []).includes(playerId);
  }
  if (game.phase === 'playing' && game.play.kind === 'classic') {
    return game.play.game.alive[playerId] === false;
  }
  return false; // One Night: nobody is out until the very end.
}

function isModeratorOrHost(state: RoomState, by: string): boolean {
  return state.game.setup.moderatorId === by || state.lobby.hostId === by;
}

/** Manual mode: not started → night 1 → day 1 → night 2 → … (and back). */
function moveClock(state: RoomState, by: string, step: 1 | -1, ctx: RoomContext): RoomResult {
  const { game } = state;
  if (game.phase !== 'dealt') return { ok: false, error: 'wrong_phase' };
  if (!isModeratorOrHost(state, by)) return { ok: false, error: 'not_allowed' };
  // Position: 0 = not started, 1 = night 1, 2 = day 1, 3 = night 2…
  const at = (c: GameClock | null | undefined) =>
    c ? (c.n - 1) * 2 + (c.kind === 'night' ? 1 : 2) : 0;
  const next = Math.max(0, at(game.clock) + step);
  const clock: GameClock | null =
    next === 0 ? null : { kind: next % 2 === 1 ? 'night' : 'day', n: Math.ceil(next / 2) };
  return { ok: true, state: touch({ ...state, game: { ...game, clock } }, ctx), events: [] };
}

function markDead(
  state: RoomState,
  by: string,
  playerId: string,
  dead: boolean,
  ctx: RoomContext,
): RoomResult {
  const { game } = state;
  if (game.phase !== 'dealt') return { ok: false, error: 'wrong_phase' };
  if (!isModeratorOrHost(state, by)) return { ok: false, error: 'not_allowed' };
  if (!(playerId in game.assignments)) return { ok: false, error: 'unknown_player' };
  const others = (game.dead ?? []).filter((id) => id !== playerId);
  const next = dead ? [...others, playerId] : others;
  return { ok: true, state: touch({ ...state, game: { ...game, dead: next } }, ctx), events: [] };
}

function chat(state: RoomState, by: string, text: string, ctx: RoomContext): RoomResult {
  if (!canDeadChat(state, by)) return { ok: false, error: 'not_allowed' };
  const clean = text.trim().slice(0, CHAT_MAX_LENGTH);
  if (!clean) return { ok: false, error: 'invalid_action' };
  const history = state.chat ?? [];
  const entry: ChatEntry = {
    seq: (history.at(-1)?.seq ?? 0) + 1,
    from: by,
    text: clean,
    at: ctx.now,
  };
  const next = [...history, entry].slice(-CHAT_HISTORY);
  return { ok: true, state: touch({ ...state, chat: next }, ctx), events: [] };
}

function gameView(state: RoomState, viewer: string | null, now: number): GameView {
  const { game } = state;
  const isHost = viewer !== null && state.lobby.hostId === viewer;
  const isModerator = viewer !== null && game.setup.moderatorId === viewer;
  const setupVisible = game.setup.publicRoles || isHost || isModerator;
  const setup: SetupView | null = setupVisible ? copySetup(game.setup) : null;

  if (game.phase === 'setup') return { phase: 'setup', setup };

  if (game.phase === 'playing') {
    const play =
      game.play.kind === 'classic'
        ? classicView(game.play.game, viewer, now)
        : oneNightView(game.play.game, viewer, now);
    return { phase: 'playing', round: game.round, setup, play };
  }

  return {
    phase: 'dealt',
    round: game.round,
    setup,
    moderatorId: game.setup.moderatorId,
    yourRole: viewer ? (game.assignments[viewer] ?? null) : null,
    youSeen: viewer ? game.seen.includes(viewer) : false,
    seenCount: game.seen.length,
    dealtCount: Object.keys(game.assignments).length,
    clock: game.clock ?? null,
    dead: [...(game.dead ?? [])],
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

function copySetup(setup: Setup): SetupView {
  return { ...setup, roles: { ...setup.roles }, oneNightRoles: { ...setup.oneNightRoles } };
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

/** A player who leaves loses their manual-mode card and, if they were the moderator, that job. */
function forgetPlayer(game: GameState, playerId: string): GameState {
  const setup =
    game.setup.moderatorId === playerId ? { ...game.setup, moderatorId: null } : game.setup;
  if (game.phase === 'setup') return { ...game, setup };
  if (game.phase === 'playing') return { ...game, setup }; // [AD] their seat stays in the game.
  const { [playerId]: _removed, ...assignments } = game.assignments;
  return { ...game, setup, assignments, seen: game.seen.filter((id) => id !== playerId) };
}

function positive<T extends Partial<Record<string, number>>>(counts: T): T {
  return Object.fromEntries(Object.entries(counts).filter(([, n]) => (n ?? 0) > 0)) as T;
}

function setup(state: RoomState, by: string, next: Setup, ctx: RoomContext): RoomResult {
  if (by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
  if (state.game.phase !== 'setup') return { ok: false, error: 'wrong_phase' };
  if (next.moderatorId !== null && !state.lobby.players.some((p) => p.id === next.moderatorId)) {
    return { ok: false, error: 'invalid_setup' };
  }
  const clean: Setup = {
    ...next,
    roles: positive(next.roles),
    oneNightRoles: positive(next.oneNightRoles),
  };
  return {
    ok: true,
    state: touch({ ...state, game: { ...state.game, setup: clean } }, ctx),
    events: [],
  };
}

function deal(state: RoomState, by: string, ctx: RoomContext): RoomResult {
  if (by !== state.lobby.hostId) return { ok: false, error: 'not_host' };
  if (state.game.phase !== 'setup') return { ok: false, error: 'wrong_phase' };
  const { setup } = state.game;
  const playerIds = state.lobby.players.map((p) => p.id);
  const round = state.game.round + 1;
  const events: RoomEvent[] = [{ type: 'dealt', round }];
  const playing = (play: Play): RoomResult => ({
    ok: true,
    state: touch({ ...state, game: { phase: 'playing', setup, round, play } }, ctx),
    events,
  });

  if (setup.game === 'one-night') {
    const issues = validateOneNight(setup.oneNightRoles, playerIds.length);
    if (issues.some((i) => i.level === 'error')) return { ok: false, error: 'invalid_setup' };
    const deck = shuffle(buildOneNightDeck(setup.oneNightRoles), ctx.random);
    const game = startOneNight({
      seats: playerIds,
      deck,
      roles: setup.oneNightRoles,
      dayMinutes: setup.dayMinutes,
    });
    return playing({ kind: 'one-night', game });
  }

  const moderatorId = setup.mode === 'manual' ? setup.moderatorId : null;
  if (!canDeal(validateSetup({ roles: setup.roles, moderatorId }, playerIds))) {
    return { ok: false, error: 'invalid_setup' };
  }
  const seats = playerIds.filter((id) => id !== moderatorId);
  const deck = shuffle(buildDeck(setup.roles), ctx.random);
  const assignments = Object.fromEntries(seats.map((id, i) => [id, deck[i]!]));

  if (setup.mode === 'manual') {
    return {
      ok: true,
      state: touch(
        { ...state, game: { phase: 'dealt', setup, round, assignments, seen: [] } },
        ctx,
      ),
      events,
    };
  }
  const game = startClassic({
    seats,
    roles: assignments,
    deck: setup.roles,
    reveal: setup.reveal,
    dayMinutes: setup.dayMinutes,
    // Rooms saved before this option existed keep the official quiet first night.
    firstNightKill: setup.firstNightKill === true,
    wolfMajority: setup.wolfMajority === true,
    defenseMinutes: setup.defenseMinutes,
    seed: Math.floor(ctx.random() * 2 ** 32),
  });
  return playing({ kind: 'classic', game });
}

function markSeen(state: RoomState, playerId: string, ctx: RoomContext): RoomResult {
  const { game } = state;
  if (game.phase === 'playing') return playStep(state, { type: 'seen', playerId }, ctx);
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
  if (state.game.phase === 'setup') return { ok: false, error: 'wrong_phase' };
  const { setup, round } = state.game;
  return {
    ok: true,
    // A new round starts a new chat for the eliminated.
    state: touch({ ...state, chat: [], game: { phase: 'setup', setup, round } }, ctx),
    events: [{ type: 'reset' }],
  };
}

/** Translates a play action for whichever game is running. */
function play(state: RoomState, action: PlayAction, ctx: RoomContext): RoomResult {
  const { game } = state;
  if (game.phase !== 'playing') return { ok: false, error: 'wrong_phase' };
  const translated = game.play.kind === 'classic' ? toClassic(action) : toOneNight(action);
  if (!translated) return { ok: false, error: 'invalid_action' };
  return playStep(state, translated, ctx);
}

function toClassic(action: PlayAction): ClassicAction | null {
  switch (action.type) {
    case 'start':
      return { type: 'start' };
    case 'pause':
      return { type: 'pause', paused: action.paused };
    case 'skip':
      return { type: 'skip' };
    case 'act':
      return {
        type: 'act',
        playerId: action.playerId,
        players: action.players,
        witch: action.witch,
      };
    case 'nominate':
      return { type: 'nominate', by: action.by, target: action.target };
    case 'second':
      return { type: 'second', by: action.by };
    case 'vote':
      return { type: 'vote', playerId: action.playerId, choice: action.choice };
    case 'accuse':
      return null;
    case 'voice':
      switch (action.cmd) {
        case 'nominate':
          return action.target ? { type: 'nominate', by: null, target: action.target } : null;
        case 'second':
          return { type: 'second', by: null };
        case 'start-vote':
          return { type: 'start-vote' };
        case 'pause':
          return { type: 'pause', paused: true };
        case 'resume':
          return { type: 'pause', paused: false };
        case 'end-day':
          return { type: 'skip' };
      }
  }
}

function toOneNight(action: PlayAction): OneNightAction | null {
  switch (action.type) {
    case 'start':
      return { type: 'start' };
    case 'pause':
      return { type: 'pause', paused: action.paused };
    case 'skip':
      return { type: 'skip' };
    case 'act':
      return {
        type: 'act',
        playerId: action.playerId,
        players: action.players,
        center: action.center,
      };
    case 'accuse':
      return { type: 'accuse', playerId: action.playerId, target: action.target };
    case 'nominate':
    case 'second':
    case 'vote':
      return null;
    case 'voice':
      switch (action.cmd) {
        case 'pause':
          return { type: 'pause', paused: true };
        case 'resume':
          return { type: 'pause', paused: false };
        case 'start-vote':
        case 'end-day':
          return { type: 'skip' };
        default:
          return null;
      }
  }
}

function playStep(
  state: RoomState,
  action: ClassicAction | OneNightAction,
  ctx: RoomContext,
  events: RoomEvent[] = [],
): RoomResult {
  const { game } = state;
  if (game.phase !== 'playing') return { ok: false, error: 'wrong_phase' };
  let next: Play;
  if (game.play.kind === 'classic') {
    const r = applyClassic(game.play.game, action as ClassicAction, ctx.now);
    if (!r.ok) return r;
    next = { kind: 'classic', game: r.game };
  } else {
    const r = applyOneNight(game.play.game, action as OneNightAction, ctx);
    if (!r.ok) return r;
    next = { kind: 'one-night', game: r.game };
  }
  const base = action.type === 'tick' ? state : touch(state, ctx);
  return { ok: true, state: { ...base, game: { ...game, play: next } }, events };
}

function touch(state: RoomState, ctx: RoomContext): RoomState {
  return { ...state, lobby: { ...state.lobby, lastActivityAt: ctx.now } };
}
