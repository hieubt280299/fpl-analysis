import { useMemo } from 'react';
import { FDR_DEFAULT_LAST_SEASON_POSITION } from '@/config/fdr';
import {
  buildFdrTable,
  computeLeagueTable,
  createFdrFormula,
  resolveThisSeasonPositions,
  upcomingWindow,
  type Team,
} from '@/domain/fdr';
import { seasonLabels } from '@/domain/shared/season';
import { DEFAULT_FDR, useFdrSettings, type StoredFdrSettings } from '@/features/settings';
import { splitQueryError, useFixtures, useSeasonData } from '@/lib/fpl/queries';

const DEFAULT_TOTAL_GAMEWEEKS = 38;
const DEFAULT_STORED: StoredFdrSettings = { ...DEFAULT_FDR, updatedAt: null, updatedBy: null };

/**
 * FDR table for the next (up to) 5 gameweeks, starting at the first gameweek whose deadline has
 * not passed. Position weights follow the number of finished gameweeks.
 */
export function useFdrTable() {
  const season = useSeasonData();
  const fixtures = useFixtures();
  const settingsQuery = useFdrSettings();

  const gameweeks = season.data?.gameweeks;
  const totalGameweeks = gameweeks?.length || DEFAULT_TOTAL_GAMEWEEKS;
  const nextGameweek = gameweeks?.find((gw) => gw.status === 'upcoming')?.id ?? null;
  const finishedGameweeks = gameweeks?.filter((gw) => gw.status === 'finished').length ?? 0;
  const gameweekIds = useMemo(
    () => upcomingWindow(nextGameweek, totalGameweeks),
    [nextGameweek, totalGameweeks],
  );

  const settings = settingsQuery.data ?? DEFAULT_STORED;
  const formula = useMemo(
    () => createFdrFormula(settings.gameweekWeights, finishedGameweeks),
    [settings.gameweekWeights, finishedGameweeks],
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

  const seasons = gameweeks?.[0] ? seasonLabels(gameweeks[0].deadline) : null;

  // "Last updated" = when the oldest piece of FPL data on screen was fetched.
  const fetchedAt = [season.dataUpdatedAt, fixtures.dataUpdatedAt].filter((t) => t > 0);

  return {
    rows,
    gameweekIds,
    finishedGameweeks,
    /** e.g. { current: '2026/27', previous: '2025/26' } — null until FPL data loads. */
    seasons,
    /** True once every gameweek's deadline has passed — nothing left to analyse. */
    seasonOver: gameweekIds.length === 0,
    teams: teams ?? [],
    teamsById,
    leagueTable,
    positionSource: thisSeason.source,
    settings,
    formula,
    dataUpdatedAt: fetchedAt.length ? new Date(Math.min(...fetchedAt)) : null,
    isFetching: season.isFetching || fixtures.isFetching,
    isPending: season.isPending || fixtures.isPending || settingsQuery.isPending,
    /** Nothing to show: FPL (or Firestore) failed and there is no cached data. */
    error:
      splitQueryError(season).blocking ??
      splitQueryError(fixtures).blocking ??
      splitQueryError(settingsQuery).blocking,
    /** FPL could not be refreshed; cached data (see dataUpdatedAt) is shown instead. */
    refreshError: splitQueryError(season).refresh ?? splitQueryError(fixtures).refresh,
    refetch: () => {
      void season.refetch();
      void fixtures.refetch();
      void settingsQuery.refetch();
    },
  };
}
