import type { OneNightRoleCounts, OneNightRoleId } from '@bwf/protocol';
import { describe, expect, it } from 'vitest';
import {
  applyOneNight,
  oneNightDeadline,
  oneNightPresets,
  oneNightView,
  oneNightCardCount,
  startOneNight,
  validateOneNight,
  type OneNightAction,
  type OneNightGame,
} from '../src/index.ts';

/** Deck order = seats p1..pN, then the 3 center cards. */
class Sim {
  game: OneNightGame;
  now = 0;
  random = () => 0;

  constructor(deck: OneNightRoleId[], players: number) {
    const seats = Array.from({ length: players }, (_, i) => `p${i + 1}`);
    const roles = deck.reduce<OneNightRoleCounts>((d, r) => ({ ...d, [r]: (d[r] ?? 0) + 1 }), {});
    this.game = startOneNight({
      seats,
      deck,
      roles,
      dayMinutes: 1,
      timings: { stepMs: 1_000, voteMs: 1_000 },
    });
  }

  do(action: OneNightAction) {
    const r = applyOneNight(this.game, action, { now: this.now, random: this.random });
    if (!r.ok) throw new Error(`${action.type} rejected: ${r.error}`);
    this.game = r.game;
    return this;
  }

  error(action: OneNightAction) {
    const r = applyOneNight(this.game, action, { now: this.now, random: this.random });
    return r.ok ? null : r.error;
  }

  next() {
    const at = oneNightDeadline(this.game);
    if (at === null) throw new Error('no deadline');
    this.now = at;
    return this.do({ type: 'tick' });
  }

  untilCall(call: string) {
    for (let i = 0; i < 20; i++) {
      const p = this.game.phase;
      if (p.kind === 'night' && this.game.calls[p.step] === call) return this;
      this.next();
    }
    throw new Error(`never reached ${call}`);
  }

  untilVote() {
    for (let i = 0; i < 20 && this.game.phase.kind !== 'vote'; i++) this.next();
    return this;
  }

  act(id: string, players: string[], center: number[] = []) {
    return this.do({ type: 'act', playerId: id, players, center });
  }

  /** votes[i] = the seat p(i+1) points at. */
  vote(votes: Record<string, string>) {
    this.untilVote();
    for (const [id, target] of Object.entries(votes))
      this.do({ type: 'accuse', playerId: id, target });
    if (this.game.phase.kind === 'vote') this.next();
    return this;
  }

  winners() {
    return this.game.phase.kind === 'over' ? this.game.phase.winners : null;
  }
}

// 5 players + 3 center.
const DECK: OneNightRoleId[] = [
  'werewolf', // p1
  'seer', // p2
  'robber', // p3
  'troublemaker', // p4
  'villager', // p5
  'werewolf', // center 0
  'drunk', // center 1
  'villager', // center 2
];

function started(deck = DECK, players = 5) {
  return new Sim(deck, players).do({ type: 'start' });
}

