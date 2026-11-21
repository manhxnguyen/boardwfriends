import { DurableObject } from 'cloudflare:workers';
import {
  applyRoom,
  createRoomState,
  findByToken,
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

/** Per-socket data that survives hibernation (limit: 2 KB). */
interface Attachment {
  playerId: string | null;
  /** When this socket was accepted or last said hello (ms). Baseline for liveness checks. */
  since: number;
}

/** Application close codes (4000–4999). */
const CLOSE = {
  versionMismatch: 4000,
  replaced: 4001,
  left: 4002,
  kicked: 4003,
  roomClosed: 4004,
  /** No heartbeat for too long; the client simply reconnects. */
  stale: 4005,
} as const;

// Bumped with the state shape; rooms stored under older keys are simply ignored.
const STORAGE_KEY = 'room.v2';
const MIN_ALARM_DELAY_MS = 15_000;
/**
 * Clients ping every 15 s. A phone that vanished (wifi drop, screen locked) leaves a half-open
 * TCP connection the runtime may not notice for minutes, so silent sockets are swept here.
 */
const STALE_SOCKET_MS = 45_000;
const SWEEP_INTERVAL_MS = 20_000;

/**
 * One Durable Object per room. Transport only: it turns socket frames into engine actions,
 * persists the resulting state, and broadcasts projections. All rules live in @bwf/engine.
 *
 * Uses the WebSocket Hibernation API, so an idle room is evicted from memory while sockets stay
 * open. State is reloaded from storage in the constructor after waking up.
 */
export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answered by the runtime without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>(STORAGE_KEY)) ?? null;
    });
  }

  // ---------------------------------------------------------------------------
  // RPC (called by the Worker)

  /** Initializes the room. Returns false if this code is already in use. */
  async create(code: string): Promise<boolean> {
    if (this.state) return false;
    this.state = createRoomState(code, Date.now());
    await this.persist();
    return true;
  }

  async info(): Promise<RoomInfoResponse | null> {
    const lobby = this.state?.lobby;
    return lobby ? { code: lobby.code, players: lobby.players.length } : null;
  }

  // ---------------------------------------------------------------------------
  // WebSocket lifecycle

  override async fetch(): Promise<Response> {
    if (!this.state) return Response.json({ error: 'room_not_found' }, { status: 404 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null, since: Date.now() } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.state) return closeQuietly(ws, CLOSE.roomClosed, 'room_closed');

    const parsed = parseClientMessage(raw);
    if (!parsed.ok) return send(ws, { t: 'error', code: 'invalid_message', detail: parsed.error });

    const message = parsed.value;
    if (message.t === 'hello') return this.onHello(ws, message);

    const playerId = attachmentOf(ws).playerId;
    if (!playerId) return send(ws, { t: 'error', code: 'not_joined' });
    await this.onPlayerMessage(ws, playerId, message);
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    closeQuietly(ws, code === 1005 ? 1000 : code, reason);
    await this.onSocketGone(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.onSocketGone(ws);
  }

  override async alarm(): Promise<void> {
    if (!this.state) return;
    const now = Date.now();
    if (isExpired(this.state.lobby, now)) {
      for (const ws of this.ctx.getWebSockets()) closeQuietly(ws, CLOSE.roomClosed, 'expired');
      this.state = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.sweepStaleSockets(now);
    await this.dispatch({ type: 'tick' });
    // A tick that changes nothing skips persist(), so always re-arm the alarm here.
    await this.scheduleAlarm();
  }

  // ---------------------------------------------------------------------------

  private async onHello(ws: WebSocket, hello: Extract<ClientMessage, { t: 'hello' }>) {
    if (hello.v !== PROTOCOL_VERSION) {
      send(ws, { t: 'error', code: 'version_mismatch' });
      return closeQuietly(ws, CLOSE.versionMismatch, 'version_mismatch');
    }

    const error = await this.dispatch({ type: 'join', token: hello.token, name: hello.name });
    if (error) return send(ws, { t: 'error', code: error });

    const player = findByToken(this.state!.lobby, hello.token)!;
    // One live socket per player: a newer tab/reconnect replaces the old one.
    for (const other of this.socketsOf(player.id)) {
      if (other !== ws) closeQuietly(other, CLOSE.replaced, 'replaced');
    }
    ws.serializeAttachment({ playerId: player.id, since: Date.now() } satisfies Attachment);
    send(ws, {
      t: 'welcome',
      v: PROTOCOL_VERSION,
      you: player.id,
      room: roomView(this.state!, player.id),
    });
  }

  private async onPlayerMessage(
    ws: WebSocket,
    playerId: string,
    message: Exclude<ClientMessage, { t: 'hello' }>,
  ) {
    let error: ErrorCode | null;
    switch (message.t) {
      case 'rename':
        error = await this.dispatch({ type: 'rename', playerId, name: message.name });
        break;
      case 'leave':
        error = await this.dispatch({ type: 'leave', playerId });
        if (!error) closeQuietly(ws, CLOSE.left, 'left');
        break;
      case 'kick':
        error = await this.dispatch({ type: 'kick', by: playerId, target: message.playerId });
        break;
      case 'setup': {
        const { roles, moderatorId, publicRoles } = message;
        error = await this.dispatch({
          type: 'setup',
          by: playerId,
          setup: { roles, moderatorId, publicRoles },
        });
        break;
      }
      case 'deal':
        error = await this.dispatch({ type: 'deal', by: playerId });
        break;
      case 'seen':
        error = await this.dispatch({ type: 'seen', playerId });
        break;
      case 'reset':
        error = await this.dispatch({ type: 'reset', by: playerId });
        break;
      default: {
        const exhaustive: never = message;
        return exhaustive;
      }
    }
    if (error) send(ws, { t: 'error', code: error });
  }

  /** Closes sockets with no recent ping and marks their players as disconnected. */
  private async sweepStaleSockets(now: number) {
    const dropped = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const { playerId, since } = attachmentOf(ws);
      const lastPing = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
      if (now - Math.max(lastPing, since) < STALE_SOCKET_MS) continue;
      closeQuietly(ws, CLOSE.stale, 'stale'); // readyState leaves OPEN, so socketsOf() skips it
      if (playerId) dropped.add(playerId);
    }
    for (const playerId of dropped) {
      const known = this.state?.lobby.players.some((p) => p.id === playerId && p.connected);
      if (known && this.socketsOf(playerId).length === 0) {
        await this.dispatch({ type: 'disconnected', playerId });
      }
    }
  }

  private async onSocketGone(ws: WebSocket) {
    const playerId = attachmentOf(ws).playerId;
    if (!this.state || !playerId) return;
    // Ignore sockets that were replaced by a newer connection for the same player.
    const stillConnected = this.socketsOf(playerId).some((s) => s !== ws);
    const known = this.state.lobby.players.some((p) => p.id === playerId);
    if (!stillConnected && known) await this.dispatch({ type: 'disconnected', playerId });
  }

  /**
   * Runs an action through the engine, persists, reschedules the alarm, applies side effects
   * and sends every player their own view. Returns an error code if the engine rejected it.
   */
  private async dispatch(action: RoomAction): Promise<ErrorCode | null> {
    if (!this.state) return 'room_not_found';
    const result = applyRoom(this.state, action, { now: Date.now(), newId, random: secureRandom });
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
    for (const ws of this.socketsOf(event.playerId)) {
      send(ws, { t: 'kicked' });
      closeQuietly(ws, CLOSE.kicked, 'kicked');
    }
  }

  /** Each socket gets its own projection: players must never receive other players' cards. */
  private broadcast() {
    if (!this.state) return;
    for (const ws of this.ctx.getWebSockets()) {
      const { playerId } = attachmentOf(ws);
      if (playerId && ws.readyState === WebSocket.OPEN) {
        send(ws, { t: 'state', room: roomView(this.state, playerId) });
      }
    }
  }

  private socketsOf(playerId: string): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === WebSocket.OPEN && attachmentOf(ws).playerId === playerId);
  }

  private async persist() {
    if (!this.state) return;
    await this.ctx.storage.put(STORAGE_KEY, this.state);
    await this.scheduleAlarm();
  }

  private async scheduleAlarm() {
    if (!this.state) return;
    // Never closer than MIN_ALARM_DELAY_MS: if host migration is overdue but nobody else is
    // connected, nextWakeAt() is in the past and would otherwise fire in a tight loop.
    const now = Date.now();
    const { lobby } = this.state;
    let at = Math.max(nextWakeAt(lobby), now + MIN_ALARM_DELAY_MS);
    // While anyone is connected, wake up regularly to sweep dead sockets.
    if (lobby.players.some((p) => p.connected)) at = Math.min(at, now + SWEEP_INTERVAL_MS);
    await this.ctx.storage.setAlarm(at);
  }
}

// -----------------------------------------------------------------------------

function attachmentOf(ws: WebSocket): Attachment {
  return (ws.deserializeAttachment() as Attachment | null) ?? { playerId: null, since: 0 };
}

function send(ws: WebSocket, message: ServerMessage) {
  sendRaw(ws, encode(message));
}

function sendRaw(ws: WebSocket, frame: string) {
  try {
    ws.send(frame);
  } catch {
    // Socket already closing; the close handler will clean up.
  }
}

function closeQuietly(ws: WebSocket, code: number, reason: string) {
  try {
    ws.close(code, reason);
  } catch {
    // Already closed.
  }
}

/** Cryptographically random float in [0, 1) for dealing cards. */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

/** Short public player id (not secret; tokens are the secret). */
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
