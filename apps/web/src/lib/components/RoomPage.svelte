<script lang="ts">
  import { NAME_MAX_LENGTH } from '@bwf/protocol';
  import { t } from '../i18n.svelte.ts';
  import { rememberName, savedName } from '../identity.ts';
  import LangToggle from './LangToggle.svelte';
  import Lobby from './Lobby.svelte';

  let { code }: { code: string } = $props();

  // Players arriving through the QR code may not have a name yet: ask before connecting.
  let name = $state(savedName());
  let ready = $state(savedName().length > 0);

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    rememberName(name);
    ready = true;
  }
</script>

{#if ready}
  <Lobby {code} />
{:else}
  <header class="flex items-center justify-between">
    <span class="font-mono text-sm tracking-widest text-moon">{t('room')} {code}</span>
    <LangToggle />
  </header>
  <form class="mt-16" onsubmit={onSubmit}>
    <label class="block">
      <span class="text-sm font-medium text-slate-300">{t('yourName')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="mt-1 block w-full rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-lg outline-none focus:border-moon"
        bind:value={name}
        maxlength={NAME_MAX_LENGTH}
        autocomplete="nickname"
        placeholder={t('namePlaceholder')}
        autofocus
      />
    </label>
    <button
      type="submit"
      class="mt-4 w-full rounded-xl bg-moon px-4 py-4 text-lg font-bold text-night-950 disabled:opacity-50"
      disabled={!name.trim()}
    >
      {t('continue')}
    </button>
  </form>
{/if}
