<script lang="ts">
  import { i18n } from './lib/i18n.svelte.ts';
  import { router } from './lib/router.svelte.ts';
  import DisplayScreen from './lib/components/DisplayScreen.svelte';
  import Home from './lib/components/Home.svelte';
  import RoomPage from './lib/components/RoomPage.svelte';

  $effect(() => {
    document.documentElement.lang = i18n.lang;
  });
</script>

{#if router.route.name === 'display'}
  <!-- Narrator screen (MacBook): full width, landscape. -->
  {#key router.route.code}
    <DisplayScreen code={router.route.code} />
  {/key}
{:else}
  <main class="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
    {#if router.route.name === 'room'}
      {#key router.route.code}
        <RoomPage code={router.route.code} />
      {/key}
    {:else}
      <Home />
    {/if}
  </main>
{/if}
