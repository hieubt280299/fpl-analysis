import type { GameweekScore } from './types';

/** A manager's row in FPL's live classic-league standings. */
export interface LiveStanding {
  /** Gross points in the gameweek FPL currently considers current (`event_total`). */
  eventPoints: number;
  /** Season total after hits, including that gameweek (`total`). */
  totalPoints: number;
}

/**
 * FPL updates an entry's `history/` only after a gameweek is processed, so during a live
 * gameweek it reports 0 points. The league standings are refreshed live. This copies the
 * standings' gameweek points onto `gameweek` for every entry whose standings are consistent with
 * its history:
 *
 *   standings total = net points of every earlier gameweek + event points − this gameweek's hit
 *
 * The check guards against standings that already refer to a different gameweek (they carry no
 * gameweek id) — e.g. just after the next deadline, before our gameweek list has refreshed.
 * Entries that fail the check, or have no standings row, keep their history unchanged.
 */
export function applyLiveStandings(
  scores: Readonly<Record<number, readonly GameweekScore[]>>,
  gameweek: number,
  standings: ReadonlyMap<number, LiveStanding>,
): Record<number, GameweekScore[]> {
  const result: Record<number, GameweekScore[]> = {};
  for (const [key, history] of Object.entries(scores)) {
    const entryId = Number(key);
    const live = standings.get(entryId);
    const current = history.find((s) => s.gameweek === gameweek);
    if (!live || !current || current.points === live.eventPoints) {
      result[entryId] = [...history];
      continue;
    }
    const netBefore = history
      .filter((s) => s.gameweek < gameweek)
      .reduce((sum, s) => sum + s.points - s.transferCost, 0);
    const consistent = live.totalPoints === netBefore + live.eventPoints - current.transferCost;
    result[entryId] = consistent
      ? history.map((s) => (s.gameweek === gameweek ? { ...s, points: live.eventPoints } : s))
      : [...history];
  }
  return result;
}

/**
 * Replaces each entry's score for a gameweek with a live one worked out from its picks (live
 * points, projected automatic subs and captaincy — see `lineupScore`). Entries without a live
 * score keep what they had; entries with only a live score get a history of that one gameweek.
 */
export function applyLiveScores(
  scores: Readonly<Record<number, readonly GameweekScore[]>>,
  live: ReadonlyMap<number, GameweekScore>,
): Record<number, GameweekScore[]> {
  const result: Record<number, GameweekScore[]> = {};
  for (const [key, history] of Object.entries(scores)) result[Number(key)] = [...history];
  for (const [entryId, score] of live) {
    const history = (result[entryId] ?? []).filter((s) => s.gameweek !== score.gameweek);
    result[entryId] = [...history, score].sort((a, b) => a.gameweek - b.gameweek);
  }
  return result;
}
