<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { CueEntry } from '@bwf/protocol';
  import { joinUrl } from '../api.ts';
  import { RoomConnection } from '../connection.svelte.ts';
  import { sceneArt } from '../content/art.ts';
  import { callTitle, cueSpeech, cueText } from '../content/narration.ts';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';
  import { VOICE_COMMANDS } from '../features.ts';
  import { Listener } from '../listener.svelte.ts';
  import { setTheme, themeFor } from '../theme.ts';
  import { CLOUD_VOICE, Narrator, VIENEU_PREFIX } from '../narrator.svelte.ts';
  import { qrSvg } from '../qr.ts';
  import { parseVoiceCommand, type VoiceCommand } from '../voice-commands.ts';
  import { WakeLock } from '../wakeLock.svelte.ts';
  import Countdown from './Countdown.svelte';
  import FinalCountdown from './FinalCountdown.svelte';
  import GameRecap from './GameRecap.svelte';
  import OneNightRecap from './OneNightRecap.svelte';
  import CopyLinkButton from './CopyLinkButton.svelte';
  import LangToggle from './LangToggle.svelte';
  import RulesButton from './RulesButton.svelte';

  /** Narrator screen for the MacBook in the middle of the circle: public view + voice. */
  let { code }: { code: string } = $props();

  const conn = new RoomConnection(
    untrack(() => code),
    () => 'TV',
    'display',
  );
  const narrator = new Narrator(untrack(() => code));
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
  const voiceAllowed = $derived(
    VOICE_COMMANDS && game?.setup?.voice === true && game.phase === 'playing',
  );
  $effect(() => setTheme(themeFor(game)));
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
        // Joining mid-game: show the latest line as a caption without reading it aloud.
        if (firstLoad) {
          const latest = [...cues]
            .reverse()
            .map((e) => cueText(e.cue, i18n.lang, names, play.kind === 'one-night'))
            .find(Boolean);
          if (latest) caption = latest;
        }
      }
      firstLoad = false;
      for (const entry of cues) {
        if (entry.seq <= lastSeq) continue;
        const text = cueText(entry.cue, i18n.lang, names, play.kind === 'one-night');
        // The wolves' turn starts with a howl (narrator screen only; phones stay silent).
        const cue = entry.cue;
        if (cue.k === 'call-open' && (cue.call === 'wolves' || cue.call === 'werewolf')) {
          narrator.effect('howl');
        }
        if (text) {
          caption = text;
          narrator.speak(
            cueSpeech(entry.cue, i18n.lang, names, play.kind === 'one-night') ?? text,
            i18n.lang,
          );
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
  class="min-h-dvh w-full bg-cover bg-center px-4 py-4 md:px-8 md:py-6 2xl:px-16 2xl:py-10"
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
      <section class="mt-6 grid items-center gap-6 md:mt-10 md:grid-cols-[auto_1fr] md:gap-12">
        <div class="mx-auto w-56 rounded-3xl bg-white p-3 md:w-72 2xl:w-96">{@html qr}</div>
        <div>
          <h1 class="text-4xl font-bold md:text-5xl 2xl:text-7xl">🐺 {t('appName')}</h1>
          <p class="mt-3 text-xl text-slate-300">{t('scanToJoin')}</p>
          <p
            class="mt-2 font-mono text-5xl font-bold tracking-[0.3em] text-moon md:text-6xl 2xl:text-8xl"
          >
            {code}
          </p>
          <div class="mt-3"><CopyLinkButton url={joinUrl(code)} large /></div>
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
      <section class="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold md:text-6xl 2xl:text-8xl">
            {isNight ? '🌙' : '☀️'}
            {phaseTitle}
          </h1>
          {#if currentCall}<p class="mt-2 text-2xl text-moon md:text-3xl 2xl:text-5xl">
              {currentCall}
            </p>{/if}
          {#if play.paused}<p class="mt-2 text-2xl text-moon">⏸ {t('pausedBanner')}</p>{/if}
        </div>
        <Countdown {endsAt} serverNow={() => conn.serverNow()} big />
      </section>

      {#if caption}
        <p
          class="mt-6 rounded-2xl bg-night-950/60 px-4 py-4 text-xl leading-snug md:px-6 md:py-5 md:text-3xl 2xl:text-5xl"
        >
          🎙️ {caption}
        </p>
      {/if}

      {#if play.kind === 'classic'}
        {@const phase = play.phase}
        {#if phase.kind === 'day' && phase.sub?.kind === 'defense'}
          <div class="mt-4 flex justify-center">
            <FinalCountdown {endsAt} serverNow={() => conn.serverNow()} big />
          </div>
        {/if}
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
        <ul
          class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:text-xl"
        >
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
        {#if play.stats?.timeline?.length}
          <div class="mt-8">
            <GameRecap timeline={play.stats.timeline} roles={play.stats.roles} {names} big />
          </div>
        {/if}
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
          <ul
            class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:text-xl"
          >
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
          <div class="mt-8">
            <OneNightRecap {result} {names} big />
          </div>
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
    <label class="flex items-center gap-2">
      {t('voiceName')}
      <select
        class="rounded-lg border border-night-600 bg-night-950 px-2 py-1"
        value={narrator.selected ?? voices[0]?.voiceURI ?? ''}
        onchange={(e) => narrator.setVoice(e.currentTarget.value)}
      >
        {#if narrator.vieneuVoices.length}
          <optgroup label={t('voiceVieneu')}>
            {#each narrator.vieneuVoices as v (v.id)}
              <option value={VIENEU_PREFIX + v.id}>
                {v.featured ? '⭐ ' : ''}{v.name}{v.description ? ` · ${v.description}` : ''}
              </option>
            {/each}
          </optgroup>
        {/if}
        {#if narrator.cloudAvailable}
          <option value={CLOUD_VOICE}>☁️ {t('voiceCloud')}</option>
        {/if}
        {#if voices.length}
          <optgroup label={t('voiceDevice')}>
            {#each voices as v (v.voiceURI)}
              <option value={v.voiceURI}>{v.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if !narrator.cloudAvailable && !narrator.vieneuVoices.length && !voices.length}
          <option value="" disabled>{t('voiceNone')}</option>
        {/if}
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
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        class="size-5 accent-moon"
        checked={narrator.sfx}
        onchange={(e) => narrator.setSfx(e.currentTarget.checked)}
      />
      🐺 {t('sfxHowl')}
    </label>
    {#if narrator.sfx && narrator.enabled}
      <button
        type="button"
        class="rounded-full bg-night-800 px-3 py-1.5"
        onclick={() => narrator.effect('howl')}
      >
        {t('sfxTest')}
      </button>
    {/if}
    {#if !narrator.serverVieneu}
      <button
        type="button"
        class="rounded-full px-3 py-1.5 {narrator.localVoice
          ? 'bg-moon/20 text-moon'
          : 'bg-night-800'}"
        aria-pressed={narrator.localVoice}
        title={t('localVoiceHint')}
        onclick={() => narrator.setLocalVoice(!narrator.localVoice)}
      >
        🖥️ {t('localVoice')}
      </button>
    {/if}
    {#if narrator.localVoice && narrator.localError}
      <p class="w-full text-xs text-moon">⚠️ {t('localVoiceError')}</p>
    {/if}
    {#if narrator.vieneuError}
      <p class="w-full text-xs text-moon">⚠️ {t('voiceVieneuError')}</p>
    {/if}
    {#if narrator.cloudError}
      <p class="w-full text-xs text-moon">⚠️ {t('voiceCloudError')}</p>
    {/if}
    {#if narrator.missingVoice}
      <div class="w-full rounded-xl border border-wolf/60 bg-wolf/15 p-3 text-sm leading-relaxed">
        <p class="font-semibold">⚠️ {t('voiceMissingTitle')}</p>
        <p class="mt-1">{t('voiceMissingMac')}</p>
        <p class="mt-1">{t('voiceMissingEdge')}</p>
      </div>
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
