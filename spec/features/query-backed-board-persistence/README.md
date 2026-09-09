---
format: https://specscore.md/feature-specification
status: Draft
---

# Feature: Query-backed board persistence and sharing

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/query-backed-board-persistence?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/query-backed-board-persistence?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/query-backed-board-persistence?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/dashboardius/spec/features/query-backed-board-persistence?op=request-change) |
**Status:** Draft
**Source Ideas:** —

## Summary

A Dashboardius user turns a real, authorized DataTug query result into a card, saves the board through DataTug, reloads it, and shares it with an authorized colleague. The saved asset retains the query binding and presentation settings; DataTug executes the query and returns a runtime result whenever a viewer opens or refreshes the card.

This is the Dashboardius-owned user journey for the DataTug hub Feature [Dashboards as a surface](https://github.com/datatug/datatug/blob/main/spec/features/dashboards/README.md). That hub Feature owns the cross-product contract. Dashboardius owns the dense board experience, presentation widgets and editing interactions.

This journey is the DataTug roadmap's Phase 5 Dashboardius persistence milestone. It depends on Phase 4 project grants for the authorized-colleague and revocation steps; it is not part of the Phase 1 core investigation loop.

## Problem

The current public Dashboardius surface is an honest scripted prototype. It starts from `DEMO_BOARD`, keeps edits in browser memory, embeds invented result rows in its SQL-shaped widget, and tells the user that Save and Share are not built. It proves useful presentation and reversible editing, but it does not prove that a real DataTug query can become a durable board card or that another authorized person can reopen it.

The prototype model is also not the canonical DataTug board schema. As inspected on 2026-09-09, it omits DataTug project-item fields, the decided but not yet converged board parameters and required parameters, row maximum height and canonical widget settings; it adds board `description` and row `id`; and its SQL widget data contains environment, columns, rows and duration rather than DataTug's `title`, `parameters` and nested `sql: { query }` settings. DataTug's Go validator recognizes `SQL`, `HTTP` and `tabs`, while the prototype also uses `chart`, `stats` and `content`. A browser-only JSON round trip therefore cannot establish cross-language or DataTug load/save compatibility.

## Behavior

### End-to-end journey

1. An authenticated author opens a DataTug project they may read, selects an allowed environment, and runs a saved query through the DataTug server. The observable good result is a real result with its query identity, effective parameters, source provenance and access limitations visible.
2. The author chooses **Add to board**, selects an existing board or names a new one, and chooses a Dashboardius presentation. The observable good result is a preview card whose durable query binding and presentation settings are distinguishable from its current runtime result.
3. Before saving, the author can inspect and correct every explicit parameter binding. If a required binding or execution target is unresolved, Save is disabled and the missing choice is named. The observable good result is that the author can tell what will execute without reading a project file.
4. The author saves. Dashboardius sends the board operation to the DataTug server, which authorizes it and persists the canonical board in the DataTug project. The observable good result is a server-confirmed saved revision; failure leaves the prior durable revision intact and the unsaved edit recoverable.
5. Nobody else needs to act. The author can close the tab, reopen the board from the project, and see the saved layout and query binding. DataTug executes the binding for the current authorized session and Dashboardius renders the new runtime result. The observable good result is the same durable card definition with data obtained from a new authorized execution, not restored from demo or browser state.
6. The author grants an existing colleague access to the standalone DataTug project through DataTug's project-sharing mechanism and sends the board link. The colleague opens it under their own principal. The observable good result is the same saved board revision with results filtered to that colleague's permissions.
7. The colleague changes no board settings. The author refreshes and still sees the same saved revision; a viewer opening a board is not a write. The observable good result is stable board state with independently authorized runtime results.

### Divergent epilogues

- **Close and resume:** the author closes every Dashboardius tab and later reopens the board from DataTug. The durable board and binding reappear, and a fresh authorized execution populates the card.
- **Share, replay and revoke:** the colleague opens the shared board, refreshes its query result, and then loses access after the project grant is revoked. The prior board and query metadata are no longer disclosed to that principal.

### Ownership boundary

| Concern | Owner | Required behavior |
|---|---|---|
| Project, saved queries, sources and environments | DataTug | Supplies stable identities and resolves them inside one standalone DataTug project. |
| Board schema and durable serialization | DataTug | Defines the canonical JSON contract and persists it through DataTug's existing project storage and Git-backed mechanisms. |
| Query execution and access control | DataTug | Executes every bound query through its server and applies the current viewer's project grant and source policies. |
| Card, chart/table and layout presentation | Dashboardius | Maps durable widget settings plus a runtime result into the board UI. |
| Rearrangement, removal, hidden metrics, Undo/Reset and prompt-to-action editing | Dashboardius | Maintains reversible editing state and submits an explicit canonical board mutation on Save. |
| Authentication and project grants | DataTug platform boundary | Produces the principal used by the DataTug server; Phase 4 supplies the project-grant behavior consumed here. Dashboardius does not grant itself source access. |

Dashboardius MUST NOT become a second query engine, project store, access-control service or Git client for DataTug project assets. It MUST use DataTug's server APIs for board reads/writes and query execution. DataTug's own web UI does not build boards in Phase 1. That phase boundary does not settle whether a shared Dashboardius renderer may later be embedded in DataTug.

### Durable binding and runtime result

A saved card MUST contain a durable reference or binding that DataTug can resolve after every browser tab is closed. It MUST NOT treat returned rows, aggregates, durations or policy limitations as the authoritative saved query definition. Runtime results may be cached only under an explicit DataTug cache policy; a cache is never the sole durable board content.

The exact durable shape for a SQL widget remains an open product decision below. Until it is resolved in the DataTug dashboards Feature, an implementation MUST NOT invent `db`, `environment`, inline SQL or query-reference fields in Dashboardius.

### Cross-language contract

Dashboardius MUST consume the published DataTug board-model package rather than maintain another durable model copy. A versioned fixture containing every canonical board, row, card and widget field MUST:

- decode and validate in `datatug-core`;
- load and save through the real DataTug project store without losing or inventing fields;
- decode in the published TypeScript package and in Dashboardius;
- preserve the canonical JSON shape after a Dashboardius edit and a Go load/save cycle.

Dashboardius presentation state MAY wrap a canonical board with view-only row keys, grid-engine selection and runtime results. Those fields MUST NOT leak into the persisted board unless DataTug first adds them to the canonical contract. Dashboardius-specific widget kinds MUST use a DataTug-owned extension boundary that the Go validator can preserve; merely adding a new widget name in Dashboardius does not make it a valid DataTug board.

### Failure and permission behavior

- A failed save leaves the previous durable revision unchanged and keeps the local edit visibly unsaved so the author can retry or copy it.
- A failed execution leaves the card definition intact and shows an actual error or limitation; it never substitutes demo rows.
- A viewer without board access receives a non-disclosing denial.
- A viewer allowed to read the board but denied a bound source sees the card shell and an access-limited state only when DataTug's policy permits that board metadata to be disclosed.
- Concurrent saves MUST detect revision conflict or use DataTug's documented merge behavior; last-writer-wins is not assumed.

## Acceptance Criteria

### AC: real-query-becomes-card

**Given** an author can execute a saved query in an authorized DataTug project
**When** they add that result to a board and choose a Dashboardius presentation
**Then** the preview identifies the saved query, effective parameters and presentation separately from the runtime rows, and no demo data or intercepted response is used.

### AC: board-save-reload

**Given** a query-backed card with all required binding choices resolved
**When** the author saves, closes the browser state, and reopens the board
**Then** the DataTug server returns the same canonical board revision and Dashboardius obtains the card's data through a fresh authorized execution.

### AC: authorized-colleague-reopens

**Given** the author has granted a colleague access to the standalone DataTug project
**When** the colleague opens the saved board link under their own principal
**Then** they see the same board revision and only the rows, columns and limitations their principal is authorized to receive.

### AC: revoked-colleague-is-denied

**Given** a colleague previously opened the shared board
**When** the author revokes the colleague's project grant and the colleague reloads
**Then** DataTug denies access without Dashboardius recovering the board or result from browser/demo state.

### AC: no-action-does-not-mutate

**Given** a saved board is open by the author and colleague
**When** neither person edits or saves it and each refreshes a query result
**Then** the durable board revision does not change and each runtime result is authorized independently.

### AC: cross-language-round-trip

**Given** the canonical fixture covers every board, row, card and widget field supported by the milestone
**When** it passes through TypeScript decode, a Dashboardius edit, DataTug server persistence, Go decode/validate/encode and TypeScript decode again
**Then** every durable field is preserved, every view-only/runtime field is excluded, and no unsupported widget kind or row identifier is required for persistence.

### AC: save-failure-is-recoverable

**Given** the author has an unsaved board edit and the DataTug server rejects or cannot persist it
**When** Save finishes with an error
**Then** the prior durable revision remains current, the edit remains available and marked unsaved, and the UI offers retry without reporting success.

### AC: no-duplicate-data-platform

**Given** Dashboardius has no independent project store or query executor
**When** the complete journey is run in a real browser
**Then** network and persistence evidence shows all board reads/writes and query executions crossing the DataTug server boundary.

## Not Doing / Out of Scope

- Boards in the DataTug Phase 1 implementation wave.
- A separate Dashboardius database, warehouse, query engine, project store or Git persistence path.
- Persisting the current scripted demo board as if its invented values were real data.
- Real-time collaborative editing, public links, embedding policy, billing or production model-generated editing.
- Choosing the durable SQL widget binding shape without the founder decision recorded in the DataTug dashboards Feature.

## Open Questions

- **How is a board SQL widget bound to an executable DataTug query and target?** This remains open in the owning cross-product [DataTug dashboards Feature](https://github.com/datatug/datatug/blob/main/spec/features/dashboards/README.md). The live alternatives are a library-query reference, a board-level target inherited by widgets, or a widget-level database with environment selected at view time. This Dashboardius Feature deliberately does not choose among them.
- What conflict and merge behavior should DataTug expose when two authors save the same board revision? This does not block a single-author milestone, but the API must reject silent overwrites before colleague editing is enabled.

---
*This document follows the https://specscore.md/feature-specification*
