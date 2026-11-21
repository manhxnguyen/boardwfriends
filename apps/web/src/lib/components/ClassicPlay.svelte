<script lang="ts">
  import { roleDef } from '@bwf/engine';
  import type { ClassicView, LobbyView, Prompt } from '@bwf/protocol';
  import type { RoomConnection } from '../connection.svelte.ts';
  import { callTitle, cueText } from '../content/narration.ts';
  import { ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n, t, type MessageKey } from '../i18n.svelte.ts';
  import Countdown from './Countdown.svelte';
  import HoldToReveal from './HoldToReveal.svelte';
  import Notebook from './Notebook.svelte';
  import PlayerPicker from './PlayerPicker.svelte';
  import RoleCard from './RoleCard.svelte';

  /** Phone screen for an app-moderated Classic game. */
  let {
    conn,
    view,
    lobby,
    isHost,
  }: { conn: RoomConnection; view: ClassicView; lobby: LobbyView; isHost: boolean } = $props();

  const names = (id: string) => lobby.players.find((p) => p.id === id)?.name ?? '?';
  const you = $derived(view.you);
  const phase = $derived(view.phase);
  const caption = $derived.by(() => {
    const last = view.cues.at(-1);
    return last ? cueText(last.cue, i18n.lang, names, false) : null;
  });

  const title = $derived.by(() => {
    switch (phase.kind) {
      case 'reveal':
        return t('phaseReveal');
      case 'night':
        return t('phaseNight', { n: String(phase.night) });
      case 'dawn':
        return t('phaseDawn');
      case 'day':
        return t('phaseDay', { n: String(phase.day) });
      case 'dusk':
        return t('phaseDusk');
      case 'hunter':
        return t('phaseHunter');
      case 'over':
        return t('phaseOver');
    }
  });

  const endsAt = $derived.by(() => {
    if (view.paused) return null;
    if (phase.kind === 'day') return phase.sub ? phase.sub.endsAt : phase.endsAt;
    return 'endsAt' in phase ? phase.endsAt : null;
  });

  const act = (players: string[], witch?: 'save' | 'kill' | 'pass') =>
    conn.send({ t: 'act', players, ...(witch ? { witch } : {}) });

  const pickTitle: Record<Extract<Prompt, { kind: 'pick' }>['purpose'], MessageKey> = {
    suspect: 'suspectTitle',
    bodyguard: 'bodyguardTitle',
    wolves: 'wolvesTitle',
    seer: 'seerTitle',
    sorceress: 'sorceressTitle',
    spellcaster: 'spellcasterTitle',
    hunter: 'hunterTitle',
    'on-werewolf': 'loneWolfTitle',
    'on-seer': 'seerChoose',
    'on-robber': 'robberTitle',
    'on-troublemaker': 'troublemakerTitle',
    'on-drunk': 'drunkTitle',
  };

  const noteText: Record<string, MessageKey> = {
    'meet-only': 'meetOnly',
    'no-effect': 'noEffect',
    used: 'usedPower',
    double: 'wolvesHint',
  };

  let witchKilling = $state(false);

  const yourTeamWon = $derived.by(() => {
    if (phase.kind !== 'over' || !you) return false;
    const team = roleDef(you.role).team;
    if (you.role === 'tanner') return phase.winners.includes('tanner');
    return team === 'village' ? phase.winners.includes('village') : phase.winners.includes('wolf');
  });

  const causeKey: Record<string, MessageKey> = {
    wolves: 'causeWolves',
    witch: 'causeWitch',
    vote: 'causeVote',
    hunter: 'causeHunter',
  };

  function nominate(id: string) {
    if (confirm(`${t('nominate')} ${names(id)}?`)) conn.send({ t: 'nominate', target: id });
  }

  const canNominate = $derived(
    phase.kind === 'day' && !phase.sub && !!you?.alive && !you.silenced && !view.paused,
  );
  const topSuspects = $derived(
    view.stats
      ? Object.entries(view.stats.suspected)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
      : [],
  );
</script>

