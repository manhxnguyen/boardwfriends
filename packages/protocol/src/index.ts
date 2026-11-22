import * as v from 'valibot';
import { CLASSIC_ROLE_IDS, ONE_NIGHT_ROLE_IDS } from './roles.ts';
import type { ErrorCode, RoomView } from './views.ts';

export * from './roles.ts';
export * from './views.ts';

/** Bump whenever a message shape changes incompatibly. Clients on another version are rejected. */
export const PROTOCOL_VERSION = 5;

/** Room codes avoid look-alike characters (I/O/0/1) so they are easy to read aloud and type. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export const MAX_PLAYERS = 20;
export const NAME_MAX_LENGTH = 20;
export const DAY_MINUTES_MIN = 1;
export const DAY_MINUTES_MAX = 15;

/** Literal text frames used for keep-alive. Answered without waking the room. */
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

const CardCount = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MAX_PLAYERS));

export const HelloMessage = v.object({
  t: v.literal('hello'),
  v: v.number(),
  token: PlayerToken,
  name: PlayerName,
  /** 'display' = narrator screen (MacBook): no seat, public view only. */
  as: v.optional(v.picklist(['player', 'display']), 'player'),
});

export const RenameMessage = v.object({ t: v.literal('rename'), name: PlayerName });
export const LeaveMessage = v.object({ t: v.literal('leave') });
export const KickMessage = v.object({ t: v.literal('kick'), playerId: PlayerId });

/** Host: new seating order (all current player ids). */
export const SeatsMessage = v.object({
  t: v.literal('seats'),
  order: v.pipe(v.array(PlayerId), v.maxLength(MAX_PLAYERS)),
});

/** Host edits the game settings. Sent on every change; the deck may be incomplete while editing. */
export const SetupMessage = v.object({
  t: v.literal('setup'),
  game: v.picklist(['classic', 'one-night']),
  mode: v.picklist(['manual', 'auto']),
  roles: v.record(v.picklist(CLASSIC_ROLE_IDS), CardCount),
  oneNightRoles: v.record(v.picklist(ONE_NIGHT_ROLE_IDS), CardCount),
  moderatorId: v.nullable(PlayerId),
  publicRoles: v.boolean(),
  reveal: v.picklist(['role', 'team', 'none']),
  firstNightKill: v.boolean(),
  dayMinutes: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(DAY_MINUTES_MIN),
    v.maxValue(DAY_MINUTES_MAX),
  ),
  voice: v.boolean(),
});

/** Host deals the cards. */
export const DealMessage = v.object({ t: v.literal('deal') });
/** Player confirms they looked at their card. */
export const SeenMessage = v.object({ t: v.literal('seen') });
/** Host collects the cards and goes back to setup. */
export const ResetMessage = v.object({ t: v.literal('reset') });
/** Host starts the first night once everyone has seen their card. */
export const StartMessage = v.object({ t: v.literal('start') });
/** Host pauses or resumes every timer. */
export const PauseMessage = v.object({ t: v.literal('pause'), paused: v.boolean() });
/** Host skips the rest of the current discussion (day timer). */
export const SkipMessage = v.object({ t: v.literal('skip') });

/** Night/hunter action. Which fields matter depends on the player's current prompt. */
export const ActMessage = v.object({
  t: v.literal('act'),
  players: v.pipe(v.array(PlayerId), v.maxLength(2)),
  center: v.optional(
    v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(2))), v.maxLength(2)),
    [],
  ),
  witch: v.optional(v.picklist(['save', 'kill', 'pass'])),
});

/** Classic day: nominate, second, vote. */
export const NominateMessage = v.object({ t: v.literal('nominate'), target: PlayerId });
export const SecondMessage = v.object({ t: v.literal('second') });
export const VoteMessage = v.object({
  t: v.literal('vote'),
  choice: v.picklist(['keep', 'eliminate']),
});
/** One Night: point at a player in the final vote. */
export const AccuseMessage = v.object({ t: v.literal('accuse'), target: PlayerId });

/** Narrator display: a command recognised from speech (only when setup.voice is on). */
export const VoiceMessage = v.object({
  t: v.literal('voice'),
  cmd: v.picklist(['nominate', 'second', 'start-vote', 'pause', 'resume', 'end-day']),
  target: v.optional(PlayerId),
});

export const ClientMessage = v.variant('t', [
  HelloMessage,
  RenameMessage,
  LeaveMessage,
  KickMessage,
  SeatsMessage,
  SetupMessage,
  DealMessage,
  SeenMessage,
  ResetMessage,
  StartMessage,
  PauseMessage,
  SkipMessage,
  ActMessage,
  NominateMessage,
  SecondMessage,
  VoteMessage,
  AccuseMessage,
  VoiceMessage,
]);
export type ClientMessage = v.InferOutput<typeof ClientMessage>;
/** Input shape (before defaults are applied), useful for clients building messages. */
export type ClientMessageInput = v.InferInput<typeof ClientMessage>;

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

export type ServerMessage =
  | { t: 'welcome'; v: number; you: string | null; room: RoomView }
  | { t: 'state'; room: RoomView }
  | { t: 'kicked' }
  | { t: 'error'; code: ErrorCode; detail?: string };

export function encode(message: ServerMessage | ClientMessageInput): string {
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
