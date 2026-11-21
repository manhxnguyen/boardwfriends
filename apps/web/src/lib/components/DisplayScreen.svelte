<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { CueEntry } from '@bwf/protocol';
  import { joinUrl } from '../api.ts';
  import { RoomConnection } from '../connection.svelte.ts';
  import { sceneArt } from '../content/art.ts';
  import { callTitle, cueText } from '../content/narration.ts';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';
  import { Listener } from '../listener.svelte.ts';
  import { Narrator } from '../narrator.svelte.ts';
  import { qrSvg } from '../qr.ts';
  import { parseVoiceCommand, type VoiceCommand } from '../voice-commands.ts';
  import { WakeLock } from '../wakeLock.svelte.ts';
  import Countdown from './Countdown.svelte';
  import LangToggle from './LangToggle.svelte';
  import RulesButton from './RulesButton.svelte';

  /** Narrator screen for the MacBook in the middle of the circle: public view + voice. */
  let { code }: { code: string } = $props();

  const conn = new RoomConnection(
    untrack(() => code),
    () => 'TV',
    'display',
  );
  const narrator = new Narrator();
  const wakeLock = new WakeLock();
  const listener = new Listener(onSentence);
  onDestroy(() => {
    conn.dispose();
    listener.stop();
    narrator.disable();
    wakeLock.dispose();
  });

  const room = $derived(conn.room);
  const game = $derived(room?.game ?? null);
  const play = $derived(game?.phase === 'playing' ? game.play : null);
  const players = $derived(room?.lobby.players ?? []);
  const names = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const oneNight = $derived(play?.kind === 'one-night');
  const voiceAllowed = $derived(game?.setup?.voice === true && game.phase === 'playing');
  const qr = $derived(qrSvg(joinUrl(code)));

  // ---------------------------------------------------------------- narration
  let spokenRound: number | null = null;
  let lastSeq = 0;
  let firstLoad = true;
  let caption = $state('');

  $effect(() => {
    if (!play || game?.phase !== 'playing') return;
    const round = game.round;
    const cues: CueEntry[] = play.cues;
    untrack(() => {
      const maxSeq = cues.at(-1)?.seq ?? 0;
      if (spokenRound !== round) {
        // Joining mid-game: do not replay history. New round: speak from the start.
        lastSeq = firstLoad ? maxSeq : 0;
        spokenRound = round;
      }
      firstLoad = false;
      for (const entry of cues) {
        if (entry.seq <= lastSeq) continue;
        const text = cueText(entry.cue, i18n.lang, names, play.kind === 'one-night');
        if (text) {
          caption = text;
          narrator.speak(text, i18n.lang);
        }
      }
      lastSeq = Math.max(lastSeq, maxSeq);
    });
  });

  // While the narrator talks, the microphone must not listen (it would hear itself).
  $effect(() => listener.suspend(narrator.speaking));

  // ---------------------------------------------------------------- voice commands
  let understood = $state('');

  function describe(command: VoiceCommand): string {
    switch (command.cmd) {
      case 'nominate':
        return `${t('nominate')} ${names(command.target)}`;
      case 'second':
        return t('secondBtn');
      case 'start-vote':
        return t('skipToVote');
      case 'pause':
        return t('pause');
      case 'resume':
        return t('resume');
      case 'end-day':
        return t('skipDay');
      case 'repeat':
        return t('repeat');
    }
  }

  function onSentence(text: string) {
    const command = parseVoiceCommand(text, players);
    if (!command) return;
    understood = describe(command);
    if (command.cmd === 'repeat') narrator.repeat(i18n.lang);
    else
      conn.send({
        t: 'voice',
        cmd: command.cmd,
        ...(command.cmd === 'nominate' ? { target: command.target } : {}),
      });
  }

  function toggleListening() {
    if (listener.listening) listener.stop();
    else listener.start(i18n.lang);
  }

  function enableSound() {
    narrator.enable();
    if (wakeLock.supported && !wakeLock.enabled) void wakeLock.toggle();
  }

  // ---------------------------------------------------------------- view helpers
  const phaseTitle = $derived.by(() => {
    if (!play) return '';
    const p = play.phase;
    switch (p.kind) {
      case 'reveal':
        return t('phaseReveal');
      case 'night':
        return play.kind === 'classic' && 'night' in p
          ? t('phaseNight', { n: String(p.night) })
          : t('phaseNight', { n: '1' });
      case 'dawn':
        return t('phaseDawn');
      case 'day':
        return t('phaseDay', { n: String('day' in p ? p.day : 1) });
      case 'dusk':
        return t('phaseDusk');
      case 'hunter':
        return t('phaseHunter');
      case 'vote':
        return t('phaseVote');
      case 'over':
        return t('phaseOver');
    }
  });

  const endsAt = $derived.by(() => {
    if (!play || play.paused) return null;
    const p = play.phase;
    if (p.kind === 'day' && 'sub' in p) return p.sub ? p.sub.endsAt : p.endsAt;
    return 'endsAt' in p ? (p.endsAt as number | null) : null;
  });

  const isNight = $derived(play?.phase.kind === 'night' || play?.phase.kind === 'reveal');
  const currentCall = $derived(
    play?.phase.kind === 'night' ? callTitle(play.phase.call, i18n.lang, oneNight) : null,
  );
  const voices = $derived(narrator.voicesFor(i18n.lang));
  const scene = $derived.by(() => {
    const phase = play?.phase;
    if (phase?.kind === 'over') {
      if (phase.winners.includes('wolf')) return sceneArt('win-wolves');
      if (phase.winners.includes('village')) return sceneArt('win-village');
    }
    return sceneArt(isNight || !play ? 'bg-night' : 'bg-day');
  });
