<script lang="ts">
  import { i18n, setLang } from '../i18n.svelte.ts';
</script>

<div class="flex overflow-hidden rounded-full border border-night-600 text-xs font-semibold">
  {#each ['vi', 'en'] as const as lang (lang)}
    <button
      type="button"
      class="min-h-11 min-w-11 px-3 uppercase transition-colors {i18n.lang === lang
        ? 'bg-moon text-night-950'
        : 'text-slate-300'}"
      aria-pressed={i18n.lang === lang}
      onclick={() => setLang(lang)}
    >
      {lang}
    </button>
  {/each}
</div>
