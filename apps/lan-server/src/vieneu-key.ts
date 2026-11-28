import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { listVieneuVoices, type VieneuConfig } from '@bwf/server';

/** Where the shared VieNeu key lives: made once with `openssl rand -hex 24 > ~/.vieneu-key`. */
export const KEY_FILE = join(homedir(), '.vieneu-key');

/** VIENEU_API_KEY, or else the key file, so every terminal uses the same key. */
export function vieneuKey(): string | undefined {
  if (process.env.VIENEU_API_KEY) return process.env.VIENEU_API_KEY;
  try {
    return readFileSync(KEY_FILE, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}

/** One status line about VieNeu for the startup banner. */
export async function vieneuStatus(config: VieneuConfig): Promise<string> {
  try {
    const voices = await listVieneuVoices(config);
    return `✓ ${voices.length} voices`;
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'vieneu_401' || message === 'vieneu_403') {
      return config.apiKey
        ? '✗ VieNeu refused the key: start VieNeu and this server with the same key'
        : `✗ VieNeu needs a key: set VIENEU_API_KEY or put it in ${KEY_FILE}`;
    }
    return '✗ not answering yet (start VieNeu first)';
  }
}
