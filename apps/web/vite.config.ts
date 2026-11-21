import { networkInterfaces } from 'node:os';
import { cloudflare } from '@cloudflare/vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** First private IPv4 address of this machine, so the dev QR code works for phones on the same wifi. */
function lanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return null;
}

export default defineConfig(({ command }) => ({
  plugins: [svelte(), tailwindcss(), cloudflare({ configPath: '../worker/wrangler.jsonc' })],
  server: { host: true, port: 5173 },
  define: {
    // Dev only: never bake the build machine's address into a production bundle.
    __DEV_LAN_HOST__: JSON.stringify(command === 'serve' ? lanAddress() : null),
  },
}));
