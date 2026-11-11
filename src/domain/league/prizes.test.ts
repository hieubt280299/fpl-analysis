import { describe, expect, it } from 'vitest';
import { LEAGUE_RULES } from '@/config/league';
import { buildPrizeStructure, splitByRatio } from './prizes';

describe('buildPrizeStructure', () => {
  it('reproduces the November sheet: 4 players, 3 gameweeks', () => {
    const p = buildPrizeStructure(4, 3, LEAGUE_RULES);
    expect(p.pot).toBe(800);
    expect(p.monthPool).toBe(320);
    expect(p.gameweekPool).toBe(480);
    expect(p.perGameweekPool).toBe(160);
    expect(p.gameweekPrizes).toEqual([120, 40]);
    expect(p.monthPrizes).toEqual([240, 80]);
  });

  it('splits the 60% gameweek pool equally across any number of gameweeks', () => {
    const p = buildPrizeStructure(5, 4, LEAGUE_RULES); // pot 1000, GW pool 600
    expect(p.perGameweekPool).toBe(150);
    expect(p.gameweekPrizes).toEqual([112.5, 37.5]);
    expect(p.monthPrizes).toEqual([300, 100]);
  });

  it('always pays out exactly the pot', () => {
    for (const players of [2, 3, 7, 11]) {
      for (const gws of [1, 2, 3, 4, 5, 6]) {
        const p = buildPrizeStructure(players, gws, LEAGUE_RULES);
        const paid =
          p.gameweekPrizes.reduce((a, b) => a + b, 0) * gws +
          p.monthPrizes.reduce((a, b) => a + b, 0);
        expect(paid).toBeCloseTo(p.pot, 9);
      }
    }
  });

  it('handles an empty month', () => {
    const p = buildPrizeStructure(0, 3, LEAGUE_RULES);
    expect(p.pot).toBe(0);
    expect(p.gameweekPrizes).toEqual([0, 0]);
  });
});

describe('splitByRatio', () => {
  it('splits 3:1', () => {
    expect(splitByRatio(160, [3, 1])).toEqual([120, 40]);
  });
});
