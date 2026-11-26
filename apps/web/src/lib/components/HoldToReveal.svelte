<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cardBackArt } from '../content/art.ts';
  import { t } from '../i18n.svelte.ts';

  /**
   * The card stays face down; it shows only while the player presses and holds it, so a glance
   * from a neighbour reveals nothing. `onFirstReveal` fires once, the first time it is shown.
   */
  let {
    onFirstReveal = () => {},
    compact = false,
    children,
  }: { onFirstReveal?: () => void; compact?: boolean; children: Snippet } = $props();

  let holding = $state(false);
  let revealedOnce = false;
  const back = cardBackArt();

  function reveal() {
    holding = true;
    if (!revealedOnce) {
      revealedOnce = true;
      onFirstReveal();
    }
  }

  function show(event: PointerEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    reveal();
  }

  function hide() {
    holding = false;
  }

  function onKey(event: KeyboardEvent) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (event.type === 'keydown') reveal();
    else hide();
  }
</script>

<button
  type="button"
  class="reveal mx-auto block w-full touch-none outline-none {compact
    ? 'max-w-40 md:max-w-56 phone-land:max-w-[min(7.5rem,calc((100dvh_-_11rem)_*_5_/_7))]!'
    : 'max-w-72 md:max-w-80 phone-land:max-w-[min(10.5rem,calc((100dvh_-_10rem)_*_5_/_7))]!'}"
  aria-label={t('holdToReveal')}
  aria-pressed={holding}
  onpointerdown={show}
  onpointerup={hide}
  onpointercancel={hide}
  onlostpointercapture={hide}
  oncontextmenu={(e) => e.preventDefault()}
  onkeydown={onKey}
  onkeyup={onKey}
  onblur={hide}
>
  {#if holding}
    {@render children()}
  {:else}
    <div
      class="relative flex aspect-[5/7] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-4 border-night-600 bg-night-900 shadow-2xl"
      style:background-image={back
        ? undefined
        : 'repeating-linear-gradient(45deg, #182a44 0 12px, #0f1b2d 12px 24px)'}
    >
      {#if back}
        <img src={back} alt="" class="absolute inset-0 size-full object-cover" draggable="false" />
      {:else}
        <span class={compact ? 'text-4xl' : 'text-7xl'} aria-hidden="true">🌕</span>
      {/if}
      <span
        class="relative rounded-full bg-night-950/80 px-3 py-1.5 font-semibold text-moon {compact
          ? 'text-xs'
          : 'text-sm'}"
      >
        👆 {t('holdToReveal')}
      </span>
    </div>
  {/if}
</button>

<style>
  .reveal {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
