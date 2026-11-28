import {
  CLASSIC_ROLE_IDS,
  type ClassicRoleId,
  type Cue,
  type Death,
  type Team,
  type Winner,
} from '@bwf/protocol';
import type { Lang } from '../i18n.svelte.ts';
import { ONE_NIGHT_TEXT } from './one-night-roles.ts';
import { ROLE_TEXT, TEAM_TEXT } from './roles.ts';

/**
 * What the narrator says for each cue (spoken by the MacBook, shown as captions on phones).
 * Written in the project's own words. During the night everyone looks at their own phone instead
 * of closing their eyes, so the wording asks people to keep their eyes on their screen.
 */

type Names = (id: string) => string;

interface CallLines {
  open: string;
  close: string;
}

const CLASSIC_CALLS: Record<Lang, Record<string, CallLines>> = {
  vi: {
    bodyguard: { open: 'Bảo vệ, hãy chọn một người để bảo vệ đêm nay.', close: 'Bảo vệ, xong.' },
    wolves: { open: 'Bầy Sói, hãy thống nhất chọn một nạn nhân.', close: 'Bầy Sói, xong.' },
    mason: { open: 'Hội kín, hãy nhận mặt nhau.', close: 'Hội kín, xong.' },
    witch: { open: 'Phù thuỷ, cứu người bị nhắm, hay loại một người?', close: 'Phù thuỷ, xong.' },
    seer: { open: 'Tiên tri, hãy chọn một người để soi.', close: 'Tiên tri, xong.' },
    sorceress: { open: 'Phù thuỷ tà, hãy tìm Tiên tri.', close: 'Phù thuỷ tà, xong.' },
    spellcaster: {
      open: 'Thầy phép, hãy chọn một người phải im lặng ngày mai.',
      close: 'Thầy phép, xong.',
    },
    insomniac: { open: 'Kẻ mất ngủ, hãy xem ai đã thức đêm nay.', close: 'Kẻ mất ngủ, xong.' },
  },
  en: {
    bodyguard: { open: 'Bodyguard, choose someone to protect tonight.', close: 'Bodyguard, done.' },
    wolves: { open: 'Wolves, agree on a victim.', close: 'Wolves, done.' },
    mason: { open: 'Masons, find each other.', close: 'Masons, done.' },
    witch: { open: 'Witch, save the target, or eliminate someone?', close: 'Witch, done.' },
    seer: { open: 'Seer, choose someone to look at.', close: 'Seer, done.' },
    sorceress: { open: 'Sorceress, look for the Seer.', close: 'Sorceress, done.' },
    spellcaster: {
      open: 'Spellcaster, choose someone who must stay silent tomorrow.',
      close: 'Spellcaster, done.',
    },
    insomniac: {
      open: 'Insomniac, see whether anyone near you woke up.',
      close: 'Insomniac, done.',
    },
  },
};

