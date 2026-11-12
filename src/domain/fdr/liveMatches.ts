import { MAX_MATCH_DURATION_MS } from '@/config/league';
import type { Fixture } from './types';

/**
 * A match is live from its kickoff until FPL marks it finished (capped at MAX_MATCH_DURATION_MS
 * after kickoff). Postponed matches (no kickoff time) are never live.
 */
export function isMatchLive(fixture: Fixture, now: number): boolean {
  if (fixture.finished || !fixture.kickoff) return false;
  const kickoff = Date.parse(fixture.kickoff);
  if (Number.isNaN(kickoff)) return false;
  return now >= kickoff && now < kickoff + MAX_MATCH_DURATION_MS;
}

/** True when at least one match of the given gameweeks is being played right now. */
export function hasLiveMatch(
  fixtures: readonly Fixture[],
  gameweekIds: readonly number[],
  now: number,
): boolean {
  const gameweeks = new Set(gameweekIds);
  return fixtures.some(
    (f) => f.gameweek !== null && gameweeks.has(f.gameweek) && isMatchLive(f, now),
  );
}
