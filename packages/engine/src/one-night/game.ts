import {
  ONE_NIGHT_ROLE_IDS,
  type Cue,
  type CueEntry,
  type ErrorCode,
  type Knowledge,
  type OneNightPhaseView,
  type OneNightResult,
  type OneNightRoleCounts,
  type OneNightRoleId,
  type OneNightView,
  type Prompt,
  type Winner,
} from '@bwf/protocol';
import { clone } from '../clone.ts';
import type { Random } from '../random.ts';
import { CENTER_CARDS, oneNightDef } from './roles.ts';

/**
 * One Night Ultimate Werewolf with the app as announcer (M3). Rules: docs/rules/one-night.md.
 * [AD] marks app decisions where the rulebook relies on a human announcer or is not available
 * The day/vote rules (ON-DAY/ON-VOTE) are project decisions [AD]: the official Getting Started
 * Guide that holds them has no digital copy (docs/rules/one-night.md §4).
 */

export type OneNightCall =
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  /** #9a: a Doppelgänger who copied the Insomniac looks at their card again [OR p.6]. */
  | 'doppel-insomniac';

/** Roles whose action the Doppelgänger performs immediately during its own call [OR p.2]. */
const IMMEDIATE: readonly OneNightRoleId[] = ['seer', 'robber', 'troublemaker', 'drunk'];

export interface OneNightTimings {
  /** Every call lasts the same time, even for roles sitting in the center [AD, ON-NIGHT]. */
  stepMs: number;
  /** The Doppelgänger may look and then act in the same call, so it gets longer. */
  doppelStepMs: number;
  dayMs: number;
  voteMs: number;
}

export const ONE_NIGHT_TIMINGS: Omit<OneNightTimings, 'dayMs'> = {
  stepMs: 12_000,
  doppelStepMs: 20_000,
  voteMs: 30_000,
};

type Phase =
  | { kind: 'reveal' }
  | { kind: 'night'; step: number; endsAt: number }
  | { kind: 'day'; endsAt: number }
  | { kind: 'vote'; endsAt: number }
  | { kind: 'over'; winners: Winner[] };

export interface OneNightGame {
  seats: string[];
  /** Card each player was dealt (their night role). */
  original: Record<string, OneNightRoleId>;
  /** Card each player holds now (changes during the night). */
  cards: Record<string, OneNightRoleId>;
  center: OneNightRoleId[];
  /** Role the Doppelgänger copied (null until it looks). */
  doppelCopy: OneNightRoleId | null;
  calls: OneNightCall[];
  phase: Phase;
  paused: { at: number } | null;
  timings: OneNightTimings;
  loneWolf: boolean;
  seen: string[];
  /** Players whose once-per-night action is done. */
  done: string[];
  suspects: Record<string, string>;
  votes: Record<string, string>;
  knowledge: Record<string, Knowledge[]>;
  result: OneNightResult | null;
  cues: CueEntry[];
  cueSeq: number;
}

export type OneNightAction =
  | { type: 'seen'; playerId: string }
  | { type: 'start' }
  | { type: 'act'; playerId: string; players: string[]; center: number[] }
  | { type: 'accuse'; playerId: string; target: string }
  | { type: 'pause'; paused: boolean }
  | { type: 'skip' }
  | { type: 'tick' };

export type OneNightResultT = { ok: true; game: OneNightGame } | { ok: false; error: ErrorCode };

export interface OneNightContext {
  now: number;
  random: Random;
}

const ORDER: readonly OneNightCall[] = [
  'doppelganger',
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
  'doppel-insomniac',
];

/** Builds the game from an already shuffled deck: first cards to the seats, last 3 to the center. */
export function startOneNight(input: {
  seats: string[];
  deck: OneNightRoleId[];
  roles: OneNightRoleCounts;
  dayMinutes: number;
  loneWolf?: boolean;
  timings?: Partial<OneNightTimings>;
}): OneNightGame {
  const { seats, deck } = input;
  if (deck.length !== seats.length + CENTER_CARDS) throw new Error('deck size mismatch');
  const original = Object.fromEntries(seats.map((id, i) => [id, deck[i]!]));
  return {
    seats: [...seats],
    original,
    cards: { ...original },
    center: deck.slice(seats.length),
    doppelCopy: null,
    // ON-NIGHT: call every role in the deck, even if its card ended up in the center.
    calls: ORDER.filter((call) =>
      call === 'doppel-insomniac'
        ? (input.roles.doppelganger ?? 0) > 0 && (input.roles.insomniac ?? 0) > 0
        : (input.roles[call] ?? 0) > 0,
    ),
    phase: { kind: 'reveal' },
    paused: null,
    timings: { ...ONE_NIGHT_TIMINGS, dayMs: input.dayMinutes * 60_000, ...input.timings },
    loneWolf: input.loneWolf ?? true, // ON-NIGHT-03 default on [AD]
    seen: [],
    done: [],
    suspects: {},
    votes: {},
    knowledge: Object.fromEntries(seats.map((id) => [id, []])),
    result: null,
    cues: [],
    cueSeq: 0,
  };
}

