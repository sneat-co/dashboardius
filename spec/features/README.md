---
format: https://specscore.md/features-index-specification
---

# Features

Feature specifications for this project.

## Index

| Feature | Status | Description |
|---------|--------|-------------|
| [Query-backed board persistence and sharing](query-backed-board-persistence/README.md) | Draft | A Dashboardius user turns a real, authorized DataTug query result into a card, saves the board through DataTug, reloads it, and shares it with an authorized colleague. The saved asset retains the query binding and presentation settings; DataTug executes the query and returns a runtime result whenever a viewer opens or refreshes the card. |
| [Incident and investigation dashboards](incident-dashboards/README.md) | Approved | During an incident, people want to see the problem, the diagnosis, the recovery and the watch period as pictures rather than as a column of numbers. This Feature is the Dashboardius half of that: incident-scoped boards assembled from a DataTug incident's own metrics and checks, a `metric-series` widget drawn from execution records, a comparison widget that renders a `compare` result, a resolution-criteria widget, and a replay board that shows what was known at a chosen moment. |

## Open Questions

None at this time.

---
*This document follows the https://specscore.md/features-index-specification*
