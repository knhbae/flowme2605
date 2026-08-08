# R2 My Flow Library Controller Tasks

## Baseline

- [x] Confirm branch, HEAD, upstream, and pre-existing R0/R1 dirty scope.
- [x] Reproduce stale Item detail after query -> list -> same Plan reopen.
- [x] Map query/filter setters, transient detail cleanup, and dirty edit guard order.
- [x] Confirm the existing R2 trigger and excluded scope in the R1 plan.

## Pure Boundary

- [x] Add history-level parsing and history-state construction to the pure controller.
- [x] Add list/Plan/Item transition actions and explicit reset/discard effects.
- [x] Add unit tests for direct entry, history ordering, route sync, scroll, and focus requests.
- [x] Prove the pure module has no React, DOM, browser, storage, export, or AppClient dependency.

## Adapter And Regression Fix

- [x] Connect query/filter transitions only after their dirty guard succeeds.
- [x] Preserve one pending control intent across the existing discard confirmation.
- [x] Clear selected Plan, workspace target, and transient Item detail atomically on list transition.
- [x] Connect Plan, Item, return, item-back, and popstate decisions without changing effect order.
- [x] Add Item resurrection and dirty editor query/filter E2E coverage.
- [x] Guard cross-Flow completion-notice navigation and preserve its exact post-apply continuation.
- [x] Collapse cross-Flow Item history to list -> owning Plan -> Item.

## Verification

- [x] Run docs and deterministic pure/controller tests.
- [x] Run AppClient lock and full unit/contract suites.
- [x] Run production build and selected saved-plan/Calendar E2E.
- [x] Run full Playwright and 390/1024/1440 browser quality inspection.
- [x] Inspect the scoped diff, publish state, and residual risk separately.

## Publication

- [x] Commit the R0-R2 implementation and QA blockers in separate reviewable commits.
- [x] Push `codex/r0-behavior-preserving-architecture-refactor-20260806`.
- [x] Open [Draft PR #168](https://github.com/knhbae/flowme2605/pull/168).
- [ ] Merge, production deployment, production smoke, and observed-user validation.
