import { describe, expect, it } from 'vitest';
import { seasonLabel, seasonLabels } from './season';

describe('season labels', () => {
  it('formats a season from its start year', () => {
    expect(seasonLabel(2026)).toBe('2026/27');
    expect(seasonLabel(2099)).toBe('2099/00');
  });

  it('derives the current and previous season from the GW1 deadline', () => {
    expect(seasonLabels('2026-08-21T17:30:00Z')).toEqual({
      current: '2026/27',
      previous: '2025/26',
    });
    expect(seasonLabels('not a date')).toBeNull();
  });
});
