import { describe, expect, it } from 'vitest';
import { mapEntryHistory, mapGameweeks } from './mappers';
import type { FplEvent } from './types';

describe('mapEntryHistory', () => {
  it('keeps gross points and the transfer hit separately, and attaches chips by gameweek', () => {
    const scores = mapEntryHistory({
      current: [
        {
          event: 9,
          points: 66,
          total_points: 510,
          event_transfers: 0,
          event_transfers_cost: 0,
          points_on_bench: 13,
        },
        {
          event: 10,
          points: 44,
          total_points: 550,
          event_transfers: 2,
          event_transfers_cost: 4,
          points_on_bench: 3,
        },
      ],
      chips: [
        { name: 'wildcard', time: '2026-09-03T05:56:38Z', event: 3 },
        { name: 'freehit', time: '2026-10-26T06:04:11Z', event: 9 },
      ],
    });
    expect(scores).toEqual([
      { gameweek: 9, points: 66, transferCost: 0, benchPoints: 13, chip: 'freehit' },
      { gameweek: 10, points: 44, transferCost: 4, benchPoints: 3, chip: null },
    ]);
  });
});

describe('mapGameweeks', () => {
  const base: FplEvent = {
    id: 1,
    name: 'Gameweek 1',
    deadline_time: '2026-11-06T18:30:00Z',
    finished: false,
    data_checked: false,
    is_current: false,
    is_next: false,
    is_previous: false,
  };
  const now = Date.parse('2026-11-10T00:00:00Z');

  it('derives status from FPL flags and the deadline', () => {
    const [finished, live, upcoming] = mapGameweeks(
      [
        { ...base, id: 1, finished: true, data_checked: true },
        { ...base, id: 2, deadline_time: '2026-11-08T11:00:00Z' },
        { ...base, id: 3, deadline_time: '2026-11-21T11:00:00Z' },
      ],
      now,
    );
    expect(finished).toMatchObject({ status: 'finished', dataChecked: true });
    expect(live?.status).toBe('live');
    expect(upcoming?.status).toBe('upcoming');
  });
});
