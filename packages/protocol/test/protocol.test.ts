import { describe, expect, it } from 'vitest';
import {
  NAME_MAX_LENGTH,
  PROTOCOL_VERSION,
  isRoomCode,
  normalizeRoomCode,
  parseClientMessage,
} from '../src/index.ts';

const TOKEN = 'abcdefghijklmnop1234';

describe('parseClientMessage', () => {
  it('accepts a valid hello and trims the name', () => {
    const r = parseClientMessage(
      JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, token: TOKEN, name: '  Linh  ' }),
    );
    expect(r).toEqual({
      ok: true,
      value: { t: 'hello', v: PROTOCOL_VERSION, token: TOKEN, name: 'Linh', as: 'player' },
    });
  });

  it('accepts Vietnamese names', () => {
    const r = parseClientMessage(JSON.stringify({ t: 'rename', name: 'Nguyễn Thị Ánh' }));
    expect(r.ok).toBe(true);
  });

  it.each([
    ['non-string frame', 42, 'not_text'],
    ['invalid JSON', '{nope', 'not_json'],
    ['unknown type', JSON.stringify({ t: 'explode' }), undefined],
    ['empty name', JSON.stringify({ t: 'rename', name: '   ' }), 'name_empty'],
    [
      'name too long',
      JSON.stringify({ t: 'rename', name: 'x'.repeat(NAME_MAX_LENGTH + 1) }),
      'name_too_long',
    ],
    [
      'short token',
      JSON.stringify({ t: 'hello', v: 1, token: 'short', name: 'A' }),
      'token_invalid',
    ],
    [
      'token with bad characters',
      JSON.stringify({ t: 'hello', v: 1, token: 'abcdefghijklmnop/<>"', name: 'A' }),
      'token_invalid',
    ],
    ['oversized frame', 'x'.repeat(5000), 'too_large'],
  ])('rejects %s', (_label, raw, error) => {
    const r = parseClientMessage(raw);
    expect(r.ok).toBe(false);
    if (!r.ok && error) expect(r.error).toBe(error);
  });
});

describe('game messages', () => {
  const setup = (roles: unknown) =>
    parseClientMessage(
      JSON.stringify({
        t: 'setup',
        game: 'classic',
        mode: 'auto',
        roles,
        oneNightRoles: {},
        moderatorId: null,
        publicRoles: true,
        reveal: 'role',
        dayMinutes: 5,
        voice: false,
      }),
    );

  it('accepts a deck', () => {
    expect(setup({ werewolf: 2, seer: 1, villager: 5 }).ok).toBe(true);
  });

  it.each([
    ['unknown role', { chupacabra: 1 }],
    ['negative count', { werewolf: -1 }],
    ['fractional count', { werewolf: 1.5 }],
    ['absurd count', { villager: 999 }],
  ])('rejects a deck with %s', (_label, roles) => {
    expect(setup(roles).ok).toBe(false);
  });

  it.each(['deal', 'seen', 'reset'])('accepts %s', (t) => {
    expect(parseClientMessage(JSON.stringify({ t })).ok).toBe(true);
  });
});

describe('room codes', () => {
  it('normalizes user input', () => {
    expect(normalizeRoomCode(' abcd ')).toBe('ABCD');
  });

  it('rejects look-alike characters and wrong lengths', () => {
    expect(isRoomCode('ABCD')).toBe(true);
    expect(isRoomCode('ABC0')).toBe(false);
    expect(isRoomCode('ABCI')).toBe(false);
    expect(isRoomCode('ABC')).toBe(false);
    expect(isRoomCode('ABCDE')).toBe(false);
  });
});
