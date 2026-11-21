<script lang="ts">
  import { i18n } from './lib/i18n.svelte.ts';
  import { router } from './lib/router.svelte.ts';
  import Home from './lib/components/Home.svelte';
  import RoomPage from './lib/components/RoomPage.svelte';

  $effect(() => {
    document.documentElement.lang = i18n.lang;
  });
</script>

<main class="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
  {#if router.route.name === 'room'}
    {#key router.route.code}
      <RoomPage code={router.route.code} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>
