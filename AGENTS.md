# Working in this repository

Dashboardius is a Sneat product: a dashboard builder and viewer. One web
surface, one repository, no backend of its own yet.

## Layout

```
web/                Angular 22 + PrimeNG application, plus the Cloudflare Worker
  src/app/dashboard/model/    the board schema — REUSED FROM DATATUG, see below
  src/app/dashboard/state/    command → actions → reducer → board
  src/app/dashboard/ui/       the board, cards and chrome
  src/app/dashboard/charts/   Chart.js configuration (pure functions)
  src/app/auth/               Firebase auth, lazily loaded
  worker.js, wrangler.jsonc   the edge
docs/                         architecture notes and the implementation record
```

## The rules that are easy to break here

1. **Do not redesign the board schema.** `src/app/dashboard/model/board.model.ts`
   is DataTug's `IBoardDef` / `IBoardRowDef` / `IBoardCardDef` / `IWidgetDef`,
   copied field-for-field from `datatug-apps`, which mirrors the Go definition in
   `datatug-core/pkg/datatug/boards.go`. Add a widget NAME, never a field to those
   four interfaces. If a field seems necessary, it probably belongs in view state
   (see `DashboardPageComponent`'s `gridEngineByCard`) or upstream in DataTug.

2. **Chrome colours and series colours are two palettes and never mix.**
   `--brand` is chrome only; `--series-1..8` are data marks only. The series ramp
   is validated for colourblind separation in both schemes — re-order or re-step
   it and you have to re-validate it.

3. **Colour follows the series, not its position.** Toggling a metric must never
   repaint the others. `seriesColor(slot)`, never `seriesColor(index)`.

4. **One y axis.** Two measures of different magnitude get two cards.

5. **Never fake a success.** Save, Share and Save to GitHub explain that they are
   not built. Demo numbers say they are demo numbers. A scripted command says it
   was scripted. This is the product's credibility, and it is cheap to keep and
   expensive to get back.

6. **Every grid engine renders through `cell-format.ts`.** Switching engine is a
   rendering preference; it must never change what a value means or how it is
   tinted.

## Commands

```
cd web
pnpm install
pnpm start          # dev server
pnpm test           # unit suite (Vitest via the Angular builder)
pnpm build          # production build, prerenders the homepage
pnpm test:e2e       # Playwright, boots its own dev server
```
