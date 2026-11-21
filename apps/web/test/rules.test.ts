import { describe, expect, it } from 'vitest';
import {
  CLASSIC_ROLE_CITES,
  ONE_NIGHT_ROLE_CITES,
  RULES,
  SOURCES,
  citeLabel,
} from '../src/lib/content/rules.ts';

const langs = ['vi', 'en'] as const;
const games = ['classic', 'one-night'] as const;

describe('rules reference', () => {
  it.each(games)(
    '%s: Vietnamese and English have the same sections, lines and citations',
    (game) => {
      const shape = (lang: 'vi' | 'en') => RULES[lang][game].map((s) => s.lines.map((l) => l.cite));
      expect(shape('vi')).toEqual(shape('en'));
      expect(SOURCES.vi[game].map((s) => s.id)).toEqual(SOURCES.en[game].map((s) => s.id));
    },
  );

  it.each(games)('%s: every line cites at least one listed source', (game) => {
    const ids = new Set(SOURCES.vi[game].map((s) => s.id));
    for (const lang of langs) {
      for (const section of RULES[lang][game]) {
        for (const line of section.lines) {
          expect(line.cite.length, line.text).toBeGreaterThan(0);
          for (const cite of line.cite)
            expect(ids, `${cite} in "${line.text}"`).toContain(cite.split(':')[0]);
        }
      }
    }
  });

  it('every role cites a source of its own game', () => {
    const classic = new Set(SOURCES.vi.classic.map((s) => s.id));
    const oneNight = new Set(SOURCES.vi['one-night'].map((s) => s.id));
    for (const cites of Object.values(CLASSIC_ROLE_CITES)) {
      for (const c of cites) expect(classic).toContain(c.split(':')[0]);
    }
    for (const cites of Object.values(ONE_NIGHT_ROLE_CITES)) {
      for (const c of cites) expect(oneNight).toContain(c.split(':')[0]);
    }
  });

  it('formats page citations per language', () => {
    expect(citeLabel('GS:3', 'vi')).toBe('GS tr.3');
    expect(citeLabel('GS:3', 'en')).toBe('GS p.3');
    expect(citeLabel('AD', 'vi')).toBe('AD');
  });
});
