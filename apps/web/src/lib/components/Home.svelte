<script lang="ts">
  import { NAME_MAX_LENGTH, ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '@bwf/protocol';
  import { ApiError, createRoom, getRoom } from '../api.ts';
  import { t, type MessageKey } from '../i18n.svelte.ts';
  import { rememberName, savedName } from '../identity.ts';
  import { goToDisplay, goToRoom } from '../router.svelte.ts';
  import LangToggle from './LangToggle.svelte';
  import RulesButton from './RulesButton.svelte';

  let name = $state(savedName());
  let code = $state('');
  let busy = $state(false);
  let error = $state<MessageKey | null>(null);

  const nameOk = $derived(name.trim().length > 0);
  const codeOk = $derived(isRoomCode(normalizeRoomCode(code)));

  async function run(action: () => Promise<void>) {
    if (!nameOk) {
      error = 'needName';
      return;
    }
    error = null;
    busy = true;
    rememberName(name);
    try {
      await action();
    } catch (e) {
      error =
        e instanceof ApiError && e.code === 'room_not_found' ? 'roomNotFound' : 'networkError';
    } finally {
      busy = false;
    }
  }

  const onCreate = () => run(async () => goToRoom(await createRoom()));

  // ---- Narrator screen (laptop): no player name needed.
  let tvCode = $state('');
  let tvBusy = $state(false);
  let tvError = $state<MessageKey | null>(null);
  const tvCodeOk = $derived(isRoomCode(normalizeRoomCode(tvCode)));

  async function runTv(action: () => Promise<void>) {
    tvError = null;
    tvBusy = true;
    try {
      await action();
    } catch (e) {
      tvError =
        e instanceof ApiError && e.code === 'room_not_found' ? 'roomNotFound' : 'networkError';
    } finally {
      tvBusy = false;
    }
  }

  const onTvCreate = () => runTv(async () => goToDisplay(await createRoom()));

  const onTvOpen = (event: SubmitEvent) => {
    event.preventDefault();
    const normalized = normalizeRoomCode(tvCode);
    return runTv(async () => {
      if ((await getRoom(normalized)) === null) throw new ApiError('room_not_found');
      goToDisplay(normalized);
    });
  };

  const onJoin = (event: SubmitEvent) => {
    event.preventDefault();
    const normalized = normalizeRoomCode(code);
    return run(async () => {
      if ((await getRoom(normalized)) === null) throw new ApiError('room_not_found');
      goToRoom(normalized);
    });
  };
</script>

<header class="flex items-center justify-between">
  <span class="text-sm font-semibold tracking-widest text-moon uppercase">boardwfriends</span>
  <div class="flex items-center gap-2">
    <RulesButton />
    <LangToggle />
  </div>
</header>

<section class="mt-10 mb-8 text-center">
  <div class="text-6xl" aria-hidden="true">🐺🌕</div>
  <h1 class="mt-4 text-4xl font-bold">{t('appName')}</h1>
  <p class="mt-2 text-slate-300">{t('tagline')}</p>
</section>

<label class="block">
  <span class="text-sm font-medium text-slate-300">{t('yourName')}</span>
  <input
    class="mt-1 block w-full rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-lg outline-none focus:border-moon"
    bind:value={name}
    maxlength={NAME_MAX_LENGTH}
    autocomplete="nickname"
    placeholder={t('namePlaceholder')}
  />
</label>

<button
  type="button"
  class="mt-4 w-full rounded-xl bg-moon px-4 py-4 text-lg font-bold text-night-950 disabled:opacity-50"
  disabled={busy}
  onclick={onCreate}
>
  {t('createRoom')}
</button>

<div class="my-6 flex items-center gap-3 text-sm text-slate-400">
  <hr class="flex-1 border-night-700" />
  {t('orJoin')}
  <hr class="flex-1 border-night-700" />
</div>

<form class="flex gap-2" onsubmit={onJoin}>
  <input
    class="min-w-0 flex-1 rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] uppercase outline-none focus:border-moon"
    bind:value={code}
    maxlength={ROOM_CODE_LENGTH}
    autocapitalize="characters"
    autocomplete="off"
    spellcheck="false"
    aria-label={t('roomCode')}
    placeholder="ABCD"
  />
  <button
    type="submit"
    class="rounded-xl bg-night-700 px-5 font-semibold disabled:opacity-50"
    disabled={busy || !codeOk}
  >
    {t('join')}
  </button>
</form>

{#if error}
  <p class="mt-4 rounded-lg bg-wolf/20 px-4 py-3 text-center text-sm" role="alert">{t(error)}</p>
{/if}

<section class="mt-10 rounded-2xl border border-night-700 bg-night-900 p-4">
  <h2 class="font-semibold">🖥️ {t('tvTitle')}</h2>
  <p class="mt-1 text-sm text-slate-400">{t('tvHint')}</p>
  <button
    type="button"
    class="mt-3 w-full rounded-xl bg-night-700 px-4 py-3 font-semibold disabled:opacity-50"
    disabled={tvBusy}
    onclick={onTvCreate}
  >
    {t('tvCreate')}
  </button>
  <form class="mt-2 flex gap-2" onsubmit={onTvOpen}>
    <input
      class="min-w-0 flex-1 rounded-xl border border-night-600 bg-night-950 px-4 py-2.5 text-center font-mono text-xl tracking-[0.4em] uppercase outline-none focus:border-moon"
      bind:value={tvCode}
      maxlength={ROOM_CODE_LENGTH}
      autocapitalize="characters"
      autocomplete="off"
      spellcheck="false"
      aria-label={t('roomCode')}
      placeholder="ABCD"
    />
    <button
      type="submit"
      class="rounded-xl bg-night-700 px-4 font-semibold disabled:opacity-50"
      disabled={tvBusy || !tvCodeOk}
    >
      {t('tvOpen')}
    </button>
  </form>
  {#if tvError}
    <p class="mt-3 rounded-lg bg-wolf/20 px-4 py-2 text-center text-sm" role="alert">
      {t(tvError)}
    </p>
  {/if}
</section>
