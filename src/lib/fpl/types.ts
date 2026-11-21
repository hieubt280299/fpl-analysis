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

/** A player ("element"). `element_type`: 1 GKP, 2 DEF, 3 MID, 4 FWD (5 = old assistant manager). */
export interface FplElement {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
}

/** GET /bootstrap-static/ */
export interface FplBootstrapResponse {
  events: FplEvent[];
  teams: FplTeam[];
  elements: FplElement[];
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
  started?: boolean | null;
  /** Minutes played so far. */
  minutes?: number;
  /** Per-stat lists by side: goals_scored, assists, bonus, bps, yellow_cards, … */
  stats?: Array<{
    identifier: string;
    h: Array<{ value: number; element: number }>;
    a: Array<{ value: number; element: number }>;
  }>;
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

/** GET /event/{gw}/live/ */
export interface FplLiveResponse {
  elements: Array<{
    id: number;
    /** Live totals for the GW (summed over a double GW), incl. bonus FPL has added. */
    stats: { minutes: number; total_points: number; bonus: number };
  }>;
}

export interface FplPick {
  element: number;
  /** 1–11 starting XI, 12–15 bench in order. */
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}

/** GET /entry/{id}/event/{gw}/picks/ */
export interface FplPicksResponse {
  active_chip: string | null;
  /** Filled once FPL processes the GW. */
  automatic_subs: Array<{ element_in: number; element_out: number; event: number }>;
  entry_history: { event_transfers_cost: number };
  picks: FplPick[];
}
