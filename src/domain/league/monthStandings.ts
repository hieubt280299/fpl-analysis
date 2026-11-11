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
}

export interface GameweekCell {
  /** Null when the gameweek has not started, or the manager has no score for it. */
  score: GameweekScore | null;
  /** Points after transfer hits; null when the gameweek has not started. */
  net: number | null;
  position: number | null;
  tieSize: number;
  prize: number;
}

export interface MonthTotals extends RankingScore {
  transferCost: number;
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
  /** Sorted by month position (then name). */
  rows: ParticipantMonthRow[];
  /** Sum of all prizes awarded so far (pending gameweeks award nothing). */
  totalAwarded: number;
}

export function netPoints(score: GameweekScore): number {
  return score.points - score.transferCost;
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

/**
 * Computes the full month table: per-gameweek rankings and prizes, the month ranking and prize,
 * and each participant's total winnings. Pure function — safe to call on every render.
 */
export function computeMonthStandings(input: MonthStandingsInput): MonthStandings {
  const gameweeks = [...input.gameweeks].sort((a, b) => a.id - b.id);
  const prizes = buildPrizeStructure(input.participants.length, gameweeks.length, input.rules);
  const columns = gameweeks.map((gameweek) => ({ gameweek, state: gameweekResultState(gameweek) }));
  const monthState = combineResultStates(columns.map((c) => c.state));
  const byName = (a: Participant, b: Participant) => a.playerName.localeCompare(b.playerName);

  const rows = new Map<number, ParticipantMonthRow>();
  for (const participant of input.participants) {
    const scoreByGw = new Map(
      (input.scores[participant.entryId] ?? []).map((s) => [s.gameweek, s] as const),
    );
    const cells: Record<number, GameweekCell> = {};
    const started: GameweekScore[] = [];
    for (const { gameweek, state } of columns) {
      if (state === 'pending') {
        cells[gameweek.id] = { score: null, net: null, position: null, tieSize: 1, prize: 0 };
        continue;
      }
      const recorded = scoreByGw.get(gameweek.id) ?? null;
      const score = recorded ?? emptyScore(gameweek.id);
      started.push(score);
      cells[gameweek.id] = {
        score: recorded,
        net: netPoints(score),
        position: null,
        tieSize: 1,
        prize: 0,
      };
    }
    rows.set(participant.entryId, {
      participant,
      gameweeks: cells,
      month: {
        points: sum(started.map(netPoints)),
        chipsUsed: started.filter((s) => s.chip !== null).length,
        benchPoints: sum(started.map((s) => s.benchPoints)),
        transferCost: sum(started.map((s) => s.transferCost)),
        position: null,
        tieSize: 1,
        prize: 0,
      },
      totalPrize: 0,
    });
  }

  const allRows = [...rows.values()];

  for (const { gameweek, state } of columns) {
    if (state === 'pending') continue;
    const ranked = rankWithPrizes(
      allRows,
      (row): RankingScore => {
        const cell = row.gameweeks[gameweek.id];
        const score = cell?.score ?? emptyScore(gameweek.id);
        return {
          points: netPoints(score),
          chipsUsed: score.chip ? 1 : 0,
          benchPoints: score.benchPoints,
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

  let sortedRows = [...allRows].sort((a, b) => byName(a.participant, b.participant));
  if (monthState !== 'pending') {
    const ranked = rankWithPrizes(
      allRows,
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
    rows: sortedRows,
    totalAwarded: sum(sortedRows.map((r) => r.totalPrize)),
  };
}
