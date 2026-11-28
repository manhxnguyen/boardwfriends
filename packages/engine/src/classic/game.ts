import type {
  ClassicPhaseView,
  ClassicRoleId,
  ClassicView,
  Cue,
  CueEntry,
  Death,
  DeathCause,
  ErrorCode,
  Knowledge,
  Prompt,
  RevealMode,
  RoleCounts,
  VoteRecord,
  Winner,
} from '@bwf/protocol';
import { clone } from '../clone.ts';
import { roleDef } from './roles.ts';
import { nightScript, type NightCall } from './script.ts';

/**
 * Classic mode with the app as moderator (M2). Rules: docs/rules/classic.md. Where the rulebook
 * relies on a human moderator's judgement, the choice made here is tagged [AD] (app decision).
 *
 * The reducer is pure: it deep-copies the state, mutates the copy and returns it.
 */

export interface ClassicTimings {
  firstDayMs: number;
  dayMs: number;
  /** Every night call lasts a fixed time so nobody is revealed by how fast it ends [AD]. */
  nightStepMs: number;
  /** [RR p.3] wolves get 30 seconds to agree. */
  wolvesStepMs: number;
  witchStepMs: number;
  secondMs: number;
  defenseMs: number;
  voteMs: number;
  hunterMs: number;
  dawnMs: number;
  duskMs: number;
  /** "Be sure to inform the village when time is almost up" [GS p.3]. */
  warningMs: number;
  /** Minimum discussion left after a failed nomination [AD]. */
  minResumeMs: number;
}

export const DEFAULT_TIMINGS: ClassicTimings = {
  firstDayMs: 5 * 60_000,
  dayMs: 5 * 60_000,
  nightStepMs: 15_000,
  wolvesStepMs: 30_000,
  witchStepMs: 20_000,
  secondMs: 15_000,
  defenseMs: 30_000,
  voteMs: 20_000,
  hunterMs: 30_000,
  dawnMs: 12_000,
  duskMs: 10_000,
  warningMs: 30_000,
  minResumeMs: 20_000,
};

type DaySub =
  | { kind: 'nominated'; by: string | null; nominee: string; endsAt: number }
  | { kind: 'defense'; nominee: string; endsAt: number }
  | {
      kind: 'voting';
      nominee: string;
      endsAt: number;
      votes: Record<string, 'keep' | 'eliminate'>;
    };

type Phase =
  | { kind: 'reveal' }
  | { kind: 'night'; step: number; endsAt: number }
  | { kind: 'dawn'; endsAt: number; deaths: Death[]; silenced: string | null }
  | { kind: 'hunter'; hunter: string; endsAt: number; then: 'day' | 'night' }
  | {
      kind: 'day';
      endsAt: number | null;
      remainingMs: number;
      warned: boolean;
      sub: DaySub | null;
    }
  | { kind: 'dusk'; endsAt: number; death: Death }
  | { kind: 'over'; winners: Winner[] };

interface NightActs {
  wolves: Record<string, string[]>;
  wolfVictims: string[];
  bodyguard: string | null;
  witch: { action: 'save' | 'kill' | 'pass'; target: string | null } | null;
  seer: string | null;
  sorceress: string | null;
  spellcaster: string | null;
  /** Night suspicions of players with nothing else to do (anti-tell, end-of-game stats). */
  suspects: Record<string, string>;
  /** Choices that have no effect (first-night Bodyguard); kept only so the phone shows them. */
  dummy: Record<string, string>;
}

export interface ClassicGame {
  /** Seating order (Insomniac neighbours). */
  seats: string[];
  roles: Record<string, ClassicRoleId>;
  /** Roles in the deck; drives the night script even after a role is eliminated. */
  deck: RoleCounts;
  alive: Record<string, boolean>;
  seen: string[];
  reveal: RevealMode;
  /**
   * Variant: wolves already eliminate on night 1 (and the Bodyguard/Witch work that night).
   * Off = official rule, night 1 is quiet [GS p.2]. See docs/rules/classic.md AD-AUTO-12.
   */
  firstNightKill: boolean;
  /**
   * Variant: the wolves' victim is the most picked player instead of a unanimous pick; a tie is
   * broken at random. Off = official rule (UW-NIGHT-01/02). See AD-AUTO-14.
   */
  wolfMajority: boolean;
  /** Fixed at deal time; breaks wolf-vote ties so the engine stays a pure function. */
  seed: number;
  timings: ClassicTimings;
  night: number;
  day: number;
  phase: Phase;
  paused: { at: number } | null;
  calls: NightCall[];
  acts: NightActs;
  memory: {
    lastProtected: string | null;
    witchUsed: boolean;
    spellcasterUsed: string[];
    /** Wolf Cub died: the next night the wolves take two [RR p.4]. */
    cubDiedPending: boolean;
    cubDouble: boolean;
    silenced: string | null;
    tannerWon: boolean;
  };
  pendingHunters: string[];
  knowledge: Record<string, Knowledge[]>;
  deaths: (Death & { day: number })[];
  votes: VoteRecord[];
  suspected: Record<string, number>;
  cues: CueEntry[];
  cueSeq: number;
}

