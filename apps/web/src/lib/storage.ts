/**
 * localStorage can be missing or throw (private mode, blocked site data), so every access is
 * guarded and the app keeps working with in-memory fallbacks.
 */
const memory = new Map<string, string>();

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function save(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the in-memory copy.
  }
}
