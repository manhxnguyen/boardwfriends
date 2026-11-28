import {
  applyRoom,
  createRoomState,
  findByToken,
  gameDeadline,
  isExpired,
  nextWakeAt,
  roomView,
  type RoomAction,
  type RoomEvent,
  type RoomState,
} from '@bwf/engine';
import {
  PING,
  PONG,
  PROTOCOL_VERSION,
  encode,
  parseClientMessage,
  type ClientMessage,
  type ErrorCode,
  type RoomInfoResponse,
  type ServerMessage,
} from '@bwf/protocol';

/**
 * Transport-agnostic room server. The Cloudflare Durable Object and the offline LAN server are
 * thin adapters around this class; all game rules stay in @bwf/engine.
 */

/** Per-connection data. Must stay tiny (Durable Object attachments are limited to 2 KB). */
export interface ConnData {
  playerId: string | null;
  /** Narrator screen (no seat, public view, may send voice commands). */
  display: boolean;
  /** When the socket was accepted or last said hello (ms); baseline for liveness checks. */
  since: number;
}

export interface Conn {
  send(frame: string): void;
  close(code: number, reason: string): void;
  readonly open: boolean;
  data(): ConnData;
  setData(data: ConnData): void;
  /** Last keep-alive ping seen on this connection, if the transport tracks it. */
  lastPingAt(): number | null;
}

export interface RoomHost {
  connections(): Conn[];
  /** Persist the state; null deletes the room. */
  save(state: RoomState | null): Promise<void>;
  /** Schedule `wake()`; null cancels. */
  setWake(at: number | null): Promise<void>;
  now(): number;
  random(): number;
  newId(): string;
}

/** Application close codes (4000–4999). */
export const CLOSE = {
  versionMismatch: 4000,
  replaced: 4001,
  left: 4002,
  kicked: 4003,
  roomClosed: 4004,
  /** No heartbeat for too long; the client simply reconnects. */
  stale: 4005,
} as const;

/** Lobby housekeeping (host migration, expiry) never needs to run more often than this. */
const MIN_LOBBY_WAKE_MS = 15_000;
/**
 * Clients ping every 15 s. A phone that vanished (wifi drop, screen locked) leaves a half-open
 * TCP connection the runtime may not notice for minutes, so silent sockets are swept.
 */
export const STALE_SOCKET_MS = 45_000;
const SWEEP_INTERVAL_MS = 20_000;

export class RoomCore {
  // Plain fields (no parameter properties) so the code also runs under Node's type stripping.
  private readonly host: RoomHost;
  state: RoomState | null;

  constructor(host: RoomHost, state: RoomState | null) {
    this.host = host;
    this.state = state;
  }

  // ---------------------------------------------------------------------------
  // Room lifecycle

  async create(code: string): Promise<boolean> {
    if (this.state) return false;
    this.state = createRoomState(code, this.host.now());
    await this.persist();
    return true;
  }

  info(): RoomInfoResponse | null {
    const lobby = this.state?.lobby;
    return lobby ? { code: lobby.code, players: lobby.players.length } : null;
  }

  /** Call right after a new socket is accepted. */
  accept(conn: Conn) {
    conn.setData({ playerId: null, display: false, since: this.host.now() });
  }

  async message(conn: Conn, raw: string | ArrayBuffer): Promise<void> {
    if (raw === PING) return conn.send(PONG); // Transports without auto-response.
    if (!this.state) return closeQuietly(conn, CLOSE.roomClosed, 'room_closed');

    const parsed = parseClientMessage(raw);
    if (!parsed.ok)
      return send(conn, { t: 'error', code: 'invalid_message', detail: parsed.error });
    const message = parsed.value;
    if (message.t === 'hello') return this.onHello(conn, message);

    const data = conn.data();
    if (data.display) {
      if (message.t !== 'voice') return send(conn, { t: 'error', code: 'not_allowed' });
      return this.reply(
        conn,
        await this.dispatch({ type: 'voice', cmd: message.cmd, target: message.target }),
      );
    }
    if (!data.playerId) return send(conn, { t: 'error', code: 'not_joined' });
    await this.onPlayerMessage(conn, data.playerId, message);
  }

