<script lang="ts">
  import { nightScript, roleDef, type ScriptStep } from '@bwf/engine';
  import type { Assignment, LobbyView, RoleCounts } from '@bwf/protocol';
  import { FENCE_COLOR, ROLE_ICON, ROLE_TEXT } from '../content/roles.ts';
  import { SCRIPT } from '../content/script.ts';
  import { i18n, t } from '../i18n.svelte.ts';
  import { load, save } from '../storage.ts';

  /** Screen for the human moderator: the whole table plus the narration script. */
  let {
    code,
    round,
    lobby,
    roles,
    assignments,
    firstNightKill = false,
  }: {
    code: string;
    round: number;
    lobby: LobbyView;
    roles: RoleCounts;
    assignments: Assignment[];
    firstNightKill?: boolean;
  } = $props();

  type Tab = 'table' | 'first' | 'later' | 'day';
  let tab = $state<Tab>('first');
  let hidden = $state(false);

  // Elimination marks are a private notepad, kept per room and round on this device only.
  const deadKey = $derived(`bwf.dead.${code}.${round}`);
  let dead = $state<string[]>([]);
  $effect(() => {
    try {
      dead = JSON.parse(load(deadKey) ?? '[]') as string[];
    } catch {
      dead = [];
    }
  });

  function toggleDead(playerId: string) {
    dead = dead.includes(playerId) ? dead.filter((id) => id !== playerId) : [...dead, playerId];
    save(deadKey, JSON.stringify(dead));
  }

  const nameOf = (id: string) => lobby.players.find((p) => p.id === id)?.name ?? '?';
  const script = $derived(SCRIPT[i18n.lang]);
  const firstNight = $derived(nightScript(roles, 'first', firstNightKill));
  const laterNights = $derived(nightScript(roles, 'later'));

  const tabs: { id: Tab; label: () => string }[] = [
    { id: 'table', label: () => t('tabTable') },
    { id: 'first', label: () => t('tabFirstNight') },
    { id: 'later', label: () => t('tabNights') },
    { id: 'day', label: () => t('tabDay') },
  ];
</script>

{#snippet night(steps: ScriptStep[], first: boolean)}
  <ol class="flex flex-col gap-3">
    <li class="rounded-xl bg-night-900 p-4 text-lg">🌙 {script.sleep}</li>
    {#each steps as step, i (step.call)}
      {@const call = script.calls[step.call]}
      <li class="rounded-xl bg-night-900 p-4">
        <p class="text-xs font-semibold text-slate-400">{i + 1}.</p>
        <p class="mt-1 text-lg leading-snug">
          <span class="text-xs font-semibold tracking-wider text-moon uppercase">
            {t('sayAloud')}
          </span><br />
          {call.say}
        </p>
        <p class="mt-2 text-sm text-slate-300">
          <span class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {t('doThis')}:
          </span>
          {call.do}
        </p>
        {#if step.note}
          <p class="mt-2 rounded-lg bg-wolf/20 px-3 py-2 text-sm">⚠️ {script.notes[step.note]}</p>
        {/if}
      </li>
    {/each}
    <li class="rounded-xl bg-night-900 p-4 text-lg">
      ☀️ {first && !firstNightKill ? script.wakeFirst : script.wakeLater}
    </li>
  </ol>
{/snippet}

<section class="mt-4">
  <div class="sticky top-0 z-10 -mx-4 bg-night-950/95 px-4 py-2 backdrop-blur">
    <div class="grid grid-cols-4 gap-1 rounded-xl bg-night-900 p-1" role="tablist">
      {#each tabs as item (item.id)}
        <button
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          class="rounded-lg px-1 py-2 text-xs leading-tight font-semibold {tab === item.id
            ? 'bg-moon text-night-950'
            : 'text-slate-300'}"
          onclick={() => (tab = item.id)}
        >
          {item.label()}
        </button>
      {/each}
    </div>
  </div>

  <div class="mt-3">
    {#if tab === 'table'}
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs text-slate-400">{t('markDeadHint')}</p>
        <button
          type="button"
          class="shrink-0 rounded-full bg-night-800 px-3 py-1.5 text-xs"
          onclick={() => (hidden = !hidden)}
        >
          {hidden ? t('showRoles') : t('hideRoles')}
        </button>
      </div>
      <ul class="divide-y divide-night-800 overflow-hidden rounded-xl bg-night-900">
        {#each assignments as a (a.playerId)}
          {@const isDead = dead.includes(a.playerId)}
          <li>
            <button
              type="button"
              class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left {isDead
                ? 'opacity-40'
                : ''}"
              onclick={() => toggleDead(a.playerId)}
            >
              <span
                class="h-8 w-1.5 shrink-0 rounded-full"
                style:background={hidden ? '#35517a' : FENCE_COLOR[roleDef(a.role).fence]}
              ></span>
              <span class="flex-1 truncate {isDead ? 'line-through' : ''}">
                {nameOf(a.playerId)}
              </span>
              <span class="flex items-center gap-1.5 text-sm {hidden ? 'blur-sm' : ''}">
                <span aria-hidden="true">{ROLE_ICON[a.role]}</span>
                {ROLE_TEXT[i18n.lang][a.role].name}
              </span>
              <span class="w-5 text-center text-sm" title="seen">{a.seen ? '👁️' : '·'}</span>
              {#if isDead}<span class="text-xs text-wolf">{t('eliminated')}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else if tab === 'first'}
      {@render night(firstNight, true)}
    {:else if tab === 'later'}
      {@render night(laterNights, false)}
    {:else}
      <ul class="flex flex-col gap-2">
        {#each script.day as line, i (i)}
          <li class="rounded-xl bg-night-900 p-4 leading-snug">{line}</li>
        {/each}
      </ul>
      <h3 class="mt-6 mb-2 text-sm font-semibold text-slate-300">{t('winConditions')}</h3>
      <ul class="flex flex-col gap-2">
        {#each script.end as line, i (i)}
          <li class="rounded-xl bg-night-900 p-4 leading-snug">🏁 {line}</li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
