# boardwfriends

Board games with friends: a mobile-first web app for playing **Werewolf** in person, one phone each,
with a laptop as the narrator. See [plan.md](plan.md) for the roadmap and [docs/rules](docs/rules) for
the cited rules.

Idea, product direction and decisions: Manh Nguyen. Implementation assisted by Claude.

Live: **https://boardwfriends.bwf-web.workers.dev**

## Game modes

| Mode                                                                 | Players | Who moderates                                                                              |
| -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| **Classic Werewolf** (Ultimate Werewolf rules, 13 roles)             | 3–20    | The app (narrator screen on a laptop) **or** a person (the app deals and shows the script) |
| **One Night Werewolf** (One Night Ultimate Werewolf rules, 11 roles) | 3–10    | The app                                                                                    |

The **narrator screen** (`/r/<CODE>/tv`, open it on the MacBook in the middle of the circle) reads every
step aloud with the system voice ("Linh" for Vietnamese on macOS), shows the clock and who is out, and can
optionally **listen for voice commands** ("tôi đề cử Bình", "ủng hộ", "bỏ phiếu", "tạm dừng", …).

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

1. On the MacBook run `pnpm dev` and open <http://localhost:5173>. Create a room.
2. Phones on the same wifi scan the QR code (it points at the MacBook's LAN address).
3. For an app-moderated game, open the narrator link shown in the room on the MacBook and press
   **“Bật âm thanh”** (browsers only allow speech after a click).

macOS may ask to allow incoming connections for `node`: accept it.

### Playing without internet (LAN server)

```sh
pnpm lan          # builds everything, then serves the app on port 8080
```

- Phones open the address printed as “Phones (same wifi)”; the MacBook opens <http://localhost:8080>
  (the microphone only works on `localhost` or HTTPS).
- Add `--data ./rooms` (e.g. `pnpm lan:start -- --data ./rooms`) to keep rooms across restarts.

### Voice commands (experimental)

Enable “MacBook nghe lệnh giọng nói” in the room settings, then press 🎤 on the narrator screen.
Works in Chrome and Safari on macOS. **Privacy:** Chrome sends the audio to Google for recognition, Safari
to Apple; nothing is recorded by this app, and listening stops when you press 🎤 again.

## Scripts

| Command            | What it does                                               |
| ------------------ | ---------------------------------------------------------- |
| `pnpm dev`         | Local dev server (web + Worker + Durable Objects)          |
| `pnpm test`        | Unit tests (engine, protocol, server core, voice parser)   |
| `pnpm typecheck`   | TypeScript + Svelte checks for every package               |
| `pnpm smoke [url]` | Multi-client WebSocket smoke test against a running server |
| `pnpm lan`         | Build and run the offline LAN server                       |
| `pnpm format`      | Prettier                                                   |
| `pnpm build`       | Production build                                           |
| `pnpm cf:deploy`   | Build and deploy to Cloudflare (needs `wrangler login`)    |

## Layout

```text
apps/web            Svelte 5 PWA: player screens + narrator screen
apps/worker         Cloudflare Worker + Room Durable Object (adapter)
apps/lan-server     Node offline server (adapter)
packages/server     RoomCore: transport-agnostic room server
packages/engine     Pure game logic (no I/O), fully unit tested
packages/protocol   Client ↔ server message types and validation
docs/rules          Game rules with citations and app decisions
```

Card art: drop images named `role-<id>.png` into `apps/web/src/assets/art/` (see
[docs/art-spec.md](docs/art-spec.md)); they replace the emoji placeholders automatically.

Architecture and coding rules: [architecture_guidelines.md](architecture_guidelines.md),
[instructions.md](instructions.md).
