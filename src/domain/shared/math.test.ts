import { describe, expect, it } from 'vitest';
import { competitionRanks, roundHalfAwayFromZero } from './math';

describe('roundHalfAwayFromZero', () => {
  it('matches Excel ROUND for typical values', () => {
    expect(roundHalfAwayFromZero(21.7242, 1)).toBe(21.7);
    expect(roundHalfAwayFromZero(23.38, 1)).toBe(23.4);
    expect(roundHalfAwayFromZero(2.25, 1)).toBe(2.3);
    expect(roundHalfAwayFromZero(-2.25, 1)).toBe(-2.3);
  });

  it('absorbs binary floating-point noise like Excel does', () => {
    // 1.005 is stored as 1.00499999999999989... — Excel still rounds it to 1.01.
    expect(roundHalfAwayFromZero(1.005, 2)).toBe(1.01);
    expect(roundHalfAwayFromZero(0.1 + 0.2, 1)).toBe(0.3);
  });
});

describe('competitionRanks', () => {
  it('gives tied values the same rank and skips the next rank', () => {
    expect(competitionRanks([21.7, 23, 23.4, 23.4, 24.3])).toEqual([1, 2, 3, 3, 5]);
  });

  it('supports descending order', () => {
    expect(competitionRanks([71, 61, 61, 40], false)).toEqual([1, 2, 2, 4]);
  });
});
