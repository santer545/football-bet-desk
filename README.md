# Football Bet Desk

A local-first web app for a football express-bet series. It turns the Markdown documents in
`../docs` into a browsable ledger: slips, leg-level settlement, a betting calendar, a research
library, and a fixture insight panel backed by football-data.org.

The UI is a dark "betting desk" built with React 19, TypeScript, Tailwind CSS 4, Zustand and
TanStack Query. Everything is client-side; there is no backend to deploy.

## Features

- **Daily express slate** вЂ” the first dashboard section builds one low-risk anchor and two value cards (combined odds 2.50-4.00) from today's fixtures, showing full form/H2H reasoning, model odds, join probability and pre-flight warnings. One click pre-fills the bet editor.
- **Dashboard** вЂ” daily slate, record, hit rate, ROI, leg hit rate, this-week pulse, pending slips and recent research.
- **Bets ledger** вЂ” filterable list of express cards, printable slip view, leg-by-leg settlement, quick "all won / all lost", Markdown/JSON export.
- **Calendar** вЂ” month grid with won/lost/pending markers, a selected-day breakdown, and current-week express ideas for future days.
- **Analyses** вЂ” Markdown research documents grouped by date, type filters, live Markdown rendering, linked bets, Markdown/JSON export.
- **Fixtures** вЂ” pulls the next 1/7/14 days from football-data.org, compares split form and H2H, produces a model lean, and can save it as an analysis or pre-fill a new bet.
- **Settings** вЂ” API token and base URL, connection test, default competitions, JSON backup/import, seed restore and clear-all.
- **Seed content** вЂ” 22 historical slips (31.8% win rate) and 14 analyses imported from the source documents, so the app is useful on first load.

## Getting started

```bash
cd app
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

### Connect football-data.org

1. Create a free token at <https://www.football-data.org/client/register>.
2. Open **Settings** in the app and paste it into **API token**.
3. Use **Test connection**, then **Save settings**.

The free plan allows 10 requests per minute and some competitions may be unavailable. The token is
stored in this browser's `localStorage` only and sent directly to the API host.

The daily slate requests the eight watchlist competitions (`PL`, `PD`, `SA`, `BL1`, `FL1`, `DED`,
`PPL`, `CL`) over roughly 15 months once per 30 minutes. Partial league failures are surfaced
without discarding the cards built from the remaining feeds.

You can also provide a build-time default:

```bash
cp .env.example .env.local
# VITE_FOOTBALL_API_KEY=your-token
```

Vite only exposes `VITE_*` variables to the client, so treat any value here as public.

## Scripts

| Command              | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Vite dev server                            |
| `npm run build`      | Type-check and production build to `dist/` |
| `npm run preview`    | Preview the production build               |
| `npm run typecheck`  | `tsc -b --noEmit`                          |
| `npm run lint`       | ESLint flat config                         |
| `npm test`           | Vitest + Testing Library (run once)        |
| `npm run test:watch` | Vitest watch mode                          |
| `npm run format`     | Prettier write                             |

## Data and persistence

- Database: `fbd:db:v1` in `localStorage` (bets + analyses).
- Settings: `fbd:settings` (token, base URL, favourite competitions).
- UI state: `fbd:ui` (sidebar preference only; toasts are ephemeral).

Because storage is per-browser, export a JSON backup before clearing site data or changing machines.
**Settings в†’ Data & backups** supports merge and replace imports with schema validation.

Seed slips live in `src/content/bets-seed.ts`; analyses are parsed from the Markdown files copied to
`src/assets/docs/` at startup. Use **Restore seed data** to return to that baseline.

## Deployment

The app is a static SPA. Build with `npm run build` and publish `dist/`.

- **Vercel**: `vercel.json` rewrites all routes to `index.html`.
- **Netlify**: `netlify.toml` sets the build command, publish directory, SPA redirect and security headers.
- **Other hosts**: serve `dist/` and rewrite unknown paths to `index.html` (`public/_redirects` is included for Netlify-style hosts).

No environment variables are required to build; the API token can be added at runtime.

## Architecture

Feature-first layout under `src/features/*` with a public `index.ts` per feature:

```text
src/
  app/          providers, routes, shell, 404
  components/   shared UI + feedback (button, card, modal, markdown, states)
  content/      seed bets and parsed docs
  features/     dashboard, bets, analyses, calendar, fixtures, settings
  lib/          localStorage repository, query client, query keys
  store/        Zustand UI and settings stores
  types/        Zod schemas and domain types
  utils/        formatting, stats, export, ids
```

Queries and mutations are encapsulated in feature `api/` hooks; components do not use raw query
keys. Server state is cached by TanStack Query, UI state by Zustand. Pages are route-level code
split.

## Notes and limitations

- This is a **form model**, not a guarantee or financial advice. Verify prices, line-ups and absences.
- Football-data.org enforces CORS and rate limits; errors are surfaced in the UI. The app uses a built-in proxy at `/api/football` by default (Vite dev proxy + Vercel/Netlify serverless functions). You can point **API base URL** to your own proxy if needed.
- There is no authentication, encryption or multi-device sync. Anyone with access to the browser profile can read the token.
- 18+. Gamble responsibly.


