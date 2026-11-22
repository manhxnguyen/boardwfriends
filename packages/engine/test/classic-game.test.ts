import type { ClassicRoleId, Prompt } from '@bwf/protocol';
import { describe, expect, it } from 'vitest';
import {
  applyClassic,
  classicDeadline,
  classicView,
  startClassic,
  type ClassicAction,
  type ClassicGame,
  type ClassicTimings,
} from '../src/index.ts';

const FAST: ClassicTimings = {
  firstDayMs: 60_000,
  dayMs: 60_000,
  nightStepMs: 1_000,
  wolvesStepMs: 1_000,
  witchStepMs: 1_000,
  secondMs: 1_000,
  defenseMs: 1_000,
  voteMs: 1_000,
  hunterMs: 1_000,
  dawnMs: 1_000,
  duskMs: 1_000,
  warningMs: 10_000,
  minResumeMs: 5_000,
};

/** Test driver: holds a game and a clock, fails loudly on rejected actions. */
class Sim {
  game: ClassicGame;
  now = 0;

  constructor(
    roles: ClassicRoleId[],
    reveal: 'role' | 'team' | 'none' = 'role',
    firstNightKill = false,
  ) {
    const seats = roles.map((_, i) => `p${i + 1}`);
    this.game = startClassic({
      seats,
      roles: Object.fromEntries(seats.map((id, i) => [id, roles[i]!])),
      deck: roles.reduce<Record<string, number>>((d, r) => ({ ...d, [r]: (d[r] ?? 0) + 1 }), {}),
      reveal,
      firstNightKill,
      dayMinutes: 1,
      timings: FAST,
    });
  }

  do(action: ClassicAction) {
    const r = applyClassic(this.game, action, this.now);
    if (!r.ok) throw new Error(`${action.type} rejected: ${r.error}`);
    this.game = r.game;
    return this;
  }

  error(action: ClassicAction) {
    const r = applyClassic(this.game, action, this.now);
    return r.ok ? null : r.error;
  }

  /** Jumps the clock to the next deadline (one transition). */
  next() {
    const at = classicDeadline(this.game);
    if (at === null) throw new Error(`no deadline in ${this.game.phase.kind}`);
    this.now = at;
    return this.do({ type: 'tick' });
  }

  until(predicate: (g: ClassicGame) => boolean, label = 'condition') {
    for (let i = 0; i < 100; i++) {
      if (predicate(this.game)) return this;
      this.next();
    }
    throw new Error(`never reached ${label}`);
  }

  call() {
    const p = this.game.phase;
    return p.kind === 'night' ? this.game.calls[p.step] : null;
  }

  untilCall(call: string, night?: number) {
    return this.until(
      (g) => this.call() === call && (night === undefined || g.night === night),
      `call ${call}`,
    );
  }

  untilDay(day?: number) {
    return this.until(
      (g) => g.phase.kind === 'day' && (day === undefined || g.day === day),
      `day ${day ?? ''}`,
    );
  }

  untilNight(night: number) {
    return this.until((g) => g.phase.kind === 'night' && g.night === night, `night ${night}`);
  }

  prompt(id: string): Prompt {
    return classicView(this.game, id, this.now).you!.prompt;
  }

  act(id: string, players: string[], witch?: 'save' | 'kill' | 'pass') {
    return this.do({ type: 'act', playerId: id, players, witch });
  }

  /** Full nomination → second → vote cycle; `eliminators` vote eliminate, everyone else keep. */
  lynch(nominator: string, seconder: string, nominee: string, eliminators: string[]) {
    this.do({ type: 'nominate', by: nominator, target: nominee });
    this.do({ type: 'second', by: seconder });
    this.next(); // defense ends → voting
    for (const id of this.living()) {
      if (this.game.roles[id] === 'village-idiot') continue;
      this.do({
        type: 'vote',
        playerId: id,
        choice: eliminators.includes(id) ? 'eliminate' : 'keep',
      });
      if (this.game.phase.kind !== 'day' || this.game.phase.sub?.kind !== 'voting') break;
    }
    return this;
  }

