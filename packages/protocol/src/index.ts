import * as v from 'valibot';

/** Bump whenever a message shape changes incompatibly. Clients on another version are rejected. */
export const PROTOCOL_VERSION = 2;

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

/**
 * Roles of the Classic mode (Ultimate Werewolf, 2021 role set). Rules and point values live in
 * @bwf/engine; see docs/rules/classic.md. Chupacabra is left out until its card text is known.
 */
export const CLASSIC_ROLE_IDS = [
  'villager',
  'werewolf',
  'seer',
  'bodyguard',
  'hunter',
  'witch',
  'wolf-cub',
  'sorceress',
  'tanner',
  'village-idiot',
  'spellcaster',
  'insomniac',
  'mason',
] as const;
export type ClassicRoleId = (typeof CLASSIC_ROLE_IDS)[number];

export function isClassicRoleId(value: string): value is ClassicRoleId {
  return (CLASSIC_ROLE_IDS as readonly string[]).includes(value);
}

/** Role id → number of cards. Missing ids mean 0. */
export type RoleCounts = Partial<Record<ClassicRoleId, number>>;

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
});

export const RenameMessage = v.object({ t: v.literal('rename'), name: PlayerName });
export const LeaveMessage = v.object({ t: v.literal('leave') });
export const KickMessage = v.object({ t: v.literal('kick'), playerId: PlayerId });

/** Host edits the deck. Sent on every change; the deck may be incomplete while editing. */
export const SetupMessage = v.object({
  t: v.literal('setup'),
  roles: v.pipe(
    v.record(v.picklist(CLASSIC_ROLE_IDS), CardCount),
    v.check((roles) => Object.keys(roles).length <= CLASSIC_ROLE_IDS.length),
  ),
  moderatorId: v.nullable(PlayerId),
  publicRoles: v.boolean(),
});

/** Host deals the cards. */
export const DealMessage = v.object({ t: v.literal('deal') });
/** Player confirms they looked at their card. */
export const SeenMessage = v.object({ t: v.literal('seen') });
/** Host collects the cards and goes back to setup for a new round. */
export const ResetMessage = v.object({ t: v.literal('reset') });

export const ClientMessage = v.variant('t', [
  HelloMessage,
  RenameMessage,
  LeaveMessage,
  KickMessage,
  SetupMessage,
  DealMessage,
  SeenMessage,
  ResetMessage,
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

export interface SetupView {
  roles: RoleCounts;
  /** Player who runs the game and gets no card; null = no moderator in the app. */
  moderatorId: string | null;
  /** Whether everyone may see which roles are in the deck. */
  publicRoles: boolean;
}

export interface Assignment {
  playerId: string;
  role: ClassicRoleId;
  seen: boolean;
}

export type GameView =
  | {
      phase: 'setup';
      /** Null when the deck is hidden from this player (publicRoles off, not host). */
      setup: SetupView | null;
    }
  | {
      phase: 'dealt';
      round: number;
      setup: SetupView | null;
      moderatorId: string | null;
      /** This player's own card; null for the moderator or someone who joined late. */
      yourRole: ClassicRoleId | null;
      youSeen: boolean;
      seenCount: number;
      dealtCount: number;
      /** Full table, only for the moderator. */
      assignments: Assignment[] | null;
    };

export interface RoomView {
  lobby: LobbyView;
  game: GameView;
}

export type ErrorCode =
  | 'version_mismatch'
  | 'invalid_message'
  | 'not_joined'
  | 'room_full'
  | 'room_not_found'
  | 'not_host'
  | 'unknown_player'
  | 'cannot_kick_self'
  | 'game_in_progress'
  | 'wrong_phase'
  | 'invalid_setup'
  | 'no_card';

export type ServerMessage =
  | { t: 'welcome'; v: number; you: string; room: RoomView }
  | { t: 'state'; room: RoomView }
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
