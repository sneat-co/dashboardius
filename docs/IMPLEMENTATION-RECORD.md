# Implementation record

What was reused, what was built for Dashboardius, what was deliberately skipped,
and the judgement calls behind each. Written at the end of the first
implementation session so the next person does not have to reverse-engineer the
reasoning from the diff.

---

## 1. Repository strategy

**Decision: one new repository, `sneat-co/dashboardius`, containing one web
surface.**

The alternatives considered were an app inside DataTug's Nx workspace
(`datatug-apps`), and a folder inside `sneat-apps`.

Reasons for a standalone repo:

- It matches how every recent Sneat product ships — `remindius`, `renewon`,
  `sourcer`, `communitycentrum`, `competios` are each their own repository with
  their own Cloudflare Worker and their own apex domain.
- Dashboardius has its own brand, its own domain and its own deploy cadence.
  Sharing a repo with DataTug would couple them.
- `datatug-apps` is an **Ionic** application on Nx. Dashboardius is a PrimeNG
  application. Putting them in one workspace would mean one lockfile carrying two
  UI libraries for no shared code, since (see §2) the reuse is a data schema, not
  components.
- The brief explicitly forbids large refactors of DataTug to accommodate
  Dashboardius. A separate repo makes that easy to honour.

Layout inside the repo is deliberately flat: `web/` holds the Angular app *and*
its Worker and wrangler config, so `cf-deploy.yml`'s `working-directory: web`
builds and deploys in one place. There is no `backend/` because Dashboardius has
no backend yet, and no `landings/` because the homepage *is* the landing page.

**Precedent followed:** `competios/frontend` — a standalone Angular + PrimeNG app,
not Nx, own pnpm lockfile, Vitest units, Playwright e2e, deployed by the shared
`sneat-co/cicd` Cloudflare workflow. That is the closest existing shape to this
brief and it is what this repo is modelled on.

---

## 2. Reused from DataTug

| What | Where it came from | How it is used |
| --- | --- | --- |
| **The board schema** — `IBoardDef`, `IBoardRowDef`, `IBoardCardDef`, `IWidgetDef` | `datatug-apps/libs/datatug/main/src/lib/models/definition/board/*.ts`, itself a mirror of `datatug-core/pkg/datatug/boards.go` | Copied field for field into `web/src/app/dashboard/model/board.model.ts`. The JSON a Dashboardius board produces is already a DataTug board. |
| **The SQL widget name and recordset shape** — `sqlWidgetName = 'SQL'`, `columns` / `rows` / `duration` | same, plus `dto/execute.ts`'s `IRecordsetResult` | The query card's data is DataTug's recordset shape, not a Dashboardius invention. |
| **The 12-column row layout** | DataTug's `IBoardCardDef.cols` ("how many of 12 available columns it can take") | The board grid is a 12-column CSS grid, and resize is a change to `cols`. |
| **Tabulator as the grid** | `@sneat/datagrid` wraps `tabulator-tables`; `datatug-apps` uses it for query results | Offered as a grid engine on the query card, so a Dashboardius grid and a DataTug table view feel like the same table. |

### Why the schema was copied rather than imported

`@sneat/datatug-main` is **not published to npm** — it is version `0.0.1`, has no
`publishConfig`, and is resolved inside `datatug-apps` by a TypeScript path alias
in `tsconfig.base.json`. There is no package to depend on, and the board
interfaces are not even re-exported from that library's `public_api.ts`.

Publishing them would be a change to DataTug, which this task is explicitly not
allowed to make. So the file carries a provenance comment naming the exact source
and the intended end state: a published `@datatug/board-models` consumed by both
products. **This is the one piece of duplication in the codebase and it is
deliberate, documented, and load-bearing** — if the schema is ever edited here
without being edited there, the compatibility claim quietly becomes false.

### What was NOT reused from DataTug, and why

