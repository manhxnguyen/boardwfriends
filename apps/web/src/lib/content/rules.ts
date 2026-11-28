import type { ClassicRoleId, GameKind, OneNightRoleId } from '@bwf/protocol';
import type { Lang } from '../i18n.svelte.ts';

/**
 * In-game rules reference. Written in the project's own words (never copied from a rulebook);
 * every line cites where the rule comes from. Full rules with rule ids: docs/rules/*.md.
 *
 * Citation format: "<source>:<page>" (e.g. "GS:3") or "AD" for an app decision.
 */
export type Cite = string;

export interface RuleLine {
  text: string;
  cite: Cite[];
}

export interface RuleSection {
  title: string;
  lines: RuleLine[];
}

export interface Source {
  id: string;
  title: string;
  detail: string;
  url?: string;
}

const BGG_UW = 'https://boardgamegeek.com/boardgame/152241/ultimate-werewolf/files';
const BGG_ONUW = 'https://boardgamegeek.com/boardgame/147949/one-night-ultimate-werewolf/files';

export const SOURCES: Record<Lang, Record<GameKind, Source[]>> = {
  vi: {
    classic: [
      {
        id: 'GS',
        title: 'Ultimate Werewolf: Getting Started, v1.1',
        detail:
          'Ted Alspach, Bezier Games, © 2021. Tài liệu luật chính thức (bản điện tử trên BoardGameGeek).',
        url: BGG_UW,
      },
      {
        id: 'RR',
        title: 'Ultimate Werewolf: Role Reference, v1.1',
        detail: 'Bezier Games, © 2021. Điểm cân bằng và giải thích từng vai.',
        url: BGG_UW,
      },
      {
        id: 'AD',
        title: 'Quyết định của ứng dụng',
        detail:
          'Những chỗ luật gốc dựa vào quản trò người thật, app phải tự quy định (ví dụ thời gian mỗi lượt).',
      },
    ],
    'one-night': [
      {
        id: 'OR',
        title: 'One Night Ultimate Werewolf: Rules',
        detail: 'Ted Alspach & Akihisa Okui, Bezier Games, © 2015. Sách luật chính thức.',
        url: BGG_ONUW,
      },
      {
        id: 'OW',
        title: 'One Night Ultimate Werewolf: Winning Conditions',
        detail: 'Thẻ tra cứu điều kiện thắng chính thức của Bezier Games.',
        url: BGG_ONUW,
      },
      {
        id: 'AD',
        title: 'Quyết định của ứng dụng',
        detail:
          'Phần thảo luận và bỏ phiếu nằm trong tờ "Getting Started" in kèm hộp game, không có bản điện tử; app dùng cách chơi phổ biến.',
      },
    ],
  },
  en: {
    classic: [
      {
        id: 'GS',
        title: 'Ultimate Werewolf: Getting Started, v1.1',
        detail:
          'Ted Alspach, Bezier Games, © 2021. Official rules (digital copy on BoardGameGeek).',
        url: BGG_UW,
      },
      {
        id: 'RR',
        title: 'Ultimate Werewolf: Role Reference, v1.1',
        detail: 'Bezier Games, © 2021. Balance points and role clarifications.',
        url: BGG_UW,
      },
      {
        id: 'AD',
        title: 'App decision',
        detail:
          'Where the rules rely on a human moderator, the app has to decide (e.g. how long each call lasts).',
      },
    ],
    'one-night': [
      {
        id: 'OR',
        title: 'One Night Ultimate Werewolf: Rules',
        detail: 'Ted Alspach & Akihisa Okui, Bezier Games, © 2015. Official rulebook.',
        url: BGG_ONUW,
      },
      {
        id: 'OW',
        title: 'One Night Ultimate Werewolf: Winning Conditions',
        detail: 'Official winning-conditions reference card by Bezier Games.',
        url: BGG_ONUW,
      },
      {
        id: 'AD',
        title: 'App decision',
        detail:
          'Discussion and voting are in the printed "Getting Started" sheet, which has no digital copy; the app uses the common way of playing.',
      },
    ],
  },
};

const l = (text: string, ...cite: Cite[]): RuleLine => ({ text, cite });

