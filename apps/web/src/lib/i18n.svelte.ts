import { load, save } from './storage.ts';

export type Lang = 'vi' | 'en';

const vi = {
  appName: 'Ma Sói',
  tagline: 'Chơi Ma Sói cùng nhau, mỗi người một điện thoại.',
  yourName: 'Tên của bạn',
  namePlaceholder: 'Ví dụ: Linh',
  createRoom: 'Tạo phòng mới',
  orJoin: 'hoặc vào phòng có sẵn',
  roomCode: 'Mã phòng',
  join: 'Vào phòng',
  continue: 'Tiếp tục',
  needName: 'Hãy nhập tên trước đã.',
  roomNotFound: 'Không tìm thấy phòng này.',
  networkError: 'Không kết nối được server. Kiểm tra wifi rồi thử lại.',
  room: 'Phòng',
  scanToJoin: 'Quét để vào phòng',
  players: 'Người chơi',
  you: 'Bạn',
  host: 'Chủ phòng',
  offline: 'mất kết nối',
  kick: 'Mời ra',
  kickConfirm: 'Mời {name} ra khỏi phòng?',
  rename: 'Đổi tên',
  save: 'Lưu',
  cancel: 'Huỷ',
  leave: 'Rời phòng',
  leaveConfirm: 'Rời phòng này?',
  share: 'Chia sẻ link',
  copied: 'Đã copy link!',
  keepAwake: 'Giữ màn hình sáng',
  keepAwakeUnsupported: 'Cần HTTPS để giữ màn hình sáng',
  startGame: 'Bắt đầu chơi',
  startSoon: 'Phần chơi sẽ có ở bản tiếp theo (M1).',
  waitingHost: 'Đang chờ chủ phòng bắt đầu…',
  statusConnecting: 'Đang kết nối…',
  statusReconnecting: 'Mất kết nối, đang thử lại…',
  endedKicked: 'Bạn đã bị mời ra khỏi phòng.',
  endedLeft: 'Bạn đã rời phòng.',
  endedReplaced: 'Phòng đang được mở ở tab hoặc máy khác.',
  endedRoomClosed: 'Phòng đã đóng.',
  endedRoomNotFound: 'Phòng không tồn tại hoặc đã hết hạn.',
  endedVersion: 'App đã có bản mới. Hãy tải lại trang.',
  reconnectHere: 'Dùng ở đây',
  reload: 'Tải lại',
  backHome: 'Về trang chủ',
  errorRoomFull: 'Phòng đã đủ người.',
  errorGeneric: 'Có lỗi xảy ra ({code}).',
};

type Dict = typeof vi;
export type MessageKey = keyof Dict;

const en: Dict = {
  appName: 'Werewolf',
  tagline: 'Play Werewolf together, one phone each.',
  yourName: 'Your name',
  namePlaceholder: 'e.g. Linh',
  createRoom: 'Create a room',
  orJoin: 'or join an existing room',
  roomCode: 'Room code',
  join: 'Join',
  continue: 'Continue',
  needName: 'Please enter your name first.',
  roomNotFound: 'Room not found.',
  networkError: 'Cannot reach the server. Check the wifi and try again.',
  room: 'Room',
  scanToJoin: 'Scan to join',
  players: 'Players',
  you: 'You',
  host: 'Host',
  offline: 'offline',
  kick: 'Remove',
  kickConfirm: 'Remove {name} from the room?',
  rename: 'Rename',
  save: 'Save',
  cancel: 'Cancel',
  leave: 'Leave room',
  leaveConfirm: 'Leave this room?',
  share: 'Share link',
  copied: 'Link copied!',
  keepAwake: 'Keep screen on',
  keepAwakeUnsupported: 'Keeping the screen on needs HTTPS',
  startGame: 'Start game',
  startSoon: 'Gameplay arrives in the next milestone (M1).',
  waitingHost: 'Waiting for the host to start…',
  statusConnecting: 'Connecting…',
  statusReconnecting: 'Connection lost, retrying…',
  endedKicked: 'You were removed from the room.',
  endedLeft: 'You left the room.',
  endedReplaced: 'This room is open in another tab or device.',
  endedRoomClosed: 'The room has closed.',
  endedRoomNotFound: 'This room does not exist or has expired.',
  endedVersion: 'A new version is available. Please reload.',
  reconnectHere: 'Use it here',
  reload: 'Reload',
  backHome: 'Back to home',
  errorRoomFull: 'The room is full.',
  errorGeneric: 'Something went wrong ({code}).',
};

const dictionaries: Record<Lang, Dict> = { vi, en };
const LANG_KEY = 'bwf.lang';

function initialLang(): Lang {
  const saved = load(LANG_KEY);
  if (saved === 'vi' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export const i18n = $state({ lang: initialLang() });

export function setLang(lang: Lang): void {
  i18n.lang = lang;
  save(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

/** Translate a key, replacing `{param}` placeholders. Reactive on `i18n.lang`. */
export function t(key: MessageKey, params: Record<string, string> = {}): string {
  return dictionaries[i18n.lang][key].replace(
    /\{(\w+)\}/g,
    (_, name: string) => params[name] ?? '',
  );
}
