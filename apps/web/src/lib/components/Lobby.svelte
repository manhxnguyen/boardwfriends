<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { joinUrl } from '../api.ts';
  import { RoomConnection, type EndReason } from '../connection.svelte.ts';
  import { t, type MessageKey } from '../i18n.svelte.ts';
  import { rememberName, savedName } from '../identity.ts';
  import { goHome } from '../router.svelte.ts';
  import { WakeLock } from '../wakeLock.svelte.ts';
  import LangToggle from './LangToggle.svelte';
  import PlayerList from './PlayerList.svelte';
  import QrCard from './QrCard.svelte';

  let { code }: { code: string } = $props();

  // App re-creates this component per room ({#key code}), so reading `code` once is intended.
  const conn = new RoomConnection(
    untrack(() => code),
    savedName,
  );
  const wakeLock = new WakeLock();
  onDestroy(() => {
    conn.dispose();
    wakeLock.dispose();
  });

  const url = $derived(joinUrl(code));
  let toast = $state<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  function showToast(text: string) {
    toast = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = null), 2500);
  }

  $effect(() => {
    const code = conn.lastError;
    if (!code) return;
    showToast(code === 'room_full' ? t('errorRoomFull') : t('errorGeneric', { code }));
    conn.lastError = null;
  });

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: t('appName'), url });
      else {
        await navigator.clipboard.writeText(url);
        showToast(t('copied'));
      }
    } catch {
      // User cancelled the share sheet.
    }
  }

  function rename(name: string) {
    rememberName(name);
    conn.rename(name);
  }

  function leave() {
    if (confirm(t('leaveConfirm'))) conn.leave();
  }

  const endMessages: Record<EndReason, MessageKey> = {
    kicked: 'endedKicked',
    left: 'endedLeft',
    replaced: 'endedReplaced',
    room_closed: 'endedRoomClosed',
    room_not_found: 'endedRoomNotFound',
    version_mismatch: 'endedVersion',
  };
</script>

<header class="flex items-center justify-between">
  <button type="button" class="text-sm text-slate-400" onclick={goHome}>← {t('backHome')}</button>
  <LangToggle />
</header>

{#if conn.ended}
  <section class="mt-24 text-center">
    <p class="text-lg">{t(endMessages[conn.ended])}</p>
    <div class="mt-6 flex justify-center gap-3">
      {#if conn.ended === 'replaced'}
        <button
          class="rounded-xl bg-moon px-5 py-3 font-bold text-night-950"
          onclick={() => conn.reclaim()}
        >
          {t('reconnectHere')}
        </button>
      {:else if conn.ended === 'version_mismatch'}
        <button
          class="rounded-xl bg-moon px-5 py-3 font-bold text-night-950"
          onclick={() => location.reload()}
        >
          {t('reload')}
        </button>
      {/if}
      <button class="rounded-xl bg-night-700 px-5 py-3 font-semibold" onclick={goHome}>
        {t('backHome')}
      </button>
    </div>
  </section>
{:else}
  {#if conn.status !== 'open'}
    <div
      class="sticky top-0 z-10 mt-3 rounded-lg bg-wolf/80 px-4 py-2 text-center text-sm font-medium"
      role="status"
    >
      {conn.status === 'connecting' ? t('statusConnecting') : t('statusReconnecting')}
    </div>
  {/if}

  <section class="mt-6 text-center">
    <p class="text-sm tracking-widest text-slate-400 uppercase">{t('room')}</p>
    <p class="font-mono text-6xl font-bold tracking-[0.25em] text-moon">{code}</p>
  </section>

  <QrCard {url} onShare={share} />

  {#if conn.lobby && conn.you}
    <PlayerList
      lobby={conn.lobby}
      you={conn.you}
      isHost={conn.isHost}
      onRename={rename}
      onKick={(id) => conn.kick(id)}
    />

    {#if conn.isHost}
      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-moon px-4 py-4 text-lg font-bold text-night-950 disabled:opacity-40"
        disabled
      >
        {t('startGame')}
      </button>
      <p class="mt-2 text-center text-xs text-slate-400">{t('startSoon')}</p>
    {:else}
      <p class="mt-6 text-center text-slate-300">{t('waitingHost')}</p>
    {/if}
  {/if}

  <footer class="mt-auto flex flex-col gap-3 pt-8">
    <label class="flex items-center justify-between rounded-xl bg-night-900 px-4 py-3">
      <span class={wakeLock.supported ? '' : 'text-slate-500'}>
        {wakeLock.supported ? t('keepAwake') : t('keepAwakeUnsupported')}
      </span>
      <input
        type="checkbox"
        class="size-6 accent-moon"
        checked={wakeLock.enabled}
        disabled={!wakeLock.supported}
        onchange={() => wakeLock.toggle()}
      />
    </label>
    <button type="button" class="py-2 text-sm text-slate-400 underline" onclick={leave}>
      {t('leave')}
    </button>
  </footer>
{/if}

{#if toast}
  <div
    class="fixed inset-x-4 bottom-6 z-20 mx-auto max-w-sm rounded-xl bg-night-700 px-4 py-3 text-center shadow-lg"
    role="status"
  >
    {toast}
  </div>
{/if}
