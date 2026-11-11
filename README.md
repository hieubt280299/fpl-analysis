# FPL Analysis

Two tools for a Fantasy Premier League group:

- **Mini-league**: monthly prize pot for selected members of an FPL classic league, with per-GW and
  monthly winners, tie-breakers, shared prizes for ties, penalty-free transfer points and frozen
  month results.
- **Fixture difficulty**: teams ranked by a weighted 5-GW FDR score adjusted for last/this season's
  league position, with sortable columns and admin-tunable weights.

Rules, architecture and coding constraints: see [AGENT_GUIDE.md](AGENT_GUIDE.md).

## Quick start (no Firebase needed)

```bash
npm install
npm run dev        # http://localhost:5173
```

Without Firebase the app runs read-only with default settings: the FDR table works fully, and the
mini-league shows months but no saved participants.

## Firebase setup (Auth + Firestore only, free Spark plan)

1. Create a Firebase project. Enable **Authentication → Google** and **Firestore** (region
   `asia-southeast1` is closest to Vietnam).
2. Register a **Web app** and copy its config into `.env.local` (template: `.env.example`).
3. Deploy the security rules: create `.firebaserc` from `.firebaserc.example` with your project id,
   then `npm i -g firebase-tools && firebase login && npm run deploy:rules`.
4. **Make yourself admin:** in the Firestore console create collection `admins` with a document
   whose **ID is your Google email in lower case** (fields don't matter, e.g. `role: "admin"`).

## Deploy to Vercel

1. Push this repo to GitHub/GitLab and **import it in Vercel** (framework preset: Vite; the settings
   in `vercel.json` are picked up automatically).
2. In Vercel → Project → Settings → **Environment Variables**, add every `VITE_FIREBASE_*` value from
   `.env.local`, then redeploy.
3. In Firebase → Authentication → Settings → **Authorized domains**, add your Vercel domain(s), e.g.
   `fpl-analysis.vercel.app`.
4. Every push to the production branch redeploys. Or deploy from your machine with
   `npm i -g vercel && npm run deploy`.

What gets deployed: the static app from `dist/` (every non-API route falls back to `index.html`) and
one function, `api/fpl.ts`, which proxies the FPL API (the browser can't call it directly).

## First-time admin setup

Sign in with your admin Google account, then:

1. **Settings** → check the league id (default 758527).
2. **Mini-league** → _Choose participants_ for the current month. Optionally set penalty-free
   points for the month's first GW.
3. **Fixture difficulty** → _Formula settings_ → check the GW weights (sum 10), the position weights
   and last season's table.

### Local development with emulators

```bash
npm run emulators                      # auth :9099, firestore :8080, UI :4000
# in .env.local: VITE_USE_FIREBASE_EMULATORS=true, VITE_FIREBASE_PROJECT_ID=<id in .firebaserc>,
#                VITE_FIREBASE_API_KEY=<any non-empty value>, VITE_FIREBASE_AUTH_DOMAIN=localhost
npm run dev
```

Create the `admins/{email}` document in the emulator UI.

## Scripts

| Script                 |                                             |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | dev server (includes the FPL proxy)         |
| `npm run check`        | typecheck + lint + unit tests               |
| `npm run build`        | production build                            |
| `npm run deploy`       | check, then `vercel deploy --prod`          |
| `npm run deploy:rules` | deploy Firestore security rules and indexes |

## Monthly admin workflow

1. At the start of a month, open **Mini-league → that month → Choose participants** (or _Copy_ last
   month's list), set any penalty-free points, and save.
2. Standings and prizes update live from FPL; amounts in _italics_ are provisional.
3. When every GW of the month shows **Final**, click **Finalize month** to freeze the results.
