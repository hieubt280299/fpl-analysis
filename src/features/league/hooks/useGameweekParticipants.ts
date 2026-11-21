import { useMemo } from 'react';
import type { MonthKey, Participant } from '@/domain/league';
import { splitQueryError, useLeagueMembers } from '@/lib/fpl/queries';
import { useMonthOptions } from './useMonthView';
import { useMonthDoc } from './useMonths';

export interface GameweekParticipants {
  /** The month the gameweek belongs to (after admin moves), if known. */
  monthKey: MonthKey | undefined;
  participants: Participant[];
  /** 'month' = the admin's picks for that month; 'league' = every league member (fallback). */
  source: 'month' | 'league';
  leagueName: string | null;
  timeZone: string;
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * The managers to compare in a gameweek: the participants the admin picked for the month the
 * gameweek belongs to, or every league member when nobody has been picked yet.
 */
export function useGameweekParticipants(gameweekId: number | undefined): GameweekParticipants {
  const options = useMonthOptions();
  const monthKey =
    gameweekId === undefined
      ? undefined
      : options.seasonMonths.find((m) => m.gameweekIds.includes(gameweekId))?.key;
  const monthDoc = useMonthDoc(monthKey);
  const picked = monthDoc.data?.participants;
  const monthResolved = !options.isPending && (!monthKey || !monthDoc.isPending);
  const useLeague = monthResolved && !picked?.length;
  const league = useLeagueMembers(options.leagueId);

  const participants = useMemo<Participant[]>(() => {
    if (!useLeague) return picked ?? [];
    return (league.data?.members ?? []).map(({ entryId, playerName, entryName }) => ({
      entryId,
      playerName,
      entryName,
    }));
  }, [useLeague, picked, league.data]);

  const leagueError = useLeague ? splitQueryError(league).blocking : null;
  return {
    monthKey,
    participants,
    source: useLeague ? 'league' : 'month',
    leagueName: league.data?.leagueName ?? null,
    timeZone: options.timeZone,
    isPending: !monthResolved || (useLeague && league.isPending),
    // A failed month read falls back to the whole league instead of blocking the page.
    error: options.error ?? leagueError,
    refetch: () => {
      options.refetch();
      void monthDoc.refetch();
      void league.refetch();
    },
  };
}
