# Official Fantasy Premier League (FPL) APIs

The Fantasy Premier League (FPL) website and app run on publicly accessible REST endpoints that
return JSON. There is no official developer documentation and no API key; the endpoints are
undocumented and can change without notice. Most can be queried directly, but browsers can't call
them from another site (no CORS headers), so this app goes through its own proxy (`api/fpl.ts`).

_Every endpoint below was called and checked on 12 Nov 2026 (season 2026/27, after GW10)._

---

## Core FPL endpoints

### 1. General bootstrap data (main static feed)

- **URL:** `https://fantasy.premierleague.com/api/bootstrap-static/` (~1.8 MB)
- **Contents:**
  - `elements`: all players (672) with price (`now_cost`), `total_points`, `form`, `ict_index`,
    `expected_goals`, `expected_assists`, and availability (`status`,
    `chance_of_playing_next_round`, `news`).
  - `teams`: the 20 clubs: `id` (changes every season), `code` (stable across seasons), names,
    and **`position`**, the current league position. See the table section below for which other
    team fields are filled in.
  - `events`: all 38 gameweeks: `deadline_time`, `finished`, `data_checked`,
    `average_entry_score`, `highest_score`, `is_current` / `is_next`, chip usage.
  - `element_types`: positions (Goalkeeper, Defender, Midfielder, Forward).
  - Also: `phases` (FPL's own monthly phases, e.g. November = GW10–12), `chips`,
    `game_settings`, `game_config`, `element_stats`, `total_players`.

### 2. Fixtures

- **URL:** `https://fantasy.premierleague.com/api/fixtures/`
- **Query parameters:** optional `?event={gameweek}` (that gameweek's 10 fixtures) or `?future=1`
  (only unplayed fixtures).
- **Contents:** all 380 matches with kickoff times, home/away fixture difficulty
  (`team_h_difficulty`, `team_a_difficulty`), scores, `finished` / `finished_provisional`, and
  match stats (goals, assists, own goals, penalties saved/missed, cards, saves, `bonus`, `bps`,
  `defensive_contribution`).

### 3. Player details

- **URL:** `https://fantasy.premierleague.com/api/element-summary/{player_id}/`
- **Contents:** `history` (this season, per gameweek), `history_past` (past season summaries) and
  `fixtures` (upcoming).

### 4. Live gameweek data

- **URL:** `https://fantasy.premierleague.com/api/event/{gameweek_id}/live/`
- **Contents:** `elements`: every player's live stats for the gameweek plus `explain` (how their
  points were scored).

### 5. Gameweek processing status

- **URL:** `https://fantasy.premierleague.com/api/event-status/`
- **Contents:** for the current gameweek, one entry per match day (`bonus_added`, `points`:
  `"l"` = live, `"r"` = done, `""` = not started) and `leagues` (`"Updated"` or `"Updating"`).

### 6. Manager and league data

- **Manager summary:** `https://fantasy.premierleague.com/api/entry/{manager_id}/`
- **Manager history:** `https://fantasy.premierleague.com/api/entry/{manager_id}/history/`:
  per-gameweek points, transfer hits (`event_transfers_cost`), bench points, rank, and chips
  played.
- **Manager team picks:** `https://fantasy.premierleague.com/api/entry/{manager_id}/event/{gameweek_id}/picks/`
  (`picks`, `active_chip`, `automatic_subs`, `entry_history`).
- **Manager transfers:** `https://fantasy.premierleague.com/api/entry/{manager_id}/transfers/`
- **Classic league standings:** `https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/`
  (paged with `?page_standings=n`; `event_total` is gross points, before transfer hits).
- **Head-to-head standings:** `https://fantasy.premierleague.com/api/leagues-h2h/{league_id}/standings/`
- **Head-to-head matches:** `https://fantasy.premierleague.com/api/leagues-h2h-matches/league/{league_id}/`
  (paged; `?event={gameweek}` filters one gameweek). Works without logging in.
- **Dream team:** `https://fantasy.premierleague.com/api/dream-team/{gameweek_id}/`
- **Login required:** `me/`, `my-team/{manager_id}/`. Without a login, `me/` returns
  `{"player": null}`.

### Availability

FPL answers `503` ("The game is being updated") for an hour or two around deadlines and after
each gameweek, and resets every summer, removing the previous season's history.

---

## Premier League table availability

The `teams` array in `/api/bootstrap-static/` **does** include the current league position
(`position`). After GW10 it matched a table calculated from results exactly.

It does **not** include the other table statistics:

- `played`, `win`, `draw`, `loss` and `points` exist but are always `0` (FPL doesn't fill them in).
- There are no goals-for, goals-against or goal-difference fields.
- Of the strength fields, only `strength_overall_home` and `strength_overall_away` are filled in.
  `strength` and the attack/defence strengths are `null` or `0`.

### Options to display the PL table

1. **Positions from FPL:** `teams[].position`. This is what this app uses.
2. **Calculate from fixtures:** use finished matches from `/api/fixtures/` (`finished`, or
   `finished_provisional` for results about an hour sooner), with `team_h_score` and
   `team_a_score`, to compute points, goal difference and standings. This app uses this as a
   fallback, and for the W/D/L/GD tooltip.
3. **External football APIs:** football-data.org (free tier, API key required), API-Football or
   TheSportsDB. These weren't tested here because they need keys.
