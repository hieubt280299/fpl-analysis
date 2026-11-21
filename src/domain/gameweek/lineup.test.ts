import { describe, expect, it } from 'vitest';
import { buildLineup, lineupPoints, type LineupContext } from './lineup';
import type { EntryPicks, Lineup, Pick, PlayerPosition } from './types';

/**
 * Squad: slot = player id. 3-4-3: GK 1 · DEF 2-4 · MID 5-8 · FWD 9-11.
 * Bench: GK 12 · DEF 13 · MID 14 · FWD 15. Captain 9, vice-captain 5.
 * Every player has his own team (team id = player id) so "team done" is per player.
 */
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
  return { entryId: 100, chip: null, picks, automaticSubs: [], transferCost: 0, ...overrides };
}

/** played: minutes > 0. dnp: 0 minutes and the team is done. Others: match still to come. */
function ctx({
  played = [],
  dnp = [],
  gameweekFinished = false,
}: {
  played?: number[];
  dnp?: number[];
  gameweekFinished?: boolean;
}): LineupContext {
  const ids = Array.from({ length: 15 }, (_, i) => i + 1);
  return {
    minutes: new Map(played.map((id) => [id, 90] as const)),
    teamOf: new Map(ids.map((id) => [id, id] as const)),
    doneTeams: new Set([...played, ...dnp]),
    gameweekFinished,
  };
}

const activeIds = (l: Lineup) =>
  l.picks
    .filter((p) => p.active)
    .map((p) => p.playerId)
    .sort((a, b) => a - b);
const multiplierOf = (l: Lineup, id: number) => l.picks.find((p) => p.playerId === id)?.multiplier;
const XI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('buildLineup — projected automatic subs', () => {
  it('keeps the starting XI and captain while matches are still to come', () => {
    const lineup = buildLineup(entry(), ctx({}));
    expect(activeIds(lineup)).toEqual(XI);
    expect(multiplierOf(lineup, 9)).toBe(2);
    expect(lineup.official).toBe(false);
  });

  it('brings on the first bench player who played when a starter did not play', () => {
    const lineup = buildLineup(entry(), ctx({ dnp: [6], played: [13, 14] }));
    // DEF 13 is first on the bench and 4-3-3 is valid.
    expect(activeIds(lineup)).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13]);
    const sub = lineup.picks.find((p) => p.playerId === 13);
    expect(sub).toMatchObject({ active: true, subbedIn: true, multiplier: 1 });
    expect(lineup.picks.find((p) => p.playerId === 6)).toMatchObject({ subbedOut: true });
  });

  it('skips bench players who would break the formation (min 3 defenders)', () => {
    // DEF 2 out; DEF 13 did not play either, so MID 14 / FWD 15 would leave 2 defenders.
    const lineup = buildLineup(entry(), ctx({ dnp: [2, 13], played: [14, 15] }));
    expect(activeIds(lineup)).toEqual(XI);
  });

  it('skips bench players whose match is still to come, and certain non-players', () => {
    // FWD 11 out; DEF 13 has not played yet (match pending), MID 14 did not play → FWD 15.
    const lineup = buildLineup(entry(), ctx({ dnp: [11, 14], played: [15] }));
    expect(activeIds(lineup)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15]);
  });

  it('never goes above the maximum per position (max 3 forwards)', () => {
    // MID 7 out; only FWD 15 played, but 3-3-4 is not allowed.
    expect(activeIds(buildLineup(entry(), ctx({ dnp: [7, 13, 14], played: [15] })))).toEqual(XI);
  });

  it('only swaps goalkeepers with the bench goalkeeper', () => {
    expect(activeIds(buildLineup(entry(), ctx({ dnp: [1], played: [12, 13] })))).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(activeIds(buildLineup(entry(), ctx({ dnp: [1, 12], played: [13] })))).toEqual(XI);
  });

  it('gives the armband to the vice-captain when the captain did not play', () => {
    const lineup = buildLineup(entry(), ctx({ dnp: [9], played: [5] }));
    expect(multiplierOf(lineup, 5)).toBe(2);
    expect(lineup.picks.find((p) => p.playerId === 5)?.isCaptain).toBe(true);
    expect(multiplierOf(lineup, 9)).toBe(1); // still in the XI (no sub available), 0 points
  });

  it('keeps the vice-captain projected as captain while his match is still to come', () => {
    expect(multiplierOf(buildLineup(entry(), ctx({ dnp: [9] })), 5)).toBe(2);
  });

  it('gives nobody the armband when captain and vice-captain both did not play', () => {
    const lineup = buildLineup(entry(), ctx({ dnp: [9, 5] }));
    expect(lineup.picks.some((p) => p.isCaptain)).toBe(false);
  });

  it('triples the captain with Triple Captain', () => {
    expect(multiplierOf(buildLineup(entry({ chip: '3xc' }), ctx({})), 9)).toBe(3);
    expect(multiplierOf(buildLineup(entry({ chip: '3xc' }), ctx({ dnp: [9] })), 5)).toBe(3);
  });

  it('counts all 15 players with Bench Boost and makes no subs', () => {
    const lineup = buildLineup(entry({ chip: 'bboost' }), ctx({ dnp: [6], played: [13] }));
    expect(activeIds(lineup)).toHaveLength(15);
    expect(multiplierOf(lineup, 13)).toBe(1);
    expect(lineup.picks.some((p) => p.subbedIn || p.subbedOut)).toBe(false);
  });
});

describe('buildLineup — after FPL processes the GW', () => {
  it("uses FPL's automatic subs instead of the projection", () => {
    const lineup = buildLineup(
      entry({ automaticSubs: [{ in: 14, out: 6 }] }),
      ctx({ dnp: [6], played: [13, 14] }),
    );
    expect(lineup.official).toBe(true);
    expect(activeIds(lineup)).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14]);
  });

  it('keeps the XI when the GW is finished without subs', () => {
    const lineup = buildLineup(entry(), ctx({ dnp: [6], played: [13], gameweekFinished: true }));
    expect(lineup.official).toBe(true);
    expect(activeIds(lineup)).toEqual(XI);
  });
});

describe('lineupPoints', () => {
  it('sums points × multiplier (captain double, bench zero)', () => {
    const lineup = buildLineup(entry(), ctx({}));
    const points = new Map([
      [9, 10],
      [2, 6],
      [13, 8], // on the bench
    ]);
    expect(lineupPoints(lineup, points)).toBe(26);
  });
});
