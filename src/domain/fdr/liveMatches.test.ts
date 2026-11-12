import { describe, expect, it } from 'vitest';
import { hasLiveMatch, isMatchLive } from './liveMatches';
import type { Fixture } from './types';

const KICKOFF = '2026-11-21T12:30:00Z';
const at = (minutesAfterKickoff: number) => Date.parse(KICKOFF) + minutesAfterKickoff * 60_000;

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 1,
    gameweek: 11,
    kickoff: KICKOFF,
    homeTeamId: 1,
    awayTeamId: 2,
    homeGoals: null,
    awayGoals: null,
    homeDifficulty: 3,
    awayDifficulty: 3,
    finished: false,
    ...overrides,
  };
}

describe('isMatchLive', () => {
  it('is live from kickoff until the match is finished', () => {
    expect(isMatchLive(fixture(), at(-1))).toBe(false);
    expect(isMatchLive(fixture(), at(0))).toBe(true);
    expect(isMatchLive(fixture(), at(95))).toBe(true);
    expect(isMatchLive(fixture({ finished: true }), at(95))).toBe(false);
  });

  it('stops after 150 minutes even if FPL has not marked it finished', () => {
    expect(isMatchLive(fixture(), at(149))).toBe(true);
    expect(isMatchLive(fixture(), at(150))).toBe(false);
  });

  it('ignores postponed matches', () => {
    expect(isMatchLive(fixture({ kickoff: null }), at(10))).toBe(false);
  });
});

describe('hasLiveMatch', () => {
  const fixtures = [
    fixture({ id: 1, gameweek: 11 }),
    fixture({ id: 2, gameweek: 12, kickoff: '2026-11-28T15:00:00Z' }),
  ];

  it('only looks at the given gameweeks', () => {
    expect(hasLiveMatch(fixtures, [11, 12], at(30))).toBe(true);
    expect(hasLiveMatch(fixtures, [12], at(30))).toBe(false);
    expect(hasLiveMatch(fixtures, [], at(30))).toBe(false);
  });

  it('is false between matches', () => {
    expect(hasLiveMatch(fixtures, [11, 12], at(200))).toBe(false);
  });
});
