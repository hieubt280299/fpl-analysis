import { describe, expect, it } from 'vitest';
import { applyLiveScores, applyLiveStandings, type LiveStanding } from './liveScores';
import type { GameweekScore } from './types';

function score(gameweek: number, points: number, transferCost = 0): GameweekScore {
  return { gameweek, points, transferCost, benchPoints: 0, chip: null };
}

// Real data, 21 Nov 2026 during GW11: history still says 0 for GW11, standings say 4 / 550.
// Huy: earlier GWs net 550 (GW10: 44 − 4), GW11 hit −4 → 550 = 550 + 4 − 4.
const HUY = 5712963;
const huyHistory = [score(9, 510), score(10, 44, 4), score(11, 0, 4)];
const huyLive: LiveStanding = { eventPoints: 4, totalPoints: 550 };

describe('applyLiveStandings', () => {
  it('uses the live standings points for the current gameweek', () => {
    const out = applyLiveStandings({ [HUY]: huyHistory }, 11, new Map([[HUY, huyLive]]));
    expect(out[HUY]?.find((s) => s.gameweek === 11)).toEqual(score(11, 4, 4));
    expect(out[HUY]?.find((s) => s.gameweek === 10)).toEqual(score(10, 44, 4));
  });

  it('keeps history when the standings refer to another gameweek', () => {
    // Standings already moved on to GW12: total includes GW11 and GW12 → inconsistent for GW11.
    const live = { eventPoints: 2, totalPoints: 556 };
    const out = applyLiveStandings({ [HUY]: huyHistory }, 11, new Map([[HUY, live]]));
    expect(out[HUY]).toEqual(huyHistory);
  });

  it('keeps history for entries missing from the standings or without that gameweek', () => {
    const scores = { 1: [score(10, 60)], 2: [score(10, 50)] };
    const live = new Map([[2, { eventPoints: 9, totalPoints: 59 }]]);
    expect(applyLiveStandings(scores, 11, live)).toEqual(scores);
  });

  it('works for the first gameweek of the season', () => {
    const out = applyLiveStandings(
      { 7: [score(1, 0, 4)] },
      1,
      new Map([[7, { eventPoints: 30, totalPoints: 26 }]]),
    );
    expect(out[7]).toEqual([score(1, 30, 4)]);
  });

  it('does not mutate the input', () => {
    const scores = { [HUY]: huyHistory };
    applyLiveStandings(scores, 11, new Map([[HUY, huyLive]]));
    expect(huyHistory[2]?.points).toBe(0);
  });
});

describe('applyLiveScores', () => {
  const live = (points: number, benchPoints = 3, chip: string | null = null): GameweekScore => ({
    gameweek: 11,
    points,
    transferCost: 4,
    benchPoints,
    chip,
  });

  it("replaces the gameweek's score with the live one (points, bench and chip)", () => {
    const out = applyLiveScores({ [HUY]: huyHistory }, new Map([[HUY, live(13, 5, 'bboost')]]));
    expect(out[HUY]).toEqual([score(9, 510), score(10, 44, 4), live(13, 5, 'bboost')]);
  });

  it('adds the gameweek when the history does not have it yet, in gameweek order', () => {
    const out = applyLiveScores({ 1: [score(10, 60), score(12, 0)] }, new Map([[1, live(8)]]));
    expect(out[1]?.map((s) => s.gameweek)).toEqual([10, 11, 12]);
    expect(applyLiveScores({}, new Map([[2, live(8)]]))[2]).toEqual([live(8)]);
  });

  it('keeps entries without a live score and does not mutate the input', () => {
    const scores = { [HUY]: huyHistory, 1: [score(11, 20)] };
    const out = applyLiveScores(scores, new Map([[HUY, live(13)]]));
    expect(out[1]).toEqual([score(11, 20)]);
    expect(huyHistory[2]).toEqual(score(11, 0, 4));
  });
});
