/** Deep copy of plain JSON state (game states are JSON-serializable by design). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
