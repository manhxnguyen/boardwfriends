import { load, save } from './storage.ts';

const TOKEN_KEY = 'bwf.token';
const NAME_KEY = 'bwf.name';

/**
 * Secret per-device token that lets this phone reclaim its seat after a reconnect.
 * Uses getRandomValues (available on plain http LAN addresses, unlike crypto.randomUUID).
 */
export function deviceToken(): string {
  const existing = load(TOKEN_KEY);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  save(TOKEN_KEY, token);
  return token;
}

export function savedName(): string {
  return load(NAME_KEY) ?? '';
}

export function rememberName(name: string): void {
  save(NAME_KEY, name.trim());
}
