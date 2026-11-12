import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Fixture, Team } from '@/domain/fdr';
import type { EventStatus, Gameweek, GameweekScore } from '@/domain/league';
import { fetchAllLeagueStandings, fplApi } from './client';
import {
  mapEntryHistory,
  mapEventStatus,
  mapFixtures,
  mapGameweeks,
  mapLeagueMember,
  mapTeams,
  type LeagueMember,
} from './mappers';

const MINUTE = 60_000;

export const fplKeys = {
  all: ['fpl'] as const,
  bootstrap: () => [...fplKeys.all, 'bootstrap'] as const,
  eventStatus: () => [...fplKeys.all, 'event-status'] as const,
  fixtures: () => [...fplKeys.all, 'fixtures'] as const,
  league: (leagueId: number) => [...fplKeys.all, 'league', leagueId] as const,
  entryHistory: (entryId: number) => [...fplKeys.all, 'entry-history', entryId] as const,
};

export interface SeasonData {
  gameweeks: Gameweek[];
  teams: Team[];
}

/** Gameweeks (with deadlines/status) and teams. The 1.8 MB raw payload is mapped and dropped. */
export function useSeasonData() {
  return useQuery({
    queryKey: fplKeys.bootstrap(),
    queryFn: async ({ signal }): Promise<SeasonData> => {
      const raw = await fplApi.bootstrap(signal);
      return { gameweeks: mapGameweeks(raw.events), teams: mapTeams(raw.teams) };
    },
    staleTime: 5 * MINUTE,
  });
}

/** FPL's processing state for the current gameweek. Refreshes every minute while the page is open. */
export function useEventStatus() {
  return useQuery({
    queryKey: fplKeys.eventStatus(),
    queryFn: async ({ signal }): Promise<EventStatus> =>
      mapEventStatus(await fplApi.eventStatus(signal)),
    staleTime: MINUTE,
    refetchInterval: MINUTE,
    retry: 1,
  });
}

/** Auto-refresh period in ms, or false for none. Polling pauses while the tab is hidden. */
type RefetchInterval = number | false;

export function useFixtures(refetchInterval: RefetchInterval = false) {
  return useQuery({
    queryKey: fplKeys.fixtures(),
    queryFn: async ({ signal }): Promise<Fixture[]> => mapFixtures(await fplApi.fixtures(signal)),
    staleTime: 5 * MINUTE,
    refetchInterval,
  });
}

export function useLeagueMembers(leagueId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: fplKeys.league(leagueId ?? 0),
    queryFn: async ({ signal }): Promise<{ leagueName: string; members: LeagueMember[] }> => {
      const { leagueName, results } = await fetchAllLeagueStandings(leagueId as number, signal);
      return { leagueName, members: results.map(mapLeagueMember) };
    },
    enabled: enabled && typeof leagueId === 'number' && leagueId > 0,
    staleTime: 2 * MINUTE,
  });
}

export interface EntryHistoriesResult {
  /** Scores keyed by entry id (only entries that loaded successfully). */
  scores: Record<number, GameweekScore[]>;
  isPending: boolean;
  isFetching: boolean;
  /** Entries with no data at all (never loaded, and the request failed). */
  failedEntryIds: number[];
  errors: Error[];
  /** A refresh failed, but older (cached) data is still shown for every entry. */
  refreshError: Error | null;
  /** When the oldest shown history was fetched (ms epoch), or null if none loaded. */
  oldestUpdatedAt: number | null;
  refetch: () => void;
}

/**
 * Splits a query's error into "blocking" (no data to show) vs "refresh failed" (stale data is
 * still available, e.g. restored from the browser cache while FPL is down).
 */
export function splitQueryError(query: { data: unknown; error: Error | null }): {
  blocking: Error | null;
  refresh: Error | null;
} {
  if (!query.error) return { blocking: null, refresh: null };
  return query.data === undefined
    ? { blocking: query.error, refresh: null }
    : { blocking: null, refresh: query.error };
}

/**
 * Loads the season history of every given entry in parallel.
 * Pass a referentially stable `entryIds` array (e.g. from useMemo) so results stay memoised.
 */
export function useEntryHistories(
  entryIds: readonly number[],
  enabled = true,
  refetchInterval: RefetchInterval = false,
): EntryHistoriesResult {
  const combine = useCallback(
    (results: UseQueryResult<GameweekScore[]>[]): EntryHistoriesResult => {
      const scores: Record<number, GameweekScore[]> = {};
      const failedEntryIds: number[] = [];
      const errors: Error[] = [];
      let refreshError: Error | null = null;
      const updatedAt: number[] = [];
      results.forEach((r, i) => {
        const entryId = entryIds[i] as number;
        if (r.data) {
          scores[entryId] = r.data;
          updatedAt.push(r.dataUpdatedAt);
        }
        const { blocking, refresh } = splitQueryError(r);
        if (blocking) {
          failedEntryIds.push(entryId);
          errors.push(blocking);
        }
        refreshError ??= refresh;
      });
      return {
        scores,
        isPending: enabled && results.some((r) => r.isPending),
        isFetching: results.some((r) => r.isFetching),
        failedEntryIds,
        errors,
        refreshError,
        oldestUpdatedAt: updatedAt.length ? Math.min(...updatedAt) : null,
        refetch: () => results.forEach((r) => void r.refetch()),
      };
    },
    [entryIds, enabled],
  );

  return useQueries({
    queries: entryIds.map((entryId) => ({
      queryKey: fplKeys.entryHistory(entryId),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        mapEntryHistory(await fplApi.entryHistory(entryId, signal)),
      enabled,
      staleTime: MINUTE,
      refetchInterval,
    })),
    combine,
  });
}
