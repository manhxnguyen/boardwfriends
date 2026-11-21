import type { ClassicRoleId } from '@bwf/protocol';

/**
 * Classic mode role catalog (Ultimate Werewolf, Bezier Games 2021 role set).
 * Sources: [RR] Role Reference v1.1 p.1–4, [GS] Getting Started v1.1. See docs/rules/classic.md.
 */

export type Team = 'village' | 'wolf' | 'independent';

/** Card "fence post" colour, which also tells the role's position on its team [RR p.2]. */
export type Fence = 'villager' | 'village-support' | 'wolf' | 'wolf-support' | 'independent';

/** When the moderator calls this role at night. */
export type Wakes = 'never' | 'first-night' | 'every-night';

export interface RoleDef {
  id: ClassicRoleId;
  team: Team;
  fence: Fence;
  /** Village team impact printed on the card [RR p.1–2]. Positive helps the village. */
  points: number;
  /** Most copies allowed in one deck. */
  max: number;
  wakes: Wakes;
  /** What the Seer learns: "is a wolf" [RR p.3, UW-R-SEER-01]. */
  seenAsWolf: boolean;
  /** Rule ids in docs/rules/classic.md. */
  rules: readonly string[];
}

const ROLES: readonly RoleDef[] = [
  role('villager', 'village', 'villager', 1, 30, 'never', false, ['UW-R-VIL-01']),
  role('werewolf', 'wolf', 'wolf', -6, 6, 'every-night', true, ['UW-NIGHT-01', 'UW-NIGHT-02']),
  role('seer', 'village', 'village-support', 7, 1, 'every-night', false, ['UW-R-SEER-01']),
  role('bodyguard', 'village', 'village-support', 3, 1, 'every-night', false, ['UW-R-BG-01']),
  role('hunter', 'village', 'village-support', 3, 1, 'never', false, ['UW-R-HUN-01']),
  role('witch', 'village', 'village-support', 4, 1, 'every-night', false, ['UW-R-WIT-01']),
  // Wolf Cub wakes with the wolves; treated as a wolf by the Seer (🔍 docs/rules/classic.md §10).
  role('wolf-cub', 'wolf', 'wolf', -8, 1, 'every-night', true, ['RR-WOLF-CUB']),
  role('sorceress', 'wolf', 'wolf-support', -3, 1, 'every-night', false, ['RR-SORCERESS']),
  role('tanner', 'independent', 'independent', -2, 1, 'never', false, ['RR-TANNER']),
  role('village-idiot', 'village', 'village-support', 2, 1, 'never', false, ['RR-VILLAGE-IDIOT']),
  role('spellcaster', 'village', 'village-support', 1, 1, 'every-night', false, ['RR-SPELLCASTER']),
  role('insomniac', 'village', 'village-support', 1, 1, 'every-night', false, ['RR-INSOMNIAC']),
  // Masons learn each other on the first night (🔍 exact timing not printed in [RR]).
  role('mason', 'village', 'village-support', 2, 3, 'first-night', false, ['RR-MASON']),
];

export const CLASSIC_ROLES: ReadonlyMap<ClassicRoleId, RoleDef> = new Map(
  ROLES.map((r) => [r.id, r]),
);

export function roleDef(id: ClassicRoleId): RoleDef {
  const def = CLASSIC_ROLES.get(id);
  if (!def) throw new Error(`Unknown role ${id}`);
  return def;
}

function role(
  id: ClassicRoleId,
  team: Team,
  fence: Fence,
  points: number,
  max: number,
  wakes: Wakes,
  seenAsWolf: boolean,
  rules: readonly string[],
): RoleDef {
  return { id, team, fence, points, max, wakes, seenAsWolf, rules };
}
