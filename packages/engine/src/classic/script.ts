import type { ClassicRoleId, RoleCounts } from '@bwf/protocol';

/**
 * Night script for a human moderator: which roles to call, in which order.
 * Text lives in the client (i18n); this module only decides the steps.
 *
 * Order (🔍 UW-NIGHT-05): the 2021 docs do not print a full order, so it follows the older
 * Ultimate Edition list [S1]: Bodyguard → Wolves → Witch → Seer → Sorceress → Spellcaster,
 * with Masons after the wolves on the first night and the Insomniac last (it needs to know who
 * woke up). First night: everyone with a night action is still called (UW-N1-05, decided
 * 2026-11-21) so nobody is revealed by who moves; wolves only meet, nobody is eliminated.
 */

/** Everything the moderator calls at night; the wolf pack (Werewolves + Wolf Cub) is one call. */
export type NightCall =
  'bodyguard' | 'wolves' | 'mason' | 'witch' | 'seer' | 'sorceress' | 'spellcaster' | 'insomniac';

export interface ScriptStep {
  call: NightCall;
  /** Extra instruction for this step on this night. */
  note: 'meet-only' | 'no-effect' | 'wolf-cub-double' | null;
}

const ORDER: readonly { call: NightCall; roles: readonly ClassicRoleId[] }[] = [
  { call: 'bodyguard', roles: ['bodyguard'] },
  { call: 'wolves', roles: ['werewolf', 'wolf-cub'] },
  { call: 'mason', roles: ['mason'] },
  { call: 'witch', roles: ['witch'] },
  { call: 'seer', roles: ['seer'] },
  { call: 'sorceress', roles: ['sorceress'] },
  { call: 'spellcaster', roles: ['spellcaster'] },
  { call: 'insomniac', roles: ['insomniac'] },
];

export function nightScript(roles: RoleCounts, night: 'first' | 'later'): ScriptStep[] {
  const steps: ScriptStep[] = [];
  for (const { call, roles: members } of ORDER) {
    if (!members.some((id) => (roles[id] ?? 0) > 0)) continue;
    if (call === 'mason' && night === 'later') continue; // Masons only meet once.
    steps.push({ call, note: noteFor(call, night, roles) });
  }
  return steps;
}

function noteFor(call: NightCall, night: 'first' | 'later', roles: RoleCounts): ScriptStep['note'] {
  if (night === 'first') {
    if (call === 'wolves') return 'meet-only'; // [GS p.2] wolves only look for each other.
    if (call === 'bodyguard' || call === 'witch') return 'no-effect'; // UW-N1-05
    return null;
  }
  if (call === 'wolves' && (roles['wolf-cub'] ?? 0) > 0) return 'wolf-cub-double'; // [RR p.4]
  return null;
}
