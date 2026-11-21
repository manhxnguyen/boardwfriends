<script lang="ts">
  import type { ClassicRoleId } from '@bwf/protocol';
  import { t } from '../i18n.svelte.ts';
  import RoleCard from './RoleCard.svelte';

  /**
   * The card stays face down; it shows only while the player presses and holds it, so a glance
   * from a neighbour reveals nothing. `onFirstReveal` fires once, the first time it is shown.
   */
  let { role, onFirstReveal }: { role: ClassicRoleId; onFirstReveal: () => void } = $props();

  let holding = $state(false);
  let revealedOnce = false;

  function show(event: PointerEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    holding = true;
    if (!revealedOnce) {
      revealedOnce = true;
      onFirstReveal();
    }
  }

  function hide() {
    holding = false;
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      holding = event.type === 'keydown';
      if (holding && !revealedOnce) {
        revealedOnce = true;
        onFirstReveal();
      }
    }
  }
</script>

<button
  type="button"
  class="reveal mx-auto block w-full max-w-72 touch-none outline-none"
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
    <RoleCard {role} />
  {:else}
    <div
      class="flex aspect-[5/7] w-full flex-col items-center justify-center gap-4 rounded-2xl border-4 border-night-600 bg-night-900 shadow-2xl"
      style:background-image="repeating-linear-gradient(45deg, #182a44 0 12px, #0f1b2d 12px 24px)"
    >
      <span class="text-7xl" aria-hidden="true">🌕</span>
      <span class="rounded-full bg-night-950/80 px-4 py-2 text-sm font-semibold text-moon">
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
