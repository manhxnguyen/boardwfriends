import type { GameView } from '@bwf/protocol';
import { describe, expect, it } from 'vitest';
import { themeFor } from '../src/lib/theme.ts';

const playing = (kind: string) =>
  ({ phase: 'playing', round: 1, setup: null, play: { phase: { kind } } }) as unknown as GameView;

describe('themeFor', () => {
  it('is night outside a running game', () => {
    expect(themeFor(null)).toBe('night');
    expect(themeFor({ phase: 'setup', setup: null })).toBe('night');
  });

  it.each([
    ['reveal', 'night'],
    ['night', 'night'],
    ['dawn', 'day'],
    ['day', 'day'],
    ['hunter', 'day'],
    ['dusk', 'day'],
    ['vote', 'day'],
    ['over', 'day'],
  ])('%s → %s', (kind, theme) => {
    expect(themeFor(playing(kind))).toBe(theme);
  });
});