const ONE_NIGHT_CALLS: Record<Lang, Record<string, CallLines>> = {
  vi: {
    doppelganger: {
      open: 'Kẻ sao chép, hãy xem lá của một người và trở thành vai đó. Nếu vai mới có hành động, hãy làm ngay.',
      close: 'Kẻ sao chép, xong.',
    },
    'doppel-insomniac': {
      open: 'Kẻ sao chép, nếu bạn đã chép Kẻ mất ngủ, hãy xem lại lá của mình.',
      close: 'Kẻ sao chép, xong.',
    },
    werewolf: {
      open: 'Sói, hãy tìm đồng bọn. Nếu chỉ có một mình, hãy xem một lá ở giữa.',
      close: 'Sói, xong.',
    },
    minion: { open: 'Tay sai, hãy xem ai là Sói.', close: 'Tay sai, xong.' },
    mason: { open: 'Hội kín, hãy tìm nhau.', close: 'Hội kín, xong.' },
    seer: {
      open: 'Tiên tri, hãy xem lá của một người, hoặc hai lá ở giữa.',
      close: 'Tiên tri, xong.',
    },
    robber: {
      open: 'Kẻ trộm, bạn có thể đổi lá với một người, rồi xem lá mới.',
      close: 'Kẻ trộm, xong.',
    },
    troublemaker: {
      open: 'Kẻ phá rối, bạn có thể đổi lá của hai người khác.',
      close: 'Kẻ phá rối, xong.',
    },
    drunk: { open: 'Bợm rượu, hãy đổi lá của mình với một lá ở giữa.', close: 'Bợm rượu, xong.' },
    insomniac: { open: 'Kẻ mất ngủ, hãy xem lại lá của mình.', close: 'Kẻ mất ngủ, xong.' },
  },
  en: {
    doppelganger: {
      open: 'Doppelgänger, look at another player’s card and become that role. If it has an action, do it now.',
      close: 'Doppelgänger, done.',
    },
    'doppel-insomniac': {
      open: 'Doppelgänger, if you copied the Insomniac, look at your card again.',
      close: 'Doppelgänger, done.',
    },
    werewolf: {
      open: 'Werewolves, find each other. If you are alone, look at one center card.',
      close: 'Werewolves, done.',
    },
    minion: { open: 'Minion, see who the werewolves are.', close: 'Minion, done.' },
    mason: { open: 'Masons, find each other.', close: 'Masons, done.' },
    seer: { open: 'Seer, look at one player’s card, or two center cards.', close: 'Seer, done.' },
    robber: {
      open: 'Robber, you may swap with another player, then look at your new card.',
      close: 'Robber, done.',
    },
    troublemaker: {
      open: 'Troublemaker, you may swap the cards of two other players.',
      close: 'Troublemaker, done.',
    },
    drunk: { open: 'Drunk, swap your card with a center card.', close: 'Drunk, done.' },
    insomniac: { open: 'Insomniac, look at your card again.', close: 'Insomniac, done.' },
  },
};

