import type { CreateRoomResponse } from '@bwf/protocol';
import {
  CREATE_ATTEMPTS,
  TTS_HEADERS,
  parseTtsRequest,
  randomRoomCode,
  routeApi,
  synthesize,
  type ServerInfoResponse,
} from '@bwf/server';

export { Room } from './room.ts';

/**
 * HTTP entry point. Thin routing only: every room lives in its own Durable Object, addressed by
 * its room code. Everything outside /api is served from static assets (see wrangler.jsonc).
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const route = routeApi(request.method, url.pathname);
    if (!route) return json({ error: 'not_found' }, 404);

    switch (route.kind) {
      case 'error':
        return json({ error: route.error }, route.status);
      case 'server':
        return json({
          lanOrigin: null,
          tts: !!env.GOOGLE_TTS_API_KEY,
        } satisfies ServerInfoResponse);
      case 'tts':
        return tts(request, env, ctx);
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

/** Cloud narration voice. Cached at the edge so a repeated sentence costs nothing. */
async function tts(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.GOOGLE_TTS_API_KEY) return json({ error: 'tts_not_configured' }, 501);
  const url = new URL(request.url);
  const req = parseTtsRequest(url);
  if (!req.ok) return json({ error: req.error }, req.status);

  // The cache key ignores the room so every room shares cached sentences.
  const key = new Request(
    `${url.origin}/api/tts?lang=${req.lang}&text=${encodeURIComponent(req.text)}`,
  );
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return hit;

  if (!(await roomStub(env, req.room).info())) return json({ error: 'room_not_found' }, 404);
  try {
    const audio = await synthesize(
      {
        apiKey: env.GOOGLE_TTS_API_KEY,
        voiceVi: env.GOOGLE_TTS_VOICE_VI,
        voiceEn: env.GOOGLE_TTS_VOICE_EN,
      },
      req.lang,
      req.text,
    );
    const response = new Response(audio, { headers: TTS_HEADERS });
    ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  } catch (error) {
    console.error('tts failed', error);
    return json({ error: 'tts_failed' }, 502);
  }
}

function roomStub(env: Env, code: string) {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
