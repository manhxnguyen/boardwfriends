<script lang="ts">
  import {
    canDeal,
    cardCount,
    presetsFor,
    roleDef,
    seatCount,
    totalPoints,
    validateSetup,
    type Preset,
    type SetupIssue,
  } from '@bwf/engine';
  import {
    CLASSIC_ROLE_IDS,
    type ClassicRoleId,
    type LobbyView,
    type SetupView,
  } from '@bwf/protocol';
  import { FENCE_COLOR, ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n, t, type MessageKey } from '../i18n.svelte.ts';

  /** Host-only deck editor. Every change is sent to the server, which is the source of truth. */
  let {
    lobby,
    setup,
    onChange,
    onDeal,
  }: {
    lobby: LobbyView;
    setup: SetupView;
    onChange: (setup: SetupView) => void;
    onDeal: () => void;
  } = $props();

  const playerIds = $derived(lobby.players.map((p) => p.id));
  const manual = $derived(setup.mode === 'manual');
  // With the app as moderator, everyone gets a card.
  const deck = $derived({ roles: setup.roles, moderatorId: manual ? setup.moderatorId : null });
  const seats = $derived(seatCount(deck, playerIds));
  const cards = $derived(cardCount(setup.roles));
  const points = $derived(totalPoints(setup.roles));
  const issues = $derived(validateSetup(deck, playerIds));
  const dealable = $derived(canDeal(issues));
  const presets = $derived(presetsFor(seats));

  const teams = ['village', 'wolf', 'independent'] as const;
  const byTeam = $derived(
    teams.map((team) => ({
      team,
      roles: CLASSIC_ROLE_IDS.filter((id) => roleDef(id).team === team),
    })),
  );

  function setCount(id: ClassicRoleId, count: number) {
    const max = roleDef(id).max;
    onChange({ ...setup, roles: { ...setup.roles, [id]: Math.max(0, Math.min(max, count)) } });
  }

  function applyPreset(preset: Preset) {
    onChange({ ...setup, roles: { ...preset.roles } });
  }

  const presetLabel: Record<Preset['id'], MessageKey> = {
    basic: 'presetBasic',
    suggested: 'presetSuggested',
    'suggested-plus': 'presetSuggestedPlus',
  };

  function issueText(issue: SetupIssue): string {
    switch (issue.code) {
      case 'count_mismatch':
        return t('issueCountMismatch', { seats: String(issue.seats), cards: String(issue.cards) });
      case 'no_wolves':
        return t('issueNoWolves');
      case 'too_many':
        return t('issueTooMany', {
          max: String(issue.max),
          role: ROLE_TEXT[i18n.lang][issue.role].name,
        });
      case 'moderator_missing':
        return t('issueModeratorMissing');
      case 'too_few_players':
        return t('issueTooFew', { min: String(issue.min) });
      case 'lone_mason':
        return t('issueLoneMason');
      case 'unbalanced':
        return t('issueUnbalanced', { points: formatPoints(issue.points) });
    }
  }

  function formatPoints(p: number) {
    return p > 0 ? `+${p}` : String(p);
  }

  const balanceColor = $derived(
    Math.abs(points) <= 3 ? 'text-ok' : Math.abs(points) <= 6 ? 'text-moon' : 'text-wolf',
  );
</script>

