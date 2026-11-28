<script lang="ts">
  import type { OneNightResult, OneNightRoleId } from '@bwf/protocol';
  import { ONE_NIGHT_ICON, ONE_NIGHT_TEXT } from '../content/one-night-roles.ts';
  import { i18n, t } from '../i18n.svelte.ts';

  /** "Diễn biến" of a One Night game: the night step by step, then the votes. */
  let {
    result,
    names,
    big = false,
  }: { result: OneNightResult; names: (id: string) => string; big?: boolean } = $props();

  const role = (r: OneNightRoleId) => ONE_NIGHT_TEXT[i18n.lang][r].name;
  /** "An (Kẻ trộm)": the card the player was dealt, i.e. the role they woke up as. */
  const who = (id: string) => `${names(id)} (${role(result.original[id]!)})`;
  const card = (i: number) => t('centerCard', { n: String(i + 1) });

  const lines = $derived.by(() => {
    const out: { icon: string; text: string }[] = [];
    for (const e of result.story ?? []) {
      switch (e.k) {
        case 'doppel':
          out.push({
            icon: ONE_NIGHT_ICON.doppelganger,
            text: t('onRecapDoppel', {
              name: who(e.actor),
              target: who(e.target),
              role: role(e.role),
            }),
          });
          break;
        case 'wolves':
          out.push({
            icon: ONE_NIGHT_ICON.werewolf,
            text:
              e.ids.length === 1
                ? t('onRecapLoneWolf', { name: who(e.ids[0]!) })
                : t('onRecapWolves', { names: e.ids.map(names).join(', ') }),
          });
          break;
        case 'lone-wolf':
          out.push({
            icon: '👀',
            text: t('onRecapPeek', {
              name: names(e.actor),
              card: card(e.index),
              role: role(e.role),
            }),
          });
          break;
        case 'minion':
          out.push({
            icon: ONE_NIGHT_ICON.minion,
            text: e.wolves.length
              ? t('onRecapMinion', { name: who(e.actor), wolves: e.wolves.map(names).join(', ') })
              : t('onRecapMinionNone', { name: who(e.actor) }),
          });
          break;
        case 'masons':
          out.push({
            icon: ONE_NIGHT_ICON.mason,
            text:
              e.ids.length === 1
                ? t('onRecapMasonAlone', { name: who(e.ids[0]!) })
                : t('onRecapMasons', { names: e.ids.map(names).join(', ') }),
          });
          break;
        case 'seer':
          out.push({
            icon: ONE_NIGHT_ICON.seer,
            text: t('onRecapSeer', {
              name: who(e.actor),
              target: names(e.target),
              role: role(e.role),
            }),
          });
          break;
        case 'seer-center':
          out.push({
            icon: ONE_NIGHT_ICON.seer,
            text: t('onRecapSeerCenter', {
              name: who(e.actor),
              cards: e.cards.map((c) => `${card(c.index)}: ${role(c.role)}`).join(', '),
            }),
          });
          break;
        case 'robber':
          out.push({
            icon: ONE_NIGHT_ICON.robber,
            text: t('onRecapRobber', {
              name: who(e.actor),
              target: names(e.target),
              role: role(e.took),
            }),
          });
          break;
        case 'troublemaker':
          out.push({
            icon: ONE_NIGHT_ICON.troublemaker,
            text: t('onRecapTroublemaker', { name: who(e.actor), a: names(e.a), b: names(e.b) }),
          });
          break;
        case 'drunk':
          out.push({
            icon: ONE_NIGHT_ICON.drunk,
            text: t(e.auto ? 'onRecapDrunkAuto' : 'onRecapDrunk', {
              name: who(e.actor),
              card: card(e.index),
            }),
          });
          break;
        case 'insomniac':
          out.push({
            icon: ONE_NIGHT_ICON.insomniac,
            text: t('onRecapInsomniac', { name: who(e.actor), role: role(e.role) }),
          });
          break;
        case 'idle':
          out.push({ icon: '💤', text: t('onRecapIdle', { name: who(e.actor) }) });
          break;
      }
    }
    return out;
  });

  const votes = $derived(Object.entries(result.votes));
</script>

{#if lines.length || votes.length}
  <section class="rounded-xl bg-night-900/90 p-4 {big ? 'text-xl md:text-2xl' : 'text-sm'}">
    <h3 class="mb-3 font-semibold text-slate-300">📜 {t('recapTitle')}</h3>
    {#if lines.length}
      <p class="font-semibold text-moon">🌙 {t('onRecapNight')}</p>
      <ul class="mt-1 space-y-0.5 border-l border-night-700 pl-3">
        {#each lines as line, i (i)}
          <li class="text-slate-200">{line.icon} {line.text}</li>
        {/each}
      </ul>
    {/if}
    {#if votes.length}
      <p class="mt-3 font-semibold text-village">🗳️ {t('onRecapVotes')}</p>
      <ul class="mt-1 space-y-0.5 border-l border-night-700 pl-3">
        {#each votes as [voter, target] (voter)}
          <li class="text-slate-200">{names(voter)} → {names(target)}</li>
        {/each}
      </ul>
    {/if}
    {#if result.deaths.length}
      <p class="mt-3 font-semibold text-wolf">
        💀 {result.deaths.map((id) => `${names(id)} (${role(result.final[id]!)})`).join(', ')}
      </p>
    {/if}
  </section>
{/if}
