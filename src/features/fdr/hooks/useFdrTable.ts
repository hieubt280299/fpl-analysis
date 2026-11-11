import { useMemo } from 'react';
import { FDR_DEFAULT_LAST_SEASON_POSITION } from '@/config/fdr';
import {
  buildFdrTable,
  clampWindowStart,
  computeLeagueTable,
  fdrWindow,
  weightsFromLastSeason,
  type Team,
} from '@/domain/fdr';
import { DEFAULT_FDR, useFdrSettings } from '@/features/settings';
import { useFixtures, useSeasonData } from '@/lib/fpl/queries';

const DEFAULT_TOTAL_GAMEWEEKS = 38;

/**
 * FDR table for a 5-gameweek window starting at `requestedStart`
 * (defaults to the next gameweek whose deadline has not passed).
 */
export function useFdrTable(requestedStart: number | undefined) {
  const season = useSeasonData();
  const fixtures = useFixtures();
  const settingsQuery = useFdrSettings();

  const gameweeks = season.data?.gameweeks;
  const totalGameweeks = gameweeks?.length || DEFAULT_TOTAL_GAMEWEEKS;
  const nextGameweek = gameweeks?.find((gw) => gw.status === 'upcoming')?.id ?? totalGameweeks;
  const defaultStart = clampWindowStart(nextGameweek, totalGameweeks);
  const start = clampWindowStart(requestedStart ?? defaultStart, totalGameweeks);

  const settings = settingsQuery.data ?? DEFAULT_FDR;
  const weights = weightsFromLastSeason(settings.lastSeasonWeight);

  const teams = season.data?.teams;
  const teamsById = useMemo(
    () => new Map<number, Team>((teams ?? []).map((t) => [t.id, t])),
    [teams],
  );

  const leagueTable = useMemo(
    () => (teams && fixtures.data ? computeLeagueTable(teams, fixtures.data) : []),
    [teams, fixtures.data],
  );

  const rows = useMemo(() => {
    if (!teams || !fixtures.data) return [];
    return buildFdrTable({
      teams,
      fixtures: fixtures.data,
      gameweekIds: fdrWindow(start, totalGameweeks),
      thisSeasonPositions: new Map(leagueTable.map((r) => [r.team.id, r.position])),
      lastSeasonPositions: settings.lastSeasonPositions,
      defaultLastSeasonPosition: FDR_DEFAULT_LAST_SEASON_POSITION,
      weights: weightsFromLastSeason(settings.lastSeasonWeight),
    });
  }, [teams, fixtures.data, start, totalGameweeks, leagueTable, settings]);

  return {
    rows,
    gameweekIds: fdrWindow(start, totalGameweeks),
    start,
    defaultStart,
    totalGameweeks,
    teams: teams ?? [],
    teamsById,
    leagueTable,
    settings,
    weights,
    isPending: season.isPending || fixtures.isPending || settingsQuery.isPending,
    error: season.error ?? fixtures.error ?? settingsQuery.error,
    refetch: () => {
      void season.refetch();
      void fixtures.refetch();
      void settingsQuery.refetch();
    },
  };
}
