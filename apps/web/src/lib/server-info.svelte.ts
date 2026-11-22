import type { ServerInfoResponse } from '@bwf/server';

/**
 * Facts about the server we are talking to. The offline LAN server reports the address phones
 * should use, so the QR code works even when the MacBook itself opened http://localhost.
 */
export const serverInfo = $state<ServerInfoResponse>({ lanOrigin: null, tts: false });

fetch('/api/server')
  .then((res) => (res.ok ? (res.json() as Promise<ServerInfoResponse>) : null))
  .then((info) => {
    if (!info) return;
    serverInfo.lanOrigin = info.lanOrigin;
    serverInfo.tts = info.tts === true;
  })
  .catch(() => {
    // Older server or offline: fall back to location-based URLs.
  });