export type ClassicAction =
  | { type: 'seen'; playerId: string }
  | { type: 'start' }
  | {
      type: 'act';
      playerId: string;
      players: string[];
      witch?: 'save' | 'kill' | 'pass' | undefined;
    }
  | { type: 'nominate'; by: string | null; target: string }
  | { type: 'second'; by: string | null }
  | { type: 'start-vote' }
  | { type: 'vote'; playerId: string; choice: 'keep' | 'eliminate' }
  | { type: 'pause'; paused: boolean }
  | { type: 'skip' }
  | { type: 'tick' };

export type ClassicResult = { ok: true; game: ClassicGame } | { ok: false; error: ErrorCode };

const CUE_HISTORY = 12;

export function startClassic(input: {
  seats: string[];
  roles: Record<string, ClassicRoleId>;
  deck: RoleCounts;
  reveal: RevealMode;
  dayMinutes: number;
  firstNightKill?: boolean;
  wolfMajority?: boolean;
  seed?: number;
  timings?: Partial<ClassicTimings>;
}): ClassicGame {
  const dayMs = input.dayMinutes * 60_000;
  return {
    seats: [...input.seats],
    roles: { ...input.roles },
    deck: { ...input.deck },
    alive: Object.fromEntries(input.seats.map((id) => [id, true])),
    seen: [],
    reveal: input.reveal,
    firstNightKill: input.firstNightKill ?? false,
    wolfMajority: input.wolfMajority ?? false,
    seed: input.seed ?? 0,
    timings: { ...DEFAULT_TIMINGS, firstDayMs: dayMs, dayMs, ...input.timings },
    night: 0,
    day: 0,
    phase: { kind: 'reveal' },
    paused: null,
    calls: [],
    acts: emptyActs(),
    memory: {
      lastProtected: null,
      witchUsed: false,
      spellcasterUsed: [],
      cubDiedPending: false,
      cubDouble: false,
      silenced: null,
      tannerWon: false,
    },
    pendingHunters: [],
    knowledge: Object.fromEntries(input.seats.map((id) => [id, []])),
    deaths: [],
    votes: [],
    suspected: {},
    cues: [],
    cueSeq: 0,
  };
}