export function applyOneNight(
  prev: OneNightGame,
  action: OneNightAction,
  ctx: OneNightContext,
): OneNightResultT {
  const g = clone(prev);
  const { now } = ctx;

  if (action.type === 'pause') return pause(g, action.paused, now);
  if (action.type === 'seen') {
    if (!(action.playerId in g.original)) return fail('no_card');
    if (!g.seen.includes(action.playerId)) g.seen.push(action.playerId);
    return ok(g);
  }
  if (g.paused) return action.type === 'tick' ? ok(g) : fail('wrong_phase');

  advance(g, ctx);

  switch (action.type) {
    case 'tick':
      return ok(g);
    case 'start':
      if (g.phase.kind !== 'reveal') return fail('wrong_phase');
      cue(g, { k: 'game-start' });
      cue(g, { k: 'night', n: 1 });
      if (g.calls.length) openStep(g, 0, now);
      else startDay(g, now);
      return ok(g);
    case 'act':
      return act(g, action.playerId, action.players, action.center);
    case 'accuse':
      return accuse(g, action.playerId, action.target, now);
    case 'skip':
      if (g.phase.kind === 'day') {
        startVote(g, now);
        return ok(g);
      }
      return fail('wrong_phase');
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function oneNightDeadline(g: OneNightGame): number | null {
  if (g.paused) return null;
  const p = g.phase;
  return p.kind === 'night' || p.kind === 'day' || p.kind === 'vote' ? p.endsAt : null;
}

// ---------------------------------------------------------------------------

function advance(g: OneNightGame, ctx: OneNightContext) {
  for (let guard = 0; guard < 50; guard++) {
    const at = oneNightDeadline(g);
    if (at === null || at > ctx.now) return;
    const p = g.phase;
    if (p.kind === 'night') {
      closeStep(g, ctx.random);
      if (p.step + 1 < g.calls.length) openStep(g, p.step + 1, at);
      else startDay(g, at);
    } else if (p.kind === 'day') {
      startVote(g, at);
    } else if (p.kind === 'vote') {
      resolve(g);
    }
  }
}

function pause(g: OneNightGame, paused: boolean, now: number): OneNightResultT {
  if (g.phase.kind === 'reveal' || g.phase.kind === 'over') return fail('wrong_phase');
  if (paused && !g.paused) {
    g.paused = { at: now };
    cue(g, { k: 'paused' });
  } else if (!paused && g.paused) {
    const p = g.phase;
    if ('endsAt' in p) p.endsAt += now - g.paused.at;
    g.paused = null;
    cue(g, { k: 'resumed' });
  }
  return ok(g);
}

function openStep(g: OneNightGame, step: number, at: number) {
  const call = g.calls[step]!;
  const ms = call === 'doppelganger' ? g.timings.doppelStepMs : g.timings.stepMs;
  g.phase = { kind: 'night', step, endsAt: at + ms };
  g.done = [];
  cue(g, { k: 'call-open', call, note: null });

  const wolves = actingAs(g, 'werewolf');
  if (call === 'werewolf') {
    for (const id of wolves) learn(g, id, { k: 'wolves', ids: wolves });
  }
  if (call === 'minion') {
    for (const id of holdersOf(g, 'minion', 'original'))
      learn(g, id, { k: 'on-minion', ids: wolves });
  }
  if (call === 'mason') {
    const masons = actingAs(g, 'mason');
    for (const id of masons) learn(g, id, { k: 'masons', ids: masons });
  }
  if (call === 'insomniac') {
    for (const id of holdersOf(g, 'insomniac', 'original')) {
      learn(g, id, { k: 'on-self', role: g.cards[id]! });
    }
  }
  if (call === 'doppel-insomniac' && g.doppelCopy === 'insomniac') {
    for (const id of holdersOf(g, 'doppelganger', 'original')) {
      learn(g, id, { k: 'on-self', role: g.cards[id]! });
    }
  }
}

function closeStep(g: OneNightGame, random: Random) {
  if (g.phase.kind !== 'night') return;
  const call = g.calls[g.phase.step]!;
  // [OW] the Drunk must swap; if they did not choose in time, pick a center card for them [AD].
  if (call === 'drunk') {
    for (const id of holdersOf(g, 'drunk', 'original')) {
      if (!g.done.includes(id)) swapWithCenter(g, id, Math.floor(random() * CENTER_CARDS));
    }
  }
  // A Doppelgänger-Drunk must swap too.
  if (call === 'doppelganger' && g.doppelCopy === 'drunk') {
    for (const id of holdersOf(g, 'doppelganger', 'original')) {
      if (!g.done.includes(id)) swapWithCenter(g, id, Math.floor(random() * CENTER_CARDS));
    }
  }
  cue(g, { k: 'call-close', call });
}

function startDay(g: OneNightGame, at: number) {
  g.phase = { kind: 'day', endsAt: at + g.timings.dayMs };
  cue(g, { k: 'on-day', minutes: Math.round(g.timings.dayMs / 60_000) });
}

function startVote(g: OneNightGame, at: number) {
  g.phase = { kind: 'vote', endsAt: at + g.timings.voteMs };
  cue(g, { k: 'on-vote' });
}

// ---------------------------------------------------------------------------

function act(
  g: OneNightGame,
  playerId: string,
  players: string[],
  center: number[],
): OneNightResultT {
  if (!(playerId in g.original)) return fail('no_card');
  const prompt = promptFor(g, playerId);
  if (prompt.kind !== 'pick') return fail('wrong_phase');
  if (prompt.locked) return fail('not_allowed');
  if (new Set(players).size !== players.length || new Set(center).size !== center.length) {
    return fail('invalid_action');
  }
  if (!players.every((p) => prompt.options.includes(p))) return fail('invalid_action');
  const target = players[0];

  switch (prompt.purpose) {
    case 'suspect':
      if (players.length !== 1 || !target) return fail('invalid_action');
      g.suspects[playerId] = target;
      return ok(g);
    case 'on-doppel': {
      // [OR p.2] look at (not move) another player's card and become that role.
      if (players.length !== 1 || center.length || !target) return fail('invalid_action');
      const copy = g.cards[target]!;
      g.doppelCopy = copy;
      learn(g, playerId, { k: 'on-doppel', target, role: copy });
      // A Doppelgänger-Minion learns the werewolves at the end of its own call [OR p.3].
      if (copy === 'minion') learn(g, playerId, { k: 'on-minion', ids: actingAs(g, 'werewolf') });
      // Roles with an immediate action keep the prompt open for that action.
      if (IMMEDIATE.includes(copy)) return ok(g);
      break;
    }
    case 'on-werewolf': // Lone wolf peeks at one center card (ON-NIGHT-03).
      if (players.length || center.length !== 1) return fail('invalid_action');
      learn(g, playerId, { k: 'on-center', index: center[0]!, role: g.center[center[0]!]! });
      break;
    case 'on-seer': // One other player's card, or two center cards [OR p.4].
      if (players.length === 1 && center.length === 0 && target) {
        learn(g, playerId, { k: 'on-player', target, role: g.cards[target]! });
      } else if (players.length === 0 && center.length === 2) {
        for (const i of center)
          learn(g, playerId, { k: 'on-center', index: i, role: g.center[i]! });
      } else return fail('invalid_action');
      break;
    case 'on-robber': // Swap with another player, then look at the new card [OR p.4].
      if (players.length !== 1 || center.length || !target) return fail('invalid_action');
      [g.cards[playerId], g.cards[target]] = [g.cards[target]!, g.cards[playerId]!];
      learn(g, playerId, { k: 'on-robbed', target, role: g.cards[playerId]! });
      break;
    case 'on-troublemaker': // Swap two other players without looking [OR p.4].
      if (players.length !== 2 || center.length) return fail('invalid_action');
      [g.cards[players[0]!], g.cards[players[1]!]] = [g.cards[players[1]!]!, g.cards[players[0]!]!];
      break;
    case 'on-drunk': // Swap with a center card without looking [OR p.5].
      if (players.length || center.length !== 1) return fail('invalid_action');
      swapWithCenter(g, playerId, center[0]!);
      break;
    default:
      return fail('invalid_action');
  }
  g.done.push(playerId);
  return ok(g);
}

function swapWithCenter(g: OneNightGame, playerId: string, index: number) {
  const card = g.center[index]!;
  g.center[index] = g.cards[playerId]!;
  g.cards[playerId] = card;
  if (!g.done.includes(playerId)) g.done.push(playerId);
}

function accuse(g: OneNightGame, playerId: string, target: string, now: number): OneNightResultT {
  if (g.phase.kind !== 'vote') return fail('wrong_phase');
  if (!(playerId in g.original) || !(target in g.original)) return fail('invalid_action');
  if (playerId === target) return fail('not_allowed'); // ON-VOTE-01 [AD]
  g.votes[playerId] = target;
  if (g.seats.every((id) => id in g.votes)) resolve(g);
  void now;
  return ok(g);
}

/** ON-VOTE-02..05 [AD] and ON-WIN-01..05 [OW]. */
function resolve(g: OneNightGame) {
  const tally: Record<string, number> = {};
  for (const target of Object.values(g.votes)) tally[target] = (tally[target] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(tally));
  // Nobody dies unless someone gets more than one vote; ties kill everyone tied.
  const deaths = new Set(max > 1 ? Object.keys(tally).filter((id) => tally[id] === max) : []);
  // ON-VOTE-05: a dying Hunter takes the player they voted for (chains if that is a Hunter too).
  let grew = true;
  // Whoever holds the Doppelgänger card is the role it copied [OR p.2, OW].
  const final = Object.fromEntries(g.seats.map((id) => [id, effective(g, g.cards[id]!)]));
  while (grew) {
    grew = false;
    for (const id of [...deaths]) {
      const target = g.votes[id];
      if (final[id] === 'hunter' && target && !deaths.has(target)) {
        deaths.add(target);
        grew = true;
      }
    }
  }

  const dead = [...deaths];
  const isDead = (id: string) => deaths.has(id);
  const wolves = g.seats.filter((id) => final[id] === 'werewolf');
  const minions = g.seats.filter((id) => final[id] === 'minion');
  const tanners = g.seats.filter((id) => final[id] === 'tanner');
  const tannerDied = tanners.some(isDead);
  const wolfDied = wolves.some(isDead);

  const winners: Winner[] = [];
  let winningPlayers: string[] = [];
  const village = g.seats.filter((id) => oneNightDef(final[id]!).team === 'village');

  if (wolves.length > 0) {
    if (wolfDied)
      winners.push('village'); // ON-WIN-01
    else if (!tannerDied) winners.push('wolf'); // ON-WIN-03
  } else {
    if (dead.length === 0)
      winners.push('village'); // ON-WIN-02
    else if (
      minions.some((m) => !isDead(m)) &&
      dead.some((d) => !minions.includes(d)) &&
      !tannerDied
    ) {
      winners.push('wolf'); // ON-WIN-04: the Minion alone
    }
  }
  if (tannerDied) winners.push('tanner'); // ON-WIN-05

  if (winners.includes('village')) winningPlayers.push(...village);
  if (winners.includes('wolf')) winningPlayers.push(...wolves, ...minions);
  if (winners.includes('tanner')) winningPlayers.push(...tanners.filter(isDead));
  winningPlayers = [...new Set(winningPlayers)];

  g.result = {
    original: { ...g.original },
    final: { ...g.cards },
    center: [...g.center],
    doppelCopy: g.doppelCopy,
    votes: { ...g.votes },
    deaths: dead,
    winningPlayers,
  };
  g.phase = { kind: 'over', winners };
  cue(g, { k: 'on-result', deaths: dead });
  cue(g, { k: 'game-over', winners });
}

// ---------------------------------------------------------------------------
// Prompts and views

function promptFor(g: OneNightGame, id: string): Prompt {
  const p = g.phase;
  if (g.paused) return { kind: 'sleep' };
  if (p.kind === 'vote') {
    return { kind: 'accuse', options: g.seats.filter((o) => o !== id), yours: g.votes[id] ?? null };
  }
  if (p.kind !== 'night') return { kind: 'sleep' };

  const call = g.calls[p.step]!;
  const others = g.seats.filter((o) => o !== id);
  const done = g.done.includes(id);
  const base = {
    kind: 'pick' as const,
    options: others,
    count: 1,
    centerCount: 0,
    selected: [] as string[],
    selectedCenter: [] as number[],
    locked: done,
    pack: null,
    note: null as string | null,
  };
  const suspect: PickPrompt = {
    ...base,
    purpose: 'suspect',
    locked: false,
    selected: g.suspects[id] ? [g.suspects[id]] : [],
  };

  const isDoppel = g.original[id] === 'doppelganger';
  if (call === 'doppelganger') {
    if (!isDoppel) return suspect;
    if (!g.doppelCopy) return { ...base, purpose: 'on-doppel' };
    // After copying: do the copied action now, if it has one; otherwise keep tapping.
    return IMMEDIATE.includes(g.doppelCopy) && !done
      ? actionPrompt(g.doppelCopy, base, suspect)
      : { ...suspect, note: 'doppel' };
  }
  if (call === 'doppel-insomniac') {
    return { ...suspect, note: isDoppel && g.doppelCopy === 'insomniac' ? 'insomniac' : null };
  }
  // A Doppelgänger who copied the Werewolf or Mason wakes with them [OR p.2].
  const acting =
    g.original[id] === call ||
    (isDoppel && g.doppelCopy === call && (call === 'werewolf' || call === 'mason'));
  if (!acting) return suspect;
  if (call === 'werewolf') {
    if (actingAs(g, 'werewolf').length === 1 && g.loneWolf) {
      return {
        ...base,
        purpose: 'on-werewolf',
        options: [],
        count: 0,
        centerCount: 1,
        note: 'lone',
      };
    }
    return { ...suspect, note: 'pack' };
  }
  return actionPrompt(call, base, suspect);
}

type PickPrompt = Extract<Prompt, { kind: 'pick' }>;
type PickBase = Omit<PickPrompt, 'purpose'>;

/** The prompt for a role's own night action (also used by a Doppelgänger that copied it). */
function actionPrompt(role: string, base: PickBase, suspect: PickPrompt): Prompt {
  switch (role) {
    case 'seer':
      return { ...base, purpose: 'on-seer', centerCount: 2 };
    case 'robber':
      return { ...base, purpose: 'on-robber' };
    case 'troublemaker':
      return { ...base, purpose: 'on-troublemaker', count: 2 };
    case 'drunk':
      return { ...base, purpose: 'on-drunk', options: [], count: 0, centerCount: 1 };
    default:
      // Information-only roles (Minion, Mason, Insomniac): keep tapping like everyone else.
      return { ...suspect, note: role };
  }
}

function phaseView(g: OneNightGame): OneNightPhaseView {
  const p = g.phase;
  switch (p.kind) {
    case 'reveal':
      return { kind: 'reveal', seen: g.seen.length, total: g.seats.length };
    case 'night':
      return { kind: 'night', call: g.calls[p.step]!, endsAt: p.endsAt };
    case 'day':
      return { kind: 'day', endsAt: p.endsAt };
    case 'vote':
      return {
        kind: 'vote',
        endsAt: p.endsAt,
        voted: Object.keys(g.votes).length,
        total: g.seats.length,
      };
    case 'over':
      return { kind: 'over', winners: p.winners };
  }
}

export function oneNightView(g: OneNightGame, viewer: string | null, now: number): OneNightView {
  return {
    kind: 'one-night',
    now,
    paused: g.paused !== null,
    seats: g.seats.map((id) => ({ id })),
    phase: phaseView(g),
    cues: g.cues,
    you:
      viewer !== null && viewer in g.original
        ? {
            role: g.original[viewer]!,
            seen: g.seen.includes(viewer),
            knowledge: g.knowledge[viewer] ?? [],
            prompt: promptFor(g, viewer),
          }
        : null,
    result: g.result,
  };
}

// ---------------------------------------------------------------------------

/** Players who wake up as `role`: its dealt holders plus a Doppelgänger that copied it. */
function actingAs(g: OneNightGame, role: OneNightRoleId): string[] {
  return g.seats.filter(
    (id) => g.original[id] === role || (g.original[id] === 'doppelganger' && g.doppelCopy === role),
  );
}

/** The role a card stands for at the end of the night. */
function effective(g: OneNightGame, card: OneNightRoleId): OneNightRoleId {
  return card === 'doppelganger' && g.doppelCopy ? g.doppelCopy : card;
}

function holdersOf(g: OneNightGame, role: OneNightRoleId, which: 'original' | 'cards'): string[] {
  return g.seats.filter((id) => g[which][id] === role);
}

function learn(g: OneNightGame, id: string, item: Knowledge) {
  (g.knowledge[id] ??= []).push(item);
}

function cue(g: OneNightGame, c: Cue) {
  g.cueSeq += 1;
  g.cues.push({ seq: g.cueSeq, cue: c });
  if (g.cues.length > 12) g.cues.splice(0, g.cues.length - 12);
}

function ok(game: OneNightGame): OneNightResultT {
  return { ok: true, game };
}

function fail(error: ErrorCode): OneNightResultT {
  return { ok: false, error };
}

/** Flat deck in catalog order. */
export function buildOneNightDeck(roles: OneNightRoleCounts): OneNightRoleId[] {
  return ONE_NIGHT_ROLE_IDS.flatMap((id) => Array<OneNightRoleId>(roles[id] ?? 0).fill(id));
}
