# Dashboardius

**Any data. Your metrics. One view.**

A dashboard product whose homepage is a dashboard. [dashboardius.com](https://dashboardius.com)
does not show you a screenshot of Dashboardius — it hands you a working board and
lets you move things, remove things, add metrics that were hidden rather than
missing, ask for a change in one sentence, undo it, and reset when you have had
enough.

Part of the [Sneat](https://sneat.co) platform, and built on
[DataTug](https://datatug.app): DataTug gets and shapes the data, Dashboardius
presents it.

---

## Quick start

```bash
cd web
pnpm install
pnpm start          # http://localhost:4200
```

| Command | What it does |
| --- | --- |
| `pnpm start` | Dev server |
| `pnpm test` | Unit suite (Vitest, via the Angular builder) |
| `pnpm build` | Production build; prerenders the homepage to static HTML |
| `pnpm test:e2e` | Playwright, desktop + mobile; boots its own dev server |
| `pnpm generate:palette` | Regenerates the PrimeNG primary ramps from the brand hex |
| `pnpm deploy` | Manual Cloudflare deploy — CI is the normal route |

Node 22, pnpm 11.20.

---

## What is here

```
web/
  src/app/dashboard/model/     the board schema (DataTug's, reused verbatim)
  src/app/dashboard/state/     command → structured actions → reducer → board
  src/app/dashboard/ui/        board grid, card shell, card menu, command bar
  src/app/dashboard/charts/    Chart.js configuration, as pure functions
  src/app/auth/                Firebase authentication, lazily loaded
  src/app/theme/               design tokens for canvas, and the PrimeNG preset
  worker.js  wrangler.jsonc    the Cloudflare edge
  e2e/                         Playwright
docs/IMPLEMENTATION-RECORD.md  what was reused, what was built, what was skipped
```

---

## Architecture decisions

### The board is a DataTug board

`src/app/dashboard/model/board.model.ts` is DataTug's dashboard schema —
`IBoardDef`, `IBoardRowDef`, `IBoardCardDef`, `IWidgetDef` — copied field for
field from `datatug-apps`, which itself mirrors the canonical Go definition in
`datatug-core/pkg/datatug/boards.go`. Dashboardius invents no persistence model,
no project schema and no query schema.

What it adds is presentation: three widget *names* (`chart`, `stats`, `content`)
alongside DataTug's existing `SQL`. `IWidgetDef` is `{ name, data }` precisely so
that this is not a schema change.

The copy is a compromise, and a visible one. Those interfaces live inside
`datatug-apps` behind an unpublished TypeScript path alias, so there is no
package to import them from, and publishing one is a change to DataTug that this
first release deliberately does not make. The file carries a provenance comment
saying so. The right end state is a published `@datatug/board-models` consumed by
both products.

### `command → structured actions → board mutation`

Every mutation on the board — a drag, a menu item, a suggestion chip — goes
through one vocabulary of `DashboardAction`s and one pure reducer. That buys
three things at once: undo is just a stack of the boards the reducer returned, so
nothing has to know how to invert an action; the AI prompt is not a special case;
and the interesting half of the future feature already exists.

A suggestion chip resolves to a **known** action list with no model in the loop.
A free-form prompt will one day resolve to the same action list *via* a model.
The execution half is already the production half.

### The AI demo does not call a model, and says so

Clicking a suggestion types the sentence into the prompt, shows the structured
plan it resolved to, and applies it — through the same pipeline a model-generated
plan will use. Then it labels itself **"Scripted demo — no model was called"**.

Spending tokens re-deriving six known answers on a public page would be theatre;
claiming a model produced them would be a lie. A prompt that is not one of the
six gets an honest explanation rather than a plausible-looking answer.

### Charts are Chart.js; grids are pluggable

Charts use Chart.js through PrimeNG's `p-chart`, deferred so the library is not
in the initial bundle. All configuration lives in `charts/chart-options.ts` as
pure functions of (widget data, theme tokens), which is where the chart rules are
enforced: one y axis ever, colour keyed to the series *slot* so toggling a metric
never repaints the others, thin marks, hairline grid, no value printed on every
point. Every chart also ships a table twin — visible in the card menu, and always
present for screen readers and crawlers.

The query card renders its recordset through a **switchable grid engine**: a plain
accessible `<table>` (the default, and the floor — it works before hydration and
without JavaScript), **Tabulator** (DataTug's own grid, via `@sneat/datagrid`),
or **AG Grid**. Tabulator and AG Grid each arrive as a lazy chunk at the moment
they are selected. All three render cells through one shared
`cards/cell-format.ts`, so the engine is a rendering preference and never a change
in what a value means: a negative balance is the same red in all three.

Column types: text, number, amount, progress bar, date, boolean, and a gender
glyph paired with a readable label. Amount cells tint **red** below zero and
**amber** when positive but under a per-column `warnBelow` threshold — with the
sign and the value always present, so the tint is never the only signal.

### Authentication reuses Sneat's, not its UI

The same Firebase project (`sneat-eur3-1`), the same modular `firebase/auth` SDK
the Sneat libraries use, and the same same-origin redirect pattern as
noticeboard.cc: `authDomain` is `dashboardius.com` itself, and the Worker
reverse-proxies Firebase's `/__/auth/*` handler so `signInWithRedirect` stays
first-party. (The fleet's finding is that a cross-origin auth domain races
third-party storage partitioning on Safari/iOS.)

What is *not* reused is `@sneat/auth-ui`, whose login screens are built out of
Ionic components this PrimeNG application does not have. The Firebase SDK is
never in the initial bundle — it loads on an idle callback after first paint to
restore a session, and on demand when someone reaches for sign-in.

### Prerendered, not server-rendered

`outputMode: static` prerenders the homepage at build time, so Cloudflare serves
real HTML — the board, its card titles, the prose cards, the chart table twins —
with no server in the path. Hydration takes over with event replay, so a click
that lands before hydration finishes is not swallowed.

---

## Design

The look is an instrument panel drawn as an editorial data desk: warm paper by
day, graphite by night, hairline rules, one deep teal accent, and numbers allowed
to be the biggest thing on screen. No gradients, no glass, no glow, no
decorative grids.

Two colour systems that never mix:

- **Chrome** — `--brand` and the neutrals. UI only. Never a data mark.
- **Series** — `--series-1..8`, a categorical palette validated for colourblind
  separation against both the light and the dark card surface (worst adjacent
  ΔE 9.1 light / 8.4 dark, OKLab ×100). Data marks only.

Keeping them apart is what stops a chart colour reading as a button, and a button
reading as a series.

PrimeNG runs in **styled** mode with a Dashboardius preset
(`src/app/theme/brand-preset.ts`), following the fleet convention set by
gametable: eleven literal shades per scheme, generated at build time from one
brand hex by `scripts/generate-primeng-palette.mjs`. Surfaces, radii, focus ring
and type scale are re-pointed at the same CSS custom properties the hand-built
chrome uses — which is what keeps it from looking like an Aura demo.

### Performance

The homepage is prerendered, so first paint does not wait for JavaScript, and
every chart card reserves its height before it draws — measured cumulative layout
shift is **0**.

What ships when:

| Chunk | Raw | When it loads |
| --- | --- | --- |
| initial | ~827 kB (~185 kB transferred) | immediately — Angular, PrimeNG's styled runtime, CDK drag-drop, the board |
| Chart.js | ~208 kB | when the first chart scrolls into view (prefetched on idle) |
| Firebase auth | ~162 kB | on an idle callback after first paint, or on demand at sign-in |
| Tabulator | ~450 kB | only if a visitor switches the query card to it |
| AG Grid | ~1.2 MB | only if a visitor switches the query card to it |

The two grid libraries are the reason the engine switch is worth having as a
*deferred* choice rather than a bundled one: neither is downloaded by a visitor
who never opens that menu.

---

## Deployment

Cloudflare Workers with static assets, deployed by the shared
`sneat-co/cicd/.github/workflows/cf-deploy.yml` on every green push to `main`.
The Worker (`web/worker.js`) does two things and no more: reverse-proxies
Firebase's auth handler, and serves the prerendered app under one canonical host.

### What you need to provide

| Thing | Where | Status |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | sneat-co **org secret** | already exists — used by every Sneat site |
| `CLOUDFLARE_ACCOUNT_ID` | sneat-co **org variable** | already exists |
| `dashboardius.com` custom domain on the `dashboardius` Worker | attached automatically | **done** — the org `CLOUDFLARE_API_TOKEN` turned out to carry `Zone:DNS:Edit`, so the first CI deploy created the custom domain and its DNS record itself. No dashboard step was needed. |
| `dashboardius.com` in Firebase **authorised domains** | Firebase console → Authentication → Settings | **needed** for sign-in |
| `https://dashboardius.com/__/auth/handler` in the Google OAuth **authorised redirect URIs** | Google Cloud console → Credentials | **needed** for Google sign-in |
| `PRIMEUI_LICENSE` | org or repo secret | **optional but recommended** — PrimeNG 21+ ships under the PrimeUI licence and injects a "license not configured" banner without a key. Sneat is inside the free Community tier; the key still has to exist. Without it the build succeeds and the banner shows. |
| A `dashboardius` Web App registered in the `sneat-eur3-1` Firebase project | Firebase console | optional — only matters if Dashboardius ever turns on Firebase Analytics, which it deliberately does not. See `src/environments/environment.ts`. |

The site is live at **https://dashboardius.com**. Everything works there except
Google sign-in, which needs the two Firebase/Google console entries above — until
they exist, the app falls back to the Firebase-hosted auth domain rather than
failing.

---

## Not built, on purpose

Real dashboard persistence, saving to GitHub, repo selection, production
analytics, DataTug query authoring, dashboard permissions, collaboration,
real-time multi-user editing, production AI dashboard editing, comprehensive
sharing, embedding, billing.

Save, Share and Save to GitHub appear in the UI because they are where the
product is going — and each one explains that it is not built rather than
showing a success for something that did not happen.
