<script lang="ts">
  import type { LobbyView, OneNightView, Prompt } from '@bwf/protocol';
  import type { RoomConnection } from '../connection.svelte.ts';
  import { callTitle, cueText } from '../content/narration.ts';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { i18n, t, type MessageKey } from '../i18n.svelte.ts';
  import Countdown from './Countdown.svelte';
  import HoldToReveal from './HoldToReveal.svelte';
  import Notebook from './Notebook.svelte';
  import OneNightCard from './OneNightCard.svelte';
  import PlayerPicker from './PlayerPicker.svelte';

  /** Phone screen for One Night Werewolf (always app-moderated). */
  let {
    conn,
    view,
    lobby,
    isHost,
  }: { conn: RoomConnection; view: OneNightView; lobby: LobbyView; isHost: boolean } = $props();

  const names = (id: string) => lobby.players.find((p) => p.id === id)?.name ?? '?';
  const roleName = (r: keyof (typeof ONE_NIGHT_TEXT)['vi']) =>
    `${ONE_NIGHT_ICON[r]} ${ONE_NIGHT_TEXT[i18n.lang][r].name}`;
  const you = $derived(view.you);
  const phase = $derived(view.phase);
  const caption = $derived.by(() => {
    const last = view.cues.at(-1);
    return last ? cueText(last.cue, i18n.lang, names, true) : null;
  });
  const endsAt = $derived(!view.paused && 'endsAt' in phase ? phase.endsAt : null);

  const title = $derived.by(() => {
    switch (phase.kind) {
      case 'reveal':
        return t('phaseReveal');
      case 'night':
        return t('phaseNight', { n: '1' });
      case 'day':
        return t('phaseDay', { n: '1' });
      case 'vote':
        return t('phaseVote');
      case 'over':
        return t('phaseOver');
    }
  });

  const pickTitle: Partial<Record<Extract<Prompt, { kind: 'pick' }>['purpose'], MessageKey>> = {
    suspect: 'suspectTitle',
    'on-doppel': 'doppelTitle',
    'on-werewolf': 'loneWolfTitle',
    'on-seer': 'seerChoose',
    'on-robber': 'robberTitle',
    'on-troublemaker': 'troublemakerTitle',
    'on-drunk': 'drunkTitle',
  };

  const tally = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const target of Object.values(view.result?.votes ?? {}))
      counts[target] = (counts[target] ?? 0) + 1;
    return counts;
  });
  const youWon = $derived(
    !!view.result && !!conn.you && view.result.winningPlayers.includes(conn.you),
  );
</script>

<section
  class="sticky top-0 z-10 -mx-4 mt-3 bg-night-950/95 px-4 py-2 backdrop-blur phone-land:static! phone-land:mt-1 phone-land:py-1"
