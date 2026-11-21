import * as v from 'valibot';

/** Bump whenever a message shape changes incompatibly. Clients on another version are rejected. */
export const PROTOCOL_VERSION = 1;

/** Room codes avoid look-alike characters (I/O/0/1) so they are easy to read aloud and type. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export const MAX_PLAYERS = 20;
export const NAME_MAX_LENGTH = 20;

/** Literal text frames used for keep-alive. Answered by the runtime without waking the room. */
export const PING = 'ping';
export const PONG = 'pong';

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isRoomCode(input: string): boolean {
  return ROOM_CODE_PATTERN.test(input);
}

// ---------------------------------------------------------------------------
// Client → server

const PlayerName = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, 'name_empty'),
  v.maxLength(NAME_MAX_LENGTH, 'name_too_long'),
);

/** Secret per-device token used to reclaim a seat after reconnecting. Never broadcast. */
const PlayerToken = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{16,64}$/, 'token_invalid'));

const PlayerId = v.pipe(v.string(), v.minLength(1), v.maxLength(64));

export const HelloMessage = v.object({
  t: v.literal('hello'),
  v: v.number(),
  token: PlayerToken,
  name: PlayerName,
});

export const RenameMessage = v.object({
  t: v.literal('rename'),
  name: PlayerName,
});

export const LeaveMessage = v.object({
  t: v.literal('leave'),
});

export const KickMessage = v.object({
  t: v.literal('kick'),
  playerId: PlayerId,
});

export const ClientMessage = v.variant('t', [
  HelloMessage,
  RenameMessage,
  LeaveMessage,
  KickMessage,
]);
export type ClientMessage = v.InferOutput<typeof ClientMessage>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Parse and validate a raw frame from a client. Never throws. */
export function parseClientMessage(raw: unknown): ParseResult<ClientMessage> {
  if (typeof raw !== 'string') return { ok: false, error: 'not_text' };
  if (raw.length > 4096) return { ok: false, error: 'too_large' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  const result = v.safeParse(ClientMessage, json);
  if (!result.success) {
    return { ok: false, error: result.issues[0]?.message ?? 'invalid' };
  }
  return { ok: true, value: result.output };
}

// ---------------------------------------------------------------------------
// Server → client

export interface PlayerView {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface LobbyView {
  code: string;
  hostId: string | null;
  players: PlayerView[];
}

export type ErrorCode =
  | 'version_mismatch'
  | 'invalid_message'
  | 'not_joined'
  | 'room_full'
  | 'room_not_found'
  | 'not_host'
  | 'unknown_player'
  | 'cannot_kick_self';

export type ServerMessage =
  | { t: 'welcome'; v: number; you: string; lobby: LobbyView }
  | { t: 'lobby'; lobby: LobbyView }
  | { t: 'kicked' }
  | { t: 'error'; code: ErrorCode; detail?: string };

export function encode(message: ServerMessage | ClientMessage): string {
  return JSON.stringify(message);
}

// ---------------------------------------------------------------------------
// HTTP API

export interface CreateRoomResponse {
  code: string;
}

export interface RoomInfoResponse {
  code: string;
  players: number;
}
