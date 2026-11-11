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

  it('uses the official FPL positions when they are a complete 1..N ranking', () => {
    const { positions, source } = resolveThisSeasonPositions(
      withOfficial([2, 1, 4, 3]),
      calculated,
    );
    expect(source).toBe('official');
    expect(positions.get(4)).toBe(3);
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
});
