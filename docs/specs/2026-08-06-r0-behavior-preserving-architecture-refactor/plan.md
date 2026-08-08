# R0 Implementation Plan And Gates

## Sequence

| Step | Change | Blast radius | Reversal boundary | Gate |
| --- | --- | --- | --- | --- |
| R0-00 | Freeze a clean baseline and current contracts | None; evidence only | Delete isolated worktree | Existing docs, lock, unit, build and representative browser checks pass |
| R0-01A | Characterize Calendar dates, partitions, ordering, grouping, counts, marker identity and focus | Tests only | Remove the new test | Tests describe current behavior without runtime edits |
| R0-01B | Extract pure Calendar view-model and adapt current rows at the controller boundary | Derived Calendar data | Restore inline calculations and remove module | Unit, lock, build and Calendar browser checks remain green |
| R0-02A | Extract Calendar route-owned JSX behind typed `model` and `actions` | Calendar presentation | Restore prior JSX block and remove surface | Calendar DOM, navigation, completion and scope regressions remain green |
| R0-02B | Extract My Flow route-owned JSX behind typed `model`, `actions` and bounded leaf renderers | My Flow presentation | Restore prior JSX block and remove surface | Library, detail, history, completion, memo, archive and flag regressions remain green |
| R0-03 | Record ownership and run full closeout verification | Documentation and evidence | Revert documentation only | Full docs, lock, unit, build and E2E matrix pass |

## R0-01 Detailed Contract

The pure module owns only:

- local date and month label/range calculations;
- scheduled, routine, held and unscheduled partitions;
- Flow-scope and month filtering;
- stable row sorting and date grouping;
- Flow marker and filter-option calculations;
- selected-date groups, open counts and compact-grid decisions;
- first/default focus date and date signatures.

It accepts plain readonly DTOs. `AppClient` owns the adapter from the existing
runtime row and keeps the original row reference for subsequent rendering and
commands.

The module must not own:

- React state, effects or JSX;
- FullCalendar callbacks;
- route, query, history, focus or scroll mutations;
- storage reads/writes, locks or recovery;
- completion/edit/transfer commands;
- user-facing copy.

## R0-02 Surface Contracts

### Calendar surface

Owns the existing route presentation for scope controls, the Calendar surface,
selected-day summary, overflow notes, Flow groups and empty state. It receives
typed state and callbacks. The existing runtime still owns all mutable state,
effects, FullCalendar callbacks, navigation, persistence and completion.

### My Flow surface

Owns the existing My Flow header, demo/utility menu, duplicate reconciliation,
local tabs, undo banner, empty state, post-save/workspace composition, desktop
library rail and mobile library/workspace branches. Complex existing leaf UI is
supplied through named renderers rather than an unrestricted `children` escape
hatch. The runtime still owns commands, state, recovery, route updates and
storage.

## Risk And Verification Map

| Risk | Prevention | Verification |
| --- | --- | --- |
| Date/month behavior changes | Characterize boundaries before moving logic | Calendar view-model tests and month/day E2E |
| Stored Flow marker identities merge | Preserve raw non-empty marker keys, including whitespace | Explicit marker-key characterization |
| DTO fields enter persisted/exported objects | Keep DTO wrapper private and recover original row immediately | Type boundary review, storage/export tests |
| Route/query/callback order changes | Keep controller callbacks in `AppClient`; surface only invokes them | Literal-route, Back, archive/filter browser tests |
| DOM/test IDs/ARIA drift | Move existing JSX without copy or structure redesign | Existing selector and accessibility regressions |
| Calendar creates a second data owner | Surface receives derived rows and existing commands only | Dependency audit and storage lock contract |
| Compatibility import break | Keep `MyFlows` and `MyFlowCalendar` exports in `AppClient` | Production build and literal route E2E |
| Hidden product expansion | No new state, copy, routes, formats or effects | Scoped diff review |

## Stop Rule

R0 stops after the two route surfaces and the pure Calendar view-model. Storage,
source-backed, result-transfer and legacy-artifact refactors remain deferred
until a new scope, owner approval and contract-specific evidence plan exist.
