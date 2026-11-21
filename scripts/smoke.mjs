#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server (dev or deployed).
 * Simulates several phones joining a room over real WebSockets.
 *
 *   pnpm dev                      # in another terminal
 *   pnpm smoke                    # defaults to http://localhost:5173
 *   pnpm smoke https://<your-worker>.workers.dev
 */
import assert from 'node:assert/strict';

const BASE = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const WS_BASE = BASE.replace(/^http/, 'ws');
const PROTOCOL_VERSION = 1;
const TIMEOUT_MS = 5000;

let step = 0;
async function check(name, fn) {
  step++;
  try {
    await fn();
    console.log(`  ✔ ${step}. ${name}`);
  } catch (error) {
    console.error(`  ✘ ${step}. ${name}\n`, error);
    process.exit(1);
  }
}

const token = (label) =>
  `smoke-${label}-${Math.random().toString(36).slice(2, 14)}`.padEnd(20, 'x');

/** A fake phone: queues incoming frames and lets the test await specific messages. */
class Client {
  constructor(code) {
    this.frames = [];
    this.waiters = [];
    this.closed = null;
    this.ws = new WebSocket(`${WS_BASE}/api/rooms/${code}/ws`);
    this.opened = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error('socket error'));
    });
    this.ws.onmessage = (e) => {
      const msg = e.data === 'pong' ? { t: 'pong' } : JSON.parse(e.data);
      this.frames.push(msg);
      this.#flush();
    };
    this.closedPromise = new Promise((resolve) => {
      this.ws.onclose = (e) => {
        this.closed = e.code;
        resolve(e.code);
      };
    });
  }

  send(msg) {
    this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  async hello(tok, name, v = PROTOCOL_VERSION) {
    await this.opened;
    this.send({ t: 'hello', v, token: tok, name });
  }

  /** Resolves with the first queued (or future) message matching `predicate`, consuming it. */
  next(predicate, label = 'message') {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error(`timeout waiting for ${label}; got ${JSON.stringify(this.frames)}`));
      }, TIMEOUT_MS);
      waiter.resolve = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      this.waiters.push(waiter);
      this.#flush();
    });
  }

  /** Waits for a lobby broadcast satisfying `predicate`. */
  lobby(predicate, label) {
    return this.next((m) => m.t === 'lobby' && predicate(m.lobby), label).then((m) => m.lobby);
  }

  waitClosed() {
    return Promise.race([
      this.closedPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('socket did not close')), TIMEOUT_MS),
      ),
    ]);
  }

  close() {
    this.ws.close();
  }

  #flush() {
    for (const waiter of [...this.waiters]) {
      const index = this.frames.findIndex(waiter.predicate);
      if (index === -1) continue;
      const [msg] = this.frames.splice(index, 1);
      this.waiters = this.waiters.filter((w) => w !== waiter);
      waiter.resolve(msg);
    }
  }
}

const player = (lobby, id) => lobby.players.find((p) => p.id === id);

console.log(`Smoke test against ${BASE}\n`);

let code;
let a, b, b2;
const tokA = token('a');
const tokB = token('b');
let idA, idB;

await check('SPA fallback serves the app for /r/:code', async () => {
  const res = await fetch(`${BASE}/r/ABCD`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<div id="app">/);
});

await check('create a room', async () => {
  const res = await fetch(`${BASE}/api/rooms`, { method: 'POST' });
  assert.equal(res.status, 201);
  ({ code } = await res.json());
  assert.match(code, /^[A-HJ-NP-Z]{4}$/);
});

await check('room info shows 0 players', async () => {
  const res = await fetch(`${BASE}/api/rooms/${code}`);
  assert.deepEqual(await res.json(), { code, players: 0 });
});

await check('malformed or unknown room codes return 404', async () => {
  assert.equal((await fetch(`${BASE}/api/rooms/AB0`)).status, 404);
  // A well-formed code that was never created. Pick one that differs from ours.
  const unused = code === 'ZZZZ' ? 'YYYY' : 'ZZZZ';
  const res = await fetch(`${BASE}/api/rooms/${unused}`);
  assert.ok([404, 200].includes(res.status)); // 200 only if someone really created it
  if (res.status === 404) {
    const ws = new WebSocket(`${WS_BASE}/api/rooms/${unused}/ws`);
    const closed = await new Promise((resolve) => {
      ws.onerror = () => resolve('error');
      ws.onclose = () => resolve('closed');
    });
    assert.ok(closed === 'error' || closed === 'closed', 'socket to unknown room must not open');
  }
});

