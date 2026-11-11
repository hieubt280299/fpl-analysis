import { describe, expect, it } from 'vitest';
import { DEFAULT_FDR, DEFAULT_LEAGUE, parseFdrSettings, parseLeagueSettings } from './model';

describe('parseLeagueSettings', () => {
  it('returns defaults for a missing document', () => {
    expect(parseLeagueSettings(undefined)).toEqual(DEFAULT_LEAGUE);
  });

  it('keeps valid values and replaces invalid ones', () => {
    expect(parseLeagueSettings({ leagueId: 123, timeZone: 'Europe/London' })).toEqual({
      leagueId: 123,
      timeZone: 'Europe/London',
    });
    expect(parseLeagueSettings({ leagueId: -4, timeZone: 'Nowhere/Land' })).toEqual(DEFAULT_LEAGUE);
  });
});

describe('parseFdrSettings', () => {
  it('returns defaults for a missing document', () => {
    expect(parseFdrSettings(null)).toEqual(DEFAULT_FDR);
  });

  it('converts Firestore string map keys to team codes and drops invalid positions', () => {
    const parsed = parseFdrSettings({
      lastSeasonWeight: 0.25,
      lastSeasonLabel: '2026/27',
      lastSeasonPositions: { '3': 2, '7': 99, x: 4 },
    });
    expect(parsed).toEqual({
      lastSeasonWeight: 0.25,
      lastSeasonLabel: '2026/27',
      lastSeasonPositions: { 3: 2 },
    });
  });

  it('rejects weights outside 0–1', () => {
    expect(parseFdrSettings({ lastSeasonWeight: 1.5 }).lastSeasonWeight).toBe(
      DEFAULT_FDR.lastSeasonWeight,
    );
  });
});
