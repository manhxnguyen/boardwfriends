import { EMPTY_SETUP, type RoomState } from '@bwf/engine';
import { PROTOCOL_VERSION, type ServerMessage } from '@bwf/protocol';
import { describe, expect, it } from 'vitest';
import {
  CLOSE,
  RoomCore,
  STALE_SOCKET_MS,
  TTS_MAX_CHARS,
  parseTtsRequest,
  stripEmotionCues,
  pcmToWav,
  type Conn,
  type ConnData,
  type RoomHost,
} from '../src/index.ts';

class FakeConn implements Conn {
  sent: ServerMessage[] = [];
  raw: string[] = [];
  closedWith: number | null = null;
  ping: number | null = null;
  private d: ConnData = { playerId: null, display: false, since: 0 };
  get open() {
    return this.closedWith === null;
  }
  send(frame: string) {
    this.raw.push(frame);
    if (frame !== 'pong') this.sent.push(JSON.parse(frame) as ServerMessage);
  }
  close(code: number) {
    this.closedWith = code;
  }
  data() {
    return this.d;
  }
  setData(d: ConnData) {
    this.d = d;
  }
  lastPingAt() {
    return this.ping;
  }
  last<T extends ServerMessage['t']>(t: T) {
    return this.sent.filter((m) => m.t === t).at(-1) as
      Extract<ServerMessage, { t: T }> | undefined;
  }
}

class FakeHost implements RoomHost {
  conns: FakeConn[] = [];
  saved: RoomState | null = null;
  wakeAt: number | null = null;
  clock = 1_000_000;
  ids = 0;
  connections() {
    return this.conns;
  }
  async save(state: RoomState | null) {
    this.saved = state;
  }
  async setWake(at: number | null) {
    this.wakeAt = at;
  }
  now() {
    return this.clock;
  }
  random() {
    return 0.42;
  }
  newId() {
    return `p${++this.ids}`;
  }
}

async function setup() {
  const host = new FakeHost();
  const core = new RoomCore(host, null);
  await core.create('ABCD');
  const connect = async (name: string, as: 'player' | 'display' = 'player') => {
    const conn = new FakeConn();
    host.conns.push(conn);
    core.accept(conn);
    const token = `token-${name}-xxxxxxxxxx`;
    await core.message(conn, JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, token, name, as }));
    return conn;
  };
  const say = (conn: FakeConn, msg: object) => core.message(conn, JSON.stringify(msg));
  return { host, core, connect, say };
}

const AUTO_DECK = {
  ...EMPTY_SETUP,
  mode: 'auto' as const,
  roles: { werewolf: 1, seer: 1, villager: 2 },
};

