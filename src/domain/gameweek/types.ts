/** FPL position (`element_type`): 1 = GKP, 2 = DEF, 3 = MID, 4 = FWD. */
export type PlayerPosition = 1 | 2 | 3 | 4;

/** A Premier League player (FPL "element"). */
export interface Player {
  id: number;
  /** Short display name, e.g. "Salah". */
  webName: string;
  teamId: number;
  position: PlayerPosition;
}

/** A player's live numbers for one gameweek (`event/{gw}/live/`). */
export interface PlayerLive {
  id: number;
  minutes: number;
  /** FPL's live points, including any bonus FPL has already added. */
  points: number;
}

/** One player's value for a stat in a match, e.g. 2 goals. */
export interface MatchStatEntry {
  playerId: number;
  value: number;
}

export type MatchStatId =
  | 'goals_scored'
  | 'assists'
  | 'own_goals'
  | 'penalties_saved'
  | 'penalties_missed'
  | 'yellow_cards'
  | 'red_cards'
  | 'bonus'
  | 'bps';

export type MatchStats = Partial<
  Record<MatchStatId, { home: MatchStatEntry[]; away: MatchStatEntry[] }>
>;

/** A fixture with live score and stats (`fixtures/?event={gw}`). */
export interface Match {
  id: number;
  gameweek: number | null;
  kickoff: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  started: boolean;
  /** Result confirmed by FPL. */
  finished: boolean;
  /** Full time, before FPL confirms the result ("Done (P)"). */
  finishedProvisional: boolean;
  /** Minutes played so far (FPL `minutes`). */
  minutes: number;
  stats: MatchStats;
}

export type MatchState = 'upcoming' | 'live' | 'done-provisional' | 'done';

/** One of a manager's 15 picks (`entry/{id}/event/{gw}/picks/`). */
export interface Pick {
  playerId: number;
  /** Squad slot: 1–11 starting XI, 12–15 bench in priority order (12 = bench goalkeeper). */
  slot: number;
  position: PlayerPosition;
  isCaptain: boolean;
  isViceCaptain: boolean;
  /** FPL's multiplier: 0 bench, 1 playing, 2 captain, 3 Triple Captain. */
  multiplier: number;
}

export interface EntryPicks {
  entryId: number;
  /** Chip played this GW (`bboost`, `3xc`, `freehit`, `wildcard`, …) or null. */
  chip: string | null;
  picks: Pick[];
  /** Substitutions FPL has made (filled once FPL processes the GW). */
  automaticSubs: Array<{ in: number; out: number }>;
  /** Transfer hit for this GW, e.g. 4. */
  transferCost: number;
}

/** A pick after (projected) automatic substitutions and captaincy. */
export interface LineupPick {
  playerId: number;
  position: PlayerPosition;
  /** Counts for points this GW (starting XI after subs; all 15 with Bench Boost). */
  active: boolean;
  /** Points multiplier: 0 inactive, 1 active, 2 captain, 3 Triple Captain. */
  multiplier: number;
  /** Wears the armband (the vice-captain when the captain did not play). */
  isCaptain: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
}

export interface Lineup {
  entryId: number;
  chip: string | null;
  picks: LineupPick[];
  transferCost: number;
  /** Subs and captaincy are FPL's final ones (not a projection). */
  official: boolean;
}
