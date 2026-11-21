import type { CreateRoomResponse } from '@bwf/protocol';
import { CREATE_ATTEMPTS, randomRoomCode, routeApi, type ServerInfoResponse } from '@bwf/server';

export { Room } from './room.ts';

/**
 * HTTP entry point. Thin routing only: every room lives in its own Durable Object, addressed by
 * its room code. Everything outside /api is served from static assets (see wrangler.jsonc).
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const route = routeApi(request.method, url.pathname);
    if (!route) return json({ error: 'not_found' }, 404);

    switch (route.kind) {
      case 'error':
        return json({ error: route.error }, route.status);
      case 'server':
        return json({ lanOrigin: null } satisfies ServerInfoResponse);
      case 'create':
        for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
          const code = randomRoomCode();
          if (await roomStub(env, code).create(code)) {
            return json({ code } satisfies CreateRoomResponse, 201);
          }
        }
        return json({ error: 'no_free_code' }, 503);
      case 'info': {
        const info = await roomStub(env, route.code).info();
        return info ? json(info) : json({ error: 'room_not_found' }, 404);
      }
      case 'socket':
        if (request.headers.get('Upgrade') !== 'websocket') {
          return json({ error: 'expected_websocket' }, 426);
        }
        return roomStub(env, route.code).fetch(request);
    }
  },
} satisfies ExportedHandler<Env>;

function roomStub(env: Env, code: string) {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
