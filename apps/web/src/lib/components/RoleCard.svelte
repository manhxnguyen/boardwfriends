<script lang="ts">
  import { roleDef } from '@bwf/engine';
  import type { ClassicRoleId } from '@bwf/protocol';
  import { roleArt } from '../content/art.ts';
  import { FENCE_COLOR, ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n } from '../i18n.svelte.ts';
  import CardFace from './CardFace.svelte';

  /** Classic role card. */
  let { role }: { role: ClassicRoleId } = $props();

  const def = $derived(roleDef(role));
  const text = $derived(ROLE_TEXT[i18n.lang][role]);
</script>

<CardFace
  title={text.name}
  team={TEAM_TEXT[i18n.lang][def.team]}
  description={text.description}
  icon={ROLE_ICON[role]}
  color={FENCE_COLOR[def.fence]}
  art={roleArt(role)}
  footer={def.points > 0 ? `+${def.points}` : String(def.points)}
/>
