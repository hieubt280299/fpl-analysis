import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FDR,
  DEFAULT_LEAGUE,
  parseCalendarSettings,
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
      lastSeasonLabel: '2026/27',
      lastSeasonPositions: { '3': 2, '7': 99, x: 4 },
    });
    expect(parsed).toEqual({
      gameweekWeights: DEFAULT_FDR.gameweekWeights,
      lastSeasonLabel: '2026/27',
      lastSeasonPositions: { 3: 2 },
    });
  });

  it('ignores a legacy stored lastSeasonWeight (position weights are automatic now)', () => {
    expect(parseFdrSettings({ lastSeasonWeight: 0.5 })).not.toHaveProperty('lastSeasonWeight');
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

describe('parseCalendarSettings', () => {
  it('keeps valid gameweek → month moves and drops the rest', () => {
    expect(
      parseCalendarSettings({
        season: '2026/27',
        gameweekMonths: { '1': '2026-09', '2': '2026-09', '40': '2026-09', '3': 'soon' },
      }),
    ).toEqual({ season: '2026/27', gameweekMonths: { 1: '2026-09', 2: '2026-09' } });
  });

  it('defaults to no moves', () => {
    expect(parseCalendarSettings(undefined)).toEqual({ season: null, gameweekMonths: {} });
  });
});