  living() {
    return this.game.seats.filter((id) => this.game.alive[id]);
  }

  cues() {
    return this.game.cues.map((c) => c.cue.k);
  }
}

const BASIC: ClassicRoleId[] = [
  'werewolf', // p1
  'werewolf', // p2
  'seer', // p3
  'bodyguard', // p4
  'witch', // p5
  'hunter', // p6
  'villager', // p7
  'villager', // p8
];

function started(roles = BASIC) {
  return new Sim(roles).do({ type: 'start' });
}

/** Runs night 1 and day 1 without eliminations, stopping at the start of night 2. */
function toNight2(roles = BASIC) {
  return started(roles).untilDay(1).do({ type: 'skip' });
}

describe('setup and reveal', () => {
  it('waits for the host after dealing; tracks who has seen their card', () => {
    const sim = new Sim(BASIC);
    expect(sim.game.phase.kind).toBe('reveal');
    expect(classicDeadline(sim.game)).toBeNull();
    sim.do({ type: 'seen', playerId: 'p1' }).do({ type: 'seen', playerId: 'p1' });
    expect(sim.game.seen).toEqual(['p1']);
  });

  it('starts the first night with the calls of the roles in the deck', () => {
    const sim = started();
    expect(sim.game.night).toBe(1);
    expect(sim.game.calls).toEqual(['bodyguard', 'wolves', 'witch', 'seer']);
    expect(sim.cues()).toEqual(['game-start', 'night', 'call-open']);
  });
});

describe('first night (UW-N1)', () => {
  it('wolves only meet each other and nobody is eliminated', () => {
    const sim = started().untilCall('wolves');
    expect(sim.game.knowledge.p1).toEqual([{ k: 'wolves', ids: ['p1', 'p2'] }]);
    const prompt = sim.prompt('p1');
    // Something to tap like everyone else (anti-tell), plus the pack.
    expect(prompt).toMatchObject({ kind: 'pick', purpose: 'suspect', count: 1, note: 'meet-only' });
    expect((prompt as { pack: unknown }).pack).toEqual([
      { id: 'p1', picks: [] },
      { id: 'p2', picks: [] },
    ]);
    sim.untilDay(1);
    expect(sim.living()).toHaveLength(8);
    expect(sim.game.phase).toMatchObject({ kind: 'day' });
  });

  it('the Seer learns whether the target is a wolf, once per night (UW-R-SEER-01)', () => {
    const sim = started().untilCall('seer');
    sim.act('p3', ['p2']);
    expect(sim.game.knowledge.p3).toEqual([{ k: 'seer', night: 1, target: 'p2', isWolf: true }]);
    expect(sim.error({ type: 'act', playerId: 'p3', players: ['p7'] })).toBe('not_allowed');
  });

  it('Bodyguard and Witch are called but have no effect (UW-N1-05)', () => {
    const sim = started();
    expect(sim.prompt('p4')).toMatchObject({ purpose: 'bodyguard', note: 'no-effect' });
    sim.act('p4', ['p7']);
    expect(sim.game.acts.bodyguard).toBeNull();
    sim.untilCall('witch');
    expect(sim.prompt('p5')).toMatchObject({ kind: 'pick', purpose: 'suspect', note: 'no-effect' });
    sim.untilNight(2).untilCall('bodyguard');
    // Night 1's pick does not count against protecting the same player on night 2.
    expect((sim.prompt('p4') as { options: string[] }).options).toContain('p7');
  });
});

