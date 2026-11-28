<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../i18n.svelte.ts';

  /**
   * Pick `count` players (and/or `centerCount` center cards). With a single choice the tap is
   * sent at once (it can still be changed until the step ends); multi-picks need a confirm.
   */
  let {
    options,
    count,
    centerCount = 0,
    selected,
    selectedCenter = [],
    locked = false,
    names,
    centerAlternative = false,
    marks = {},
    onSubmit,
  }: {
    options: string[];
    count: number;
    centerCount?: number;
    selected: string[];
    selectedCenter?: number[];
    locked?: boolean;
    names: (id: string) => string;
    /** Seer: either one player OR two center cards. */
    centerAlternative?: boolean;
    /** Names to show under a player (wolves: which teammates picked them). */
    marks?: Record<string, string[]>;
    onSubmit: (players: string[], center: number[]) => void;
  } = $props();

  let localPlayers = $state<string[]>([]);
  let localCenter = $state<number[]>([]);
  // Every broadcast brings new arrays; only reset local picks when the confirmed choice changes,
  // otherwise another player's action would wipe a half-made multi-pick.
  const confirmedKey = $derived(`${selected.join(',')}|${selectedCenter.join(',')}`);
  $effect(() => {
    void confirmedKey;
    untrack(() => {
      localPlayers = [...selected];
      localCenter = [...selectedCenter];
    });
  });

  const instant = $derived(count === 1 && centerCount === 0);

  function togglePlayer(id: string) {
    if (locked) return;
    if (instant) {
      localPlayers = [id];
      onSubmit([id], []);
      return;
    }
    if (centerAlternative) localCenter = [];
    localPlayers = localPlayers.includes(id)
      ? localPlayers.filter((p) => p !== id)
      : [...localPlayers, id].slice(-Math.max(count, 1));
  }

  function toggleCenter(i: number) {
    if (locked) return;
    if (centerAlternative) localPlayers = [];
    localCenter = localCenter.includes(i)
      ? localCenter.filter((c) => c !== i)
      : [...localCenter, i].slice(-centerCount);
  }

  const ready = $derived(
    centerAlternative
      ? (localPlayers.length === 1 && localCenter.length === 0) ||
          (localPlayers.length === 0 && localCenter.length === centerCount)
      : localPlayers.length === count && localCenter.length === centerCount,
  );
</script>

{#if options.length && count > 0}
  <ul class="grid grid-cols-2 gap-2 lg:grid-cols-3">
    {#each options as id (id)}
      {@const on = localPlayers.includes(id)}
      <li>
        <button
          type="button"
          class="min-h-14 w-full rounded-xl px-3 py-3 text-left font-semibold transition-colors {on
            ? 'bg-moon text-night-950'
            : 'bg-night-800'} disabled:opacity-60"
          disabled={locked}
          aria-pressed={on}
          onclick={() => togglePlayer(id)}
        >
          {names(id)}
          {#if marks[id]?.length}
            <span class="mt-0.5 block text-xs font-normal {on ? 'text-night-800' : 'text-wolf'}">
              🐺 {marks[id]!.join(', ')}
            </span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if centerCount > 0}
  <div class="mt-3 grid grid-cols-3 gap-2">
    {#each [0, 1, 2] as i (i)}
      {@const on = localCenter.includes(i)}
      <button
        type="button"
        class="aspect-[5/7] rounded-xl border-2 text-sm font-semibold {on
          ? 'border-moon bg-moon/20 text-moon'
          : 'border-night-600 bg-night-900'} disabled:opacity-60"
        disabled={locked}
        aria-pressed={on}
        onclick={() => toggleCenter(i)}
      >
        🂠<br />{t('centerCard', { n: String(i + 1) })}
      </button>
    {/each}
  </div>
{/if}

{#if !instant && !locked && (count > 0 || centerCount > 0)}
  <button
    type="button"
    class="mt-3 w-full rounded-xl bg-moon px-4 py-3 font-bold text-night-950 disabled:opacity-40"
    disabled={!ready}
    onclick={() => onSubmit(localPlayers, localCenter)}
  >
    {t('confirm')}
  </button>
{/if}
{#if locked}
  <p class="mt-3 text-center text-sm text-ok">✓ {t('done')}</p>
{/if}
