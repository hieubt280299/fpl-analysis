import { describe, expect, it } from 'vitest';
import {
  formatMonthLabel,
  groupGameweeksByMonth,
  isMonthKey,
  isValidTimeZone,
  pickDefaultMonth,
  toMonthKey,
} from './months';
import type { Gameweek } from './types';

// Real 2026/27 deadlines from bootstrap-static.
const DEADLINES: Record<number, string> = {
  6: '2026-10-10T10:00:00Z',
  7: '2026-10-17T10:00:00Z',
  8: '2026-10-23T17:30:00Z',
  9: '2026-10-31T11:00:00Z',
  10: '2026-11-06T18:30:00Z',
  11: '2026-11-21T11:00:00Z',
  12: '2026-11-27T18:30:00Z',
  13: '2026-12-01T18:30:00Z',
  14: '2026-12-05T11:00:00Z',
};

function gw(id: number, status: Gameweek['status'] = 'upcoming'): Gameweek {
  return { id, name: `Gameweek ${id}`, deadline: DEADLINES[id] ?? '', status, dataChecked: false };
}

describe('groupGameweeksByMonth', () => {
  it('puts GW10–12 in November 2026 (matches the original sheet and FPL phases)', () => {
    const months = groupGameweeksByMonth(
      Object.keys(DEADLINES)
        .map(Number)
        .map((id) => gw(id)),
      'Asia/Ho_Chi_Minh',
    );
    expect(months).toEqual([
      { key: '2026-10', gameweekIds: [6, 7, 8, 9] },
      { key: '2026-11', gameweekIds: [10, 11, 12] },
      { key: '2026-12', gameweekIds: [13, 14] },
    ]);
  });

  it('evaluates the deadline day in the configured time zone', () => {
    const lateFridayUtc = '2026-10-30T18:30:00Z'; // Fri 19:30 London, Sat 01:30 Vietnam
    expect(toMonthKey(lateFridayUtc, 'Europe/London')).toBe('2026-10');
    expect(toMonthKey('2026-10-31T18:30:00Z', 'Europe/London')).toBe('2026-10');
    expect(toMonthKey('2026-10-31T18:30:00Z', 'Asia/Ho_Chi_Minh')).toBe('2026-11');
  });
});

describe('pickDefaultMonth', () => {
  const gameweeks = [gw(9, 'finished'), gw(10, 'finished'), gw(11), gw(12), gw(13)];
  const months = groupGameweeksByMonth(gameweeks, 'UTC');

  it('returns the month of the latest started gameweek', () => {
    expect(pickDefaultMonth(months, gameweeks)).toBe('2026-11');
  });

  it('falls back to the first month before the season starts', () => {
    const preseason = gameweeks.map((g) => ({ ...g, status: 'upcoming' as const }));
    expect(pickDefaultMonth(months, preseason)).toBe('2026-10');
  });
});

describe('helpers', () => {
  it('validates month keys and time zones', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('formats month labels', () => {
    expect(formatMonthLabel('2026-11')).toBe('November 2026');
    expect(formatMonthLabel('2026-11', 'short')).toBe('Nov 2026');
  });
});
