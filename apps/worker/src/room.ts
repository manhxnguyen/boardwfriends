import { DurableObject } from 'cloudflare:workers';
import type { RoomState } from '@bwf/engine';
import { PING, PONG, type RoomInfoResponse } from '@bwf/protocol';
import {
  RoomCore,
  newPlayerId,
  secureRandom,
  type Conn,
  type ConnData,
  type RoomHost,
} from '@bwf/server';

// Bumped with the state shape; rooms stored under older keys are simply ignored.
const STORAGE_KEY = 'room.v3';

/**
 * One Durable Object per room: a thin adapter between Cloudflare's WebSocket Hibernation API and
 * the shared RoomCore (packages/server). An idle room is evicted from memory while sockets stay
 * open; state and per-socket data are restored from storage and attachments on wake-up.
 */
export class Room extends DurableObject<Env> {
  private core!: RoomCore;
  /** Stable wrapper per socket so RoomCore can compare connections by identity. */
  private readonly conns = new WeakMap<WebSocket, Conn>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answered by the runtime without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    void ctx.blockConcurrencyWhile(async () => {
      const state = (await ctx.storage.get<RoomState>(STORAGE_KEY)) ?? null;
      this.core = new RoomCore(this.host(), state);
    });
  }

  // RPC (called by the Worker) ------------------------------------------------

  async create(code: string): Promise<boolean> {
    return this.core.create(code);
  }

  async info(): Promise<RoomInfoResponse | null> {
    return this.core.info();
  }

  // WebSocket lifecycle -------------------------------------------------------

  override async fetch(): Promise<Response> {
    if (!this.core.state) return Response.json({ error: 'room_not_found' }, { status: 404 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    this.core.accept(this.wrap(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.core.message(this.wrap(ws), raw);
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, reason);
    } catch {
      // Already closed.
    }
    await this.core.closed(this.wrap(ws));
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.core.closed(this.wrap(ws));
  }

  override async alarm(): Promise<void> {
    await this.core.wake();
  }

  // ---------------------------------------------------------------------------

  private host(): RoomHost {
    return {
      connections: () => this.ctx.getWebSockets().map((ws) => this.wrap(ws)),
      save: async (state) => {
        if (state) await this.ctx.storage.put(STORAGE_KEY, state);
        else await this.ctx.storage.deleteAll();
      },
      setWake: async (at) => {
        if (at === null) await this.ctx.storage.deleteAlarm();
        else await this.ctx.storage.setAlarm(at);
      },
      now: () => Date.now(),
      random: secureRandom,
      newId: newPlayerId,
    };
  }

  private wrap(ws: WebSocket): Conn {
    let conn = this.conns.get(ws);
    if (!conn) {
      const ctx = this.ctx;
      conn = {
        send: (frame) => ws.send(frame),
        close: (code, reason) => ws.close(code, reason),
        get open() {
          return ws.readyState === WebSocket.OPEN;
        },
        data: () =>
          (ws.deserializeAttachment() as ConnData | null) ?? {
            playerId: null,
            display: false,
            since: 0,
          },
        setData: (data) => ws.serializeAttachment(data),
        lastPingAt: () => ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? null,
      };
      this.conns.set(ws, conn);
    }
    return conn;
  }
}
