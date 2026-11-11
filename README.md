# FPL Analysis

Two tools for a Fantasy Premier League group:

- **Mini-league**: monthly prize pot for selected members of an FPL classic league, with per-GW and
  monthly winners, tie-breakers, shared prizes for ties, and frozen month results.
- **Fixture difficulty**: teams ranked by a weighted 5-GW FDR score adjusted for last/this season's
  league position.

Rules, architecture and coding constraints: see [AGENT_GUIDE.md](AGENT_GUIDE.md).

## Quick start (no Firebase needed)

```bash
npm install
npm run dev        # http://localhost:5173
```

Without Firebase the app runs read-only with default settings: the FDR table works fully, and the
mini-league shows months but no saved participants.

## Firebase setup

1. Create a Firebase project. Enable **Authentication → Google** and **Firestore** (pick a region
   near your users, e.g. `asia-southeast1`). Upgrade to the **Blaze** plan; it's needed for the FPL
   proxy Cloud Function, and normal usage stays in the free tier.
2. Register a **Web app** and copy its config into `.env.local` (template: `.env.example`).
3. Create `.firebaserc` from `.firebaserc.example` with your project id, and install the CLI:
   `npm i -g firebase-tools && firebase login`.
4. Install function deps: `npm --prefix functions install`.
5. Deploy: `npm run deploy` (hosting + function + Firestore rules).
6. **Make yourself admin:** in the Firestore console create collection `admins` with a document
   whose **ID is your Google email in lower case** (fields don't matter, e.g. `role: "admin"`).
   Sign in on the site with that account.
7. As admin: **Settings** → set the league id (default 758527) and the time zone. **Mini-league** →
   _Choose participants_ for each month. **Fixture difficulty** → _Formula settings_ to adjust
   weights and last season's table.

### Local development with emulators

```bash
npm --prefix functions install
npm run emulators                      # auth :9099, firestore :8080, UI :4000
# in .env.local: VITE_USE_FIREBASE_EMULATORS=true, VITE_FIREBASE_PROJECT_ID=<id in .firebaserc>,
#                VITE_FIREBASE_API_KEY=<any non-empty value>, VITE_FIREBASE_AUTH_DOMAIN=localhost
npm run dev
```

Create the `admins/{email}` document in the emulator UI.

## Scripts

| Script           |                                           |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | dev server (FPL requests proxied by Vite) |
| `npm run check`  | typecheck + lint + unit tests             |
| `npm run build`  | production build                          |
| `npm run deploy` | check, build and `firebase deploy`        |

## Monthly admin workflow

1. At the start of a month, open **Mini-league → that month → Choose participants** (or _Copy_ last
   month's list) and save.
2. Standings and prizes update live from FPL; amounts in _italics_ are provisional.
3. When every GW of the month shows **Final**, click **Finalize month** to freeze the results.
