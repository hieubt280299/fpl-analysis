import { describe, expect, it } from 'vitest';
import { fromFdrFormula, parseCustomFormula, toFdrFormula } from './model';

describe('custom formula', () => {
  it('converts to and from the shared formula shape', () => {
    const formula = {
      gameweekWeights: [2.6, 2.3, 2, 1.7, 1.4],
      positionWeights: { lastSeason: 0.1, thisSeason: 0.9 },
    };
    const custom = fromFdrFormula(formula);
    expect(custom).toEqual({ gameweekWeights: [2.6, 2.3, 2, 1.7, 1.4], lastSeasonShare: 0.1 });
    expect(toFdrFormula({ ...custom, lastSeasonShare: 0.35 }).positionWeights).toEqual({
      lastSeason: 0.35,
      thisSeason: 0.65,
    });
  });

  it('allows any GW weights (no total of 10 needed)', () => {
    expect(parseCustomFormula({ gameweekWeights: [5, 5, 5, 5, 5], lastSeasonShare: 0.5 })).toEqual({
      gameweekWeights: [5, 5, 5, 5, 5],
      lastSeasonShare: 0.5,
    });
  });

  it('rejects broken stored values and clamps the share', () => {
    expect(parseCustomFormula(null)).toBeNull();
    expect(parseCustomFormula({ gameweekWeights: [1, 2], lastSeasonShare: 0 })).toBeNull();
    expect(
      parseCustomFormula({ gameweekWeights: [1, 1, 1, 1, 'x'], lastSeasonShare: 0 }),
    ).toBeNull();
    expect(
      parseCustomFormula({ gameweekWeights: [1, 1, 1, 1, 1], lastSeasonShare: 3 })?.lastSeasonShare,
    ).toBe(1);
  });
});
