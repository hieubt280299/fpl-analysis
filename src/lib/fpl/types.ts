/**
 * Raw response shapes of the public FPL API — only the fields this app reads.
 * Never use these outside src/lib/fpl; map them to domain types in ./mappers.ts.
 */

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  data_checked: boolean;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  /** Average manager score; 0 before the gameweek is played. */
  average_entry_score: number;
  highest_score: number | null;
}

/** GET /event-status/ — processing state of the current gameweek. */
export interface FplEventStatusResponse {
  status: Array<{ bonus_added: boolean; date: string; event: number; points: string }>;
  /** "Updated", "Updating" or "" (observed values). */
  leagues: string;
}

export interface FplTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  /** Official current league position (may be 0 when FPL has not populated it). */
  position: number;
}

/** GET /bootstrap-static/ */
export interface FplBootstrapResponse {
  events: FplEvent[];
  teams: FplTeam[];
}

/** GET /fixtures/ (array) */
export interface FplFixture {
  id: number;
  event: number | null;
  kickoff_time: string | null;
  finished: boolean;
  finished_provisional: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

export interface FplLeagueStandingResult {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  total: number;
  event_total: number;
}

/** GET /leagues-classic/{id}/standings/?page_standings=n */
export interface FplLeagueStandingsResponse {
  league: { id: number; name: string };
  standings: {
    has_next: boolean;
    page: number;
    results: FplLeagueStandingResult[];
  };
}

export interface FplEntryEventHistory {
  event: number;
  /** Gross GW points (before transfer hits). */
  points: number;
  total_points: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface FplChipPlay {
  name: string;
  time: string;
  event: number;
}

/** GET /entry/{id}/history/ */
export interface FplEntryHistoryResponse {
  current: FplEntryEventHistory[];
  chips: FplChipPlay[];
}
