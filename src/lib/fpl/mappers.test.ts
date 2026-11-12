import { describe, expect, it } from 'vitest';
import { mapEntryHistory, mapEventStatus, mapGameweeks } from './mappers';
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
    average_entry_score: 0,
    highest_score: null,
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

describe('mapGameweeks averages', () => {
  it('keeps average and highest scores only once the deadline has passed', () => {
    const base = {
      name: 'GW',
      finished: false,
      data_checked: false,
      is_current: false,
      is_next: false,
      is_previous: false,
    };
    const [played, upcoming] = mapGameweeks(
      [
        {
          ...base,
          id: 10,
          deadline_time: '2026-11-06T18:30:00Z',
          finished: true,
          average_entry_score: 55,
          highest_score: 139,
        },
        {
          ...base,
          id: 11,
          deadline_time: '2026-11-21T11:00:00Z',
          average_entry_score: 0,
          highest_score: null,
        },
      ],
      Date.parse('2026-11-12T00:00:00Z'),
    );
    expect(played).toMatchObject({ averageScore: 55, highestScore: 139 });
    expect(upcoming).toMatchObject({ averageScore: null, highestScore: null });
  });
});

describe('mapEventStatus', () => {
  it('maps the real response shape (verified 12 Nov 2026)', () => {
    expect(
      mapEventStatus({
        status: [
          { bonus_added: true, date: '2026-11-06', event: 10, points: 'r' },
          { bonus_added: false, date: '2026-11-07', event: 10, points: 'l' },
          { bonus_added: false, date: '2026-11-08', event: 10, points: '' },
        ],
        leagues: 'Updated',
      }),
    ).toEqual({
      gameweek: 10,
      days: [
        { date: '2026-11-06', bonusAdded: true, points: 'done' },
        { date: '2026-11-07', bonusAdded: false, points: 'live' },
        { date: '2026-11-08', bonusAdded: false, points: 'not-started' },
      ],
      leagues: 'updated',
    });
  });

  it('recognises FPL updating its league tables', () => {
    expect(mapEventStatus({ status: [], leagues: 'Updating' })).toEqual({
      gameweek: null,
      days: [],
      leagues: 'updating',
    });
  });
});
