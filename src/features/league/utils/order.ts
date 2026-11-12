import type { ParticipantMonthRow } from '@/domain/league';

/** 'month' or a gameweek id. */
export type PointsSortKey = 'month' | number;

/** 'desc' = highest points first (best position first); 'asc' = lowest first. */
export interface PointsSort {
  key: PointsSortKey;
  direction: 'asc' | 'desc';
}

export const DEFAULT_POINTS_SORT: PointsSort = { key: 'month', direction: 'desc' };

function byMonthThenName(a: ParticipantMonthRow, b: ParticipantMonthRow): number {
  const pa = a.month.position ?? Number.POSITIVE_INFINITY;
  const pb = b.month.position ?? Number.POSITIVE_INFINITY;
  return pa - pb || a.participant.playerName.localeCompare(b.participant.playerName);
}

/**
 * Orders the points table by the month or by one gameweek. Uses the finishing position (so the
 * tie-breakers count); rows without a position (gameweek not played yet) go last.
 */
export function sortPointsRows(
  rows: readonly ParticipantMonthRow[],
  sort: PointsSort,
): ParticipantMonthRow[] {
  const position = (row: ParticipantMonthRow) =>
    sort.key === 'month' ? row.month.position : (row.gameweeks[sort.key]?.position ?? null);
  const sign = sort.direction === 'desc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const pa = position(a);
    const pb = position(b);
    if (pa === null || pb === null) {
      if (pa === pb) return byMonthThenName(a, b);
      return pa === null ? 1 : -1;
    }
    return sign * (pa - pb) || byMonthThenName(a, b);
  });
}

/** Clicking the active column flips direction; a new column starts with the best first. */
export function nextPointsSort(current: PointsSort, key: PointsSortKey): PointsSort {
  if (current.key === key) return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' };
  return { key, direction: 'desc' };
}

/** Prizes table order: most prize money first, then month position, then name. */
export function sortByTotalPrize(rows: readonly ParticipantMonthRow[]): ParticipantMonthRow[] {
  return [...rows].sort((a, b) => b.totalPrize - a.totalPrize || byMonthThenName(a, b));
}
