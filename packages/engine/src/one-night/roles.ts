import {
  ONE_NIGHT_ROLE_IDS,
  type OneNightRoleCounts,
  type OneNightRoleId,
  type Team,
} from '@bwf/protocol';

/**
 * One Night role catalog. Sources: [OR] ONUW rules (2015) p.2–6, [OW] winning conditions card.
 * See docs/rules/one-night.md.
 */
export interface OneNightRoleDef {
  id: OneNightRoleId;
  team: Team;
  /** Position in the night wake order [OR p.6]; null = never wakes. */
  order: number | null;
  /** Night action is mandatory [OW]. */
  mandatory: boolean;
  max: number;
}

const ROLES: readonly OneNightRoleDef[] = [
  // Team depends on the copied role; untouched it counts as village [OW].
  { id: 'doppelganger', team: 'village', order: 1, mandatory: false, max: 1 },
  { id: 'werewolf', team: 'wolf', order: 2, mandatory: true, max: 2 },
  { id: 'minion', team: 'wolf', order: 3, mandatory: false, max: 1 },
  { id: 'mason', team: 'village', order: 4, mandatory: true, max: 2 },
  { id: 'seer', team: 'village', order: 5, mandatory: false, max: 1 },
  { id: 'robber', team: 'village', order: 6, mandatory: false, max: 1 },
  { id: 'troublemaker', team: 'village', order: 7, mandatory: false, max: 1 },
  { id: 'drunk', team: 'village', order: 8, mandatory: true, max: 1 },
  { id: 'insomniac', team: 'village', order: 9, mandatory: false, max: 1 },
  { id: 'villager', team: 'village', order: null, mandatory: false, max: 3 },
  { id: 'hunter', team: 'village', order: null, mandatory: false, max: 1 },
  { id: 'tanner', team: 'independent', order: null, mandatory: false, max: 1 },
];

export const ONE_NIGHT_ROLES: ReadonlyMap<OneNightRoleId, OneNightRoleDef> = new Map(
  ROLES.map((r) => [r.id, r]),
);

export function oneNightDef(id: OneNightRoleId): OneNightRoleDef {
  const def = ONE_NIGHT_ROLES.get(id);
  if (!def) throw new Error(`Unknown role ${id}`);
  return def;
}

/** ON-SETUP-01: always three more cards than players. */
export const CENTER_CARDS = 3;

export type OneNightIssue =
  | { level: 'error'; code: 'count_mismatch'; cards: number; seats: number }
  | { level: 'error'; code: 'too_many'; role: OneNightRoleId; max: number }
  | { level: 'error'; code: 'masons_pair' }
  | { level: 'error'; code: 'too_few_players'; min: number }
  | { level: 'warning'; code: 'insomniac_useless' };

export const ONE_NIGHT_MIN_PLAYERS = 3;
export const ONE_NIGHT_MAX_PLAYERS = 10;

export function oneNightCardCount(roles: OneNightRoleCounts): number {
  return ONE_NIGHT_ROLE_IDS.reduce((sum, id) => sum + (roles[id] ?? 0), 0);
}

export function validateOneNight(roles: OneNightRoleCounts, seats: number): OneNightIssue[] {
  const issues: OneNightIssue[] = [];
  if (seats < ONE_NIGHT_MIN_PLAYERS) {
    issues.push({ level: 'error', code: 'too_few_players', min: ONE_NIGHT_MIN_PLAYERS });
  }
  const cards = oneNightCardCount(roles);
  if (cards !== seats + CENTER_CARDS) {
    issues.push({ level: 'error', code: 'count_mismatch', cards, seats: seats + CENTER_CARDS });
  }
  for (const id of ONE_NIGHT_ROLE_IDS) {
    const { max } = oneNightDef(id);
    if ((roles[id] ?? 0) > max) issues.push({ level: 'error', code: 'too_many', role: id, max });
  }
  // ON-SETUP-04: always both Masons.
  if ((roles.mason ?? 0) === 1) issues.push({ level: 'error', code: 'masons_pair' });
  // ON-SETUP-05: the Insomniac only matters with a Robber or Troublemaker.
  if ((roles.insomniac ?? 0) > 0 && !(roles.robber ?? 0) && !(roles.troublemaker ?? 0)) {
    issues.push({ level: 'warning', code: 'insomniac_useless' });
  }
  return issues;
}

/** Project presets for 8–10 players from the 16 base-box cards (docs/rules/one-night.md §7). */
export function oneNightPresets(seats: number): { id: 'suggested'; roles: OneNightRoleCounts }[] {
  const base: OneNightRoleCounts = {
    werewolf: 2,
    minion: 1,
    seer: 1,
    robber: 1,
    troublemaker: 1,
    drunk: 1,
    insomniac: 1,
    hunter: 1,
  };
  if (seats === 8) return [{ id: 'suggested', roles: { ...base, villager: 2 } }];
  if (seats === 9) return [{ id: 'suggested', roles: { ...base, villager: 2, tanner: 1 } }];
  if (seats === 10) {
    return [{ id: 'suggested', roles: { ...base, mason: 2, tanner: 1, villager: 1 } }];
  }
  if (seats >= ONE_NIGHT_MIN_PLAYERS && seats < 8) {
    // Small groups: the classic starter mix, then Villagers, Drunk and Insomniac as needed.
    const roles: OneNightRoleCounts = { werewolf: 2, seer: 1, robber: 1, troublemaker: 1 };
    const extras: OneNightRoleId[] = ['villager', 'villager', 'villager', 'drunk', 'insomniac'];
    const missing = seats + CENTER_CARDS - oneNightCardCount(roles);
    for (const id of extras.slice(0, missing)) roles[id] = (roles[id] ?? 0) + 1;
    return [{ id: 'suggested', roles }];
  }
  return [];
}
