import {
  PING,
  PONG,
  PROTOCOL_VERSION,
  encode,
  type ClientMessageInput,
  type ErrorCode,
  type RoomView,
  type ServerMessage,
  type SetupView,
} from '@bwf/protocol';
import { getRoom } from './api.ts';
import { deviceToken } from './identity.ts';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'ended';

/** Why the session is over; the UI shows a message and stops reconnecting. */
export type EndReason =
  | 'kicked'
  | 'left'
  | 'replaced'
  | 'room_closed'
  | 'room_not_found'
  | 'version_mismatch'
  | 'game_in_progress';

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 6_000;
const BACKOFF_BASE_MS = 400;
const BACKOFF_MAX_MS = 5_000;

/** Server close codes (see apps/worker/src/room.ts). */
const CLOSE_REASONS: Record<number, EndReason> = {
  4000: 'version_mismatch',
  4001: 'replaced',
  4002: 'left',
  4003: 'kicked',
  4004: 'room_closed',
};

/**
 * One live connection to a room, built for phones:
 * - reconnects with backoff whenever the socket drops (screen lock, wifi hiccup),
 * - reconnects immediately when the page becomes visible or the network comes back,
 * - detects silently dead sockets with a ping/pong heartbeat,
 * - re-sends `hello` with the device token so the server gives back the same seat.
 */
export class RoomConnection {
  status = $state<ConnectionStatus>('connecting');
  room = $state<RoomView | null>(null);
  you = $state<string | null>(null);
  ended = $state<EndReason | null>(null);
  /** Last non-fatal error from the server, for a transient toast. */
  lastError = $state<ErrorCode | null>(null);
  /** serverClock - localClock, so countdowns match the server's timers. */
  clockOffset = $state(0);

  readonly #code: string;
  readonly #name: () => string;
  readonly #as: 'player' | 'display';
  #ws: WebSocket | null = null;
  #attempt = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  #heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  #pongTimer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;

