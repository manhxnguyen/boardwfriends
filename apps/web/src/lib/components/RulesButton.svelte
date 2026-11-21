<script lang="ts">
  import type { GameKind, OneNightRoleCounts, RoleCounts } from '@bwf/protocol';
  import { t } from '../i18n.svelte.ts';
  import RulesSheet from './RulesSheet.svelte';

  /** 📖 button that opens the rules reference over whatever screen is showing. */
  let {
    game = 'classic',
    classicDeck = null,
    oneNightDeck = null,
    large = false,
  }: {
    game?: GameKind;
    classicDeck?: RoleCounts | null;
    oneNightDeck?: OneNightRoleCounts | null;
    large?: boolean;
  } = $props();

  let open = $state(false);
</script>

<button
  type="button"
  class="rounded-full bg-night-800 font-semibold {large ? 'px-4 py-2' : 'px-3 py-1.5 text-xs'}"
  aria-label={t('rules')}
  aria-haspopup="dialog"
  onclick={() => (open = true)}
>
  📖<span class={large ? 'ml-1' : 'sr-only sm:not-sr-only sm:ml-1'}>{t('rules')}</span>
</button>

{#if open}
  <RulesSheet {game} {classicDeck} {oneNightDeck} onClose={() => (open = false)} />
{/if}
