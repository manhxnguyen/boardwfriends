<script lang="ts">
  import {
    DAY_MINUTES_MAX,
    DAY_MINUTES_MIN,
    DEFENSE_MINUTES_DEFAULT,
    DEFENSE_MINUTES_MAX,
    DEFENSE_MINUTES_MIN,
    type SetupView,
  } from '@bwf/protocol';
  import { VOICE_COMMANDS } from '../features.ts';
  import { t, type MessageKey } from '../i18n.svelte.ts';

  /** Host-only game settings: which game, who moderates, reveal rule, day length, voice. */
  let { setup, onChange }: { setup: SetupView; onChange: (setup: SetupView) => void } = $props();

  const set = (patch: Partial<SetupView>) => onChange({ ...setup, ...patch });

  function segment<T extends string>(
    options: { value: T; label: MessageKey; hint?: MessageKey }[],
    current: T,
    apply: (value: T) => void,
  ) {
    return { options, current, apply };
  }

  const games = $derived(
    segment(
      [
        { value: 'classic', label: 'gameClassic', hint: 'gameClassicHint' },
        { value: 'one-night', label: 'gameOneNight', hint: 'gameOneNightHint' },
      ],
      setup.game,
      (game) => set({ game }),
    ),
  );
  const modes = $derived(
    segment(
      [
        { value: 'auto', label: 'modeAuto' },
        { value: 'manual', label: 'modeManual' },
      ],
      setup.mode,
      (mode) => set({ mode }),
    ),
  );
  const reveals = $derived(
    segment(
      [
        { value: 'role', label: 'revealRole' },
        { value: 'team', label: 'revealTeam' },
        { value: 'none', label: 'revealNone' },
      ],
      setup.reveal,
      (reveal) => set({ reveal }),
    ),
  );
</script>

{#snippet choices<T extends string>(group: {
  options: { value: T; label: MessageKey; hint?: MessageKey }[];
  current: T;
  apply: (v: T) => void;
})}
  <div
    class="grid gap-2"
    style:grid-template-columns={`repeat(${group.options.length}, minmax(0, 1fr))`}
  >
    {#each group.options as option (option.value)}
      <button
        type="button"
        class="min-h-11 rounded-xl px-2 py-2.5 text-sm font-semibold {group.current === option.value
          ? 'bg-moon text-night-950'
          : 'bg-night-800'}"
        aria-pressed={group.current === option.value}
        onclick={() => group.apply(option.value)}
      >
        {t(option.label)}
        {#if option.hint}
          <span class="mt-0.5 block text-[0.7rem] font-normal opacity-75">{t(option.hint)}</span>
        {/if}
      </button>
    {/each}
  </div>
{/snippet}

<section class="mt-6 flex flex-col gap-4 rounded-xl bg-night-900 p-4">
  <div>
    <p class="mb-2 text-sm font-semibold text-slate-300">{t('gameKind')}</p>
    {@render choices(games)}
  </div>

  {#if setup.game === 'classic'}
    <div>
      <p class="mb-2 text-sm font-semibold text-slate-300">{t('modeLabel')}</p>
      {@render choices(modes)}
    </div>
    {#if setup.mode === 'auto'}
      <div>
        <p class="mb-2 text-sm font-semibold text-slate-300">{t('revealLabel')}</p>
        {@render choices(reveals)}
      </div>
    {/if}
  {/if}

  {#if setup.game === 'classic'}
    <label class="flex items-start justify-between gap-3">
      <span>
        <span class="block text-sm font-semibold">{t('firstNightKillLabel')}</span>
        <span class="block text-xs text-slate-400">{t('firstNightKillHint')}</span>
      </span>
      <input
        type="checkbox"
        class="mt-1 size-6 shrink-0 accent-moon"
        checked={setup.firstNightKill}
        onchange={(e) => set({ firstNightKill: e.currentTarget.checked })}
      />
    </label>
    {#if setup.mode === 'auto'}
      <label class="flex items-start justify-between gap-3">
        <span>
          <span class="block text-sm font-semibold">{t('wolfMajorityLabel')}</span>
          <span class="block text-xs text-slate-400">{t('wolfMajorityHint')}</span>
        </span>
        <input
          type="checkbox"
          class="mt-1 size-6 shrink-0 accent-moon"
          checked={setup.wolfMajority}
          onchange={(e) => set({ wolfMajority: e.currentTarget.checked })}
        />
      </label>
    {/if}
  {/if}

  {#if setup.game === 'one-night' || setup.mode === 'auto'}
    <label class="block">
      <span class="flex justify-between text-sm font-semibold text-slate-300">
        {t('dayMinutes')}
        <span class="font-mono text-moon">
          {t('minutesShort', { n: String(setup.dayMinutes) })}
        </span>
      </span>
      <input
        type="range"
        class="mt-2 w-full accent-moon"
        min={DAY_MINUTES_MIN}
        max={DAY_MINUTES_MAX}
        value={setup.dayMinutes}
        onchange={(e) => set({ dayMinutes: Number(e.currentTarget.value) })}
      />
    </label>

    {#if setup.game === 'classic' && setup.mode === 'auto'}
      {@const defense = setup.defenseMinutes ?? DEFENSE_MINUTES_DEFAULT}
      <!-- Same kind of control as the day length above. -->
      <label class="block">
        <span class="flex justify-between text-sm font-semibold text-slate-300">
          {t('defenseMinutes')}
          <span class="font-mono text-moon">
            {t('minutesShort', { n: String(defense) })}
          </span>
        </span>
        <input
          type="range"
          class="mt-2 w-full accent-moon"
          min={DEFENSE_MINUTES_MIN}
          max={DEFENSE_MINUTES_MAX}
          value={defense}
          onchange={(e) => set({ defenseMinutes: Number(e.currentTarget.value) })}
        />
        <span class="mt-1 block text-xs text-slate-400">{t('defenseMinutesHint')}</span>
      </label>
    {/if}

    {#if VOICE_COMMANDS}
      <label class="flex items-start justify-between gap-3">
        <span>
          <span class="block text-sm font-semibold">{t('voiceLabel')}</span>
          <span class="block text-xs text-slate-400">{t('voiceHint')}</span>
        </span>
        <input
          type="checkbox"
          class="mt-1 size-6 shrink-0 accent-moon"
          checked={setup.voice}
          onchange={(e) => set({ voice: e.currentTarget.checked })}
        />
      </label>
    {/if}
  {/if}
</section>
