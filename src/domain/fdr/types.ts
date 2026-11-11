export interface Team {
  /** Season-specific FPL team id (1–20). */
  id: number;
  /** FPL team code — stable across seasons. Use this as the key for persisted per-team data. */
  code: number;
  name: string;
  shortName: string;
  /** Current league position as published by FPL (`teams[].position`); null/absent if unknown. */
  officialPosition?: number | null;
}

export interface Fixture {
  id: number;
  /** Null when the fixture is postponed / not yet scheduled into a gameweek. */
  gameweek: number | null;
  kickoff: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  /** Official FPL difficulty (1–5) of this fixture for the home team. */
  homeDifficulty: number;
  /** Official FPL difficulty (1–5) of this fixture for the away team. */
  awayDifficulty: number;
  /** True once the result is in (FPL `finished` or `finished_provisional`). */
  finished: boolean;
}
