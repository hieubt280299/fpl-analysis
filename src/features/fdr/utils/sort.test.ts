import { describe, expect, it } from 'vitest';
import type { FdrRow } from '@/domain/fdr';
import { DEFAULT_FDR_SORT, nextSort, sortFdrRows } from './sort';

function row(name: string, score: number, last: number, current: number, gw10: number): FdrRow {
  return {
    team: { id: last, code: last, name, shortName: name.slice(0, 3) },
    lastSeasonPosition: last,
    thisSeasonPosition: current,
    cells: [{ gameweek: 10, fixtures: [], value: gw10 }],
    rawScore: score,
    score,
    rank: 0,
  };
}

const rows = [
  row('Chelsea', 23.4, 10, 4, 3),
  row('Arsenal', 25.2, 1, 1, 2),
  row('Brighton', 23.4, 8, 3, 3),
  row('Hull City', 33.9, 20, 11, 5),
];
const names = (sorted: FdrRow[]) => sorted.map((r) => r.team.name);

describe('sortFdrRows', () => {
  it('defaults to AVG ascending with ties listed alphabetically', () => {
    expect(names(sortFdrRows(rows, DEFAULT_FDR_SORT))).toEqual([
      'Brighton',
      'Chelsea',
      'Arsenal',
      'Hull City',
    ]);
  });

  it('sorts by team name and by either season position, in both directions', () => {
    expect(names(sortFdrRows(rows, { key: 'team', direction: 'desc' }))).toEqual([
      'Hull City',
      'Chelsea',
      'Brighton',
      'Arsenal',
    ]);
    expect(names(sortFdrRows(rows, { key: 'lastSeason', direction: 'asc' }))[0]).toBe('Arsenal');
    expect(names(sortFdrRows(rows, { key: 'thisSeason', direction: 'desc' }))[0]).toBe('Hull City');
  });

  it('sorts by a gameweek column, breaking ties by AVG', () => {
    expect(names(sortFdrRows(rows, { key: 10, direction: 'asc' }))).toEqual([
      'Arsenal',
      'Brighton',
      'Chelsea',
      'Hull City',
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...rows];
    sortFdrRows(rows, { key: 'team', direction: 'asc' });
    expect(rows).toEqual(copy);
  });
});

describe('nextSort', () => {
  it('toggles the active column and starts new columns ascending', () => {
    expect(nextSort(DEFAULT_FDR_SORT, 'avg')).toEqual({ key: 'avg', direction: 'desc' });
    expect(nextSort({ key: 'avg', direction: 'desc' }, 'team')).toEqual({
      key: 'team',
      direction: 'asc',
    });
  });
});
