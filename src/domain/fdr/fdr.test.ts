import { describe, expect, it } from 'vitest';
import { FDR_BLANK_GAMEWEEK_VALUE, FDR_DEFAULT_GAMEWEEK_WEIGHTS } from '@/config/fdr';
import {
  buildFdrTable,
  cellValue,
  createFdrFormula,
  fdrScore,
  positionWeightsAfter,
  upcomingWindow,
  validateGameweekWeights,
} from './fdr';
import type { Fixture, Team } from './types';

/** The FDR sheet (GW10–14) from the original spreadsheet: [team, last, this, fdr[5], AVG, rank]. */
const SHEET: Array<[string, number, number, number[], number, number]> = [
  ['Aston Villa', 4, 10, [3, 2, 2, 3, 2], 21.7, 1],
  ['Liverpool', 5, 5, [2, 3, 3, 2, 4], 23, 2],
  ['Brighton', 8, 3, [3, 2, 3, 4, 2], 23.4, 3],
  ['Chelsea', 10, 4, [3, 3, 2, 2, 4], 23.4, 3],
  ['Bournemouth', 6, 8, [2, 3, 3, 4, 2], 24.3, 5],
  ['Spurs', 17, 9, [3, 2, 3, 2, 4], 24.6, 6],
  ['Man City', 2, 2, [2, 2, 5, 3, 4], 25, 7],
  ['Coventry', 20, 16, [3, 2, 3, 2, 3], 25.1, 8],
  ['Arsenal', 1, 1, [2, 3, 4, 4, 3], 25.2, 9],
  ['Everton', 13, 7, [2, 4, 4, 3, 2], 26.5, 10],
  ['Ipswich', 20, 14, [3, 3, 3, 2, 3], 26.8, 11],
  ['Crystal Palace', 15, 18, [4, 2, 2, 4, 3], 29.3, 12],
  ['Man Utd', 3, 17, [3, 4, 3, 3, 2], 29.5, 13],
  ['Leeds', 14, 12, [3, 4, 2, 5, 2], 29.8, 14],
  ['Newcastle', 12, 13, [3, 4, 4, 3, 2], 30.6, 15],
  ['Brentford', 9, 6, [4, 3, 3, 4, 4], 30.8, 16],
  ['Fulham', 11, 15, [3, 5, 3, 3, 3], 32.7, 17],
  ['Hull', 20, 11, [5, 4, 2, 3, 4], 33.9, 18],
  ['Sunderland', 7, 20, [4, 3, 3, 4, 3], 33.9, 18],
  ["Nott'm Forest", 16, 19, [4, 4, 4, 2, 4], 36.1, 20],
];

// The sheet covered GW10–14, i.e. it was made with 9 gameweeks finished → weights 0.1 / 0.9.
const DEFAULT_FORMULA = createFdrFormula(FDR_DEFAULT_GAMEWEEK_WEIGHTS, 9);

describe('fdrScore', () => {
  it.each(SHEET)('%s matches the spreadsheet AVG', (_team, last, current, fdrs, expected) => {
    expect(fdrScore(fdrs, last, current, DEFAULT_FORMULA)).toBe(expected);
  });

  it('reproduces the worked example J2 = 21.7', () => {
    // ROUND((3*2.6+2*2.3+2*2+3*1.7+2*1.4)*(0.8+0.01*4*0.1+0.01*10*0.9), 1)
    const formula = {
      gameweekWeights: [2.6, 2.3, 2, 1.7, 1.4],
      positionWeights: { lastSeason: 0.1, thisSeason: 0.9 },
    };
    expect(fdrScore([3, 2, 2, 3, 2], 4, 10, formula)).toBe(21.7);
  });

  it('shifts the position weights as gameweeks finish', () => {
    const equal = createFdrFormula(FDR_DEFAULT_GAMEWEEK_WEIGHTS, 5); // 50% / 50%
    // 24.3 * (0.8 + 0.01*4*0.5 + 0.01*10*0.5) = 24.3 * 0.87 = 21.141
    expect(fdrScore([3, 2, 2, 3, 2], 4, 10, equal)).toBe(21.1);
  });

  it('responds to admin-adjusted gameweek weights', () => {
    const flat = createFdrFormula([2, 2, 2, 2, 2], 9);
    // (3+2+2+3+2)*2 = 24 → 24 * 0.894 = 21.456
    expect(fdrScore([3, 2, 2, 3, 2], 4, 10, flat)).toBe(21.5);
  });
});

