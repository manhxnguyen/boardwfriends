import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  type CreateRoomResponse,
} from '@bwf/protocol';

export { Room } from './room.ts';

/**
 * HTTP entry point. Thin routing only: every room lives in its own Durable Object, addressed by
 * its room code.
 *
 *   POST /api/rooms              → create a room, returns { code }
 *   GET  /api/rooms/:code        → { code, players } or 404
 *   GET  /api/rooms/:code/ws     → WebSocket upgrade, forwarded to the room
 *
 * Everything else is served from static assets (see wrangler.jsonc).
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['api', 'rooms', code?, 'ws'?]

    if (parts[0] !== 'api' || parts[1] !== 'rooms') return json({ error: 'not_found' }, 404);

    if (parts.length === 2) {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      return createRoom(env);
    }

    const code = normalizeRoomCode(parts[2] ?? '');
    if (!isRoomCode(code)) return json({ error: 'room_not_found' }, 404);
    const room = roomStub(env, code);

    if (parts.length === 3 && request.method === 'GET') {
      const info = await room.info();
      return info ? json(info) : json({ error: 'room_not_found' }, 404);
    }

    if (parts.length === 4 && parts[3] === 'ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return json({ error: 'expected_websocket' }, 426);
      }
      return room.fetch(request);
    }

    return json({ error: 'not_found' }, 404);
  },
} satisfies ExportedHandler<Env>;

async function createRoom(env: Env): Promise<Response> {
  // 24^4 ≈ 330k codes; collisions are rare, retry a few times just in case.
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomRoomCode();
    if (await roomStub(env, code).create(code)) {
      return json({ code } satisfies CreateRoomResponse, 201);
    }
  }
  return json({ error: 'no_free_code' }, 503);
}

function roomStub(env: Env, code: string) {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
