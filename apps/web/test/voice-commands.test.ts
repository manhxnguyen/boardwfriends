import { describe, expect, it } from 'vitest';
import { matchPlayer, normalize, parseVoiceCommand } from '../src/lib/voice-commands.ts';

const players = [
  { id: 'p1', name: 'Bình' },
  { id: 'p2', name: 'Nguyễn Văn An' },
  { id: 'p3', name: 'Đức' },
  { id: 'p4', name: 'Anh' },
];

describe('normalize', () => {
  it('strips Vietnamese diacritics and punctuation', () => {
    expect(normalize('Tôi đề cử Đức!')).toBe('toi de cu duc');
  });
});

describe('parseVoiceCommand', () => {
  it.each([
    ['tôi đề cử Bình', { cmd: 'nominate', target: 'p1' }],
    ['Đề cử Đức', { cmd: 'nominate', target: 'p3' }],
    ['I nominate Anh', { cmd: 'nominate', target: 'p4' }],
    ['tôi ủng hộ', { cmd: 'second' }],
    ['second', { cmd: 'second' }],
    ['bỏ phiếu đi', { cmd: 'start-vote' }],
    ['tạm dừng', { cmd: 'pause' }],
    ['tiếp tục nào', { cmd: 'resume' }],
    ['kết thúc ngày', { cmd: 'end-day' }],
    ['đọc lại', { cmd: 'repeat' }],
  ])('"%s"', (text, expected) => {
    expect(parseVoiceCommand(text, players)).toEqual(expected);
  });

  it('ignores ordinary conversation', () => {
    expect(parseVoiceCommand('mình nghĩ Bình đang nói dối', players)).toBeNull();
    expect(parseVoiceCommand('tôi đồng ý với Đức', players)).toBeNull();
    expect(parseVoiceCommand('who should we vote for', players)).toBeNull();
    expect(parseVoiceCommand('', players)).toBeNull();
  });

  it('does not nominate when the name is not recognised', () => {
    expect(parseVoiceCommand('tôi đề cử ai đó', players)).toBeNull();
  });
});

describe('matchPlayer', () => {
  it('prefers the longest matching name', () => {
    expect(matchPlayer('nguyen van an', players)).toBe('p2');
  });

  it('accepts a first name when it is unambiguous', () => {
    expect(matchPlayer('nguyen', players)).toBe('p2');
  });

  it('does not match a name inside another word', () => {
    expect(matchPlayer('anhduc', players)).toBeNull();
  });
});
