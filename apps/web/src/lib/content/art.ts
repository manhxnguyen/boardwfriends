/**
 * Card art picked up automatically from src/assets/art (see the README there and
 * docs/art-spec.md). Missing images fall back to the emoji placeholders.
 */
const files = import.meta.glob('../../assets/art/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byName = new Map(
  Object.entries(files).map(([path, url]) => [
    path
      .split('/')
      .pop()!
      .replace(/\.\w+$/, ''),
    url,
  ]),
);

/** URL of `role-<id>` art, if an image was added. */
export function roleArt(id: string): string | undefined {
  return byName.get(`role-${id}`);
}

export function cardBackArt(): string | undefined {
  return byName.get('card-back');
}

/** Narrator-screen backgrounds: bg-night, bg-day, win-village, win-wolves. */
export function sceneArt(
  name: 'bg-night' | 'bg-day' | 'win-village' | 'win-wolves',
): string | undefined {
  return byName.get(name);
}