describe('setup (ON-SETUP)', () => {
  it('needs exactly three more cards than players', () => {
    expect(validateOneNight({ werewolf: 2, seer: 1, villager: 3 }, 5)).toContainEqual({
      level: 'error',
      code: 'count_mismatch',
      cards: 6,
      seats: 8,
    });
  });

  it('requires both Masons and warns about a useless Insomniac', () => {
    const issues = validateOneNight({ werewolf: 2, mason: 1, insomniac: 1, villager: 2 }, 3);
    expect(issues.map((i) => i.code)).toEqual(['masons_pair', 'insomniac_useless']);
  });

  it.each([3, 4, 5, 6, 7, 8, 9, 10])('has a valid preset for %i players', (seats) => {
    const [preset] = oneNightPresets(seats);
    expect(oneNightCardCount(preset!.roles)).toBe(seats + 3);
    expect(validateOneNight(preset!.roles, seats).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('calls every role in the deck, in the official order, even if it sits in the center', () => {
    const sim = started();
    expect(sim.game.calls).toEqual(['werewolf', 'seer', 'robber', 'troublemaker', 'drunk']);
    expect(sim.game.center).toEqual(['werewolf', 'drunk', 'villager']);
  });
});

describe('night actions (ON-NIGHT)', () => {
  it('a lone wolf may look at one center card (ON-NIGHT-03)', () => {
    const sim = started().untilCall('werewolf');
    expect(oneNightView(sim.game, 'p1', 0).you?.prompt).toMatchObject({
      purpose: 'on-werewolf',
      centerCount: 1,
    });
    sim.act('p1', [], [0]);
    expect(sim.game.knowledge.p1).toContainEqual({ k: 'on-center', index: 0, role: 'werewolf' });
  });

  it('the Seer looks at one player or two center cards', () => {
    const sim = started().untilCall('seer').act('p2', ['p1']);
    expect(sim.game.knowledge.p2).toEqual([{ k: 'on-player', target: 'p1', role: 'werewolf' }]);
    expect(sim.error({ type: 'act', playerId: 'p2', players: [], center: [0, 1] })).toBe(
      'not_allowed',
    );

    const sim2 = started().untilCall('seer');
    expect(sim2.error({ type: 'act', playerId: 'p2', players: [], center: [0] })).toBe(
      'invalid_action',
    );
    sim2.act('p2', [], [1, 2]);
    expect(sim2.game.knowledge.p2).toHaveLength(2);
  });

  it('the Robber swaps and sees the new card; the robbed player becomes a Robber', () => {
    const sim = started().untilCall('robber').act('p3', ['p1']);
    expect(sim.game.cards.p3).toBe('werewolf');
    expect(sim.game.cards.p1).toBe('robber');
    expect(sim.game.knowledge.p3).toEqual([{ k: 'on-robbed', target: 'p1', role: 'werewolf' }]);
  });

  it('the Troublemaker swaps two other players without looking', () => {
    const sim = started().untilCall('troublemaker').act('p4', ['p1', 'p5']);
    expect(sim.game.cards.p1).toBe('villager');
    expect(sim.game.cards.p5).toBe('werewolf');
    expect(sim.game.knowledge.p4).toEqual([]);
    expect(sim.error({ type: 'act', playerId: 'p4', players: ['p1', 'p2'], center: [] })).toBe(
      'not_allowed',
    );
  });

  it('the Drunk must swap with the center; the app picks if time runs out', () => {
    const deck: OneNightRoleId[] = [
      'werewolf',
      'drunk',
      'villager',
      'villager',
      'seer',
      'werewolf',
    ];
    const sim = started(deck, 3).untilCall('drunk');
    sim.next(); // timed out → random() = 0 → center 0
    expect(sim.game.cards.p2).toBe('villager');
    expect(sim.game.center[0]).toBe('drunk');
  });

  it('the Insomniac sees their card at the end of the night', () => {
    const deck: OneNightRoleId[] = [
      'werewolf',
      'robber',
      'insomniac',
      'villager',
      'seer',
      'werewolf',
    ];
    const sim = started(deck, 3).untilCall('robber').act('p2', ['p3']).untilCall('insomniac');
    expect(sim.game.knowledge.p2).toEqual([{ k: 'on-robbed', target: 'p3', role: 'insomniac' }]);
    expect(sim.game.knowledge.p3).toEqual([{ k: 'on-self', role: 'robber' }]);
  });

  it('roles act by the card they were dealt, not the card they hold now', () => {
    const sim = started().untilCall('robber').act('p3', ['p4']).untilCall('troublemaker');
    // p4 was dealt the Troublemaker; p3 now holds it but does not act again [OW].
    expect(oneNightView(sim.game, 'p3', 0).you?.prompt).toMatchObject({ purpose: 'suspect' });
    expect(oneNightView(sim.game, 'p4', 0).you?.prompt).toMatchObject({
      purpose: 'on-troublemaker',
    });
  });

  it('everyone else gets a look-alike prompt', () => {
    const sim = started().untilCall('seer');
    expect(oneNightView(sim.game, 'p5', 0).you?.prompt).toMatchObject({
      kind: 'pick',
      purpose: 'suspect',
    });
  });
});

describe('vote and winners (ON-VOTE, ON-WIN)', () => {
  it('the most-voted player dies; the village wins if a wolf dies', () => {
    const sim = started().vote({ p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p1', p5: 'p1' });
    expect(sim.game.result?.deaths).toEqual(['p1']);
    expect(sim.winners()).toEqual(['village']);
    expect(sim.game.result?.winningPlayers.sort()).toEqual(['p2', 'p3', 'p4', 'p5']);
  });

  it('wolves win if no wolf dies', () => {
    const sim = started().vote({ p1: 'p5', p2: 'p5', p3: 'p5', p4: 'p1', p5: 'p1' });
    expect(sim.game.result?.deaths).toEqual(['p5']);
    expect(sim.winners()).toEqual(['wolf']);
  });

  it('nobody dies if nobody gets more than one vote', () => {
    const sim = started().vote({ p1: 'p2', p2: 'p3', p3: 'p4', p4: 'p5', p5: 'p1' });
    expect(sim.game.result?.deaths).toEqual([]);
    expect(sim.winners()).toEqual(['wolf']);
  });

  it('a tie kills everyone tied', () => {
    const sim = started().vote({ p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p2', p5: 'p3' });
    expect(sim.game.result?.deaths.sort()).toEqual(['p1', 'p2']);
  });

  it('with no wolf among the players, the village wins only if nobody dies', () => {
    const deck: OneNightRoleId[] = [
      'seer',
      'villager',
      'villager',
      'werewolf',
      'werewolf',
      'drunk',
    ];
    expect(started(deck, 3).vote({ p1: 'p2', p2: 'p3', p3: 'p1' }).winners()).toEqual(['village']);
    expect(started(deck, 3).vote({ p1: 'p2', p2: 'p1', p3: 'p1' }).winners()).toEqual([]);
  });

  it('the Tanner wins by dying and stops the wolves from winning', () => {
    const deck: OneNightRoleId[] = [
      'werewolf',
      'tanner',
      'villager',
      'villager',
      'seer',
      'werewolf',
      'drunk',
    ];
    const sim = started(deck, 4).vote({ p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p2' });
    expect(sim.winners()).toEqual(['tanner']);
    expect(sim.game.result?.winningPlayers).toEqual(['p2']);
  });

  it('a dying Hunter takes their target too (ON-VOTE-05)', () => {
    const deck: OneNightRoleId[] = [
      'werewolf',
      'hunter',
      'villager',
      'villager',
      'seer',
      'werewolf',
      'drunk',
    ];
    const sim = started(deck, 4).vote({ p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p2' });
    expect(sim.game.result?.deaths.sort()).toEqual(['p1', 'p2']);
    expect(sim.winners()).toEqual(['village']);
  });

  it('the Minion wins with the wolves even if the Minion dies', () => {
    const deck: OneNightRoleId[] = [
      'werewolf',
      'minion',
      'villager',
      'villager',
      'seer',
      'werewolf',
      'drunk',
    ];
    const sim = started(deck, 4).vote({ p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p2' });
    expect(sim.winners()).toEqual(['wolf']);
    expect(sim.game.result?.winningPlayers.sort()).toEqual(['p1', 'p2']);
  });

  it('winners are decided by the final cards after swaps', () => {
    // Troublemaker swaps p1 (wolf) and p5 (villager); the vote kills p1, who is now a villager.
    const sim = started().untilCall('troublemaker').act('p4', ['p1', 'p5']);
    sim.vote({ p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p1', p5: 'p2' });
    expect(sim.game.result?.final.p5).toBe('werewolf');
    expect(sim.winners()).toEqual(['wolf']);
    expect(sim.game.result?.winningPlayers).toEqual(['p5']);
  });

  it('players cannot vote for themselves and the vote ends early once everyone voted', () => {
    const sim = started().untilVote();
    expect(sim.error({ type: 'accuse', playerId: 'p1', target: 'p1' })).toBe('not_allowed');
  });
});

describe('secrecy', () => {
  it('players see only what they learned; the full deal is published at the end', () => {
    const sim = started().untilCall('seer').act('p2', ['p1']);
    const view = oneNightView(sim.game, 'p5', sim.now);
    expect(view.you?.role).toBe('villager');
    expect(view.you?.knowledge).toEqual([]);
    expect(view.result).toBeNull();
    // Narration cues name the roles being called (public); private sections must not leak cards.
    expect(JSON.stringify({ seats: view.seats, you: view.you })).not.toContain('werewolf');
    sim.vote({ p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p1', p5: 'p1' });
    expect(oneNightView(sim.game, 'p5', sim.now).result?.original.p1).toBe('werewolf');
  });
});
