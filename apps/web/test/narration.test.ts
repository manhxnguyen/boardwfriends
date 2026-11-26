import { describe, expect, it } from 'vitest';
import { cueSpeech, cueText, plainText } from '../src/lib/content/narration.ts';

const names = (id: string) => ({ a: 'An', b: 'Bình' })[id] ?? '?';

describe('narration emotions', () => {
  it('sighs when someone dies, captions stay clean', () => {
    const cue = { k: 'dawn', deaths: [{ playerId: 'a' }] } as never;
    expect(cueSpeech(cue, 'vi', names, false)).toBe('[thở dài] Trời sáng. Đêm qua, An đã bị loại.');
    expect(cueText(cue, 'vi', names, false)).toBe('Trời sáng. Đêm qua, An đã bị loại.');
  });
  it('no sigh when nobody died', () => {
    const cue = { k: 'dawn', deaths: [] } as never;
    expect(cueSpeech(cue, 'vi', names, false)).toBe('Trời sáng. Đêm qua không ai bị loại.');
  });
  it('laughs at the end and clears the throat at the start', () => {
    expect(cueSpeech({ k: 'game-over', winners: ['wolf'] } as never, 'vi', names, false)).toMatch(
      /^\[cười\] /,
    );
    expect(cueSpeech({ k: 'game-start' } as never, 'vi', names, false)).toMatch(/^\[hắng giọng\] /);
  });
  it('plainText removes every tag', () => {
    expect(plainText('[hắng giọng] Bỏ phiếu! [cười]')).toBe('Bỏ phiếu!');
  });
});
