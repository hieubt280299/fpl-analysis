import type { FdrRow } from '@/domain/fdr';

/** A column key, or a gameweek id for one of the fixture columns. */
export type FdrSortKey = 'avg' | 'team' | 'lastSeason' | 'thisSeason' | number;
export type SortDirection = 'asc' | 'desc';

export interface FdrSort {
  key: FdrSortKey;
  direction: SortDirection;
}

/** Easiest run first, like the original sheet. */
export const DEFAULT_FDR_SORT: FdrSort = { key: 'avg', direction: 'asc' };

function sortValue(row: FdrRow, key: FdrSortKey): number | string {
  switch (key) {
    case 'avg':
      return row.score;
    case 'team':
      return row.team.name;
    case 'lastSeason':
      return row.lastSeasonPosition;
    case 'thisSeason':
      return row.thisSeasonPosition;
    default:
      return row.cells.find((c) => c.gameweek === key)?.value ?? Number.POSITIVE_INFINITY;
  }
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return (a as number) - (b as number);
}

/**
 * Sorts FDR rows by any column. Ties fall back to AVG (ascending) and then team name, regardless
 * of direction, so the order is always stable and meaningful.
 */
export function sortFdrRows(rows: readonly FdrRow[], sort: FdrSort): FdrRow[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort(
    (a, b) =>
      sign * compareValues(sortValue(a, sort.key), sortValue(b, sort.key)) ||
      a.score - b.score ||
      a.team.name.localeCompare(b.team.name),
  );
}

/** Clicking the active column flips direction; a new column starts ascending. */
export function nextSort(current: FdrSort, key: FdrSortKey): FdrSort {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}
