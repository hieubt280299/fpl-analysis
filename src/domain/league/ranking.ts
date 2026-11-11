import { sum } from '../shared/math';

export interface RankingScore {
  /** Net points (after transfer hits). Higher is better. */
  points: number;
  /** Chips played in the period. Fewer is better (1st tie-breaker). */
  chipsUsed: number;
  /** Points left on the bench in the period. More is better (2nd tie-breaker). */
  benchPoints: number;
}

export interface RankedEntry<T> {
  item: T;
  /** 1-based finishing position; tied entries share the best position ("1224" ranking). */
  position: number;
  /** Number of entries sharing this position (1 = no tie). */
  tieSize: number;
  /** Prize money for this entry after splitting ties. */
  prize: number;
}

/** Negative when `a` ranks ahead of `b`; 0 when they are fully tied after all tie-breakers. */
export function compareRankingScores(a: RankingScore, b: RankingScore): number {
  return b.points - a.points || a.chipsUsed - b.chipsUsed || b.benchPoints - a.benchPoints;
}

/**
 * Ranks entries (highest points first, then fewest chips, then most bench points) and awards
 * `prizes` by position. Entries still level after both tie-breakers share a position, and the
 * prizes for every position they occupy are pooled and split equally between them.
 *
 * Example: prizes [120, 40] and three entries tied 1st → each gets (120 + 40 + 0) / 3.
 */
export function rankWithPrizes<T>(
  items: readonly T[],
  getScore: (item: T) => RankingScore,
  prizes: readonly number[],
  /** Display-only ordering inside a tie; never affects position or prize. */
  tieDisplayOrder: (a: T, b: T) => number = () => 0,
): RankedEntry<T>[] {
  const sorted = [...items].sort(
    (a, b) => compareRankingScores(getScore(a), getScore(b)) || tieDisplayOrder(a, b),
  );

  const result: RankedEntry<T>[] = [];
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (
      end < sorted.length &&
      compareRankingScores(getScore(sorted[start] as T), getScore(sorted[end] as T)) === 0
    ) {
      end += 1;
    }
    const tieSize = end - start;
    const pooled = sum(prizes.slice(start, end));
    const share = pooled / tieSize;
    for (let i = start; i < end; i += 1) {
      result.push({ item: sorted[i] as T, position: start + 1, tieSize, prize: share });
    }
    start = end;
  }
  return result;
}
