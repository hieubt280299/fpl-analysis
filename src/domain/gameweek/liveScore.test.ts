import { describe, expect, it } from 'vitest';
import { buildLineup } from './lineup';
import { lineupContext, lineupScore } from './liveScore';
import type { EntryPicks, Match, Pick, PlayerPosition } from './types';

/** 3-4-3: GK 1 · DEF 2-4 · MID 5-8 · FWD 9-11; bench GK 12 · DEF 13 · MID 14 · FWD 15. */
const POSITIONS: PlayerPosition[] = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 3, 4];

function entry(overrides: Partial<EntryPicks> = {}): EntryPicks {
  const picks: Pick[] = POSITIONS.map((position, i) => ({
    playerId: i + 1,
    slot: i + 1,
    position,
    isCaptain: i + 1 === 9,
    isViceCaptain: i + 1 === 5,
    multiplier: i + 1 > 11 ? 0 : i + 1 === 9 ? 2 : 1,
  }));
  return { entryId: 100, chip: null, picks, automaticSubs: [], transferCost: 4, ...overrides };
}

function match(id: number, home: number, away: number, done: boolean): Match {
  return {
    id,
    gameweek: 12,
    kickoff: '2026-11-22T15:00:00Z',
    homeTeamId: home,
    awayTeamId: away,
    homeGoals: 0,
    awayGoals: 0,
    started: true,
    finished: false,
    finishedProvisional: done,
    minutes: done ? 90 : 60,
    stats: {},
  };
}

// Players 1–11 and 13 play for team A (1); 12, 14, 15 for team B (2). Team C (3) has no match.
const players = POSITIONS.map((_, i) => ({
  id: i + 1,
  teamId: [12, 14, 15].includes(i + 1) ? 2 : 1,
}));

describe('lineupContext', () => {
  it('collects minutes, teams and the teams whose matches are over (blank = over)', () => {
    const ctx = lineupContext({
      live: [
        { id: 6, minutes: 0, points: 0 },
        { id: 13, minutes: 90, points: 7 },
      ],
      matches: [match(1, 1, 4, true), match(2, 2, 5, false)],
      players,
      teamIds: [1, 2, 3, 4, 5],
      gameweekFinished: false,
    });
    expect([...ctx.doneTeams].sort()).toEqual([1, 3, 4]);
    expect(ctx.minutes.get(13)).toBe(90);
    expect(ctx.teamOf.get(14)).toBe(2);
  });
});

describe('lineupScore', () => {
  // Everyone played and scored 2, except: MID 6 did not play (team A is done), captain 9 scored
  // 10 and DEF 13 (first on the bench) scored 7.
  const special: Record<number, number> = { 6: 0, 9: 10, 13: 7 };
  const live = players.map((p) => ({
    id: p.id,
    minutes: p.id === 6 ? 0 : 90,
    points: special[p.id] ?? 2,
  }));
  const points = new Map(live.map((p) => [p.id, p.points] as const));
  const ctx = lineupContext({
    live,
    matches: [match(1, 1, 4, true), match(2, 2, 5, false)],
    players,
    teamIds: [1, 2, 3, 4, 5],
    gameweekFinished: false,
  });

  it('counts the projected sub, the captain, the hit, the bench and the chip', () => {
    const score = lineupScore(buildLineup(entry(), ctx), points, 12);
    // XI after the sub: 1-5, 7, 8, 10, 11 (9 × 2) + 9 (captain 10 × 2) + 13 (7) = 18 + 20 + 7.
    expect(score).toEqual({
      gameweek: 12,
      points: 45,
      transferCost: 4,
      // Bench after the sub: 6 (0), 12, 14, 15 (2 each).
      benchPoints: 6,
      chip: null,
    });
  });

  it('leaves nothing on the bench with Bench Boost', () => {
    const score = lineupScore(buildLineup(entry({ chip: 'bboost' }), ctx), points, 12);
    expect(score.benchPoints).toBe(0);
    expect(score.points).toBe(45 + 6);
    expect(score.chip).toBe('bboost');
  });
});
