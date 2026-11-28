<script lang="ts">
  /**
   * Big "10 … 1" countdown for the last seconds of a timer (the nominee's defense), plus one
   * vibration when it starts (phones that support it).
   */
  let {
    endsAt,
    serverNow,
    from = 10,
    big = false,
    vibrate = false,
  }: {
    endsAt: number | null;
    serverNow: () => number;
    from?: number;
    big?: boolean;
    vibrate?: boolean;
  } = $props();

  let now = $state(Date.now());
  $effect(() => {
    now = serverNow();
    const timer = setInterval(() => (now = serverNow()), 200);
    return () => clearInterval(timer);
  });

  const seconds = $derived(endsAt === null ? null : Math.ceil((endsAt - now) / 1000));
  const show = $derived(seconds !== null && seconds > 0 && seconds <= from);

  let buzzedFor: number | null = null;
  $effect(() => {
    if (!show || !vibrate || buzzedFor === endsAt) return;
    buzzedFor = endsAt;
    try {
      navigator.vibrate?.(200);
    } catch {
      // Not supported (iOS Safari): the number on screen is enough.
    }
  });
</script>

{#if show}
  <div
    class="flex items-center justify-center gap-3 rounded-2xl border-2 border-wolf bg-wolf/15 font-bold text-wolf {big
      ? 'px-8 py-4'
      : 'px-4 py-2'}"
    role="timer"
    aria-live="assertive"
  >
    {#key seconds}
      <span class="final-tick font-mono tabular-nums {big ? 'text-7xl md:text-9xl' : 'text-5xl'}">
        {seconds}
      </span>
    {/key}
  </div>
{/if}

<style>
  .final-tick {
    animation: tick 1s ease-out;
  }
  @keyframes tick {
    from {
      transform: scale(1.35);
      opacity: 0.4;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .final-tick {
      animation: none;
    }
  }
</style>
