import { describe, expect, it } from 'vitest';
import {
  EMPTY_SETUP,
  applyRoom,
  createRoomState,
  roomView,
  seededRandom,
  type RoomAction,
  type RoomContext,
  type RoomState,
  type Setup,
} from '../src/index.ts';

const T0 = 1_000_000;
/** M1 tests run the manual (human moderator) mode. */
const MANUAL = { ...EMPTY_SETUP, mode: 'manual' as const };
const DECK_8: Setup['roles'] = { werewolf: 2, seer: 1, bodyguard: 1, villager: 4 };

function makeCtx(seed = 1): RoomContext {
  let n = 0;
  return { now: T0, newId: () => `p${++n}`, random: seededRandom(seed) };
}

function run(actions: RoomAction[], ctx = makeCtx(), state = createRoomState('ABCD', T0)) {
  let current = state;
  for (const action of actions) {
    const r = applyRoom(current, action, ctx);
    if (!r.ok) throw new Error(`${action.type} failed: ${r.error}`);
    current = r.state;
  }
  return current;
}

const join = (...names: string[]): RoomAction[] =>
  names.map((name) => ({ type: 'join', token: `token-${name}-xxxxxxxx`, name }));
const NAMES = ['An', 'Binh', 'Chi', 'Dung', 'Em', 'Giang', 'Hoa', 'Khoa', 'Lan'];

/** 9 players; p1 (host) moderates, 8 get cards. */
function dealtRoom(seed = 1): RoomState {
  return run(
    [
      ...join(...NAMES),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: DECK_8, moderatorId: 'p1', publicRoles: true },
      },
      { type: 'deal', by: 'p1' },
    ],
    makeCtx(seed),
  );
}

function expectError(state: RoomState, action: RoomAction, error: string) {
  expect(applyRoom(state, action, makeCtx())).toEqual({ ok: false, error });
}

describe('setup', () => {
  it('only the host can change the deck', () => {
    const state = run(join('An', 'Binh'));
    expectError(
      state,
      {
        type: 'setup',
        by: 'p2',
        setup: { ...MANUAL, roles: {}, moderatorId: null, publicRoles: true },
      },
      'not_host',
    );
  });

  it('stores the deck and drops zero counts', () => {
    const state = run([
      ...join('An', 'Binh'),
      {
        type: 'setup',
        by: 'p1',
        setup: {
          ...MANUAL,
          roles: { werewolf: 1, seer: 0 },
          moderatorId: 'p2',
          publicRoles: false,
        },
      },
    ]);
    expect(state.game.setup).toEqual({
      ...MANUAL,
      roles: { werewolf: 1 },
      moderatorId: 'p2',
      publicRoles: false,
    });
  });

  it('rejects a moderator who is not in the room', () => {
    expectError(
      run(join('An')),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: {}, moderatorId: 'nobody', publicRoles: true },
      },
      'invalid_setup',
    );
  });
});

describe('deal', () => {
  it('gives every non-moderator exactly one card from the deck', () => {
    const { game } = dealtRoom();
    if (game.phase !== 'dealt') throw new Error('not dealt');
    expect(game.round).toBe(1);
    expect(Object.keys(game.assignments).sort()).toEqual(
      ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].sort(),
    );
    expect(game.assignments.p1).toBeUndefined();
    const dealt = Object.values(game.assignments).sort();
    expect(dealt).toEqual(
      [
        'bodyguard',
        'seer',
        'villager',
        'villager',
        'villager',
        'villager',
        'werewolf',
        'werewolf',
      ].sort(),
    );
  });

  it('is random: different seeds give different tables, same seed the same table', () => {
    const a = dealtRoom(1).game;
    const b = dealtRoom(2).game;
    const a2 = dealtRoom(1).game;
    if (a.phase !== 'dealt' || b.phase !== 'dealt' || a2.phase !== 'dealt') throw new Error();
    expect(a.assignments).toEqual(a2.assignments);
    expect(a.assignments).not.toEqual(b.assignments);
  });

  it('refuses an invalid deck', () => {
    const state = run([
      ...join(...NAMES),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: { werewolf: 1 }, moderatorId: null, publicRoles: true },
      },
    ]);
    expectError(state, { type: 'deal', by: 'p1' }, 'invalid_setup');
  });

  it('only the host deals, and only once per round', () => {
    const state = run([
      ...join(...NAMES),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: DECK_8, moderatorId: 'p1', publicRoles: true },
      },
    ]);
    expectError(state, { type: 'deal', by: 'p2' }, 'not_host');
    expectError(dealtRoom(), { type: 'deal', by: 'p1' }, 'wrong_phase');
  });

  it('locks the deck while cards are out', () => {
    expectError(
      dealtRoom(),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: {}, moderatorId: null, publicRoles: true },
      },
      'wrong_phase',
    );
  });
});