<section class="mt-6 flex flex-col gap-4">
  <h2 class="text-lg font-bold">{t('deck')}</h2>

  {#if manual}
    <!-- Moderator -->
    <label class="block rounded-xl bg-night-900 p-4">
      <span class="text-sm font-semibold text-slate-300">{t('moderator')}</span>
      <select
        class="mt-2 block w-full rounded-lg border border-night-600 bg-night-950 px-3 py-3"
        value={setup.moderatorId ?? ''}
        onchange={(e) => onChange({ ...setup, moderatorId: e.currentTarget.value || null })}
      >
        <option value="">{t('noModerator')}</option>
        {#each lobby.players as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
      <span class="mt-2 block text-xs text-slate-400">{t('moderatorHint')}</span>
    </label>
  {/if}

  <!-- Presets -->
  {#if presets.length}
    <div>
      <p class="mb-2 text-sm font-semibold text-slate-300">{t('presets')} · {seats}</p>
      <div class="flex flex-wrap gap-2">
        {#each presets as preset (preset.id)}
          <button
            type="button"
            class="min-h-11 rounded-full bg-night-800 px-4 py-2 text-sm font-medium active:bg-night-700"
            onclick={() => applyPreset(preset)}
          >
            {t(presetLabel[preset.id])}
            <span class="ml-1 font-mono text-xs text-slate-400">
              {formatPoints(totalPoints(preset.roles))}
            </span>
            {#if preset.official}
              <span class="ml-1 text-xs text-moon">· {t('presetOfficial')}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Role counters -->
  {#each byTeam as group (group.team)}
    <div>
      <p class="mb-2 text-sm font-semibold text-slate-300">{TEAM_TEXT[i18n.lang][group.team]}</p>
      <ul class="divide-y divide-night-800 overflow-hidden rounded-xl bg-night-900">
        {#each group.roles as id (id)}
          {@const def = roleDef(id)}
          {@const count = setup.roles[id] ?? 0}
          <li class="flex min-h-14 items-center gap-3 px-3 py-2">
            <span
              class="h-8 w-1.5 shrink-0 rounded-full"
              style:background={FENCE_COLOR[def.fence]}
              aria-hidden="true"
            ></span>
            <span class="text-2xl" aria-hidden="true">{ROLE_ICON[id]}</span>
            <span class="flex-1 truncate {count ? '' : 'text-slate-400'}">
              {ROLE_TEXT[i18n.lang][id].name}
              <span class="ml-1 font-mono text-xs text-slate-500">{formatPoints(def.points)}</span>
            </span>
            <button
              type="button"
              class="size-11 rounded-lg bg-night-800 text-xl disabled:opacity-30"
              aria-label="−"
              disabled={count === 0}
              onclick={() => setCount(id, count - 1)}
            >
              −
            </button>
            <span class="w-6 text-center font-mono text-lg">{count}</span>
            <button
              type="button"
              class="size-11 rounded-lg bg-night-800 text-xl disabled:opacity-30"
              aria-label="+"
              disabled={count >= def.max}
              onclick={() => setCount(id, count + 1)}
            >
              +
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/each}

  <label class="flex items-center justify-between rounded-xl bg-night-900 px-4 py-3">
    <span>{t('publicRoles')}</span>
    <input
      type="checkbox"
      class="size-6 accent-moon"
      checked={setup.publicRoles}
      onchange={(e) => onChange({ ...setup, publicRoles: e.currentTarget.checked })}
    />
  </label>

  <!-- Sticky summary + deal -->
  <div
    class="sticky bottom-0 -mx-4 border-t border-night-800 bg-night-950/95 px-4 pt-3 pb-4 backdrop-blur"
  >
    <div class="flex items-baseline justify-between text-sm">
      <span>
        {t('cards')}:
        <span class="font-mono {cards === seats ? 'text-ok' : 'text-wolf'}">{cards}/{seats}</span>
      </span>
      <span title={t('pointsHint')}>
        {t('points')}:
        <span class="font-mono font-bold {balanceColor}">{formatPoints(points)}</span>
      </span>
    </div>
    {#if issues.length}
      <ul class="mt-2 space-y-1 text-xs">
        {#each issues as issue (issue.code === 'too_many' ? `too_many:${issue.role}` : issue.code)}
          <li class={issue.level === 'error' ? 'text-wolf' : 'text-moon'}>• {issueText(issue)}</li>
        {/each}
      </ul>
    {/if}
    <button
      type="button"
      class="mt-3 w-full rounded-xl bg-moon px-4 py-4 text-lg font-bold text-night-950 disabled:opacity-40"
      disabled={!dealable}
      onclick={onDeal}
    >
      🃏 {t('deal')}
    </button>
  </div>
</section>
