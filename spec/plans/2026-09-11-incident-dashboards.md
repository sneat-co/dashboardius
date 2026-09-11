---
format: https://specscore.md/plan-specification
status: Draft
---

# Plan: Incident dashboards over DataTug incidents

**Status:** Draft
**Source Feature:** incident-dashboards
**Date:** 2026-09-11
**Owner:** alex
**Supersedes:** —

## Summary

This plan delivers the Dashboardius side of DataTug roadmap Track C2: an incident board
created from a DataTug incident, a `metric-series` widget drawn from execution records, a
resolution-criteria widget, a comparison widget, a replay board, and one whole-journey
browser test that proves no value on any card came from anywhere but DataTug's server.

It has three prerequisites and starts with none of them done. **Track C1** — tasks 2–6 of
[2026-09-09-query-backed-board-persistence](2026-09-09-query-backed-board-persistence.md):
the canonical board contract, Dashboardius consuming it instead of its own copy, and the
`/datatug/boards` read/write API itself. That API does not exist yet — it is a Track C1
deliverable, not something this plan can consume today. Without it a board assembled during
an incident still evaporates with the tab, and Task 3's save/reload has nothing to call.
**Hub Track B1** — the incidents MVP: the incident asset and its event stream, metrics with
numeric projections in the impact/diagnostic/recovery/watch categories, explicit resolution
criteria, execution records with fingerprints, and the `/datatug/incidents/*` endpoints. The
`compare` endpoint (`POST /datatug/compare`) is needed only from Task 5 onward. **Hub
Incidentius MVP plan task 13** — the board widget extension boundary: `BoardWidget.Validate`
in `datatug-core` rejects `metric-series`, `comparison`, `resolution-criteria` and `replay`
today, and the `@datatug/board-models` `BoardWidgetName` union is documentation only
(`BoardWidget.name` is typed `string`), so the boundary is opened on the Go side and mirrored
in TypeScript by task 13; `Board.incidentRef` as an `IncidentRef` (`{storeId, incidentId}`) lands there too.
Tasks 2–6 are blocked on this task, not only on Track C1.

## The journey

This is what the work has to make true, told the way the people in it would tell it. Each
stage names the observable good result — including the stages where nobody does anything,
because a board that is watched and not touched is most of an incident.

1. **"Houston, we've got a problem."** A support lead opens an incident in Incidentius. It
   already has its metrics named and categorised, and somebody has run two diagnostic
   checks. Everything is a column of numbers. *Good result:* an incident exists with named
   metrics and at least one recorded check run behind them.

2. **"Give me a picture of this."** The troubleshooter clicks **Open incident dashboard**.
   A board appears with one card per metric, grouped impact, diagnostic, recovery, watch —
   847 stuck orders, 93 affected customers, the finalizer queue at 1,283. They drop two
   cards they do not care about and save. *Good result:* a board file in the same DataTug
   project, opening equally well from the incident and from the project screen, and visible
   to exactly the colleagues the project's grants allow.

3. **Nobody does anything for eleven minutes.** The impact card keeps showing 847, because
   847 is what the last execution record says, and it says so with the time it was observed.
   It does not blank, it does not drift, and it does not quietly re-run the check.
   *Good result:* a stale value that is honest about being stale and carries its own
   observation time.

4. **Somebody re-runs the diagnostic check.** A new execution record lands. The card's line
   gains exactly one point, at that record's timestamp. *Good result:* one new point,
   attributable to one record, with nothing interpolated between it and the last one.

5. **"Why is PROD broken when UAT is fine?"** The troubleshooter adds a comparison card over
   the two environments, and a second one over affected orders versus a control cohort. The
   second one shows one shipping carrier taking a much larger share of affected orders than
   of the control. *Good result:* the diff and the over-representation are the server's
   numbers, shown with their basis, and the browser computed none of it.

6. **Mitigation is deployed at 14:57.** The recovery cards fall: 847 → 612 → 311 → 41 → 0,
   the same shape the vision sketches in ASCII. *Good result:* a falling series whose points
   are recorded runs, with the mitigation moment marked from the incident's event stream.

7. **The criteria card decides when this is over.** Five criteria, each with the check run
   behind it. Four pass, one — "no new stuck orders for 30 minutes" — has not been evidenced
   yet. Nobody edits the card; the failing one flips only when a run says so. *Good result:*
   pass/fail that mirrors recorded check runs and nothing else.

8. **Resolved at 16:01, and then five hours of nothing.** The board switches to the watch
   arrangement and the observation period runs. No new stuck orders. Nobody looks at it for
   an hour at a time. *Good result:* watch cards that keep reporting from whatever runs
   happen, and say plainly when the most recent evidence is an hour old.

9. **A month later, a new engineer replays it.** They open the same board, drag the scrubber
   to 14:52, and every card shows what was known at 14:52 — including the cards that had no
   evidence yet, which say so instead of showing today's number. Nothing is re-executed for
   a moment in the past. They drag back to live. *Good result:* a reconstructed past state
   built only from records, and an unmistakable difference between replaying and live.

