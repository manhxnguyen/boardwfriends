import { CLASSIC_ROLE_IDS } from '@bwf/protocol';
import { describe, expect, it } from 'vitest';
import {
  CLASSIC_ROLES,
  basicPreset,
  buildDeck,
  canDeal,
  cardCount,
  nightScript,
  presetsFor,
  roleDef,
  totalPoints,
  validateSetup,
  type DeckSetup,
  type Setup,
} from '../src/index.ts';

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const setupOf = (roles: Setup['roles'], moderatorId: string | null = null): DeckSetup => ({
  roles,
  moderatorId,
});
const codes = (issues: ReturnType<typeof validateSetup>) => issues.map((i) => i.code);

describe('role catalog [RR p.1]', () => {
  it('covers every protocol role id', () => {
    expect([...CLASSIC_ROLES.keys()].sort()).toEqual([...CLASSIC_ROLE_IDS].sort());
  });

  it.each([
    ['villager', 1],
    ['werewolf', -6],
    ['seer', 7],
    ['bodyguard', 3],
    ['hunter', 3],
    ['witch', 4],
    ['wolf-cub', -8],
    ['sorceress', -3],
    ['tanner', -2],
    ['village-idiot', 2],
    ['spellcaster', 1],
    ['insomniac', 1],
    ['mason', 2],
  ] as const)('%s is worth %d points', (id, points) => {
    expect(roleDef(id).points).toBe(points);
  });

  it('the Seer only detects wolves, not wolf supporters', () => {
    expect(roleDef('werewolf').seenAsWolf).toBe(true);
    expect(roleDef('sorceress').seenAsWolf).toBe(false);
    expect(roleDef('sorceress').team).toBe('wolf');
  });
});

describe('points and counts', () => {
  it('sums card values (UW-SETUP-04)', () => {
    expect(totalPoints({ werewolf: 2, seer: 1, bodyguard: 1, villager: 4 })).toBe(2);
    expect(totalPoints({})).toBe(0);
    expect(cardCount({ werewolf: 2, villager: 3 })).toBe(5);
  });

  it('builds a flat deck', () => {
    // Catalog order: villager, werewolf, ...
    expect(buildDeck({ werewolf: 1, villager: 2 })).toEqual(['villager', 'villager', 'werewolf']);
  });
});

describe('validateSetup', () => {
  it('accepts the official basic deck for 8', () => {
    const issues = validateSetup(setupOf({ werewolf: 1, seer: 1, villager: 6 }), players(8));
    expect(canDeal(issues)).toBe(true);
    // +7 is lopsided; flagged but allowed [GS p.1 still prescribes it].
    expect(codes(issues)).toEqual(['unbalanced']);
  });

  it('requires one card per seat, excluding the moderator', () => {
    const issues = validateSetup(setupOf({ werewolf: 2, seer: 1, villager: 5 }, 'p1'), players(8));
    expect(issues).toContainEqual({ level: 'error', code: 'count_mismatch', cards: 8, seats: 7 });
  });

  it('requires at least one wolf that the Seer can find', () => {
    expect(
      codes(validateSetup(setupOf({ sorceress: 1, seer: 1, villager: 2 }), players(4))),
    ).toContain('no_wolves');
    expect(
      codes(validateSetup(setupOf({ 'wolf-cub': 1, seer: 1, villager: 2 }), players(4))),
    ).not.toContain('no_wolves');
  });

  it('caps unique roles', () => {
    const issues = validateSetup(setupOf({ werewolf: 1, seer: 2, villager: 1 }), players(4));
    expect(issues).toContainEqual({ level: 'error', code: 'too_many', role: 'seer', max: 1 });
  });

  it('rejects a moderator who is not in the room', () => {
    expect(
      codes(validateSetup(setupOf({ werewolf: 1, villager: 3 }, 'ghost'), players(4))),
    ).toContain('moderator_missing');
  });

  it('needs at least 3 seats', () => {
    expect(codes(validateSetup(setupOf({ werewolf: 1, villager: 1 }), players(2)))).toContain(
      'too_few_players',
    );
  });

  it('warns about a single Mason', () => {
    const issues = validateSetup(setupOf({ werewolf: 1, mason: 1, villager: 2 }), players(4));
    expect(issues).toContainEqual({ level: 'warning', code: 'lone_mason' });
    expect(canDeal(issues)).toBe(true);
  });
});

describe('presets', () => {
  it.each([
    [6, 1],
    [8, 1],
    [9, 2],
    [11, 2],
    [12, 3],
    [15, 3],
  ])('basic deck for %i players has %i wolves [GS p.1]', (seats, wolves) => {
    const preset = basicPreset(seats)!;
    expect(preset.official).toBe(true);
    expect(preset.roles.werewolf).toBe(wolves);
    expect(preset.roles.seer).toBe(1);
    expect(cardCount(preset.roles)).toBe(seats);
  });

  it('marks decks outside 6–15 players as unofficial', () => {
    expect(basicPreset(5)?.official).toBe(false);
    expect(basicPreset(2)).toBeNull();
  });

  it.each([8, 9, 10])('every preset for %i players is dealable', (seats) => {
    for (const preset of presetsFor(seats)) {
      const issues = validateSetup(setupOf(preset.roles), players(seats));
      expect(canDeal(issues), `${preset.id}`).toBe(true);
    }
  });

  it.each([
    [8, 'suggested', 2],
    [9, 'suggested', 5],
    [9, 'suggested-plus', 2],
    [10, 'suggested', 9],
    [10, 'suggested-plus', 0],
  ] as const)('%i players %s totals %i points (docs/rules/classic.md §9)', (seats, id, points) => {
    const preset = presetsFor(seats).find((p) => p.id === id)!;
    expect(totalPoints(preset.roles)).toBe(points);
  });
});

describe('night script', () => {
  const full = {
    werewolf: 2,
    'wolf-cub': 1,
    seer: 1,
    bodyguard: 1,
    witch: 1,
    mason: 2,
    sorceress: 1,
    spellcaster: 1,
    insomniac: 1,
    hunter: 1,
    villager: 1,
  };

  it('orders night calls (UW-NIGHT-05)', () => {
    expect(nightScript(full, 'later').map((s) => s.call)).toEqual([
      'bodyguard',
      'wolves',
      'witch',
      'seer',
      'sorceress',
      'spellcaster',
      'insomniac',
    ]);
  });

  it('first night: wolves only meet, masons meet, protective roles have no effect (UW-N1)', () => {
    expect(nightScript(full, 'first')).toEqual([
      { call: 'bodyguard', note: 'no-effect' },
      { call: 'wolves', note: 'meet-only' },
      { call: 'mason', note: null },
      { call: 'witch', note: 'no-effect' },
      { call: 'seer', note: null },
      { call: 'sorceress', note: null },
      { call: 'spellcaster', note: null },
      { call: 'insomniac', note: null },
    ]);
  });

  it('reminds the moderator about the Wolf Cub double kill [RR p.4]', () => {
    expect(nightScript(full, 'later')[1]).toEqual({ call: 'wolves', note: 'wolf-cub-double' });
    expect(nightScript({ werewolf: 1, seer: 1 }, 'later')).toEqual([
      { call: 'wolves', note: null },
      { call: 'seer', note: null },
    ]);
  });

  it('never calls roles without a night action', () => {
    const calls = nightScript(
      { werewolf: 1, hunter: 1, tanner: 1, 'village-idiot': 1, villager: 2 },
      'first',
    );
    expect(calls.map((s) => s.call)).toEqual(['wolves']);
  });
});
