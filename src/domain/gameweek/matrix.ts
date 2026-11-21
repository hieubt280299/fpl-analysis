import type { Lineup } from './types';

export interface MatrixCell {
  /** 0 when the owner has the player on the bench (not counting). */
  multiplier: number;
  /** Points the player scores for this owner (live points × multiplier). */
  points: number;
  isCaptain: boolean;
}

export interface MatrixRow {
  playerId: number;
  /** The player's live GW points (one copy). */
  points: number;
  /** Managers counting the player this GW. */
  activeOwners: number;
  /** By entry id; missing = not in that manager's squad. */
  cells: Record<number, MatrixCell>;
}

/**
 * Who owns which player this GW: one row per player who counts for at least one manager (starting
 * XI after subs; all 15 with Bench Boost). A manager who has the player on the bench gets a cell
 * with multiplier 0. Rows are ordered by live points, then by how many managers count them.
 */
export function ownershipMatrix(
  lineups: readonly Lineup[],
  points: ReadonlyMap<number, number>,
): MatrixRow[] {
  const rows = new Map<number, MatrixRow>();
  for (const lineup of lineups) {
    for (const pick of lineup.picks) {
      const playerPoints = points.get(pick.playerId) ?? 0;
      let row = rows.get(pick.playerId);
      if (!row) {
        row = { playerId: pick.playerId, points: playerPoints, activeOwners: 0, cells: {} };
        rows.set(pick.playerId, row);
      }
      if (pick.active) row.activeOwners += 1;
      row.cells[lineup.entryId] = {
        multiplier: pick.multiplier,
        points: playerPoints * pick.multiplier,
        isCaptain: pick.isCaptain,
      };
    }
  }
  return [...rows.values()]
    .filter((r) => r.activeOwners > 0)
    .sort(
      (a, b) => b.points - a.points || b.activeOwners - a.activeOwners || a.playerId - b.playerId,
    );
}
