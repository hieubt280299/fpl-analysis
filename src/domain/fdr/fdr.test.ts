import { describe, expect, it } from 'vitest';
import { FDR_BLANK_GAMEWEEK_VALUE } from '@/config/fdr';
import {
  buildFdrTable,
  cellValue,
  clampWindowStart,
  fdrScore,
  fdrWindow,
  weightsFromLastSeason,
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

const DEFAULT_WEIGHTS = weightsFromLastSeason(0.1);

describe('fdrScore', () => {
  it.each(SHEET)('%s matches the spreadsheet AVG', (_team, last, current, fdrs, expected) => {
    expect(fdrScore(fdrs, last, current, DEFAULT_WEIGHTS)).toBe(expected);
  });

  it('reproduces the worked example J2 = 21.7', () => {
    // ROUND((3*2.6+2*2.3+2*2+3*1.7+2*1.4)*(0.8+0.01*4*0.1+0.01*10*0.9), 1)
    expect(fdrScore([3, 2, 2, 3, 2], 4, 10, { lastSeason: 0.1, thisSeason: 0.9 })).toBe(21.7);
  });

  it('responds to admin-adjusted weights', () => {
    const equal = weightsFromLastSeason(0.5);
    // 24.3 * (0.8 + 0.01*4*0.5 + 0.01*10*0.5) = 24.3 * 0.87 = 21.141
    expect(fdrScore([3, 2, 2, 3, 2], 4, 10, equal)).toBe(21.1);
  });
});

describe('weightsFromLastSeason', () => {
  it('always sums to exactly 1', () => {
    for (const w of [0, 0.1, 0.15, 0.3, 0.7, 1]) {
      const { lastSeason, thisSeason } = weightsFromLastSeason(w);
      expect(lastSeason + thisSeason).toBe(1);
    }
  });

  it('clamps out-of-range input', () => {
    expect(weightsFromLastSeason(1.4)).toEqual({ lastSeason: 1, thisSeason: 0 });
    expect(weightsFromLastSeason(-1)).toEqual({ lastSeason: 0, thisSeason: 1 });
  });
});

describe('cellValue', () => {
  it('uses the difficulty of a single fixture', () => {
    expect(cellValue([{ difficulty: 4 }])).toBe(4);
  });
  it('averages a double gameweek', () => {
    expect(cellValue([{ difficulty: 2 }, { difficulty: 3 }])).toBe(2.5);
  });
  it('uses the blank value when there is no fixture', () => {
    expect(cellValue([])).toBe(FDR_BLANK_GAMEWEEK_VALUE);
  });
});

describe('fdrWindow', () => {
  it('returns five consecutive gameweeks', () => {
    expect(fdrWindow(11, 38)).toEqual([11, 12, 13, 14, 15]);
  });
  it('keeps a full window at the end of the season', () => {
    expect(clampWindowStart(37, 38)).toBe(34);
    expect(fdrWindow(37, 38)).toEqual([34, 35, 36, 37, 38]);
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
      weights: DEFAULT_WEIGHTS,
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
      weights: DEFAULT_WEIGHTS,
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
      weights: DEFAULT_WEIGHTS,
    });
    expect(row?.cells[0]?.fixtures).toHaveLength(2);
    expect(row?.cells[0]?.value).toBe(4);
    expect(row?.cells[1]?.fixtures).toHaveLength(0);
    expect(row?.cells[1]?.value).toBe(FDR_BLANK_GAMEWEEK_VALUE);
  });
});
