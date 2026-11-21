import { MAX_PLAYERS, type ErrorCode, type LobbyView } from '@bwf/protocol';

/**
 * Lobby: who is in the room and who is host.
 *
 * Pure module: no I/O, no clock, no randomness. Time and id generation are injected through
 * `EngineContext` so every transition is deterministic and testable.
 */

/** A disconnected host keeps the role this long before it moves to someone else. */
export const HOST_GRACE_MS = 60_000;
/** A room with no activity for this long is deleted. */
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

export interface Player {
  id: string;
  /** Secret used to reclaim this seat. Must never leave the server. */
  token: string;
  name: string;
  joinedAt: number;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  createdAt: number;
  lastActivityAt: number;
  hostId: string | null;
  /** When the current host lost its connection; null while the host is connected. */
  hostLostAt: number | null;
  /** Ordered by join time (oldest first). */
  players: Player[];
}

export interface EngineContext {
  now: number;
  newId: () => string;
}

export type LobbyAction =
  | { type: 'join'; token: string; name: string }
  | { type: 'connected'; playerId: string }
  | { type: 'disconnected'; playerId: string }
  | { type: 'rename'; playerId: string; name: string }
  | { type: 'leave'; playerId: string }
  | { type: 'kick'; by: string; target: string }
  | { type: 'tick' };

export type LobbyEvent =
  | { type: 'joined'; playerId: string; rejoined: boolean }
  | { type: 'left'; playerId: string }
  | { type: 'kicked'; playerId: string }
  | { type: 'host_changed'; hostId: string | null };

export type LobbyResult =
  { ok: true; state: LobbyState; events: LobbyEvent[] } | { ok: false; error: ErrorCode };

export function createLobby(code: string, now: number): LobbyState {
  return { code, createdAt: now, lastActivityAt: now, hostId: null, hostLostAt: null, players: [] };
}

export function applyLobby(
  state: LobbyState,
  action: LobbyAction,
  ctx: EngineContext,
): LobbyResult {
  switch (action.type) {
    case 'join':
      return join(state, action.token, action.name, ctx);
    case 'connected':
    case 'disconnected':
      return setConnected(state, action.playerId, action.type === 'connected', ctx);
    case 'rename':
      return rename(state, action.playerId, action.name, ctx);
    case 'leave':
      return remove(state, action.playerId, 'left', ctx);
    case 'kick':
      return kick(state, action.by, action.target, ctx);
    case 'tick':
      return tick(state, ctx);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** Public projection. Lobby info is the same for every player; tokens are stripped. */
export function lobbyView(state: LobbyState): LobbyView {
  return {
    code: state.code,
    hostId: state.hostId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isHost: p.id === state.hostId,
    })),
  };
}

/** Earliest moment the room needs to be woken up to run `tick` or expire. */
export function nextWakeAt(state: LobbyState): number {
  const expiry = state.lastActivityAt + ROOM_TTL_MS;
  return state.hostLostAt === null ? expiry : Math.min(expiry, state.hostLostAt + HOST_GRACE_MS);
}

export function isExpired(state: LobbyState, now: number): boolean {
  return now >= state.lastActivityAt + ROOM_TTL_MS;
}

export function findByToken(state: LobbyState, token: string): Player | undefined {
  return state.players.find((p) => p.token === token);
}

// ---------------------------------------------------------------------------

function join(state: LobbyState, token: string, name: string, ctx: EngineContext): LobbyResult {
  const existing = findByToken(state, token);
  if (existing) {
    const players = state.players.map((p) =>
      p.id === existing.id ? { ...p, name, connected: true } : p,
    );
    const next = withHostReconnected({ ...state, players, lastActivityAt: ctx.now }, existing.id);
    return {
      ok: true,
      state: next,
      events: [{ type: 'joined', playerId: existing.id, rejoined: true }],
    };
  }

  if (state.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };

  const player: Player = { id: ctx.newId(), token, name, joinedAt: ctx.now, connected: true };
  const events: LobbyEvent[] = [{ type: 'joined', playerId: player.id, rejoined: false }];
  let next: LobbyState = { ...state, players: [...state.players, player], lastActivityAt: ctx.now };
  if (next.hostId === null) {
    next = { ...next, hostId: player.id, hostLostAt: null };
    events.push({ type: 'host_changed', hostId: player.id });
  }
  return { ok: true, state: next, events };
}

function setConnected(
  state: LobbyState,
  playerId: string,
  connected: boolean,
  ctx: EngineContext,
): LobbyResult {
  if (!state.players.some((p) => p.id === playerId)) return { ok: false, error: 'unknown_player' };
  const players = state.players.map((p) => (p.id === playerId ? { ...p, connected } : p));
  let next: LobbyState = { ...state, players, lastActivityAt: ctx.now };
  if (playerId === state.hostId) {
    next = connected
      ? withHostReconnected(next, playerId)
      : { ...next, hostLostAt: state.hostLostAt ?? ctx.now };
  }
  return { ok: true, state: next, events: [] };
}

function rename(
  state: LobbyState,
  playerId: string,
  name: string,
  ctx: EngineContext,
): LobbyResult {
  if (!state.players.some((p) => p.id === playerId)) return { ok: false, error: 'unknown_player' };
  const players = state.players.map((p) => (p.id === playerId ? { ...p, name } : p));
  return { ok: true, state: { ...state, players, lastActivityAt: ctx.now }, events: [] };
}

function kick(state: LobbyState, by: string, target: string, ctx: EngineContext): LobbyResult {
  if (by !== state.hostId) return { ok: false, error: 'not_host' };
  if (by === target) return { ok: false, error: 'cannot_kick_self' };
  return remove(state, target, 'kicked', ctx);
}

function remove(
  state: LobbyState,
  playerId: string,
  reason: 'left' | 'kicked',
  ctx: EngineContext,
): LobbyResult {
  if (!state.players.some((p) => p.id === playerId)) return { ok: false, error: 'unknown_player' };
  const players = state.players.filter((p) => p.id !== playerId);
  let next: LobbyState = { ...state, players, lastActivityAt: ctx.now };
  const events: LobbyEvent[] = [{ type: reason, playerId }];
  if (playerId === state.hostId) {
    const successor = pickSuccessor(players);
    next = { ...next, hostId: successor?.id ?? null, hostLostAt: null };
    events.push({ type: 'host_changed', hostId: next.hostId });
  }
  return { ok: true, state: next, events };
}

function tick(state: LobbyState, ctx: EngineContext): LobbyResult {
  if (state.hostLostAt === null || ctx.now < state.hostLostAt + HOST_GRACE_MS) {
    return { ok: true, state, events: [] };
  }
  const successor = pickSuccessor(state.players.filter((p) => p.id !== state.hostId));
  if (!successor?.connected) {
    // Nobody better available; keep the current host and wait for someone to come back.
    return { ok: true, state, events: [] };
  }
  return {
    ok: true,
    state: { ...state, hostId: successor.id, hostLostAt: null },
    events: [{ type: 'host_changed', hostId: successor.id }],
  };
}

/** Oldest connected player, falling back to the oldest player overall. */
function pickSuccessor(players: readonly Player[]): Player | undefined {
  return players.find((p) => p.connected) ?? players[0];
}

function withHostReconnected(state: LobbyState, playerId: string): LobbyState {
  return playerId === state.hostId ? { ...state, hostLostAt: null } : state;
}
