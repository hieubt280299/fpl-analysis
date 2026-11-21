import { describe, expect, it } from 'vitest';
import type { Gameweek } from '@/domain/league';
import { currentGameweek, isAnyMatchLive } from './current';
import type { Match } from './types';

const gw = (id: number, status: Gameweek['status']): Gameweek => ({
  id,
  name: `Gameweek ${id}`,
  deadline: '2026-11-21T11:00:00Z',
  status,
  dataChecked: status === 'finished',
});

describe('currentGameweek', () => {
  it('is the latest gameweek whose deadline has passed', () => {
    expect(currentGameweek([gw(10, 'finished'), gw(11, 'live'), gw(12, 'upcoming')])?.id).toBe(11);
    expect(currentGameweek([gw(10, 'finished'), gw(11, 'upcoming')])?.id).toBe(10);
    expect(currentGameweek([gw(1, 'upcoming')])).toBeUndefined();
  });
});

describe('isAnyMatchLive', () => {
  const match = (overrides: Partial<Match>): Match => ({
    id: 1,
    gameweek: 11,
    kickoff: '2026-11-21T15:00:00Z',
    homeTeamId: 1,
    awayTeamId: 2,
    homeGoals: null,
    awayGoals: null,
    started: false,
    finished: false,
    finishedProvisional: false,
    minutes: 0,
    stats: {},
    ...overrides,
  });
  const at = (iso: string) => Date.parse(iso);

  it('is live from kickoff until FPL marks the match finished', () => {
    expect(isAnyMatchLive([match({})], at('2026-11-21T14:59:00Z'))).toBe(false);
    expect(isAnyMatchLive([match({})], at('2026-11-21T15:00:00Z'))).toBe(true);
    expect(isAnyMatchLive([match({ finishedProvisional: true })], at('2026-11-21T16:50:00Z'))).toBe(
      false,
    );
  });

  it('stops 150 minutes after kickoff even if FPL has not finished the match', () => {
    expect(isAnyMatchLive([match({})], at('2026-11-21T17:29:00Z'))).toBe(true);
    expect(isAnyMatchLive([match({})], at('2026-11-21T17:30:00Z'))).toBe(false);
  });

  it('ignores matches without a kickoff time', () => {
    expect(isAnyMatchLive([match({ kickoff: null })], at('2026-11-21T15:00:00Z'))).toBe(false);
  });
});
