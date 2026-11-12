/** Calendar month identifier in `YYYY-MM` form, e.g. `2026-11`. Also the Firestore doc id. */
export type MonthKey = string;

/**
 * - upcoming: deadline has not passed — no scores, no prizes.
 * - live: deadline passed, matches still being played/scored.
 * - finished: all matches finished (FPL `finished`). Final once FPL also sets `data_checked`.
 */
export type GameweekStatus = 'upcoming' | 'live' | 'finished';

export interface Gameweek {
  id: number;
  name: string;
  /** ISO-8601 UTC deadline, e.g. `2026-11-06T18:30:00Z`. */
  deadline: string;
  status: GameweekStatus;
  /** FPL has confirmed all points for this GW; results can no longer change. */
  dataChecked: boolean;
  /** Average score of all FPL managers (null before the deadline / in old snapshots). */
  averageScore?: number | null;
  /** Highest score of any FPL manager (null before the deadline / in old snapshots). */
  highestScore?: number | null;
}

/**
 * FPL's processing state for the current gameweek (`event-status/`).
 * - days: one entry per match day; `points` is FPL's code: 'l' = live, 'r' = done, '' = not started.
 * - leagues: 'updating' while FPL recalculates league tables (the API is often unavailable then).
 */
export interface EventStatus {
  gameweek: number | null;
  days: Array<{ date: string; bonusAdded: boolean; points: 'live' | 'done' | 'not-started' }>;
  leagues: 'updated' | 'updating' | 'pending';
}

/** A finer label for a provisional gameweek, derived from EventStatus. */
export type GameweekProgress =
  'live' | 'in-progress' | 'awaiting-bonus' | 'bonus-added' | 'tables-updating';

export interface LeagueMonth {
  key: MonthKey;
  /** Gameweek ids whose deadline falls in this month, ascending. */
  gameweekIds: number[];
}

/** A league member who has been opted in to a month by an admin. */
export interface Participant {
  entryId: number;
  playerName: string;
  entryName: string;
}

/** One manager's result for one gameweek, as reported by FPL. */
export interface GameweekScore {
  gameweek: number;
  /** Gross points before transfer hits (FPL `points`). */
  points: number;
  /** Points deducted for extra transfers (FPL `event_transfers_cost`), e.g. 4. */
  transferCost: number;
  /** Points left on the bench (FPL `points_on_bench`). Tie-breaker: more is better. */
  benchPoints: number;
  /** FPL chip name played this GW (`wildcard`, `freehit`, `bboost`, `3xc`, …) or null. */
  chip: string | null;
}

export interface PrizeRules {
  entryFee: number;
  /** Fraction of the pot for the monthly prize (0.4). The remainder goes to gameweek prizes. */
  monthPoolShare: number;
  /** Prize ratio by position, e.g. [3, 1] = winner gets 3/4, runner-up 1/4. */
  prizeSplit: readonly number[];
}

/**
 * - pending: nothing to award yet (GW not started).
 * - provisional: scores may still change (live, or finished but not yet data-checked by FPL).
 * - final: confirmed by FPL.
 */
export type ResultState = 'pending' | 'provisional' | 'final';
