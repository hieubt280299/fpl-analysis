import { describe, expect, it } from 'vitest';
import { computeImportance } from './importance';
import { ownershipMatrix } from './matrix';
import type { Lineup, LineupPick } from './types';

/** A lineup from [playerId, multiplier] pairs; multiplier 0 = on the bench. */
function lineup(entryId: number, picks: Array<[number, number]>): Lineup {
  return {
    entryId,
    chip: null,
    transferCost: 0,
    official: false,
    picks: picks.map(([playerId, multiplier]): LineupPick => ({
      playerId,
      position: 3,
      active: multiplier > 0,
      multiplier,
      isCaptain: multiplier >= 2,
      subbedIn: false,
      subbedOut: false,
    })),
  };
}

// Three managers. Haaland (10): A captain, B plays, C doesn't own.
// Salah (20): C captain only. Palmer (30): everyone plays. Saka (40): A only. Rice (50): B bench.
const A = lineup(1, [
  [10, 2],
  [30, 1],
  [40, 1],
]);
const B = lineup(2, [
  [10, 1],
  [30, 1],
  [50, 0],
]);
const C = lineup(3, [
  [20, 2],
  [30, 1],
]);
const POINTS = new Map([
  [10, 8],
  [20, 13],
  [30, 2],
  [40, 5],
  [50, 6],
]);

describe('computeImportance', () => {
  const [a, b, c] = computeImportance([A, B, C], POINTS, 3);

  it('ranks differentials by the gap to the average rival, then live points', () => {
    // A: Haaland 2 − (1+0)/2 = 1.5; Saka 1 − 0 = 1. Palmer gap 0 is neither.
    expect(a?.differentials.map((i) => [i.playerId, i.gap, i.swing])).toEqual([
      [10, 1.5, 12],
      [40, 1, 5],
    ]);
    // A's threat: Salah 0 − (0+2)/2 = −1.
    expect(a?.threats.map((i) => [i.playerId, i.gap, i.swing])).toEqual([[20, -1, -13]]);
  });

  it('counts captaincy and ignores benched players', () => {
    // B: Haaland 1 − (2+0)/2 = 0 → not listed. Rice is benched: not a differential.
    expect(b?.differentials).toEqual([]);
    expect(b?.threats.map((i) => [i.playerId, i.gap])).toEqual([
      [20, -1],
      [40, -0.5],
    ]);
    expect(c?.differentials.map((i) => [i.playerId, i.gap])).toEqual([[20, 2]]);
    expect(c?.threats.map((i) => i.playerId)).toEqual([10, 40]);
  });

  it('limits each list', () => {
    expect(computeImportance([A, B, C], POINTS, 1)[2]?.threats).toHaveLength(1);
  });

  it('has nothing to compare with a single manager', () => {
    expect(computeImportance([A], POINTS, 3)).toEqual([
      { entryId: 1, differentials: [], threats: [] },
    ]);
  });
});

describe('ownershipMatrix', () => {
  const rows = ownershipMatrix([A, B, C], POINTS);

  it('lists players counting for someone, by live points', () => {
    // Rice (50) is only on a bench → no row.
    expect(rows.map((r) => r.playerId)).toEqual([20, 10, 40, 30]);
  });

  it('shows the points each owner gets (captain ×2)', () => {
    const haaland = rows.find((r) => r.playerId === 10);
    expect(haaland?.cells).toEqual({
      1: { multiplier: 2, points: 16, isCaptain: true },
      2: { multiplier: 1, points: 8, isCaptain: false },
    });
    expect(haaland?.activeOwners).toBe(2);
  });

  it('keeps a bench cell (multiplier 0) for owners who benched a counting player', () => {
    const benched = lineup(4, [[10, 0]]);
    const row = ownershipMatrix([A, benched], POINTS).find((r) => r.playerId === 10);
    expect(row?.cells[4]).toEqual({ multiplier: 0, points: 0, isCaptain: false });
  });

  it('breaks equal points by the number of managers counting the player', () => {
    const tied = ownershipMatrix(
      [
        lineup(1, [[1, 1]]),
        lineup(2, [
          [2, 1],
          [1, 1],
        ]),
      ],
      new Map([
        [1, 4],
        [2, 4],
      ]),
    );
    expect(tied.map((r) => r.playerId)).toEqual([1, 2]);
  });
});
