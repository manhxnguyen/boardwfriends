import { isRoomCode, normalizeRoomCode } from '@bwf/protocol';

export type Route = { name: 'home' } | { name: 'room'; code: string };

function parse(pathname: string): Route {
  const match = /^\/r\/([^/]+)\/?$/.exec(pathname);
  if (match?.[1]) {
    const code = normalizeRoomCode(decodeURIComponent(match[1]));
    if (isRoomCode(code)) return { name: 'room', code };
  }
  return { name: 'home' };
}

/** Minimal history-based router: `/` and `/r/:code`. */
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

function navigate(path: string): void {
  if (location.pathname !== path) history.pushState(null, '', path);
  router.route = parse(path);
}