</script>

<div
  class="min-h-dvh w-full bg-cover bg-center px-8 py-6"
  style:background-color="#070d17"
  style:background-image={scene
    ? `linear-gradient(rgba(7,13,23,0.35), rgba(7,13,23,0.6)), url(${scene})`
    : undefined}
>
  <header class="flex items-center justify-between">
    <p class="font-mono text-2xl tracking-[0.3em] text-moon">{code}</p>
    <div class="flex items-center gap-3">
      {#if !narrator.enabled}
        <button
          type="button"
          class="rounded-full bg-moon px-5 py-2 font-bold text-night-950"
          onclick={enableSound}
        >
          {t('enableSound')}
        </button>
      {:else}
        <button
          type="button"
          class="rounded-full bg-night-800 px-4 py-2 text-sm"
          onclick={() => narrator.disable()}
        >
          {narrator.speaking ? t('soundOn') : t('soundOff')}
        </button>
      {/if}
      <RulesButton
        large
        game={game?.setup?.game ?? 'classic'}
        classicDeck={game?.setup?.roles ?? null}
        oneNightDeck={game?.setup?.oneNightRoles ?? null}
      />
      <LangToggle />
    </div>
  </header>

  {#if conn.status !== 'open'}
    <p class="mt-4 rounded-lg bg-wolf/80 px-4 py-2 text-center">
      {conn.status === 'connecting' ? t('statusConnecting') : t('statusReconnecting')}
    </p>
  {/if}

  {#if room && game}
    {#if !play}
      <!-- Lobby / manual game: show how to join -->
      <section class="mt-10 grid grid-cols-[auto_1fr] items-center gap-12">
        <div class="w-72 rounded-3xl bg-white p-3">{@html qr}</div>
        <div>
          <h1 class="text-5xl font-bold">🐺 {t('appName')}</h1>
          <p class="mt-3 text-xl text-slate-300">{t('scanToJoin')}</p>
          <p class="mt-6 text-lg text-slate-400">
            {players.length
              ? game.phase === 'setup'
                ? t('waitingDeal')
                : t('waitModerator')
              : t('waitingPlayers')}
          </p>
          <ul class="mt-4 flex flex-wrap gap-2">
            {#each players as p (p.id)}
              <li
                class="rounded-full bg-night-800 px-4 py-2 text-lg {p.connected
                  ? ''
                  : 'opacity-40'}"
              >
                {p.name}
              </li>
            {/each}
          </ul>
        </div>
      </section>
    {:else}
      <!-- Game in progress -->
      <section class="mt-6 flex items-end justify-between">
        <div>
          <h1 class="text-6xl font-bold">{isNight ? '🌙' : '☀️'} {phaseTitle}</h1>
          {#if currentCall}<p class="mt-2 text-3xl text-moon">{currentCall}</p>{/if}
          {#if play.paused}<p class="mt-2 text-2xl text-moon">⏸ {t('pausedBanner')}</p>{/if}
        </div>
        <Countdown {endsAt} serverNow={() => conn.serverNow()} big />
      </section>

      {#if caption}
        <p class="mt-6 rounded-2xl bg-night-950/60 px-6 py-5 text-3xl leading-snug">🎙️ {caption}</p>
      {/if}

      {#if play.kind === 'classic'}
        {@const phase = play.phase}
        {#if phase.kind === 'day' && phase.sub}
          <p class="mt-4 text-2xl text-slate-200">
            {#if phase.sub.kind === 'voting'}
              🗳️ {t('votingTitle', { nominee: names(phase.sub.nominee) })} · {t('votesProgress', {
                n: String(phase.sub.voted),
                total: String(phase.sub.total),
              })}
            {:else if phase.sub.kind === 'defense'}
              🗣️ {t('defenseTitle', { nominee: names(phase.sub.nominee) })}
            {:else}
              ✋ {phase.sub.by
                ? t('secondTitle', { by: names(phase.sub.by), nominee: names(phase.sub.nominee) })
                : t('secondUnknown', { nominee: names(phase.sub.nominee) })}
            {/if}
          </p>
        {/if}
        <ul class="mt-8 grid grid-cols-4 gap-3 xl:grid-cols-5">
          {#each play.seats as seat (seat.id)}
            <li
              class="rounded-2xl px-4 py-3 {seat.alive
                ? 'bg-night-800/80'
                : 'bg-night-950/60 opacity-50'}"
            >
              <p class="truncate text-2xl font-semibold {seat.alive ? '' : 'line-through'}">
                {seat.alive ? '🙂' : '💀'}
                {names(seat.id)}
              </p>
              {#if seat.role}
                <p class="mt-1 text-lg text-slate-300">
                  {ROLE_ICON[seat.role]}
                  {ROLE_TEXT[i18n.lang][seat.role].name}
                </p>
              {:else if seat.team}
                <p class="mt-1 text-lg text-slate-300">{TEAM_TEXT[i18n.lang][seat.team]}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        {#if play.phase.kind === 'vote'}
          <p class="mt-4 text-2xl">
            🗳️ {t('votesProgress', {
              n: String(play.phase.voted),
              total: String(play.phase.total),
            })}
          </p>
        {/if}
        {#if play.result}
          {@const result = play.result}
          <ul class="mt-8 grid grid-cols-4 gap-3 xl:grid-cols-5">
            {#each play.seats as seat (seat.id)}
              {@const card = result.final[seat.id]!}
              {@const role =
                card === 'doppelganger' && result.doppelCopy ? result.doppelCopy : card}
              <li
                class="rounded-2xl px-4 py-3 {result.deaths.includes(seat.id)
                  ? 'bg-wolf/40'
                  : 'bg-night-800/80'}"
              >
                <p class="truncate text-2xl font-semibold">
                  {result.winningPlayers.includes(seat.id) ? '🏆' : ''}
                  {names(seat.id)}
                </p>
                <p class="mt-1 text-lg">
                  {ONE_NIGHT_ICON[role]}
                  {ONE_NIGHT_TEXT[i18n.lang][role].name}
                </p>
              </li>
            {/each}
          </ul>
        {:else}
          <ul class="mt-8 flex flex-wrap gap-3">
            {#each play.seats as seat (seat.id)}
              <li class="rounded-full bg-night-800/80 px-5 py-2 text-2xl">{names(seat.id)}</li>
            {/each}
          </ul>
        {/if}
      {/if}
    {/if}
  {/if}

  <!-- Narrator controls -->
  <footer class="mt-10 flex flex-wrap items-center gap-3 border-t border-night-800 pt-4 text-sm">
    {#if narrator.supported && voices.length}
      <label class="flex items-center gap-2">
        {t('voiceName')}
        <select
          class="rounded-lg border border-night-600 bg-night-950 px-2 py-1"
          value={narrator.voiceURI ?? voices[0]?.voiceURI}
          onchange={(e) => narrator.setVoice(e.currentTarget.value)}
        >
          {#each voices as v (v.voiceURI)}
            <option value={v.voiceURI}>{v.name}</option>
          {/each}
        </select>
      </label>
      <button
        type="button"
        class="rounded-full bg-night-800 px-3 py-1.5"
        onclick={() => narrator.speak(t('testSentence'), i18n.lang)}
      >
        {t('testVoice')}
      </button>
      <button
        type="button"
        class="rounded-full bg-night-800 px-3 py-1.5"
        onclick={() => narrator.repeat(i18n.lang)}
      >
        🔁 {t('repeat')}
      </button>
    {/if}

    {#if voiceAllowed}
      {#if listener.supported}
        <button
          type="button"
          class="rounded-full px-3 py-1.5 font-semibold {listener.listening
            ? 'bg-wolf'
            : 'bg-night-800'}"
          onclick={toggleListening}
        >
          {listener.listening ? t('listenStop') : t('listenStart')}
        </button>
        {#if listener.heard}<span class="text-slate-400">
            {t('heard', { text: listener.heard })}
          </span>{/if}
        {#if understood}<span class="text-ok">{t('understood', { action: understood })}</span>{/if}
        {#if listener.error}<span class="text-wolf">⚠️ {listener.error}</span>{/if}
        <p class="w-full text-xs text-slate-500">{t('voiceHelp')}</p>
      {:else}
        <span class="text-slate-400">{t('listenUnsupported')}</span>
      {/if}
    {/if}
  </footer>
</div>
