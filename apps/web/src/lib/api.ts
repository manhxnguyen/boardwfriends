import type { CreateRoomResponse, RoomInfoResponse } from '@bwf/protocol';
import { serverInfo } from './server-info.svelte.ts';

export class ApiError extends Error {
  constructor(readonly code: 'room_not_found' | 'network' | 'server') {
    super(code);
  }
}

export async function createRoom(): Promise<string> {
  const res = await request('/api/rooms', { method: 'POST' });
  if (!res.ok) throw new ApiError('server');
  return ((await res.json()) as CreateRoomResponse).code;
}

/** Returns room info, or null if the room does not exist. */
export async function getRoom(code: string): Promise<RoomInfoResponse | null> {
  const res = await request(`/api/rooms/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError('server');
  return (await res.json()) as RoomInfoResponse;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch {
    throw new ApiError('network');
  }
}

/** Origin other phones should use: LAN server address, dev LAN address, or this page's origin. */
function shareOrigin(): string {
  if (serverInfo.lanOrigin) return serverInfo.lanOrigin;
  const { protocol, hostname, port, origin } = location;
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  return local && __DEV_LAN_HOST__
    ? `${protocol}//${__DEV_LAN_HOST__}${port ? `:${port}` : ''}`
    : origin;
}

/** URL other phones should open (QR code). Reactive: re-read inside $derived. */
export function joinUrl(code: string): string {
  return `${shareOrigin()}/r/${code}`;
}

/**
 * Narrator screen URL for the MacBook. Kept on this page's origin: on the LAN server the Mac
 * should use http://localhost, the only plain-http address where the microphone is allowed.
 */
export function narratorUrl(code: string): string {
  return `${location.origin}/r/${code}/tv`;
}
