import type { Fixture, Team } from '@/domain/fdr';
import type {
  EventStatus,
  Gameweek,
  GameweekScore,
  GameweekStatus,
  Participant,
} from '@/domain/league';
import type {
  FplEntryHistoryResponse,
  FplEvent,
  FplEventStatusResponse,
  FplFixture,
  FplLeagueStandingResult,
  FplTeam,
} from './types';

export interface LeagueMember extends Participant {
  rank: number;
  totalPoints: number;
}

export function mapGameweekStatus(event: FplEvent, now: number): GameweekStatus {
  if (event.finished) return 'finished';
  if (event.is_current || Date.parse(event.deadline_time) <= now) return 'live';
  return 'upcoming';
}

export function mapGameweeks(events: readonly FplEvent[], now = Date.now()): Gameweek[] {
  return events
    .map((e) => {
      const status = mapGameweekStatus(e, now);
      const started = status !== 'upcoming';
      return {
        id: e.id,
        name: e.name,
        deadline: e.deadline_time,
        status,
        dataChecked: e.data_checked,
        averageScore:
          started && typeof e.average_entry_score === 'number' ? e.average_entry_score : null,
        highestScore: started && typeof e.highest_score === 'number' ? e.highest_score : null,
      };
    })
    .sort((a, b) => a.id - b.id);
}

const POINTS_STATE: Record<string, EventStatus['days'][number]['points']> = {
  l: 'live',
  r: 'done',
};

export function mapEventStatus(response: FplEventStatusResponse): EventStatus {
  const days = (response.status ?? []).map((d) => ({
    date: d.date,
    bonusAdded: d.bonus_added === true,
    points: POINTS_STATE[d.points] ?? ('not-started' as const),
  }));
  const leagues =
    response.leagues === 'Updated'
      ? 'updated'
      : response.leagues === 'Updating'
        ? 'updating'
        : 'pending';
  return { gameweek: response.status?.[0]?.event ?? null, days, leagues };
}

export function mapTeams(teams: readonly FplTeam[]): Team[] {
  return teams
    .map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      shortName: t.short_name,
      officialPosition: typeof t.position === 'number' && t.position > 0 ? t.position : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mapFixtures(fixtures: readonly FplFixture[]): Fixture[] {
  return fixtures.map((f) => ({
    id: f.id,
    gameweek: f.event,
    kickoff: f.kickoff_time,
    homeTeamId: f.team_h,
    awayTeamId: f.team_a,
    homeGoals: f.team_h_score,
    awayGoals: f.team_a_score,
    homeDifficulty: f.team_h_difficulty,
    awayDifficulty: f.team_a_difficulty,
    finished: f.finished || f.finished_provisional,
  }));
}

/**
 * Converts an entry's season history into per-gameweek scores.
 * `points` from FPL is gross; the hit (`event_transfers_cost`) is kept separately and deducted
 * by the domain layer, matching official FPL scoring.
 */
export function mapEntryHistory(history: FplEntryHistoryResponse): GameweekScore[] {
  const chipByEvent = new Map((history.chips ?? []).map((c) => [c.event, c.name] as const));
  return (history.current ?? []).map((h) => ({
    gameweek: h.event,
    points: h.points ?? 0,
    transferCost: h.event_transfers_cost ?? 0,
    benchPoints: h.points_on_bench ?? 0,
    chip: chipByEvent.get(h.event) ?? null,
  }));
}

export function mapLeagueMember(result: FplLeagueStandingResult): LeagueMember {
  return {
    entryId: result.entry,
    playerName: result.player_name,
    entryName: result.entry_name,
    rank: result.rank,
    totalPoints: result.total,
  };
}
