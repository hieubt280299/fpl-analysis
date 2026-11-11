import {
  FDR_BASE_MULTIPLIER,
  FDR_BLANK_GAMEWEEK_VALUE,
  FDR_GAMEWEEK_WEIGHTS_TOTAL,
  FDR_POSITION_COEFFICIENT,
  FDR_WINDOW_SIZE,
} from '@/config/fdr';
import { clamp, competitionRanks, roundHalfAwayFromZero, sum } from '../shared/math';
import type { Fixture, Team } from './types';

/** Weights of last/this season's league position. Always sum to 1. */
export interface PositionWeights {
  lastSeason: number;
  thisSeason: number;
}

/** Everything admin-adjustable in the formula. */
export interface FdrFormula {
  /** One weight per gameweek in the window, nearest first. Sums to 10. */
  gameweekWeights: readonly number[];
  positionWeights: PositionWeights;
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

/** Position weights always sum to 1: the admin sets last season's, this season gets the rest. */
export function weightsFromLastSeason(lastSeasonWeight: number): PositionWeights {
  const lastSeason = roundHalfAwayFromZero(clamp(lastSeasonWeight, 0, 1), 4);
  return { lastSeason, thisSeason: roundHalfAwayFromZero(1 - lastSeason, 4) };
}

export function createFdrFormula(
  gameweekWeights: readonly number[],
  lastSeasonWeight: number,
): FdrFormula {
  return { gameweekWeights, positionWeights: weightsFromLastSeason(lastSeasonWeight) };
}

/** Returns an error message, or null when the weights are valid (5 non-negative, summing to 10). */
export function validateGameweekWeights(weights: readonly number[]): string | null {
  if (weights.length !== FDR_WINDOW_SIZE) {
    return `Exactly ${FDR_WINDOW_SIZE} gameweek weights are required.`;
  }
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    return 'Gameweek weights must be numbers of 0 or more.';
  }
  const total = sum(weights);
  if (Math.abs(total - FDR_GAMEWEEK_WEIGHTS_TOTAL) > 1e-6) {
    return `Gameweek weights must add up to ${FDR_GAMEWEEK_WEIGHTS_TOTAL} (currently ${roundHalfAwayFromZero(total, 4)}).`;
  }
  return null;
}

/**
 * The value a gameweek contributes to the formula.
 * - Single fixture → its difficulty.
 * - Double (or more) GW → 1 / (1/M1 + 1/M2 + …): more matches make the gameweek easier.
 * - Blank GW → FDR_BLANK_GAMEWEEK_VALUE (6, worse than any real fixture).
 */
export function cellValue(fixtures: readonly Pick<FdrFixtureRef, 'difficulty'>[]): number {
  const difficulties = fixtures.map((f) => f.difficulty).filter((d) => d > 0);
  if (difficulties.length === 0) return FDR_BLANK_GAMEWEEK_VALUE;
  if (difficulties.length === 1) return difficulties[0] as number;
  return 1 / sum(difficulties.map((d) => 1 / d));
}

/**
 * Spreadsheet formula (unrounded):
 *   (v1*w1 + v2*w2 + v3*w3 + v4*w4 + v5*w5)
 *     * (0.8 + 0.01*lastSeasonPos*wLast + 0.01*thisSeasonPos*wThis)
 */
export function rawFdrScore(
  values: readonly number[],
  lastSeasonPosition: number,
  thisSeasonPosition: number,
  formula: FdrFormula,
): number {
  const fixtureLoad = sum(values.map((v, i) => v * (formula.gameweekWeights[i] ?? 0)));
  const strengthMultiplier =
    FDR_BASE_MULTIPLIER +
    FDR_POSITION_COEFFICIENT * lastSeasonPosition * formula.positionWeights.lastSeason +
    FDR_POSITION_COEFFICIENT * thisSeasonPosition * formula.positionWeights.thisSeason;
  return fixtureLoad * strengthMultiplier;
}

/** The spreadsheet's AVG column: ROUND(rawFdrScore, 1). */
export function fdrScore(
  values: readonly number[],
  lastSeasonPosition: number,
  thisSeasonPosition: number,
  formula: FdrFormula,
): number {
  return roundHalfAwayFromZero(
    rawFdrScore(values, lastSeasonPosition, thisSeasonPosition, formula),
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
  formula: FdrFormula;
}

/** Builds the FDR table sorted easiest-first (lowest AVG), with Excel-style ranks. */
export function buildFdrTable(input: BuildFdrTableInput): FdrRow[] {
  const rows = input.teams.map((team) => {
    const lastSeasonPosition =
      input.lastSeasonPositions[team.code] ?? input.defaultLastSeasonPosition;
    const thisSeasonPosition = input.thisSeasonPositions.get(team.id) ?? input.teams.length;
    const cells = buildFdrCells(team.id, input.gameweekIds, input.fixtures);
    const values = cells.map((c) => c.value);
    const rawScore = rawFdrScore(values, lastSeasonPosition, thisSeasonPosition, input.formula);
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
