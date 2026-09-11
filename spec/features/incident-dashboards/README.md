---
format: https://specscore.md/feature-specification
status: Draft
---
# Feature: Incident and investigation dashboards

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/incident-dashboards?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/incident-dashboards?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/incident-dashboards?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/incident-dashboards?op=request-change) |
**Status:** Draft
**Source Ideas:** —

## Summary

During an incident, people want to see the problem, the diagnosis, the recovery and the
watch period as pictures rather than as a column of numbers. This Feature is the
Dashboardius half of that: incident-scoped boards assembled from a DataTug incident's own
metrics and checks, a `metric-series` widget drawn from execution records, a comparison
widget that renders a `compare` result, a resolution-criteria widget, and a replay board
that shows what was known at a chosen moment.

It is the Dashboardius-owned presentation layer over three DataTug hub Features:
[`evidence-records`](https://github.com/datatug/datatug/blob/main/spec/features/evidence-records/README.md)
(execution records and their numeric series),
[`compare`](https://github.com/datatug/datatug/blob/main/spec/features/compare/README.md)
(two-scope diff and cohort distribution) and
[`incidents`](https://github.com/datatug/datatug/blob/main/spec/features/incidents/README.md)
(the incident asset, its event stream, its metrics and its resolution criteria). Those
Features own the data and the semantics; this one owns only how a board shows them.

This Feature covers the founder's vision §21 (Dashboardius during incidents), §20 (incident
metrics: impact, diagnostic, recovery, watch), §22 (recovery and watch period), §13
(comparison), §38 (the Resolution Record's Dashboardius views) and §39 (timeline replay).
It is DataTug roadmap Track C2; it presumes Track C1 (the persistence journey in
[`query-backed-board-persistence`](../query-backed-board-persistence/README.md)) and the
hub's Track B1 incidents MVP.

## Problem

The incidents MVP shows metrics as numeric tables inside DataTug. That is honest and it is
enough to run a check, but it does not show a shape: a queue depth that rose, peaked and
fell is a picture, and the vision draws it as one (§22). Today nobody can get that picture
without leaving the incident, because:

- Dashboardius has no persistence yet, so a board assembled during an incident evaporates
  with the tab, and there is no way to hand it to the next responder.
- Dashboardius knows nothing about incidents, execution records, checks or criteria. Its
  widgets render a recordset returned right now; an incident needs a *series of past
  recorded runs*, which is a different thing and lives in a different endpoint.
- Comparison — "why does this work in UAT but fail in PROD", "affected versus control" — has
  no widget at all, and the temptation to diff two recordsets in the browser would put a
  second, unauthorised answer next to the server's one.
- Replay has no surface. An incident's evidence is already immutable and timestamped, but
  nothing lets an engineer stand at 14:52 and see what the team saw.
- The Dashboardius app currently lives in its own repository with its own board renderer, so
  a DataTug or Incidentius page cannot show the same board without a second implementation.

## Behavior

### The journey this Feature has to support

A troubleshooter opens an incident, clicks **Open incident dashboard**, and gets a board
whose cards were chosen from that incident's own metrics and checks. They watch it; when
nobody acts, the cards keep reporting the last recorded value with the time it was observed.
When a check is re-run, a point appears. They add a comparison card to ask why PROD differs
from UAT. Mitigation lands and the recovery cards fall to zero. The resolution-criteria card
turns green criterion by criterion. After resolution the watch cards run for hours with
nobody doing anything. A month later somebody drags a scrubber back to 14:52 and sees what
was known then. The plan
[2026-09-11-incident-dashboards](../../plans/2026-09-11-incident-dashboards.md) tells that
journey in full.

### Ownership boundary

| Concern | Owner |
|---|---|
| Incident identity, event stream, metric semantics, criteria, categories | DataTug hub `incidents` |
| Execution records, numeric projections, snapshots, retention | DataTug hub `evidence-records` |
| Two-scope diff and cohort distribution arithmetic | DataTug hub `compare` |
| Board schema, persistence, query binding, ACL | DataTug hub `dashboards` |
| Widget kinds, card layout, charts, table twins, scrubber, editing | Dashboardius (this Feature) |
| Which app the renderer ships in and the workspace cutover | DataTug hub `product-profiles` |

### Incident boards

#### REQ: incident-board-is-project-board

An incident board MUST be an ordinary DataTug project board, persisted through
`/datatug/boards` like any other, with access following the project's grants — never an
incident-private store, an incident-level ACL of its own, or a board living inside the
incident asset. An incident board MAY additionally carry a durable reference to the incident
it was opened from, so the board can be listed from the incident and the incident from the
board.

**Open incident dashboard**, offered on an incident, MUST create a board file in the same
project as the incident, pre-populated with default cards derived from that incident's
declared metrics and the checks already run on it: one card per metric, grouped in the
incident's own `impact`, `diagnostic`, `recovery`, `watch` order (vision §20). The author
MUST be able to remove, reorder and add cards afterwards; the defaults are a starting
arrangement, not a managed view that Dashboardius keeps in sync.

The durable shape of the incident reference is **not** Dashboardius's to invent, and it is
now specified on the hub side (a lead assumption there, open to review): the hub `dashboards` Feature specifies `Board.incidentRef` as an
`IncidentRef` — `{storeId, incidentId}` — mirrored in `@datatug/board-models`
(REQ:incident-boards-and-shared-renderer). Dashboardius reads and writes that structured
field and never persists a string of its own. This repository's standing rule still holds:
new Dashboardius capability arrives as new widget *names* inside the `{name, data}` envelope,
never as new fields on `Board`, `BoardRow` or `BoardCard`. `incidentRef` is the one hub-owned
exception to that rule — added by the hub `dashboards` Feature, not by Dashboardius, and not
a precedent for Dashboardius inventing further `Board` fields itself.

### Widgets

#### REQ: metric-series-widget

A new widget name `metric-series` MUST render one incident metric over time. Its `data`
envelope carries the durable definition only (lead assumption on the exact field names):

```json
{
  "name": "metric-series",
  "data": {
    "title": "Stuck orders",
    "checkId": "orders-stuck-count",
    "bindings": [{ "id": "status", "value": "WAITING" }],
    "projection": { "column": "stuck_orders", "aggregate": "sum" },
    "window": { "from": "incident.startedAt", "to": "now" },
    "category": "impact"
  }
}
```

`checkId` and `queryId` are alternatives — a metric is either a check whose runs are recorded
or a library query with a numeric projection — and exactly one MUST be present. The widget
MUST NOT carry query text, an execution target, an environment, or any recorded point value:
it is a binding, and its points come from execution records fetched through
`GET /datatug/executions…` for that check or query, projected by `{column, aggregate}` as
the hub `evidence-records` Feature defines.

The widget MUST NOT execute anything, MUST NOT compute the projection from raw rows itself,
and MUST NOT interpolate or synthesise points between records. Each plotted point MUST be
attributable to exactly one execution record, and the card MUST be able to name that
record's identifier and `observedAt` for any point. When no record exists in the window the
card MUST say so rather than draw an empty axis as if the value were zero.

`category` MUST be one of `impact`, `diagnostic`, `recovery`, `watch` and is presentation
grouping only; the incident remains the authority on which category a metric belongs to.

The card MUST obey this repository's existing chart rules without exception: one y axis ever,
so two measures of different magnitude get two cards; colour keyed to the series slot, so
toggling a metric never repaints the others; and **always a table twin** — present in the
card menu and present in the DOM for assistive technology and crawlers, because three of the
light-mode series colours sit below 3:1 against the card surface and the table is the
validated palette's prescribed relief.

#### REQ: comparison-widget

A new widget name `comparison` (lead assumption for the name) MUST render the result of a
`POST /datatug/compare` call: either a keyed recordset diff (rows only in scope A, only in
scope B, differing, matching) or a cohort distribution comparison (the share of each value
of a dimension in the affected cohort beside its share in the control cohort). Its durable
`data` carries the query or check reference, the parameter bindings, the two scopes and the
mode; it carries no rows, no counts and no verdict.

Dashboardius MUST NOT compute the diff, the distribution or the over-representation itself,
and MUST NOT re-aggregate, re-key or re-sort the server's answer in a way that changes which
rows are called different. Over-representation is shown because the server reported it, with
the server's basis visible; a mark the user sees as "this carrier is over-represented among
affected orders" MUST be traceable to numbers in the compare response.

Scopes are whatever the hub `compare` Feature accepts — two environments, two cohorts, two
snapshots, before and after a deployment (vision §13). The widget presents them as two
labelled sides and never assumes one of them is "correct".

#### REQ: resolution-criteria-widget

A new widget name `resolution-criteria` MUST list the incident's resolution criteria, each
with its latest check-run evidence and a pass/fail state: the criterion as the incident
states it, the actual value, the expected condition, the execution record's identifier and
`observedAt`, and whether it currently holds.

The widget MUST NOT evaluate a predicate. Pass/fail comes from the deterministic result
recorded by the check run; a criterion with no run yet MUST be shown as not yet evidenced
rather than as failing. Criteria order MUST be stable across refreshes, and a criterion
whose evidence is older than the board's refresh MUST show its own age rather than borrow
the board's.

### Board kinds

#### REQ: board-kinds-for-investigation

Dashboardius MUST support these board kinds. A "kind" is a named starting arrangement of
cards plus the widget kinds it needs (lead assumption) — it is not a persisted enum on the
board and adds no field to the schema, so a board can be started as one kind and edited into
anything.

| Kind | What it shows | Tier |
|---|---|---|
| Live impact | the incident's `impact` metrics as series, largest first | **MVP** |
| Recovery | `recovery` metrics falling over time, with mitigation moments marked | **MVP** |
| Post-resolution watch | `watch` metrics over the observation period | **MVP** |
| Investigation | the cards that actually proved useful during the work (vision §21) | NEXT |
| Affected vs control | comparison cards over two cohorts | NEXT |
| Environment comparison | comparison cards over two environments | NEXT |
| Historical replay | every card resolved at a chosen time T | NEXT |

Registering the `metric-series`, `comparison`, `resolution-criteria` and `replay` widget
names requires the hub's extension boundary (hub `dashboards`
REQ:incident-boards-and-shared-renderer; hub Incidentius MVP plan task 13, "Board widget
extension boundary and incident reference"); until it lands, the Go validator rejects them.

MVP for Dashboardius is **live impact, recovery and watch**, and none of them starts before
board persistence exists (Track C1). Investigation and the two comparison kinds follow the
`comparison-widget`; replay follows `replay-board`.

#### REQ: replay-board

A replay board MUST offer a time scrubber that selects a moment T within the incident, and
every card on the board MUST then show the latest execution record at or before T, labelled
with that record's identifier and `observedAt`. A card with no record at or before T MUST
say that there was no evidence yet, and MUST NOT fall back to the current value.

Replay MUST read the incident event stream through the hub's NDJSON endpoint
(`GET /datatug/incidents/{id}/events?since=<cursor>`, hub `incidents` REQ:watch-event-cursor)
and the execution records through `/datatug/executions…`. It MUST NOT execute or re-execute
anything for a past T under any circumstance — a replayed number is a recorded number or it
is absent. The scrubber's stops MUST come from the event stream's own timestamps (checks run,
hypotheses proposed, mitigation applied, criteria satisfied), so scrubbing lands on moments
where something actually happened rather than on arbitrary clock ticks. A live view that wants
to react to new events, not only new execution records, consumes the same NDJSON stream with
its resumable cursor; there is no separate polling loop or notification route.

Leaving replay MUST return every card to live evidence, and the board MUST make plain at a
glance which of the two states it is in, because a replayed board and a live board look
otherwise identical and confusing them during an incident is expensive.

### Boundaries

#### REQ: no-direct-execution

Dashboardius MUST obtain every value on an incident board from DataTug's server:
`/datatug/executions` for record series, `/datatug/compare` for comparisons,
`/datatug/incidents` for incidents, their events, metrics and criteria, and
`/datatug/boards` for board reads and writes. It MUST NOT open a database connection, call a
data source, read a project file, or maintain any store of incident, evidence or board data
of its own. It MUST NOT substitute demo data for a failed call: a failure shows the actual
error or access limitation, keeps the card definition intact, and says which call failed.

#### REQ: shared-renderer-library

The board renderer MUST be a library in the `datatug/datatug-apps` Nx workspace, consumed
both by the Dashboardius application and, as an embedded island, by DataTug and Incidentius
pages (founder ruling 2026-09-11 that the three apps' code shares one workspace; founder
UI-kit rule 2026-09-09 that an Ionic frame hosts PrimeNG/AG Grid islands only where Ionic
lacks components). A given board MUST render identically in both: the same cards in the same
order with the same values, the same table twins and the same series colours.

View state MUST stay out of the persisted board: grid engine, chart shape, card width,
runtime results, row view keys, replay T, command trace and undo history are Dashboardius
state, not board fields. The library MUST NOT require the Ionic shell, and a host MUST NOT
restyle data marks — the validated series palette travels with the library, because
re-stepping it would require re-validating its colourblind separation.

The inventory and sequencing of moving `sneat-co/dashboardius/web` into the workspace is
owned by the hub
[`product-profiles`](https://github.com/datatug/datatug/blob/main/spec/features/product-profiles/README.md)
Feature and is not restated here. Whether Dashboardius stays a separate application or
becomes a profile of one configurable application is still the founder's open decision; this
Feature is written so that either answer works, because the renderer is a library in both.

### Later

#### REQ: dashboard-templates-from-recurring-collections

**FUTURE.** When the same collection of cards proves useful across several incidents of one
class, the system SHOULD propose a reusable board template for that class (vision §21). A
proposal MUST be shown as a proposal a human accepts, rejects or edits; it MUST NOT be
applied to a board automatically, and it MUST name the incidents and the card sets it was
derived from, recorded as an inference rather than an observation.

## Acceptance Criteria

### AC: incident-board-created-from-incident (verifies REQ:incident-board-is-project-board, REQ:board-kinds-for-investigation)

**Given** an incident in a DataTug project with declared impact, diagnostic, recovery and watch metrics and at least one check already run
**When** a participant chooses **Open incident dashboard** and saves
**Then** a board file exists in that same project containing one card per metric grouped in the incident's category order, the board opens from the DataTug project screen as an ordinary board, a colleague with a project grant can open it and a principal without one cannot, and no incident-private board store was created.

### AC: metric-series-renders-record-series (verifies REQ:metric-series-widget)

**Given** a `metric-series` card bound to a check with four recorded runs inside its window
**When** the board loads and then a fifth run is recorded
**Then** the card first draws exactly four points, each attributable to one execution record's identifier and `observedAt`, then draws five without re-executing anything; its table twin lists the same points; and with nobody taking any action the card keeps showing the last recorded value with its observation time rather than blanking, drifting or re-running.

### AC: comparison-widget-shows-overrepresentation (verifies REQ:comparison-widget)

**Given** a `comparison` card comparing affected orders with a control cohort on the shipping-carrier dimension
**When** the board renders the `POST /datatug/compare` response
**Then** the two distributions and the over-representation shown are exactly the numbers the server returned, no diff or share is computed in the browser, and changing the card's presentation (sort, chart shape, engine) never changes which values are reported as over-represented.

### AC: replay-scrubber-shows-state-at-time (verifies REQ:replay-board)

**Given** a resolved incident whose event stream spans 14:31 to 16:01 and whose cards have records at several of those moments
**When** an engineer drags the scrubber to 14:52 and then leaves replay
**Then** every card shows the latest record at or before 14:52 labelled with that record's identifier and `observedAt`, cards with no record yet say so instead of showing the current value, no execution request is issued for the past moment, and leaving replay restores live evidence with the board's state visibly changed.

### AC: criteria-widget-reflects-check-runs (verifies REQ:resolution-criteria-widget)

**Given** an incident with five resolution criteria, four of whose latest check runs passed, one of which failed, and one criterion that has never been run
**When** the resolution-criteria card renders and the failing check is then re-run and passes
**Then** the card shows each criterion with its actual value, expected condition and the record behind it; the never-run criterion reads as not yet evidenced rather than failing; and the state flips only after the new run is recorded, never from a browser-side evaluation of the predicate.

### AC: embedded-and-standalone-render-identically (verifies REQ:shared-renderer-library)

**Given** one saved incident board
**When** it is opened in the Dashboardius application and in a DataTug or Incidentius page embedding the renderer library
**Then** both render the same cards in the same order with the same values, table twins and series colours; the persisted board contains no grid engine, chart shape, runtime result, row view key or replay time; and neither surface carries a second copy of the renderer.

### AC: no-direct-execution-in-network-evidence (verifies REQ:no-direct-execution)

**Given** the complete incident-board journey run in a real browser against a real DataTug server
**When** network and storage evidence is captured for the whole run
**Then** every value on every card arrived through `/datatug/executions`, `/datatug/compare`, `/datatug/incidents` or `/datatug/boards`; there is no direct data-source connection and no Dashboardius-side store of incident, evidence or board data; and an induced server failure produces a stated error rather than demo data.

### AC: template-proposed-from-recurrence (verifies REQ:dashboard-templates-from-recurring-collections)

**FUTURE.** **Given** three resolved incidents of one class whose boards converged on the same five cards
**When** the system recognises the recurrence
**Then** it proposes a board template naming the incidents and cards it was derived from, records the proposal as an inference rather than an observation, and changes no existing board until a human accepts it.

## Not Doing / Out of Scope

- Any execution, storage, access-control or diff computation in Dashboardius.
- Incident semantics: lifecycle, metric categories, criteria, hypotheses and the event stream
  are the hub `incidents` Feature's, consumed here and never redefined.
- Generic observability dashboards, alerting, paging, SLO burn-down or on-call rotations —
  Incidentius is an incident-resolution workspace, not an incident-management platform.
- Board persistence itself, which is [`query-backed-board-persistence`](../query-backed-board-persistence/README.md).
- The workspace cutover inventory, owned by the hub `product-profiles` Feature.
- Generated RCA, postmortem, executive summary, video and training modes (vision §38, §40);
  a Dashboardius view is one artefact inside the Resolution Record, not the record itself.
- Real-time collaborative board editing during an incident.

## Open Questions

- ~~**Where does the incident↔board link live?**~~ Answered by the hub `dashboards` Feature
  (REQ:incident-boards-and-shared-renderer; lead assumption on the hub side, open to review):
  an optional `Board.incidentRef` — an `IncidentRef` of `{storeId, incidentId}` — mirrored in
  `@datatug/board-models`; access still follows the project's grants. Dashboardius reads and
  writes it through the board API only.
- **What does a replay card show when the execution record exists but its result snapshot was
  not retained?** The fingerprint and the numeric projection may survive when rows do not.
  Owned by the hub `evidence-records` Feature's retention and masking defaults.
- **What drives watch-period cards?** The incidents MVP runs checks manually, so a watch board
  only advances when somebody runs something. Scheduled check runs are the obvious answer and
  belong to the hub `checks`/`incidents` Features, not here.
- **One measure per `metric-series` card, or several?** This repository's one-y-axis rule says
  two measures of different magnitude get two cards (lead recommendation: one measure per
  card, several cards per category). Several same-unit series on one card — stuck orders per
  region, say — would be the only exception worth making.
- **Separate Dashboardius application or one configurable application** in the workspace
  (founder; mirrors the hub product-family question). Either answer works here because the
  renderer is a library, but it decides where the Dashboardius board routes live.

---
*This document follows the https://specscore.md/feature-specification*
