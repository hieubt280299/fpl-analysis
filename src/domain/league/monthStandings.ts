import { sum } from '../shared/math';
import { buildPrizeStructure, type PrizeStructure } from './prizes';
import { rankWithPrizes, type RankingScore } from './ranking';
import type { Gameweek, GameweekScore, Participant, PrizeRules, ResultState } from './types';

export interface MonthStandingsInput {
  /** Gameweeks belonging to the month. */
  gameweeks: readonly Gameweek[];
  participants: readonly Participant[];
  /** Scores per entry id. Missing gameweeks (e.g. team created later) count as 0 points. */
  scores: Readonly<Record<number, readonly GameweekScore[]>>;
  rules: PrizeRules;
  /**
   * Penalty-free transfer-hit allowance (points) per entry id, applied to the month's FIRST
   * gameweek only. Missing entries get 0.
   */
  penaltyFree?: Readonly<Record<number, number>>;
}

export interface GameweekCell {
  /** Null when the gameweek has not started, or the manager has no score for it. */
  score: GameweekScore | null;
  /**
   * Gross FPL points (before transfer hits) — the GW ranking uses these, so a manager who took
   * hits still has a fair shot at the GW prize. Null when the gameweek has not started.
   */
  points: number | null;
  /** Points after (adjusted) transfer hits — what counts towards the month total. */
  net: number | null;
  /** Transfer hit actually deducted, after any penalty-free allowance. */
  transferCost: number;
  /** Part of FPL's transfer hit waived by the penalty-free allowance. */
  waivedCost: number;
  position: number | null;
  tieSize: number;
  prize: number;
}

/** Month totals. `points` is the NET total (after hits) — the month ranking uses it. */
export interface MonthTotals extends RankingScore {
  /** Transfer hits deducted this month (after allowances). */
  transferCost: number;
  /** Transfer hits waived this month by the penalty-free allowance. */
  waivedCost: number;
  position: number | null;
  tieSize: number;
  prize: number;
}

export interface ParticipantMonthRow {
  participant: Participant;
  /** Keyed by gameweek id. */
  gameweeks: Record<number, GameweekCell>;
  month: MonthTotals;
  /** Gameweek prizes + month prize. */
  totalPrize: number;
}

export interface GameweekColumn {
  gameweek: Gameweek;
  state: ResultState;
}

export interface MonthStandings {
  prizes: PrizeStructure;
  columns: GameweekColumn[];
  monthState: ResultState;
  /** The gameweek the penalty-free allowance applies to (the month's first), if any. */
  penaltyFreeGameweek: number | null;
  /** Sorted by month position (then name). */
  rows: ParticipantMonthRow[];
  /** Sum of all prizes awarded so far (pending gameweeks award nothing). */
  totalAwarded: number;
}

/**
 * Transfer hit after the penalty-free allowance: max(0, cost − allowance).
 * e.g. allowance 8: a −4 hit becomes 0, a −16 hit becomes −8.
 */
export function effectiveTransferCost(transferCost: number, allowance: number): number {
  return Math.max(0, transferCost - Math.max(0, allowance));
}

export function gameweekResultState(gameweek: Gameweek): ResultState {
  if (gameweek.status === 'upcoming') return 'pending';
  if (gameweek.status === 'finished' && gameweek.dataChecked) return 'final';
  return 'provisional';
}

export function combineResultStates(states: readonly ResultState[]): ResultState {
  if (states.length === 0 || states.every((s) => s === 'pending')) return 'pending';
  if (states.every((s) => s === 'final')) return 'final';
  return 'provisional';
}

function emptyScore(gameweek: number): GameweekScore {
  return { gameweek, points: 0, transferCost: 0, benchPoints: 0, chip: null };
}

const PENDING_CELL: Omit<GameweekCell, 'score'> = {
  points: null,
  net: null,
  transferCost: 0,
  waivedCost: 0,
  position: null,
  tieSize: 1,
  prize: 0,
};

/**
 * Computes the full month table: per-gameweek rankings and prizes, the month ranking and prize,
 * and each participant's total winnings. Pure function — safe to call on every render.
 */
