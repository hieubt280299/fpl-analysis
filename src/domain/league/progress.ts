import { gameweekResultState } from './monthStandings';
import type { EventStatus, Gameweek, GameweekProgress } from './types';

/**
 * A more precise label for a provisional gameweek, using FPL's `event-status/`.
 * Returns null when there is nothing to add (gameweek pending or final, or the status refers to a
 * different gameweek) — callers then fall back to the plain Live / Provisional label.
 */
export function gameweekProgress(
  gameweek: Gameweek,
  status: EventStatus | null | undefined,
): GameweekProgress | null {
  if (!status || status.gameweek !== gameweek.id) return null;
  if (gameweekResultState(gameweek) !== 'provisional') return null;
  if (status.leagues === 'updating') return 'tables-updating';
  if (status.days.some((d) => d.points === 'live')) return 'live';
  if (status.days.some((d) => d.points === 'not-started')) return 'in-progress';
  if (status.days.length > 0 && status.days.every((d) => d.bonusAdded)) return 'bonus-added';
  return 'awaiting-bonus';
}

/** True while FPL is recalculating league tables — its API is often unavailable meanwhile. */
export function isFplUpdating(status: EventStatus | null | undefined): boolean {
  return status?.leagues === 'updating';
}