describe('positionWeightsAfter', () => {
  it('starts at 0% this season before GW1 and adds 10% per finished gameweek', () => {
    expect(positionWeightsAfter(0)).toEqual({ lastSeason: 1, thisSeason: 0 });
    expect(positionWeightsAfter(1)).toEqual({ lastSeason: 0.9, thisSeason: 0.1 });
    expect(positionWeightsAfter(3)).toEqual({ lastSeason: 0.7, thisSeason: 0.3 });
    expect(positionWeightsAfter(9)).toEqual({ lastSeason: 0.1, thisSeason: 0.9 });
  });

  it('reaches 100% this season after 10 gameweeks and stays there', () => {
    expect(positionWeightsAfter(10)).toEqual({ lastSeason: 0, thisSeason: 1 });
    expect(positionWeightsAfter(38)).toEqual({ lastSeason: 0, thisSeason: 1 });
  });

  it('always sums to exactly 1 and ignores invalid counts', () => {
    for (let n = 0; n <= 38; n += 1) {
      const { lastSeason, thisSeason } = positionWeightsAfter(n);
      expect(lastSeason + thisSeason).toBe(1);
    }
    expect(positionWeightsAfter(-2)).toEqual({ lastSeason: 1, thisSeason: 0 });
  });
});

describe('cellValue', () => {
  it('uses the difficulty of a single fixture', () => {
    expect(cellValue([{ difficulty: 4 }])).toBe(4);
  });
  it('combines a double gameweek as 1 / (1/M1 + 1/M2), rounded to 1 decimal', () => {
    expect(cellValue([{ difficulty: 2 }, { difficulty: 3 }])).toBe(1.2);
    expect(cellValue([{ difficulty: 4 }, { difficulty: 4 }])).toBe(2);
    expect(cellValue([{ difficulty: 3 }, { difficulty: 5 }])).toBe(1.9); // 1.875
    expect(cellValue([{ difficulty: 2 }, { difficulty: 4 }])).toBe(1.3); // 1.333…
    expect(cellValue([{ difficulty: 5 }, { difficulty: 5 }])).toBe(2.5);
  });
  it('extends to a triple gameweek', () => {
    expect(cellValue([{ difficulty: 3 }, { difficulty: 3 }, { difficulty: 3 }])).toBe(1);
  });
  it('scores a blank gameweek as 6', () => {
    expect(FDR_BLANK_GAMEWEEK_VALUE).toBe(6);
    expect(cellValue([])).toBe(6);
  });
});

describe('validateGameweekWeights', () => {
  it('accepts the defaults and any five non-negative weights summing to 10', () => {
    expect(validateGameweekWeights(FDR_DEFAULT_GAMEWEEK_WEIGHTS)).toBeNull();
    expect(validateGameweekWeights([2, 2, 2, 2, 2])).toBeNull();
    expect(validateGameweekWeights([10, 0, 0, 0, 0])).toBeNull();
    expect(validateGameweekWeights([3.3, 2.7, 2.1, 1.2, 0.7])).toBeNull();
  });
  it('rejects a wrong total, wrong count or negative weights', () => {
    expect(validateGameweekWeights([2, 2, 2, 2, 1])).toMatch(/add up to 10/);
    expect(validateGameweekWeights([2.5, 2.5, 2.5, 2.5])).toMatch(/Exactly 5/);
    expect(validateGameweekWeights([4, 4, 4, -1, -1])).toMatch(/0 or more/);
    expect(validateGameweekWeights([2, 2, 2, 2, Number.NaN])).toMatch(/0 or more/);
  });
});

