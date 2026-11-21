import { describe, expect, it } from 'vitest';
import { formatGap, formatSignedPoints, playerLabel } from './labels';
import type { Lookups } from '../hooks/useGameweekView';

describe('formatGap', () => {
  it('shows the gap as a signed percentage', () => {
    expect(formatGap(1.5)).toBe('+150%');
    expect(formatGap(-1 / 3)).toBe('−33%');
    expect(formatGap(0.001)).toBe('0%');
  });
});

describe('formatSignedPoints', () => {
  it('adds a sign and keeps at most one decimal', () => {
    expect(formatSignedPoints(12)).toBe('+12');
    expect(formatSignedPoints(-4.333)).toBe('−4.3');
    expect(formatSignedPoints(0.01)).toBe('0');
  });
});

describe('playerLabel', () => {
  const lookups: Lookups = {
    player: (id) => (id === 1 ? { id: 1, webName: 'Salah', teamId: 12, position: 3 } : undefined),
    teamFixtures: () => [],
    team: (id) =>
      id === 12 ? { id: 12, code: 14, name: 'Liverpool', shortName: 'LIV' } : undefined,
  };

  it('names the player and team, or falls back to the id', () => {
    expect(playerLabel(1, lookups)).toBe('Salah (LIV)');
    expect(playerLabel(99, lookups)).toBe('#99');
  });
});
