<script lang="ts">
  import { t } from '../i18n.svelte.ts';

  /** Link the host opens on the MacBook to show the narrator screen. */
  let { url, code, displays }: { url: string; code: string; displays: number } = $props();

  let copied = $state(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard blocked; the link is visible anyway.
    }
  }
</script>

<section class="mt-6 rounded-xl border border-night-700 bg-night-900 p-4">
  <h2 class="flex items-center justify-between text-sm font-semibold">
    <span>🖥️ {t('narrator')}</span>
    <span class="text-xs {displays ? 'text-ok' : 'text-slate-500'}">
      {t('narratorConnected', { n: String(displays) })}
    </span>
  </h2>
  <p class="mt-1 text-xs text-slate-400">{t('narratorHint', { code })}</p>
  <p class="mt-2 font-mono text-sm break-all text-moon select-all">{url}</p>
  <div class="mt-2 flex gap-2">
    <button type="button" class="rounded-full bg-night-800 px-3 py-1.5 text-xs" onclick={copy}>
      {copied ? '✓' : '📋'}
      {t('copyLink')}
    </button>
    <a
      class="rounded-full bg-night-800 px-3 py-1.5 text-xs"
      href={url}
      target="_blank"
      rel="noopener"
    >
      ↗ {t('openNarrator')}
    </a>
  </div>
</section>
