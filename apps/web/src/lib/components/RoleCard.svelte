<script lang="ts">
  import { roleDef } from '@bwf/engine';
  import type { ClassicRoleId } from '@bwf/protocol';
  import { FENCE_COLOR, ROLE_ART, ROLE_ICON, ROLE_TEXT, TEAM_TEXT } from '../content/roles.ts';
  import { i18n } from '../i18n.svelte.ts';

  /** Card face, 5:7 like a poker card. Uses real art when available, otherwise a placeholder. */
  let { role }: { role: ClassicRoleId } = $props();

  const def = $derived(roleDef(role));
  const text = $derived(ROLE_TEXT[i18n.lang][role]);
  const art = $derived(ROLE_ART[role]);
  const color = $derived(FENCE_COLOR[def.fence]);
</script>

<div
  class="relative flex aspect-[5/7] w-full flex-col overflow-hidden rounded-2xl border-4 text-white shadow-2xl select-none"
  style:border-color={color}
  style:background={`radial-gradient(circle at 50% 35%, ${color}cc, #070d17 75%)`}
>
  {#if art}
    <img src={art} alt="" class="absolute inset-0 size-full object-cover" draggable="false" />
  {/if}

  <div class="relative z-10 px-4 pt-4 text-center">
    <p class="text-xs font-semibold tracking-widest uppercase opacity-80">
      {TEAM_TEXT[i18n.lang][def.team]}
    </p>
    <h3 class="mt-1 text-3xl font-bold drop-shadow">{text.name}</h3>
  </div>

  {#if !art}
    <div
      class="relative z-10 flex flex-1 items-center justify-center text-[7rem] leading-none"
      aria-hidden="true"
    >
      {ROLE_ICON[role]}
    </div>
  {:else}
    <div class="flex-1"></div>
  {/if}

  <div class="relative z-10 bg-gradient-to-t from-black/90 to-black/0 px-4 pt-8 pb-4">
    <p class="text-sm leading-snug">{text.description}</p>
    <p class="mt-2 text-right font-mono text-xs opacity-70">
      {def.points > 0 ? `+${def.points}` : def.points}
    </p>
  </div>
</div>
