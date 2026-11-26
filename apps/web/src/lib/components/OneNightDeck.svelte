<script lang="ts">
  import {
    CENTER_CARDS,
    oneNightCardCount,
    oneNightDef,
    oneNightPresets,
    validateOneNight,
    type OneNightIssue,
  } from '@bwf/engine';
  import {
    ONE_NIGHT_ROLE_IDS,
    type LobbyView,
    type OneNightRoleId,
    type SetupView,
  } from '@bwf/protocol';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { TEAM_TEXT } from '../content/roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';

  /** Host-only One Night deck editor: players + 3 center cards. */
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

  const seats = $derived(lobby.players.length);
  const roles = $derived(setup.oneNightRoles);
  const cards = $derived(oneNightCardCount(roles));
  const issues = $derived(validateOneNight(roles, seats));
  const dealable = $derived(!issues.some((i) => i.level === 'error'));
  const presets = $derived(oneNightPresets(seats));

  function setCount(id: OneNightRoleId, count: number) {
    const max = oneNightDef(id).max;
    onChange({
      ...setup,
      oneNightRoles: { ...roles, [id]: Math.max(0, Math.min(max, count)) },
    });
  }

  function issueText(issue: OneNightIssue): string {
    switch (issue.code) {
      case 'count_mismatch':
        return t('issueCountMismatch', { seats: String(issue.seats), cards: String(issue.cards) });
      case 'too_many':
        return t('issueTooMany', {
          max: String(issue.max),
          role: ONE_NIGHT_TEXT[i18n.lang][issue.role].name,
        });
      case 'masons_pair':
        return t('issueMasonsPair');
      case 'too_few_players':
        return t('issueTooFew', { min: String(issue.min) });
      case 'insomniac_useless':
        return t('issueInsomniacUseless');
    }
  }
</script>

<section class="mt-6 flex flex-col gap-4">
  <h2 class="text-lg font-bold">{t('deck')}</h2>

  {#if presets.length}
    <div class="flex flex-wrap gap-2">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          class="min-h-11 rounded-full bg-night-800 px-4 py-2 text-sm font-medium"
          onclick={() => onChange({ ...setup, oneNightRoles: { ...preset.roles } })}
        >
          {t('presetSuggested')} · {seats}
        </button>
      {/each}
    </div>
  {/if}

  <ul class="divide-y divide-night-800 overflow-hidden rounded-xl bg-night-900">
    {#each ONE_NIGHT_ROLE_IDS as id (id)}
      {@const def = oneNightDef(id)}
      {@const count = roles[id] ?? 0}
      <li class="flex min-h-14 items-center gap-3 px-3 py-2">
        <span class="text-2xl" aria-hidden="true">{ONE_NIGHT_ICON[id]}</span>
        <span class="flex-1 truncate {count ? '' : 'text-slate-400'}">
          {ONE_NIGHT_TEXT[i18n.lang][id].name}
          <span class="ml-1 text-xs text-slate-500">{TEAM_TEXT[i18n.lang][def.team]}</span>
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

  <div
    class="sticky bottom-0 -mx-4 border-t border-night-800 bg-night-950/95 px-4 pt-3 pb-4 backdrop-blur"
  >
    <p class="text-sm">
      {t('cards')}:
      <span class="font-mono {cards === seats + CENTER_CARDS ? 'text-ok' : 'text-wolf'}">
        {cards}/{seats + CENTER_CARDS}
      </span>
      <span class="text-xs text-slate-400">({seats} + {t('centerCards')})</span>
    </p>
    {#if issues.length}
      <ul class="mt-2 space-y-1 text-xs">
        {#each issues as issue, i (i)}
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
