import { describe, expect, it } from 'vitest';
import {
  bonusFromBps,
  fixturesByTeam,
  livePlayerPoints,
  matchBonus,
  matchState,
  sortMatches,
  teamsDone,
} from './matches';
import type { Match, MatchStatEntry } from './types';

const e = (playerId: number, value: number): MatchStatEntry => ({ playerId, value });

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    gameweek: 11,
    kickoff: '2026-11-21T15:00:00Z',
    homeTeamId: 1,
    awayTeamId: 2,
    homeGoals: 0,
    awayGoals: 0,
    started: true,
    finished: false,
    finishedProvisional: false,
    minutes: 59,
    stats: {},
    ...overrides,
  };
}

// GW11 2026/27, real BPS at 59' (fixture 101): FPL gave 529 → 3, 611 → 2, 34 and 53 → 1.
const BPS_101 = {
  home: [e(611, 15), e(34, 13), e(53, 13), e(630, 11)],
  away: [e(529, 17), e(542, 11), e(613, 8)],
};

describe('bonusFromBps', () => {
  it('matches FPL when two players tie for 3rd (both get 1)', () => {
    expect(bonusFromBps([...BPS_101.home, ...BPS_101.away])).toEqual([
      e(529, 3),
      e(611, 2),
      e(34, 1),
      e(53, 1),
    ]);
  });

  it('matches FPL when two players tie for 2nd (both get 2, nobody gets 1)', () => {
    // Fixture 102 at 58': FPL gave 70 → 3, 68 and 79 → 2.
    expect(bonusFromBps([e(70, 28), e(68, 26), e(79, 26), e(60, 23), e(489, 8)])).toEqual([
      e(70, 3),
      e(68, 2),
      e(79, 2),
    ]);
  });

  it('gives 3, 3, 1 for a tie for 1st, and 3 to all of a three-way tie', () => {
    expect(bonusFromBps([e(1, 30), e(2, 30), e(3, 20), e(4, 10)])).toEqual([
      e(1, 3),
      e(2, 3),
      e(3, 1),
    ]);
    expect(bonusFromBps([e(1, 30), e(2, 30), e(3, 30), e(4, 10)])).toEqual([
      e(1, 3),
      e(2, 3),
      e(3, 3),
    ]);
  });
});

describe('matchBonus', () => {
  it("uses FPL's own bonus list when there is one", () => {
    const m = match({ stats: { bonus: { home: [e(481, 3)], away: [e(271, 2)] }, bps: BPS_101 } });
    expect(matchBonus(m)).toEqual({ bonus: [e(481, 3), e(271, 2)], projected: false });
  });

  it('projects bonus from BPS when FPL has not listed it', () => {
    const m = match({ stats: { bonus: { home: [], away: [] }, bps: BPS_101 } });
    expect(matchBonus(m).projected).toBe(true);
    expect(matchBonus(m).bonus[0]).toEqual(e(529, 3));
  });

  it('has no bonus before kickoff', () => {
    expect(matchBonus(match({ started: false, stats: { bps: BPS_101 } }))).toEqual({
      bonus: [],
      projected: false,
    });
  });
});

describe('livePlayerPoints', () => {
  it('adds projected bonus only where FPL has not added bonus', () => {
    const projected = match({ id: 1, stats: { bps: BPS_101 } });
    const official = match({
      id: 2,
      stats: { bonus: { home: [e(481, 3)], away: [] }, bps: { home: [e(481, 44)], away: [] } },
    });
    const points = livePlayerPoints(
      [
        { id: 529, minutes: 59, points: 2 },
        { id: 481, minutes: 90, points: 10 }, // FPL's 10 already includes the 3 bonus
        { id: 7, minutes: 0, points: 0 },
      ],
      [projected, official],
    );
    expect(points.get(529)).toBe(5);
    expect(points.get(481)).toBe(10);
    expect(points.get(7)).toBe(0);
  });
});

describe('matchState', () => {
  it('labels upcoming, live, provisional and confirmed matches', () => {
    expect(matchState(match({ started: false }))).toBe('upcoming');
    expect(matchState(match())).toBe('live');
    expect(matchState(match({ finishedProvisional: true }))).toBe('done-provisional');
    expect(matchState(match({ finishedProvisional: true, finished: true }))).toBe('done');
  });
});

describe('teamsDone', () => {
  it('counts a team as done when all its matches finished, or when it has none (blank)', () => {
    const matches = [
      match({ homeTeamId: 1, awayTeamId: 2, finishedProvisional: true }),
      match({ homeTeamId: 3, awayTeamId: 4 }),
      match({ homeTeamId: 1, awayTeamId: 5, started: false }), // team 1's double GW
    ];
    expect([...teamsDone(matches, [1, 2, 3, 4, 5, 6])].sort()).toEqual([2, 6]);
  });
});

describe('sortMatches', () => {
  it('orders by kickoff, then id, with unscheduled matches last', () => {
    const sorted = sortMatches([
      match({ id: 3, kickoff: null }),
      match({ id: 2, kickoff: '2026-11-21T15:00:00Z' }),
      match({ id: 1, kickoff: '2026-11-21T15:00:00Z' }),
      match({ id: 4, kickoff: '2026-11-21T12:30:00Z' }),
    ]);
    expect(sorted.map((m) => m.id)).toEqual([4, 1, 2, 3]);
  });
});

describe('fixturesByTeam', () => {
  it("lists each team's matches from its side, in kickoff order (double GW)", () => {
    const first = match({ id: 1, homeTeamId: 1, awayTeamId: 2, finishedProvisional: true });
    const second = match({
      id: 2,
      homeTeamId: 3,
      awayTeamId: 1,
      started: false,
      kickoff: '2026-11-24T20:00:00Z',
    });
    const byTeam = fixturesByTeam([second, first]);
    expect(byTeam.get(1)?.map((f) => [f.match.id, f.state, f.opponentTeamId, f.home])).toEqual([
      [1, 'done-provisional', 2, true],
      [2, 'upcoming', 3, false],
    ]);
    expect(byTeam.get(2)?.map((f) => [f.opponentTeamId, f.home])).toEqual([[1, false]]);
    expect(byTeam.has(4)).toBe(false); // blank GW
  });
});
