import { useCallback, useMemo } from 'react';
import { LEAGUE_RULES, LIVE_REFRESH_INTERVAL_MS } from '@/config/league';
import { hasLiveMatch } from '@/domain/fdr';
import { currentGameweek } from '@/domain/gameweek';
import {
  applyLiveScores,
  applyLiveStandings,
  computeMonthStandings,
  groupGameweeksByMonth,
  pickDefaultMonth,
  toMonthKey,
  type GameweekMonthOverrides,
  type Gameweek,
  type MonthKey,
  type Participant,
  type PrizeRules,
} from '@/domain/league';
import { seasonLabels } from '@/domain/shared/season';
import { DEFAULT_LEAGUE, useCalendarSettings, useLeagueSettings } from '@/features/settings';
import {
  splitQueryError,
  useEntryHistories,
  useEventStatus,
  useFixtures,
  useLeagueMembers,
  useSeasonData,
} from '@/lib/fpl/queries';
import { useNow } from '@/utils/useNow';
import { monthsAwaitingFinalization, type MonthSnapshot } from '../model';
import { useLiveGameweekScores } from './useLiveGameweekScores';
import { useMonthDoc, useSavedMonths } from './useMonths';

export interface MonthOption {
  key: MonthKey;
  finalized: boolean;
  /** Belongs to the season currently served by the FPL API. */
  inSeason: boolean;
}

const NO_GAMEWEEKS: Gameweek[] = [];
const NO_PARTICIPANTS: Participant[] = [];
const NO_IDS: number[] = [];
const NO_ALLOWANCES: Record<number, number> = {};
const NO_OVERRIDES: GameweekMonthOverrides = {};

const CURRENT_RULES: PrizeRules = {
  entryFee: LEAGUE_RULES.entryFee,
  monthPoolShare: LEAGUE_RULES.monthPoolShare,
  prizeSplit: [...LEAGUE_RULES.prizeSplit],
};

