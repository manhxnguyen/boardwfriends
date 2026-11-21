import type { NightCall, ScriptStep } from '@bwf/engine';
import type { Lang } from '../i18n.svelte.ts';

/**
 * Moderator script, in the project's own words. Steps and their order come from the engine
 * (nightScript); this file only holds the text. Rules: docs/rules/classic.md.
 */

interface ScriptText {
  sleep: string;
  wakeFirst: string;
  wakeLater: string;
  calls: Record<NightCall, { say: string; do: string }>;
  notes: Record<NonNullable<ScriptStep['note']>, string>;
  day: string[];
  end: string[];
}

export const SCRIPT: Record<Lang, ScriptText> = {
  vi: {
    sleep: 'Màn đêm buông xuống. Cả làng nhắm mắt lại.',
    wakeFirst: 'Trời sáng rồi. Mọi người mở mắt. (Đêm đầu không ai bị loại.)',
    wakeLater: 'Trời sáng rồi. Mọi người mở mắt. Công bố người bị loại đêm qua và lật bài của họ.',
    calls: {
      bodyguard: {
        say: 'Bảo vệ, mở mắt. Chọn một người để bảo vệ đêm nay… Bảo vệ, nhắm mắt.',
        do: 'Ghi lại người được bảo vệ. Không được là chính Bảo vệ, không trùng với đêm trước.',
      },
      wolves: {
        say: 'Bầy Sói, mở mắt. Hãy thống nhất chọn một người… Sói, nhắm mắt.',
        do: 'Tất cả Sói phải chỉ cùng một người. Quá 30 giây chưa thống nhất thì đêm nay không ai bị loại.',
      },
      mason: {
        say: 'Hội kín, mở mắt và nhận mặt nhau… Hội kín, nhắm mắt.',
        do: 'Chỉ gọi ở đêm đầu.',
      },
      witch: {
        say: 'Phù thuỷ, mở mắt. Đây là người bị nhắm đêm nay. Cứu người này, hay chọn một người để loại?… Phù thuỷ, nhắm mắt.',
        do: 'Chỉ vào người bị nhắm. Nếu Phù thuỷ đã dùng khả năng rồi: vẫn gọi nhưng không chỉ ai.',
      },
      seer: {
        say: 'Tiên tri, mở mắt. Chỉ vào một người… Tiên tri, nhắm mắt.',
        do: 'Giơ ngón cái nếu người đó là Sói (kể cả Sói con), lắc đầu nếu không.',
      },
      sorceress: {
        say: 'Phù thuỷ tà, mở mắt. Chỉ vào một người… Phù thuỷ tà, nhắm mắt.',
        do: 'Giơ ngón cái nếu người đó là Tiên tri, lắc đầu nếu không.',
      },
      spellcaster: {
        say: 'Thầy phép, mở mắt. Chọn một người phải im lặng ngày mai… Thầy phép, nhắm mắt.',
        do: 'Không được chọn lại người đã từng bị chọn. Sáng ra công bố ai bị câm.',
      },
      insomniac: {
        say: 'Kẻ mất ngủ, mở mắt… Kẻ mất ngủ, nhắm mắt.',
        do: 'Gật đầu nếu ít nhất một trong hai người ngồi cạnh đã thức dậy đêm nay, lắc đầu nếu không.',
      },
    },
    notes: {
      'meet-only': 'Đêm đầu: Sói chỉ nhận mặt nhau, KHÔNG loại ai.',
      'no-effect': 'Đêm đầu: vẫn gọi để không lộ vai, nhưng lựa chọn không có tác dụng.',
      'wolf-cub-double': 'Nếu Sói con bị loại hôm trước: đêm nay Sói chọn 2 người.',
    },
    day: [
      'Người bị loại không được nói nữa, rời vòng tròn nhưng vẫn ngồi xem.',
      'Đề cử: chỉ vào một người và nói “Tôi đề cử…”. Cần một người khác ủng hộ.',
      'Người bị đề cử được bào chữa, rồi cả làng giơ ngón cái: lên là giữ, xuống là loại.',
      'Hơn một nửa số người còn sống bỏ phiếu loại thì người đó bị loại và lật bài. Làng đi ngủ ngay.',
      'Mỗi ngày khoảng 5 phút. Hết giờ mà không loại được ai thì làng đi ngủ. Báo trước khi sắp hết giờ.',
      'Thợ săn bị loại: được bắn ngay một người. Không ai được nói cho tới khi Thợ săn quyết định.',
    ],
    end: [
      'Phe Làng thắng khi mọi Sói đã bị loại.',
      'Phe Sói thắng khi số Sói bằng hoặc nhiều hơn số người phe Làng.',
      'Thợ thuộc da bị loại: Thợ thuộc da thắng, mọi người khác thua.',
      'Hết ván, tất cả lật bài.',
    ],
  },
  en: {
    sleep: 'Night falls. Everyone, close your eyes.',
    wakeFirst:
      'Morning comes. Everyone, open your eyes. (Nobody is eliminated on the first night.)',
    wakeLater:
      'Morning comes. Everyone, open your eyes. Announce who was eliminated last night and reveal their card.',
    calls: {
      bodyguard: {
        say: 'Bodyguard, open your eyes. Choose someone to protect tonight… Bodyguard, close your eyes.',
        do: 'Note who is protected. Not the Bodyguard, not the same player as last night.',
      },
      wolves: {
        say: 'Wolves, open your eyes. Agree on one player… Wolves, close your eyes.',
        do: 'All wolves must point at the same player. After 30 seconds without agreement, nobody is eliminated tonight.',
      },
      mason: {
        say: 'Masons, open your eyes and find each other… Masons, close your eyes.',
        do: 'First night only.',
      },
      witch: {
        say: 'Witch, open your eyes. This is tonight’s target. Save them, or choose someone to eliminate?… Witch, close your eyes.',
        do: 'Point at the target. If the Witch already used their power: still call, but show nobody.',
      },
      seer: {
        say: 'Seer, open your eyes. Point at a player… Seer, close your eyes.',
        do: 'Thumbs up if that player is a wolf (Wolf Cub included), thumbs down if not.',
      },
      sorceress: {
        say: 'Sorceress, open your eyes. Point at a player… Sorceress, close your eyes.',
        do: 'Thumbs up if that player is the Seer, thumbs down if not.',
      },
      spellcaster: {
        say: 'Spellcaster, open your eyes. Choose someone who must stay silent tomorrow… Spellcaster, close your eyes.',
        do: 'Never a player chosen before. Announce the silenced player in the morning.',
      },
      insomniac: {
        say: 'Insomniac, open your eyes… Insomniac, close your eyes.',
        do: 'Nod if at least one of their two neighbours woke up tonight, shake your head if not.',
      },
    },
    notes: {
      'meet-only': 'First night: wolves only meet each other. Nobody is eliminated.',
      'no-effect': 'First night: call anyway so nobody is revealed, but the choice has no effect.',
      'wolf-cub-double':
        'If the Wolf Cub was eliminated yesterday: the wolves choose 2 players tonight.',
    },
    day: [
      'Eliminated players may not speak; they leave the circle but can watch.',
      'Nominate by pointing and saying “I nominate…”. Another player must second it.',
      'The nominee may defend themselves, then everyone votes with a thumb: up to keep, down to eliminate.',
      'More than half of the living players voting down eliminates the nominee; reveal their card. The village sleeps at once.',
      'About 5 minutes per day. If nobody is eliminated in time, the village sleeps. Warn before time runs out.',
      'If the Hunter is eliminated, they immediately take someone with them. Nobody talks until they decide.',
    ],
    end: [
      'The village wins when every wolf is eliminated.',
      'The wolves win when they equal or outnumber the village team.',
      'If the Tanner is eliminated, the Tanner wins and everyone else loses.',
      'At the end, everyone reveals their card.',
    ],
  },
};
