import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Fixture, Team } from '@/domain/fdr';
import type { Gameweek, GameweekScore } from '@/domain/league';
import { fetchAllLeagueStandings, fplApi } from './client';
import {
  mapEntryHistory,
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

export function useFixtures() {
  return useQuery({
    queryKey: fplKeys.fixtures(),
    queryFn: async ({ signal }): Promise<Fixture[]> => mapFixtures(await fplApi.fixtures(signal)),
    staleTime: 5 * MINUTE,
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
  failedEntryIds: number[];
  errors: Error[];
  refetch: () => void;
}

/**
 * Loads the season history of every given entry in parallel.
 * Pass a referentially stable `entryIds` array (e.g. from useMemo) so results stay memoised.
 */
export function useEntryHistories(
  entryIds: readonly number[],
  enabled = true,
): EntryHistoriesResult {
  const combine = useCallback(
    (results: UseQueryResult<GameweekScore[]>[]): EntryHistoriesResult => {
      const scores: Record<number, GameweekScore[]> = {};
      const failedEntryIds: number[] = [];
      const errors: Error[] = [];
      results.forEach((r, i) => {
        const entryId = entryIds[i] as number;
        if (r.data) scores[entryId] = r.data;
        if (r.error) {
          failedEntryIds.push(entryId);
          errors.push(r.error);
        }
      });
      return {
        scores,
        isPending: enabled && results.some((r) => r.isPending),
        isFetching: results.some((r) => r.isFetching),
        failedEntryIds,
        errors,
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
    })),
    combine,
  });
}
