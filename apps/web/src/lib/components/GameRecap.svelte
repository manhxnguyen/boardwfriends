<script lang="ts">
  import type { ClassicRoleId, TimelineEvent } from '@bwf/protocol';
  import { ROLE_TEXT } from '../content/roles.ts';
  import { i18n, t, type MessageKey } from '../i18n.svelte.ts';

  /**
   * "Diễn biến": the story of a finished Classic game, night by night and day by day. Shown only
   * once the game is over, when every card is public anyway.
   */
  let {
    timeline,
    roles,
    names,
    big = false,
  }: {
    timeline: TimelineEvent[];
    roles: Record<string, ClassicRoleId>;
    names: (id: string) => string;
    big?: boolean;
  } = $props();

  /** "An (Sói)". */
  const who = (id: string) => {
    const role = roles[id];
    return role ? `${names(id)} (${ROLE_TEXT[i18n.lang][role].name})` : names(id);
  };
  const list = (ids: string[]) => ids.map(names).join(', ') || '—';

  const causeKey: Record<string, MessageKey> = {
    wolves: 'causeWolves',
    night: 'causeNight',
    witch: 'causeWitch',
    vote: 'causeVote',
    hunter: 'causeHunter',
  };

  interface Section {
    title: string;
    night: boolean;
    lines: { icon: string; text: string; strong?: boolean }[];
  }

  const sections = $derived.by(() => {
    const out: Section[] = [];
    let current: Section | null = null;
    const add = (icon: string, text: string, strong = false) =>
      current?.lines.push({ icon, text, strong });
    for (const e of timeline) {
      switch (e.k) {
        case 'night':
          current = { title: t('phaseNight', { n: String(e.n) }), night: true, lines: [] };
          out.push(current);
          break;
        case 'day':
          current = { title: t('phaseDay', { n: String(e.n) }), night: false, lines: [] };
          out.push(current);
          break;
        case 'wolves':
          if (e.meet) add('🐺', t('recapWolvesMeet'));
          else if (!e.targets.length) add('🐺', t('recapWolvesNone'));
          else add('🐺', t('recapWolves', { targets: e.targets.map(who).join(', ') }));
          break;
        case 'protect':
          add('🛡️', t('recapProtect', { name: who(e.target) }));
          break;
        case 'witch':
          add(
            e.action === 'save' ? '🧪' : '☠️',
            t(e.action === 'save' ? 'recapWitchSave' : 'recapWitchKill', { name: who(e.target) }),
          );
          break;
        case 'seer':
          add('🔮', t(e.isWolf ? 'recapSeerWolf' : 'recapSeerNotWolf', { name: who(e.target) }));
          break;
        case 'sorceress':
          add(
            '🌀',
            t(e.isSeer ? 'recapSorceressSeer' : 'recapSorceressNot', { name: who(e.target) }),
          );
          break;
        case 'silence':
          add('🤐', t('recapSilence', { name: who(e.target) }));
          break;
        case 'saved':
          add(
            '✨',
            t(e.by === 'bodyguard' ? 'recapSavedBodyguard' : 'recapSavedWitch', {
              name: who(e.target),
            }),
          );
          break;
        case 'death':
          add('💀', `${who(e.playerId)} ${t(causeKey[e.cause]!)}`, true);
          break;
        case 'vote':
          add(
            '🗳️',
            t(e.eliminated ? 'recapVoteOut' : 'recapVoteKept', {
              name: who(e.nominee),
              eliminate: list(e.eliminate),
              keep: list(e.keep),
            }),
          );
          break;
        case 'shot':
          add(
            '🎯',
            e.target
              ? t('recapShot', { hunter: names(e.hunter), name: who(e.target) })
              : t('recapShotAir', { hunter: names(e.hunter) }),
          );
          break;
      }
    }
    return out.filter((s) => s.lines.length);
  });
</script>

{#if sections.length}
  <section class="rounded-xl bg-night-900/90 p-4 {big ? 'text-xl md:text-2xl' : 'text-sm'}">
    <h3 class="mb-3 font-semibold text-slate-300">📜 {t('recapTitle')}</h3>
    <ol class="space-y-3">
      {#each sections as section, i (i)}
        <li>
          <p class="font-semibold {section.night ? 'text-moon' : 'text-village'}">
            {section.night ? '🌙' : '☀️'}
            {section.title}
          </p>
          <ul class="mt-1 space-y-0.5 border-l border-night-700 pl-3">
            {#each section.lines as line, j (j)}
              <li class={line.strong ? 'font-semibold text-wolf' : 'text-slate-200'}>
                {line.icon}
                {line.text}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </section>
{/if}