describe('variant: wolves hunt from the first night (AD-AUTO-12)', () => {
  const hunting = () => new Sim(BASIC, 'role', true).do({ type: 'start' });

  it('wolves choose and kill on night 1, after meeting each other', () => {
    const sim = hunting().untilCall('wolves', 1);
    expect(sim.game.knowledge.p1).toEqual([{ k: 'wolves', ids: ['p1', 'p2'] }]);
    expect(sim.prompt('p1')).toMatchObject({
      kind: 'pick',
      purpose: 'wolves',
      count: 1,
      note: null,
    });
    sim
      .act('p1', ['p7'])
      .act('p2', ['p7'])
      .until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p7).toBe(false);
    expect(sim.game.phase).toMatchObject({ deaths: [{ playerId: 'p7', role: 'villager' }] });
    sim.next();
    expect(sim.game.phase).toMatchObject({ kind: 'day' });
    expect(sim.game.day).toBe(1);
  });

  it('the Bodyguard protects for real on night 1', () => {
    const sim = hunting();
    expect(sim.prompt('p4')).toMatchObject({ purpose: 'bodyguard', note: null });
    sim.act('p4', ['p7']).untilCall('wolves', 1).act('p1', ['p7']).act('p2', ['p7']);
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p7).toBe(true);
    expect(sim.game.memory.lastProtected).toBe('p7');
  });

  it('the Witch learns the night-1 target and can save them', () => {
    const sim = hunting()
      .untilCall('wolves', 1)
      .act('p1', ['p8'])
      .act('p2', ['p8'])
      .untilCall('witch', 1);
    expect(sim.prompt('p5')).toMatchObject({ kind: 'witch', targets: ['p8'] });
    sim.act('p5', ['p8'], 'save').until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p8).toBe(true);
    expect(sim.game.memory.witchUsed).toBe(true);
  });

  it('is off by default in the engine (official rule)', () => {
    expect(new Sim(BASIC).game.firstNightKill).toBe(false);
  });
});

describe('anti-tell', () => {
  it('during every call, every living player gets the same kind of prompt', () => {
    const sim = started().untilCall('seer');
    for (const id of sim.living()) {
      expect(sim.prompt(id).kind, id).toBe('pick');
    }
    expect(sim.prompt('p7')).toMatchObject({ purpose: 'suspect' });
  });

  it('suspicions are recorded for the end-of-game stats', () => {
    const sim = started().untilCall('seer');
    sim.act('p7', ['p1']).act('p8', ['p1']);
    sim.untilDay(1);
    expect(sim.game.suspected).toEqual({ p1: 2 });
  });

  it('a night call lasts its full time even when the role acted at once', () => {
    const sim = started().untilCall('seer');
    const endsAt = classicDeadline(sim.game);
    sim.act('p3', ['p7']);
    expect(classicDeadline(sim.game)).toBe(endsAt);
  });
});

describe('wolves (UW-NIGHT-01..03)', () => {
  it('kill the agreed target', () => {
    const sim = toNight2().untilCall('wolves', 2);
    sim.act('p1', ['p7']).act('p2', ['p7']);
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p7).toBe(false);
    expect(sim.game.phase).toMatchObject({
      deaths: [{ playerId: 'p7', cause: 'wolves', role: 'villager', team: 'village' }],
    });
  });

  it('kill nobody when they disagree or run out of time', () => {
    const sim = toNight2().untilCall('wolves', 2);
    sim.act('p1', ['p7']).act('p2', ['p8']);
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.living()).toHaveLength(8);
  });

  it('see each other’s picks and may target a wolf', () => {
    const sim = toNight2().untilCall('wolves', 2);
    sim.act('p1', ['p2']);
    const prompt = sim.prompt('p2') as Extract<Prompt, { kind: 'pick' }>;
    expect(prompt.pack).toEqual([
      { id: 'p1', picks: ['p2'] },
      { id: 'p2', picks: [] },
    ]);
    sim.act('p2', ['p2']);
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p2).toBe(false);
  });

  it('non-wolves cannot act in the wolves step', () => {
    const sim = toNight2().untilCall('wolves', 2);
    expect(sim.prompt('p7')).toMatchObject({ purpose: 'suspect' });
    expect(sim.error({ type: 'act', playerId: 'p7', players: ['p7', 'p8'] })).toBe(
      'invalid_action',
    );
  });
});