describe('RoomCore', () => {
  it('answers keep-alive pings on transports without auto-response', async () => {
    const { connect, core } = await setup();
    const a = await connect('An');
    await core.message(a, 'ping');
    expect(a.raw.at(-1)).toBe('pong');
  });

  it('a display joins without a seat and receives public views', async () => {
    const { connect } = await setup();
    const host = await connect('An');
    const tv = await connect('TV', 'display');
    expect(tv.last('welcome')).toMatchObject({ you: null, room: { display: true } });
    expect(host.last('state')?.room.lobby.displays).toBe(1);
    expect(host.last('state')?.room.lobby.players).toHaveLength(1);
  });

  it('sends each player only their own card and the display none', async () => {
    const { connect, say } = await setup();
    const phones = [
      await connect('An'),
      await connect('Binh'),
      await connect('Chi'),
      await connect('Dung'),
    ];
    const tv = await connect('TV', 'display');
    await say(phones[0]!, { t: 'setup', ...AUTO_DECK });
    await say(phones[0]!, { t: 'deal' });

    const roles = phones.map((p) => {
      const game = p.last('state')!.room.game;
      if (game.phase !== 'playing' || game.play.kind !== 'classic') throw new Error('not playing');
      return game.play.you!.role;
    });
    expect([...roles].sort()).toEqual(['seer', 'villager', 'villager', 'werewolf']);
    const tvGame = tv.last('state')!.room.game;
    if (tvGame.phase !== 'playing') throw new Error();
    expect(tvGame.play.you).toBeNull();
  });

  it('schedules the wake-up exactly at the next game deadline', async () => {
    const { connect, say, host, core } = await setup();
    const phones = [
      await connect('An'),
      await connect('Binh'),
      await connect('Chi'),
      await connect('Dung'),
    ];
    await say(phones[0]!, { t: 'setup', ...AUTO_DECK });
    await say(phones[0]!, { t: 'deal' });
    await say(phones[0]!, { t: 'start' });
    const wolvesEnd = host.clock + 30_000; // first night call (wolves) lasts 30 s
    // The liveness sweep (every 20 s) comes first…
    expect(host.wakeAt).toBe(host.clock + 20_000);
    // …but once the game deadline is closer than the next sweep, it wins, to the millisecond.
    host.clock += 25_000;
    for (const p of phones) p.ping = host.clock;
    await core.wake();
    expect(host.wakeAt).toBe(wolvesEnd);
  });

  it('only displays may send voice commands, and only when the host enabled them', async () => {
    const { connect, say } = await setup();
    const phones = [
      await connect('An'),
      await connect('Binh'),
      await connect('Chi'),
      await connect('Dung'),
    ];
    const tv = await connect('TV', 'display');
    await say(phones[0]!, { t: 'voice', cmd: 'pause' });
    expect(phones[0]!.last('error')?.code).toBe('not_allowed');

    await say(phones[0]!, { t: 'setup', ...AUTO_DECK });
    await say(phones[0]!, { t: 'deal' });
    await say(phones[0]!, { t: 'start' });
    await say(tv, { t: 'voice', cmd: 'pause' });
    expect(tv.last('error')?.code).toBe('not_allowed'); // voice is off

    await say(phones[0]!, { t: 'reset' });
    await say(phones[0]!, { t: 'setup', ...AUTO_DECK, voice: true });
    await say(phones[0]!, { t: 'deal' });
    await say(phones[0]!, { t: 'start' });
    await say(tv, { t: 'voice', cmd: 'pause' });
    const game = tv.last('state')!.room.game;
    if (game.phase !== 'playing') throw new Error();
    expect(game.play.paused).toBe(true);
  });

  it('displays cannot act as players', async () => {
    const { connect, say } = await setup();
    const tv = await connect('TV', 'display');
    await say(tv, { t: 'deal' });
    expect(tv.last('error')?.code).toBe('not_allowed');
  });

  it('sweeps silent sockets and marks their player offline', async () => {
    const { connect, core, host } = await setup();
    const a = await connect('An');
    const b = await connect('Binh');
    a.ping = host.clock + STALE_SOCKET_MS; // An keeps pinging
    host.clock += STALE_SOCKET_MS + 1;
    await core.wake();
    expect(b.closedWith).toBe(CLOSE.stale);
    expect(a.open).toBe(true);
    expect(a.last('state')?.room.lobby.players.find((p) => p.name === 'Binh')?.connected).toBe(
      false,
    );
  });
});

describe('parseTtsRequest', () => {
  const parse = (q: string) => parseTtsRequest(new URL(`https://x/api/tts?${q}`));
  it('accepts a valid request', () => {
    expect(parse('room=abcd&lang=vi&text=Xin%20ch%C3%A0o')).toEqual({
      ok: true,
      room: 'ABCD',
      lang: 'vi',
      text: 'Xin chào',
      vieneuVoice: null,
    });
  });
  it('reads a VieNeu voice', () => {
    expect(parse('room=ABCD&lang=vi&text=a&voice=vieneu%3ANg%E1%BB%8Dc%20Linh')).toMatchObject({
      ok: true,
      vieneuVoice: 'Ngọc Linh',
    });
  });
  it.each([
    ['room=AB&lang=vi&text=a', 'bad_room'],
    ['room=ABCD&lang=fr&text=a', 'bad_lang'],
    ['room=ABCD&lang=vi&text=', 'bad_text'],
    [`room=ABCD&lang=vi&text=${'a'.repeat(TTS_MAX_CHARS + 1)}`, 'bad_text'],
    ['room=ABCD&lang=vi&text=a&voice=vieneu%3A', 'bad_voice'],
  ])('rejects %s', (q, error) => {
    expect(parse(q)).toMatchObject({ ok: false, error });
  });
});

describe('stripEmotionCues', () => {
  it('removes the tags only the VieNeu voice understands', () => {
    expect(stripEmotionCues('[thở dài] Trời sáng. [cười] Hết.')).toBe('Trời sáng. Hết.');
  });
});

describe('pcmToWav', () => {
  it('writes a 44-byte header with the real length', () => {
    const wav = new DataView(pcmToWav(new Uint8Array(480), 24_000));
    const text = (at: number) => String.fromCharCode(...new Uint8Array(wav.buffer, at, 4));
    expect(wav.byteLength).toBe(524);
    expect([text(0), text(8), text(12), text(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(wav.getUint32(24, true)).toBe(24_000);
    expect(wav.getUint32(40, true)).toBe(480);
  });
});
