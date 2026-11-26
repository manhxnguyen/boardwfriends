/**
 * Offline server (M5): runs the whole game from one laptop on the local network, with no
 * internet. Same engine and RoomCore as the Cloudflare deployment; only the transport differs.
 *
 *   pnpm lan                       # builds the web app + this server, then starts it
 *   node apps/lan-server/dist/server.mjs --port 8080 --data ./rooms
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { RoomState } from '@bwf/engine';
import { PING } from '@bwf/protocol';
import {
  CREATE_ATTEMPTS,
  RoomCore,
  newPlayerId,
  randomRoomCode,
  routeApi,
  secureRandom,
  synthesize,
  synthesizeVieneu,
  listVieneuVoices,
  parseTtsRequest,
  TTS_HEADERS,
  VIENEU_HEADERS,
  type TtsVoicesResponse,
  type VieneuConfig,
  type Conn,
  type ConnData,
  type ServerInfoResponse,
} from '@bwf/server';
import { WebSocketServer, type WebSocket } from 'ws';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '8080' },
    host: { type: 'string', default: '0.0.0.0' },
    data: { type: 'string' },
    static: { type: 'string' },
  },
});

const here = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(args.static ?? join(here, '../../web/dist/client'));
const DATA_DIR = args.data ? resolve(args.data) : null;
const PORT = Number(args.port);
// Optional cloud voice; needs internet. GOOGLE_TTS_API_KEY=… pnpm lan
const TTS_KEY = process.env.GOOGLE_TTS_API_KEY;
// Self-hosted VieNeu-TTS on this or another machine of the local network (works offline):
// VIENEU_URL=http://192.168.1.50:8000 pnpm lan
const VIENEU: VieneuConfig | null = process.env.VIENEU_URL
  ? { url: process.env.VIENEU_URL, apiKey: process.env.VIENEU_API_KEY }
  : null;
const ttsCache = new Map<string, { audio: ArrayBuffer; headers: Record<string, string> }>();

// ---------------------------------------------------------------------------
// Rooms

interface LiveRoom {
  core: RoomCore;
  conns: Set<NodeConn>;
  timer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, LiveRoom>();

class NodeConn implements Conn {
  private info: ConnData = { playerId: null, display: false, since: Date.now() };
  pingAt: number | null = null;
  constructor(readonly ws: WebSocket) {}
  send(frame: string) {
    this.ws.send(frame);
  }
  close(code: number, reason: string) {
    this.ws.close(code, reason);
  }
  get open() {
    return this.ws.readyState === this.ws.OPEN;
  }
  data() {
    return this.info;
  }
  setData(data: ConnData) {
    this.info = data;
  }
  lastPingAt() {
    return this.pingAt;
  }
}

function makeRoom(code: string, state: RoomState | null): LiveRoom {
  const room: LiveRoom = { core: null as unknown as RoomCore, conns: new Set(), timer: null };
  room.core = new RoomCore(
    {
      connections: () => [...room.conns],
      save: async (s) => {
        if (s) await saveRoom(code, s);
        else {
          rooms.delete(code);
          await deleteRoom(code);
        }
      },
      setWake: async (at) => {
        if (room.timer) clearTimeout(room.timer);
        room.timer =
          at === null
            ? null
            : setTimeout(() => void room.core.wake(), Math.max(0, at - Date.now()));
      },
      now: () => Date.now(),
      random: secureRandom,
      newId: newPlayerId,
    },
    state,
  );
  rooms.set(code, room);
  return room;
}

// Optional persistence so a laptop restart does not lose an evening's game.
async function saveRoom(code: string, state: RoomState) {
  if (!DATA_DIR) return;
  const file = join(DATA_DIR, `${code}.json`);
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(state));
  await rename(tmp, file);
}

async function deleteRoom(code: string) {
  if (DATA_DIR) await rm(join(DATA_DIR, `${code}.json`), { force: true });
}

async function loadRooms() {
  if (!DATA_DIR) return;
  await mkdir(DATA_DIR, { recursive: true });
  for (const file of await readdir(DATA_DIR)) {
    if (!/^[A-Z]{4}\.json$/.test(file)) continue;
    const state = JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')) as RoomState;
    const room = makeRoom(file.slice(0, 4), state);
    void room.core.wake(); // expire or re-arm timers
  }
}

// ---------------------------------------------------------------------------
// HTTP

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

function lanOrigin(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal) return `http://${a.address}:${PORT}`;
    }
  }
  return null;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://local');
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(STATIC_DIR, requested);
  // Never serve outside the static directory.
  if (!file.startsWith(STATIC_DIR + sep) && file !== STATIC_DIR) return json(res, 403, {});
  if (!existsSync(file) || !extname(file)) file = join(STATIC_DIR, 'index.html'); // SPA fallback
  try {
    const body = await readFile(file);
    const hashed = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    json(res, 404, { error: 'not_found' });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  const route = routeApi(req.method ?? 'GET', url.pathname);
  if (!route) return serveStatic(req, res);
  switch (route.kind) {
    case 'error':
      return json(res, route.status, { error: route.error });
    case 'server':
      return json(res, 200, {
        lanOrigin: lanOrigin(),
        tts: !!TTS_KEY || !!VIENEU,
      } satisfies ServerInfoResponse);
    case 'tts-voices': {
      let vieneu: TtsVoicesResponse['vieneu'] = [];
      if (VIENEU) vieneu = await listVieneuVoices(VIENEU).catch(() => []);
      return json(res, 200, { google: !!TTS_KEY, vieneu } satisfies TtsVoicesResponse);
    }
    case 'tts': {
      const parsed = parseTtsRequest(url);
      if (!parsed.ok) return json(res, parsed.status, { error: parsed.error });
      if (!rooms.has(parsed.room)) return json(res, 404, { error: 'room_not_found' });
      const vieneuVoice = parsed.vieneuVoice;
      if (vieneuVoice !== null ? !VIENEU : !TTS_KEY) {
        return json(res, 501, { error: 'tts_not_configured' });
      }
      const key = `${vieneuVoice ?? 'google'}|${parsed.lang}|${parsed.text}`;
      try {
        let hit = ttsCache.get(key);
        if (!hit) {
          hit =
            vieneuVoice !== null && VIENEU
              ? {
                  audio: await synthesizeVieneu(VIENEU, vieneuVoice, parsed.text),
                  headers: VIENEU_HEADERS,
                }
              : {
                  audio: await synthesize(
                    {
                      apiKey: TTS_KEY!,
                      voiceVi: process.env.GOOGLE_TTS_VOICE_VI,
                      voiceEn: process.env.GOOGLE_TTS_VOICE_EN,
                    },
                    parsed.lang,
                    parsed.text,
                  ),
                  headers: TTS_HEADERS,
                };
          if (ttsCache.size > 500) ttsCache.clear();
          ttsCache.set(key, hit);
        }
        res.writeHead(200, hit.headers);
        return res.end(Buffer.from(hit.audio));
      } catch (error) {
        console.warn('tts failed:', (error as Error).message);
        return json(res, 502, { error: 'tts_failed' });
      }
    }
    case 'create':
      for (let i = 0; i < CREATE_ATTEMPTS; i++) {
        const code = randomRoomCode();
        if (rooms.has(code)) continue;
        await makeRoom(code, null).core.create(code);
        return json(res, 201, { code });
      }
      return json(res, 503, { error: 'no_free_code' });
    case 'info': {
      const info = rooms.get(route.code)?.core.info();
      return info ? json(res, 200, info) : json(res, 404, { error: 'room_not_found' });
    }
    case 'socket':
      return json(res, 426, { error: 'expected_websocket' });
  }
});

// ---------------------------------------------------------------------------
// WebSockets

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const route = routeApi('GET', new URL(req.url ?? '/', 'http://local').pathname);
  const room = route?.kind === 'socket' ? rooms.get(route.code) : undefined;
  if (!room?.core.state) {
    socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const conn = new NodeConn(ws);
    room.conns.add(conn);
    room.core.accept(conn);
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      const text = data.toString();
      if (text === PING) conn.pingAt = Date.now();
      void room.core.message(conn, text);
    });
    ws.on('close', () => {
      room.conns.delete(conn);
      void room.core.closed(conn);
    });
    ws.on('error', () => ws.terminate());
  });
});

// ---------------------------------------------------------------------------

await loadRooms();
if (!existsSync(join(STATIC_DIR, 'index.html'))) {
  console.warn(
    `⚠️  Web app not found in ${STATIC_DIR}. Run "pnpm build" first (or use "pnpm lan").`,
  );
}
server.listen(PORT, args.host, () => {
  const lan = lanOrigin();
  console.log('\n🐺 boardwfriends LAN server');
  console.log(`   Narrator (this Mac):  http://localhost:${PORT}`);
  console.log(`   Phones (same wifi):   ${lan ?? '(no network found)'}`);
  if (DATA_DIR) console.log(`   Saving rooms in:      ${DATA_DIR}`);
  const voices = [
    VIENEU && `VieNeu at ${VIENEU.url}`,
    TTS_KEY && 'Google Cloud TTS (needs internet)',
  ]
    .filter(Boolean)
    .join(' + ');
  console.log(`   Narration voice:      ${voices || 'browser voice only'}`);
  console.log('   Press Ctrl+C to stop.\n');
});
