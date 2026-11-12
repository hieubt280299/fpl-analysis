import { roundHalfAwayFromZero, sum } from '../shared/math';
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
 * Splits a prize by ratio with whole-number amounts where possible: every place except the last is
 * rounded to the nearest whole number (half up) and the last place gets the remainder.
 * e.g. 150 by [3, 1] → 112.5 / 37.5 → [113, 37].
 */
export function splitPrize(amount: number, ratio: readonly number[]): number[] {
  const raw = splitByRatio(amount, ratio);
  if (raw.length < 2) return raw;
  const rounded = raw.slice(0, -1).map((v) => roundHalfAwayFromZero(v, 0));
  return [...rounded, amount - sum(rounded)];
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
    gameweekPrizes: splitPrize(perGameweekPool, rules.prizeSplit),
    monthPrizes: splitPrize(monthPool, rules.prizeSplit),
  };
}