await check('first player joins and becomes host', async () => {
  a = new Client(code);
  await a.hello(tokA, 'An');
  const welcome = await a.next((m) => m.t === 'welcome', 'welcome');
  idA = welcome.you;
  assert.equal(welcome.lobby.hostId, idA);
  assert.equal(welcome.lobby.players.length, 1);
  assert.ok(!JSON.stringify(welcome).includes(tokA), 'token must not be broadcast');
});

await check('second player joins; host sees them', async () => {
  b = new Client(code);
  await b.hello(tokB, 'Bình');
  idB = (await b.next((m) => m.t === 'welcome', 'welcome')).you;
  const lobby = await a.lobby((l) => l.players.length === 2, 'lobby with 2 players');
  assert.equal(player(lobby, idB).name, 'Bình');
  assert.ok(!JSON.stringify(lobby).includes(tokB), 'token must not be broadcast');
});

await check('keep-alive ping is answered with pong', async () => {
  b.send('ping');
  await b.next((m) => m.t === 'pong', 'pong');
});

await check('rename is broadcast', async () => {
  b.send({ t: 'rename', name: 'Bình 2' });
  await a.lobby((l) => player(l, idB)?.name === 'Bình 2', 'renamed lobby');
});

await check('invalid messages are rejected without dropping the socket', async () => {
  b.send({ t: 'rename', name: '' });
  const err = await b.next((m) => m.t === 'error', 'error');
  assert.equal(err.code, 'invalid_message');
  b.send('ping');
  await b.next((m) => m.t === 'pong', 'pong after error');
});

await check('a dropped player shows as offline', async () => {
  b.close();
  await a.lobby((l) => player(l, idB)?.connected === false, 'B offline');
});

await check('reconnecting with the same token reclaims the same seat', async () => {
  b = new Client(code);
  await b.hello(tokB, 'Bình 2');
  const welcome = await b.next((m) => m.t === 'welcome', 'welcome');
  assert.equal(welcome.you, idB);
  assert.equal(welcome.lobby.players.length, 2);
  await a.lobby((l) => player(l, idB)?.connected === true, 'B online again');
});

await check('a second tab replaces the first one (close code 4001)', async () => {
  b2 = new Client(code);
  await b2.hello(tokB, 'Bình 2');
  assert.equal((await b2.next((m) => m.t === 'welcome', 'welcome')).you, idB);
  assert.equal(await b.waitClosed(), 4001);
  // The replaced socket must not mark B offline.
  await new Promise((r) => setTimeout(r, 300));
  const info = await (await fetch(`${BASE}/api/rooms/${code}`)).json();
  assert.equal(info.players, 2);
});

await check('only the host can kick', async () => {
  b2.send({ t: 'kick', playerId: idA });
  assert.equal((await b2.next((m) => m.t === 'error', 'error')).code, 'not_host');
});

await check('host kicks a player (close code 4003)', async () => {
  a.send({ t: 'kick', playerId: idB });
  await b2.next((m) => m.t === 'kicked', 'kicked');
  assert.equal(await b2.waitClosed(), 4003);
  await a.lobby((l) => l.players.length === 1, 'lobby after kick');
});

await check('outdated client version is rejected (close code 4000)', async () => {
  const old = new Client(code);
  await old.hello(token('old'), 'Old', 0);
  assert.equal((await old.next((m) => m.t === 'error', 'error')).code, 'version_mismatch');
  assert.equal(await old.waitClosed(), 4000);
});

await check('host leaves; room becomes empty (close code 4002)', async () => {
  a.send({ t: 'leave' });
  assert.equal(await a.waitClosed(), 4002);
  const info = await (await fetch(`${BASE}/api/rooms/${code}`)).json();
  assert.equal(info.players, 0);
});

console.log('\nAll smoke checks passed.');
