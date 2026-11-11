import { describe, expect, it } from 'vitest';
import { parseMonthDoc } from './model';

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
    });
    expect(doc?.updatedAt?.toISOString()).toBe('2026-11-10T00:00:00.000Z');
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
      },
    });
    expect(doc?.status).toBe('finalized');
    expect(doc?.snapshot?.scores[5]?.[0]?.transferCost).toBe(4);
    expect(doc?.snapshot?.rules.prizeSplit).toEqual([3, 1]);
  });

  it('treats a "finalized" doc without a snapshot as open', () => {
    expect(parseMonthDoc('2026-11', { status: 'finalized', participants: [] })?.status).toBe(
      'open',
    );
  });
});
