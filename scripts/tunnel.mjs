#!/usr/bin/env node
/**
 * Puts the VieNeu-TTS server of this computer behind a free Cloudflare quick tunnel and tells the
 * Cloudflare Worker where to find it, so the narrator screen on ANY device (a TV too) can read
 * with VieNeu while everyone plays on the Cloudflare site.
 *
 *   openssl rand -hex 24 > ~/.vieneu-key      # once: the key protects VieNeu on the internet
 *   # Terminal 1, in the VieNeu-TTS folder:
 *   VIENEU_API_KEY=$(cat ~/.vieneu-key) uv run python -m apps.openai_speech
 *   # Terminal 2, here (reads ~/.vieneu-key by itself):
 *   pnpm tunnel
 *
 * Needs `cloudflared` (brew install cloudflared) and `wrangler login`. The quick tunnel address
 * changes on every run; this script updates the Worker's VIENEU_URL secret each time.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { request } from 'node:https';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VIENEU_URL = (process.env.VIENEU_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
// The same key in every terminal: VIENEU_API_KEY, or the file made once with
// `openssl rand -hex 24 > ~/.vieneu-key`.
const KEY_FILE = join(homedir(), '.vieneu-key');
let KEY = process.env.VIENEU_API_KEY || readKeyFile();
function readKeyFile() {
  try {
    return readFileSync(KEY_FILE, 'utf8').trim();
  } catch {
    return undefined;
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function status(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5_000) });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * Status of an https URL, resolving its host through Cloudflare DNS-over-HTTPS. The Mac's own
 * resolver caches the "not found" answer it got before the brand-new tunnel host existed.
 */
async function publicStatus(url, headers) {
  const { hostname } = new URL(url);
  try {
    const dns = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5_000),
    }).then((r) => r.json());
    const ip = dns.Answer?.find((a) => a.type === 1)?.data;
    if (!ip) return 0;
    return await new Promise((resolve) => {
      const req = request(
        url,
        {
          headers,
          timeout: 10_000,
          lookup: (_h, opts, cb) =>
            opts?.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4),
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('error', () => resolve(0));
      req.on('timeout', () => req.destroy());
      req.end();
    });
  } catch {
    return 0;
  }
}

function run(cmd, cmdArgs, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
    if (input) child.stdin.end(input);
  });
}

/** Stores a Worker secret without printing it (value goes through stdin). */
async function putSecret(name, value) {
  await run('pnpm', ['--filter', '@bwf/worker', 'exec', 'wrangler', 'secret', 'put', name], value);
}

// 1. Checks before exposing anything.
if (!KEY || KEY.length < 16) {
  fail(
    `No VieNeu key. Make one once:  openssl rand -hex 24 > ${KEY_FILE}\n` +
      '  then start VieNeu with:      VIENEU_API_KEY=$(cat ~/.vieneu-key) uv run python -m apps.openai_speech\n' +
      '  The tunnel is public: without a key anyone could use your computer to make speech.',
  );
}
try {
  await run('cloudflared', ['--version']);
} catch {
  fail('cloudflared is not installed. Install it with: brew install cloudflared');
}
let withKey = await status(`${VIENEU_URL}/v1/voices`, { Authorization: `Bearer ${KEY}` });
if (withKey === 0) fail(`VieNeu is not answering at ${VIENEU_URL}. Start it first.`);
// An old `export VIENEU_API_KEY=…` left in this terminal wins over the file; try the file too.
const fileKey = readKeyFile();
if ((withKey === 401 || withKey === 403) && fileKey && fileKey !== KEY) {
  const retry = await status(`${VIENEU_URL}/v1/voices`, { Authorization: `Bearer ${fileKey}` });
  if (retry === 200) {
    console.log(
      `⚠️  VIENEU_API_KEY in this terminal is an old key; using ${KEY_FILE}.\n` +
        '   Run "unset VIENEU_API_KEY" to stop seeing this.',
    );
    KEY = fileKey;
    withKey = retry;
  }
}
if (withKey === 401 || withKey === 403)
  fail(
    `VieNeu refused the key. Start VieNeu with the same one:\n` +
      '  VIENEU_API_KEY=$(cat ~/.vieneu-key) uv run python -m apps.openai_speech',
  );
const withoutKey = await status(`${VIENEU_URL}/v1/voices`);
if (withoutKey === 200) {
  fail(
    'VieNeu is running WITHOUT a key. Restart it with VIENEU_API_KEY=… before opening a tunnel.',
  );
}

// 2. Open the quick tunnel and wait for its address.
console.log('Opening a Cloudflare quick tunnel…');
const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', VIENEU_URL], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const stop = () => {
  tunnel.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
tunnel.on('exit', (code) => {
  console.log(`cloudflared stopped (${code ?? 'signal'}).`);
  process.exit(code ?? 0);
});

const publicUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('no tunnel address after 30 s')), 30_000);
  const onData = (data) => {
    const match = String(data).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearTimeout(timer);
      resolve(match[0]);
    }
  };
  tunnel.stdout.on('data', onData);
  tunnel.stderr.on('data', onData);
}).catch((error) => {
  tunnel.kill();
  fail(error.message);
});

// 3. Wait until the address answers (DNS can take a few seconds), then tell the Worker.
let ready = false;
for (let i = 0; i < 30 && !ready; i++) {
  ready =
    (await publicStatus(`${publicUrl}/v1/voices`, { Authorization: `Bearer ${KEY}` })) === 200;
  if (!ready) await new Promise((r) => setTimeout(r, 2_000));
}
if (!ready) {
  tunnel.kill();
  fail(`The tunnel ${publicUrl} does not answer. Try again in a minute.`);
}

console.log('Updating the Worker secrets VIENEU_URL and VIENEU_API_KEY…');
try {
  await putSecret('VIENEU_URL', publicUrl);
  await putSecret('VIENEU_API_KEY', KEY);
} catch (error) {
  tunnel.kill();
  fail(`wrangler secret put failed (run "wrangler login"?):\n${error.message}`);
}

console.log(`\n🎙️  VieNeu is reachable by the Cloudflare site through ${publicUrl}`);
console.log('   Reload the narrator screen: the VieNeu voices appear in “Giọng đọc”.');
console.log('   Keep this window and VieNeu running while you play. Ctrl+C closes the tunnel');
console.log('   (the site then falls back to the Google voice).\n');
