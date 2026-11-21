<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { SetupView } from '@bwf/protocol';
  import { joinUrl } from '../api.ts';
  import { RoomConnection, type EndReason } from '../connection.svelte.ts';
  import { t, type MessageKey } from '../i18n.svelte.ts';
  import { rememberName, savedName } from '../identity.ts';
  import { goHome } from '../router.svelte.ts';
  import { WakeLock } from '../wakeLock.svelte.ts';
  import DeckBuilder from './DeckBuilder.svelte';
  import DeckSummary from './DeckSummary.svelte';
  import HoldToReveal from './HoldToReveal.svelte';
  import LangToggle from './LangToggle.svelte';
  import ModeratorView from './ModeratorView.svelte';
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
  const room = $derived(conn.room);
  const game = $derived(room?.game ?? null);
  const isModerator = $derived(game?.phase === 'dealt' ? game.moderatorId === conn.you : false);

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

  // M1 needs a human moderator: on a brand-new room, default the host to that job once.
  let defaultedModerator = false;
  $effect(() => {
    if (defaultedModerator || !conn.isHost || !conn.you || game?.phase !== 'setup') return;
    const setup = game.setup;
    if (!setup) return;
    defaultedModerator = true;
    if (setup.moderatorId === null && Object.keys(setup.roles).length === 0) {
      conn.setup({ ...setup, moderatorId: conn.you });
    }
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

  function newRound() {
    if (confirm(t('newRoundConfirm'))) conn.reset();
  }

  const updateSetup = (setup: SetupView) => conn.setup(setup);

  const endMessages: Record<EndReason, MessageKey> = {
    kicked: 'endedKicked',
    left: 'endedLeft',
    replaced: 'endedReplaced',
    room_closed: 'endedRoomClosed',
    room_not_found: 'endedRoomNotFound',
    version_mismatch: 'endedVersion',
    game_in_progress: 'endedGameInProgress',
  };
</script>

<header class="flex items-center justify-between">
  <button type="button" class="text-sm text-slate-400" onclick={goHome}>← {t('backHome')}</button>
  {#if game?.phase === 'dealt'}
    <span class="font-mono text-sm tracking-widest text-moon">
      {code} · {t('round', { n: String(game.round) })}
    </span>
  {/if}
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
      class="sticky top-0 z-20 mt-3 rounded-lg bg-wolf/80 px-4 py-2 text-center text-sm font-medium"
      role="status"
    >
      {conn.status === 'connecting' ? t('statusConnecting') : t('statusReconnecting')}
    </div>
  {/if}

  {#if room && conn.you && game}
    {#if game.phase === 'setup'}
      <!-- ───────────── Setup: lobby + deck ───────────── -->
      <section class="mt-6 text-center">
        <p class="text-sm tracking-widest text-slate-400 uppercase">{t('room')}</p>
        <p class="font-mono text-6xl font-bold tracking-[0.25em] text-moon">{code}</p>
      </section>

      <QrCard {url} onShare={share} />

      <PlayerList
        lobby={room.lobby}
        you={conn.you}
        isHost={conn.isHost}
        moderatorId={game.setup?.moderatorId ?? null}
        onRename={rename}
        onKick={(id) => conn.kick(id)}
      />

      {#if conn.isHost && game.setup}
        <DeckBuilder
          lobby={room.lobby}
          setup={game.setup}
          onChange={updateSetup}
          onDeal={() => conn.deal()}
        />
      {:else}
        <p class="mt-6 text-center text-slate-300">{t('deckChoosing')}</p>
        {#if game.setup && Object.keys(game.setup.roles).length}
          <div class="mt-4"><DeckSummary roles={game.setup.roles} /></div>
        {:else if !game.setup}
          <p class="mt-2 text-center text-sm text-slate-400">{t('deckHidden')}</p>
        {/if}
      {/if}
    {:else if isModerator && game.assignments}
      <!-- ───────────── Dealt: moderator ───────────── -->
      <section class="mt-6">
        <h1 class="text-2xl font-bold">🎙️ {t('youAreModerator')}</h1>
        <p class="mt-1 text-sm text-slate-400">
          {t('seenProgress', { seen: String(game.seenCount), total: String(game.dealtCount) })}
        </p>
      </section>
      <ModeratorView
        {code}
        round={game.round}
        lobby={room.lobby}
        roles={game.setup?.roles ?? {}}
        assignments={game.assignments}
      />
    {:else}
      <!-- ───────────── Dealt: player ───────────── -->
      <section class="mt-6 flex flex-col items-center gap-4 text-center">
        {#if game.yourRole}
          <p class="text-sm font-semibold text-moon">🤫 {t('keepSecret')}</p>
          <HoldToReveal role={game.yourRole} onFirstReveal={() => conn.markSeen()} />
          <p class="text-sm text-slate-300">{game.youSeen ? t('seenDone') : t('holdToReveal')}</p>
        {:else}
          <p class="mt-10 text-slate-300">{t('noCard')}</p>
        {/if}
        <p class="text-sm text-slate-400">
          {t('waitModerator')} ·
          {t('seenProgress', { seen: String(game.seenCount), total: String(game.dealtCount) })}
        </p>
      </section>
      {#if game.setup}
        <div class="mt-6"><DeckSummary roles={game.setup.roles} /></div>
      {/if}
    {/if}

    {#if game.phase === 'dealt' && conn.isHost}
      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-night-700 px-4 py-3 font-semibold"
        onclick={newRound}
      >
        🔄 {t('newRound')}
      </button>
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
    class="fixed inset-x-4 bottom-6 z-30 mx-auto max-w-sm rounded-xl bg-night-700 px-4 py-3 text-center shadow-lg"
    role="status"
  >
    {toast}
  </div>
{/if}
