import type { Fixture, Team } from './types';

export interface LeagueTableRow {
  team: Team;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Builds the current Premier League table from finished fixtures.
 * Ordering: points, goal difference, goals scored, then team name. (The PL's further
 * tie-breakers — head-to-head etc. — almost never matter for FDR purposes and are not modelled.)
 */
export function computeLeagueTable(
  teams: readonly Team[],
  fixtures: readonly Fixture[],
): LeagueTableRow[] {
  const rows = new Map<number, Omit<LeagueTableRow, 'position'>>(
    teams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  );

  for (const f of fixtures) {
    if (!f.finished || f.homeGoals === null || f.awayGoals === null) continue;
    const home = rows.get(f.homeTeamId);
    const away = rows.get(f.awayTeamId);
    if (!home || !away) continue;
    record(home, f.homeGoals, f.awayGoals);
    record(away, f.awayGoals, f.homeGoals);
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function record(row: Omit<LeagueTableRow, 'position'>, scored: number, conceded: number): void {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}
