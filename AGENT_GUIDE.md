# AGENT_GUIDE — FPL Analysis

The single source of truth for **what this app must do** and **how code in this repo must be
written**. Read it fully before changing anything. If a change alters a rule below, update this file
in the same change.

---

## 1. Product

A web app with two features:

1. **Mini-league manager**: runs a monthly prize competition on top of an FPL classic league.
2. **Fixture Difficulty (FDR) analysis**: ranks Premier League teams by how easy their next five
   gameweeks are, reproducing the owner's spreadsheet formula exactly.

Anyone can view both. Only **admins** can change settings, choose participants, grant penalty-free
points or finalize months. All players are in Vietnam.

---

## 2. Business rules — Mini-league (do not change without the owner's approval)

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Each participant contributes **200 gold** per month (`LEAGUE_RULES.entryFee`). Pot = participants × 200.                                                                                                                                                                                                                                                                            |
| L2  | A **month** contains every gameweek (GW) whose **deadline** falls on a day in that calendar month, in the league **time zone** (`Asia/Ho_Chi_Minh`). Deadlines come from `bootstrap-static` `events[].deadline_time`. An admin may **move GWs to the previous/next month** (e.g. to join a month with too few GWs) — see L14.                                                       |
| L3  | **40 %** of the pot is the month prize; **60 %** is split **equally** across the month's GWs.                                                                                                                                                                                                                                                                                       |
| L4  | Every prize (each GW and the month) is split **winner : runner-up = 3 : 1**. The **winner amount is rounded to the nearest whole number** (half up) and the runner-up gets the rest: 112.5 / 37.5 → **113 / 37** (`splitPrize`). Tie shares (L9) are not rounded.                                                                                                                   |
| L5  | The league is configurable by an admin (default `758527`). Members and names come from `leagues-classic/{id}/standings/` (all pages).                                                                                                                                                                                                                                               |
| L6  | Not every member plays every month. An **admin explicitly picks** each month's participants.                                                                                                                                                                                                                                                                                        |
| L7  | **GW ranking uses GROSS points** (FPL `points`, before transfer hits) — so a player behind in the month still has a fair GW race. **Month ranking uses NET points**: sum of `points − hit charged` over the month (after L12). A missing GW counts as 0.                                                                                                                            |
| L8  | Ranking: **highest score**, then **fewest chips used** (in that GW / across the month's GWs; every chip counts, including Wildcard and Free Hit), then **most bench points** (`points_on_bench`, summed for the month).                                                                                                                                                             |
| L9  | Players still level after both tie-breakers **share a position** ("1224" ranking), and the prizes of every place they occupy are **pooled and split equally**. Example: 3 tied for 1st each get (winner + runner-up) ÷ 3.                                                                                                                                                           |
| L10 | Prizes are **provisional** while a GW is live or not yet `data_checked`; **final** once FPL confirms. Upcoming GWs award nothing. The month prize is shown provisionally as soon as its first GW starts (confirmed by the owner).                                                                                                                                                   |
| L11 | An admin may **finalize** a month once every GW is final (and FPL is reachable — never from cached data). This freezes inputs (GWs, scores, rules) in Firestore so results survive FPL's season reset and later rule changes. **Reopen** discards the snapshot. Admins see a **reminder** listing complete-but-open months (stronger once the season is over).                      |
| L12 | **Penalty-free points**: per month, an admin may give selected players an allowance (default 0) for the **month's first GW only**. Hit charged = `max(0, FPL hit − allowance)`; with 8 points −4 → 0 and −16 → −8. It changes the month total only (GW ranking ignores hits anyway).                                                                                                |
| L13 | The points table shows FPL-wide reference rows per GW: **FPL average** (`average_entry_score`, summed for the month) and **FPL highest** (`highest_score`). They never affect ranking or prizes.                                                                                                                                                                                    |
| L14 | **Moving GWs between months** (admin): on a month's page, _Edit gameweeks_ lets the admin take GWs from the previous/next month or give them back. The month's GWs must stay continuous (no gaps); finalized months can't change. Stored in `settings/calendar` for the current season only (GW ids repeat each season); only GWs that differ from their deadline month are stored. |
| L15 | **Only admins can sign in.** Any other Google account is signed out at once and shown "… is not an admin".                                                                                                                                                                                                                                                                          |
| L16 | Points table: GW columns show **gross** points with the hit underneath; the Month column shows the **net** total. Columns GW/Month are sortable (default: Month). Chips & Bench columns are hidden behind a small toggle. The Prizes table is always ordered by total prize (not sortable).                                                                                         |

Worked example (the original sheet, November 2026, GW10–12): 4 players → pot 800 → each GW 160
(120 / 40), month 320 (240 / 80). GW10 (gross): Quy 71 → 120, Hieu 61 → 40, An 59, Huy 44. Month (net): Huy 44 − 4 = 40.

## 3. Business rules — FDR analysis

| #   | Rule                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Columns: Rank, Team, Last season (final PL position), This season (current PL position), FDR for the next 5 GWs, AVG.                                                                                                                                                                                                                                        |
| F2  | FDR per fixture = official FPL difficulty (`team_h_difficulty` / `team_a_difficulty` from `/fixtures/`).                                                                                                                                                                                                                                                     |
| F3  | `AVG = ROUND((G1×w1 + G2×w2 + G3×w3 + G4×w4 + G5×w5) × (0.8 + 0.01×Last×wLast + 0.01×This×wThis), 1)`                                                                                                                                                                                                                                                        |
| F4  | **GW weights** `w1..w5` are admin-adjustable, each ≥ 0, and must **sum to 10** (default 2.6, 2.3, 2.0, 1.7, 1.4). **Position weights are automatic** (not editable): `wThis = min(1, 0.1 × finished GWs)` — 0% before GW1, +10% per finished GW, 100% from GW10 on — and `wLast = 1 − wThis`. The original sheet (made after GW9) used 0.1 / 0.9.            |
| F5  | Rounding is Excel `ROUND` (half away from zero, after normalising to 15 significant digits): `roundHalfAwayFromZero`.                                                                                                                                                                                                                                        |
| F6  | Default order: AVG ascending. **Rank** is Excel `RANK` on the rounded AVG (ties share a rank, the next rank is skipped). Teams with the same AVG are listed alphabetically.                                                                                                                                                                                  |
| F7  | **Last season** positions are admin-entered (hidden behind _Edit last season's table_; used once a year), keyed by FPL team **`code`**. Promoted teams default to **20**. The **season label is automatic** (from the GW1 deadline: 2026/27 season → last season 2025/26) and saved with the table; admins are prompted when a new season needs a new table. |
| F8  | **This season** = the official table FPL publishes in `bootstrap-static` `teams[].position`. If those positions are missing or not exactly 1..N, fall back to a table calculated from finished fixtures (points, goal difference, goals scored, then name). The page says which source is in use.                                                            |
| F9  | The window is **fixed**: the next GW whose deadline has not passed plus the following ones, **at most 5**. No navigation to past GWs or further ahead (future league positions can't be projected). Near the season end it shrinks (e.g. GW36–38) and uses the first weights only; after the last deadline the page shows an empty state.                    |
| F10 | **Double GW**: `FDR = 1 / (1/M1 + 1/M2)` (`1 / Σ 1/Mi` for 3+ fixtures), **rounded to 1 decimal** (3 & 5 → 1.875 → 1.9). **Blank GW**: `FDR = 6`.                                                                                                                                                                                                            |
| F11 | **Every column is sortable** (click header: ascending, click again: descending; ties fall back to AVG, then name). The page shows when the FPL data was last fetched and when the formula settings were last changed.                                                                                                                                        |

The test suite reproduces all 20 rows of the original sheet (`src/domain/fdr/fdr.test.ts`). It must
keep passing.

---

## 4. Architecture

```
React 19 + TypeScript (strict) + Vite 6 + Tailwind 3 + TanStack Query 5 + React Router 7
Hosting: Vercel (static SPA + one Vercel Function)       Data: Firebase Auth (Google) + Firestore
```

### 4.1 Folder structure and layering

```
api/
  fpl.ts                Vercel Function: allow-listed FPL proxy (also used by Vite in dev)
  _fpl.test.ts          its tests (leading "_" = not deployed as a function)
src/
  main.tsx              entry point
  app/                  shell: providers, browser cache (persistence.ts), router, layout, banners
  config/               business constants & defaults (pure data, no logic)
    league.ts             LEAGUE_RULES, DEFAULT_LEAGUE_SETTINGS
    fdr.ts                formula defaults, blank-GW value, 2025/26 seed table
  domain/               PURE business logic + unit tests. The heart of the app.
    shared/math.ts        Excel rounding, ranking helpers
    league/               months, prizes, ranking, monthStandings (incl. penalty-free)
    fdr/                  fdr formula/table, leagueTable, this-season position source
  lib/                  infrastructure adapters
    firebase/client.ts    Firebase init (optional: app runs read-only without it)
    fpl/                  FPL API: raw types, client, mappers → domain types, query hooks
  features/             one folder per feature: api/ (Firestore), hooks/, components/, pages/, model.ts
    auth/                 Google sign-in, admin check, RequireAdmin
    settings/             settings/league + settings/fdr docs and the Settings page
    league/               month page, participants & penalty-free editor, finalize/reopen
    fdr/                  FDR page, sortable table, admin formula panel
  components/ui/        shared presentational primitives (no data fetching)
  utils/                formatting, error helpers
  styles/index.css      Tailwind + table styles
vercel.json             build settings, SPA fallback rewrite, headers, function region (sin1)
firestore.rules         security rules (server-side source of truth for permissions)
firebase.json           Firestore rules/indexes deploy + local emulators only (no Firebase Hosting)
```

**Dependency direction (enforced by ESLint for `domain/`):**
`app → features → (lib, components, utils) → domain → config`

- `domain/` imports only `config/` and other `domain/` files. **No React, Firebase, TanStack,
  `lib`, `features`, or `components`.** Every domain function is pure and deterministic. Pass the
  current time in instead of reading it.
- `lib/fpl/types.ts` (raw API shapes) must not leak outside `lib/fpl`. Convert them in
  `lib/fpl/mappers.ts`.
- Components never call `fetch` or Firestore directly. Use hooks in `features/*/hooks` or
  `lib/fpl/queries.ts`.
- Features import other features only through their `index.ts`. Only `auth` and `settings` are
  imported by other features.
- Pages are thin: they compose hooks + components; business decisions live in `domain/`.

### 4.2 Data sources and the FPL proxy

| Data                                                               | FPL path (via proxy)                                 | Hook                |
| ------------------------------------------------------------------ | ---------------------------------------------------- | ------------------- |
| GWs (deadlines, status), teams, official positions                 | `bootstrap-static/` (~1.8 MB, mapped & dropped)      | `useSeasonData`     |
| Current GW processing state (live / bonus added / tables updating) | `event-status/` (refreshed every minute)             | `useEventStatus`    |
| All fixtures (FDR + fallback PL table)                             | `fixtures/`                                          | `useFixtures`       |
| League members                                                     | `leagues-classic/{id}/standings/` + `page_standings` | `useLeagueMembers`  |
| Per-GW points, hits, bench, chips                                  | `entry/{id}/history/`                                | `useEntryHistories` |

Endpoint reference (verified against the live API): [fpl_api_overview.md](fpl_api_overview.md).

**CORS:** the FPL API cannot be called from the browser. The client calls the same-origin proxy
`GET /api/fpl?path=<fpl path>&<params>` (`fplProxyUrl` in `src/lib/fpl/client.ts`):

- production: the Vercel Function `api/fpl.ts`
- dev/preview: the **same** `handleFplRequest` runs inside Vite (plugin in `vite.config.ts`)

The proxy is GET-only, path- and query-allow-listed (`FPL_ROUTES`, `ALLOWED_QUERY_PARAMS`), and
sets `s-maxage` so Vercel's CDN caches responses. **Adding an FPL endpoint requires adding it to
`FPL_ROUTES`** (with a test in `api/_fpl.test.ts`). Files in `api/` that don't start with `_` become
public functions, so keep helpers and tests prefixed with `_`.

### 4.3 Firestore data model

| Path                        | Shape                                                                                                                                                                                                                                           | Write        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `admins/{lower-case email}` | any (existence = admin)                                                                                                                                                                                                                         | console only |
| `settings/league`           | `{ leagueId:int, timeZone:string, updatedAt, updatedBy }`                                                                                                                                                                                       | admin        |
| `settings/fdr`              | `{ gameweekWeights:number[5] (sum 10), lastSeasonLabel, lastSeasonPositions:{[teamCode]:1..20}, updatedAt, updatedBy }`                                                                                                                         | admin        |
| `settings/calendar`         | `{ season: "2026/27", gameweekMonths: {[gwId]: "YYYY-MM"}, updatedAt, updatedBy }`                                                                                                                                                              | admin        |
| `months/{YYYY-MM}`          | `{ monthKey, leagueId, participants:[{entryId,playerName,entryName}], penaltyFree:{[entryId]:points}, status:'open'\|'finalized', snapshot:null\|{finalizedAt, gameweeks[], scores:{[entryId]:GameweekScore[]}, rules}, updatedAt, updatedBy }` | admin        |

- Reads are public. Writes require a verified-email user listed in `admins` **and** pass the schema
  checks in `firestore.rules`. If you add a field, update the rule's `hasOnly([...])` list and
  validation, then redeploy rules (`npm run deploy:rules`).
- `updatedAt` must be `serverTimestamp()` and `updatedBy` the caller's lower-case email (the rules
  check both). Show `updatedBy` (an email) to admins only.
- Firestore docs are parsed tolerantly (`features/*/model.ts`): invalid fields fall back to defaults.
  Never trust stored data shapes without parsing.
- Writes replace whole docs (`setDoc`). Strip `undefined` before writing (Firestore rejects it).
  Map keys are strings in Firestore (team codes, entry ids); parsers convert them back to numbers.

### 4.4 State and caching

- Server state = TanStack Query. Keys live next to their hooks (`fplKeys`, `settingsKeys`,
  `monthKeys`). Mutations invalidate or `setQueryData`; no manual refetch chains.
- Stale times: bootstrap/fixtures 5 min, entry history 1 min, league 2 min, Firestore 1–5 min.
  Vercel's CDN may add up to `s-maxage` (60–300 s) on top.
- Client-error FPL responses (4xx) and Firestore `permission-denied` are not retried.
- **Browser cache:** FPL queries (`queryKey[0] === 'fpl'`) are persisted to `localStorage` for 7 days (`src/app/persistence.ts`; bump `CACHE_BUSTER` whenever mapped FPL shapes change). Firestore data is never cached there.
- **Stale data beats errors:** split every FPL query error with `splitQueryError` — `blocking` (no data → error state) vs `refresh` (cached data shown with `StaleDataNotice` and its timestamp). Never replace on-screen data with an error.
- **FPL updating:** `FplUpdatingBanner` (app shell) shows while `event-status` says `Updating` or FPL answers 503. Provisional GW badges use `gameweekProgress` for Live / In progress / Awaiting bonus / Bonus added / FPL updating.
- **Live auto-refresh:** while at least one match of the month's GWs is being played (`hasLiveMatch`: from kickoff until FPL marks it finished, max 150 min), the month page refetches entry histories and fixtures every 90 s (`LIVE_REFRESH_INTERVAL_MS`). No match on → no automatic refresh. Polling pauses while the browser tab is hidden. A `useNow(30 s)` clock notices kickoffs without any polling.
- A Firestore cache of FPL data was considered and rejected: needs a service-account secret in the function, `bootstrap-static` exceeds Firestore's 1 MB doc limit, and it only helps first-time visitors during short outages. League results are made durable by finalizing instead.

### 4.5 Deployment

- **Vercel** builds with `npm run build` and serves `dist/`. `vercel.json` rewrites every non-`/api/`
  path to `/index.html` (SPA fallback). The function region is `sin1` (Singapore, near the players).
- Vercel env vars: all `VITE_FIREBASE_*` keys from `.env.example` (they are compiled into the client
  at build time).
- Firebase is used only for Auth + Firestore, so the free **Spark** plan is enough. The Vercel domain
  must be added to Firebase Auth → Settings → **Authorized domains**.
- Firestore rules are deployed separately with `npm run deploy:rules`.

---

## 5. Coding standards

- TypeScript `strict` + `noUncheckedIndexedAccess`. No `any` (lint error). Use `import type` for
  types.
- Named exports only (no default exports, except config files).
- Money is a plain `number` in gold; never round inside the domain. Format only in the UI
  (`formatAmount`, at most 2 decimals).
- Dates: store/compare ISO UTC strings; convert to the league time zone only for grouping and
  display (`Intl.DateTimeFormat` with `timeZone`). No date library.
- UI: Tailwind utilities; shared table look via `.data-table`. Its selectors use `:where()` so cell
  utilities (FDR colours, winner highlights, alignment) always win. Keep it that way.
- **UI text:** short, simple English that every player in Vietnam understands. Explanations go behind an **(i) info button** (`Card info` / `PageHeader info`), never as always-visible sub-text. Say "Prize pool" (not "pot") and "players".
- Accessibility: real `<button>`/`<label>`/`<select>`, `aria-label` on icon-only inputs/buttons,
  `aria-sort` on sortable headers, visible focus rings.
- Responsive: the page never scrolls horizontally; wide tables scroll inside their card
  (`overflow-x-auto`).
- Every user-visible async state handles **pending, error (with retry) and empty**.
- Keep files focused (≈ < 250 lines). Prefer adding a component over growing a page.

## 6. Testing and Definition of Done

- **Any change in `src/domain/`, a `model.ts` parser, a sort/util function or `api/` needs unit
  tests** (Vitest, node env, `*.test.ts` next to the file; `_*.test.ts` inside `api/`). Use real
  numbers from the owner's sheets where possible.
- Before finishing, run `npm run check` (typecheck + lint + tests) and `npm run build`. All must pass
  with **zero** lint warnings. Run `npm run format` before committing.
- Do not weaken or delete the spreadsheet-reproduction tests to make a change pass. If the formula
  legitimately changes, update the expected values **and** this guide.
- Never commit `.env*` files, `.vercel/` or Firebase service-account keys.
- Git: line endings are LF (`.gitattributes`). Commit messages describe the user-visible change.

## 7. Commands

| Command                | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server incl. the FPL proxy (works without Firebase: read-only)   |
| `npm run check`        | typecheck + lint + unit tests                                             |
| `npm run build`        | production build to `dist/`                                               |
| `npm run emulators`    | Firebase Auth + Firestore emulators                                       |
| `npm run deploy`       | check → `vercel deploy --prod` (or push to the Git branch Vercel watches) |
| `npm run deploy:rules` | deploy `firestore.rules` and indexes                                      |

## 8. Known limitations and open decisions

- **Official position source**: FPL's `teams[].position` is undocumented. It matched the
  calculated table exactly in Nov 2026, but its update timing during a live GW is unknown. The
  calculated fallback ignores the PL's head-to-head tie-breakers.
- `event-status` codes (`points`: `l`/`r`/empty; `leagues`: `Updated`/`Updating`) are observed, not documented. Treat the derived labels as best-effort; Final still requires `data_checked`.
- Live GW points come from `entry/{id}/history/`, which FPL updates during the GW. Bonus points may
  lag until FPL finalizes them, which is why results stay provisional.
- The time zone stays configurable in Settings, but the owner confirmed `Asia/Ho_Chi_Minh` and it
  should not need changing.