describe('Bodyguard (UW-R-BG)', () => {
  it('protects the wolves’ target', () => {
    const sim = toNight2().untilCall('bodyguard', 2);
    sim.act('p4', ['p7']).untilCall('wolves', 2).act('p1', ['p7']).act('p2', ['p7']);
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p7).toBe(true);
  });

  it('cannot protect themselves or the same player two nights in a row', () => {
    const sim = toNight2().untilCall('bodyguard', 2);
    const options = (sim.prompt('p4') as { options: string[] }).options;
    expect(options).not.toContain('p4');
    sim.act('p4', ['p7']).untilDay(2).do({ type: 'skip' }).untilCall('bodyguard', 3);
    expect((sim.prompt('p4') as { options: string[] }).options).not.toContain('p7');
    expect(sim.error({ type: 'act', playerId: 'p4', players: ['p7'] })).toBe('invalid_action');
  });
});

describe('Witch (UW-R-WIT)', () => {
  it('learns the target and can save them', () => {
    const sim = toNight2()
      .untilCall('wolves', 2)
      .act('p1', ['p7'])
      .act('p2', ['p7'])
      .untilCall('witch', 2);
    expect(sim.prompt('p5')).toMatchObject({ kind: 'witch', targets: ['p7'] });
    expect(sim.game.knowledge.p5).toContainEqual({ k: 'witch', night: 2, targets: ['p7'] });
    sim.act('p5', ['p7'], 'save').until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p7).toBe(true);
    expect(sim.game.memory.witchUsed).toBe(true);
  });

  it('can instead eliminate someone, only once per game', () => {
    const sim = toNight2().untilCall('witch', 2).act('p5', ['p1'], 'kill');
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.alive.p1).toBe(false);
    expect(sim.game.deaths[0]).toMatchObject({ playerId: 'p1', cause: 'witch' });
    sim.untilDay(2).do({ type: 'skip' }).untilCall('witch', 3);
    expect(sim.prompt('p5')).toMatchObject({ kind: 'pick', purpose: 'suspect', note: 'used' });
  });

  it('cannot save someone who was not targeted', () => {
    const sim = toNight2().untilCall('witch', 2);
    expect(sim.error({ type: 'act', playerId: 'p5', players: ['p7'], witch: 'save' })).toBe(
      'invalid_action',
    );
  });

  it('passing keeps the power', () => {
    const sim = toNight2().untilCall('witch', 2).act('p5', [], 'pass');
    sim.until((g) => g.phase.kind === 'dawn');
    expect(sim.game.memory.witchUsed).toBe(false);
  });
});

