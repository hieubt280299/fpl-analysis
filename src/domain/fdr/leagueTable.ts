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

export type PositionSource = 'official' | 'calculated';

/**
 * This season's positions for the FDR table.
 *
 * The order comes from results (points, goal difference, goals scored). FPL's official table
 * (`teams[].position`) is only used to order teams level on all three — it applies the PL's
 * head-to-head tie-breakers — because FPL updates it later than match results: on
 * 21 Nov 2026 it still had Fulham 15th after their draw at Man City had moved them to 14th.
 *
 * `source` is 'official' when the result is exactly FPL's table, otherwise 'calculated' (FPL's
 * table is behind, or its positions are missing / not exactly 1..N). Without any calculated table
 * (fixtures not loaded yet) a valid official table is used as is.
 */
export function resolveThisSeasonPositions(
  teams: readonly Team[],
  calculated: readonly LeagueTableRow[],
): { positions: Map<number, number>; source: PositionSource } {
  const official = new Map(teams.map((t) => [t.id, t.officialPosition ?? 0]));
  const values = [...official.values()];
  const officialValid =
    teams.length > 0 &&
    values.every((p) => Number.isInteger(p) && p >= 1 && p <= teams.length) &&
    new Set(values).size === teams.length;

  if (calculated.length === 0) {
    return officialValid
      ? { positions: official, source: 'official' }
      : { positions: new Map(), source: 'calculated' };
  }

  const tieBreak = (row: LeagueTableRow) => (officialValid ? (official.get(row.team.id) ?? 0) : 0);
  const ranked = [...calculated].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      tieBreak(a) - tieBreak(b) ||
      a.team.name.localeCompare(b.team.name),
  );
  const positions = new Map(ranked.map((row, index) => [row.team.id, index + 1]));
  const matchesOfficial =
    officialValid && ranked.every((row, index) => official.get(row.team.id) === index + 1);
  return { positions, source: matchesOfficial ? 'official' : 'calculated' };
}

/**
 * Builds the current Premier League table from finished fixtures.
 * Ordering: points, goal difference, goals scored, then team name. (The PL's further
 * tie-breakers — head-to-head etc. — are not modelled; see resolveThisSeasonPositions.)
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
