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
step aloud with the system voice ("Linh" for Vietnamese on macOS), shows the clock and who is out, and
switches the whole screen between a night and a day tone with the game.

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

### At the table (recommended)

1. On the MacBook in the middle of the circle, open the site and press **“Tạo phòng trên màn hình này”**
   (Create a room on this screen) at the bottom of the home page. It shows a big QR code and room code.
2. Everyone scans the QR code with their phone. The first phone to join becomes the host and picks the deck.
3. Press **“Bật âm thanh”** on the MacBook so it can read the narration.

If a phone already created the room, the MacBook can open it with **“Màn hình dẫn truyện” → room code → Mở**.

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

### Narration voice

The narrator screen has a **Giọng đọc** dropdown. By default it reads with, in order of preference:

1. **[VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS)** (self-hosted, offline, LAN server only).
   The narrator shows feelings with VieNeu's emotion tags: it clears its throat before the game
   and votes, sighs at deaths and laughs when a side wins. Other voices and captions get the text
   without tags. Default voice: “Ngọc Linh”. VieNeu reads Vietnamese only; English lines use Google
   or the device voice. Each sentence takes about 0.5 s on an M-series Mac, and the next sentence is
   generated while the current one plays.

   ```sh
   # Terminal 1: in the VieNeu-TTS folder (HOST=0.0.0.0 when it runs on another PC)
   uv run python -m apps.openai_speech
   # Terminal 2: here
   VIENEU_URL=http://127.0.0.1:8000 pnpm lan   # optional VIENEU_API_KEY=…
   ```

2. **Google Cloud Text-to-Speech** (`vi-VN-Neural2-A`, the clearest Vietnamese) when the server has an
   API key: `pnpm --filter @bwf/worker exec wrangler secret put GOOGLE_TTS_API_KEY` (Cloudflare) or
   `GOOGLE_TTS_API_KEY=… pnpm lan:start` (LAN, needs internet). Optional `GOOGLE_TTS_VOICE_VI` /
   `GOOGLE_TTS_VOICE_EN` pick other voices. Free tier: 1M characters/month for Neural2.
3. A voice installed on the device for the right language (Edge "Natural" voices, macOS "Enhanced").
4. Never a voice of another language: if none is installed, the screen explains how to add one.

### Voice commands (paused)

Listening to players is switched off for now (`VOICE_COMMANDS` in `apps/web/src/lib/features.ts`);
narration is unaffected. When it was on:

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
