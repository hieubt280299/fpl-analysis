/**
 * Fixture Difficulty Rating (FDR) analysis — formula constants and defaults.
 *
 * The spreadsheet formula for a team row is:
 *   AVG = ROUND( (GW1*2.6 + GW2*2.3 + GW3*2.0 + GW4*1.7 + GW5*1.4)
 *              * (0.8 + 0.01*LastSeasonPos*wLast + 0.01*ThisSeasonPos*wThis), 1 )
 * where wLast + wThis = 1 (admin-adjustable, default 0.1 / 0.9). Lower AVG = easier run.
 *
 * ⚠️ Changing these changes every team's score. Update AGENT_GUIDE.md and src/domain/fdr/*.test.ts.
 */

/** Weight per upcoming gameweek, nearest first. Its length defines the window size. */
export const FDR_GAMEWEEK_WEIGHTS = [2.6, 2.3, 2.0, 1.7, 1.4] as const;
export const FDR_WINDOW_SIZE = FDR_GAMEWEEK_WEIGHTS.length;

export const FDR_BASE_MULTIPLIER = 0.8;
export const FDR_POSITION_COEFFICIENT = 0.01;

/** Default weight of last season's position; this season's weight is always `1 - lastSeasonWeight`. */
export const FDR_DEFAULT_LAST_SEASON_WEIGHT = 0.1;

/** Value used in the formula when a team has no fixture in a gameweek (blank GW). */
export const FDR_BLANK_GAMEWEEK_VALUE = 5;

/** Last-season position for teams with no entry (i.e. promoted teams), as in the original sheet. */
export const FDR_DEFAULT_LAST_SEASON_POSITION = 20;

/**
 * Final 2025/26 Premier League positions, keyed by FPL team `code` (stable across seasons,
 * unlike team `id`). Promoted clubs are omitted and fall back to FDR_DEFAULT_LAST_SEASON_POSITION.
 * Used until an admin saves `settings/fdr` in Firestore.
 */
export const DEFAULT_LAST_SEASON = {
  label: '2025/26',
  positions: {
    3: 1, // Arsenal
    43: 2, // Man City
    1: 3, // Man Utd
    7: 4, // Aston Villa
    14: 5, // Liverpool
    91: 6, // Bournemouth
    56: 7, // Sunderland
    36: 8, // Brighton
    94: 9, // Brentford
    8: 10, // Chelsea
    54: 11, // Fulham
    4: 12, // Newcastle
    11: 13, // Everton
    2: 14, // Leeds
    31: 15, // Crystal Palace
    17: 16, // Nott'm Forest
    6: 17, // Spurs
  } as Readonly<Record<number, number>>,
} as const;