export function computeMonthStandings(input: MonthStandingsInput): MonthStandings {
  const gameweeks = [...input.gameweeks].sort((a, b) => a.id - b.id);
  const prizes = buildPrizeStructure(input.participants.length, gameweeks.length, input.rules);
  const columns = gameweeks.map((gameweek) => ({ gameweek, state: gameweekResultState(gameweek) }));
  const monthState = combineResultStates(columns.map((c) => c.state));
  const penaltyFreeGameweek = gameweeks[0]?.id ?? null;
  const byName = (a: Participant, b: Participant) => a.playerName.localeCompare(b.playerName);

  const rows: ParticipantMonthRow[] = input.participants.map((participant) => {
    const scoreByGw = new Map(
      (input.scores[participant.entryId] ?? []).map((s) => [s.gameweek, s] as const),
    );
    const allowance = input.penaltyFree?.[participant.entryId] ?? 0;
    const cells: Record<number, GameweekCell> = {};
    const started: Array<{ score: GameweekScore; cell: GameweekCell }> = [];

    for (const { gameweek, state } of columns) {
      if (state === 'pending') {
        cells[gameweek.id] = { score: null, ...PENDING_CELL };
        continue;
      }
      const recorded = scoreByGw.get(gameweek.id) ?? null;
      const score = recorded ?? emptyScore(gameweek.id);
      const transferCost = effectiveTransferCost(
        score.transferCost,
        gameweek.id === penaltyFreeGameweek ? allowance : 0,
      );
      const cell: GameweekCell = {
        score: recorded,
        points: score.points,
        net: score.points - transferCost,
        transferCost,
        waivedCost: score.transferCost - transferCost,
        position: null,
        tieSize: 1,
        prize: 0,
      };
      cells[gameweek.id] = cell;
      started.push({ score, cell });
    }

    return {
      participant,
      gameweeks: cells,
      month: {
        points: sum(started.map(({ cell }) => cell.net ?? 0)),
        chipsUsed: started.filter(({ score }) => score.chip !== null).length,
        benchPoints: sum(started.map(({ score }) => score.benchPoints)),
        transferCost: sum(started.map(({ cell }) => cell.transferCost)),
        waivedCost: sum(started.map(({ cell }) => cell.waivedCost)),
        position: null,
        tieSize: 1,
        prize: 0,
      },
      totalPrize: 0,
    };
  });

  for (const { gameweek, state } of columns) {
    if (state === 'pending') continue;
    const ranked = rankWithPrizes(
      rows,
      (row): RankingScore => {
        const cell = row.gameweeks[gameweek.id];
        // GW ranking is on GROSS points (hits ignored); only the month uses net points.
        return {
          points: cell?.points ?? 0,
          chipsUsed: cell?.score?.chip ? 1 : 0,
          benchPoints: cell?.score?.benchPoints ?? 0,
        };
      },
      prizes.gameweekPrizes,
      (a, b) => byName(a.participant, b.participant),
    );
    for (const { item, position, tieSize, prize } of ranked) {
      const cell = item.gameweeks[gameweek.id];
      if (cell) Object.assign(cell, { position, tieSize, prize });
    }
  }

  let sortedRows = [...rows].sort((a, b) => byName(a.participant, b.participant));
  if (monthState !== 'pending') {
    const ranked = rankWithPrizes(
      rows,
      (row) => row.month,
      prizes.monthPrizes,
      (a, b) => byName(a.participant, b.participant),
    );
    for (const { item, position, tieSize, prize } of ranked) {
      Object.assign(item.month, { position, tieSize, prize });
    }
    sortedRows = ranked.map((r) => r.item);
  }

  for (const row of sortedRows) {
    row.totalPrize = sum(Object.values(row.gameweeks).map((c) => c.prize)) + row.month.prize;
  }

  return {
    prizes,
    columns,
    monthState,
    penaltyFreeGameweek,
    rows: sortedRows,
    totalAwarded: sum(sortedRows.map((r) => r.totalPrize)),
  };
}
