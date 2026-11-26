/**
 * Local voice bridge (option B): lets the narrator screen opened from the Cloudflare site read with
 * VieNeu-TTS running on this same computer. The browser calls http://localhost:8090, which is
 * allowed from an https page because localhost counts as secure; VieNeu itself sends no CORS
 * headers, so this bridge adds them, for the allowed sites only.
 *
 *   pnpm voice                                  # VieNeu at http://127.0.0.1:8000
 *   VIENEU_URL=http://192.168.1.50:8000 pnpm voice
 *
 * Listens on 127.0.0.1 only: other devices (a TV) cannot use it. For those, see `pnpm tunnel`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parseArgs } from 'node:util';
import {
  listVieneuVoices,
  parseTtsRequest,
  routeApi,
  synthesizeVieneu,
  VIENEU_HEADERS,
  type TtsVoicesResponse,
  type VieneuConfig,
} from '@bwf/server';

const { values: args } = parseArgs({
  options: { port: { type: 'string', default: '8090' } },
});
const PORT = Number(args.port);
const VIENEU: VieneuConfig = {
  url: process.env.VIENEU_URL ?? 'http://127.0.0.1:8000',
  apiKey: process.env.VIENEU_API_KEY,
};

/** Sites whose pages may use this bridge. Extra ones: VOICE_ORIGINS=https://a,https://b */
const ORIGINS = [
  'https://boardwfriends.bwf-web.workers.dev',
  ...(process.env.VOICE_ORIGINS ?? '').split(',').filter(Boolean),
];
function originAllowed(origin: string): boolean {
  return ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

const cache = new Map<string, ArrayBuffer>();

function cors(req: IncomingMessage): Record<string, string> | null {
  const origin = req.headers.origin;
  if (!origin) return {}; // not a browser page (curl): fine, we only listen on loopback
  if (!originAllowed(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET',
    // Chrome's private network access preflight (public site → localhost).
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string>) {
  res.writeHead(status, {
    ...headers,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const headers = cors(req);
  if (!headers) return json(res, 403, { error: 'origin_not_allowed' }, {});
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }
  const url = new URL(req.url ?? '/', 'http://local');
  const route = routeApi(req.method ?? 'GET', url.pathname);
  if (route?.kind === 'tts-voices') {
    const vieneu = await listVieneuVoices(VIENEU).catch(() => []);
    return json(res, 200, { google: false, vieneu } satisfies TtsVoicesResponse, headers);
  }
  if (route?.kind !== 'tts') return json(res, 404, { error: 'not_found' }, headers);

  const parsed = parseTtsRequest(url);
  if (!parsed.ok) return json(res, parsed.status, { error: parsed.error }, headers);
  if (parsed.vieneuVoice === null) return json(res, 400, { error: 'bad_voice' }, headers);
  const key = `${parsed.vieneuVoice}|${parsed.text}`;
  try {
    let audio = cache.get(key);
    if (!audio) {
      audio = await synthesizeVieneu(VIENEU, parsed.vieneuVoice, parsed.text);
      if (cache.size > 500) cache.clear();
      cache.set(key, audio);
    }
    res.writeHead(200, { ...headers, ...VIENEU_HEADERS });
    return res.end(Buffer.from(audio));
  } catch (error) {
    console.warn('tts failed:', (error as Error).message);
    return json(res, 502, { error: 'tts_failed' }, headers);
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  const voices = await listVieneuVoices(VIENEU).catch(() => null);
  console.log('\n🎙️  boardwfriends voice bridge');
  console.log(`   Listening on:   http://localhost:${PORT} (this computer only)`);
  console.log(
    `   VieNeu:         ${VIENEU.url} ${voices ? `✓ ${voices.length} voices` : '✗ not answering yet'}`,
  );
  console.log('   On the narrator screen: press “🖥️ VieNeu trên máy này”.');
  console.log('   Press Ctrl+C to stop.\n');
});
