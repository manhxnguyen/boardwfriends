import type { OneNightRoleId } from '@bwf/protocol';
import type { Lang } from '../i18n.svelte.ts';
import type { RoleText } from './roles.ts';

/** One Night role texts, in the project's own words. Rules: docs/rules/one-night.md. */
export const ONE_NIGHT_ICON: Record<OneNightRoleId, string> = {
  villager: '🧑‍🌾',
  werewolf: '🐺',
  minion: '🦹',
  mason: '🤝',
  seer: '🔮',
  robber: '🦝',
  troublemaker: '🃏',
  drunk: '🍺',
  insomniac: '🥱',
  hunter: '🏹',
  tanner: '🪢',
};

export const ONE_NIGHT_TEXT: Record<Lang, Record<OneNightRoleId, RoleText>> = {
  vi: {
    villager: {
      name: 'Dân làng',
      description: 'Không có khả năng gì, nhưng chắc chắn không phải Sói.',
    },
    werewolf: {
      name: 'Sói',
      description: 'Ban đêm nhận mặt đồng bọn. Nếu chỉ có một mình, được xem một lá ở giữa.',
    },
    minion: {
      name: 'Tay sai',
      description:
        'Biết ai là Sói nhưng Sói không biết bạn. Thắng cùng Sói, kể cả khi bạn bị loại.',
    },
    mason: { name: 'Hội kín', description: 'Ban đêm tìm thành viên Hội kín còn lại.' },
    seer: { name: 'Tiên tri', description: 'Xem lá của một người khác, hoặc hai lá ở giữa.' },
    robber: {
      name: 'Kẻ trộm',
      description:
        'Có thể đổi lá của mình với một người khác rồi xem lá mới. Bạn thuộc phe của lá mới.',
    },
    troublemaker: {
      name: 'Kẻ phá rối',
      description: 'Có thể đổi lá của hai người khác mà không xem.',
    },
    drunk: {
      name: 'Bợm rượu',
      description: 'Bắt buộc đổi lá của mình với một lá ở giữa, nhưng không được xem.',
    },
    insomniac: { name: 'Kẻ mất ngủ', description: 'Cuối đêm được xem lại lá của chính mình.' },
    hunter: {
      name: 'Thợ săn',
      description: 'Nếu bạn bị loại, người bạn bỏ phiếu cũng bị loại theo.',
    },
    tanner: { name: 'Thợ thuộc da', description: 'Bạn chỉ thắng nếu bị loại.' },
  },
  en: {
    villager: { name: 'Villager', description: 'No power, but definitely not a werewolf.' },
    werewolf: {
      name: 'Werewolf',
      description: 'At night, find the other wolves. Alone, you may look at one center card.',
    },
    minion: {
      name: 'Minion',
      description: 'You know the wolves, they do not know you. You win with them, even if you die.',
    },
    mason: { name: 'Mason', description: 'At night, look for the other Mason.' },
    seer: { name: 'Seer', description: 'Look at another player’s card, or two center cards.' },
    robber: {
      name: 'Robber',
      description:
        'You may swap cards with another player, then look at your new card. You join its team.',
    },
    troublemaker: {
      name: 'Troublemaker',
      description: 'You may swap the cards of two other players without looking.',
    },
    drunk: {
      name: 'Drunk',
      description: 'You must swap your card with a center card, without looking at it.',
    },
    insomniac: {
      name: 'Insomniac',
      description: 'At the end of the night, look at your own card.',
    },
    hunter: { name: 'Hunter', description: 'If you die, the player you voted for dies too.' },
    tanner: { name: 'Tanner', description: 'You only win if you die.' },
  },
};
