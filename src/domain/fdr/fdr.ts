import {
  FDR_BASE_MULTIPLIER,
  FDR_BLANK_GAMEWEEK_VALUE,
  FDR_GAMEWEEK_WEIGHTS,
  FDR_POSITION_COEFFICIENT,
  FDR_WINDOW_SIZE,
} from '@/config/fdr';
import { clamp, competitionRanks, roundHalfAwayFromZero, sum } from '../shared/math';
import type { Fixture, Team } from './types';

export interface FdrWeights {
  lastSeason: number;
  thisSeason: number;
}

export interface FdrFixtureRef {
  fixtureId: number;
  opponentId: number;
  isHome: boolean;
  difficulty: number;
}

export interface FdrCell {
  gameweek: number;
  /** 0 fixtures = blank GW, 2+ = double GW. */
  fixtures: FdrFixtureRef[];
  /** Number used in the formula for this gameweek. */
  value: number;
}

export interface FdrRow {
  team: Team;
  lastSeasonPosition: number;
  thisSeasonPosition: number;
  cells: FdrCell[];
  /** Unrounded formula result (shown in tooltips). */
  rawScore: number;
  /** AVG column: formula result rounded to 1 decimal, like the spreadsheet. Lower = easier. */
  score: number;
  /** Excel-style RANK of `score`, ascending (ties share a rank). */
  rank: number;
}

/** Weights always sum to 1: the admin sets last season's weight, this season gets the rest. */
export function weightsFromLastSeason(lastSeasonWeight: number): FdrWeights {
  const lastSeason = roundHalfAwayFromZero(clamp(lastSeasonWeight, 0, 1), 4);
  return { lastSeason, thisSeason: roundHalfAwayFromZero(1 - lastSeason, 4) };
}

/**
 * The value a gameweek contributes to the formula.
 * Single fixture → its difficulty. Double GW → mean difficulty of its fixtures.
 * Blank GW → FDR_BLANK_GAMEWEEK_VALUE.
 */
export function cellValue(fixtures: readonly Pick<FdrFixtureRef, 'difficulty'>[]): number {
  if (fixtures.length === 0) return FDR_BLANK_GAMEWEEK_VALUE;
  return sum(fixtures.map((f) => f.difficulty)) / fixtures.length;
}

/**
 * Spreadsheet formula (unrounded):
 *   (v1*2.6 + v2*2.3 + v3*2.0 + v4*1.7 + v5*1.4)
 *     * (0.8 + 0.01*lastSeasonPos*wLast + 0.01*thisSeasonPos*wThis)
 */
export function rawFdrScore(
  values: readonly number[],
  lastSeasonPosition: number,
  thisSeasonPosition: number,
  weights: FdrWeights,
): number {
  const fixtureLoad = sum(values.map((v, i) => v * (FDR_GAMEWEEK_WEIGHTS[i] ?? 0)));
  const strengthMultiplier =
    FDR_BASE_MULTIPLIER +
    FDR_POSITION_COEFFICIENT * lastSeasonPosition * weights.lastSeason +
    FDR_POSITION_COEFFICIENT * thisSeasonPosition * weights.thisSeason;
  return fixtureLoad * strengthMultiplier;
}

/** The spreadsheet's AVG column: ROUND(rawFdrScore, 1). */
export function fdrScore(
  values: readonly number[],
  lastSeasonPosition: number,
  thisSeasonPosition: number,
  weights: FdrWeights,
): number {
  return roundHalfAwayFromZero(
    rawFdrScore(values, lastSeasonPosition, thisSeasonPosition, weights),
    1,
  );
}

/** Clamp a requested first gameweek so a full window fits in the season. */
export function clampWindowStart(start: number, totalGameweeks: number): number {
  return clamp(Math.trunc(start), 1, Math.max(1, totalGameweeks - FDR_WINDOW_SIZE + 1));
}

export function fdrWindow(start: number, totalGameweeks: number): number[] {
  const first = clampWindowStart(start, totalGameweeks);
  return Array.from({ length: FDR_WINDOW_SIZE }, (_, i) => first + i).filter(
    (gw) => gw <= totalGameweeks,
  );
}

export function buildFdrCells(
  teamId: number,
  gameweekIds: readonly number[],
  fixtures: readonly Fixture[],
): FdrCell[] {
  return gameweekIds.map((gameweek) => {
    const refs: FdrFixtureRef[] = fixtures
      .filter(
        (f) => f.gameweek === gameweek && (f.homeTeamId === teamId || f.awayTeamId === teamId),
      )
      .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''))
      .map((f) => {
        const isHome = f.homeTeamId === teamId;
        return {
          fixtureId: f.id,
          opponentId: isHome ? f.awayTeamId : f.homeTeamId,
          isHome,
          difficulty: isHome ? f.homeDifficulty : f.awayDifficulty,
        };
      });
    return { gameweek, fixtures: refs, value: cellValue(refs) };
  });
}

export interface BuildFdrTableInput {
  teams: readonly Team[];
  fixtures: readonly Fixture[];
  gameweekIds: readonly number[];
  /** Keyed by team id. */
  thisSeasonPositions: ReadonlyMap<number, number>;
  /** Keyed by team code. */
  lastSeasonPositions: Readonly<Record<number, number>>;
  /** Used when a team code has no last-season entry (promoted teams). */
  defaultLastSeasonPosition: number;
  weights: FdrWeights;
}

/** Builds the FDR table sorted easiest-first (lowest AVG), with Excel-style ranks. */
export function buildFdrTable(input: BuildFdrTableInput): FdrRow[] {
  const rows = input.teams.map((team) => {
    const lastSeasonPosition =
      input.lastSeasonPositions[team.code] ?? input.defaultLastSeasonPosition;
    const thisSeasonPosition = input.thisSeasonPositions.get(team.id) ?? input.teams.length;
    const cells = buildFdrCells(team.id, input.gameweekIds, input.fixtures);
    const values = cells.map((c) => c.value);
    const rawScore = rawFdrScore(values, lastSeasonPosition, thisSeasonPosition, input.weights);
    return {
      team,
      lastSeasonPosition,
      thisSeasonPosition,
      cells,
      rawScore,
      score: roundHalfAwayFromZero(rawScore, 1),
    };
  });

  // Rank and order on the rounded AVG (as the spreadsheet does); equal AVGs share a rank and are
  // listed alphabetically.
  const ranks = competitionRanks(rows.map((r) => r.score));
  return rows
    .map((row, i) => ({ ...row, rank: ranks[i] ?? i + 1 }))
    .sort((a, b) => a.score - b.score || a.team.name.localeCompare(b.team.name));
}
