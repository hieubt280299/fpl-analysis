import { useCallback, useMemo } from 'react';
import { buildLineup, lineupContext, lineupScore, livePlayerPoints } from '@/domain/gameweek';
import type { GameweekScore } from '@/domain/league';
import { useEntryPicks, useGameweekLive, useGameweekMatches } from '@/lib/fpl/gameweekQueries';
import { splitQueryError, useSeasonData, type RefetchInterval } from '@/lib/fpl/queries';

const NO_IDS: number[] = [];

/**
 * Live scores of a gameweek that is being played, worked out like the Current GW page: FPL's
 * live player points + projected bonus, projected automatic subs and captaincy (`buildLineup`).
 * FPL's own numbers (history, league standings) leave subs out until it processes the GW.
 * Pass `gameweek` only while it is live; queries are shared with the Current GW page.
 * Entries whose picks or live data are missing are simply absent from `scores`.
 */
export function useLiveGameweekScores(
  gameweek: number | undefined,
  entryIds: readonly number[],
  refetchInterval: RefetchInterval,
) {
  const season = useSeasonData();
  const matches = useGameweekMatches(gameweek, refetchInterval);
  const live = useGameweekLive(gameweek, refetchInterval);
  const picks = useEntryPicks(gameweek === undefined ? NO_IDS : entryIds, gameweek);

  const scores = useMemo(() => {
    const result = new Map<number, GameweekScore>();
    if (gameweek === undefined || !season.data || !live.data || !matches.data) return result;
    const ctx = lineupContext({
      live: live.data,
      matches: matches.data,
      players: season.data.players,
      teamIds: season.data.teams.map((t) => t.id),
      gameweekFinished: false,
    });
    const points = livePlayerPoints(live.data, matches.data);
    for (const [key, entry] of Object.entries(picks.picks)) {
      result.set(Number(key), lineupScore(buildLineup(entry, ctx), points, gameweek));
    }
    return result;
  }, [gameweek, season.data, live.data, matches.data, picks.picks]);

  const { refetch: refetchLive } = live;
  const { refetch: refetchMatches } = matches;
  const refresh = useCallback(async () => {
    if (gameweek === undefined) return true;
    const [liveResult, matchesResult] = await Promise.all([refetchLive(), refetchMatches()]);
    return !liveResult.isError && !matchesResult.isError;
  }, [gameweek, refetchLive, refetchMatches]);

  const updatedTimes = [live.dataUpdatedAt, matches.dataUpdatedAt].filter((t) => t > 0);
  return {
    scores,
    isFetching: live.isFetching || matches.isFetching || picks.isFetching,
    /** When the oldest live data was fetched; null when not in use. */
    updatedAt: gameweek !== undefined && updatedTimes.length ? Math.min(...updatedTimes) : null,
    refreshError:
      splitQueryError(live).refresh ?? splitQueryError(matches).refresh ?? picks.refreshError,
    /** Refetches live points and matches (picks are fixed at the deadline). */
    refresh,
  };
}