describe('upcomingWindow', () => {
  it('returns the next five gameweeks from the next deadline', () => {
    expect(upcomingWindow(11, 38)).toEqual([11, 12, 13, 14, 15]);
    expect(upcomingWindow(1, 38)).toEqual([1, 2, 3, 4, 5]);
  });
  it('never goes past the end of the season or back into finished gameweeks', () => {
    expect(upcomingWindow(36, 38)).toEqual([36, 37, 38]);
    expect(upcomingWindow(38, 38)).toEqual([38]);
  });
  it('is empty when no gameweek is upcoming', () => {
    expect(upcomingWindow(null, 38)).toEqual([]);
    expect(upcomingWindow(39, 38)).toEqual([]);
  });
});

describe('buildFdrTable', () => {
  // One team per sheet row; every fixture is against an "external" opponent (id 999) so each
  // team's difficulties come straight from the sheet.
  const teams: Team[] = SHEET.map(([name], i) => ({
    id: i + 1,
    code: 100 + i,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
  }));
  const fixtures: Fixture[] = SHEET.flatMap(([, , , fdrs], i) =>
    fdrs.map((difficulty, j) => ({
      id: i * 10 + j,
      gameweek: 10 + j,
      kickoff: null,
      homeTeamId: i + 1,
      awayTeamId: 999,
      homeGoals: null,
      awayGoals: null,
      homeDifficulty: difficulty,
      awayDifficulty: 3,
      finished: false,
    })),
  );

  it('reproduces the whole spreadsheet: order, AVG and RANK', () => {
    const table = buildFdrTable({
      teams,
      fixtures,
      gameweekIds: [10, 11, 12, 13, 14],
      thisSeasonPositions: new Map(SHEET.map(([, , current], i) => [i + 1, current])),
      lastSeasonPositions: Object.fromEntries(SHEET.map(([, last], i) => [100 + i, last])),
      defaultLastSeasonPosition: 20,
      formula: DEFAULT_FORMULA,
    });
    expect(table.map((r) => [r.team.name, r.score, r.rank])).toEqual(
      SHEET.map(([name, , , , avg, rank]) => [name, avg, rank]),
    );
  });

  it('falls back to the default last-season position for promoted teams', () => {
    const table = buildFdrTable({
      teams: teams.slice(0, 1),
      fixtures,
      gameweekIds: [10, 11, 12, 13, 14],
      thisSeasonPositions: new Map([[1, 10]]),
      lastSeasonPositions: {},
      defaultLastSeasonPosition: 20,
      formula: DEFAULT_FORMULA,
    });
    expect(table[0]?.lastSeasonPosition).toBe(20);
  });

  it('marks blank and double gameweeks', () => {
    const extra: Fixture[] = [
      { ...fixtures[0]!, id: 5000, gameweek: 10, homeDifficulty: 5 }, // AVL double in GW10: 3 + 5
    ];
    const withoutGw11 = fixtures.filter((f) => !(f.homeTeamId === 1 && f.gameweek === 11));
    const [row] = buildFdrTable({
      teams: teams.slice(0, 1),
      fixtures: [...withoutGw11, ...extra],
      gameweekIds: [10, 11],
      thisSeasonPositions: new Map([[1, 10]]),
      lastSeasonPositions: { 100: 4 },
      defaultLastSeasonPosition: 20,
      formula: DEFAULT_FORMULA,
    });
    expect(row?.cells[0]?.fixtures).toHaveLength(2);
    expect(row?.cells[0]?.value).toBe(1.9); // 1 / (1/3 + 1/5) = 1.875 → 1.9
    expect(row?.cells[1]?.fixtures).toHaveLength(0);
    expect(row?.cells[1]?.value).toBe(FDR_BLANK_GAMEWEEK_VALUE);
  });
});
