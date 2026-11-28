import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { listVieneuVoices, type VieneuConfig } from '@bwf/server';

/** Where the shared VieNeu key lives: made once with `openssl rand -hex 24 > ~/.vieneu-key`. */
export const KEY_FILE = join(homedir(), '.vieneu-key');

function fileKey(): string | undefined {
  try {
    return readFileSync(KEY_FILE, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}

/** VIENEU_API_KEY, or else the key file, so every terminal uses the same key. */
export function vieneuKey(): string | undefined {
  return process.env.VIENEU_API_KEY || fileKey();
}

/**
 * One status line about VieNeu for the startup banner. If the key from the environment is refused
 * but the key file works (an old `export` left in the terminal), switches `config` to the file key.
 */
export async function vieneuStatus(config: VieneuConfig): Promise<string> {
  try {
    const voices = await listVieneuVoices(config);
    return `✓ ${voices.length} voices`;
  } catch (error) {
    const message = (error as Error).message;
    const refused = message === 'vieneu_401' || message === 'vieneu_403';
    const file = fileKey();
    if (refused && file && file !== config.apiKey) {
      const voices = await listVieneuVoices({ ...config, apiKey: file }).catch(() => null);
      if (voices) {
        config.apiKey = file;
        return `✓ ${voices.length} voices (old VIENEU_API_KEY in this terminal ignored; using ${KEY_FILE})`;
      }
    }
    if (refused) {
      return config.apiKey
        ? '✗ VieNeu refused the key: start VieNeu and this server with the same key'
        : `✗ VieNeu needs a key: set VIENEU_API_KEY or put it in ${KEY_FILE}`;
    }
    return '✗ not answering yet (start VieNeu first)';
  }
}
