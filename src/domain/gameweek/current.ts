import { MAX_MATCH_DURATION_MS } from '@/config/league';
import type { Gameweek } from '@/domain/league';
import type { Match } from './types';

/**
 * The gameweek the Current GW page shows: the latest one whose deadline has passed (FPL's current
 * GW, still shown after its matches end until the next deadline). Undefined before GW1.
 */
export function currentGameweek(gameweeks: readonly Gameweek[]): Gameweek | undefined {
  return gameweeks.filter((gw) => gw.status !== 'upcoming').at(-1);
}

/**
 * True while a match is being played: from kickoff until FPL marks it finished (provisionally),
 * capped at MAX_MATCH_DURATION_MS after kickoff in case FPL's flag arrives late.
 */
export function isAnyMatchLive(matches: readonly Match[], now: number): boolean {
  return matches.some((m) => {
    if (m.finished || m.finishedProvisional || !m.kickoff) return false;
    const kickoff = Date.parse(m.kickoff);
    return !Number.isNaN(kickoff) && now >= kickoff && now < kickoff + MAX_MATCH_DURATION_MS;
  });
}
