<script lang="ts">
  import { oneNightDef, roleDef } from '@bwf/engine';
  import {
    CLASSIC_ROLE_IDS,
    ONE_NIGHT_ROLE_IDS,
    type GameKind,
    type OneNightRoleCounts,
    type RoleCounts,
  } from '@bwf/protocol';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import {
    CLASSIC_ROLE_CITES,
    ONE_NIGHT_ROLE_CITES,
    RULES,
    SOURCES,
    citeLabel,
    type Cite,
  } from '../content/rules.ts';
  import { i18n, t } from '../i18n.svelte.ts';
  import LangToggle from './LangToggle.svelte';

  /** Full-screen rules reference with citations, usable at any time during a game. */
  let {
    game = 'classic',
    classicDeck = null,
    oneNightDeck = null,
    onClose,
  }: {
    game?: GameKind;
    /** Roles in the current game (highlighted and listed first); null when unknown/hidden. */
    classicDeck?: RoleCounts | null;
    oneNightDeck?: OneNightRoleCounts | null;
    onClose: () => void;
  } = $props();

  let tab = $state<GameKind>('classic');
  let dialog: HTMLDivElement | undefined = $state();
  $effect.pre(() => {
    tab = game;
  });

  $effect(() => {
    dialog?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', onKey);
    };
  });

  const sections = $derived(RULES[i18n.lang][tab]);
  const sources = $derived(SOURCES[i18n.lang][tab]);

  interface RoleRow {
    id: string;
    icon: string;
    name: string;
    team: string;
    description: string;
    points: number | null;
    cites: Cite[];
    inGame: boolean;
  }

  const roles = $derived.by((): RoleRow[] => {
    const lang = i18n.lang;
    const rows: RoleRow[] =
      tab === 'classic'
        ? CLASSIC_ROLE_IDS.map((id) => ({
            id,
            icon: ROLE_ICON[id],
            name: ROLE_TEXT[lang][id].name,
            team: TEAM_TEXT[lang][roleDef(id).team],
            description: ROLE_TEXT[lang][id].description,
            points: roleDef(id).points,
            cites: CLASSIC_ROLE_CITES[id],
            inGame: (classicDeck?.[id] ?? 0) > 0,
          }))
        : ONE_NIGHT_ROLE_IDS.map((id) => ({
            id,
            icon: ONE_NIGHT_ICON[id],
            name: ONE_NIGHT_TEXT[lang][id].name,
            team: TEAM_TEXT[lang][oneNightDef(id).team],
            description: ONE_NIGHT_TEXT[lang][id].description,
            points: null,
            cites: ONE_NIGHT_ROLE_CITES[id],
            inGame: (oneNightDeck?.[id] ?? 0) > 0,
          }));
    // Roles in this game first, keeping catalog order otherwise.
    return [...rows.filter((r) => r.inGame), ...rows.filter((r) => !r.inGame)];
  });
</script>

{#snippet cites(list: Cite[])}
  <span class="ml-1 inline-flex flex-wrap gap-1 align-middle">
    {#each list as cite (cite)}
      <a
        href={`#src-${cite.split(':')[0]}`}
        class="rounded bg-night-950/70 px-1.5 py-0.5 font-mono text-[0.65rem] text-slate-300 no-underline ring-1 ring-night-600"
      >
        {citeLabel(cite, i18n.lang)}
      </a>
    {/each}
  </span>
{/snippet}

<div
  bind:this={dialog}
  class="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-night-950 outline-none"
  role="dialog"
  aria-modal="true"
  aria-label={t('rules')}
  tabindex="-1"
>
  <div class="mx-auto w-full max-w-2xl px-4 pb-16">
    <header
      class="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-night-950/95 px-4 py-3 backdrop-blur"
    >
      <h1 class="text-xl font-bold">📖 {t('rules')}</h1>
      <div class="flex items-center gap-2">
        <LangToggle />
        <button
          type="button"
          class="rounded-full bg-night-800 px-4 py-2 text-sm font-semibold"
          onclick={onClose}
        >
          ✕ {t('close')}
        </button>
      </div>
    </header>

    <div class="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-night-900 p-1" role="tablist">
      {#each [['classic', 'gameClassic'], ['one-night', 'gameOneNight']] as const as [kind, label] (kind)}
        <button
          type="button"
          role="tab"
          aria-selected={tab === kind}
          class="rounded-lg px-2 py-2 text-sm font-semibold {tab === kind
            ? 'bg-moon text-night-950'
            : 'text-slate-300'}"
          onclick={() => (tab = kind)}
        >
          {t(label)}
        </button>
      {/each}
    </div>

    <p class="mt-3 text-xs leading-snug text-slate-400">{t('rulesNote')}</p>

    {#each sections as section (section.title)}
      <section class="mt-5">
        <h2 class="mb-2 text-lg font-bold text-moon">{section.title}</h2>
        <ul class="space-y-2">
          {#each section.lines as line, i (i)}
            <li class="rounded-xl bg-night-900 px-4 py-3 text-sm leading-relaxed">
              {line.text}
              {@render cites(line.cite)}
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    <section class="mt-6">
      <h2 class="mb-2 text-lg font-bold text-moon">{t('rolesTitle')}</h2>
      <ul class="space-y-2">
        {#each roles as role (role.id)}
          <li
            class="rounded-xl px-4 py-3 text-sm {role.inGame
              ? 'border border-moon/40 bg-night-800'
              : 'bg-night-900'}"
          >
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="text-base font-semibold">{role.icon} {role.name}</span>
              <span class="text-xs text-slate-400">{role.team}</span>
              {#if role.points !== null}
                <span class="font-mono text-xs text-slate-500">
                  {role.points > 0 ? `+${role.points}` : role.points}
                </span>
              {/if}
              {#if role.inGame}
                <span class="rounded-full bg-moon/20 px-2 py-0.5 text-xs text-moon">
                  {t('inThisGame')}
                </span>
              {/if}
            </p>
            <p class="mt-1 leading-relaxed text-slate-200">
              {role.description}
              {@render cites(role.cites)}
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <section class="mt-6">
      <h2 class="mb-2 text-lg font-bold text-moon">{t('sourcesTitle')}</h2>
      <ul class="space-y-2">
        {#each sources as source (source.id)}
          <li
            id={`src-${source.id}`}
            class="scroll-mt-20 rounded-xl bg-night-900 px-4 py-3 text-sm"
          >
            <p>
              <span class="mr-1 rounded bg-night-800 px-1.5 py-0.5 font-mono text-xs">
                {source.id}
              </span>
              <span class="font-semibold">{source.title}</span>
            </p>
            <p class="mt-1 text-slate-400">{source.detail}</p>
            {#if source.url}
              <a
                class="mt-1 inline-block text-xs break-all text-moon underline"
                href={source.url}
                target="_blank"
                rel="noopener"
              >
                {source.url}
              </a>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="mt-3 text-xs text-slate-500">{t('rulesCopyright')}</p>
    </section>
  </div>
</div>