- **Its board components** (`BoardComponent`, `BoardRowComponent`,
  `BoardCardComponent`, `BoardWidgetComponent`). They are Ionic
  (`ion-card`, `ion-row`, `ion-col`, `ion-segment`), and `BoardComponent.newCard()`
  is a stub whose mutation path is commented out. There is nothing to inherit but
  a UX that does not fit Dashboardius' focused dashboard experience.
- **Its chart components.** There are none — an exhaustive search of
  `datatug-apps` for `echarts|ngx-charts|chart.js|d3` returns zero matches.
- **Its drag-and-drop.** There is none. `@angular/cdk` is not even a dependency
  there; board layout is static rows and columns with no reordering UI.
- **`@sneat/auth-ui` and the Ionic app shell.** Reusing the login screens would
  mean adding `@ionic/angular` to a PrimeNG application to render one dialog. The
  Firebase *conventions* were reused instead (see below); the UI was not.
- **`sneat-dnd`.** The org's own drag-and-drop library is pinned to Angular 12.
  `@angular/cdk`'s `drag-drop` is used instead.

---

## 3. Reused from the wider Sneat fleet

| What | Source | How |
| --- | --- | --- |
| **Cloudflare deploy** | `sneat-co/cicd/.github/workflows/cf-deploy.yml` | Called from `.github/workflows/ci.yml`. Org-level `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable; no per-repo secrets. |
| **The edge routing + auth-proxy pattern** | `communitycentrum/landings/worker.js` (noticeboard.cc) | `web/worker.js` reverse-proxies `/__/auth/*` to `sneat-eur3-1.firebaseapp.com` so `signInWithRedirect` stays first-party. Simplified: Dashboardius has no Astro landing and no locale subtree, so the reserved-path allow-list is not needed. |
| **Firebase project and auth conventions** | `communitycentrum`'s `environment.ts`, `@sneat/app-auth`'s `provide-sneat-firebase.ts`, `SneatAuthStateService` | Same `sneat-eur3-1` project, same modular `firebase/auth` SDK (not AngularFire), same `authDomain` = own origin, same redirect sign-in method. |
| **The PrimeNG theming convention** | `gametable` (founder ruling 2026-08-19, ionic-primeng-spike follow-up) | Styled mode with `definePreset`, eleven literal shades per colour scheme generated at build time. `scripts/generate-primeng-palette.mjs` is adapted from gametable's, re-anchored for a dark brand hue (see §5). |
| **The standalone Angular + PrimeNG app shape** | `competios/frontend` | Angular CLI (not Nx), own pnpm lockfile, `@angular/build:unit-test` with Vitest, Playwright e2e on a dedicated port. |
| **Repo conventions** | `sneat-ext-template`, `sourcer` | `specscore.yaml`, `.github/renovate.json` extending `sneat-co/cicd`, `AGENTS.md` + a one-line `CLAUDE.md`. |

---

## 4. Built specifically for Dashboardius

| Piece | File | Why it did not exist |
| --- | --- | --- |
| Action vocabulary and pure reducer | `state/dashboard-actions.ts`, `state/dashboard-reducer.ts` | Nothing in the fleet models dashboard mutations as data. This is what makes undo cheap and the AI prompt not-a-special-case. |
| Undo / redo / reset store | `state/dashboard-store.ts` | — |
| Command catalogue and matcher | `state/command-catalog.ts` | The scripted half of `command → actions → mutation`. |
| Chart configuration | `charts/chart-options.ts` | Pure functions producing Chart.js data/options, enforcing one y axis, slot-keyed colour, thin marks. |
| Three widget kinds | `chart`, `stats`, `content` in `model/board.model.ts` | DataTug ships `SQL`, `tabs` and `http`. These are additions by NAME, not schema changes. |
| Chart / stats / content / query cards | `ui/cards/*` | — |
| Switchable grid engine + shared cell renderer | `ui/cards/data-grid.component.ts`, `tabulator-grid.component.ts`, `ag-grid.component.ts`, `cell-format.ts` | Rich column types (text, number, amount, progress, date, boolean, gender) with conditional tinting, rendered identically by three engines. |
| Card shell, card menu, board grid, command bar, app bar | `ui/*` | — |
| Visual identity and design tokens | `styles.scss`, `theme/brand-preset.ts` | — |
| Auth service and dialog | `auth/*` | A PrimeNG-native sign-in that does not drag Ionic in. |
| Worker, wrangler config, smoke test | `worker.js`, `wrangler.jsonc`, `scripts/post-deploy-smoke.mjs` | — |

---

## 5. Judgement calls worth knowing about

**The PrimeNG palette generator was re-anchored.** gametable's version assumes a
mid-tone brand (violet at ~58% lightness) and puts slot 500 there. Dashboardius'
accent is a deep instrument teal at ~28%, so applying gametable's lightness curve
unchanged produced a bright cyan `#42d5e6` as the "brand" colour — nothing like
the brand. The lightness targets were retuned so slot 500 sits at the brand's own
lightness and 600/700 stay darker, keeping PrimeNG's hover/active chain reading
as "pressed harder". Contrast was then verified numerically: 5.66:1 on white,
8.86:1 on the dark card surface.

**Charts are Chart.js, grids are not.** Chart.js arrived by instruction and it is
also the fleet's stated choice (`sneat-specs/standards/frontend-ux/ionic-and-primeng.md`:
"Pick one and only one charting stack fleet-wide"). Because it draws to a canvas,
nothing in a chart is crawlable or screen-readable on its own — which is why every
chart card also renders a table twin, always present for assistive technology and
prerendering, and promotable to the visible view from the card menu.

**Series colours are a validated palette, not a taste decision.** The eight
categorical steps clear a colourblind-separation floor against both the light and
the dark card surface (worst adjacent ΔE 9.1 light / 8.4 dark, OKLab ×100). Three
of the light steps sit below 3:1 contrast on white, and the documented relief for
that is a real table view — which the cards have. Re-ordering or re-stepping the
ramp invalidates the check.

**Grid engine choice is view state, not board state.** DataTug's board schema has
no field for "which JavaScript grid library rendered this", and inventing one
would be Dashboardius writing its rendering preferences into a shared data
format. It lives in `DashboardPageComponent` and is cleared by Reset.

**Two bugs the e2e suite caught, both silent:**

1. Dropping `FormsModule` to shrink the bundle left `<form (ngSubmit)="…">`
   binding to a DOM event named `ngSubmit` that nothing dispatches. The prompt
   looked live and did nothing. Now a native `(submit)` listener.
2. The card shell had **two** `<ng-content select="[cardAction]">`, one per branch
   of a conditional. Angular fills only the first, so any card without a footer
   note silently lost its call-to-action button. Now one slot, always in the
   template, hidden when empty.

Both were invisible to a reading of the code and to the unit tests. That is the
argument for the browser suite existing.

---

## 6. Accessibility

Audited after the first deploy, with the findings fixed and each fix verified in
a browser rather than assumed. Worth recording because two of them were
invisible to reading the code:

- **The dark surface ramp was inverted.** The preset declared the dark
  `surface` scale darkest-first (`0: #1b1e23 … 950: #f7f8fa`). Aura's dark
  tokens reach for `{surface.900}` to paint an overlay, so they were handed
  near-white: every popover and dialog flashed a bright panel over a dark page.
  A colour SCHEME chooses which end of a ramp to use; the ramp itself always
  runs light to dark. Only reproducible through the in-app theme toggle — under
  an OS dark preference the tokens resolved from the light scheme and looked
  fine.
- **A live region that did not exist yet.** The command trace and the reset
  notice carried `role="status"` but were rendered only while visible, and a
  live region has to be in the DOM before its text changes or nothing is
  announced. There is now one permanently-rendered polite region that every
  board change writes a sentence into.
- **Focus was dropped on `<body>`** when the auth dialog closed, by any of its
  three close paths. The opener is now remembered and refocused.
- **PrimeNG's dialog close button had no accessible name** — an `aria-hidden`
  icon and nothing else. Named via the component's own `closeAriaLabel`.
- **Single-select menu groups announced as checkboxes.** Grid engine, chart
  shape and card width are one-of-many, and `menuitemcheckbox` does not merely
  under-describe them, it says pressing one leaves the others alone. They are
  `menuitemradio` now; only the genuinely independent Metrics and Table view
  entries stayed checkboxes.
- **Two missing landmarks.** The masthead was a `<div>` (no `banner`), and the
  site footer sat inside `<main>`, where HTML-AAM does not expose `contentinfo`.
- **Contrast.** `--ink-faint` failed 4.5:1 in both schemes and is used on a
  great many labels; the up/down delta colours failed as text. Status *marks*
  keep the reserved status palette, and status *text* now has its own tokens
  solved against every surface it lands on — including the 14% tint behind a
  negative balance, which is the tightest of them and the one a card-only
  calculation misses. Interactive control boundaries got a dedicated 3:1
  `--control-border`, rather than darkening every decorative hairline.

Three light-mode series colours sit below 3:1 against the card surface. That is
a known, documented property of the validated categorical palette, whose
prescribed relief is a real table view — which every chart card has, in the card
menu and always present for assistive technology. Re-stepping those three would
require re-validating the whole ramp's colourblind separation, so the palette is
left as validated and the relief is the mitigation.

Not covered: real screen-reader sessions, voice control, and Windows forced-colors
mode. Those need a human and a real AT.

---

## 7. Deliberately not built

Real dashboard persistence, GitHub save / repo creation / repo selection,
production analytics, DataTug query authoring, dashboard permissions,
collaboration, real-time multi-user editing, production AI dashboard editing,
comprehensive sharing, embeddable dashboards, billing.

Save, Share and Save to GitHub are present as UI because they are the product's
direction — and each explains that it is not built rather than showing a success
for something that did not happen. There are no fake saves anywhere in this
build.

---

## 8. Known gaps and follow-ups

1. **PrimeUI licence key.** PrimeNG 21+ ships under the PrimeUI licence and
   injects a "license not configured" banner without a key. The build wires
   `PRIMEUI_LICENSE` from the environment (`scripts/write-primeui-license.mjs`),
   and the shared cf-deploy workflow already threads that secret — but no key is
   configured, so the banner is currently visible. Sneat is inside the free
   Community tier; the key still has to be obtained and set.
2. ~~**Cloudflare custom domain.**~~ Resolved on the first deploy: the org
   `CLOUDFLARE_API_TOKEN` does carry `Zone:DNS:Edit`, so wrangler attached
   `dashboardius.com` and created its DNS record without a dashboard step. The
   fleet's `docs/HOSTING.md` says this needs doing by hand; for this token it did
   not, and that is worth knowing before the next product is set up.
3. **Firebase authorised domain and Google OAuth redirect URI.** Both need
   `dashboardius.com` added before sign-in works on the apex. The config falls
   back safely to the Firebase-hosted auth domain on any other host.
4. **A `dashboardius` Firebase Web App registration.** The current `appId` is
   borrowed from another Sneat product. It affects nothing today because Firebase
   Analytics is deliberately not initialised, but it should be replaced before it
   ever is.
5. **`@datatug/board-models`.** Publishing the shared board schema would remove
   the one duplication in this codebase.
6. **Initial bundle is ~822 kB raw / ~185 kB transferred.** Chart.js, Firebase,
   Tabulator and AG Grid are all deferred; what remains is Angular, PrimeNG's
   styled-mode runtime and CDK drag-drop. If it needs to come down further, the
   next cut is replacing PrimeNG's overlay in the card menu, which is the single
   largest remaining third-party cost on the critical path.