<!-- Header: phase, clock, host controls -->
<section class="sticky top-0 z-10 -mx-4 mt-3 bg-night-950/95 px-4 py-2 backdrop-blur">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold">{title}</h1>
      {#if phase.kind === 'night'}
        <p class="text-xs text-slate-400">
          {t('nowCalling', { name: callTitle(phase.call, i18n.lang, false) })}
        </p>
      {/if}
    </div>
    <Countdown {endsAt} serverNow={() => conn.serverNow()} />
  </div>
  {#if view.paused}
    <p class="mt-1 rounded-lg bg-moon/20 px-3 py-1 text-center text-sm text-moon">
      ⏸ {t('pausedBanner')}
    </p>
  {/if}
  {#if caption}
    <p class="mt-2 rounded-lg bg-night-900 px-3 py-2 text-sm leading-snug text-slate-200">
      🎙️ {caption}
    </p>
  {/if}
</section>

{#if you}
  {#if phase.kind === 'reveal'}
    <section class="mt-6 flex flex-col items-center gap-4 text-center">
      <p class="text-sm font-semibold text-moon">🤫 {t('keepSecret')}</p>
      <HoldToReveal onFirstReveal={() => conn.markSeen()}>
        <RoleCard role={you.role} />
      </HoldToReveal>
      <p class="text-sm text-slate-400">
        {t('seenProgress', { seen: String(phase.seen), total: String(phase.total) })}
      </p>
    </section>
  {:else}
    <!-- Role reminder + notebook -->
    <section class="mt-4 grid grid-cols-[8rem_1fr] items-start gap-3">
      <HoldToReveal compact>
        <RoleCard role={you.role} />
      </HoldToReveal>
      <Notebook knowledge={you.knowledge} {names} />
    </section>

    <!-- Action area -->
    <section class="mt-5">
      {#if phase.kind === 'over'}
        <p class="text-center text-2xl font-bold">{yourTeamWon ? t('youWon') : t('youLost')}</p>
      {:else if !you.alive && you.prompt.kind !== 'pick'}
        <p class="rounded-xl bg-night-900 p-4 text-center text-slate-300">💀 {t('dead')}</p>
      {:else if you.prompt.kind === 'pick'}
        {@const prompt = you.prompt}
        <h2 class="mb-1 text-lg font-bold">
          {prompt.purpose === 'wolves' && prompt.count === 2
            ? t('wolvesTitleDouble')
            : prompt.purpose === 'wolves' && prompt.count === 0
              ? t('packLabel')
              : t(pickTitle[prompt.purpose])}
        </h2>
        {#if prompt.note && noteText[prompt.note]}
          <p class="mb-2 text-sm text-moon">{t(noteText[prompt.note]!)}</p>
        {:else if prompt.purpose === 'suspect'}
          <p class="mb-2 text-xs text-slate-400">{t('suspectHint')}</p>
        {:else if prompt.purpose === 'wolves'}
          <p class="mb-2 text-xs text-slate-400">{t('wolvesHint')}</p>
        {/if}
        {#if prompt.pack}
          <ul class="mb-3 space-y-1 rounded-xl bg-wolf/15 p-3 text-sm">
            {#each prompt.pack as member (member.id)}
              <li>
                🐺 {names(member.id)}{member.picks.length
                  ? ` → ${member.picks.map(names).join(', ')}`
                  : ''}
              </li>
            {/each}
          </ul>
        {/if}
        <PlayerPicker
          options={prompt.options}
          count={prompt.count}
          selected={prompt.selected}
          locked={prompt.locked}
          {names}
          onSubmit={(players) => act(players)}
        />
        {#if prompt.purpose === 'hunter'}
          <button
            type="button"
            class="mt-3 w-full rounded-xl bg-night-700 py-3"
            onclick={() => act([])}
          >
            🎯 {t('hunterAir')}
          </button>
        {/if}
      {:else if you.prompt.kind === 'witch'}
        {@const prompt = you.prompt}
        <h2 class="mb-1 text-lg font-bold">🧪 {t('witchTitle')}</h2>
        <p class="mb-3 text-xs text-slate-400">{t('witchOnce')}</p>
        <p class="mb-3 text-sm">
          {prompt.targets.length
            ? t('witchTarget', { names: prompt.targets.map(names).join(', ') })
            : t('witchNoTarget')}
        </p>
        <div class="flex flex-col gap-2">
          {#each prompt.targets as target (target)}
            <button
              type="button"
              class="rounded-xl py-3 font-semibold {prompt.choice?.action === 'save' &&
              prompt.choice.target === target
                ? 'bg-ok text-night-950'
                : 'bg-night-800'}"
              onclick={() => act([target], 'save')}
            >
              💚 {t('witchSave', { name: names(target) })}
            </button>
          {/each}
          <button
            type="button"
            class="rounded-xl py-3 font-semibold {prompt.choice?.action === 'kill'
              ? 'bg-wolf'
              : 'bg-night-800'}"
            onclick={() => (witchKilling = !witchKilling)}
          >
            ☠️ {t('witchKill')}{prompt.choice?.action === 'kill' && prompt.choice.target
              ? `: ${names(prompt.choice.target)}`
              : ''}
          </button>
          {#if witchKilling}
            <PlayerPicker
              options={prompt.options}
              count={1}
              selected={prompt.choice?.action === 'kill' && prompt.choice.target
                ? [prompt.choice.target]
                : []}
              {names}
              onSubmit={(players) => act(players, 'kill')}
            />
          {/if}
          <button
            type="button"
            class="rounded-xl py-3 {prompt.choice?.action === 'pass'
              ? 'bg-moon text-night-950'
              : 'bg-night-800'}"
            onclick={() => act([], 'pass')}
          >
            {t('witchPass')}
          </button>
        </div>
      {:else if you.prompt.kind === 'second'}
        {@const prompt = you.prompt}
        <p class="mb-3 text-center text-lg">
          {prompt.by
            ? t('secondTitle', { by: names(prompt.by), nominee: names(prompt.nominee) })
            : t('secondUnknown', { nominee: names(prompt.nominee) })}
        </p>
        <button
          type="button"
          class="w-full rounded-xl bg-moon py-4 text-lg font-bold text-night-950"
          onclick={() => conn.send({ t: 'second' })}
        >
          ✋ {t('secondBtn')}
        </button>
      {:else if you.prompt.kind === 'vote'}
        {@const prompt = you.prompt}
        <p class="mb-3 text-center text-lg font-bold">
          {t('votingTitle', { nominee: names(prompt.nominee) })}
        </p>
        {#if prompt.forced}<p class="mb-2 text-center text-sm text-moon">{t('forcedVote')}</p>{/if}
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl py-5 text-lg font-bold {prompt.yours === 'keep'
              ? 'bg-ok text-night-950'
              : 'bg-night-800'}"
            disabled={prompt.forced}
            onclick={() => conn.send({ t: 'vote', choice: 'keep' })}
          >
            👍 {t('keep')}
          </button>
          <button
            type="button"
            class="rounded-xl py-5 text-lg font-bold {prompt.yours === 'eliminate'
              ? 'bg-wolf'
              : 'bg-night-800'}"
            disabled={prompt.forced}
            onclick={() => conn.send({ t: 'vote', choice: 'eliminate' })}
          >
            👎 {t('eliminate')}
          </button>
        </div>
      {:else if phase.kind === 'day'}
        {#if you.silenced}
          <p class="mb-3 rounded-xl bg-moon/15 p-3 text-center text-moon">🤫 {t('silencedYou')}</p>
        {:else if phase.silenced}
          <p class="mb-3 text-center text-sm text-moon">
            {t('silencedName', { name: names(phase.silenced) })}
          </p>
        {/if}
        {#if phase.sub?.kind === 'defense'}
          <p class="text-center text-lg">
            🗣️ {t('defenseTitle', { nominee: names(phase.sub.nominee) })}
          </p>
        {:else if phase.sub?.kind === 'voting'}
          <p class="text-center text-slate-300">
            {t('votesProgress', { n: String(phase.sub.voted), total: String(phase.sub.total) })}
          </p>
        {:else if phase.sub?.kind === 'nominated'}
          <p class="text-center text-slate-300">
            {phase.sub.by
              ? t('secondTitle', { by: names(phase.sub.by), nominee: names(phase.sub.nominee) })
              : t('secondUnknown', { nominee: names(phase.sub.nominee) })}
          </p>
        {:else if canNominate}
          <p class="mb-2 text-sm text-slate-400">{t('nominateHint')}</p>
          <ul class="grid grid-cols-2 gap-2">
            {#each view.seats.filter((s) => s.alive && s.id !== conn.you) as seat (seat.id)}
              <li>
                <button
                  type="button"
                  class="min-h-12 w-full rounded-xl bg-night-800 px-3 py-2 text-left font-semibold"
                  onclick={() => nominate(seat.id)}
                >
                  👉 {names(seat.id)}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>
  {/if}
{/if}

{#if phase.kind === 'reveal' && isHost}
  <button
    type="button"
    class="mt-6 w-full rounded-xl bg-moon px-4 py-4 text-lg font-bold text-night-950"
    onclick={() => conn.send({ t: 'start' })}
  >
    🌙 {t('startNight')}
  </button>
{:else if phase.kind === 'reveal'}
  <p class="mt-4 text-center text-sm text-slate-400">{t('waitStart')}</p>
{/if}

<!-- Table: who is alive, revealed roles -->
<section class="mt-6">
  <h2 class="mb-2 text-sm font-semibold text-slate-300">{t('players')}</h2>
  <ul class="divide-y divide-night-800 overflow-hidden rounded-xl bg-night-900">
    {#each view.seats as seat (seat.id)}
      <li class="flex min-h-11 items-center gap-3 px-4 py-2 {seat.alive ? '' : 'opacity-50'}">
        <span>{seat.alive ? '🙂' : '💀'}</span>
        <span class="flex-1 truncate {seat.alive ? '' : 'line-through'}">
          {names(seat.id)}{seat.id === conn.you ? ` (${t('you')})` : ''}
        </span>
        {#if seat.role}
          <span class="text-sm">{ROLE_ICON[seat.role]} {ROLE_TEXT[i18n.lang][seat.role].name}</span>
        {:else if seat.team}
          <span class="text-sm">{TEAM_TEXT[i18n.lang][seat.team]}</span>
        {/if}
      </li>
    {/each}
  </ul>
</section>

{#if view.stats}
  <section class="mt-6 space-y-4">
    {#if view.stats.deaths.length}
      <ul class="space-y-1 rounded-xl bg-night-900 p-4 text-sm">
        {#each view.stats.deaths as d (d.playerId)}
          <li>
            💀 {names(d.playerId)} · {t(causeKey[d.cause]!)} ({t('phaseDay', { n: String(d.day) })})
          </li>
        {/each}
      </ul>
    {/if}
    {#if topSuspects.length}
      <div class="rounded-xl bg-night-900 p-4 text-sm">
        <h3 class="mb-2 font-semibold text-slate-300">{t('statsSuspected')}</h3>
        {#each topSuspects as [id, n] (id)}
          <p>🔎 {names(id)} ({ROLE_TEXT[i18n.lang][view.stats.roles[id]!].name}) · {n}</p>
        {/each}
      </div>
    {/if}
    {#if view.stats.votes.length}
      <div class="rounded-xl bg-night-900 p-4 text-sm">
        <h3 class="mb-2 font-semibold text-slate-300">{t('statsVotes')}</h3>
        {#each view.stats.votes as v, i (i)}
          {@const out = Object.values(v.votes).filter((x) => x === 'eliminate').length}
          <p>
            {t('phaseDay', { n: String(v.day) })}: {names(v.nominee)} · 👎 {out} / 👍 {Object.keys(
              v.votes,
            ).length - out}
            {v.eliminated ? '💀' : ''}
          </p>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<!-- Host controls -->
{#if isHost && phase.kind !== 'reveal' && phase.kind !== 'over'}
  <div class="mt-6 grid grid-cols-2 gap-2">
    <button
      type="button"
      class="rounded-xl bg-night-800 py-3 font-semibold"
      onclick={() => conn.send({ t: 'pause', paused: !view.paused })}
    >
      {view.paused ? `▶️ ${t('resume')}` : `⏸ ${t('pause')}`}
    </button>
    {#if phase.kind === 'day' && (!phase.sub || phase.sub.kind === 'defense')}
      <button
        type="button"
        class="rounded-xl bg-night-800 py-3 font-semibold"
        onclick={() => conn.send({ t: 'skip' })}
      >
        {phase.sub ? `🗳️ ${t('skipToVote')}` : `🌙 ${t('skipDay')}`}
      </button>
    {/if}
  </div>
{/if}
