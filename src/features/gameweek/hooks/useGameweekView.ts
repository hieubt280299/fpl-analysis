import { useCallback, useMemo } from 'react';
import { IMPORTANCE_LIST_SIZE } from '@/config/gameweek';
import { LIVE_REFRESH_INTERVAL_MS } from '@/config/league';
import type { Team } from '@/domain/fdr';
import {
  buildLineup,
  computeImportance,
  currentGameweek,
  fixturesByTeam,
  isAnyMatchLive,
  lineupPoints,
  livePlayerPoints,
  ownershipMatrix,
  sortMatches,
  teamsDone,
  type Lineup,
  type Player,
  type TeamFixture,
} from '@/domain/gameweek';
import { useGameweekParticipants } from '@/features/league';
import { useEntryPicks, useGameweekLive, useGameweekMatches } from '@/lib/fpl/gameweekQueries';
import { splitQueryError, useEventStatus, useSeasonData } from '@/lib/fpl/queries';
import { useNow } from '@/utils/useNow';

const NO_IDS: number[] = [];
const NO_FIXTURES: TeamFixture[] = [];

/** Names for ids shown on the page. */
export interface Lookups {
  player: (id: number) => Player | undefined;
  team: (id: number) => Team | undefined;
  /** A team's matches this GW (empty = blank GW). */
  teamFixtures: (teamId: number) => TeamFixture[];
}

/** Everything the Current GW page needs: matches, live points, lineups and their comparisons. */
export function useGameweekView() {
  const season = useSeasonData();
  const gameweek = season.data ? currentGameweek(season.data.gameweeks) : undefined;
  const gameweekId = gameweek?.id;
  const people = useGameweekParticipants(gameweekId);
  const eventStatus = useEventStatus();

  // Refresh only while a match is on. A 30 s clock notices kickoffs without polling FPL.
  const now = useNow(30_000);
  const matchesQuery = useGameweekMatches(gameweekId);
  const matchLive = isAnyMatchLive(matchesQuery.data ?? [], now);
  const interval = matchLive ? LIVE_REFRESH_INTERVAL_MS : false;
  useGameweekMatches(gameweekId, interval);
  const live = useGameweekLive(gameweekId, interval);

  const entryIds = useMemo(
    () => (people.participants.length ? people.participants.map((p) => p.entryId) : NO_IDS),
    [people.participants],
  );
  const picks = useEntryPicks(entryIds, gameweekId);

  const lookups = useMemo<Lookups>(() => {
    const players = new Map((season.data?.players ?? []).map((p) => [p.id, p] as const));
    const teams = new Map((season.data?.teams ?? []).map((t) => [t.id, t] as const));
    const fixtures = fixturesByTeam(matchesQuery.data ?? []);
    return {
      player: (id) => players.get(id),
      team: (id) => teams.get(id),
      teamFixtures: (teamId) => fixtures.get(teamId) ?? NO_FIXTURES,
    };
  }, [season.data, matchesQuery.data]);

  const matches = useMemo(() => sortMatches(matchesQuery.data ?? []), [matchesQuery.data]);
  const points = useMemo(() => livePlayerPoints(live.data ?? [], matches), [live.data, matches]);

  const lineups = useMemo<Lineup[]>(() => {
    if (!season.data || !live.data || !matchesQuery.data) return [];
    const ctx = {
      minutes: new Map(live.data.map((p) => [p.id, p.minutes] as const)),
      teamOf: new Map(season.data.players.map((p) => [p.id, p.teamId] as const)),
      doneTeams: teamsDone(
        matchesQuery.data,
        season.data.teams.map((t) => t.id),
      ),
      gameweekFinished: gameweek?.status === 'finished',
    };
    return entryIds.flatMap((id) => {
      const entry = picks.picks[id];
      return entry ? [buildLineup(entry, ctx)] : [];
    });
  }, [season.data, live.data, matchesQuery.data, gameweek?.status, entryIds, picks.picks]);

  const teamPoints = useMemo(
    () => new Map(lineups.map((l) => [l.entryId, lineupPoints(l, points)] as const)),
    [lineups, points],
  );
  const importance = useMemo(
    () => computeImportance(lineups, points, IMPORTANCE_LIST_SIZE),
    [lineups, points],
  );
  const matrix = useMemo(() => ownershipMatrix(lineups, points), [lineups, points]);

  const { refresh: refreshPicks } = picks;
  const { refetch: refetchLive } = live;
  const { refetch: refetchMatches } = matchesQuery;
  const refresh = useCallback(async () => {
    const [picksOk, liveResult, matchesResult] = await Promise.all([
      refreshPicks(),
      refetchLive(),
      refetchMatches(),
    ]);
    return picksOk && !liveResult.isError && !matchesResult.isError;
  }, [refreshPicks, refetchLive, refetchMatches]);

  const updatedTimes = [live.dataUpdatedAt, matchesQuery.dataUpdatedAt].filter((t) => t > 0);
  const refreshError =
    splitQueryError(season).refresh ??
    splitQueryError(matchesQuery).refresh ??
    splitQueryError(live).refresh ??
    picks.refreshError;

  return {
    gameweek,
    eventStatus: eventStatus.data ?? null,
    people,
    lookups,
    isPending: season.isPending,
    error: splitQueryError(season).blocking,
    refetchSeason: () => void season.refetch(),
    matches: {
      list: matches,
      isPending: matchesQuery.isPending,
      error: splitQueryError(matchesQuery).blocking,
      refetch: () => void matchesQuery.refetch(),
    },
    /** Live points are loading/failed (needed by everything except the match list). */
    live: {
      isPending: live.isPending || matchesQuery.isPending,
      error: splitQueryError(live).blocking ?? splitQueryError(matchesQuery).blocking,
      refetch: () => {
        void live.refetch();
        void matchesQuery.refetch();
      },
    },
    picks: {
      isPending: picks.isPending,
      failedEntryIds: picks.failedEntryIds,
      errors: picks.errors,
      refetch: picks.refetch,
    },
    points,
    lineups,
    teamPoints,
    importance,
    matrix,
    autoRefreshing: matchLive,
    isFetching: live.isFetching || matchesQuery.isFetching || picks.isFetching,
    updatedAt: updatedTimes.length ? new Date(Math.min(...updatedTimes)) : null,
    refreshError,
    refresh,
  };
}

export type GameweekView = ReturnType<typeof useGameweekView>;