10. **A DataTug user opens the same board.** Not in Dashboardius — inside the DataTug
    project page, where the board renderer is embedded as an island. It looks the same.
    *Good result:* one renderer, two hosts, identical output.

## Approach

Extract the renderer before adding anything to it, so every widget built afterwards is built
once and lands in both hosts — doing it later would mean porting four new widget kinds
across a repository boundary. Then add widgets in the order the journey needs them:
`metric-series` first because it is what a board is mostly made of and it settles how
Dashboardius reads execution records; incident board creation next, because it needs
somewhere to put the cards; criteria and comparison after that, in either order; replay last
among the widgets because it constrains every card that exists by then rather than adding a
new one. The whole-journey test comes at the end against real services, because the one
thing this Feature must prove is that no number on the board came from a fixture.

Each widget arrives as a new widget *name* in the `{name, data}` envelope. No task adds a
field to `Board`, `BoardRow` or `BoardCard`; the one durable addition this plan needs — the
incident reference — is raised in the hub `dashboards` Feature in Task 3 rather than invented
here.

## Tasks

### Task 1: Extract the board renderer into a workspace library

**Id:** task-1
**Verifies:** incident-dashboards#ac:embedded-and-standalone-render-identically
**Depends-On:** —
**Status:** planning

Extract the board renderer's leaf widgets — charts, table twins, `cell-format.ts`, the series
palette, drag-drop — into a workspace library (no PrimeNG layout, cards or menus: the shell is
rebuilt in Ionic by Track C3), consumed by the `dashboardius` profile of the single app and
structured so it can be embedded as an island in a DataTug or Incidentius page. Keep view
state (grid engine, chart shape, card width, runtime results, row view keys, command trace,
undo history) in the host, outside the persisted board. The library must not require the
Ionic shell and must not let a host restyle data marks. The full cutover inventory for the
application itself — worker, `wrangler.jsonc`, `cf-deploy.yml`, Playwright, Renovate, theme
and licence scripts — is the hub `product-profiles` Feature's; this task moves the renderer,
not the deployment.

The library must end up published or linkable from the `datatug/datatug-apps` Nx workspace,
because that is where every host now lives: the founder ruled *"one configurable app."*
(2026-09-11), so the `dashboardius` profile, DataTug and Incidentius pages are all one
Ionic-framed app and Track C3 rebuilds the Dashboardius shell in Ionic while retiring the
PrimeNG shell here (hub `product-profiles` REQ:dashboardius-app-cutover). This task therefore
extracts only the leaf widgets — chart, grid, drag-drop — and their scoped theme CSS, never
PrimeNG layout, cards or menus. Lead assumption: it builds the library as a workspace library
inside `sneat-co/dashboardius` first, and Track C3 relocates it into `datatug/datatug-apps`;
Task 1 is not blocked on Track C3 landing first.

### Task 2: Build the `metric-series` widget over execution records

**Id:** task-2
**Verifies:** incident-dashboards#ac:metric-series-renders-record-series
**Depends-On:** 1
**Status:** planning

Add the `metric-series` widget name with a durable `data` of `checkId` or `queryId`,
bindings, `{column, aggregate}` projection, window and category — and nothing else; no query
text, no target, no recorded values. Fetch points from `GET /datatug/executions…` and plot
one point per execution record, each able to name its record identifier and `observedAt`.
Never interpolate, never re-execute on a refresh that is only a re-render, and show an empty
window as empty rather than as zero. Obey the repository's chart rules: one y axis, colour by
series slot, and a table twin present in the DOM, not only in the card menu.

### Task 3: Create an incident board from an incident

**Id:** task-3
**Verifies:** incident-dashboards#ac:incident-board-created-from-incident
**Depends-On:** 1, 2
**Status:** planning

Add **Open incident dashboard** to an incident: read the incident's metrics and run checks
through `/datatug/incidents/*`, build default `metric-series` cards grouped in the incident's
own category order, and save the board to the same project through `/datatug/boards` so its
access follows the project's grants. The defaults are a starting arrangement the author can
edit, not a managed view kept in sync. Raise the durable incident↔board reference in the hub
`dashboards` Feature and consume whatever it defines; do not persist an invented field in the
meantime. Ship the live-impact, recovery and watch arrangements here — they are the same
cards in three groupings, not three code paths.

### Task 4: Build the resolution-criteria widget

**Id:** task-4
**Verifies:** incident-dashboards#ac:criteria-widget-reflects-check-runs
**Depends-On:** 3
**Status:** planning

Add the `resolution-criteria` widget name. List each criterion the incident declares with its
latest check run: actual value, expected condition, record identifier, `observedAt` and
pass/fail taken from the run's deterministic result. Evaluate no predicate in the browser.
Show a criterion with no run as not yet evidenced, keep the order stable across refreshes,
and show each criterion's own evidence age rather than the board's refresh time.

