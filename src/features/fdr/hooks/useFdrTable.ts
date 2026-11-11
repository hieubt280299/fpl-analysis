import { useMemo } from 'react';
import { FDR_DEFAULT_LAST_SEASON_POSITION } from '@/config/fdr';
import {
  buildFdrTable,
  clampWindowStart,
  computeLeagueTable,
  createFdrFormula,
  fdrWindow,
  resolveThisSeasonPositions,
  type Team,
} from '@/domain/fdr';
import { DEFAULT_FDR, useFdrSettings, type StoredFdrSettings } from '@/features/settings';
import { useFixtures, useSeasonData } from '@/lib/fpl/queries';

const DEFAULT_TOTAL_GAMEWEEKS = 38;
const DEFAULT_STORED: StoredFdrSettings = { ...DEFAULT_FDR, updatedAt: null, updatedBy: null };

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
  const gameweekIds = useMemo(() => fdrWindow(start, totalGameweeks), [start, totalGameweeks]);

  const settings = settingsQuery.data ?? DEFAULT_STORED;
  const formula = useMemo(
    () => createFdrFormula(settings.gameweekWeights, settings.lastSeasonWeight),
    [settings.gameweekWeights, settings.lastSeasonWeight],
  );

  const teams = season.data?.teams;
  const teamsById = useMemo(
    () => new Map<number, Team>((teams ?? []).map((t) => [t.id, t])),
    [teams],
  );

  const leagueTable = useMemo(
    () => (teams && fixtures.data ? computeLeagueTable(teams, fixtures.data) : []),
    [teams, fixtures.data],
  );
  const thisSeason = useMemo(
    () => resolveThisSeasonPositions(teams ?? [], leagueTable),
    [teams, leagueTable],
  );

  const rows = useMemo(() => {
    if (!teams || !fixtures.data) return [];
    return buildFdrTable({
      teams,
      fixtures: fixtures.data,
      gameweekIds,
      thisSeasonPositions: thisSeason.positions,
      lastSeasonPositions: settings.lastSeasonPositions,
      defaultLastSeasonPosition: FDR_DEFAULT_LAST_SEASON_POSITION,
      formula,
    });
  }, [teams, fixtures.data, gameweekIds, thisSeason, settings.lastSeasonPositions, formula]);

  // "Last updated" = when the oldest piece of FPL data on screen was fetched.
  const fetchedAt = [season.dataUpdatedAt, fixtures.dataUpdatedAt].filter((t) => t > 0);

  return {
    rows,
    gameweekIds,
    start,
    defaultStart,
    totalGameweeks,
    teams: teams ?? [],
    teamsById,
    leagueTable,
    positionSource: thisSeason.source,
    settings,
    formula,
    dataUpdatedAt: fetchedAt.length ? new Date(Math.min(...fetchedAt)) : null,
    isFetching: season.isFetching || fixtures.isFetching,
    isPending: season.isPending || fixtures.isPending || settingsQuery.isPending,
    error: season.error ?? fixtures.error ?? settingsQuery.error,
    refetch: () => {
      void season.refetch();
      void fixtures.refetch();
      void settingsQuery.refetch();
    },
  };
}
