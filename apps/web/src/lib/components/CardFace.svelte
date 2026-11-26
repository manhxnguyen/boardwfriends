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
  class="@container relative flex aspect-[5/7] w-full flex-col overflow-hidden rounded-2xl border-4 text-white shadow-2xl select-none"
  style:border-color={color}
  style:background={`radial-gradient(circle at 50% 35%, ${color}cc, #070d17 75%)`}
>
  {#if art}
    <img src={art} alt="" class="absolute inset-0 size-full object-cover" draggable="false" />
  {/if}

  <div
    class="relative z-10 px-2 pt-2 pb-4 text-center @[12rem]:px-4 @[12rem]:pt-4 @[12rem]:pb-6 {art
      ? 'bg-gradient-to-b from-black/70 to-black/0'
      : ''}"
  >
    <p class="text-[0.6rem] font-semibold tracking-widest uppercase opacity-80 @[12rem]:text-xs">
      {team}
    </p>
    <h3 class="mt-1 text-lg leading-tight font-bold drop-shadow @[12rem]:text-3xl">{title}</h3>
  </div>

  {#if art}
    <div class="flex-1"></div>
  {:else}
    <div
      class="relative z-10 flex flex-1 items-center justify-center text-[3.5rem] leading-none @[12rem]:text-[7rem]"
      aria-hidden="true"
    >
      {icon}
    </div>
  {/if}

  <div
    class="relative z-10 bg-gradient-to-t from-black/90 to-black/0 px-2 pt-6 pb-2 @[12rem]:px-4 @[12rem]:pt-8 @[12rem]:pb-4"
  >
    <p
      class="hidden text-[0.65rem] leading-snug @[8.5rem]:line-clamp-6 @[12rem]:line-clamp-none @[12rem]:text-sm"
    >
      {description}
    </p>
    {#if footer}<p class="mt-2 text-right font-mono text-xs opacity-70">{footer}</p>{/if}
  </div>
</div>
