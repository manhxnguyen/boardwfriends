import type { CreateRoomResponse } from '@bwf/protocol';
import {
  CREATE_ATTEMPTS,
  TTS_HEADERS,
  VIENEU_HEADERS,
  listVieneuVoices,
  parseTtsRequest,
  synthesizeVieneu,
  randomRoomCode,
  routeApi,
  synthesize,
  type ServerInfoResponse,
  type TtsVoicesResponse,
  type VieneuConfig,
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
          tts: !!env.GOOGLE_TTS_API_KEY || !!vieneu(env),
        } satisfies ServerInfoResponse);
      case 'tts':
        return tts(request, env, ctx);
      case 'tts-voices': {
        // VieNeu runs at home; the Worker reaches it only through a tunnel (`pnpm tunnel`).
        const config = vieneu(env);
        const voices = config ? await listVieneuVoices(config).catch(() => []) : [];
        return json({
          google: !!env.GOOGLE_TTS_API_KEY,
          vieneu: voices,
        } satisfies TtsVoicesResponse);
      }
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

/** A VieNeu server behind a tunnel; only with an API key, since the tunnel is public. */
function vieneu(env: Env): VieneuConfig | null {
  return env.VIENEU_URL && env.VIENEU_API_KEY
    ? { url: env.VIENEU_URL, apiKey: env.VIENEU_API_KEY }
    : null;
}

/** Narration voice. Cached at the edge so a repeated sentence costs nothing. */
async function tts(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const req = parseTtsRequest(url);
  if (!req.ok) return json({ error: req.error }, req.status);
  const config = req.vieneuVoice !== null ? vieneu(env) : null;
  if (req.vieneuVoice !== null ? !config : !env.GOOGLE_TTS_API_KEY) {
    return json({ error: 'tts_not_configured' }, 501);
  }

  // The cache key ignores the room so every room shares cached sentences.
  const params = new URLSearchParams({ lang: req.lang, text: req.text });
  if (req.vieneuVoice !== null) params.set('voice', req.vieneuVoice);
  const key = new Request(`${url.origin}/api/tts?${params}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return hit;

  if (!(await roomStub(env, req.room).info())) return json({ error: 'room_not_found' }, 404);
  try {
    const response =
      config && req.vieneuVoice !== null
        ? new Response(await synthesizeVieneu(config, req.vieneuVoice, req.text), {
            headers: VIENEU_HEADERS,
          })
        : new Response(
            await synthesize(
              {
                apiKey: env.GOOGLE_TTS_API_KEY!,
                voiceVi: env.GOOGLE_TTS_VOICE_VI,
                voiceEn: env.GOOGLE_TTS_VOICE_EN,
              },
              req.lang,
              req.text,
            ),
            { headers: TTS_HEADERS },
          );
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
