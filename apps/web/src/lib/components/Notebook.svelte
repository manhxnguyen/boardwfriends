<script lang="ts">
  import type { Knowledge } from '@bwf/protocol';
  import { ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';

  /** The player's private notes: everything they learned at night. */
  let { knowledge, names }: { knowledge: Knowledge[]; names: (id: string) => string } = $props();

  const list = (ids: string[]) => (ids.length ? ids.map(names).join(', ') : t('nobody'));
  const on = (role: keyof (typeof ONE_NIGHT_TEXT)['vi']) => ONE_NIGHT_TEXT[i18n.lang][role].name;

  function line(k: Knowledge): string {
    switch (k.k) {
      case 'wolves':
        return t('kWolves', { names: list(k.ids) });
      case 'masons':
        return t('kMasons', { names: list(k.ids) });
      case 'seer':
        return t(k.isWolf ? 'kSeerYes' : 'kSeerNo', { n: String(k.night), name: names(k.target) });
      case 'sorceress':
        return t(k.isSeer ? 'kSorceressYes' : 'kSorceressNo', {
          n: String(k.night),
          name: names(k.target),
        });
      case 'insomniac':
        return t(k.woke ? 'kInsomniacYes' : 'kInsomniacNo', { n: String(k.night) });
      case 'witch':
        return t('kWitch', { n: String(k.night), names: list(k.targets) });
      case 'on-minion':
        return t('kMinion', { names: list(k.ids) });
      case 'on-center':
        return t('kCenter', { i: String(k.index + 1), role: on(k.role) });
      case 'on-player':
        return t('kPlayer', { name: names(k.target), role: on(k.role) });
      case 'on-robbed':
        return t('kRobbed', { name: names(k.target), role: on(k.role) });
      case 'on-self':
        return t('kSelf', { role: on(k.role) });
      case 'on-doppel':
        return t('kDoppel', { name: names(k.target), role: on(k.role) });
    }
  }
</script>

<section class="rounded-xl bg-night-900 p-4">
  <h2 class="mb-2 text-sm font-semibold text-slate-300">📓 {t('notebook')}</h2>
  {#if knowledge.length}
    <ul class="space-y-1.5 text-sm">
      {#each knowledge as k, i (i)}
        <li>• {line(k)}</li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-slate-500">{t('notebookEmpty')}</p>
  {/if}
</section>
