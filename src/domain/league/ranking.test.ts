import { describe, expect, it } from 'vitest';
import { rankWithPrizes, type RankingScore } from './ranking';

interface Entry extends RankingScore {
  name: string;
}

const PRIZES = [120, 40];

function entry(name: string, points: number, chipsUsed = 0, benchPoints = 0): Entry {
  return { name, points, chipsUsed, benchPoints };
}

function rank(entries: Entry[]) {
  return rankWithPrizes(
    entries,
    (e) => e,
    PRIZES,
    (a, b) => a.name.localeCompare(b.name),
  ).map((r) => ({ name: r.item.name, position: r.position, tieSize: r.tieSize, prize: r.prize }));
}

describe('rankWithPrizes', () => {
  it('awards winner and runner-up (GW10 from the sheet; Huy 44 − 4 hit = 40)', () => {
    expect(rank([entry('Huy', 40), entry('An', 59), entry('Hieu', 61), entry('Quy', 71)])).toEqual([
      { name: 'Quy', position: 1, tieSize: 1, prize: 120 },
      { name: 'Hieu', position: 2, tieSize: 1, prize: 40 },
      { name: 'An', position: 3, tieSize: 1, prize: 0 },
      { name: 'Huy', position: 4, tieSize: 1, prize: 0 },
    ]);
  });

  it('breaks a points tie by fewer chips used', () => {
    const result = rank([entry('A', 60, 1, 20), entry('B', 60, 0, 0)]);
    expect(result.map((r) => [r.name, r.position, r.prize])).toEqual([
      ['B', 1, 120],
      ['A', 2, 40],
    ]);
  });

  it('then breaks it by more bench points', () => {
    const result = rank([entry('A', 60, 0, 3), entry('B', 60, 0, 9)]);
    expect(result.map((r) => [r.name, r.position, r.prize])).toEqual([
      ['B', 1, 120],
      ['A', 2, 40],
    ]);
  });

  it('splits winner + runner-up prizes equally when three players tie for first', () => {
    const result = rank([entry('A', 60), entry('B', 60), entry('C', 60), entry('D', 50)]);
    for (const r of result.slice(0, 3)) {
      expect(r.position).toBe(1);
      expect(r.tieSize).toBe(3);
      expect(r.prize).toBeCloseTo(160 / 3, 10);
    }
    expect(result[3]).toEqual({ name: 'D', position: 4, tieSize: 1, prize: 0 });
  });

  it('splits only the runner-up prize when players tie for second', () => {
    const result = rank([entry('A', 70), entry('B', 60), entry('C', 60)]);
    expect(result.map((r) => [r.name, r.position, r.prize])).toEqual([
      ['A', 1, 120],
      ['B', 2, 20],
      ['C', 2, 20],
    ]);
  });

  it('splits both prizes across everyone when all four tie', () => {
    const result = rank([entry('A', 50), entry('B', 50), entry('C', 50), entry('D', 50)]);
    expect(result.every((r) => r.position === 1 && r.prize === 40)).toBe(true);
  });

  it('is not a tie when only the points match', () => {
    const result = rank([entry('A', 50, 1, 5), entry('B', 50, 1, 4), entry('C', 50, 0, 0)]);
    expect(result.map((r) => [r.name, r.position])).toEqual([
      ['C', 1],
      ['A', 2],
      ['B', 3],
    ]);
  });
});
