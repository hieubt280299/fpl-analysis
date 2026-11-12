/**
 * Fixture Difficulty Rating (FDR) analysis — formula constants and defaults.
 *
 * The spreadsheet formula for a team row is:
 *   AVG = ROUND( (GW1*w1 + GW2*w2 + GW3*w3 + GW4*w4 + GW5*w5)
 *              * (0.8 + 0.01*LastSeasonPos*wLast + 0.01*ThisSeasonPos*wThis), 1 )
 * - w1..w5: admin-adjustable gameweek weights, must sum to 10 (default 2.6, 2.3, 2.0, 1.7, 1.4)
 * - wThis = 10% per finished gameweek (0% before GW1, 100% from GW10 on); wLast = 1 − wThis
 * Lower AVG = easier run.
 *
 * ⚠️ Changing these changes every team's score. Update AGENT_GUIDE.md and src/domain/fdr/*.test.ts.
 */

/** Number of upcoming gameweeks in the FDR window (fewer at the very end of the season). */
export const FDR_WINDOW_SIZE = 5;

/** Default weight per upcoming gameweek, nearest first (admin-adjustable). */
export const FDR_DEFAULT_GAMEWEEK_WEIGHTS: readonly number[] = [2.6, 2.3, 2.0, 1.7, 1.4];

/** Gameweek weights must always add up to exactly this. */
export const FDR_GAMEWEEK_WEIGHTS_TOTAL = 10;

export const FDR_BASE_MULTIPLIER = 0.8;
export const FDR_POSITION_COEFFICIENT = 0.01;

/**
 * This season's position weight grows by this much per finished gameweek (capped at 1);
 * last season's weight is the remainder. 0 finished → 0 / 1, 9 finished → 0.9 / 0.1.
 */
export const FDR_THIS_SEASON_WEIGHT_PER_GAMEWEEK = 0.1;

/** Value used in the formula when a team has no fixture in a gameweek (blank GW). */
export const FDR_BLANK_GAMEWEEK_VALUE = 6;

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