const T = {
  vi: {
    gameStart: 'Trò chơi bắt đầu. Hãy giữ bí mật vai của mình.',
    nightFirst:
      'Màn đêm đầu tiên buông xuống. Mọi người cúi xuống điện thoại của mình, đừng nhìn người khác.',
    night: (n: number) => `Đêm thứ ${n} buông xuống. Mọi người cúi xuống điện thoại của mình.`,
    dawnNone: 'Trời sáng. Đêm qua không ai bị loại.',
    dawn: (names: string) => `Trời sáng. Đêm qua, ${names} đã bị loại.`,
    silenced: (name: string) => `${name} bị yểm bùa, phải im lặng suốt hôm nay.`,
    day: (n: number, m: number) =>
      `Ngày thứ ${n}. Cả làng có ${m} phút để thảo luận. Muốn đề cử ai, hãy bấm trên điện thoại.`,
    warning: (s: number) => `Còn ${s} giây!`,
    nominated: (by: string | null, nominee: string) =>
      `${by ?? 'Có người'} đề cử ${nominee}. Có ai ủng hộ không?`,
    noSecond: 'Không ai ủng hộ. Tiếp tục thảo luận.',
    defense: (nominee: string) => `${nominee}, bạn có thời gian để bào chữa.`,
    voting: (nominee: string) => `Bỏ phiếu! Giữ ${nominee} lại, hay loại?`,
    voteResult: (e: number, k: number, kept: string | null) =>
      `${e} phiếu loại, ${k} phiếu giữ.${kept ? ` ${kept} được giữ lại.` : ''}`,
    eliminated: (name: string) => `${name} đã bị loại.`,
    isRole: (name: string, role: string) => `${name} là ${role}.`,
    isTeam: (name: string, team: string) => `${name} thuộc ${team}.`,
    hunter: (name: string) => `Thợ săn ${name}, hãy chọn một người để bắn.`,
    dayEnd: 'Hết giờ. Cả làng đi ngủ.',
    paused: 'Tạm dừng.',
    resumed: 'Tiếp tục.',
    win: {
      village: 'Phe Làng chiến thắng!',
      wolf: 'Phe Sói chiến thắng!',
      tanner: 'Thợ thuộc da chiến thắng!',
    },
    noWinner: 'Không ai chiến thắng.',
    onDay: (m: number) => `Trời sáng. Các bạn có ${m} phút để tìm ra Sói.`,
    onVote: 'Hết giờ! Mọi người hãy chỉ vào người mình nghi là Sói.',
    onResultNone: 'Không ai bị loại.',
    onResult: (names: string) => `${names} bị loại.`,
    and: ' và ',
  },
  en: {
    gameStart: 'The game begins. Keep your role secret.',
    nightFirst: 'The first night falls. Everyone, look down at your own phone and nobody else’s.',
    night: (n: number) => `Night ${n} falls. Everyone, look down at your phone.`,
    dawnNone: 'Morning comes. Nobody was eliminated last night.',
    dawn: (names: string) => `Morning comes. Last night, ${names} was eliminated.`,
    silenced: (name: string) => `${name} has been silenced and must stay quiet today.`,
    day: (n: number, m: number) =>
      `Day ${n}. The village has ${m} minutes to talk. To nominate someone, use your phone.`,
    warning: (s: number) => `${s} seconds left!`,
    nominated: (by: string | null, nominee: string) =>
      `${by ?? 'Someone'} nominates ${nominee}. Does anyone second?`,
    noSecond: 'Nobody seconded. Keep talking.',
    defense: (nominee: string) => `${nominee}, you may defend yourself.`,
    voting: (nominee: string) => `Vote! Keep ${nominee}, or eliminate?`,
    voteResult: (e: number, k: number, kept: string | null) =>
      `${e} to eliminate, ${k} to keep.${kept ? ` ${kept} stays.` : ''}`,
    eliminated: (name: string) => `${name} is eliminated.`,
    isRole: (name: string, role: string) => `${name} was the ${role}.`,
    isTeam: (name: string, team: string) => `${name} was on the ${team}.`,
    hunter: (name: string) => `Hunter ${name}, choose someone to take with you.`,
    dayEnd: 'Time is up. The village goes to sleep.',
    paused: 'Paused.',
    resumed: 'Resuming.',
    win: { village: 'The village wins!', wolf: 'The wolves win!', tanner: 'The Tanner wins!' },
    noWinner: 'Nobody wins.',
    onDay: (m: number) => `Morning comes. You have ${m} minutes to find the werewolves.`,
    onVote: 'Time is up! Everyone, point at the player you think is a werewolf.',
    onResultNone: 'Nobody dies.',
    onResult: (names: string) => `${names} dies.`,
    and: ' and ',
  },
};

function reveal(lang: Lang, d: Death, names: Names): string {
  const t = T[lang];
  if (d.role) return ' ' + t.isRole(names(d.playerId), ROLE_TEXT[lang][d.role].name);
  if (d.team) return ' ' + t.isTeam(names(d.playerId), TEAM_TEXT[lang][d.team as Team]);
  return '';
}

function callLines(lang: Lang, call: string, oneNight: boolean): CallLines | undefined {
  return (oneNight ? ONE_NIGHT_CALLS : CLASSIC_CALLS)[lang][call];
}

/**
 * Emotion tags understood by the VieNeu-TTS voice: it laughs, sighs or clears its throat where
 * the tag stands. Other voices would read the tag aloud, so they get the text without tags.
 */
export const EMOTION_TAGS = ['[cười]', '[thở dài]', '[hắng giọng]'] as const;
const EMOTION_RE = /\s*\[(?:cười|thở dài|hắng giọng)\]\s*/g;

/** Text without emotion tags, for captions and voices that do not understand them. */
export function plainText(text: string): string {
  return text.replace(EMOTION_RE, ' ').replace(/\s+/g, ' ').trim();
}

