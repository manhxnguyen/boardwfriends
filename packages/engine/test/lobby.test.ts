import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS } from '@bwf/protocol';
import {
  HOST_GRACE_MS,
  ROOM_TTL_MS,
  applyLobby,
  createLobby,
  isExpired,
  lobbyView,
  nextWakeAt,
  type EngineContext,
  type LobbyAction,
  type LobbyResult,
  type LobbyState,
} from '../src/index.ts';

const T0 = 1_000_000;

function ctxAt(now: number): EngineContext {
  let n = 0;
  return { now, newId: () => `p${++n}` };
}

/** Applies actions in order with a shared id counter; fails the test on any error. */
function run(actions: LobbyAction[], { now = T0, state = createLobby('ABCD', T0) } = {}) {
  let n = state.players.length;
  const ctx: EngineContext = { now, newId: () => `p${++n}` };
  let current = state;
  const events = [];
  for (const action of actions) {
    const r = applyLobby(current, action, ctx);
    if (!r.ok) throw new Error(`${action.type} failed: ${r.error}`);
    current = r.state;
    events.push(...r.events);
  }
  return { state: current, events };
}

const joinAll = (...names: string[]): LobbyAction[] =>
  names.map((name) => ({ type: 'join', token: `token-${name}`, name }));

function expectError(r: LobbyResult, error: string) {
  expect(r).toEqual({ ok: false, error });
}

describe('join', () => {
  it('makes the first player host', () => {
    const { state, events } = run(joinAll('An'));
    expect(state.hostId).toBe('p1');
    expect(events).toEqual([
      { type: 'joined', playerId: 'p1', rejoined: false },
      { type: 'host_changed', hostId: 'p1' },
    ]);
  });

  it('keeps players in join order and the first one as host', () => {
    const { state } = run(joinAll('An', 'Binh', 'Chi'));
    expect(state.players.map((p) => p.name)).toEqual(['An', 'Binh', 'Chi']);
    expect(state.hostId).toBe('p1');
  });

  it('reclaims the same seat with the same token and updates the name', () => {
    const { state, events } = run([
      ...joinAll('An', 'Binh'),
      { type: 'disconnected', playerId: 'p2' },
      { type: 'join', token: 'token-Binh', name: 'Bình' },
    ]);
    expect(state.players).toHaveLength(2);
    expect(state.players[1]).toMatchObject({ id: 'p2', name: 'Bình', connected: true });
    expect(events.at(-1)).toEqual({ type: 'joined', playerId: 'p2', rejoined: true });
  });

  it('rejects new players when the room is full but still lets existing players back in', () => {
    const names = Array.from({ length: MAX_PLAYERS }, (_, i) => `P${i}`);
    const { state } = run(joinAll(...names));
    expectError(
      applyLobby(state, { type: 'join', token: 'token-new', name: 'X' }, ctxAt(T0)),
      'room_full',
    );
    expect(applyLobby(state, { type: 'join', token: 'token-P3', name: 'P3' }, ctxAt(T0)).ok).toBe(
      true,
    );
  });

  it('never exposes tokens in the public view', () => {
    const { state } = run(joinAll('An', 'Binh'));
    const view = lobbyView(state);
    expect(JSON.stringify(view)).not.toContain('token');
    expect(view).toEqual({
      code: 'ABCD',
      displays: 0,
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'An', connected: true, isHost: true },
        { id: 'p2', name: 'Binh', connected: true, isHost: false },
      ],
    });
  });
});

describe('connection status', () => {
  it('tracks when the host drops and clears it when the host returns', () => {
    const { state: dropped } = run([
      ...joinAll('An', 'Binh'),
      { type: 'disconnected', playerId: 'p1' },
    ]);
    expect(dropped.hostLostAt).toBe(T0);
    const { state: back } = run([{ type: 'connected', playerId: 'p1' }], { state: dropped });
    expect(back.hostLostAt).toBeNull();
    expect(back.hostId).toBe('p1');
  });

  it('keeps the original hostLostAt when the host disconnects twice', () => {
    const { state } = run([...joinAll('An'), { type: 'disconnected', playerId: 'p1' }]);
    const { state: again } = run([{ type: 'disconnected', playerId: 'p1' }], {
      state,
      now: T0 + 5000,
    });
    expect(again.hostLostAt).toBe(T0);
  });

  it('rejects unknown players', () => {
    const { state } = run(joinAll('An'));
    expectError(
      applyLobby(state, { type: 'connected', playerId: 'ghost' }, ctxAt(T0)),
      'unknown_player',
    );
  });
});

