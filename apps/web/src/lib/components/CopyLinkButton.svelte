<script lang="ts">
  import { copyText } from '../clipboard.ts';
  import { t } from '../i18n.svelte.ts';

  /** "Copy link" button with inline feedback; shows the link itself if copying is blocked. */
  let { url, large = false }: { url: string; large?: boolean } = $props();

  let state = $state<'idle' | 'copied' | 'failed'>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    state = (await copyText(url)) ? 'copied' : 'failed';
    clearTimeout(timer);
    timer = setTimeout(() => (state = 'idle'), 2500);
  }
</script>

<span class="inline-flex flex-col items-center gap-1">
  <button
    type="button"
    class="rounded-full font-medium {state === 'copied'
      ? 'bg-ok text-night-950'
      : 'bg-night-800'} {large ? 'min-h-12 px-5 py-2.5 text-base' : 'min-h-11 px-4 py-2 text-sm'}"
    onclick={copy}
  >
    {state === 'copied' ? `✓ ${t('copied')}` : `📋 ${t('copyLink')}`}
  </button>
  {#if state === 'failed'}
    <span class="max-w-64 text-center font-mono text-xs break-all text-slate-300 select-all">
      {url}
    </span>
  {/if}
</span>