/** Every month the picker can show: this season's months plus any saved month from Firestore. */
export function useMonthOptions() {
  const settings = useLeagueSettings();
  const season = useSeasonData();
  const saved = useSavedMonths();
  const calendar = useCalendarSettings();
  const timeZone = settings.data?.timeZone ?? DEFAULT_LEAGUE.timeZone;

  const firstDeadline = season.data?.gameweeks[0]?.deadline;
  const currentSeason = firstDeadline ? (seasonLabels(firstDeadline)?.current ?? null) : null;
  // Admin GW moves only apply to the season they were made for (GW ids repeat every season).
  const overrides =
    calendar.data && currentSeason !== null && calendar.data.season === currentSeason
      ? calendar.data.gameweekMonths
      : NO_OVERRIDES;

  const seasonMonths = useMemo(
    () => (season.data ? groupGameweeksByMonth(season.data.gameweeks, timeZone, overrides) : []),
    [season.data, timeZone, overrides],
  );
  /** Each gameweek's month by deadline alone (before admin moves). */
  const automaticMonths = useMemo(
    () =>
      new Map(
        (season.data?.gameweeks ?? []).map((gw) => [gw.id, toMonthKey(gw.deadline, timeZone)]),
      ),
    [season.data, timeZone],
  );
  const finalizedMonths = useMemo(
    () =>
      new Set((saved.data ?? []).filter((d) => d.status === 'finalized').map((d) => d.monthKey)),
    [saved.data],
  );

  const options = useMemo<MonthOption[]>(() => {
    const byKey = new Map<MonthKey, MonthOption>();
    for (const m of seasonMonths)
      byKey.set(m.key, { key: m.key, finalized: false, inSeason: true });
    for (const doc of saved.data ?? []) {
      byKey.set(doc.monthKey, {
        key: doc.monthKey,
        finalized: doc.status === 'finalized',
        inSeason: byKey.get(doc.monthKey)?.inSeason ?? false,
      });
    }
    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [seasonMonths, saved.data]);

  const awaitingFinalization = useMemo(
    () =>
      season.data
        ? monthsAwaitingFinalization(saved.data ?? [], seasonMonths, season.data.gameweeks)
        : [],
    [saved.data, seasonMonths, season.data],
  );
  const seasonComplete =
    season.data?.gameweeks.length !== undefined &&
    season.data.gameweeks.length > 0 &&
    season.data.gameweeks.every((gw) => gw.status === 'finished');

  const defaultMonthKey = useMemo(
    () =>
      (season.data && pickDefaultMonth(seasonMonths, season.data.gameweeks)) ??
      options[options.length - 1]?.key,
    [season.data, seasonMonths, options],
  );

  return {
    options,
    seasonMonths,
    automaticMonths,
    overrides,
    finalizedMonths,
    currentSeason,
    defaultMonthKey,
    timeZone,
    leagueId: settings.data?.leagueId ?? DEFAULT_LEAGUE.leagueId,
    season,
    awaitingFinalization,
    seasonComplete,
    isPending: settings.isPending || season.isPending || calendar.isPending,
    error:
      splitQueryError(settings).blocking ??
      splitQueryError(season).blocking ??
      splitQueryError(calendar).blocking,
    /** FPL could not be refreshed; cached season data is shown instead. */
    refreshError: splitQueryError(season).refresh,
    refetch: () => {
      void settings.refetch();
      void season.refetch();
      void calendar.refetch();
    },
  };
}

/** Everything the month page needs: saved participants, live or frozen scores, and standings. */
export function useMonthView(monthKey: MonthKey) {
  const monthOptions = useMonthOptions();
  const monthDoc = useMonthDoc(monthKey);
  const { season, seasonMonths } = monthOptions;

  const doc = monthDoc.data ?? null;
  const snapshot = doc?.snapshot ?? null;
  const participants = doc?.participants ?? NO_PARTICIPANTS;
  const penaltyFree = doc?.penaltyFree ?? NO_ALLOWANCES;

  const gameweeks = useMemo(() => {
    if (snapshot) return snapshot.gameweeks;
    const month = seasonMonths.find((m) => m.key === monthKey);
    if (!season.data || !month) return NO_GAMEWEEKS;
    return season.data.gameweeks.filter((gw) => month.gameweekIds.includes(gw.id));
  }, [snapshot, seasonMonths, season.data, monthKey]);

  const needsLiveScores =
    !snapshot && participants.length > 0 && gameweeks.some((gw) => gw.status !== 'upcoming');
  const entryIds = useMemo(
    () => (needsLiveScores ? participants.map((p) => p.entryId) : NO_IDS),
    [needsLiveScores, participants],
  );

  // Auto-refresh points only while a match of this month is being played. Kickoff times are known
  // in advance, so a 30 s clock is enough to notice a match starting without polling anything.
  const now = useNow(30_000);
  const monthGameweekIds = useMemo(() => gameweeks.map((gw) => gw.id), [gameweeks]);
  const fixturesQuery = useFixtures();
  const matchLive =
    needsLiveScores && hasLiveMatch(fixturesQuery.data ?? [], monthGameweekIds, now);
  const liveInterval = matchLive ? LIVE_REFRESH_INTERVAL_MS : false;
  // Keep fixtures fresh while live too, so we notice when the last match finishes.
  useFixtures(liveInterval);
  const histories = useEntryHistories(entryIds, needsLiveScores, liveInterval);
  const eventStatus = useEventStatus();

  // The league's real name from FPL (same standings call the players list uses, so it is shared
  // and cached). Finalized months keep the name they were saved with.
  const savedLeagueName = snapshot?.leagueName ?? null;
  // Its points are also our live source: FPL's entry histories say 0 until a GW is processed.
  const league = useLeagueMembers(
    doc?.leagueId || monthOptions.leagueId,
    !savedLeagueName,
    liveInterval,
  );
  const leagueName = savedLeagueName ?? league.data?.leagueName ?? null;

  // The standings' GW points belong to FPL's current GW: the latest one whose deadline passed.
  const currentGw = season.data ? currentGameweek(season.data.gameweeks) : undefined;
  const currentGameweekId = currentGw?.id;
  // While that GW is being played and belongs to this month, work its points out from the picks
  // (projected auto-subs, like the Current GW page). FPL's standings leave subs out until the GW
  // is processed; they stay the fallback for teams whose picks or live data didn't load.
  const liveGameweekId =
    needsLiveScores && currentGw?.status === 'live' && monthGameweekIds.includes(currentGw.id)
      ? currentGw.id
      : undefined;
  const liveLineups = useLiveGameweekScores(liveGameweekId, entryIds, liveInterval);
  const liveScores = useMemo(() => {
    let result = histories.scores;
    if (league.data && currentGameweekId !== undefined) {
      const live = new Map(league.data.members.map((m) => [m.entryId, m] as const));
      result = applyLiveStandings(result, currentGameweekId, live);
    }
    return liveLineups.scores.size ? applyLiveScores(result, liveLineups.scores) : result;
  }, [histories.scores, league.data, currentGameweekId, liveLineups.scores]);

  const scores = snapshot ? snapshot.scores : liveScores;
  const rules = snapshot?.rules ?? CURRENT_RULES;

  const standings = useMemo(
    () => computeMonthStandings({ gameweeks, participants, scores, rules, penaltyFree }),
    [gameweeks, participants, scores, rules, penaltyFree],
  );

  const scoresComplete =
    !needsLiveScores || (!histories.isPending && histories.failedEntryIds.length === 0);
  // Never freeze results from cached data while FPL can't be reached.
  const refreshError =
    monthOptions.refreshError ??
    (snapshot ? null : (histories.refreshError ?? liveLineups.refreshError));
  const updatedTimes = [season.dataUpdatedAt, histories.oldestUpdatedAt ?? 0].filter((t) => t > 0);
  const pointsTimes = [
    histories.oldestUpdatedAt ?? 0,
    league.dataUpdatedAt,
    liveLineups.updatedAt ?? 0,
  ].filter((t) => t > 0);
  const pointsUpdatedAt = pointsTimes.length ? new Date(Math.min(...pointsTimes)) : null;
  const { refresh: refreshHistories } = histories;
  const { refetch: refetchLeague } = league;
  const { refresh: refreshLive } = liveLineups;
  const refreshPoints = useCallback(async () => {
    const [historiesOk, standings, liveOk] = await Promise.all([
      refreshHistories(),
      refetchLeague(),
      refreshLive(),
    ]);
    return historiesOk && !standings.isError && liveOk;
  }, [refreshHistories, refetchLeague, refreshLive]);

  const canFinalize =
    doc !== null &&
    !snapshot &&
    participants.length > 0 &&
    gameweeks.length > 0 &&
    standings.monthState === 'final' &&
    scoresComplete &&
    refreshError === null;

  const buildSnapshot = useCallback((): MonthSnapshot => {
    const gameweekIds = new Set(gameweeks.map((gw) => gw.id));
    return {
      finalizedAt: new Date().toISOString(),
      gameweeks,
      scores: Object.fromEntries(
        participants.map((p) => [
          p.entryId,
          (scores[p.entryId] ?? []).filter((s) => gameweekIds.has(s.gameweek)),
        ]),
      ),
      rules,
      ...(leagueName ? { leagueName } : {}),
    };
  }, [gameweeks, participants, scores, rules, leagueName]);

  // A finalized month renders from its snapshot, so FPL being unavailable must not block it.
  const blockingError = monthOptions.error ?? monthDoc.error;

  return {
    ...monthOptions,
    isPending: monthOptions.isPending || monthDoc.isPending,
    error: snapshot ? (monthDoc.error ?? null) : blockingError,
    refetch: () => {
      monthOptions.refetch();
      void monthDoc.refetch();
    },
    monthDoc: doc,
    isFinalized: snapshot !== null,
    /** The FPL league's name (e.g. "FPLừa 26/27"); null while loading or if FPL is unreachable. */
    leagueName,
    eventStatus: eventStatus.data ?? null,
    refreshError,
    /** When the oldest FPL data on screen was fetched. */
    dataUpdatedAt: updatedTimes.length ? new Date(Math.min(...updatedTimes)) : null,
    gameweeks,
    participants,
    standings,
    scores: {
      needed: needsLiveScores,
      /** A match of this month is being played: points refresh automatically. */
      autoRefreshing: matchLive,
      isPending: needsLiveScores && histories.isPending,
      isFetching: histories.isFetching || liveLineups.isFetching,
      failedEntryIds: histories.failedEntryIds,
      errors: histories.errors,
      refetch: histories.refetch,
      /** When the points on screen were fetched (oldest of histories, standings and live data). */
      updatedAt: pointsUpdatedAt,
      /** Refreshes histories and live standings; resolves to true when everything loaded. */
      refresh: refreshPoints,
    },
    canFinalize,
    buildSnapshot,
  };
}
