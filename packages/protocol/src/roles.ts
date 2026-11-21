/**
 * Role ids shared by client and server. Rules, points and teams live in @bwf/engine.
 */

/**
 * Classic mode (Ultimate Werewolf, 2021 role set; docs/rules/classic.md).
 * Chupacabra is left out until its card text is known.
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

/**
 * One Night mode (One Night Ultimate Werewolf base set; docs/rules/one-night.md).
 * Doppelgänger is left out for now (its rules interact with every other role).
 */
export const ONE_NIGHT_ROLE_IDS = [
  'villager',
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
  'hunter',
  'tanner',
] as const;
export type OneNightRoleId = (typeof ONE_NIGHT_ROLE_IDS)[number];

export function isClassicRoleId(value: string): value is ClassicRoleId {
  return (CLASSIC_ROLE_IDS as readonly string[]).includes(value);
}

/** Role id → number of cards. Missing ids mean 0. */
export type RoleCounts = Partial<Record<ClassicRoleId, number>>;
export type OneNightRoleCounts = Partial<Record<OneNightRoleId, number>>;

export type Team = 'village' | 'wolf' | 'independent';

export type GameKind = 'classic' | 'one-night';
/** manual = a human moderator runs the game (M1); auto = the app narrates and resolves (M2+). */
export type PlayMode = 'manual' | 'auto';
/** What the village learns about an eliminated player (UW variants, docs/rules/classic.md §5). */
export type RevealMode = 'role' | 'team' | 'none';
