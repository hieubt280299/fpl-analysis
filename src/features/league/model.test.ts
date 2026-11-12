import { describe, expect, it } from 'vitest';
import type { Gameweek } from '@/domain/league';
import { monthsAwaitingFinalization, parseMonthDoc } from './model';

describe('parseMonthDoc', () => {
  it('returns null for a missing document', () => {
    expect(parseMonthDoc('2026-11', undefined)).toBeNull();
  });

  it('parses an open month and drops malformed participants', () => {
    const doc = parseMonthDoc('2026-11', {
      monthKey: '2026-11',
      leagueId: 758527,
      participants: [
        { entryId: 130307, playerName: 'Hieu Bui', entryName: 'Lukas FC' },
        { entryId: 'oops' },
      ],
      status: 'open',
      snapshot: null,
      updatedBy: 'admin@example.com',
      updatedAt: { toDate: () => new Date('2026-11-10T00:00:00Z') },
    });
    expect(doc).toMatchObject({
      status: 'open',
      leagueId: 758527,
      participants: [{ entryId: 130307, playerName: 'Hieu Bui', entryName: 'Lukas FC' }],
      snapshot: null,
      penaltyFree: {},
    });
    expect(doc?.updatedAt?.toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });

  it('parses penalty-free allowances, keeping only valid ones for current participants', () => {
    const doc = parseMonthDoc('2026-11', {
      leagueId: 1,
      participants: [
        { entryId: 1, playerName: 'A', entryName: 'a' },
        { entryId: 2, playerName: 'B', entryName: 'b' },
        { entryId: 3, playerName: 'C', entryName: 'c' },
      ],
      penaltyFree: { '1': 8, '2': 0, '3': -4, '99': 8, x: 4 },
      status: 'open',
      snapshot: null,
    });
    expect(doc?.penaltyFree).toEqual({ 1: 8 });
  });

  it('parses a finalized snapshot with string-keyed scores', () => {
    const doc = parseMonthDoc('2026-11', {
      leagueId: 1,
      participants: [{ entryId: 5, playerName: 'A', entryName: 'a' }],
      status: 'finalized',
      snapshot: {
        finalizedAt: '2026-12-01T00:00:00Z',
        gameweeks: [
          { id: 10, name: 'Gameweek 10', deadline: 'x', status: 'finished', dataChecked: true },
        ],
        scores: {
          '5': [{ gameweek: 10, points: 50, transferCost: 4, benchPoints: 2, chip: null }],
        },
        rules: { entryFee: 200, monthPoolShare: 0.4, prizeSplit: [3, 1] },
        leagueName: 'FPLừa 26/27',
      },
    });
    expect(doc?.status).toBe('finalized');
    expect(doc?.snapshot?.leagueName).toBe('FPLừa 26/27');
    expect(doc?.snapshot?.scores[5]?.[0]?.transferCost).toBe(4);
    expect(doc?.snapshot?.rules.prizeSplit).toEqual([3, 1]);
  });

  it('treats a "finalized" doc without a snapshot as open', () => {
    expect(parseMonthDoc('2026-11', { status: 'finalized', participants: [] })?.status).toBe(
      'open',
    );
  });
});

describe('monthsAwaitingFinalization', () => {
  const gw = (id: number, final: boolean): Gameweek => ({
    id,
    name: `Gameweek ${id}`,
    deadline: '2026-10-10T10:00:00Z',
    status: final ? 'finished' : 'live',
    dataChecked: final,
  });
  const month = (monthKey: string, status: 'open' | 'finalized', players = 4) =>
    parseMonthDoc(monthKey, {
      leagueId: 1,
      participants: Array.from({ length: players }, (_, i) => ({
        entryId: i + 1,
        playerName: `P${i}`,
        entryName: '',
      })),
      status,
      snapshot:
        status === 'finalized' ? { finalizedAt: 'x', gameweeks: [], scores: {}, rules: {} } : null,
    })!;
  const seasonMonths = [
    { key: '2026-10', gameweekIds: [6, 7, 8, 9] },
    { key: '2026-11', gameweekIds: [10, 11, 12] },
  ];
  const gameweeks = [
    gw(6, true),
    gw(7, true),
    gw(8, true),
    gw(9, true),
    gw(10, true),
    gw(11, false),
  ];

  it('lists open months whose gameweeks are all final', () => {
    expect(
      monthsAwaitingFinalization(
        [month('2026-11', 'open'), month('2026-10', 'open')],
        seasonMonths,
        gameweeks,
      ),
    ).toEqual(['2026-10']);
  });

  it('ignores finalized months, months without participants and other seasons', () => {
    expect(
      monthsAwaitingFinalization(
        [month('2026-10', 'finalized'), month('2026-10', 'open', 0), month('2025-10', 'open')],
        seasonMonths,
        gameweeks,
      ),
    ).toEqual([]);
  });
});
