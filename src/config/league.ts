/**
 * Mini-league business rules and defaults.
 *
 * ⚠️ Changing anything in LEAGUE_RULES changes payouts. Update AGENT_GUIDE.md and the tests in
 * src/domain/league/*.test.ts in the same change. Finalized months keep the rules they were
 * finalized with (stored in their snapshot), so changes only affect open months.
 */
export const LEAGUE_RULES = {
  /** Gold each participant contributes per month. */
  entryFee: 200,
  /** Share of the pot paid out as the monthly prize; the rest is split equally across gameweeks. */
  monthPoolShare: 0.4,
  /** Prize ratio by finishing position: winner : runner-up = 3 : 1. Applies to GW and month prizes. */
  prizeSplit: [3, 1],
} as const;

export const CURRENCY_LABEL = 'gold';

/** Used until an admin saves `settings/league` in Firestore. */
export const DEFAULT_LEAGUE_SETTINGS = {
  leagueId: 758527,
  /**
   * Time zone used to decide which calendar month a GW deadline falls in.
   * A Friday 18:30 UTC deadline on the 31st is still that month in London but the 1st of the next
   * month in Vietnam, so this matters at month boundaries.
   */
  timeZone: 'Asia/Ho_Chi_Minh',
} as const;

/** Time zones offered in the settings UI (any valid IANA zone is accepted). */
export const COMMON_TIME_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Europe/London',
  'UTC',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/New_York',
] as const;
