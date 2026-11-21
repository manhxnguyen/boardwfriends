<script lang="ts">
  import { NAME_MAX_LENGTH, type LobbyView } from '@bwf/protocol';
  import { t } from '../i18n.svelte.ts';

  let {
    lobby,
    you,
    isHost,
    moderatorId = null,
    onRename,
    onKick,
    onReorder,
  }: {
    lobby: LobbyView;
    you: string;
    isHost: boolean;
    moderatorId?: string | null;
    onRename: (name: string) => void;
    onKick: (playerId: string) => void;
    /** Host only, before dealing: new seating order. */
    onReorder?: ((order: string[]) => void) | undefined;
  } = $props();

  function move(index: number, delta: number) {
    const order = lobby.players.map((p) => p.id);
    const target = index + delta;
    if (!onReorder || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target]!, order[index]!];
    onReorder(order);
  }

  let editing = $state(false);
  let draft = $state('');

  function startEdit(current: string) {
    draft = current;
    editing = true;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (name) onRename(name);
    editing = false;
  }

  function kick(id: string, name: string) {
    if (confirm(t('kickConfirm', { name }))) onKick(id);
  }
</script>

<section class="mt-8">
  <h2 class="mb-2 flex items-baseline justify-between text-sm font-semibold text-slate-300">
    <span>{t('players')}</span>
    <span class="font-mono">{lobby.players.length}</span>
  </h2>
  {#if onReorder}<p class="mb-2 text-xs text-slate-500">{t('seatHint')}</p>{/if}
  <ul class="divide-y divide-night-800 overflow-hidden rounded-xl bg-night-900">
    {#each lobby.players as player, index (player.id)}
      {@const isYou = player.id === you}
      <li class="flex min-h-14 items-center gap-3 px-4 py-2">
        {#if onReorder}
          <span class="flex flex-col">
            <button
              type="button"
              class="px-1 text-xs leading-none text-slate-400 disabled:opacity-20"
              aria-label={t('moveUp')}
              disabled={index === 0}
              onclick={() => move(index, -1)}
            >
              ▲
            </button>
            <button
              type="button"
              class="px-1 text-xs leading-none text-slate-400 disabled:opacity-20"
              aria-label={t('moveDown')}
              disabled={index === lobby.players.length - 1}
              onclick={() => move(index, 1)}
            >
              ▼
            </button>
          </span>
          <span class="w-4 text-center font-mono text-xs text-slate-500">{index + 1}</span>
        {/if}
        <span
          class="size-2.5 shrink-0 rounded-full {player.connected ? 'bg-ok' : 'bg-slate-600'}"
          title={player.connected ? '' : t('offline')}
        ></span>

        {#if isYou && editing}
          <form class="flex flex-1 gap-2" onsubmit={submit}>
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-950 px-3 py-2 outline-none focus:border-moon"
              bind:value={draft}
              maxlength={NAME_MAX_LENGTH}
              autofocus
            />
            <button type="submit" class="rounded-lg bg-moon px-3 font-semibold text-night-950">
              {t('save')}
            </button>
            <button type="button" class="px-2 text-slate-400" onclick={() => (editing = false)}>
              {t('cancel')}
            </button>
          </form>
        {:else}
          <span class="flex-1 truncate {player.connected ? '' : 'text-slate-500'}">
            {player.name}
            {#if isYou}<span class="ml-1 text-xs text-moon">({t('you')})</span>{/if}
            {#if !player.connected}<span class="ml-1 text-xs">· {t('offline')}</span>{/if}
          </span>
          {#if player.id === moderatorId}
            <span class="rounded-full bg-village/20 px-1.5 py-0.5 text-xs" title={t('moderator')}>
              🎙️<span class="sr-only">{t('moderator')}</span>
            </span>
          {/if}
          {#if player.isHost}
            <span class="rounded-full bg-moon/15 px-1.5 py-0.5 text-xs" title={t('host')}>
              👑<span class="sr-only">{t('host')}</span>
            </span>
          {/if}
          {#if isYou}
            <button
              type="button"
              class="px-2 py-2 text-sm text-slate-400"
              onclick={() => startEdit(player.name)}
            >
              {t('rename')}
            </button>
          {:else if isHost}
            <button
              type="button"
              class="px-2 py-2 text-sm text-wolf"
              onclick={() => kick(player.id, player.name)}
            >
              {t('kick')}
            </button>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
</section>