>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold">{title}</h1>
      {#if phase.kind === 'night'}
        <p class="text-xs text-slate-400">
          {t('nowCalling', { name: callTitle(phase.call, i18n.lang, true) })}
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
    <p
      class="mt-2 rounded-lg bg-night-900 px-3 py-2 text-sm leading-snug text-slate-200 phone-land:mt-1 phone-land:py-1 phone-land:text-xs"
    >
      🎙️ {caption}
    </p>
  {/if}
</section>

<!-- Phones: one column. Tablets/laptops: card + notebook on the left, actions on the right. -->
<div
  class="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-8 phone-land:grid phone-land:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] phone-land:items-start phone-land:gap-4"
>
  <div class="md:sticky md:top-32 phone-land:static!">
    {#if you}
      {#if phase.kind === 'reveal'}
        <section
          class="mt-6 flex flex-col items-center gap-4 text-center phone-land:mt-1 phone-land:gap-1"
        >
          <p class="text-sm font-semibold text-moon phone-land:text-xs">🤫 {t('keepSecret')}</p>
          <HoldToReveal onFirstReveal={() => conn.markSeen()}>
            <OneNightCard role={you.role} />
          </HoldToReveal>
          <p class="text-sm text-slate-400">
            {t('seenProgress', { seen: String(phase.seen), total: String(phase.total) })}
          </p>
        </section>
      {:else}
        <section
          class="mt-4 grid grid-cols-[8rem_1fr] items-start gap-3 md:grid-cols-1 md:justify-items-center phone-land:grid-cols-1! phone-land:justify-items-center!"
        >
          <HoldToReveal compact>
            <OneNightCard role={you.role} />
          </HoldToReveal>
          <Notebook knowledge={you.knowledge} {names} />
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
  </div>
  <div>
    {#if you && phase.kind !== 'reveal'}
      <section class="mt-5">
        {#if you.prompt.kind === 'pick'}
          {@const prompt = you.prompt}
          <h2 class="mb-1 text-lg font-bold">{t(pickTitle[prompt.purpose] ?? 'suspectTitle')}</h2>
          {#if prompt.purpose === 'suspect'}
            <p class="mb-2 text-xs text-slate-400">{t('suspectHint')}</p>
          {/if}
          <!-- New question → fresh picker (no stale local selection). -->
          {#key prompt.purpose}
            <PlayerPicker
              options={prompt.options}
              count={prompt.purpose === 'on-seer' ? 1 : prompt.count}
              centerCount={prompt.centerCount}
              centerAlternative={prompt.purpose === 'on-seer'}
              selected={prompt.selected}
              selectedCenter={prompt.selectedCenter}
              locked={prompt.locked}
              {names}
              onSubmit={(players, center) => conn.send({ t: 'act', players, center })}
            />
          {/key}
        {:else if you.prompt.kind === 'accuse'}
          {@const prompt = you.prompt}
          <h2 class="mb-2 text-lg font-bold">{t('accuseTitle')}</h2>
          <ul class="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {#each prompt.options as id (id)}
              <li>
                <button
                  type="button"
                  class="min-h-14 w-full rounded-xl px-3 py-3 text-left font-semibold {prompt.yours ===
                  id
                    ? 'bg-wolf'
                    : 'bg-night-800'}"
                  onclick={() => conn.send({ t: 'accuse', target: id })}
                >
                  👉 {names(id)}
                </button>
              </li>
            {/each}
          </ul>
          {#if phase.kind === 'vote'}
            <p class="mt-3 text-center text-sm text-slate-400">
              {t('votesProgress', { n: String(phase.voted), total: String(phase.total) })}
            </p>
          {/if}
        {:else if phase.kind === 'over' && view.result}
          <p class="text-center text-2xl font-bold">{youWon ? t('youWon') : t('youLost')}</p>
        {/if}
      </section>
    {/if}

    {#if view.result}
      {@const result = view.result}
      <section class="mt-6 overflow-hidden rounded-xl bg-night-900">
        <table class="w-full text-sm">
          <thead class="bg-night-800 text-left text-xs text-slate-400">
            <tr>
              <th class="px-3 py-2"></th><th class="px-2">{t('dealt')}</th><th class="px-2">
                {t('final')}
              </th><th class="px-2">🗳️</th>
            </tr>
          </thead>
          <tbody>
            {#each view.seats as seat (seat.id)}
              {@const dead = result.deaths.includes(seat.id)}
              {@const won = result.winningPlayers.includes(seat.id)}
              <tr class="border-t border-night-800">
                <td class="px-3 py-2 font-semibold {dead ? 'text-wolf line-through' : ''}">
                  {won ? '🏆 ' : ''}{names(seat.id)}
                </td>
                <td class="px-2 text-slate-400">{roleName(result.original[seat.id]!)}</td>
                <td class="px-2">
                  {roleName(result.final[seat.id]!)}{result.final[seat.id] === 'doppelganger' &&
                  result.doppelCopy
                    ? ` → ${roleName(result.doppelCopy)}`
                    : ''}
                </td>
                <td class="px-2 font-mono">{tally[seat.id] ?? 0}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="border-t border-night-800 px-3 py-2 text-sm">
          {t('centerLabel')}: {result.center.map(roleName).join(' · ')}
        </p>
      </section>
    {/if}

    {#if isHost && phase.kind !== 'reveal' && phase.kind !== 'over'}
      <div class="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-xl bg-night-800 py-3 font-semibold"
          onclick={() => conn.send({ t: 'pause', paused: !view.paused })}
        >
          {view.paused ? `▶️ ${t('resume')}` : `⏸ ${t('pause')}`}
        </button>
        {#if phase.kind === 'day'}
          <button
            type="button"
            class="rounded-xl bg-night-800 py-3 font-semibold"
            onclick={() => conn.send({ t: 'skip' })}
          >
            🗳️ {t('skipToVote')}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
