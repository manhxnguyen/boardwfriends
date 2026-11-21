<script lang="ts">
  import { totalPoints } from '@bwf/engine';
  import { CLASSIC_ROLE_IDS, type RoleCounts } from '@bwf/protocol';
  import { ROLE_ICON, ROLE_TEXT } from '../content/roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';

  /** Read-only list of the roles in the deck. */
  let { roles }: { roles: RoleCounts } = $props();

  const entries = $derived(CLASSIC_ROLE_IDS.filter((id) => (roles[id] ?? 0) > 0));
  const points = $derived(totalPoints(roles));
</script>

<section class="rounded-xl bg-night-900 p-4">
  <h2 class="mb-3 flex items-baseline justify-between text-sm font-semibold text-slate-300">
    <span>{t('inDeck')}</span>
    <span class="font-mono text-xs text-slate-400">{points > 0 ? `+${points}` : points}</span>
  </h2>
  <ul class="flex flex-wrap gap-2">
    {#each entries as id (id)}
      <li class="flex items-center gap-1.5 rounded-full bg-night-800 px-3 py-1.5 text-sm">
        <span aria-hidden="true">{ROLE_ICON[id]}</span>
        {ROLE_TEXT[i18n.lang][id].name}
        {#if (roles[id] ?? 0) > 1}<span class="font-mono text-moon">×{roles[id]}</span>{/if}
      </li>
    {/each}
  </ul>
</section>
