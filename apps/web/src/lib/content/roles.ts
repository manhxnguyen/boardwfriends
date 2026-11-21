import type { ClassicRoleId } from '@bwf/protocol';
import type { Fence, Team } from '@bwf/engine';
import type { Lang } from '../i18n.svelte.ts';

/**
 * Role names and descriptions, written in the project's own words (never copied from a
 * rulebook). Rules and sources: docs/rules/classic.md.
 */
export interface RoleText {
  name: string;
  /** One or two sentences shown on the card. */
  description: string;
}

/** Placeholder art until real card images exist (docs/art-spec.md). */
export const ROLE_ICON: Record<ClassicRoleId, string> = {
  villager: '🧑‍🌾',
  werewolf: '🐺',
  seer: '🔮',
  bodyguard: '🛡️',
  hunter: '🏹',
  witch: '🧪',
  'wolf-cub': '🐾',
  sorceress: '🧙‍♀️',
  tanner: '🪢',
  'village-idiot': '🤪',
  spellcaster: '🤫',
  insomniac: '🥱',
  mason: '🤝',
};

export const FENCE_COLOR: Record<Fence, string> = {
  villager: '#1d3f7a',
  'village-support': '#2e86c1',
  wolf: '#7a1c1c',
  'wolf-support': '#c0566b',
  independent: '#8a5a2b',
};

export const TEAM_TEXT: Record<Lang, Record<Team, string>> = {
  vi: { village: 'Phe Làng', wolf: 'Phe Sói', independent: 'Độc lập' },
  en: { village: 'Village team', wolf: 'Wolf team', independent: 'Independent' },
};

export const ROLE_TEXT: Record<Lang, Record<ClassicRoleId, RoleText>> = {
  vi: {
    villager: {
      name: 'Dân làng',
      description: 'Không có khả năng đặc biệt. Tìm ra Sói và loại chúng bằng lá phiếu của bạn.',
    },
    werewolf: {
      name: 'Sói',
      description:
        'Mỗi đêm cùng bầy Sói thống nhất chọn 1 người để loại. Ban ngày hãy giả làm dân lành.',
    },
    seer: {
      name: 'Tiên tri',
      description: 'Mỗi đêm chỉ vào 1 người, quản trò sẽ cho bạn biết người đó có phải Sói không.',
    },
    bodyguard: {
      name: 'Bảo vệ',
      description:
        'Mỗi đêm chọn 1 người khác; người đó không thể bị loại trong đêm. Không được chọn cùng một người 2 đêm liền.',
    },
    hunter: {
      name: 'Thợ săn',
      description:
        'Khi bị loại, bạn được loại ngay 1 người khác. Nếu bị loại ban đêm, bạn bắn vào sáng hôm sau.',
    },
    witch: {
      name: 'Phù thuỷ',
      description:
        'Chỉ một lần trong cả ván: cứu người bị nhắm đêm đó, HOẶC loại 1 người. Dùng rồi thì không còn được biết ai bị nhắm.',
    },
    'wolf-cub': {
      name: 'Sói con',
      description:
        'Thức dậy và chọn mục tiêu cùng bầy Sói. Nếu bạn bị loại, đêm sau bầy Sói được loại 2 người.',
    },
    sorceress: {
      name: 'Phù thuỷ tà',
      description:
        'Thuộc phe Sói nhưng không biết ai là Sói. Mỗi đêm tìm Tiên tri: quản trò cho biết người bạn chỉ có phải Tiên tri không.',
    },
    tanner: {
      name: 'Thợ thuộc da',
      description:
        'Bạn chán đời và chỉ thắng khi bị loại. Khi bạn thắng, tất cả những người khác đều thua.',
    },
    'village-idiot': {
      name: 'Thằng ngốc',
      description: 'Thuộc phe Làng. Mỗi lần bỏ phiếu, bạn luôn bỏ phiếu loại.',
    },
    spellcaster: {
      name: 'Thầy phép',
      description:
        'Mỗi đêm chọn 1 người phải im lặng suốt ngày hôm sau. Không được chọn cùng một người 2 lần trong ván.',
    },
    insomniac: {
      name: 'Kẻ mất ngủ',
      description:
        'Mỗi đêm bạn biết có ít nhất 1 trong 2 người ngồi cạnh mình đã thức dậy hay không.',
    },
    mason: {
      name: 'Hội kín',
      description:
        'Đêm đầu nhận mặt các thành viên Hội kín. Không ai được nhắc tới Hội kín; ai nhắc sẽ bị loại.',
    },
  },
  en: {
    villager: {
      name: 'Villager',
      description: 'No special power. Find the wolves and vote them out.',
    },
    werewolf: {
      name: 'Werewolf',
      description:
        'Each night, agree with the other wolves on one player to eliminate. By day, act innocent.',
    },
    seer: {
      name: 'Seer',
      description:
        'Each night, point at a player; the moderator tells you whether they are a wolf.',
    },
    bodyguard: {
      name: 'Bodyguard',
      description:
        'Each night, pick another player who cannot be eliminated that night. Never the same player two nights running.',
    },
    hunter: {
      name: 'Hunter',
      description:
        'When you are eliminated, immediately eliminate another player. If it happens at night, you shoot the next morning.',
    },
    witch: {
      name: 'Witch',
      description:
        'Once per game: save the player targeted that night, OR eliminate a player. After that you no longer learn the target.',
    },
    'wolf-cub': {
      name: 'Wolf Cub',
      description:
        'Wake and hunt with the wolves. If you are eliminated, the wolves take two players the following night.',
    },
    sorceress: {
      name: 'Sorceress',
      description:
        'On the wolf team but you do not know the wolves. Each night, look for the Seer: the moderator tells you if you found them.',
    },
    tanner: {
      name: 'Tanner',
      description:
        'You hate your job and only win if you are eliminated. If you win, everyone else loses.',
    },
    'village-idiot': {
      name: 'Village Idiot',
      description: 'On the village team. Whenever there is a vote, you always vote to eliminate.',
    },
    spellcaster: {
      name: 'Spellcaster',
      description:
        'Each night, pick a player who must stay silent the following day. Never the same player twice per game.',
    },
    insomniac: {
      name: 'Insomniac',
      description: 'Each night, you learn whether at least one of your two neighbours woke up.',
    },
    mason: {
      name: 'Mason',
      description:
        'On the first night, meet the other Masons. Nobody may mention the Masons; whoever does is eliminated.',
    },
  },
};
