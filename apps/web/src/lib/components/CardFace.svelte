<script lang="ts">
  /** Generic card face, 5:7 like a poker card. Real art when available, emoji placeholder otherwise. */
  let {
    title,
    team,
    description,
    icon,
    color,
    art,
    footer = '',
  }: {
    title: string;
    team: string;
    description: string;
    icon: string;
    color: string;
    art: string | undefined;
    footer?: string;
  } = $props();
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
    <p class="text-xs font-semibold tracking-widest uppercase opacity-80">{team}</p>
    <h3 class="mt-1 text-3xl font-bold drop-shadow">{title}</h3>
  </div>

  {#if art}
    <div class="flex-1"></div>
  {:else}
    <div
      class="relative z-10 flex flex-1 items-center justify-center text-[7rem] leading-none"
      aria-hidden="true"
    >
      {icon}
    </div>
  {/if}

  <div class="relative z-10 bg-gradient-to-t from-black/90 to-black/0 px-4 pt-8 pb-4">
    <p class="text-sm leading-snug">{description}</p>
    {#if footer}<p class="mt-2 text-right font-mono text-xs opacity-70">{footer}</p>{/if}
  </div>
</div>
