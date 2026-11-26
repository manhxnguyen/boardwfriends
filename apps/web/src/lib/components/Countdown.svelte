<script lang="ts">
  /** mm:ss until `endsAt` (server clock). Turns red in the last 10 seconds. */
  let {
    endsAt,
    serverNow,
    big = false,
  }: { endsAt: number | null; serverNow: () => number; big?: boolean } = $props();

  let now = $state(Date.now());
  $effect(() => {
    now = serverNow();
    const timer = setInterval(() => (now = serverNow()), 250);
    return () => clearInterval(timer);
  });

  const remaining = $derived(endsAt === null ? null : Math.max(0, endsAt - now));
  const text = $derived.by(() => {
    if (remaining === null) return '';
    const s = Math.ceil(remaining / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
</script>

{#if remaining !== null}
  <span
    class="font-mono font-bold tabular-nums {remaining <= 10_000 ? 'text-wolf' : 'text-moon'} {big
      ? 'text-5xl md:text-7xl 2xl:text-8xl'
      : 'text-2xl'}"
    role="timer"
  >
    {text}
  </span>
{/if}
