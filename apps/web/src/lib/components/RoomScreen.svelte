<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { SetupView } from '@bwf/protocol';
  import { joinUrl, narratorUrl } from '../api.ts';
  import { copyText } from '../clipboard.ts';
  import { RoomConnection, type EndReason } from '../connection.svelte.ts';
  import { t, type MessageKey } from '../i18n.svelte.ts';
  import { rememberName, savedName } from '../identity.ts';
  import { goHome } from '../router.svelte.ts';
  import { setTheme, themeFor } from '../theme.ts';
  import { WakeLock } from '../wakeLock.svelte.ts';
  import ClassicPlay from './ClassicPlay.svelte';
  import DeckBuilder from './DeckBuilder.svelte';
  import DeckSummary from './DeckSummary.svelte';
  import GameSettings from './GameSettings.svelte';
  import HoldToReveal from './HoldToReveal.svelte';
  import LangToggle from './LangToggle.svelte';
  import ModeratorView from './ModeratorView.svelte';
  import NarratorLink from './NarratorLink.svelte';
  import OneNightDeck from './OneNightDeck.svelte';
  import OneNightPlay from './OneNightPlay.svelte';
  import PlayerList from './PlayerList.svelte';
  import QrCard from './QrCard.svelte';
  import RulesButton from './RulesButton.svelte';
  import RoleCard from './RoleCard.svelte';

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
    setTheme('night');
  });

  // Day/night tone follows the game: the whole phone brightens at dawn and darkens at night.
  $effect(() => setTheme(themeFor(conn.room?.game)));

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

  // A human moderator is needed in manual mode: default the host to that job once.
  let defaultedModerator = false;
  $effect(() => {
    if (defaultedModerator || !conn.isHost || !conn.you || game?.phase !== 'setup') return;
    const setup = game.setup;
    if (!setup || setup.mode !== 'manual' || setup.game !== 'classic') return;
    defaultedModerator = true;
    if (setup.moderatorId === null) conn.setup({ ...setup, moderatorId: conn.you });
  });

  // Moving between setup, dealt and playing replaces the whole screen: start at the top
  // (the host is usually scrolled down to the Deal button).
  const screenKey = $derived(
    game ? `${game.phase}:${game.phase === 'setup' ? '' : game.round}` : '',
  );
  $effect(() => {
    if (screenKey) window.scrollTo({ top: 0 });
  });

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: t('appName'), url });
      else if (await copyText(url)) showToast(t('copied'));
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
  <button type="button" class="-ml-2 min-h-11 px-2 text-sm text-slate-400" onclick={goHome}>
    ← {t('backHome')}
  </button>
  {#if game && game.phase !== 'setup'}
    <span class="font-mono text-sm tracking-widest text-moon">
      {code} · {t('round', { n: String(game.round) })}
    </span>
  {/if}
  <div class="flex items-center gap-2">
    <RulesButton
      game={game?.setup?.game ?? 'classic'}
      classicDeck={game?.setup?.roles ?? null}
      oneNightDeck={game?.setup?.oneNightRoles ?? null}
    />
    <LangToggle />
  </div>
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
      <!-- ───────────── Setup: lobby, settings, deck ───────────── -->
      <!-- Laptops: room/QR/players on the left, settings and deck on the right. -->
      <div
        class="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10 phone-land:grid phone-land:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] phone-land:items-start phone-land:gap-6"
      >
        <div
          class="lg:sticky lg:top-6 phone-land:grid phone-land:grid-cols-2 phone-land:items-center phone-land:gap-x-4"
        >
          <section class="mt-6 text-center phone-land:mt-2">
            <p class="text-sm tracking-widest text-slate-400 uppercase">{t('room')}</p>
            <p class="font-mono text-6xl font-bold tracking-[0.25em] text-moon phone-land:text-4xl">
              {code}
            </p>
          </section>

          <QrCard {url} onShare={share} />

          <div class="phone-land:col-span-2">
            <PlayerList
              lobby={room.lobby}
              you={conn.you}
              isHost={conn.isHost}
              moderatorId={game.setup?.mode === 'manual' ? (game.setup.moderatorId ?? null) : null}
              onRename={rename}
              onKick={(id) => conn.kick(id)}
              onReorder={conn.isHost ? (order) => conn.send({ t: 'seats', order }) : undefined}
            />
          </div>
        </div>
        <div>
          {#if conn.isHost && game.setup}
            {@const setup = game.setup}
            <GameSettings {setup} onChange={updateSetup} />
            {#if setup.game === 'one-night' || setup.mode === 'auto'}
              <NarratorLink url={narratorUrl(code)} {code} displays={room.lobby.displays} />
            {/if}
            {#if setup.game === 'classic'}
              <DeckBuilder
                lobby={room.lobby}
                {setup}
                onChange={updateSetup}
                onDeal={() => conn.deal()}
              />
            {:else}
              <OneNightDeck
                lobby={room.lobby}
                {setup}
                onChange={updateSetup}
                onDeal={() => conn.deal()}
              />
            {/if}
          {:else}
            <p class="mt-6 text-center text-slate-300">{t('deckChoosing')}</p>
            {#if game.setup && game.setup.game === 'classic' && Object.keys(game.setup.roles).length}
              <div class="mt-4"><DeckSummary roles={game.setup.roles} /></div>
            {:else if !game.setup}
              <p class="mt-2 text-center text-sm text-slate-400">{t('deckHidden')}</p>
            {/if}
          {/if}
        </div>
      </div>
    {:else if game.phase === 'playing'}
      <!-- ───────────── App-moderated game ───────────── -->
      {#if game.play.kind === 'classic'}
        <ClassicPlay {conn} view={game.play} lobby={room.lobby} isHost={conn.isHost} />
      {:else}
        <OneNightPlay {conn} view={game.play} lobby={room.lobby} isHost={conn.isHost} />
      {/if}
    {:else if isModerator && game.assignments}
      <!-- ───────────── Manual: moderator ───────────── -->
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
        firstNightKill={game.setup?.firstNightKill === true}
      />
    {:else}
      <!-- ───────────── Manual: player ───────────── -->
      <section class="mt-6 flex flex-col items-center gap-4 text-center">
        {#if game.yourRole}
          <p class="text-sm font-semibold text-moon">🤫 {t('keepSecret')}</p>
          <HoldToReveal onFirstReveal={() => conn.markSeen()}>
            <RoleCard role={game.yourRole} />
          </HoldToReveal>
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

    {#if game.phase !== 'setup' && conn.isHost}
      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-night-700 px-4 py-3 font-semibold"
        onclick={newRound}
      >
        🔄 {t('newRound')}
      </button>
    {/if}
  {/if}

  <footer class="mt-auto flex w-full flex-col gap-3 pt-8 md:mx-auto md:max-w-md">
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
    <button type="button" class="min-h-11 text-sm text-slate-400 underline" onclick={leave}>
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
