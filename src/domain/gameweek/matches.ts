import { competitionRanks } from '@/domain/shared/math';
import type { Match, MatchStatEntry, MatchState, PlayerLive } from './types';

/** FPL bonus by BPS rank: 1st 3, 2nd 2, 3rd 1 (ties share a rank, "1224"). */
const BONUS_BY_RANK: Readonly<Record<number, number>> = { 1: 3, 2: 2, 3: 1 };

export function matchState(match: Match): MatchState {
  if (match.finished) return 'done';
  if (match.finishedProvisional) return 'done-provisional';
  if (match.started) return 'live';
  return 'upcoming';
}

/**
 * Bonus points from BPS, FPL style: the top three BPS scores get 3, 2 and 1. Tied players share
 * the higher reward and the next reward is skipped (two tied 1st → 3, 3, then 1 for 3rd; three
 * tied 1st → 3, 3, 3). BPS of both teams are ranked together.
 */
export function bonusFromBps(bps: readonly MatchStatEntry[]): MatchStatEntry[] {
  const ranks = competitionRanks(
    bps.map((b) => b.value),
    false,
  );
  return bps
    .map((b, i) => ({ playerId: b.playerId, value: BONUS_BY_RANK[ranks[i] ?? 0] ?? 0 }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface MatchBonus {
  bonus: MatchStatEntry[];
  /** Worked out from BPS because FPL has not listed bonus for this match yet. */
  projected: boolean;
}

/**
 * The match's bonus: FPL's own list when it has one (FPL fills it during play and after), else a
 * projection from BPS once the match has started. Upcoming matches have none.
 */
export function matchBonus(match: Match): MatchBonus {
  const official = match.stats.bonus;
  const listed = official ? [...official.home, ...official.away] : [];
  if (listed.length > 0) {
    return { bonus: [...listed].sort((a, b) => b.value - a.value), projected: false };
  }
  const bps = match.stats.bps;
  if (!match.started || !bps) return { bonus: [], projected: false };
  const projected = bonusFromBps([...bps.home, ...bps.away]);
  return { bonus: projected, projected: projected.length > 0 };
}

/**
 * Live points per player: FPL's live points plus projected bonus for matches where FPL has not
 * added bonus yet (FPL's own bonus is already inside its live points).
 */
export function livePlayerPoints(
  live: readonly PlayerLive[],
  matches: readonly Match[],
): Map<number, number> {
  const points = new Map(live.map((p) => [p.id, p.points] as const));
  for (const match of matches) {
    const { bonus, projected } = matchBonus(match);
    if (!projected) continue;
    for (const b of bonus) points.set(b.playerId, (points.get(b.playerId) ?? 0) + b.value);
  }
  return points;
}

/**
 * Teams whose gameweek is over: every one of their matches has finished (provisionally or
 * confirmed). Teams without a match this GW (blank) count as done.
 */
export function teamsDone(matches: readonly Match[], teamIds: Iterable<number>): Set<number> {
  const pending = new Set<number>();
  for (const m of matches) {
    if (m.finished || m.finishedProvisional) continue;
    pending.add(m.homeTeamId);
    pending.add(m.awayTeamId);
  }
  return new Set([...teamIds].filter((id) => !pending.has(id)));
}

/** Matches in display order: by kickoff, then id (unscheduled last). */
export function sortMatches(matches: readonly Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const ka = a.kickoff ?? '9999';
    const kb = b.kickoff ?? '9999';
    return ka === kb ? a.id - b.id : ka.localeCompare(kb);
  });
}

/** One of a team's matches in the gameweek, seen from that team's side. */
export interface TeamFixture {
  match: Match;
  state: MatchState;
  opponentTeamId: number;
  home: boolean;
}

/**
 * Each team's matches this GW in kickoff order (two in a double GW). Teams missing from the map
 * have no match (blank GW).
 */
export function fixturesByTeam(matches: readonly Match[]): Map<number, TeamFixture[]> {
  const byTeam = new Map<number, TeamFixture[]>();
  const add = (teamId: number, fixture: TeamFixture) => {
    const list = byTeam.get(teamId) ?? [];
    list.push(fixture);
    byTeam.set(teamId, list);
  };
  for (const match of sortMatches(matches)) {
    const state = matchState(match);
    add(match.homeTeamId, { match, state, opponentTeamId: match.awayTeamId, home: true });
    add(match.awayTeamId, { match, state, opponentTeamId: match.homeTeamId, home: false });
  }
  return byTeam;
}
