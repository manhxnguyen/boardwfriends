import type { CreateRoomResponse, RoomInfoResponse } from '@bwf/protocol';

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

/** URL other phones should open. In dev on localhost, swap in the LAN address so the QR code works. */
export function joinUrl(code: string): string {
  const { protocol, hostname, port, origin } = location;
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  const base =
    local && __DEV_LAN_HOST__
      ? `${protocol}//${__DEV_LAN_HOST__}${port ? `:${port}` : ''}`
      : origin;
  return `${base}/r/${code}`;
}
