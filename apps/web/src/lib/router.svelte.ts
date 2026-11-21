import { isRoomCode, normalizeRoomCode } from '@bwf/protocol';

export type Route =
  | { name: 'home' }
  | { name: 'room'; code: string }
  /** Narrator screen for the MacBook: /r/ABCD/tv */
  | { name: 'display'; code: string };

function parse(pathname: string): Route {
  const match = /^\/r\/([^/]+)(\/tv)?\/?$/.exec(pathname);
  if (match?.[1]) {
    const code = normalizeRoomCode(decodeURIComponent(match[1]));
    if (isRoomCode(code)) return match[2] ? { name: 'display', code } : { name: 'room', code };
  }
  return { name: 'home' };
}

/** Minimal history-based router: `/`, `/r/:code` and `/r/:code/tv`. */
export const router = $state<{ route: Route }>({ route: parse(location.pathname) });

addEventListener('popstate', () => {
  router.route = parse(location.pathname);
});

export function goHome(): void {
  navigate('/');
}

export function goToRoom(code: string): void {
  navigate(`/r/${code}`);
}

/** Narrator screen for the laptop in the middle of the circle. */
export function goToDisplay(code: string): void {
  navigate(`/r/${code}/tv`);
}

function navigate(path: string): void {
  if (location.pathname !== path) history.pushState(null, '', path);
  router.route = parse(path);
}
