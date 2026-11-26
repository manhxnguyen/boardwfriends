// Bundles the LAN server into a single file that runs on plain Node (no TypeScript needed).
import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Optional native speed-ups that `ws` tries to load; not needed.
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
};

await build({ ...common, entryPoints: ['src/main.ts'], outfile: 'dist/server.mjs' });
// Voice bridge for the narrator screen on the Cloudflare site (`pnpm voice`).
await build({ ...common, entryPoints: ['src/voice.ts'], outfile: 'dist/voice.mjs' });
