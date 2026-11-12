import { describe, expect, it } from 'vitest';
import { gameweekProgress, isFplUpdating } from './progress';
import type { EventStatus, Gameweek } from './types';

const gw = (status: Gameweek['status'], dataChecked = false): Gameweek => ({
  id: 11,
  name: 'Gameweek 11',
  deadline: '2026-11-21T11:00:00Z',
  status,
  dataChecked,
});

type Day = EventStatus['days'][number];
const day = (points: Day['points'], bonusAdded = false): Day => ({
  date: '2026-11-21',
  points,
  bonusAdded,
});
const status = (days: Day[], leagues: EventStatus['leagues'] = 'pending'): EventStatus => ({
  gameweek: 11,
  days,
  leagues,
});

describe('gameweekProgress', () => {
  it('is live while any match day is being scored', () => {
    expect(gameweekProgress(gw('live'), status([day('done', true), day('live')]))).toBe('live');
  });

  it('is in progress between match days', () => {
    expect(gameweekProgress(gw('live'), status([day('done', true), day('not-started')]))).toBe(
      'in-progress',
    );
  });

  it('distinguishes awaiting bonus from bonus added once all matches are done', () => {
    expect(gameweekProgress(gw('live'), status([day('done', true), day('done')]))).toBe(
      'awaiting-bonus',
    );
    expect(gameweekProgress(gw('finished'), status([day('done', true), day('done', true)]))).toBe(
      'bonus-added',
    );
  });

  it('reports FPL updating league tables first', () => {
    expect(gameweekProgress(gw('finished'), status([day('done', true)], 'updating'))).toBe(
      'tables-updating',
    );
    expect(isFplUpdating(status([], 'updating'))).toBe(true);
    expect(isFplUpdating(status([], 'updated'))).toBe(false);
    expect(isFplUpdating(undefined)).toBe(false);
  });

  it('adds nothing for final or upcoming gameweeks, other gameweeks, or missing status', () => {
    const done = status([day('done', true)], 'updated');
    expect(gameweekProgress(gw('finished', true), done)).toBeNull();
    expect(gameweekProgress(gw('upcoming'), done)).toBeNull();
    expect(gameweekProgress(gw('live'), { ...done, gameweek: 10 })).toBeNull();
    expect(gameweekProgress(gw('live'), null)).toBeNull();
  });
});