  async closed(conn: Conn): Promise<void> {
    const { playerId, display } = conn.data();
    if (!this.state) return;
    if (display) return this.broadcast(); // Display count changed.
    if (!playerId) return;
    // Ignore sockets that were replaced by a newer connection for the same player.
    const stillConnected = this.socketsOf(playerId).some((s) => s !== conn);
    const known = this.state.lobby.players.some((p) => p.id === playerId);
    if (!stillConnected && known) await this.dispatch({ type: 'disconnected', playerId });
  }

  /** Timer callback: game deadlines, host migration, liveness sweep, expiry. */
  async wake(): Promise<void> {
    if (!this.state) return;
    const now = this.host.now();
    if (isExpired(this.state.lobby, now)) {
      for (const conn of this.host.connections()) closeQuietly(conn, CLOSE.roomClosed, 'expired');
      this.state = null;
      await this.host.save(null);
      await this.host.setWake(null);
      return;
    }
    await this.sweepStale(now);
    await this.dispatch({ type: 'tick' });
    // A tick that changes nothing skips persist(), so always re-arm here.
    await this.scheduleWake();
  }

  // ---------------------------------------------------------------------------

  private async onHello(conn: Conn, hello: Extract<ClientMessage, { t: 'hello' }>) {
    if (hello.v !== PROTOCOL_VERSION) {
      send(conn, { t: 'error', code: 'version_mismatch' });
      return closeQuietly(conn, CLOSE.versionMismatch, 'version_mismatch');
    }
    if (hello.as === 'display') {
      conn.setData({ playerId: null, display: true, since: this.host.now() });
      send(conn, {
        t: 'welcome',
        v: PROTOCOL_VERSION,
        you: null,
        room: roomView(this.state!, null, this.host.now(), this.displayCount()),
      });
      return this.broadcast();
    }

    const error = await this.dispatch({ type: 'join', token: hello.token, name: hello.name });
    if (error) return send(conn, { t: 'error', code: error });

    const player = findByToken(this.state!.lobby, hello.token)!;
    // One live socket per player: a newer tab/reconnect replaces the old one.
    for (const other of this.socketsOf(player.id)) {
      if (other !== conn) closeQuietly(other, CLOSE.replaced, 'replaced');
    }
    conn.setData({ playerId: player.id, display: false, since: this.host.now() });
    send(conn, {
      t: 'welcome',
      v: PROTOCOL_VERSION,
      you: player.id,
      room: roomView(this.state!, player.id, this.host.now(), this.displayCount()),
    });
  }

  private async onPlayerMessage(
    conn: Conn,
    playerId: string,
    message: Exclude<ClientMessage, { t: 'hello' }>,
  ) {
    const action = toAction(playerId, message);
    if (!action) return send(conn, { t: 'error', code: 'not_allowed' });
    const error = await this.dispatch(action);
    if (!error && message.t === 'leave') closeQuietly(conn, CLOSE.left, 'left');
    this.reply(conn, error);
  }

  private reply(conn: Conn, error: ErrorCode | null) {
    if (error) send(conn, { t: 'error', code: error });
  }

  /** Closes sockets with no recent ping and marks their players as disconnected. */
  private async sweepStale(now: number) {
    const dropped = new Set<string>();
    for (const conn of this.host.connections()) {
      if (!conn.open) continue;
      const { playerId, since } = conn.data();
      const lastPing = conn.lastPingAt() ?? 0;
      if (now - Math.max(lastPing, since) < STALE_SOCKET_MS) continue;
      closeQuietly(conn, CLOSE.stale, 'stale');
      if (playerId) dropped.add(playerId);
    }
    for (const playerId of dropped) {
      const connected = this.state?.lobby.players.some((p) => p.id === playerId && p.connected);
      if (connected && this.socketsOf(playerId).length === 0) {
        await this.dispatch({ type: 'disconnected', playerId });
      }
    }
  }

  /**
   * Runs an action through the engine, persists, reschedules, applies side effects and sends
   * every connection its own view. Returns an error code if the engine rejected the action.
   */
  private async dispatch(action: RoomAction): Promise<ErrorCode | null> {
    if (!this.state) return 'room_not_found';
    const result = applyRoom(this.state, action, {
      now: this.host.now(),
      newId: () => this.host.newId(),
      random: () => this.host.random(),
    });
    if (!result.ok) return result.error;

    const changed = result.state !== this.state;
    this.state = result.state;
    for (const event of result.events) this.applySideEffect(event);
    if (changed) {
      await this.persist();
      this.broadcast();
    }
    return null;
  }