/** Where the narrator shows a feeling: a throat-clear before solemn moments, a sigh for losses. */
function emotion(cue: Cue): (typeof EMOTION_TAGS)[number] | null {
  switch (cue.k) {
    case 'game-start':
    case 'voting':
    case 'on-vote':
      return '[hắng giọng]';
    case 'dawn':
    case 'on-result':
      return cue.deaths.length ? '[thở dài]' : null;
    case 'eliminated':
      return '[thở dài]';
    case 'game-over':
      return cue.winners.length ? '[cười]' : '[thở dài]';
    default:
      return null;
  }
}

/** What the narrator voice reads for one cue: the text with emotion tags, or null. */
export function cueSpeech(cue: Cue, lang: Lang, names: Names, oneNight: boolean): string | null {
  const text = cueText(cue, lang, names, oneNight);
  const tag = emotion(cue);
  return text && tag ? `${tag} ${text}` : text;
}

/** Text for one cue (captions; no emotion tags), or null if nothing should be said. */
export function cueText(cue: Cue, lang: Lang, names: Names, oneNight: boolean): string | null {
  const t = T[lang];
  switch (cue.k) {
    case 'game-start':
      return t.gameStart;
    case 'night':
      return cue.n === 1 ? t.nightFirst : t.night(cue.n);
    case 'call-open':
      // Never says how many victims: only the wolves' phones know about the Wolf Cub double kill.
      return callLines(lang, cue.call, oneNight)?.open ?? null;
    case 'call-close':
      return callLines(lang, cue.call, oneNight)?.close ?? null;
    case 'dawn': {
      let text = cue.deaths.length
        ? t.dawn(cue.deaths.map((d) => names(d.playerId)).join(t.and)) +
          cue.deaths.map((d) => reveal(lang, d, names)).join('')
        : t.dawnNone;
      if (cue.silenced) text += ' ' + t.silenced(names(cue.silenced));
      return text;
    }
    case 'day':
      return t.day(cue.n, cue.minutes);
    case 'time-warning':
      return t.warning(cue.seconds);
    case 'nominated':
      return t.nominated(cue.by ? names(cue.by) : null, names(cue.nominee));
    case 'no-second':
      return t.noSecond;
    case 'defense':
      return t.defense(names(cue.nominee));
    case 'voting':
      return t.voting(names(cue.nominee));
    case 'vote-result':
      return t.voteResult(cue.eliminate, cue.keep, cue.eliminated ? null : names(cue.nominee));
    case 'eliminated':
      return t.eliminated(names(cue.death.playerId)) + reveal(lang, cue.death, names);
    case 'hunter':
      return t.hunter(names(cue.hunter));
    case 'day-end':
      return t.dayEnd;
    case 'paused':
      return t.paused;
    case 'resumed':
      return t.resumed;
    case 'game-over':
      return cue.winners.length ? cue.winners.map((w: Winner) => t.win[w]).join(' ') : t.noWinner;
    case 'on-day':
      return t.onDay(cue.minutes);
    case 'on-vote':
      return t.onVote;
    case 'on-result':
      return cue.deaths.length ? t.onResult(cue.deaths.map(names).join(t.and)) : t.onResultNone;
  }
}

/** Display name of a night call for headings. */
export function callTitle(call: string, lang: Lang, oneNight: boolean): string {
  if (oneNight) {
    if (call === 'doppel-insomniac') {
      return `${ONE_NIGHT_TEXT[lang].doppelganger.name} (${ONE_NIGHT_TEXT[lang].insomniac.name})`;
    }
    return ONE_NIGHT_TEXT[lang][call as keyof (typeof ONE_NIGHT_TEXT)['vi']]?.name ?? call;
  }
  if (call === 'wolves') return lang === 'vi' ? 'Bầy Sói' : 'Wolves';
  return (CLASSIC_ROLE_IDS as readonly string[]).includes(call)
    ? ROLE_TEXT[lang][call as ClassicRoleId].name
    : call;
}
