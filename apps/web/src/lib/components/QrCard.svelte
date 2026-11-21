<script lang="ts">
  import { t } from '../i18n.svelte.ts';
  import { qrSvg } from '../qr.ts';
  import CopyLinkButton from './CopyLinkButton.svelte';

  let { url, onShare }: { url: string; onShare: () => void } = $props();

  const svg = $derived(qrSvg(url));
</script>

<section class="mt-6 flex flex-col items-center gap-3">
  <!-- Light background on purpose: dark-on-light QR codes scan most reliably. -->
  <div class="w-48 rounded-2xl bg-white p-2" role="img" aria-label={t('scanToJoin')}>
    {@html svg}
  </div>
  <p class="text-sm text-slate-400">{t('scanToJoin')}</p>
  <div class="flex items-start gap-2">
    <CopyLinkButton {url} />
    <button
      type="button"
      class="rounded-full bg-night-800 px-4 py-2 text-sm font-medium"
      onclick={onShare}
    >
      📤 {t('share')}
    </button>
  </div>
</section>
