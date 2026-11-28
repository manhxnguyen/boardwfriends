<script lang="ts">
  import { CHAT_MAX_LENGTH, type ChatEntry } from '@bwf/protocol';
  import type { RoomConnection } from '../connection.svelte.ts';
  import { t } from '../i18n.svelte.ts';

  /**
   * Chat of eliminated players. The server only sends it to the eliminated and the human
   * moderator; living players and the narrator display never receive it.
   */
  let {
    conn,
    messages,
    names,
    moderator = false,
  }: {
    conn: RoomConnection;
    messages: ChatEntry[];
    names: (id: string) => string;
    moderator?: boolean;
  } = $props();

  let text = $state('');
  let list: HTMLOListElement | undefined = $state();

  // Keep the newest message in view.
  $effect(() => {
    void messages.length;
    list?.scrollTo({ top: list.scrollHeight });
  });

  function send(event: SubmitEvent) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    conn.send({ t: 'chat', text: clean });
    text = '';
  }

  const time = (at: number) =>
    new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<section class="rounded-xl border border-night-700 bg-night-900 p-3">
  <h2 class="font-semibold">💀 {t('deadChatTitle')}</h2>
  <p class="text-xs text-slate-400">
    {moderator ? t('deadChatModeratorHint') : t('deadChatHint')}
  </p>
  <ol
    bind:this={list}
    class="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-lg bg-night-950/60 p-2 text-sm"
    aria-live="polite"
  >
    {#each messages as m (m.seq)}
      <li class="break-words">
        <span class="font-semibold {m.from === conn.you ? 'text-moon' : 'text-slate-200'}">
          {m.from === conn.you ? t('you') : names(m.from)}:
        </span>
        {m.text}
        <span class="text-xs text-slate-500">{time(m.at)}</span>
      </li>
    {:else}
      <li class="text-slate-500">{t('deadChatEmpty')}</li>
    {/each}
  </ol>
  <form class="mt-2 flex gap-2" onsubmit={send}>
    <input
      class="min-h-11 min-w-0 flex-1 rounded-lg border border-night-600 bg-night-950 px-3"
      maxlength={CHAT_MAX_LENGTH}
      placeholder={t('deadChatPlaceholder')}
      bind:value={text}
      enterkeyhint="send"
    />
    <button
      type="submit"
      class="min-h-11 rounded-lg bg-moon px-4 font-semibold text-night-950 disabled:opacity-40"
      disabled={!text.trim()}
    >
      {t('deadChatSend')}
    </button>
  </form>
</section>
