/**
 * Turns a recognised sentence into a narrator command. Pure and language-tolerant: Vietnamese
 * and English phrasings are both accepted, with or without diacritics.
 *
 * Speech recognition cannot tell who is speaking, so voice nominations and seconds are anonymous
 * (the engine accepts `by: null` from the narrator display only).
 */

export type VoiceCommand =
  | { cmd: 'nominate'; target: string }
  | { cmd: 'second' }
  | { cmd: 'start-vote' }
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  | { cmd: 'end-day' }
  | { cmd: 'repeat' };

export interface NamedPlayer {
  id: string;
  name: string;
}

/** Lowercase, strip diacritics (đ → d), collapse punctuation and spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const PATTERNS: { cmd: Exclude<VoiceCommand['cmd'], 'nominate'>; re: RegExp }[] = [
  // Common chatter words ("đồng ý", a bare "vote") are left out on purpose to avoid false triggers.
  { cmd: 'second', re: /\b(ung ho|second|i second)\b/ },
  { cmd: 'start-vote', re: /\b(bo phieu|bieu quyet|start the vote|vote now|lets vote)\b/ },
  { cmd: 'pause', re: /\b(tam dung|dung lai|pause|hold on)\b/ },
  { cmd: 'resume', re: /\b(tiep tuc|resume|continue)\b/ },
  { cmd: 'end-day', re: /\b(ket thuc ngay|het ngay|di ngu|end the day|end day|go to sleep)\b/ },
  { cmd: 'repeat', re: /\b(doc lai|nhac lai|noi lai|repeat|say again)\b/ },
];

const NOMINATE = /\b(?:de cu|de nghi loai|nominate|i nominate|accuse)\b(.*)$/;

export function parseVoiceCommand(text: string, players: NamedPlayer[]): VoiceCommand | null {
  const said = normalize(text);
  if (!said) return null;

  const nomination = NOMINATE.exec(said);
  if (nomination) {
    const target = matchPlayer(nomination[1] ?? '', players);
    return target ? { cmd: 'nominate', target } : null;
  }
  for (const { cmd, re } of PATTERNS) {
    if (re.test(said)) return { cmd };
  }
  return null;
}

/** Finds the player named in `phrase`, preferring the longest (most specific) name. */
export function matchPlayer(phrase: string, players: NamedPlayer[]): string | null {
  const words = ` ${normalize(phrase)} `;
  const candidates = players
    .map((p) => ({ id: p.id, name: normalize(p.name) }))
    .filter((p) => p.name && words.includes(` ${p.name} `))
    .sort((a, b) => b.name.length - a.name.length);
  if (candidates[0]) return candidates[0].id;
  // Fall back to the first word of each name ("Bình An" → "binh").
  const first = players.filter((p) => {
    const head = normalize(p.name).split(' ')[0];
    return head && words.includes(` ${head} `);
  });
  return first.length === 1 ? first[0]!.id : null;
}
