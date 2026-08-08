# FlowMe R0 Behavior-Preserving Architecture Refactor

**Date:** 2026-08-06

**Status:** Published in Draft PR #168; merge and production deployment not requested

**Baseline:** `6612c4a344a8dbd24d087d50883d480b5be45397`

**Branch:** `codex/r0-behavior-preserving-architecture-refactor-20260806`

## Goal

Reduce the concentration of route rendering and Calendar calculation inside
`components/flow/AppClient.tsx` without changing the P35 Round 2 product
contract. R0 defines broad responsibility boundaries, then moves only small,
independently testable slices.

> Design the large boundaries first; move code in small, reversible slices.

## Result

R0 completed the approved first architecture slice:

1. characterized the existing Calendar calculations;
2. moved the pure Calendar view-model into `lib/flow/`;
3. moved Calendar route-owned rendering into a typed route surface;
4. moved My Flow route-owned rendering into a separate typed route surface;
5. retained `AppClient.tsx` as the compatibility facade and runtime controller.

No persistence, artifact, route, copy, DOM-contract, or product capability was
intentionally changed.

## Current Problem And R0 Response

| Before R0 | R0 response | Still deferred |
| --- | --- | --- |
| `AppClient.tsx` owned route rendering, state/effects, commands, and Calendar calculations | Move deterministic Calendar calculations and the two large route-owned rendering trees behind typed boundaries | Move runtime controllers only after their action/state contracts become smaller |
| Calendar and My Flow shared one very large runtime body | Give each route a distinct surface model, actions, and bounded leaf renderers | Split My Flow into library, execution, edit, lifecycle, and transfer controllers |
| Data modules combine several aggregates | Record ownership and dependency direction without changing persistence | Split `storage.ts` and `source-backed-my-flow.ts` behind compatibility facades |
| Result transfer has current and legacy paths | Preserve the current effective request/effect/receipt contract | Isolate legacy artifact adapters by destination family |

## Product-Surface Ownership

| Surface | Owns | Reads or delegates | Must not own |
| --- | --- | --- | --- |
| Flow discovery and intake | URL/memo input, lookup and catalog presentation, draft acceptance | Source catalog, canonical identity, public-save command | Saved execution, receipts, Calendar state |
| Public Flow before save | Temporary adjustment, result preview, save decision | Effective projection, save transaction, artifact eligibility | My Flow completion, persistent receipt, source mutation |
| My Flow | Saved library/workspace presentation, personal execution entry, lifecycle and transfer entry | Canonical source, personal/execution records, commands owned by the runtime controller | Published-source edits, a separate Calendar copy of saved data |
| Calendar | Date-first presentation, scope, selected date and derived groups | Effective My Flow rows and existing completion/open commands | A second plan store, structural authoring, independent completion state |
| Result transfer and receipt | Immutable request, artifact effect, outcome, receipt after success | Effective manifest, codecs and receipt repository | Source mutation, UI navigation, receipt before successful effect |
| Authoring and review | Draft authoring, creator/review contracts, unpublished evidence | Domain contracts and source policy | Personal execution or observed-user claims |

Calendar is a route and presentation owner, not a data owner. Its data remains a
derived lens over My Flow's saved and effective execution state.

## Shared-Layer Data Ownership

| Layer | Owns | May depend on | Must not depend on |
| --- | --- | --- | --- |
| Domain and canonical identity | Flow, Item, stable IDs, aliases, effective row contracts | Base types and pure utilities | React, routes, browser storage |
| Source catalog and policy | Source-backed definitions, review and publish eligibility | Domain identity | Personal writes and receipts |
| Personal and execution records | Saved plan/map, overlays, occurrence, completion, run and lifecycle records | Domain identity and storage ports | Source mutation and React |
| Effective projection | Included/excluded rows, counts and format eligibility | Normalized source, personal and execution inputs | Browser storage and UI state |
| Persistence | Keys, codecs, write lock, declared-key transactions, rollback and recovery | Domain record contracts and storage port | React and route composition |
| Application commands | Save, edit, reuse, delete, reconcile and transfer ordering | Domain, persistence, artifact/effect ports | JSX rendering |
| Artifact generation | Calendar, checklist/todo, sheet and memo results | Effective manifest and pure codecs | Browser storage and route state |

## Implemented Dependency Direction

```text
AppClient compatibility facade and runtime controller
  -> MyFlowRouteSurface(model, actions, leaf renderers)
  -> MyFlowCalendarRouteSurface(model, actions, execution-row renderer)
  -> my-flow-calendar-view-model(plain readonly DTOs)

route pages -> existing AppClient named exports
storage / source-backed / result transfer -> unchanged
```

New R0 modules do not import `AppClient.tsx`. The pure Calendar view-model does
not import React, DOM APIs, browser storage, or UI-owned saved-flow types.
Adapters keep the original row object alongside the narrow DTO and return that
original object to rendering, so DTO-only fields cannot leak into saved or
exported data.

## Preserved Contracts

- Existing visible UI, user copy, routes, query semantics and named route
  exports.
- Browser Back behavior, focus/scroll restoration, test IDs and accessibility
  names covered by current regressions.
- Every localStorage key, JSON shape, raw value, feature flag and rollback path.
- Global write-lock, compare-before-write, rollback and recovery behavior.
- Source, personal overlay, execution, occurrence, artifact request and receipt
  identity boundaries.
- Stable Flow and Item IDs, projection partitions, counts and exclusion rules.
- Receipt persistence only after a successful local result effect.
- Existing Calendar/checklist/todo/sheet/memo result behavior.

## Non-Goals

- UI/UX or copy redesign, including Flow terminology.
- Storage migration, schema or canonical-model redesign.
- Text-to-Flow integration or any new feature.
- Immediate deletion of compatibility or legacy code.
- Broad duplicate cleanup, dependency upgrades or folder renaming.
- Production deployment or observed-user validation.

## Deferred Sequence

1. Decide whether the R0 boundaries are sufficient for the next MVP work.
2. If justified, extract route controllers one bounded use case at a time.
3. Extract record contracts and aggregate reads behind `storage.ts`; move writes
   only with transaction and recovery equivalence tests.
4. Split `source-backed-my-flow.ts` into contracts, catalog, policy, saved-copy
   projection and publish-package modules behind its facade.
5. Isolate legacy artifact adapters while retaining the effective transfer
   request/effect/receipt path.
6. Refine My Flow internally only after the route boundary has remained stable.

Every deferred item requires a new approved slice. R0 completion does not
authorize any of them automatically.

## Completion Criteria

- Responsibility and data ownership have one primary owner per state class.
- Calendar calculation is deterministic and separately characterized.
- Calendar and My Flow route rendering have separate typed boundaries.
- `AppClient` remains compatible while no new module imports back from it.
- Each change can be reverted without data migration.
- Targeted tests, lock contract, full tests, production build and browser
  regressions pass in the implementation worktree.
- Local edits, Git publication, deployment, production smoke and observed-user
  evidence are reported as separate states.
