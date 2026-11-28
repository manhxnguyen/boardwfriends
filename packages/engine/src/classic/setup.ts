import {
  CLASSIC_ROLE_IDS,
  type ClassicRoleId,
  type RoleCounts,
  type SetupView,
} from '@bwf/protocol';
import { roleDef } from './roles.ts';

/** Game settings chosen by the host. */
export type Setup = SetupView;

/** The part of the settings that decides who gets a Classic card. */
export type DeckSetup = Pick<Setup, 'roles' | 'moderatorId'>;

export const EMPTY_SETUP: Setup = {
  game: 'classic',
  mode: 'auto',
  roles: {},
  oneNightRoles: {},
  moderatorId: null,
  publicRoles: true,
  reveal: 'role',
  // The group's house rule (decided 2026-11-21): wolves already hunt on night 1.
  firstNightKill: true,
  // Official rule by default: the wolves must agree (UW-NIGHT-01).
  wolfMajority: false,
  dayMinutes: 5,
  voice: false,
};

export type SetupIssue =
  | { level: 'error'; code: 'count_mismatch'; cards: number; seats: number }
  | { level: 'error'; code: 'no_wolves' }
  | { level: 'error'; code: 'too_many'; role: ClassicRoleId; max: number }
  | { level: 'error'; code: 'moderator_missing' }
  | { level: 'error'; code: 'too_few_players'; min: number }
  | { level: 'warning'; code: 'lone_mason' }
  | { level: 'warning'; code: 'unbalanced'; points: number };

/** Below this the game cannot work at all (needs at least one wolf and two others). */
export const MIN_SEATS = 3;
/** |total points| above this is flagged; [RR p.2] only says "as close to zero as possible". */
export const BALANCE_WARNING_POINTS = 6;

export function cardCount(roles: RoleCounts): number {
  return CLASSIC_ROLE_IDS.reduce((sum, id) => sum + (roles[id] ?? 0), 0);
}

/** Sum of card values; aim for ≈0 [RR p.2, UW-SETUP-04]. */
export function totalPoints(roles: RoleCounts): number {
  return CLASSIC_ROLE_IDS.reduce((sum, id) => sum + (roles[id] ?? 0) * roleDef(id).points, 0);
}

/** Number of players who receive a card. */
export function seatCount(setup: DeckSetup, playerIds: readonly string[]): number {
  return playerIds.filter((id) => id !== setup.moderatorId).length;
}

/** Errors block dealing; warnings are informational. */
export function validateSetup(setup: DeckSetup, playerIds: readonly string[]): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const seats = seatCount(setup, playerIds);
  const cards = cardCount(setup.roles);

  if (setup.moderatorId !== null && !playerIds.includes(setup.moderatorId)) {
    issues.push({ level: 'error', code: 'moderator_missing' });
  }
  if (seats < MIN_SEATS) issues.push({ level: 'error', code: 'too_few_players', min: MIN_SEATS });
  if (cards !== seats) issues.push({ level: 'error', code: 'count_mismatch', cards, seats });

  const wolves = CLASSIC_ROLE_IDS.filter(
    (id) => roleDef(id).team === 'wolf' && roleDef(id).seenAsWolf,
  );
  if (!wolves.some((id) => (setup.roles[id] ?? 0) > 0)) {
    issues.push({ level: 'error', code: 'no_wolves' });
  }
  for (const id of CLASSIC_ROLE_IDS) {
    const { max } = roleDef(id);
    if ((setup.roles[id] ?? 0) > max)
      issues.push({ level: 'error', code: 'too_many', role: id, max });
  }

  if (setup.roles.mason === 1) issues.push({ level: 'warning', code: 'lone_mason' });
  const points = totalPoints(setup.roles);
  if (Math.abs(points) > BALANCE_WARNING_POINTS) {
    issues.push({ level: 'warning', code: 'unbalanced', points });
  }
  return issues;
}

export function canDeal(issues: readonly SetupIssue[]): boolean {
  return issues.every((i) => i.level !== 'error');
}

/** Expands counts into a flat deck in catalog order, e.g. { werewolf: 2 } → ['werewolf','werewolf']. */
export function buildDeck(roles: RoleCounts): ClassicRoleId[] {
  return CLASSIC_ROLE_IDS.flatMap((id) => Array<ClassicRoleId>(roles[id] ?? 0).fill(id));
}

// ---------------------------------------------------------------------------
// Presets

export interface Preset {
  id: 'basic' | 'suggested' | 'suggested-plus';
  /** True for decks printed in the rulebook, false for decks the project balanced by points. */
  official: boolean;
  roles: RoleCounts;
}

/**
 * Basic first game [GS p.1]: 1 Seer, wolves by player count (1 for 6–8, 2 for 9–11, 3 for 12–15),
 * the rest Villagers. Below 6 players we still offer 1 wolf so small groups can try it.
 */
export function basicPreset(seats: number): Preset | null {
  if (seats < MIN_SEATS) return null;
  const wolves = seats >= 12 ? 3 : seats >= 9 ? 2 : 1;
  return {
    id: 'basic',
    official: seats >= 6 && seats <= 15,
    roles: { werewolf: wolves, seer: 1, villager: seats - wolves - 1 },
  };
}

/** Project presets balanced by card points for the target group size (docs/rules/classic.md §9). */
const SUGGESTED: Record<number, Pick<Preset, 'id' | 'roles'>[]> = {
  8: [{ id: 'suggested', roles: { werewolf: 2, seer: 1, bodyguard: 1, villager: 4 } }],
  9: [
    { id: 'suggested', roles: { werewolf: 2, seer: 1, bodyguard: 1, hunter: 1, villager: 4 } },
    {
      id: 'suggested-plus',
      roles: { werewolf: 2, sorceress: 1, seer: 1, witch: 1, hunter: 1, villager: 3 },
    },
  ],
  10: [
    {
      id: 'suggested',
      roles: { werewolf: 2, seer: 1, bodyguard: 1, witch: 1, hunter: 1, villager: 4 },
    },
    {
      id: 'suggested-plus',
      roles: {
        werewolf: 2,
        'wolf-cub': 1,
        seer: 1,
        bodyguard: 1,
        witch: 1,
        hunter: 1,
        villager: 3,
      },
    },
  ],
};

export function presetsFor(seats: number): Preset[] {
  const basic = basicPreset(seats);
  const suggested = (SUGGESTED[seats] ?? []).map((p) => ({ ...p, official: false }));
  return basic ? [basic, ...suggested] : suggested;
}
