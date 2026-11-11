import { sum } from '../shared/math';
import type { PrizeRules } from './types';

export interface PrizeStructure {
  participantCount: number;
  gameweekCount: number;
  /** participants × entry fee */
  pot: number;
  monthPool: number;
  gameweekPool: number;
  /** Prize money for each individual gameweek (gameweekPool / gameweekCount). */
  perGameweekPool: number;
  /** Prize by finishing position for every gameweek: [winner, runner-up]. */
  gameweekPrizes: readonly number[];
  /** Prize by finishing position for the month: [winner, runner-up]. */
  monthPrizes: readonly number[];
}

/** Splits `amount` proportionally to `ratio`, e.g. 160 by [3, 1] → [120, 40]. */
export function splitByRatio(amount: number, ratio: readonly number[]): number[] {
  const total = sum(ratio);
  if (total <= 0) return ratio.map(() => 0);
  return ratio.map((r) => (amount * r) / total);
}

/**
 * Pot = participants × entry fee.
 * Month prize pool = pot × monthPoolShare (40%), split winner : runner-up = 3 : 1.
 * The remaining 60% is divided equally among the month's gameweeks, each split 3 : 1.
 */
export function buildPrizeStructure(
  participantCount: number,
  gameweekCount: number,
  rules: PrizeRules,
): PrizeStructure {
  const pot = Math.max(0, participantCount) * rules.entryFee;
  const hasGameweeks = gameweekCount > 0;
  // With no gameweeks (should not happen for a real month) everything goes to the month prize.
  const monthPool = hasGameweeks ? pot * rules.monthPoolShare : pot;
  const gameweekPool = pot - monthPool;
  const perGameweekPool = hasGameweeks ? gameweekPool / gameweekCount : 0;
  return {
    participantCount,
    gameweekCount,
    pot,
    monthPool,
    gameweekPool,
    perGameweekPool,
    gameweekPrizes: splitByRatio(perGameweekPool, rules.prizeSplit),
    monthPrizes: splitByRatio(monthPool, rules.prizeSplit),
  };
}
