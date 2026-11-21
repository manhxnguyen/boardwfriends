# boardwfriends Architecture Guidelines

## Tech Stack

- Language: TypeScript (strict) everywhere, shared between client and server
- Frontend: Svelte 5 (runes) + Vite, installable PWA, Tailwind CSS v4
- Realtime backend: Cloudflare Workers + Durable Objects (one Durable Object per game room) using the WebSocket Hibernation API; Durable Object Alarms for phase timers
- Static hosting: Cloudflare Workers Static Assets (deployed together with the Worker)
- Offline LAN server: Node (≥ 22) + `ws`, bundled with esbuild into one file, running the same engine and RoomCore (Bun was the first plan, but Node is what the team already has installed)
- Validation: Valibot schemas for every client → server message
- Testing: Vitest (unit, engine), Playwright (multi-client E2E)
- Tooling: pnpm workspaces, Wrangler, Prettier, ESLint
- Fallback hosting: AWS Lightsail/EC2 running the LAN server bundle (only if Cloudflare is not enough)
- No database: room state lives in Durable Object storage and expires automatically

## Repository Layout

```text
apps/web         Svelte PWA: player screen + narrator (moderator) screen
apps/worker      Cloudflare Worker (HTTP routing) + Room Durable Object (adapter around RoomCore)
apps/lan-server  Node HTTP + WebSocket server for offline play (adapter around RoomCore)
packages/server  RoomCore: transport-agnostic room server (sockets, broadcasts, timers, liveness)
packages/engine  Pure game logic: phases, roles, rules, win conditions
packages/protocol  Message types + Valibot schemas shared by client and server
apps/web/src/lib/content  Vietnamese/English text, narration, role texts (client only for now)
apps/web/src/assets/art   Card art, picked up automatically by file name
docs/rules       Rules for each game mode, every rule cited to its source
```

## Design Patterns & Standards

- **Pure engine, thin transport.** `packages/engine` has no I/O, no timers, no `Date.now()`, no `Math.random()`. The core is a reducer: `apply(state, action, ctx) -> { state, events }`, with time and a seeded RNG injected through `ctx`. Durable Objects and the LAN server are thin adapters around `RoomCore` (packages/server), which routes messages, persists state, schedules wake-ups and sends per-recipient views. This is the equivalent of "skinny controllers + service objects".
- **Roles are plugins.** Each role lives in its own module (`roles/seer.ts`) exposing `id`, `team`, `nightOrder`, `canAct`, `resolve`, optional `onDeath` and `winCondition`. Adding a role must not require editing a central `switch`.
- **Explicit phase machine.** Phases are a discriminated union (`LOBBY`, `ROLE_REVEAL`, `NIGHT`, `DAY`, `VOTE`, `GAME_OVER`, …). Only the engine changes phases.
- **Per-player projection.** `viewFor(state, playerId)` returns only what that player may know. Clients never receive the full state. The narrator screen gets its own public-only projection.
- **Variant flags, not forks.** Differences between rule editions (reveal role on death, tie handling, win at parity, …) are typed options in the room config, each documented in `docs/rules`.
- **Protocol first.** Every message is defined once in `packages/protocol` and validated on receipt. Messages are versioned so an outdated client is rejected cleanly.
- **Components.** Reusable UI lives in `apps/web/src/lib/components`. Screens are composed from components and hold no game logic; they render the projection and send intents.

## Security

- The server is authoritative: clients send _intents_ (`vote`, `nightAction`), and the engine validates legality (right phase, right role, alive, valid target).
- Room join uses a short room code + a per-player secret `playerToken` (random, stored in `localStorage`) to reclaim a seat after reconnecting. Only the host token can start, configure or end a game.
- Rate-limit messages per socket and cap the room size.
- Never log or broadcast hidden information.

## Performance

- Use WebSocket Hibernation so idle rooms cost nothing; keep socket attachments small (limit 2 KB) and put larger data in Durable Object storage.
- Send small JSON diffs/projections, never the full state history.
- Initial client JS budget: ≤ 100 KB gzip. Card art served as WebP with explicit width/height and lazy loading.
- Target smooth 60 fps animations on mid-range Android phones; prefer CSS transforms over JS animation.

## Reliability (mobile realities)

- Locking the screen drops the socket: clients reconnect automatically with backoff and resync from the projection.
- Use the Screen Wake Lock API during games (with a toggle).
- Every phase has a server-side timeout (Durable Object Alarm); the game never waits forever for a disconnected player.
- Host migration if the host disconnects for too long.
- Rooms self-destruct after a period of inactivity (12–24 h).

## Testing

- Engine: unit tests per rule and per role, plus scripted full-game scenarios with a fixed seed.
- Protocol: schema tests for valid/invalid messages.
- E2E: Playwright with several browser contexts acting as players, including reconnect.
- Each rule test references its rule ID from `docs/rules` (e.g. `UW-VOTE-02`).

## Deployment

- `wrangler deploy` with separate `staging` and `production` environments.
- CI runs typecheck, lint, unit and E2E tests before deploy.