describe('host migration', () => {
  function hostDropped(): LobbyState {
    return run([...joinAll('An', 'Binh', 'Chi'), { type: 'disconnected', playerId: 'p1' }]).state;
  }

  it('waits for the grace period before moving the host', () => {
    const { state, events } = run([{ type: 'tick' }], {
      state: hostDropped(),
      now: T0 + HOST_GRACE_MS - 1,
    });
    expect(state.hostId).toBe('p1');
    expect(events).toEqual([]);
  });

  it('moves host to the oldest connected player after the grace period', () => {
    const before = run([{ type: 'disconnected', playerId: 'p2' }], { state: hostDropped() }).state;
    const { state, events } = run([{ type: 'tick' }], { state: before, now: T0 + HOST_GRACE_MS });
    expect(state.hostId).toBe('p3');
    expect(state.hostLostAt).toBeNull();
    expect(events).toEqual([{ type: 'host_changed', hostId: 'p3' }]);
  });

  it('keeps the host when nobody else is connected', () => {
    const before = run(
      [
        { type: 'disconnected', playerId: 'p2' },
        { type: 'disconnected', playerId: 'p3' },
      ],
      { state: hostDropped() },
    ).state;
    const { state } = run([{ type: 'tick' }], { state: before, now: T0 + HOST_GRACE_MS * 2 });
    expect(state.hostId).toBe('p1');
  });

  it('hands host to the next player when the host leaves', () => {
    const { state, events } = run([...joinAll('An', 'Binh'), { type: 'leave', playerId: 'p1' }]);
    expect(state.hostId).toBe('p2');
    expect(events.slice(-2)).toEqual([
      { type: 'left', playerId: 'p1' },
      { type: 'host_changed', hostId: 'p2' },
    ]);
  });

  it('prefers a connected successor over an older disconnected one', () => {
    const { state } = run([
      ...joinAll('An', 'Binh', 'Chi'),
      { type: 'disconnected', playerId: 'p2' },
      { type: 'leave', playerId: 'p1' },
    ]);
    expect(state.hostId).toBe('p3');
  });

  it('leaves the room without a host when the last player leaves', () => {
    const { state } = run([...joinAll('An'), { type: 'leave', playerId: 'p1' }]);
    expect(state.hostId).toBeNull();
    expect(state.players).toEqual([]);
  });

  it('makes the next joiner host of an empty room', () => {
    const { state } = run([
      ...joinAll('An'),
      { type: 'leave', playerId: 'p1' },
      ...joinAll('Binh'),
    ]);
    expect(state.hostId).toBe('p2');
  });
});

describe('rename', () => {
  it('changes the name', () => {
    const { state } = run([...joinAll('An'), { type: 'rename', playerId: 'p1', name: 'Ân' }]);
    expect(state.players[0]?.name).toBe('Ân');
  });

  it('rejects unknown players', () => {
    expectError(
      applyLobby(createLobby('ABCD', T0), { type: 'rename', playerId: 'x', name: 'A' }, ctxAt(T0)),
      'unknown_player',
    );
  });
});

describe('kick', () => {
  it('lets the host remove a player', () => {
    const { state, events } = run([
      ...joinAll('An', 'Binh'),
      { type: 'kick', by: 'p1', target: 'p2' },
    ]);
    expect(state.players.map((p) => p.id)).toEqual(['p1']);
    expect(events.at(-1)).toEqual({ type: 'kicked', playerId: 'p2' });
  });

  it('only allows the host to kick', () => {
    const { state } = run(joinAll('An', 'Binh', 'Chi'));
    expectError(applyLobby(state, { type: 'kick', by: 'p2', target: 'p3' }, ctxAt(T0)), 'not_host');
  });

  it('does not allow the host to kick themselves', () => {
    const { state } = run(joinAll('An'));
    expectError(
      applyLobby(state, { type: 'kick', by: 'p1', target: 'p1' }, ctxAt(T0)),
      'cannot_kick_self',
    );
  });

  it('rejects unknown targets', () => {
    const { state } = run(joinAll('An'));
    expectError(
      applyLobby(state, { type: 'kick', by: 'p1', target: 'nobody' }, ctxAt(T0)),
      'unknown_player',
    );
  });
});

describe('expiry and wake-up scheduling', () => {
  it('expires after the TTL without activity', () => {
    const { state } = run(joinAll('An'));
    expect(isExpired(state, T0 + ROOM_TTL_MS - 1)).toBe(false);
    expect(isExpired(state, T0 + ROOM_TTL_MS)).toBe(true);
  });

  it('activity pushes expiry back', () => {
    const { state } = run([{ type: 'rename', playerId: 'p1', name: 'B' }], {
      state: run(joinAll('An')).state,
      now: T0 + 1000,
    });
    expect(isExpired(state, T0 + ROOM_TTL_MS)).toBe(false);
  });

  it('wakes for host migration before expiry', () => {
    const { state } = run([...joinAll('An', 'Binh'), { type: 'disconnected', playerId: 'p1' }]);
    expect(nextWakeAt(state)).toBe(T0 + HOST_GRACE_MS);
    expect(nextWakeAt(run(joinAll('An')).state)).toBe(T0 + ROOM_TTL_MS);
  });
});
