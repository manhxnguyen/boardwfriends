<script lang="ts">
  import { oneNightDef } from '@bwf/engine';
  import type { OneNightRoleId } from '@bwf/protocol';
  import { roleArt } from '../content/art.ts';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { FENCE_COLOR, TEAM_TEXT } from '../content/roles.ts';
  import { i18n } from '../i18n.svelte.ts';
  import CardFace from './CardFace.svelte';

  /** One Night role card. */
  let { role }: { role: OneNightRoleId } = $props();

  const def = $derived(oneNightDef(role));
  const text = $derived(ONE_NIGHT_TEXT[i18n.lang][role]);
  const color = $derived(
    role === 'werewolf'
      ? FENCE_COLOR.wolf
      : role === 'minion'
        ? FENCE_COLOR['wolf-support']
        : def.team === 'independent'
          ? FENCE_COLOR.independent
          : role === 'villager'
            ? FENCE_COLOR.villager
            : FENCE_COLOR['village-support'],
  );
</script>

<CardFace
  title={text.name}
  team={TEAM_TEXT[i18n.lang][def.team]}
  description={text.description}
  icon={ONE_NIGHT_ICON[role]}
  {color}
  art={roleArt(role)}
/>