  constructor(code: string, name: () => string, as: 'player' | 'display' = 'player') {
    this.#code = code;
    this.#name = name;
    this.#as = as;
    addEventListener('visibilitychange', this.#onWake);
    addEventListener('online', this.#onWake);
    addEventListener('pageshow', this.#onWake);
    this.#connect();
  }

  get isHost(): boolean {
    return this.you !== null && this.room?.lobby.hostId === this.you;
  }

  /** Sends any client message (game actions, host controls, voice commands). */
  send(message: ClientMessageInput): void {
    this.#send(message);
  }

  /** Server time now, for countdowns. */
  serverNow(): number {
    return Date.now() + this.clockOffset;
  }

  setup(setup: SetupView): void {
    this.#send({ t: 'setup', ...setup });
  }

  deal(): void {
    this.#send({ t: 'deal' });
  }

  markSeen(): void {
    this.#send({ t: 'seen' });
  }

  reset(): void {
    this.#send({ t: 'reset' });
  }

  rename(name: string): void {
    this.#send({ t: 'rename', name });
  }

  kick(playerId: string): void {
    this.#send({ t: 'kick', playerId });
  }

  leave(): void {
    this.#send({ t: 'leave' });
  }

  /** Take the seat back after another tab/device replaced this one. */
  reclaim(): void {
    if (this.ended !== 'replaced') return;
    this.ended = null;
    this.#attempt = 0;
    this.#connect();
  }

  dispose(): void {
    this.#disposed = true;
    removeEventListener('visibilitychange', this.#onWake);
    removeEventListener('online', this.#onWake);
    removeEventListener('pageshow', this.#onWake);
    clearTimeout(this.#retryTimer);
    this.#stopHeartbeat();
    this.#ws?.close(1000, 'bye');
    this.#ws = null;
  }

  // ---------------------------------------------------------------------------

  #connect(): void {
    if (this.#disposed || this.ended) return;
    clearTimeout(this.#retryTimer);
    this.status = this.#attempt === 0 && !this.room ? 'connecting' : 'reconnecting';

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/api/rooms/${this.#code}/ws`);
    this.#ws = ws;

    ws.onopen = () => {
      if (ws !== this.#ws) return;
      this.#send({
        t: 'hello',
        v: PROTOCOL_VERSION,
        token: deviceToken(),
        name: this.#name() || 'TV',
        as: this.#as,
      });
      this.#startHeartbeat();
    };
    ws.onmessage = (event: MessageEvent<string>) => {
      if (ws === this.#ws) this.#onMessage(event.data);
    };
    ws.onclose = (event) => {
      if (ws === this.#ws) void this.#onClosed(event.code);
    };
  }

  #onMessage(data: string): void {
    if (data === PONG) {
      clearTimeout(this.#pongTimer);
      return;
    }
    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }
    switch (message.t) {
      case 'welcome':
        this.#attempt = 0;
        this.you = message.you;
        this.#setRoom(message.room);
        this.status = 'open';
        break;
      case 'state':
        this.#setRoom(message.room);
        break;
      case 'kicked':
        this.#end('kicked');
        break;
      case 'error':
        if (message.code === 'version_mismatch') this.#end('version_mismatch');
        // Refused at the door: a round is being played and this device has no seat.
        else if (message.code === 'game_in_progress' && this.status !== 'open') {
          this.#end('game_in_progress');
        } else this.lastError = message.code;
        break;
      default: {
        const exhaustive: never = message;
        return exhaustive;
      }
    }
  }

  async #onClosed(code: number): Promise<void> {
    this.#stopHeartbeat();
    this.#ws = null;
    if (this.#disposed || this.ended) return;

    const reason = CLOSE_REASONS[code];
    if (reason) return this.#end(reason);

    // Unknown drop. If the room is gone there is no point retrying forever.
    if (this.#attempt >= 2) {
      try {
        if ((await getRoom(this.#code)) === null) return this.#end('room_not_found');
      } catch {
        // Network down; keep retrying.
      }
      // A wake-up event may have reconnected while we were checking.
      if (this.#ws) return;
    }
    this.#scheduleReconnect();
  }

  #scheduleReconnect(): void {
    if (this.#disposed || this.ended) return;
    this.status = 'reconnecting';
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** this.#attempt, BACKOFF_MAX_MS);
    this.#attempt++;
    this.#retryTimer = setTimeout(() => this.#connect(), delay * (0.75 + Math.random() * 0.5));
  }

  /** Page became visible / network came back: reconnect now instead of waiting for backoff. */
  #onWake = (): void => {
    if (document.visibilityState !== 'visible' || this.#disposed || this.ended) return;
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ping(); // The socket may have died while the phone was asleep.
    } else if (!this.#ws || this.#ws.readyState === WebSocket.CLOSED) {
      this.#attempt = 0;
      this.#connect();
    }
  };

  #startHeartbeat(): void {
    this.#stopHeartbeat();
    this.#heartbeatTimer = setInterval(() => this.#ping(), HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    clearInterval(this.#heartbeatTimer);
    clearTimeout(this.#pongTimer);
  }

  #ping(): void {
    const ws = this.#ws;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(PING);
    clearTimeout(this.#pongTimer);
    this.#pongTimer = setTimeout(() => {
      // No pong: treat the socket as dead without waiting for the browser to notice.
      if (ws !== this.#ws) return;
      ws.onclose = null;
      ws.close();
      void this.#onClosed(1006);
    }, HEARTBEAT_TIMEOUT_MS);
  }

  #setRoom(room: RoomView): void {
    if (room.game.phase === 'playing') this.clockOffset = room.game.play.now - Date.now();
    this.room = room;
  }

  #send(message: ClientMessageInput): void {
    if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(encode(message));
  }

  #end(reason: EndReason): void {
    this.ended = reason;
    this.status = 'ended';
    this.#stopHeartbeat();
    clearTimeout(this.#retryTimer);
    const ws = this.#ws;
    this.#ws = null;
    if (ws?.readyState === WebSocket.OPEN) ws.close(1000, reason);
  }
}