export function applyClassic(prev: ClassicGame, action: ClassicAction, now: number): ClassicResult {
  const g = clone(prev);

  if (action.type === 'pause') return pause(g, action.paused, now);
  if (action.type === 'seen') {
    if (!(action.playerId in g.roles)) return fail('no_card');
    if (!g.seen.includes(action.playerId)) g.seen.push(action.playerId);
    return ok(g);
  }
  if (g.paused) return action.type === 'tick' ? ok(g) : fail('wrong_phase');

  advance(g, now);

  switch (action.type) {
    case 'tick':
      return ok(g);
    case 'start':
      if (g.phase.kind !== 'reveal') return fail('wrong_phase');
      cue(g, { k: 'game-start' });
      startNight(g, now);
      return ok(g);
    case 'act':
      return act(g, action.playerId, action.players, action.witch, now);
    case 'nominate':
      return nominate(g, action.by, action.target, now);
    case 'second':
      return second(g, action.by, now);
    case 'start-vote':
      if (g.phase.kind !== 'day' || g.phase.sub?.kind !== 'defense') return fail('wrong_phase');
      startVoting(g, now);
      return ok(g);
    case 'vote':
      return vote(g, action.playerId, action.choice, now);
    case 'skip':
      return skip(g, now);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** Next moment the game must be ticked, or null if nothing is scheduled. */
export function classicDeadline(g: ClassicGame): number | null {
  if (g.paused) return null;
  const p = g.phase;
  switch (p.kind) {
    case 'reveal':
    case 'over':
      return null;
    case 'night':
    case 'dawn':
    case 'hunter':
    case 'dusk':
      return p.endsAt;
    case 'day':
      if (p.sub) return p.sub.endsAt;
      if (p.endsAt === null) return null;
      return p.warned ? p.endsAt : p.endsAt - g.timings.warningMs;
  }
}

// ---------------------------------------------------------------------------
// Time

function advance(g: ClassicGame, now: number) {
  for (let guard = 0; guard < 200; guard++) {
    const at = classicDeadline(g);
    if (at === null || at > now) return;
    onDeadline(g, at);
  }
}

function onDeadline(g: ClassicGame, at: number) {
  const p = g.phase;
  switch (p.kind) {
    case 'night': {
      closeStep(g);
      if (p.step + 1 < g.calls.length) openStep(g, p.step + 1, at);
      else resolveNight(g, at);
      return;
    }
    case 'dawn':
      return afterDeaths(g, at, 'day');
    case 'dusk':
      return afterDeaths(g, at, 'night');
    case 'hunter':
      // Timed out: the Hunter fires into the air [S1, AD].
      return afterDeaths(g, at, p.then);
    case 'day': {
      const sub = p.sub;
      if (sub?.kind === 'nominated') {
        cue(g, { k: 'no-second', nominee: sub.nominee });
        return resumeDiscussion(g, at);
      }
      if (sub?.kind === 'defense') return startVoting(g, at);
      if (sub?.kind === 'voting') return resolveVote(g, at);
      if (!p.warned) {
        p.warned = true;
        cue(g, { k: 'time-warning', seconds: Math.round(g.timings.warningMs / 1000) });
        return;
      }
      cue(g, { k: 'day-end' });
      return startNight(g, at);
    }
    default:
      return;
  }
}

function pause(g: ClassicGame, paused: boolean, now: number): ClassicResult {
  if (g.phase.kind === 'reveal' || g.phase.kind === 'over') return fail('wrong_phase');
  if (paused && !g.paused) {
    advance(g, now);
    g.paused = { at: now };
    cue(g, { k: 'paused' });
  } else if (!paused && g.paused) {
    shiftDeadlines(g, now - g.paused.at);
    g.paused = null;
    cue(g, { k: 'resumed' });
  }
  return ok(g);
}

function shiftDeadlines(g: ClassicGame, delta: number) {
  const p = g.phase;
  if ('endsAt' in p && typeof p.endsAt === 'number') p.endsAt += delta;
  if (p.kind === 'day' && p.sub) p.sub.endsAt += delta;
}

// ---------------------------------------------------------------------------
// Night

function startNight(g: ClassicGame, at: number) {
  g.night += 1;
  g.memory.silenced = null;
  g.memory.cubDouble = g.memory.cubDiedPending;
  g.memory.cubDiedPending = false;
  g.calls = nightScript(g.deck, g.night === 1 ? 'first' : 'later', g.firstNightKill).map(
    (s) => s.call,
  );
  g.acts = emptyActs();
  cue(g, { k: 'night', n: g.night });
  openStep(g, 0, at);
}

function openStep(g: ClassicGame, step: number, at: number) {
  const call = g.calls[step]!;
  const duration =
    call === 'wolves'
      ? g.timings.wolvesStepMs
      : call === 'witch'
        ? g.timings.witchStepMs
        : g.timings.nightStepMs;
  g.phase = { kind: 'night', step, endsAt: at + duration };
  cue(g, { k: 'call-open', call, note: stepNote(g, call) });

  // Information handed out when a role wakes up.
  if (call === 'wolves' && g.night === 1) {
    const pack = alivePack(g);
    for (const id of pack) learn(g, id, { k: 'wolves', ids: pack });
  }
  if (call === 'mason') {
    const masons = aliveWith(g, 'mason');
    for (const id of masons) learn(g, id, { k: 'masons', ids: masons });
  }
  if (call === 'witch' && !quietNight(g) && !g.memory.witchUsed) {
    for (const id of aliveWith(g, 'witch')) {
      learn(g, id, { k: 'witch', night: g.night, targets: [...g.acts.wolfVictims] });
    }
  }
  if (call === 'insomniac') {
    for (const id of aliveWith(g, 'insomniac')) {
      learn(g, id, { k: 'insomniac', night: g.night, woke: neighbourWoke(g, id) });
    }
  }
}

/**
 * Public note on a night call (spoken aloud and shown on every phone): only what everyone knows.
 * Secrets go in the private prompt instead: the Wolf Cub double kill only to the wolves
 * (AD-AUTO-13), "potions used" only to the Witch.
 */
function stepNote(g: ClassicGame, call: NightCall): string | null {
  if (!quietNight(g)) return null;
  if (call === 'wolves') return 'meet-only'; // [GS p.2]
  if (call === 'bodyguard' || call === 'witch') return 'no-effect'; // UW-N1-05
  return null;
}

function closeStep(g: ClassicGame) {
  if (g.phase.kind !== 'night') return;
  const call = g.calls[g.phase.step]!;
  if (call === 'wolves') g.acts.wolfVictims = wolfConsensus(g);
  cue(g, { k: 'call-close', call });
}

/** All living wolves must pick the same target(s) [GS p.3, RR p.3]; otherwise nobody dies. */
function wolfConsensus(g: ClassicGame): string[] {
  if (quietNight(g)) return [];
  const pack = alivePack(g);
  if (pack.length === 0) return [];
  const needed = wolfTargetCount(g);
  if (g.wolfMajority) return wolfPlurality(g, pack, needed);
  const first = [...(g.acts.wolves[pack[0]!] ?? [])].sort();
  if (first.length !== needed) return [];
  const same = pack.every((id) => {
    const picks = [...(g.acts.wolves[id] ?? [])].sort();
    return picks.length === first.length && picks.every((p, i) => p === first[i]);
  });
  return same ? first : [];
}

/**
 * AD-AUTO-14: the most picked players win; ties are broken by a hash of the game seed, the night
 * and the player, so the result is random for the table but reproducible from the state.
 */
function wolfPlurality(g: ClassicGame, pack: string[], needed: number): string[] {
  const votes = new Map<string, number>();
  for (const wolf of pack) {
    for (const target of new Set(g.acts.wolves[wolf] ?? [])) {
      votes.set(target, (votes.get(target) ?? 0) + 1);
    }
  }
  const tieBreak = (id: string) => hash(`${g.seed}|${g.night}|${id}`);
  return [...votes.entries()]
    .sort(([a, x], [b, y]) => y - x || tieBreak(a) - tieBreak(b))
    .slice(0, needed)
    .map(([id]) => id);
}

/** FNV-1a, 32 bit. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function wolfTargetCount(g: ClassicGame): number {
  const wanted = g.memory.cubDouble ? 2 : 1;
  return Math.min(wanted, aliveIds(g).length);
}

function resolveNight(g: ClassicGame, at: number) {
  const { acts, memory } = g;
  const killed: { id: string; cause: DeathCause }[] = [];

  if (!quietNight(g)) {
    const protectedId = acts.bodyguard; // UW-R-BG-01
    const saved = acts.witch?.action === 'save' ? acts.witch.target : null;
    for (const victim of acts.wolfVictims) {
      if (victim !== protectedId && victim !== saved) killed.push({ id: victim, cause: 'wolves' });
    }
    if (acts.witch?.action === 'kill' && acts.witch.target) {
      const target = acts.witch.target;
      // [AD] the Bodyguard's protection also stops the Witch ("cannot be eliminated that night").
      if (target !== protectedId && !killed.some((k) => k.id === target)) {
        killed.push({ id: target, cause: 'witch' });
      }
    }
    if (acts.witch && acts.witch.action !== 'pass') memory.witchUsed = true; // UW-R-WIT-02
    memory.lastProtected = acts.bodyguard; // UW-R-BG-02
  }

  if (acts.spellcaster) {
    memory.silenced = acts.spellcaster;
    memory.spellcasterUsed.push(acts.spellcaster);
  }
  for (const target of Object.values(acts.suspects)) {
    g.suspected[target] = (g.suspected[target] ?? 0) + 1;
  }

  const deaths = killed.map((k) => kill(g, k.id, k.cause));
  g.phase = { kind: 'dawn', endsAt: at + g.timings.dawnMs, deaths, silenced: memory.silenced };
  cue(g, { k: 'dawn', deaths, silenced: memory.silenced });
}

function neighbourWoke(g: ClassicGame, id: string): boolean {
  const living = g.seats.filter((s) => g.alive[s]);
  const i = living.indexOf(id);
  if (i < 0 || living.length < 2) return false;
  const neighbours = new Set([
    living[(i - 1 + living.length) % living.length]!,
    living[(i + 1) % living.length]!,
  ]);
  neighbours.delete(id);
  const woke = new Set<ClassicRoleId>();
  for (const call of g.calls) {
    if (call === 'wolves') {
      woke.add('werewolf');
      woke.add('wolf-cub');
    } else woke.add(call);
  }
  return [...neighbours].some((n) => woke.has(g.roles[n]!));
}

// ---------------------------------------------------------------------------
// Actions

function act(
  g: ClassicGame,
  playerId: string,
  players: string[],
  witch: 'save' | 'kill' | 'pass' | undefined,
  now: number,
): ClassicResult {
  if (!(playerId in g.roles)) return fail('no_card');
  const prompt = promptFor(g, playerId);

  if (prompt.kind === 'witch') {
    if (!witch) return fail('invalid_action');
    const target = players[0] ?? null;
    if (witch === 'save' && (!target || !prompt.targets.includes(target)))
      return fail('invalid_action');
    if (witch === 'kill' && (!target || !prompt.options.includes(target)))
      return fail('invalid_action');
    g.acts.witch = { action: witch, target: witch === 'pass' ? null : target };
    return ok(g);
  }
  if (prompt.kind !== 'pick') return fail('wrong_phase');
  if (prompt.locked) return fail('not_allowed');
  if (new Set(players).size !== players.length) return fail('invalid_action');
  if (!players.every((p) => prompt.options.includes(p))) return fail('invalid_action');

  const target = players[0];
  switch (prompt.purpose) {
    case 'hunter': {
      if (players.length > 1) return fail('invalid_action');
      if (g.phase.kind !== 'hunter') return fail('wrong_phase');
      const then = g.phase.then;
      if (target) {
        const death = kill(g, target, 'hunter');
        cue(g, { k: 'eliminated', death });
      }
      afterDeaths(g, now, then);
      return ok(g);
    }
    case 'wolves':
      if (players.length !== prompt.count) return fail('invalid_action');
      g.acts.wolves[playerId] = players;
      return ok(g);
    default:
      if (players.length !== 1 || !target) return fail('invalid_action');
  }

  switch (prompt.purpose) {
    case 'bodyguard':
      if (quietNight(g)) g.acts.dummy[playerId] = target;
      else g.acts.bodyguard = target;
      break;
    case 'seer':
      g.acts.seer = target;
      learn(g, playerId, {
        k: 'seer',
        night: g.night,
        target,
        isWolf: roleDef(g.roles[target]!).seenAsWolf,
      });
      break;
    case 'sorceress':
      g.acts.sorceress = target;
      learn(g, playerId, {
        k: 'sorceress',
        night: g.night,
        target,
        isSeer: g.roles[target] === 'seer',
      });
      break;
    case 'spellcaster':
      g.acts.spellcaster = target;
      break;
    case 'suspect':
      g.acts.suspects[playerId] = target;
      break;
    default:
      return fail('invalid_action');
  }
  return ok(g);
}

function nominate(g: ClassicGame, by: string | null, target: string, now: number): ClassicResult {
  const p = g.phase;
  if (p.kind !== 'day' || p.sub || p.endsAt === null) return fail('wrong_phase');
  if (!g.alive[target]) return fail('invalid_action');
  if (by !== null) {
    if (!g.alive[by] || by === target) return fail('not_allowed');
    if (g.memory.silenced === by) return fail('not_allowed'); // Silenced players cannot speak.
  }
  p.remainingMs = Math.max(0, p.endsAt - now);
  p.endsAt = null;
  p.sub = { kind: 'nominated', by, nominee: target, endsAt: now + g.timings.secondMs };
  cue(g, { k: 'nominated', by, nominee: target });
  return ok(g);
}

function second(g: ClassicGame, by: string | null, now: number): ClassicResult {
  const p = g.phase;
  if (p.kind !== 'day' || p.sub?.kind !== 'nominated') return fail('wrong_phase');
  const sub = p.sub;
  if (by !== null) {
    // UW-VOTE-02: a different player must second.
    if (!g.alive[by] || by === sub.by || by === sub.nominee) return fail('not_allowed');
    if (g.memory.silenced === by) return fail('not_allowed');
  }
  p.sub = { kind: 'defense', nominee: sub.nominee, endsAt: now + g.timings.defenseMs };
  cue(g, { k: 'defense', nominee: sub.nominee });
  return ok(g);
}

function startVoting(g: ClassicGame, at: number) {
  const p = g.phase;
  if (p.kind !== 'day' || !p.sub) return;
  const votes: Record<string, 'keep' | 'eliminate'> = {};
  // The Village Idiot always votes to eliminate [RR p.1].
  for (const id of aliveWith(g, 'village-idiot')) votes[id] = 'eliminate';
  p.sub = { kind: 'voting', nominee: p.sub.nominee, endsAt: at + g.timings.voteMs, votes };
  cue(g, { k: 'voting', nominee: p.sub.nominee });
}

function vote(
  g: ClassicGame,
  playerId: string,
  choice: 'keep' | 'eliminate',
  now: number,
): ClassicResult {
  const p = g.phase;
  if (p.kind !== 'day' || p.sub?.kind !== 'voting') return fail('wrong_phase');
  if (!g.alive[playerId]) return fail('not_allowed');
  if (g.roles[playerId] === 'village-idiot') return fail('not_allowed');
  p.sub.votes[playerId] = choice;
  if (aliveIds(g).every((id) => id in (p.sub as { votes: object }).votes)) resolveVote(g, now);
  return ok(g);
}

/** UW-VOTE-04: more than half of the living players must vote to eliminate. */
function resolveVote(g: ClassicGame, at: number) {
  const p = g.phase;
  if (p.kind !== 'day' || p.sub?.kind !== 'voting') return;
  const { nominee, votes } = p.sub;
  const eliminateCount = Object.values(votes).filter((v) => v === 'eliminate').length;
  const keepCount = Object.values(votes).filter((v) => v === 'keep').length;
  const eliminated = eliminateCount > aliveIds(g).length / 2;
  g.votes.push({ day: g.day, nominee, votes: { ...votes }, eliminated });
  cue(g, { k: 'vote-result', nominee, eliminate: eliminateCount, keep: keepCount, eliminated });

  if (!eliminated) return resumeDiscussion(g, at);
  const death = kill(g, nominee, 'vote');
  // UW-VOTE-05: the village falls asleep immediately.
  g.phase = { kind: 'dusk', endsAt: at + g.timings.duskMs, death };
  cue(g, { k: 'eliminated', death });
}

function resumeDiscussion(g: ClassicGame, at: number) {
  const p = g.phase;
  if (p.kind !== 'day') return;
  const remaining = Math.max(p.remainingMs, g.timings.minResumeMs);
  p.sub = null;
  p.endsAt = at + remaining;
  p.warned = p.warned || remaining <= g.timings.warningMs;
}

function skip(g: ClassicGame, now: number): ClassicResult {
  const p = g.phase;
  if (p.kind !== 'day') return fail('wrong_phase');
  if (p.sub?.kind === 'defense') {
    startVoting(g, now);
    return ok(g);
  }
  if (p.sub) return fail('wrong_phase');
  cue(g, { k: 'day-end' });
  startNight(g, now);
  return ok(g);
}

// ---------------------------------------------------------------------------
// Deaths, hunters, winners

function kill(g: ClassicGame, id: string, cause: DeathCause): Death {
  g.alive[id] = false;
  const role = g.roles[id]!;
  if (role === 'hunter') g.pendingHunters.push(id);
  if (role === 'wolf-cub') g.memory.cubDiedPending = true;
  if (role === 'tanner') g.memory.tannerWon = true;
  const death: Death = {
    playerId: id,
    cause,
    role: g.reveal === 'role' ? role : null,
    team: g.reveal === 'none' ? null : roleDef(role).team,
  };
  g.deaths.push({ ...death, day: Math.max(g.day, g.night) });
  return death;
}

function afterDeaths(g: ClassicGame, at: number, then: 'day' | 'night') {
  // A Tanner win ends the game at once [RR p.3].
  if (g.memory.tannerWon) return gameOver(g, ['tanner']);
  const hunter = g.pendingHunters.shift();
  if (hunter) {
    g.phase = { kind: 'hunter', hunter, endsAt: at + g.timings.hunterMs, then };
    cue(g, { k: 'hunter', hunter });
    return;
  }
  const winners = computeWinners(g);
  if (winners) return gameOver(g, winners);
  if (then === 'day') startDay(g, at);
  else startNight(g, at);
}

/** UW-END-01/02. */
export function computeWinners(g: ClassicGame): Winner[] | null {
  if (g.memory.tannerWon) return ['tanner'];
  const wolves = aliveIds(g).filter((id) => roleDef(g.roles[id]!).seenAsWolf).length;
  const village = aliveIds(g).filter((id) => roleDef(g.roles[id]!).team === 'village').length;
  if (wolves === 0) return ['village'];
  if (wolves >= village) return ['wolf'];
  return null;
}

function gameOver(g: ClassicGame, winners: Winner[]) {
  g.phase = { kind: 'over', winners };
  cue(g, { k: 'game-over', winners });
}

function startDay(g: ClassicGame, at: number) {
  g.day = g.night;
  const ms = g.day === 1 ? g.timings.firstDayMs : g.timings.dayMs;
  g.phase = {
    kind: 'day',
    endsAt: at + ms,
    remainingMs: ms,
    warned: ms <= g.timings.warningMs * 2,
    sub: null,
  };
  cue(g, { k: 'day', n: g.day, minutes: Math.round(ms / 60_000) });
}

// ---------------------------------------------------------------------------
// Prompts and views

function promptFor(g: ClassicGame, id: string): Prompt {
  const sleep: Prompt = { kind: 'sleep' };
  const role = g.roles[id];
  if (!role || g.paused) return sleep;
  const p = g.phase;

  if (p.kind === 'hunter') {
    return p.hunter === id ? pick(g, 'hunter', others(g, id), 1, []) : sleep;
  }
  if (!g.alive[id]) return sleep;

  if (p.kind === 'day') {
    const sub = p.sub;
    if (
      sub?.kind === 'nominated' &&
      id !== sub.by &&
      id !== sub.nominee &&
      g.memory.silenced !== id
    ) {
      return { kind: 'second', nominee: sub.nominee, by: sub.by };
    }
    if (sub?.kind === 'voting') {
      return {
        kind: 'vote',
        nominee: sub.nominee,
        yours: sub.votes[id] ?? null,
        forced: role === 'village-idiot',
      };
    }
    return sleep;
  }
  if (p.kind !== 'night') return sleep;

  const call = g.calls[p.step]!;
  const acts = g.acts;
  const suspect = (note: string | null) =>
    pick(g, 'suspect', others(g, id), 1, acts.suspects[id] ? [acts.suspects[id]] : [], note);
  const isWolf = role === 'werewolf' || role === 'wolf-cub';

  if (call === 'wolves' && isWolf) {
    const pack = alivePack(g).map((w) => ({ id: w, picks: acts.wolves[w] ?? [] }));
    if (quietNight(g)) {
      // Wolves only meet on night 1, but still get something to tap so they look as busy as
      // everyone else [AD, anti-tell]. Their tap counts as a suspicion for the stats.
      return { ...suspect('meet-only'), pack };
    }
    const count = wolfTargetCount(g);
    return {
      ...pick(g, 'wolves', aliveIds(g), count, acts.wolves[id] ?? [], count > 1 ? 'double' : null),
      pack,
    };
  }
  if (call !== role) return suspect(null);

  switch (call) {
    case 'bodyguard': {
      const quiet = quietNight(g);
      const options = others(g, id).filter((o) => quiet || o !== g.memory.lastProtected);
      const chosen = quiet ? acts.dummy[id] : acts.bodyguard;
      const selected = chosen ? [chosen] : [];
      return pick(g, 'bodyguard', options, 1, selected, quiet ? 'no-effect' : null);
    }
    case 'witch':
      if (quietNight(g)) return suspect('no-effect');
      if (g.memory.witchUsed) return suspect('used');
      return {
        kind: 'witch',
        targets: [...acts.wolfVictims],
        options: others(g, id),
        choice: acts.witch,
      };
    case 'seer':
      return {
        ...pick(g, 'seer', others(g, id), 1, acts.seer ? [acts.seer] : []),
        locked: !!acts.seer,
      };
    case 'sorceress':
      return {
        ...pick(g, 'sorceress', others(g, id), 1, acts.sorceress ? [acts.sorceress] : []),
        locked: !!acts.sorceress,
      };
    case 'spellcaster': {
      const options = others(g, id).filter((o) => !g.memory.spellcasterUsed.includes(o));
      return pick(g, 'spellcaster', options, 1, acts.spellcaster ? [acts.spellcaster] : []);
    }
    case 'mason':
      return suspect('masons');
    case 'insomniac':
      return suspect('insomniac');
    default:
      return suspect(null);
  }
}

function pick(
  _g: ClassicGame,
  purpose: Extract<Prompt, { kind: 'pick' }>['purpose'],
  options: string[],
  count: number,
  selected: string[],
  note: string | null = null,
): Extract<Prompt, { kind: 'pick' }> {
  return {
    kind: 'pick',
    purpose,
    options,
    count,
    centerCount: 0,
    selected,
    selectedCenter: [],
    locked: false,
    pack: null,
    note,
  };
}

function phaseView(g: ClassicGame): ClassicPhaseView {
  const p = g.phase;
  switch (p.kind) {
    case 'reveal':
      return { kind: 'reveal', seen: g.seen.length, total: g.seats.length };
    case 'night':
      return { kind: 'night', night: g.night, call: g.calls[p.step]!, endsAt: p.endsAt };
    case 'dawn':
      return { kind: 'dawn', endsAt: p.endsAt, deaths: p.deaths, silenced: p.silenced };
    case 'hunter':
      return { kind: 'hunter', hunter: p.hunter, endsAt: p.endsAt };
    case 'dusk':
      return { kind: 'dusk', endsAt: p.endsAt, death: p.death };
    case 'over':
      return { kind: 'over', winners: p.winners };
    case 'day': {
      const sub = p.sub;
      return {
        kind: 'day',
        day: g.day,
        silenced: g.memory.silenced,
        endsAt: p.endsAt,
        remainingMs: p.remainingMs,
        sub:
          sub === null
            ? null
            : sub.kind === 'voting'
              ? {
                  kind: 'voting',
                  nominee: sub.nominee,
                  endsAt: sub.endsAt,
                  voted: Object.keys(sub.votes).length,
                  total: aliveIds(g).length,
                }
              : sub,
      };
    }
  }
}

/** Projection for one player, or for the narrator display when `viewer` is null. */
export function classicView(g: ClassicGame, viewer: string | null, now: number): ClassicView {
  const over = g.phase.kind === 'over';
  return {
    kind: 'classic',
    now,
    paused: g.paused !== null,
    seats: g.seats.map((id) => {
      const dead = !g.alive[id];
      const role = g.roles[id]!;
      const showRole = over || (dead && g.reveal === 'role');
      const showTeam = over || (dead && g.reveal !== 'none');
      return {
        id,
        alive: !dead,
        role: showRole ? role : null,
        team: showTeam ? roleDef(role).team : null,
      };
    }),
    phase: over ? phaseView(g) : hideNightCauses(phaseView(g)),
    cues: over ? g.cues : g.cues.map(hideCueCause),
    wolfMajority: g.wolfMajority,
    you:
      viewer !== null && viewer in g.roles
        ? {
            role: g.roles[viewer]!,
            alive: !!g.alive[viewer],
            seen: g.seen.includes(viewer),
            silenced: g.phase.kind === 'day' && g.memory.silenced === viewer,
            knowledge: g.knowledge[viewer] ?? [],
            prompt: promptFor(g, viewer),
          }
        : null,
    stats: over
      ? { roles: { ...g.roles }, deaths: g.deaths, votes: g.votes, suspected: g.suspected }
      : null,
  };
}

/** During the game nobody may learn whether a night death came from the wolves or the Witch. */
function publicDeath(d: Death): Death {
  return d.cause === 'wolves' || d.cause === 'witch' ? { ...d, cause: 'night' } : d;
}

function hideNightCauses(p: ClassicPhaseView): ClassicPhaseView {
  if (p.kind === 'dawn') return { ...p, deaths: p.deaths.map(publicDeath) };
  if (p.kind === 'dusk') return { ...p, death: publicDeath(p.death) };
  return p;
}

function hideCueCause(entry: CueEntry): CueEntry {
  const c = entry.cue;
  if (c.k === 'dawn') return { ...entry, cue: { ...c, deaths: c.deaths.map(publicDeath) } };
  if (c.k === 'eliminated') return { ...entry, cue: { ...c, death: publicDeath(c.death) } };
  return entry;
}

// ---------------------------------------------------------------------------
// Helpers

/** Night 1 under the official rule: wolves only meet, protections have no effect. */
function quietNight(g: ClassicGame): boolean {
  return g.night === 1 && !g.firstNightKill;
}

function emptyActs(): NightActs {
  return {
    wolves: {},
    wolfVictims: [],
    bodyguard: null,
    witch: null,
    seer: null,
    sorceress: null,
    spellcaster: null,
    suspects: {},
    dummy: {},
  };
}

function aliveIds(g: ClassicGame): string[] {
  return g.seats.filter((id) => g.alive[id]);
}

function others(g: ClassicGame, id: string): string[] {
  return aliveIds(g).filter((o) => o !== id);
}

function aliveWith(g: ClassicGame, role: ClassicRoleId): string[] {
  return aliveIds(g).filter((id) => g.roles[id] === role);
}

function alivePack(g: ClassicGame): string[] {
  return aliveIds(g).filter((id) => g.roles[id] === 'werewolf' || g.roles[id] === 'wolf-cub');
}

function learn(g: ClassicGame, id: string, item: Knowledge) {
  (g.knowledge[id] ??= []).push(item);
}

function cue(g: ClassicGame, c: Cue) {
  g.cueSeq += 1;
  g.cues.push({ seq: g.cueSeq, cue: c });
  if (g.cues.length > CUE_HISTORY) g.cues.splice(0, g.cues.length - CUE_HISTORY);
}

function ok(game: ClassicGame): ClassicResult {
  return { ok: true, game };
}

function fail(error: ErrorCode): ClassicResult {
  return { ok: false, error };
}
