import { useCallback, useMemo } from 'react';
import { LEAGUE_RULES } from '@/config/league';
import {
  computeMonthStandings,
  groupGameweeksByMonth,
  pickDefaultMonth,
  type Gameweek,
  type MonthKey,
  type Participant,
  type PrizeRules,
} from '@/domain/league';
import { DEFAULT_LEAGUE, useLeagueSettings } from '@/features/settings';
import { useEntryHistories, useSeasonData } from '@/lib/fpl/queries';
import type { MonthSnapshot } from '../model';
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
  const timeZone = settings.data?.timeZone ?? DEFAULT_LEAGUE.timeZone;

  const seasonMonths = useMemo(
    () => (season.data ? groupGameweeksByMonth(season.data.gameweeks, timeZone) : []),
    [season.data, timeZone],
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

  const defaultMonthKey = useMemo(
    () =>
      (season.data && pickDefaultMonth(seasonMonths, season.data.gameweeks)) ??
      options[options.length - 1]?.key,
    [season.data, seasonMonths, options],
  );

  return {
    options,
    seasonMonths,
    defaultMonthKey,
    timeZone,
    leagueId: settings.data?.leagueId ?? DEFAULT_LEAGUE.leagueId,
    season,
    isPending: settings.isPending || season.isPending,
    error: settings.error ?? season.error,
    refetch: () => {
      void settings.refetch();
      void season.refetch();
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
  const histories = useEntryHistories(entryIds, needsLiveScores);

  const scores = snapshot ? snapshot.scores : histories.scores;
  const rules = snapshot?.rules ?? CURRENT_RULES;

  const standings = useMemo(
    () => computeMonthStandings({ gameweeks, participants, scores, rules }),
    [gameweeks, participants, scores, rules],
  );

  const scoresComplete =
    !needsLiveScores || (!histories.isPending && histories.failedEntryIds.length === 0);

  const canFinalize =
    doc !== null &&
    !snapshot &&
    participants.length > 0 &&
    gameweeks.length > 0 &&
    standings.monthState === 'final' &&
    scoresComplete;

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
    };
  }, [gameweeks, participants, scores, rules]);

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
    gameweeks,
    participants,
    standings,
    scores: {
      needed: needsLiveScores,
      isPending: needsLiveScores && histories.isPending,
      isFetching: histories.isFetching,
      failedEntryIds: histories.failedEntryIds,
      errors: histories.errors,
      refetch: histories.refetch,
    },
    canFinalize,
    buildSnapshot,
  };
}