describe('day: nominate, second, vote (UW-VOTE)', () => {
  it('a nomination needs a second from another player', () => {
    const sim = started().untilDay(1);
    sim.do({ type: 'nominate', by: 'p7', target: 'p1' });
    expect(sim.error({ type: 'second', by: 'p7' })).toBe('not_allowed');
    expect(sim.error({ type: 'second', by: 'p1' })).toBe('not_allowed');
    expect(sim.prompt('p8')).toEqual({ kind: 'second', nominee: 'p1', by: 'p7' });
    sim.next(); // nobody seconded in time
    expect(sim.cues().at(-1)).toBe('no-second');
    expect(sim.game.phase).toMatchObject({ kind: 'day', sub: null });
  });

  it('pauses the discussion clock during a nomination', () => {
    const sim = started().untilDay(1);
    sim.now += 20_000;
    sim.do({ type: 'nominate', by: 'p7', target: 'p1' });
    expect(sim.game.phase).toMatchObject({ endsAt: null, remainingMs: 40_000 });
  });

  it('eliminates with more than half of the living players and reveals the card', () => {
    const sim = started().untilDay(1);
    sim.lynch('p7', 'p8', 'p1', ['p3', 'p4', 'p5', 'p6', 'p7']);
    expect(sim.game.alive.p1).toBe(false);
    expect(sim.game.phase).toMatchObject({
      kind: 'dusk',
      death: { playerId: 'p1', role: 'werewolf' },
    });
    expect(sim.game.votes[0]).toMatchObject({ nominee: 'p1', eliminated: true });
    sim.next();
    expect(sim.game.phase.kind).toBe('night'); // UW-VOTE-05: straight to night
  });

  it('exactly half is not enough', () => {
    const sim = started().untilDay(1);
    sim.lynch('p7', 'p8', 'p1', ['p3', 'p4', 'p5', 'p6']);
    expect(sim.game.alive.p1).toBe(true);
    expect(sim.game.phase).toMatchObject({ kind: 'day', sub: null });
  });

  it('the Village Idiot always votes to eliminate', () => {
    const roles: ClassicRoleId[] = [...BASIC.slice(0, 7), 'village-idiot'];
    const sim = started(roles).untilDay(1);
    sim.do({ type: 'nominate', by: 'p7', target: 'p3' }).do({ type: 'second', by: 'p6' }).next();
    expect(sim.prompt('p8')).toEqual({
      kind: 'vote',
      nominee: 'p3',
      yours: 'eliminate',
      forced: true,
    });
    expect(sim.error({ type: 'vote', playerId: 'p8', choice: 'keep' })).toBe('not_allowed');
  });

  it('only living players vote, and the dead cannot nominate', () => {
    const sim = started().untilDay(1).lynch('p7', 'p8', 'p1', ['p3', 'p4', 'p5', 'p6', 'p7']);
    sim.untilDay(2);
    expect(sim.error({ type: 'nominate', by: 'p1', target: 'p2' })).toBe('not_allowed');
  });

  it('the host can end the day early', () => {
    const sim = started().untilDay(1).do({ type: 'skip' });
    expect(sim.game.phase.kind).toBe('night');
    expect(sim.cues()).toContain('day-end');
  });

  it('warns before the day ends, then falls asleep [GS p.3]', () => {
    const sim = started().untilDay(1).next();
    expect(sim.cues().at(-1)).toBe('time-warning');
    sim.next();
    expect(sim.game.phase.kind).toBe('night');
  });
});

describe('Hunter (UW-R-HUN)', () => {
  it('shoots right after being voted out', () => {
    const sim = started().untilDay(1).lynch('p7', 'p8', 'p6', ['p1', 'p2', 'p3', 'p4', 'p5']);
    sim.next(); // dusk ends
    expect(sim.game.phase).toMatchObject({ kind: 'hunter', hunter: 'p6' });
    expect(sim.prompt('p6')).toMatchObject({ purpose: 'hunter' });
    sim.act('p6', ['p1']);
    expect(sim.game.alive.p1).toBe(false);
    expect(sim.game.phase.kind).toBe('night');
  });

  it('killed at night, shoots the next morning', () => {
    const sim = toNight2().untilCall('wolves', 2).act('p1', ['p6']).act('p2', ['p6']);
    sim.until((g) => g.phase.kind === 'hunter');
    sim.act('p6', ['p2']);
    expect(sim.game.alive.p2).toBe(false);
    expect(sim.game.phase.kind).toBe('day');
  });

  it('may fire into the air', () => {
    const sim = started()
      .untilDay(1)
      .lynch('p7', 'p8', 'p6', ['p1', 'p2', 'p3', 'p4', 'p5'])
      .next();
    sim.act('p6', []);
    expect(sim.living()).toHaveLength(7);
  });
});

