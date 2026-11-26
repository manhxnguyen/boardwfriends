import type { GameView } from '@bwf/protocol';

export type Theme = 'night' | 'day';

/** Browser UI colour (status bar) per theme; matches --color-night-950 in app.css. */
const META_COLOR: Record<Theme, string> = { night: '#070d17', day: '#123553' };
const TRANSITION_MS = 1600;

let current: Theme | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Switches the whole screen between the night and day palettes by flipping one attribute on
 * <html>; every colour is a CSS variable, so nothing else needs to change. The change is
 * animated only while switching, so normal taps stay instant.
 */
export function setTheme(theme: Theme): void {
  if (theme === current) return;
  const root = document.documentElement;
  const first = current === null;
  current = theme;
  if (!first) {
    root.classList.add('theme-changing');
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.remove('theme-changing'), TRANSITION_MS);
  }
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
}

/** Day from dawn until the village falls asleep; night otherwise (lobby and dealing included). */
export function themeFor(game: GameView | null | undefined): Theme {
  if (!game || game.phase !== 'playing') return 'night';
  switch (game.play.phase.kind) {
    case 'dawn':
    case 'day':
    case 'dusk':
    case 'hunter':
    case 'vote':
    case 'over':
      return 'day';
    default:
      return 'night';
  }
}
