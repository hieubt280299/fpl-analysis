import { describe, expect, it } from 'vitest';
import type { GameweekCell, ParticipantMonthRow } from '@/domain/league';
import { DEFAULT_POINTS_SORT, nextPointsSort, sortByTotalPrize, sortPointsRows } from './order';

function cell(position: number | null): GameweekCell {
  return {
    score: null,
    points: position === null ? null : 50,
    net: position === null ? null : 50,
    transferCost: 0,
    waivedCost: 0,
    position,
    tieSize: 1,
    prize: 0,
  };
}

function row(
  name: string,
  monthPosition: number | null,
  gw10: number | null,
  totalPrize: number,
): ParticipantMonthRow {
  return {
    participant: { entryId: name.length, playerName: name, entryName: '' },
    gameweeks: { 10: cell(gw10), 11: cell(null) },
    month: {
      points: 0,
      chipsUsed: 0,
      benchPoints: 0,
      transferCost: 0,
      waivedCost: 0,
      position: monthPosition,
      tieSize: 1,
      prize: 0,
    },
    totalPrize,
  };
}

const rows = [
  row('An', 3, 1, 120),
  row('Quy', 1, 2, 280),
  row('Hieu', 2, 3, 80),
  row('Huy', 4, 4, 0),
];
const names = (list: ParticipantMonthRow[]) => list.map((r) => r.participant.playerName);

describe('sortPointsRows', () => {
  it('defaults to the month ranking', () => {
    expect(names(sortPointsRows(rows, DEFAULT_POINTS_SORT))).toEqual(['Quy', 'Hieu', 'An', 'Huy']);
  });

  it('sorts by a gameweek, best first or reversed', () => {
    expect(names(sortPointsRows(rows, { key: 10, direction: 'desc' }))).toEqual([
      'An',
      'Quy',
      'Hieu',
      'Huy',
    ]);
    expect(names(sortPointsRows(rows, { key: 10, direction: 'asc' }))).toEqual([
      'Huy',
      'Hieu',
      'Quy',
      'An',
    ]);
  });

  it('falls back to the month order for a gameweek without results', () => {
    expect(names(sortPointsRows(rows, { key: 11, direction: 'desc' }))).toEqual([
      'Quy',
      'Hieu',
      'An',
      'Huy',
    ]);
  });
});

describe('nextPointsSort', () => {
  it('toggles the active column and starts new columns best-first', () => {
    expect(nextPointsSort(DEFAULT_POINTS_SORT, 'month')).toEqual({
      key: 'month',
      direction: 'asc',
    });
    expect(nextPointsSort(DEFAULT_POINTS_SORT, 10)).toEqual({ key: 10, direction: 'desc' });
  });
});

describe('sortByTotalPrize', () => {
  it('puts the biggest winner first, then month position', () => {
    expect(names(sortByTotalPrize(rows))).toEqual(['Quy', 'An', 'Hieu', 'Huy']);
  });
});