export const RULES: Record<Lang, Record<GameKind, RuleSection[]>> = {
  vi: {
    classic: [
      {
        title: 'Mục tiêu',
        lines: [
          l(
            'Có hai phe: phe Làng và phe Sói. Sói biết nhau, phe Làng thì không biết ai là Sói.',
            'GS:1',
          ),
          l('Phe Làng thắng khi mọi Sói đã bị loại.', 'GS:1', 'GS:4'),
          l(
            'Phe Sói thắng khi số Sói bằng hoặc nhiều hơn số người phe Làng còn lại.',
            'GS:1',
            'GS:4',
          ),
        ],
      },
      {
        title: 'Chuẩn bị',
        lines: [
          l(
            'Mỗi người nhận một lá bí mật. Không bao giờ được cho người khác xem lá của mình.',
            'GS:1',
            'GS:2',
          ),
          l('Được nói bất cứ điều gì, kể cả nói dối.', 'GS:2'),
          l(
            'Mỗi vai có một con số; chọn bộ vai sao cho tổng gần 0 là cân bằng. Số dương có lợi cho Làng, số âm có lợi cho Sói.',
            'RR:2',
          ),
        ],
      },
      {
        title: 'Ban đêm',
        lines: [
          l('Đêm đầu tiên: Sói chỉ nhận mặt nhau, không ai bị loại.', 'GS:2'),
          l(
            'Tuỳ chọn của phòng “Sói cắn từ đêm đầu” (bật sẵn): đêm đầu Sói vẫn nhận mặt nhau nhưng được chọn nạn nhân; Bảo vệ và Phù thuỷ có tác dụng như mọi đêm.',
            'AD',
          ),
          l(
            'Mỗi đêm Tiên tri soi một người và biết người đó có phải Sói hay không.',
            'GS:2',
            'GS:3',
          ),
          l(
            'Từ đêm thứ hai, bầy Sói phải thống nhất chọn một nạn nhân. Quá 30 giây chưa thống nhất thì đêm đó không ai bị loại.',
            'GS:3',
            'RR:3',
          ),
          l(
            'Tuỳ chọn của phòng “Sói chọn theo đa số” (tắt sẵn): người được nhiều Sói chọn nhất bị loại; nếu hoà, app bốc ngẫu nhiên một người trong số đó.',
            'AD',
          ),
          l('Sói được phép chọn một Sói khác.', 'RR:3'),
          l(
            'Trong app: thay vì nhắm mắt, mọi người cúi xuống điện thoại của mình. Ai cũng phải bấm trong mọi lượt, mỗi lượt dài cố định, để không ai đoán được vai của nhau.',
            'AD',
          ),
        ],
      },
      {
        title: 'Ban ngày',
        lines: [
          l('Sáng ra, công bố người bị loại trong đêm và lật bài của họ.', 'GS:3'),
          l('Người đã bị loại không được nói gì nữa.', 'GS:3', 'GS:4'),
          l('Muốn loại ai, một người đề cử và cần một người khác ủng hộ.', 'GS:3'),
          l('Người bị đề cử được bào chữa, rồi cả làng bỏ phiếu: giữ hay loại.', 'GS:3'),
          l(
            'Hơn một nửa số người (còn sống) bỏ phiếu loại thì người đó bị loại và lật bài; cả làng đi ngủ ngay.',
            'GS:3',
            'AD',
          ),
          l(
            'Mỗi ngày có giới hạn thời gian (gợi ý 5 phút). Hết giờ mà không loại được ai thì đi ngủ.',
            'GS:3',
          ),
        ],
      },
    ],
    'one-night': [
      {
        title: 'Mục tiêu',
        lines: [
          l('Chỉ có một đêm, một lần thảo luận và một lần bỏ phiếu.', 'OR:5'),
          l(
            'Phe Làng phải loại được ít nhất một Sói, trừ khi chính bạn đã trở thành Sói.',
            'OR:1',
            'OW',
          ),
        ],
      },
      {
        title: 'Chuẩn bị',
        lines: [
          l('Luôn có nhiều hơn số người chơi 3 lá; 3 lá thừa úp ở giữa bàn.', 'OR:2'),
          l('Mọi người được biết những vai nào có trong ván.', 'OR:2'),
          l('Xem lá của mình một lần rồi úp xuống, không xem lại cho tới cuối ván.', 'AD'),
        ],
      },
      {
        title: 'Ban đêm',
        lines: [
          l(
            'Thứ tự gọi: Kẻ sao chép → Sói → Tay sai → Hội kín → Tiên tri → Kẻ trộm → Kẻ phá rối → Bợm rượu → Kẻ mất ngủ.',
            'OR:6',
          ),
          l(
            'Bạn hành động theo lá được chia, kể cả khi lá đó đã bị người khác lấy mất.',
            'OR:4',
            'OW',
          ),
          l('Kẻ trộm chỉ thức một lần, không làm hành động của vai mới.', 'OR:4', 'OW'),
          l('Bợm rượu bắt buộc phải đổi lá; các vai khác có thể bỏ qua.', 'OW'),
          l('Mọi vai đều được gọi, kể cả khi lá đó đang nằm ở giữa bàn.', 'OR:6'),
        ],
      },
      {
        title: 'Ban ngày và bỏ phiếu',
        lines: [
          l('Thảo luận trong thời gian giới hạn, rồi tất cả cùng lúc chỉ vào một người.', 'AD'),
          l('Người nhiều phiếu nhất bị loại; hoà thì tất cả người hoà đều bị loại.', 'AD'),
          l('Không ai nhận quá một phiếu thì không ai bị loại.', 'AD'),
          l('Thợ săn bị loại thì người Thợ săn chỉ vào cũng bị loại.', 'OR:5'),
        ],
      },
      {
        title: 'Thắng thua (theo lá đang cầm cuối ván)',
        lines: [
          l('Phe Làng thắng nếu ít nhất một Sói bị loại.', 'OW'),
          l('Nếu không ai là Sói, phe Làng chỉ thắng khi không ai bị loại.', 'OW'),
          l('Phe Sói thắng nếu không Sói nào bị loại (và Thợ thuộc da còn sống).', 'OW'),
          l('Thợ thuộc da chỉ thắng khi chính mình bị loại.', 'OR:5', 'OW'),
        ],
      },
    ],
  },
  en: {
    classic: [
      {
        title: 'Goal',
        lines: [
          l(
            'Two teams: the village and the werewolves. The wolves know each other; the village does not.',
            'GS:1',
          ),
          l('The village wins when every werewolf is eliminated.', 'GS:1', 'GS:4'),
          l('The werewolves win once they equal or outnumber the village.', 'GS:1', 'GS:4'),
        ],
      },
      {
        title: 'Setup',
        lines: [
          l('Everyone gets one secret card. Never show your card to anyone.', 'GS:1', 'GS:2'),
          l('You may say anything, including lies.', 'GS:2'),
          l(
            'Each role has a number; keep the total of the deck close to 0 for a balanced game. Positive favours the village, negative the wolves.',
            'RR:2',
          ),
        ],
      },
      {
        title: 'Night',
        lines: [
          l('First night: the wolves only meet each other. Nobody is eliminated.', 'GS:2'),
          l(
            'Room option “Wolves hunt from the first night” (on by default): on night 1 the wolves still meet but also choose a victim; the Bodyguard and Witch work as on any night.',
            'AD',
          ),
          l(
            'Every night the Seer looks at one player and learns whether they are a werewolf.',
            'GS:2',
            'GS:3',
          ),
          l(
            'From night two, the wolves must agree on one victim. If they take longer than 30 seconds, nobody is eliminated that night.',
            'GS:3',
            'RR:3',
          ),
          l(
            'Room option “Wolves vote by majority” (off by default): the player picked by the most wolves is eliminated; on a tie the app draws one of them at random.',
            'AD',
          ),
          l('Werewolves may choose another werewolf.', 'RR:3'),
          l(
            'In the app: instead of closing your eyes, look down at your own phone. Everyone taps something in every call and each call lasts a fixed time, so nobody can tell who has a role.',
            'AD',
          ),
        ],
      },
      {
        title: 'Day',
        lines: [
          l('In the morning, the night’s victims are announced and their cards revealed.', 'GS:3'),
          l('Eliminated players may not speak.', 'GS:3', 'GS:4'),
          l(
            'To eliminate someone, a player nominates them and another player must second.',
            'GS:3',
          ),
          l(
            'The nominee may defend themselves, then the village votes: keep or eliminate.',
            'GS:3',
          ),
          l(
            'If more than half of the (living) players vote to eliminate, the nominee is out and their card is revealed; the village sleeps at once.',
            'GS:3',
            'AD',
          ),
          l(
            'Each day has a time limit (about 5 minutes). If time runs out, the village goes to sleep.',
            'GS:3',
          ),
        ],
      },
    ],
    'one-night': [
      {
        title: 'Goal',
        lines: [
          l('There is a single night, one discussion and one vote.', 'OR:5'),
          l(
            'The village must eliminate at least one werewolf, unless you have become a werewolf yourself.',
            'OR:1',
            'OW',
          ),
        ],
      },
      {
        title: 'Setup',
        lines: [
          l(
            'There are always 3 more cards than players; the extra 3 go face down in the center.',
            'OR:2',
          ),
          l('Everyone knows which roles are in the game.', 'OR:2'),
          l('Look at your card once, then keep it face down until the end.', 'AD'),
        ],
      },
      {
        title: 'Night',
        lines: [
          l(
            'Wake order: Doppelgänger → Werewolves → Minion → Masons → Seer → Robber → Troublemaker → Drunk → Insomniac.',
            'OR:6',
          ),
          l('You act as the card you were dealt, even if someone has taken it.', 'OR:4', 'OW'),
          l('The Robber wakes only once and does not perform the new role’s action.', 'OR:4', 'OW'),
          l('The Drunk must swap; the other actions are optional.', 'OW'),
          l('Every role is called, even if its card is in the center.', 'OR:6'),
        ],
      },
      {
        title: 'Day and vote',
        lines: [
          l('Talk for a limited time, then everyone points at one player at the same time.', 'AD'),
          l('The player with the most votes dies; on a tie, everyone tied dies.', 'AD'),
          l('If nobody gets more than one vote, nobody dies.', 'AD'),
          l('If the Hunter dies, the player the Hunter points at dies too.', 'OR:5'),
        ],
      },
      {
        title: 'Winning (by the card you hold at the end)',
        lines: [
          l('The village wins if at least one werewolf dies.', 'OW'),
          l('If no player is a werewolf, the village wins only if nobody dies.', 'OW'),
          l('The werewolves win if no werewolf dies (and the Tanner is alive).', 'OW'),
          l('The Tanner only wins by dying.', 'OR:5', 'OW'),
        ],
      },
    ],
  },
};

