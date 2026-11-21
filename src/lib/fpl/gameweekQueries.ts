import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { EntryPicks, Match, PlayerLive } from '@/domain/gameweek';
import { fplApi } from './client';
import { mapLive, mapMatches, mapPicks } from './gameweekMappers';
import { fplKeys, splitQueryError, type RefetchInterval } from './queries';

const MINUTE = 60_000;

/** One gameweek's matches with live scores and stats. */
export function useGameweekMatches(
  gameweek: number | undefined,
  refetchInterval: RefetchInterval = false,
) {
  return useQuery({
    queryKey: fplKeys.gameweekFixtures(gameweek ?? 0),
    queryFn: async ({ signal }): Promise<Match[]> =>
      mapMatches(await fplApi.gameweekFixtures(gameweek as number, signal)),
    enabled: typeof gameweek === 'number',
    staleTime: MINUTE,
    refetchInterval,
  });
}

/** Every player's live minutes and points in a gameweek. */
export function useGameweekLive(
  gameweek: number | undefined,
  refetchInterval: RefetchInterval = false,
) {
  return useQuery({
    queryKey: fplKeys.gameweekLive(gameweek ?? 0),
    queryFn: async ({ signal }): Promise<PlayerLive[]> =>
      mapLive(await fplApi.gameweekLive(gameweek as number, signal)),
    enabled: typeof gameweek === 'number',
    staleTime: MINUTE,
    refetchInterval,
  });
}

export interface EntryPicksResult {
  /** Picks by entry id (only entries that loaded). */
  picks: Record<number, EntryPicks>;
  isPending: boolean;
  isFetching: boolean;
  /** Entries with no picks at all (the request failed, e.g. the team joined after the GW). */
  failedEntryIds: number[];
  errors: Error[];
  /** A refresh failed, but older (cached) picks are still shown. */
  refreshError: Error | null;
  oldestUpdatedAt: number | null;
  refetch: () => void;
  /** Refetches every entry's picks; resolves to true when all of them loaded. */
  refresh: () => Promise<boolean>;
}

/**
 * Loads the gameweek picks of every given entry in parallel. Picks are fixed at the deadline;
 * only FPL's automatic subs are added later, so they are refreshed rarely.
 * Pass a referentially stable `entryIds` array (e.g. from useMemo).
 */
export function useEntryPicks(
  entryIds: readonly number[],
  gameweek: number | undefined,
): EntryPicksResult {
  const enabled = typeof gameweek === 'number';
  const combine = useCallback(
    (results: UseQueryResult<EntryPicks>[]): EntryPicksResult => {
      const picks: Record<number, EntryPicks> = {};
      const failedEntryIds: number[] = [];
      const errors: Error[] = [];
      let refreshError: Error | null = null;
      const updatedAt: number[] = [];
      results.forEach((r, i) => {
        const entryId = entryIds[i] as number;
        if (r.data) {
          picks[entryId] = r.data;
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
        picks,
        isPending: enabled && results.some((r) => r.isPending),
        isFetching: results.some((r) => r.isFetching),
        failedEntryIds,
        errors,
        refreshError,
        oldestUpdatedAt: updatedAt.length ? Math.min(...updatedAt) : null,
        refetch: () => results.forEach((r) => void r.refetch()),
        refresh: async () => {
          const refreshed = await Promise.all(results.map((r) => r.refetch()));
          return refreshed.every((r) => !r.isError);
        },
      };
    },
    [entryIds, enabled],
  );

  return useQueries({
    queries: entryIds.map((entryId) => ({
      queryKey: fplKeys.picks(entryId, gameweek ?? 0),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        mapPicks(entryId, await fplApi.entryPicks(entryId, gameweek as number, signal)),
      enabled,
      staleTime: 10 * MINUTE,
    })),
    combine,
  });
}