  private applySideEffect(event: RoomEvent) {
    if (event.type !== 'kicked') return;
    for (const conn of this.socketsOf(event.playerId)) {
      send(conn, { t: 'kicked' });
      closeQuietly(conn, CLOSE.kicked, 'kicked');
    }
  }

  /** Each connection gets its own projection: players never receive other players' cards. */
  private broadcast() {
    if (!this.state) return;
    const now = this.host.now();
    const displays = this.displayCount();
    let displayFrame: string | null = null;
    for (const conn of this.host.connections()) {
      if (!conn.open) continue;
      const { playerId, display } = conn.data();
      if (display) {
        displayFrame ??= encode({ t: 'state', room: roomView(this.state, null, now, displays) });
        sendRaw(conn, displayFrame);
      } else if (playerId) {
        send(conn, { t: 'state', room: roomView(this.state, playerId, now, displays) });
      }
    }
  }

  private displayCount(): number {
    return this.host.connections().filter((c) => c.open && c.data().display).length;
  }

  private socketsOf(playerId: string): Conn[] {
    return this.host.connections().filter((c) => c.open && c.data().playerId === playerId);
  }

  private async persist() {
    await this.host.save(this.state);
    await this.scheduleWake();
  }

  private async scheduleWake() {
    if (!this.state) return;
    const now = this.host.now();
    const { lobby } = this.state;
    // Lobby housekeeping is throttled (an overdue host migration with nobody else online would
    // otherwise fire in a tight loop); game timers are exact.
    let at = Math.max(nextWakeAt(lobby), now + MIN_LOBBY_WAKE_MS);
    if (lobby.players.some((p) => p.connected)) at = Math.min(at, now + SWEEP_INTERVAL_MS);
    const game = gameDeadline(this.state);
    if (game !== null) at = Math.min(at, Math.max(game, now));
    await this.host.setWake(at);
  }
}

/** Maps a validated player message to an engine action (null = not a player action). */
function toAction(playerId: string, m: Exclude<ClientMessage, { t: 'hello' }>): RoomAction | null {
  switch (m.t) {
    case 'rename':
      return { type: 'rename', playerId, name: m.name };
    case 'leave':
      return { type: 'leave', playerId };
    case 'kick':
      return { type: 'kick', by: playerId, target: m.playerId };
    case 'seats':
      return { type: 'reorder', by: playerId, order: m.order };
    case 'setup': {
      const { t: _t, ...setup } = m;
      return { type: 'setup', by: playerId, setup };
    }
    case 'deal':
      return { type: 'deal', by: playerId };
    case 'seen':
      return { type: 'seen', playerId };
    case 'reset':
      return { type: 'reset', by: playerId };
    case 'start':
      return { type: 'start', by: playerId };
    case 'pause':
      return { type: 'pause', by: playerId, paused: m.paused };
    case 'skip':
      return { type: 'skip', by: playerId };
    case 'act':
      return { type: 'act', playerId, players: m.players, center: m.center, witch: m.witch };
    case 'nominate':
      return { type: 'nominate', by: playerId, target: m.target };
    case 'second':
      return { type: 'second', by: playerId };
    case 'vote':
      return { type: 'vote', playerId, choice: m.choice };
    case 'accuse':
      return { type: 'accuse', playerId, target: m.target };
    case 'voice':
      return null; // Only narrator displays may send voice commands.
    case 'clock':
      return { type: 'clock', by: playerId, step: m.step };
    case 'mark-dead':
      return { type: 'mark-dead', by: playerId, playerId: m.playerId, dead: m.dead };
    case 'chat':
      return { type: 'chat', by: playerId, text: m.text };
  }
}

function send(conn: Conn, message: ServerMessage) {
  sendRaw(conn, encode(message));
}

function sendRaw(conn: Conn, frame: string) {
  try {
    conn.send(frame);
  } catch {
    // Socket already closing; the close handler will clean up.
  }
}

function closeQuietly(conn: Conn, code: number, reason: string) {
  try {
    conn.close(code, reason);
  } catch {
    // Already closed.
  }
}

/** Short public player id (not secret; tokens are the secret). */
export function newPlayerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Cryptographically random float in [0, 1) for dealing cards. */
export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}