describe('joining mid-round', () => {
  it('blocks new players but lets existing players reconnect', () => {
    const state = dealtRoom();
    expectError(
      state,
      { type: 'join', token: 'token-new-player-xx', name: 'New' },
      'game_in_progress',
    );
    expect(
      applyRoom(state, { type: 'join', token: 'token-Binh-xxxxxxxx', name: 'Binh' }, makeCtx()).ok,
    ).toBe(true);
  });
});

describe('views (secrecy)', () => {
  it('a player sees only their own card', () => {
    const state = dealtRoom();
    const view = roomView(state, 'p2', T0);
    if (view.game.phase !== 'dealt' || state.game.phase !== 'dealt') throw new Error();
    expect(view.game.yourRole).toBe(state.game.assignments.p2);
    expect(view.game.assignments).toBeNull();
    // No other card appears anywhere in the serialized view.
    const others = Object.entries(state.game.assignments).filter(([id]) => id !== 'p2');
    const json = JSON.stringify(view);
    expect(json).not.toContain('token-');
    for (const [id] of others) expect(json).not.toMatch(new RegExp(`"playerId":"${id}"`));
  });

  it('the moderator sees the whole table and has no card', () => {
    const view = roomView(dealtRoom(), 'p1', T0);
    if (view.game.phase !== 'dealt') throw new Error();
    expect(view.game.yourRole).toBeNull();
    expect(view.game.assignments).toHaveLength(8);
  });

  it('hides the deck list from players when publicRoles is off', () => {
    const state = run([
      ...join('An', 'Binh', 'Chi'),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: { werewolf: 1 }, moderatorId: 'p2', publicRoles: false },
      },
    ]);
    expect(roomView(state, 'p3', T0).game.setup).toBeNull();
    expect(roomView(state, 'p1', T0).game.setup).not.toBeNull(); // host
    expect(roomView(state, 'p2', T0).game.setup).not.toBeNull(); // moderator
  });

  it('shows the deck to everyone when publicRoles is on', () => {
    const view = roomView(dealtRoom(), 'p5', T0);
    expect(view.game.setup?.roles).toEqual(DECK_8);
  });
});

describe('seen and reset', () => {
  it('tracks who looked at their card, once each', () => {
    let state = dealtRoom();
    state = run(
      [
        { type: 'seen', playerId: 'p2' },
        { type: 'seen', playerId: 'p2' },
      ],
      makeCtx(),
      state,
    );
    const view = roomView(state, 'p1', T0);
    if (view.game.phase !== 'dealt') throw new Error();
    expect(view.game.seenCount).toBe(1);
    expect(view.game.assignments?.find((a) => a.playerId === 'p2')?.seen).toBe(true);
  });

  it('the moderator has no card to confirm', () => {
    expectError(dealtRoom(), { type: 'seen', playerId: 'p1' }, 'no_card');
  });

  it('reset collects the cards and keeps the deck for the next round', () => {
    const state = run([{ type: 'reset', by: 'p1' }], makeCtx(), dealtRoom());
    expect(state.game).toEqual({
      phase: 'setup',
      round: 1,
      setup: { ...MANUAL, roles: DECK_8, moderatorId: 'p1', publicRoles: true },
    });
    const again = run([{ type: 'deal', by: 'p1' }], makeCtx(), state);
    expect(again.game.round).toBe(2);
  });

  it('only the host resets', () => {
    expectError(dealtRoom(), { type: 'reset', by: 'p2' }, 'not_host');
  });
});

describe('players leaving', () => {
  it('a leaving player loses their card', () => {
    const state = run([{ type: 'leave', playerId: 'p3' }], makeCtx(), dealtRoom());
    if (state.game.phase !== 'dealt') throw new Error();
    expect(state.game.assignments.p3).toBeUndefined();
  });

  it('a kicked moderator is cleared from the setup', () => {
    const state = run([
      ...join('An', 'Binh', 'Chi'),
      {
        type: 'setup',
        by: 'p1',
        setup: { ...MANUAL, roles: {}, moderatorId: 'p2', publicRoles: true },
      },
      { type: 'kick', by: 'p1', target: 'p2' },
    ]);
    expect(state.game.setup.moderatorId).toBeNull();
  });
});
