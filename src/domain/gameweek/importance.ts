import type { Lineup } from './types';

export interface ImportanceItem {
  playerId: number;
  /** This manager's multiplier for the player (0 if not owned or not playing). */
  multiplier: number;
  /** Average multiplier of the other managers. */
  rivalAverage: number;
  /**
   * multiplier − rivalAverage: points gained (or lost, when negative) on the average rival for
   * each point the player scores. 1.5 = +150 %.
   */
  gap: number;
  /** The player's live GW points (one copy, not multiplied). */
  points: number;
  /** gap × points: what the player has gained or cost so far against the average rival. */
  swing: number;
}

export interface ManagerImportance {
  entryId: number;
  /** Players helping this manager most against the others (biggest positive gaps). */
  differentials: ImportanceItem[];
  /** Players hurting this manager most (biggest negative gaps). */
  threats: ImportanceItem[];
}

function multiplierOf(lineup: Lineup, playerId: number): number {
  return lineup.picks.find((p) => p.playerId === playerId)?.multiplier ?? 0;
}

/**
 * Differentials and threats for every manager, ranked by the ownership gap against the other
 * managers (as fplgameweek.com's "Importance"). Ties go to the player with more live points.
 * The gap uses the live lineups, so projected subs and captaincy changes count.
 */
export function computeImportance(
  lineups: readonly Lineup[],
  points: ReadonlyMap<number, number>,
  limit: number,
): ManagerImportance[] {
  const players = new Set<number>();
  for (const l of lineups) for (const p of l.picks) if (p.multiplier > 0) players.add(p.playerId);
  const multipliers = new Map(
    [...players].map((id) => [id, lineups.map((l) => multiplierOf(l, id))] as const),
  );
  const rivals = lineups.length - 1;

  return lineups.map((lineup, index) => {
    if (rivals < 1) return { entryId: lineup.entryId, differentials: [], threats: [] };
    const items: ImportanceItem[] = [...players].map((playerId) => {
      const all = multipliers.get(playerId) ?? [];
      const mine = all[index] ?? 0;
      const total = all.reduce((s, m) => s + m, 0);
      const rivalAverage = (total - mine) / rivals;
      const gap = mine - rivalAverage;
      const playerPoints = points.get(playerId) ?? 0;
      return {
        playerId,
        multiplier: mine,
        rivalAverage,
        gap,
        points: playerPoints,
        swing: gap * playerPoints,
      };
    });
    const byPoints = (a: ImportanceItem, b: ImportanceItem) =>
      b.points - a.points || a.playerId - b.playerId;
    return {
      entryId: lineup.entryId,
      differentials: items
        .filter((i) => i.gap > 0)
        .sort((a, b) => b.gap - a.gap || byPoints(a, b))
        .slice(0, limit),
      threats: items
        .filter((i) => i.gap < 0)
        .sort((a, b) => a.gap - b.gap || byPoints(a, b))
        .slice(0, limit),
    };
  });
}
