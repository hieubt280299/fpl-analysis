import { describe, expect, it } from 'vitest';
import { computeLeagueTable, resolveThisSeasonPositions } from './leagueTable';
import type { Fixture, Team } from './types';

const teams: Team[] = [
  { id: 1, code: 3, name: 'Arsenal', shortName: 'ARS' },
  { id: 2, code: 7, name: 'Aston Villa', shortName: 'AVL' },
  { id: 3, code: 91, name: 'Bournemouth', shortName: 'BOU' },
  { id: 4, code: 94, name: 'Brentford', shortName: 'BRE' },
];

let nextId = 1;
function result(
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
  finished = true,
): Fixture {
  return {
    id: nextId++,
    gameweek: 1,
    kickoff: null,
    homeTeamId: home,
    awayTeamId: away,
    homeGoals: hg,
    awayGoals: ag,
    homeDifficulty: 3,
    awayDifficulty: 3,
    finished,
  };
}

describe('computeLeagueTable', () => {
  it('orders by points, goal difference, then goals scored', () => {
    const table = computeLeagueTable(teams, [
      result(1, 2, 3, 0), // ARS W
      result(3, 4, 2, 1), // BOU W (GD +1)
      result(2, 3, 2, 2), // AVL D, BOU D
      result(4, 1, 1, 1), // BRE D, ARS D
      result(1, 3, 0, 0, false), // not finished — ignored
      result(2, 4, null, null), // no score — ignored
    ]);
    expect(table.map((r) => [r.team.shortName, r.position, r.points, r.goalDifference])).toEqual([
      ['ARS', 1, 4, 3],
      ['BOU', 2, 4, 1],
      ['BRE', 3, 1, -1],
      ['AVL', 4, 1, -3],
    ]);
    expect(table[0]).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 4 });
  });

  it('lists every team, alphabetically, before any match is played', () => {
    const table = computeLeagueTable([...teams].reverse(), []);
    expect(table.map((r) => r.team.shortName)).toEqual(['ARS', 'AVL', 'BOU', 'BRE']);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});

describe('resolveThisSeasonPositions', () => {
  const calculated = computeLeagueTable(teams, [result(2, 1, 1, 0)]); // AVL top
  const withOfficial = (positions: Array<number | null>) =>
    teams.map((t, i) => ({ ...t, officialPosition: positions[i] }));

  it('uses the official FPL positions when they agree with the results', () => {
    // AVL 3 pts; BOU and BRE level on everything (FPL puts BRE first); ARS −1 GD.
    const { positions, source } = resolveThisSeasonPositions(
      withOfficial([4, 1, 3, 2]),
      calculated,
    );
    expect(source).toBe('official');
    expect(positions.get(4)).toBe(2);
  });

  it('falls back to the calculated table when FPL positions are missing or inconsistent', () => {
    for (const bad of [
      [0, 0, 0, 0],
      [1, 1, 2, 3],
      [1, 2, 3, null],
      [1, 2, 3, 5],
    ]) {
      const { positions, source } = resolveThisSeasonPositions(withOfficial(bad), calculated);
      expect(source).toBe('calculated');
      expect(positions.get(2)).toBe(1);
    }
  });

  it("follows the results when FPL's table is behind them", () => {
    // Results: BOU 3 pts (+2), AVL 3 pts (+1), ARS 0 (−1), BRE 0 (−2).
    // FPL hasn't caught up with BOU's win yet and still has BOU 4th.
    const table = computeLeagueTable(teams, [result(2, 1, 1, 0), result(3, 4, 2, 0)]);
    const { positions, source } = resolveThisSeasonPositions(withOfficial([2, 1, 4, 3]), table);
    expect(source).toBe('calculated');
    expect([1, 2, 3, 4].map((id) => positions.get(id))).toEqual([3, 2, 1, 4]);
  });

  it("uses FPL's order for teams level on points, goal difference and goals scored", () => {
    // ARS and BRE drew 1-1 and BOU and AVL drew 0-0: two pairs level on everything.
    const table = computeLeagueTable(teams, [result(1, 4, 1, 1), result(3, 2, 0, 0)]);
    const { positions, source } = resolveThisSeasonPositions(withOfficial([2, 4, 3, 1]), table);
    expect(source).toBe('official');
    expect([1, 2, 3, 4].map((id) => positions.get(id))).toEqual([2, 4, 3, 1]);
  });

  it('uses a valid official table as is while fixtures are not loaded', () => {
    const { positions, source } = resolveThisSeasonPositions(withOfficial([2, 1, 4, 3]), []);
    expect(source).toBe('official');
    expect(positions.get(3)).toBe(4);
  });
});
