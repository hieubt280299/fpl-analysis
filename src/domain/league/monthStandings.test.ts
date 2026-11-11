import { describe, expect, it } from 'vitest';
import { LEAGUE_RULES } from '@/config/league';
import { computeMonthStandings } from './monthStandings';
import type { Gameweek, GameweekScore, Participant } from './types';

const participants: Participant[] = [
  { entryId: 1, playerName: 'Quy Nguyen', entryName: 'NCQ21' },
  { entryId: 2, playerName: 'Hieu Bui', entryName: 'Lukas FC' },
  { entryId: 3, playerName: 'An Trần', entryName: 'gobi' },
  { entryId: 4, playerName: 'Huy Pham', entryName: 'HuyJP' },
];

function gw(id: number, status: Gameweek['status'], dataChecked = status === 'finished'): Gameweek {
  return { id, name: `Gameweek ${id}`, deadline: '2026-11-06T18:30:00Z', status, dataChecked };
}

function score(
  gameweek: number,
  points: number,
  extra: Partial<GameweekScore> = {},
): GameweekScore {
  return { gameweek, points, transferCost: 0, benchPoints: 0, chip: null, ...extra };
}

describe('computeMonthStandings', () => {
  it('reproduces the November sheet after GW10', () => {
    const standings = computeMonthStandings({
      gameweeks: [gw(10, 'finished'), gw(11, 'upcoming'), gw(12, 'upcoming')],
      participants,
      scores: {
        1: [score(10, 71)],
        2: [score(10, 61)],
        3: [score(10, 59)],
        4: [score(10, 44, { transferCost: 4 })],
      },
      rules: LEAGUE_RULES,
    });

    expect(standings.prizes.pot).toBe(800);
    expect(standings.monthState).toBe('provisional');
    expect(standings.columns.map((c) => c.state)).toEqual(['final', 'pending', 'pending']);

    const byName = Object.fromEntries(standings.rows.map((r) => [r.participant.playerName, r]));
    expect(byName['Huy Pham']?.gameweeks[10]?.net).toBe(40);
    expect(byName['Huy Pham']?.month.points).toBe(40);
    expect(byName['Huy Pham']?.month.transferCost).toBe(4);

    expect(byName['Quy Nguyen']?.gameweeks[10]?.prize).toBe(120);
    expect(byName['Hieu Bui']?.gameweeks[10]?.prize).toBe(40);
    expect(byName['Quy Nguyen']?.gameweeks[11]?.net).toBeNull();

    // Month prize is shown provisionally while the month is in progress.
    expect(byName['Quy Nguyen']?.month.prize).toBe(240);
    expect(byName['Hieu Bui']?.month.prize).toBe(80);
    expect(byName['Quy Nguyen']?.totalPrize).toBe(360);

    expect(standings.rows.map((r) => r.participant.playerName)).toEqual([
      'Quy Nguyen',
      'Hieu Bui',
      'An Trần',
      'Huy Pham',
    ]);
    expect(standings.totalAwarded).toBe(160 + 320);
  });

  it('uses month chips and bench totals as tie-breakers', () => {
    const standings = computeMonthStandings({
      gameweeks: [gw(10, 'finished'), gw(11, 'finished')],
      participants: participants.slice(0, 2),
      scores: {
        1: [score(10, 60, { chip: 'bboost', benchPoints: 0 }), score(11, 40)],
        2: [score(10, 50), score(11, 50, { benchPoints: 2 })],
      },
      rules: LEAGUE_RULES,
    });
    // Both on 100 points; Hieu used no chips → wins the month.
    expect(standings.rows[0]?.participant.playerName).toBe('Hieu Bui');
    expect(standings.rows[0]?.month.position).toBe(1);
    expect(standings.monthState).toBe('final');
  });

  it('treats a missing gameweek score as zero', () => {
    const standings = computeMonthStandings({
      gameweeks: [gw(10, 'live')],
      participants: participants.slice(0, 2),
      scores: { 1: [score(10, 20)] },
      rules: LEAGUE_RULES,
    });
    const hieu = standings.rows.find((r) => r.participant.entryId === 2);
    expect(hieu?.gameweeks[10]?.net).toBe(0);
    expect(hieu?.gameweeks[10]?.score).toBeNull();
    expect(standings.columns[0]?.state).toBe('provisional');
  });

  it('awards nothing before the first deadline', () => {
    const standings = computeMonthStandings({
      gameweeks: [gw(11, 'upcoming'), gw(12, 'upcoming')],
      participants,
      scores: {},
      rules: LEAGUE_RULES,
    });
    expect(standings.monthState).toBe('pending');
    expect(standings.totalAwarded).toBe(0);
    expect(standings.rows.every((r) => r.month.position === null)).toBe(true);
  });
});