### Task 5: Build the comparison widget over `POST /datatug/compare`

**Id:** task-5
**Verifies:** incident-dashboards#ac:comparison-widget-shows-overrepresentation
**Depends-On:** 3
**Status:** planning
**Activation:** NEXT (Track C2 second slice)

Add the `comparison` widget name, with a durable `data` of query or check reference,
bindings, two scopes and mode, and no rows, counts or verdict. Render both response shapes:
the keyed recordset diff (only in A, only in B, differing, matching) and the cohort
distribution comparison with the server's over-representation figures and their basis.
Compute no diff, share or verdict in the browser, and make sure no presentation control —
sort, chart shape, grid engine — can change which values are reported as different or
over-represented. Cover affected-vs-control and environment-comparison arrangements.

### Task 6: Build the replay board

**Id:** task-6
**Verifies:** incident-dashboards#ac:replay-scrubber-shows-state-at-time
**Depends-On:** 2, 3, 4, 5
**Status:** planning
**Activation:** NEXT (Track C2 second slice)

Add a time scrubber whose stops come from the incident event stream's own timestamps, and
resolve every card on the board to the latest execution record at or before the selected T,
labelled with that record's identifier and `observedAt`. A card with no record at or before T
says there was no evidence yet; it never falls back to the current value. Issue no execution
request for a past moment. Make the replaying state unmistakable at a glance, and restore
live evidence on exit. This task touches every widget built so far, which is why it comes
after them.

### Task 7: Run the whole incident-board journey in a browser

**Id:** task-7
**Verifies:** incident-dashboards#ac:incident-board-created-from-incident, incident-dashboards#ac:metric-series-renders-record-series, incident-dashboards#ac:criteria-widget-reflects-check-runs, incident-dashboards#ac:embedded-and-standalone-render-identically, incident-dashboards#ac:no-direct-execution-in-network-evidence
**Depends-On:** 2, 3, 4
**Status:** planning

Run the journey above end to end against a real DataTug server and the canonical demo
incident, from the real product entry point. No intercepted responses, no stubbed endpoints,
no demo recordsets, no deep links that skip the "Open incident dashboard" step. Include the
null-action stages: leave the board untouched and assert the cards still report the last
recorded value with its observation time. Capture network evidence for the whole run and
assert every card value arrived through `/datatug/executions`, `/datatug/compare`,
`/datatug/incidents` or `/datatug/boards`, with no direct data-source connection and no
Dashboardius-side store. Open the same saved board through the embedded renderer and assert
identical output. Induce a server failure and assert a stated error rather than demo data.
Required CI fails when the real services or the demo incident fixture are unavailable.

This run covers the MVP widgets — `metric-series`, `resolution-criteria` and incident-board
creation (journey stages 1–4, 6–8 and 10). Journey stage 5 (comparison) and stage 9 (replay)
are written into the same test file but belong to Task 8, which activates them once Tasks 5
and 6 ship; no second whole-journey test is written for them.

### Task 8: Activate the comparison and replay stages of the journey

**Id:** task-8
**Verifies:** incident-dashboards#ac:comparison-widget-shows-overrepresentation, incident-dashboards#ac:replay-scrubber-shows-state-at-time
**Depends-On:** 5, 6, 7
**Status:** planning
**Activation:** NEXT (Track C2 second slice)

Un-skip journey stage 5 (comparison over `POST /datatug/compare`) and stage 9 (replay
scrubber) in the whole-journey test from Task 7, against the same real server and demo
incident, with the same network-evidence assertion extended to the compare endpoint. This
task adds no new test file and no new widget; it exists so that the MVP journey in Task 7 can
complete without the NEXT widgets, and so that the two NEXT acceptance criteria are verified
by a task rather than deferred.

## Deferred AC Coverage

- incident-dashboards#ac:template-proposed-from-recurrence — FUTURE. Proposing a board
  template from card sets that recur across incidents of one class needs several resolved
  incidents to learn from and the hub's incident-similarity work; it is not scheduled in this
  plan.

## Open Questions

- ~~Task 3 depends on a hub decision that does not exist yet: where the incident↔board link
  lives.~~ Answered (lead assumption on the hub side, open to review): the hub `dashboards`
  Feature specifies `Board.incidentRef` as an `IncidentRef` — `{storeId, incidentId}` —
  (REQ:incident-boards-and-shared-renderer); Task 3 uses it through the board API and never
  a Dashboardius-invented field.
- Watch-period cards (Task 3) only advance when somebody runs a check, because the incidents
  MVP has no scheduled runs. Whether that is acceptable for the first watch board, or whether
  Task 3 should wait for scheduled check runs, is a hub `checks`/`incidents` question.

---
*This document follows the https://specscore.md/plan-specification*
