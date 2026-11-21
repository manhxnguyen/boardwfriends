import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '@bwf/protocol';

/**
 * Shared HTTP routing for both servers:
 *
 *   GET  /api/server             → { lanOrigin } (LAN server: address phones should use)
 *   POST /api/rooms              → create a room, returns { code }
 *   GET  /api/rooms/:code        → { code, players } or 404
 *   GET  /api/rooms/:code/ws     → WebSocket upgrade
 */
export type ApiRoute =
  | { kind: 'server' }
  | { kind: 'create' }
  | { kind: 'info'; code: string }
  | { kind: 'socket'; code: string }
  | { kind: 'error'; status: number; error: string };

export function routeApi(method: string, pathname: string): ApiRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;
  if (parts[1] === 'server' && parts.length === 2 && method === 'GET') return { kind: 'server' };
  if (parts[1] !== 'rooms') return { kind: 'error', status: 404, error: 'not_found' };
  if (parts.length === 2) {
    return method === 'POST'
      ? { kind: 'create' }
      : { kind: 'error', status: 405, error: 'method_not_allowed' };
  }
  const code = normalizeRoomCode(parts[2] ?? '');
  if (!isRoomCode(code)) return { kind: 'error', status: 404, error: 'room_not_found' };
  if (parts.length === 3 && method === 'GET') return { kind: 'info', code };
  if (parts.length === 4 && parts[3] === 'ws') return { kind: 'socket', code };
  return { kind: 'error', status: 404, error: 'not_found' };
}

export function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

/** 24^4 ≈ 330k codes; collisions are rare, so a few attempts are plenty. */
export const CREATE_ATTEMPTS = 8;

export interface ServerInfoResponse {
  /** Address other phones should open (LAN server only; null on the cloud). */
  lanOrigin: string | null;
}