describe('winning (UW-END)', () => {
  it('the village wins when the last wolf is eliminated', () => {
    const roles: ClassicRoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'villager'];
    const sim = started(roles).untilDay(1).lynch('p3', 'p4', 'p1', ['p2', 'p3', 'p4', 'p5']).next();
    expect(sim.game.phase).toEqual({ kind: 'over', winners: ['village'] });
  });

  it('the wolves win once they equal the village', () => {
    const roles: ClassicRoleId[] = ['werewolf', 'seer', 'villager', 'villager'];
    const sim = started(roles).untilDay(1).lynch('p3', 'p4', 'p2', ['p1', 'p3', 'p4']).next();
    // 1 wolf vs 2 villagers: game continues; night 2 the wolf kills → 1 vs 1.
    sim
      .untilCall('wolves', 2)
      .act('p1', ['p3'])
      .until((g) => g.phase.kind === 'over');
    expect(sim.game.phase).toEqual({ kind: 'over', winners: ['wolf'] });
  });

  it('the Tanner wins alone when eliminated', () => {
    const roles: ClassicRoleId[] = [...BASIC.slice(0, 7), 'tanner'];
    const sim = started(roles)
      .untilDay(1)
      .lynch('p7', 'p6', 'p8', ['p1', 'p2', 'p3', 'p4', 'p5'])
      .next();
    expect(sim.game.phase).toEqual({ kind: 'over', winners: ['tanner'] });
  });

  it('reveals everyone and publishes stats at the end', () => {
    const roles: ClassicRoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'villager'];
    const sim = started(roles).untilDay(1).lynch('p3', 'p4', 'p1', ['p2', 'p3', 'p4', 'p5']).next();
    const view = classicView(sim.game, null, sim.now);
    expect(view.seats.every((s) => s.role !== null)).toBe(true);
    expect(view.stats?.votes).toHaveLength(1);
  });
});

describe('Wolf Cub, Spellcaster, Insomniac, Sorceress', () => {
  it('after the Wolf Cub dies the wolves take two the next night [RR p.4]', () => {
    const roles: ClassicRoleId[] = [
      'werewolf',
      'wolf-cub',
      'seer',
      'villager',
      'villager',
      'villager',
      'villager',
      'villager',
    ];
    const sim = started(roles)
      .untilDay(1)
      .lynch('p4', 'p5', 'p2', ['p3', 'p4', 'p5', 'p6', 'p7'])
      .next();
    sim.untilCall('wolves', 2);
    expect(sim.prompt('p1')).toMatchObject({ purpose: 'wolves', count: 2, note: 'double' });
    sim.act('p1', ['p4', 'p5']).until((g) => g.phase.kind === 'dawn');
    expect(sim.living()).not.toContain('p4');
    expect(sim.living()).not.toContain('p5');
  });

  it('the Seer sees the Wolf Cub as a wolf and the Sorceress as not', () => {
    const roles: ClassicRoleId[] = ['wolf-cub', 'sorceress', 'seer', 'villager', 'villager'];
    const sim = started(roles).untilCall('seer');
    sim.act('p3', ['p1']);
    expect(sim.game.knowledge.p3).toEqual([{ k: 'seer', night: 1, target: 'p1', isWolf: true }]);
    sim.untilCall('sorceress');
    sim.act('p2', ['p3']);
    expect(sim.game.knowledge.p2).toEqual([
      { k: 'sorceress', night: 1, target: 'p3', isSeer: true },
    ]);
  });

  it('the Spellcaster silences someone for the next day, never the same twice', () => {
    const roles: ClassicRoleId[] = [
      'werewolf',
      'spellcaster',
      'villager',
      'villager',
      'villager',
      'villager',
    ];
    const sim = started(roles).untilCall('spellcaster').act('p2', ['p3']).untilDay(1);
    expect(sim.game.phase).toMatchObject({ kind: 'day' });
    expect(classicView(sim.game, 'p3', sim.now).you?.silenced).toBe(true);
    expect(sim.error({ type: 'nominate', by: 'p3', target: 'p1' })).toBe('not_allowed');
    sim.do({ type: 'skip' }).untilCall('spellcaster', 2);
    expect((sim.prompt('p2') as { options: string[] }).options).not.toContain('p3');
  });

  it('the Insomniac learns whether a neighbour woke up', () => {
    // Seats: p1 werewolf, p2 insomniac, p3 villager, p4 villager → p1 is a neighbour and woke.
    const roles: ClassicRoleId[] = ['werewolf', 'insomniac', 'villager', 'villager'];
    const sim = started(roles).untilCall('insomniac');
    expect(sim.game.knowledge.p2).toEqual([{ k: 'insomniac', night: 1, woke: true }]);
    const quiet: ClassicRoleId[] = ['villager', 'insomniac', 'villager', 'werewolf', 'villager'];
    const sim2 = started(quiet).untilCall('insomniac');
    expect(sim2.game.knowledge.p2).toEqual([{ k: 'insomniac', night: 1, woke: false }]);
  });

  it('Masons meet on the first night only', () => {
    const roles: ClassicRoleId[] = ['werewolf', 'mason', 'mason', 'villager', 'villager'];
    const sim = started(roles).untilCall('mason');
    expect(sim.game.knowledge.p2).toEqual([{ k: 'masons', ids: ['p2', 'p3'] }]);
    sim.untilDay(1).do({ type: 'skip' });
    expect(sim.game.calls).not.toContain('mason');
  });
});

