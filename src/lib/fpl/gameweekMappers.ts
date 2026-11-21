import type {
  EntryPicks,
  Match,
  MatchStatId,
  MatchStats,
  Pick,
  Player,
  PlayerLive,
  PlayerPosition,
} from '@/domain/gameweek';
import type { FplElement, FplFixture, FplLiveResponse, FplPicksResponse } from './types';

const MATCH_STATS: readonly MatchStatId[] = [
  'goals_scored',
  'assists',
  'own_goals',
  'penalties_saved',
  'penalties_missed',
  'yellow_cards',
  'red_cards',
  'bonus',
  'bps',
];

function toPosition(elementType: number): PlayerPosition | null {
  return elementType === 1 || elementType === 2 || elementType === 3 || elementType === 4
    ? elementType
    : null;
}

/** Players (GKP/DEF/MID/FWD only — FPL's old "assistant manager" entries are dropped). */
export function mapPlayers(elements: readonly FplElement[]): Player[] {
  const players: Player[] = [];
  for (const e of elements ?? []) {
    const position = toPosition(e.element_type);
    if (position) players.push({ id: e.id, webName: e.web_name, teamId: e.team, position });
  }
  return players;
}

function mapStats(stats: FplFixture['stats']): MatchStats {
  const result: MatchStats = {};
  for (const s of stats ?? []) {
    const id = MATCH_STATS.find((m) => m === s.identifier);
    if (!id) continue;
    const side = (list: Array<{ value: number; element: number }> | undefined) =>
      (list ?? []).map((x) => ({ playerId: x.element, value: x.value }));
    result[id] = { home: side(s.h), away: side(s.a) };
  }
  return result;
}

export function mapMatches(fixtures: readonly FplFixture[]): Match[] {
  return fixtures.map((f) => ({
    id: f.id,
    gameweek: f.event,
    kickoff: f.kickoff_time,
    homeTeamId: f.team_h,
    awayTeamId: f.team_a,
    homeGoals: f.team_h_score,
    awayGoals: f.team_a_score,
    started: f.started === true,
    finished: f.finished === true,
    finishedProvisional: f.finished_provisional === true,
    minutes: f.minutes ?? 0,
    stats: mapStats(f.stats),
  }));
}

/** Keeps only what the app needs from the ~670-player live feed. */
export function mapLive(response: FplLiveResponse): PlayerLive[] {
  return (response.elements ?? []).map((e) => ({
    id: e.id,
    minutes: e.stats?.minutes ?? 0,
    points: e.stats?.total_points ?? 0,
  }));
}

export function mapPicks(entryId: number, response: FplPicksResponse): EntryPicks {
  const picks: Pick[] = [];
  for (const p of response.picks ?? []) {
    const position = toPosition(p.element_type);
    if (!position) continue;
    picks.push({
      playerId: p.element,
      slot: p.position,
      position,
      isCaptain: p.is_captain === true,
      isViceCaptain: p.is_vice_captain === true,
      multiplier: p.multiplier ?? 0,
    });
  }
  return {
    entryId,
    chip: response.active_chip ?? null,
    picks,
    automaticSubs: (response.automatic_subs ?? []).map((s) => ({
      in: s.element_in,
      out: s.element_out,
    })),
    transferCost: response.entry_history?.event_transfers_cost ?? 0,
  };
}
