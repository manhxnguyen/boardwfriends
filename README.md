# boardwfriends

Board games with friends: a mobile-first web app for playing **Werewolf** in person, one phone each,
with a laptop as the narrator. See [plan.md](plan.md) for the roadmap and [docs/rules](docs/rules) for
the cited rules.

## Requirements

- Node.js ≥ 22 (developed on 26)
- pnpm ≥ 10 (`corepack enable` or `npm i -g pnpm`)

## Getting started

```sh
pnpm install
pnpm dev
```

`pnpm dev` runs the web app **and** the Cloudflare Worker + Durable Objects locally (via
`@cloudflare/vite-plugin`) on port 5173, reachable from your local network.

### Playing on real phones (same wifi)

1. On the MacBook run `pnpm dev` and open <http://localhost:5173>.
2. Create a room. The QR code automatically points at the MacBook's LAN address
   (e.g. `http://192.168.x.x:5173/r/ABCD`).
3. Phones on the same wifi scan the QR code and join.

Notes for local network testing:

- macOS may ask to allow incoming connections for `node`: accept it.
- "Keep screen on" needs HTTPS, so it only works on the deployed site (or on `localhost`).

## Scripts

| Command            | What it does                                               |
| ------------------ | ---------------------------------------------------------- |
| `pnpm dev`         | Local dev server (web + Worker + Durable Objects)          |
| `pnpm test`        | Unit tests (engine, protocol)                              |
| `pnpm typecheck`   | TypeScript + Svelte checks for every package               |
| `pnpm smoke [url]` | Multi-client WebSocket smoke test against a running server |
| `pnpm format`      | Prettier                                                   |
| `pnpm build`       | Production build                                           |
| `pnpm deploy`      | Build and deploy to Cloudflare (needs `wrangler login`)    |

## Layout

```text
apps/web          Svelte 5 PWA (player screens)
apps/worker       Cloudflare Worker + Room Durable Object (transport only)
packages/engine   Pure game logic (no I/O), fully unit tested
packages/protocol Client ↔ server message types and validation
docs/rules        Game rules with citations
```

Architecture and coding rules: [architecture_guidelines.md](architecture_guidelines.md),
[instructions.md](instructions.md).
