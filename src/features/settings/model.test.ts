import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FDR,
  DEFAULT_LEAGUE,
  parseFdrSettings,
  parseLeagueSettings,
  parseUpdateMeta,
} from './model';

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
      gameweekWeights: DEFAULT_FDR.gameweekWeights,
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

  it('keeps valid gameweek weights and falls back when they do not sum to 10', () => {
    expect(parseFdrSettings({ gameweekWeights: [3, 2.5, 2, 1.5, 1] }).gameweekWeights).toEqual([
      3, 2.5, 2, 1.5, 1,
    ]);
    expect(parseFdrSettings({ gameweekWeights: [3, 3, 3, 3, 3] }).gameweekWeights).toEqual(
      DEFAULT_FDR.gameweekWeights,
    );
    expect(parseFdrSettings({ gameweekWeights: ['2', 2, 2, 2, 2] }).gameweekWeights).toEqual(
      DEFAULT_FDR.gameweekWeights,
    );
  });
});

describe('parseUpdateMeta', () => {
  it('reads Firestore timestamps and the editor', () => {
    const meta = parseUpdateMeta({
      updatedAt: { toDate: () => new Date('2026-11-12T03:00:00Z') },
      updatedBy: 'admin@example.com',
    });
    expect(meta.updatedAt?.toISOString()).toBe('2026-11-12T03:00:00.000Z');
    expect(meta.updatedBy).toBe('admin@example.com');
    expect(parseUpdateMeta(undefined)).toEqual({ updatedAt: null, updatedBy: null });
  });
});