describe('reveal variants and secrecy', () => {
  it('can reveal only the team, or nothing', () => {
    for (const [reveal, role, team] of [
      ['team', null, 'wolf'],
      ['none', null, null],
    ] as const) {
      const sim = new Sim(BASIC, reveal).do({ type: 'start' }).untilDay(1);
      sim.lynch('p7', 'p8', 'p1', ['p3', 'p4', 'p5', 'p6', 'p7']);
      const seat = classicView(sim.game, 'p7', sim.now).seats[0]!;
      expect(seat).toEqual({ id: 'p1', alive: false, role, team });
    }
  });

  it('players never receive other players’ roles or private knowledge', () => {
    const sim = started().untilCall('seer');
    sim.act('p3', ['p1']);
    const view = classicView(sim.game, 'p7', sim.now);
    expect(view.seats.every((s) => s.role === null)).toBe(true);
    expect(JSON.stringify(view)).not.toContain('isWolf');
    expect(view.you?.role).toBe('villager');
  });

  it('hides whether a night death came from the wolves or the Witch until the game is over', () => {
    const sim = toNight2().untilCall('wolves', 2).act('p1', ['p7']).act('p2', ['p7']);
    sim.untilCall('witch', 2).act('p5', ['p8'], 'kill');
    sim.until((g) => g.phase.kind === 'dawn');
    for (const viewer of ['p3', 'p5', null]) {
      const view = classicView(sim.game, viewer, sim.now);
      const deaths = view.phase.kind === 'dawn' ? view.phase.deaths : [];
      const cueDeaths = view.cues.flatMap((c) => (c.cue.k === 'dawn' ? c.cue.deaths : []));
      expect(
        deaths.map((d) => d.cause),
        String(viewer),
      ).toEqual(['night', 'night']);
      expect(cueDeaths.map((d) => d.cause)).toEqual(['night', 'night']);
    }
    // The real causes are kept for the end-of-game stats.
    expect(sim.game.deaths.map((d) => d.cause).sort()).toEqual(['witch', 'wolves']);
  });

  it('the narrator display gets no private section', () => {
    expect(classicView(started().game, null, 0).you).toBeNull();
  });
});

describe('pause', () => {
  it('freezes and then shifts every timer', () => {
    const sim = started();
    const endsAt = classicDeadline(sim.game)!;
    sim.now = 500;
    sim.do({ type: 'pause', paused: true });
    expect(classicDeadline(sim.game)).toBeNull();
    expect(sim.error({ type: 'act', playerId: 'p4', players: ['p7'] })).toBe('wrong_phase');
    sim.now = 10_500;
    sim.do({ type: 'pause', paused: false });
    expect(classicDeadline(sim.game)).toBe(endsAt + 10_000);
  });
});