/** Where each role's rules come from. */
export const CLASSIC_ROLE_CITES: Record<ClassicRoleId, Cite[]> = {
  villager: ['RR:3'],
  werewolf: ['GS:3', 'RR:3'],
  seer: ['GS:2', 'RR:3'],
  bodyguard: ['RR:2'],
  hunter: ['RR:3'],
  witch: ['RR:4'],
  'wolf-cub': ['RR:4'],
  sorceress: ['RR:3'],
  tanner: ['RR:3'],
  'village-idiot': ['RR:3'],
  spellcaster: ['RR:3'],
  insomniac: ['RR:3'],
  mason: ['RR:3'],
};

export const ONE_NIGHT_ROLE_CITES: Record<OneNightRoleId, Cite[]> = {
  doppelganger: ['OR:2', 'OR:3'],
  werewolf: ['OR:3'],
  minion: ['OR:3', 'OW'],
  mason: ['OR:4'],
  seer: ['OR:4'],
  robber: ['OR:4'],
  troublemaker: ['OR:4'],
  drunk: ['OR:5'],
  insomniac: ['OR:5'],
  villager: ['OR:5'],
  hunter: ['OR:5'],
  tanner: ['OR:5', 'OW'],
};

/** "GS:3" → "GS tr.3" / "GS p.3". */
export function citeLabel(cite: Cite, lang: Lang): string {
  const [id, page] = cite.split(':');
  if (!page) return id!;
  return `${id} ${lang === 'vi' ? 'tr.' : 'p.'}${page}`;
}
