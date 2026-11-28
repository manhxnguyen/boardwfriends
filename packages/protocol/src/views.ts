import type {
  ClassicRoleId,
  GameKind,
  OneNightRoleCounts,
  OneNightRoleId,
  PlayMode,
  RevealMode,
  RoleCounts,
  Team,
} from './roles.ts';

/**
 * Server → client projections. Every view is computed per recipient: a player only ever
 * receives what that player may know; the narrator display receives public information only.
 */

export interface PlayerView {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface LobbyView {
  code: string;
  hostId: string | null;
  /** Seating order (used by the Insomniac). */
  players: PlayerView[];
  /** Narrator screens currently connected. */
  displays: number;
}

export interface SetupView {
  game: GameKind;
  mode: PlayMode;
  roles: RoleCounts;
  oneNightRoles: OneNightRoleCounts;
  /** Manual mode: player who runs the game and gets no card. */
  moderatorId: string | null;
  /** Whether everyone may see which roles are in the deck. */
  publicRoles: boolean;
  reveal: RevealMode;
  /** Classic variant: wolves already eliminate on night 1 (official rule: night 1 is quiet). */
  firstNightKill: boolean;
  /** Classic auto variant: wolves' victim by most picks, ties at random (official: unanimous). */
  wolfMajority: boolean;
  dayMinutes: number;
  /** Classic auto: minutes a nominee has to defend themselves. */
  defenseMinutes: number;
  /** Let the narrator display accept spoken commands (experimental). */
  voice: boolean;
}

export interface Assignment {
  playerId: string;
  role: ClassicRoleId;
  seen: boolean;
}

// ---------------------------------------------------------------------------
// Narration cues: the display speaks them, phones show them as captions.

/**
 * 'night' is what players see while the game runs: whether the wolves or the Witch eliminated
 * someone is secret until the game is over (only the stats reveal 'wolves' / 'witch').
 */
export type DeathCause = 'wolves' | 'witch' | 'night' | 'vote' | 'hunter';

export interface Death {
  playerId: string;
  cause: DeathCause;
  /** Revealed according to the room's RevealMode. */
  role: ClassicRoleId | null;
  team: Team | null;
}

export type Winner = 'village' | 'wolf' | 'tanner';

export type Cue =
  | { k: 'game-start' }
  | { k: 'night'; n: number }
  | { k: 'call-open'; call: string; note: string | null }
  | { k: 'call-close'; call: string }
  | { k: 'dawn'; deaths: Death[]; silenced: string | null }
  | { k: 'day'; n: number; minutes: number }
  | { k: 'time-warning'; seconds: number }
  | { k: 'nominated'; by: string | null; nominee: string }
  | { k: 'no-second'; nominee: string }
  | { k: 'defense'; nominee: string; seconds?: number }
  | { k: 'voting'; nominee: string }
  | { k: 'vote-result'; nominee: string; eliminate: number; keep: number; eliminated: boolean }
  | { k: 'eliminated'; death: Death }
  | { k: 'hunter'; hunter: string }
  | { k: 'day-end' }
  | { k: 'paused' }
  | { k: 'resumed' }
  | { k: 'game-over'; winners: Winner[] }
  | { k: 'on-day'; minutes: number }
  | { k: 'on-vote' }
  | { k: 'on-result'; deaths: string[] };

export interface CueEntry {
  seq: number;
  cue: Cue;
}

// ---------------------------------------------------------------------------
// Private information a player has learned (their "notebook").

export type Knowledge =
  | { k: 'wolves'; ids: string[] }
  | { k: 'masons'; ids: string[] }
  | { k: 'seer'; night: number; target: string; isWolf: boolean }
  | { k: 'sorceress'; night: number; target: string; isSeer: boolean }
  | { k: 'insomniac'; night: number; woke: boolean }
  | { k: 'witch'; night: number; targets: string[] }
  | { k: 'on-minion'; ids: string[] }
  | { k: 'on-center'; index: number; role: OneNightRoleId }
  | { k: 'on-player'; target: string; role: OneNightRoleId }
  | { k: 'on-robbed'; target: string; role: OneNightRoleId }
  | { k: 'on-self'; role: OneNightRoleId }
  /** The Doppelgänger looked at `target` and became `role`. */
  | { k: 'on-doppel'; target: string; role: OneNightRoleId };

/** What a phone should show right now. Night prompts look alike for everyone (anti-tell). */
export type Prompt =
  | {
      kind: 'pick';
      purpose:
        | 'suspect'
        | 'bodyguard'
        | 'wolves'
        | 'seer'
        | 'sorceress'
        | 'spellcaster'
        | 'hunter'
        | 'on-doppel'
        | 'on-werewolf'
        | 'on-seer'
        | 'on-robber'
        | 'on-troublemaker'
        | 'on-drunk';
      options: string[];
      /** How many players to choose (0 = none required). */
      count: number;
      /** Center card choice (One Night): how many center cards may be picked. */
      centerCount: number;
      selected: string[];
      selectedCenter: number[];
      locked: boolean;
      /** Wolves: each pack member's current picks. */
      pack: { id: string; picks: string[] }[] | null;
      /** Extra hint key for the UI (e.g. 'no-effect', 'meet-only', 'double'). */
      note: string | null;
    }
  | {
      kind: 'witch';
      targets: string[];
      options: string[];
      choice: { action: 'save' | 'kill' | 'pass'; target: string | null } | null;
    }
  | { kind: 'second'; nominee: string; by: string | null }
  | { kind: 'vote'; nominee: string; yours: 'keep' | 'eliminate' | null; forced: boolean }
  | { kind: 'accuse'; options: string[]; yours: string | null }
  | { kind: 'sleep' };

// ---------------------------------------------------------------------------
// Classic auto game

export interface SeatView {
  id: string;
  alive: boolean;
  /** Role or team as revealed to everyone (null while hidden). */
  role: ClassicRoleId | null;
  team: Team | null;
}

export interface VoteRecord {
  day: number;
  nominee: string;
  votes: Record<string, 'keep' | 'eliminate'>;
  eliminated: boolean;
}

export type ClassicPhaseView =
  | { kind: 'reveal'; seen: number; total: number }
  | { kind: 'night'; night: number; call: string; endsAt: number }
  | { kind: 'dawn'; endsAt: number; deaths: Death[]; silenced: string | null }
  | { kind: 'hunter'; hunter: string; endsAt: number }
  | {
      kind: 'day';
      day: number;
      silenced: string | null;
      /** Discussion clock; null while a nomination is in progress. */
      endsAt: number | null;
      remainingMs: number;
      sub:
        | null
        | { kind: 'nominated'; by: string | null; nominee: string; endsAt: number }
        | { kind: 'defense'; nominee: string; endsAt: number }
        | { kind: 'voting'; nominee: string; endsAt: number; voted: number; total: number };
    }
  | { kind: 'dusk'; endsAt: number; death: Death }
  | { kind: 'over'; winners: Winner[] };

/** One line of the game's story, shown to everyone once the game is over. */
export type TimelineEvent =
  | { k: 'night'; n: number }
  | { k: 'day'; n: number }
  /** The wolves' choice; empty when they did not agree. `meet`: night 1 without a kill. */
  | { k: 'wolves'; targets: string[]; meet?: boolean }
  | { k: 'protect'; target: string }
  | { k: 'witch'; action: 'save' | 'kill'; target: string }
  | { k: 'seer'; target: string; isWolf: boolean }
  | { k: 'sorceress'; target: string; isSeer: boolean }
  | { k: 'silence'; target: string }
  /** A wolf victim who survived, and why. */
  | { k: 'saved'; target: string; by: 'bodyguard' | 'witch' }
  | { k: 'death'; playerId: string; cause: DeathCause }
  | { k: 'vote'; nominee: string; eliminate: string[]; keep: string[]; eliminated: boolean }
  | { k: 'shot'; hunter: string; target: string | null };

export interface ClassicStats {
  roles: Record<string, ClassicRoleId>;
  /** What happened, night by night and day by day (older saved games: empty). */
  timeline: TimelineEvent[];
  deaths: (Death & { day: number })[];
  votes: VoteRecord[];
  /** How many times each player was the target of night suspicions. */
  suspected: Record<string, number>;
}

export interface ClassicView {
  kind: 'classic';
  /** Server clock, for countdowns. */
  now: number;
  paused: boolean;
  seats: SeatView[];
  phase: ClassicPhaseView;
  cues: CueEntry[];
  /** Room option: the wolves' victim is the most picked player (AD-AUTO-14). */
  wolfMajority: boolean;
  /** Null for the narrator display. */
  you: {
    role: ClassicRoleId;
    alive: boolean;
    seen: boolean;
    silenced: boolean;
    knowledge: Knowledge[];
    prompt: Prompt;
  } | null;
  stats: ClassicStats | null;
}

// ---------------------------------------------------------------------------
// One Night game

export type OneNightPhaseView =
  | { kind: 'reveal'; seen: number; total: number }
  | { kind: 'night'; call: string; endsAt: number }
  | { kind: 'day'; endsAt: number }
  | { kind: 'vote'; endsAt: number; voted: number; total: number }
  | { kind: 'over'; winners: Winner[] };

/** One Night: what happened during the night, revealed with the result. */
export type OneNightEvent =
  | { k: 'doppel'; actor: string; target: string; role: OneNightRoleId }
  /** The werewolves woke and saw each other (one id: a lone wolf). */
  | { k: 'wolves'; ids: string[] }
  | { k: 'lone-wolf'; actor: string; index: number; role: OneNightRoleId }
  | { k: 'minion'; actor: string; wolves: string[] }
  | { k: 'masons'; ids: string[] }
  | { k: 'seer'; actor: string; target: string; role: OneNightRoleId }
  | { k: 'seer-center'; actor: string; cards: { index: number; role: OneNightRoleId }[] }
  | { k: 'robber'; actor: string; target: string; took: OneNightRoleId }
  | { k: 'troublemaker'; actor: string; a: string; b: string }
  /** `auto`: time ran out and the app picked the center card [AD]. */
  | { k: 'drunk'; actor: string; index: number; auto: boolean }
  | { k: 'insomniac'; actor: string; role: OneNightRoleId }
  /** Woke up but chose to do nothing. */
  | { k: 'idle'; actor: string; call: string };

export interface OneNightResult {
  /** The night, step by step (older saved games: missing). */
  story?: OneNightEvent[];
  original: Record<string, OneNightRoleId>;
  final: Record<string, OneNightRoleId>;
  center: OneNightRoleId[];
  /** Role the Doppelgänger copied; whoever holds the Doppelgänger card at the end is that role. */
  doppelCopy: OneNightRoleId | null;
  votes: Record<string, string>;
  deaths: string[];
  /** Players on the winning side(s). */
  winningPlayers: string[];
}

export interface OneNightView {
  kind: 'one-night';
  now: number;
  paused: boolean;
  seats: { id: string }[];
  phase: OneNightPhaseView;
  cues: CueEntry[];
  you: {
    /** The card you were dealt (you may no longer hold it). */
    role: OneNightRoleId;
    seen: boolean;
    knowledge: Knowledge[];
    prompt: Prompt;
  } | null;
  result: OneNightResult | null;
}

// ---------------------------------------------------------------------------

export type GameView =
  | { phase: 'setup'; setup: SetupView | null }
  | {
      phase: 'dealt';
      round: number;
      setup: SetupView | null;
      moderatorId: string | null;
      yourRole: ClassicRoleId | null;
      youSeen: boolean;
      seenCount: number;
      dealtCount: number;
      assignments: Assignment[] | null;
    }
  | { phase: 'playing'; round: number; setup: SetupView | null; play: ClassicView | OneNightView };

export interface RoomView {
  lobby: LobbyView;
  game: GameView;
  /** True when this view is for a narrator display rather than a player. */
  display: boolean;
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
  | 'no_card'
  | 'invalid_action'
  | 'not_allowed';
