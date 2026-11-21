import { describe, expect, it } from 'vitest';
import { mapLive, mapMatches, mapPicks, mapPlayers } from './gameweekMappers';
import type { FplFixture, FplPicksResponse } from './types';

describe('mapPlayers', () => {
  it('keeps GKP–FWD and drops other element types', () => {
    expect(
      mapPlayers([
        { id: 1, web_name: 'Raya', team: 1, element_type: 1 },
        { id: 700, web_name: 'Manager', team: 2, element_type: 5 },
      ]),
    ).toEqual([{ id: 1, webName: 'Raya', teamId: 1, position: 1 }]);
  });
});

describe('mapMatches', () => {
  // Shape of GW11 fixture 108 (Man City 1–1 Fulham, finished provisionally).
  const raw: FplFixture = {
    id: 108,
    event: 11,
    kickoff_time: '2026-11-21T12:30:00Z',
    finished: false,
    finished_provisional: true,
    started: true,
    minutes: 90,
    team_h: 15,
    team_a: 10,
    team_h_score: 1,
    team_a_score: 1,
    team_h_difficulty: 2,
    team_a_difficulty: 5,
    stats: [
      {
        identifier: 'goals_scored',
        a: [{ value: 1, element: 271 }],
        h: [{ value: 1, element: 481 }],
      },
      { identifier: 'bonus', a: [{ value: 2, element: 271 }], h: [{ value: 3, element: 481 }] },
      { identifier: 'defensive_contribution', a: [], h: [{ value: 9, element: 481 }] },
    ],
  };

  it('maps score, state and the stats the app shows', () => {
    const [match] = mapMatches([raw]);
    expect(match).toMatchObject({
      id: 108,
      homeTeamId: 15,
      awayTeamId: 10,
      homeGoals: 1,
      awayGoals: 1,
      started: true,
      finished: false,
      finishedProvisional: true,
      minutes: 90,
    });
    expect(match?.stats.goals_scored).toEqual({
      home: [{ playerId: 481, value: 1 }],
      away: [{ playerId: 271, value: 1 }],
    });
    expect(match?.stats.bonus?.home).toEqual([{ playerId: 481, value: 3 }]);
    expect(Object.keys(match?.stats ?? {})).toEqual(['goals_scored', 'bonus']);
  });

  it('tolerates fixtures without stats or minutes', () => {
    const [match] = mapMatches([{ ...raw, stats: undefined, minutes: undefined, started: null }]);
    expect(match).toMatchObject({ started: false, minutes: 0, stats: {} });
  });
});

describe('mapLive', () => {
  it('keeps minutes and live points', () => {
    expect(
      mapLive({ elements: [{ id: 481, stats: { minutes: 90, total_points: 10, bonus: 3 } }] }),
    ).toEqual([{ id: 481, minutes: 90, points: 10 }]);
  });
});

describe('mapPicks', () => {
  it('maps picks, chip, automatic subs and the hit', () => {
    const raw: FplPicksResponse = {
      active_chip: '3xc',
      automatic_subs: [{ element_in: 496, element_out: 166, event: 11 }],
      entry_history: { event_transfers_cost: 4 },
      picks: [
        {
          element: 411,
          position: 10,
          multiplier: 3,
          is_captain: true,
          is_vice_captain: false,
          element_type: 4,
        },
        {
          element: 496,
          position: 12,
          multiplier: 0,
          is_captain: false,
          is_vice_captain: false,
          element_type: 1,
        },
      ],
    };
    expect(mapPicks(5227097, raw)).toEqual({
      entryId: 5227097,
      chip: '3xc',
      transferCost: 4,
      automaticSubs: [{ in: 496, out: 166 }],
      picks: [
        {
          playerId: 411,
          slot: 10,
          position: 4,
          isCaptain: true,
          isViceCaptain: false,
          multiplier: 3,
        },
        {
          playerId: 496,
          slot: 12,
          position: 1,
          isCaptain: false,
          isViceCaptain: false,
          multiplier: 0,
        },
      ],
    });
  });
});
