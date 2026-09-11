---
format: https://specscore.md/plan-specification
status: Draft
---

# Plan: Deliver the query to card to colleague journey

**Status:** Draft
**Source Feature:** query-backed-board-persistence
**Date:** 2026-09-09
**Owner:** Dashboardius
**Supersedes:** —

## Summary

This plan delivers the DataTug roadmap's Phase 5 Dashboardius persistence milestone: one real query → one card → save → reload → authorized colleague journey without replacing Dashboardius's useful presentation work or duplicating DataTug execution and storage. It begins with the unresolved binding decision and canonical contract, then integrates the DataTug server boundary, Dashboardius editing state and real browser acceptance. DataTug Phase 4 project grants are a prerequisite for the colleague and revocation acceptance.

## Approach

Treat the existing Dashboardius board as a presentation prototype and keep its reducers, widget rendering, stable metric slots, table alternatives, Undo/Reset and honest scripted labeling. Define and prove the durable cross-language contract before wiring persistence. DataTug remains the only project store, query executor and access-control boundary; Dashboardius maps a canonical saved board plus ephemeral runtime results into its UI. The milestone does not start production implementation until the SQL widget binding decision is recorded in the DataTug dashboards Feature.

## Tasks

### Task 1: Resolve the SQL widget binding decision in the owning Feature

**Id:** task-1
**Verifies:** query-backed-board-persistence#ac:real-query-becomes-card
**Depends-On:** —
**Status:** planning

Present the three recorded alternatives with one concrete serialized example each, including how project, saved-query identity, source target, environment and parameters resolve. Record the founder's choice in the DataTug dashboards Feature and update its acceptance criteria. Do not infer a choice from the current inline SQL prototype.

### Task 2: Publish and prove the canonical board contract

**Id:** task-2
**Verifies:** query-backed-board-persistence#ac:cross-language-round-trip
**Depends-On:** 1
**Status:** planning

Finish the DataTug board-model package and Go contract as one change set. Include board parameters and required parameters, every embedded project-item field, row min/max height, cards and the chosen widget binding. Define an extension boundary that preserves Dashboardius presentation widget kinds without letting them execute data. Add a full fixture and a real Go project-store load/save round trip. Decide how presentation reducers identify rows without persisting Dashboardius's current noncanonical row `id`.

### Task 3: Replace Dashboardius's durable-model copy

**Id:** task-3
**Verifies:** query-backed-board-persistence#ac:cross-language-round-trip
**Depends-On:** 2
**Status:** planning

Consume the released DataTug board-model package. Separate the canonical board from Dashboardius view state: runtime results, row view keys, grid engine, command trace and unsaved history stay outside the persisted document. Adapt the existing reducers and widgets rather than rewriting their presentation behavior. Remove compatibility claims and the local durable-model copy once the consumer tests pass.

### Task 4: Add DataTug board read/write and execution APIs

**Id:** task-4
**Verifies:** query-backed-board-persistence#ac:board-save-reload, query-backed-board-persistence#ac:no-duplicate-data-platform
**Depends-On:** 2
**Status:** planning

Implement authorized board read/write through the existing DataTug project storage and Git-backed mechanism. Add revision/conflict metadata, validation, and the chosen query-binding execution route. Apply project grants and source policies on every read, write and execution. Return durable board data separately from runtime results and limitations. Do not add a Dashboardius backend or direct Git path.

### Task 5: Connect the real query-to-card and save experience

**Id:** task-5
**Verifies:** query-backed-board-persistence#ac:real-query-becomes-card, query-backed-board-persistence#ac:save-failure-is-recoverable
**Depends-On:** 3, 4
**Status:** planning

Start from a real DataTug saved-query result. Let the author select or create a board, choose a Dashboardius presentation, inspect/correct bindings and save. Disable Save while a required target or parameter is unresolved and while a save is in flight. Preserve and mark local edits after a failed save; clear the unsaved state only after the server confirms the durable revision. Retain the scripted demo as an explicitly separate demonstration mode.

### Task 6: Load and refresh a saved board

**Id:** task-6
**Verifies:** query-backed-board-persistence#ac:board-save-reload, query-backed-board-persistence#ac:no-action-does-not-mutate
**Depends-On:** 4, 5
**Status:** planning

Open the saved board through its DataTug project identity, render its persisted presentation settings, and execute its binding for the current session. Prove that closing browser state removes runtime data without losing the saved board, and that refreshing data does not mutate the board revision. Render actual errors and limitations without falling back to demo results.

### Task 7: Prove colleague access and revocation

**Id:** task-7
**Verifies:** query-backed-board-persistence#ac:authorized-colleague-reopens, query-backed-board-persistence#ac:revoked-colleague-is-denied
**Depends-On:** 6
**Status:** planning

Use two real principals and the DataTug Phase 4 project-grant mechanism. The author saves and shares the board; the colleague opens the same revision and receives a separately policy-filtered runtime result. Revoke the grant and prove that reload is denied without cached board or result disclosure.

### Task 8: Run the complete browser and persistence journey

**Id:** task-8
**Verifies:** query-backed-board-persistence#ac:real-query-becomes-card, query-backed-board-persistence#ac:board-save-reload, query-backed-board-persistence#ac:authorized-colleague-reopens, query-backed-board-persistence#ac:revoked-colleague-is-denied, query-backed-board-persistence#ac:no-action-does-not-mutate, query-backed-board-persistence#ac:cross-language-round-trip, query-backed-board-persistence#ac:save-failure-is-recoverable, query-backed-board-persistence#ac:no-duplicate-data-platform
**Depends-On:** 2, 7
**Status:** planning

Run the journey from its real product entry point with the released companion revisions pinned. Use no intercepted backend responses, local-only dependency substitutions, demo recordsets or deep links that skip the query-to-card transition. Capture the DataTug project file/revision, server request evidence and both principals' observable results. Required CI fails when the real services or two-principal fixture are unavailable.

## Open Questions

- ~~Task 1 is a decision gate: which SQL widget binding alternative should DataTug adopt?~~
  Ruled by the founder 2026-09-09 (verbatim: *"I'm Ok with the suggested option 1"*): a SQL
  widget references a library query by `queryId` plus parameter bindings and carries no query
  text or execution target; recorded in the hub `dashboards` Feature and this repository's
  `query-backed-board-persistence` Feature. Task 1's remaining work is only to reflect the
  ruling in this plan's acceptance references. Since 2026-09-11 the Dashboardius shell is rebuilt in Ionic as the `dashboardius` profile of
  the single app in `datatug/datatug-apps` (founder: *"one configurable app."*), with the
  renderer's leaf widgets shared; the cutover is owned by the hub `product-profiles` Feature.
- Before colleague editing is enabled, should conflicts be rejected for explicit reload/merge, or should DataTug provide a structured board merge?

---
*This document follows the https://specscore.md/plan-specification*
