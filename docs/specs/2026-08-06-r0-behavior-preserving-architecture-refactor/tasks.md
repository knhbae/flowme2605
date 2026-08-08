# R0 Task Ledger

## Done In This Local Worktree

- [x] R0-00 created an isolated clean worktree and recorded baseline
  `6612c4a344a8dbd24d087d50883d480b5be45397`.
- [x] R0-00 reran baseline docs, lock, unit, build and representative browser
  checks before implementation.
- [x] R0-01A added Calendar characterization for empty/boundary/scope/partition,
  ordering/grouping, marker, count and focus behavior.
- [x] R0-01B added `lib/flow/my-flow-calendar-view-model.ts` and replaced the
  corresponding inline calculations through a narrow adapter.
- [x] R0-01B preserved raw marker keys after an independent ownership audit
  identified whitespace normalization as a compatibility risk.
- [x] R0-02A added `components/flow/calendar/MyFlowCalendarRouteSurface.tsx`.
- [x] R0-02B added `components/flow/my-flow/MyFlowRouteSurface.tsx`.
- [x] Existing `AppClient` route exports and runtime orchestration were retained.
- [x] `storage.ts`, `source-backed-my-flow.ts`, result transfer, copy, storage
  formats and feature flags were left unchanged.
- [x] Responsibility, dependency, risk and verification documents were updated.

## Closeout Checks

- [x] Final docs check.
- [x] Final lock-contract test.
- [x] Final full unit test suite.
- [x] Final production build.
- [x] Final full Playwright suite.
- [x] Final scoped diff and whitespace inspection.
- [x] Manual representative viewport inspection at 390, 1024 and 1440.

These boxes reflect checks run in this worktree. Detailed commands and counts
are recorded in [qa.md](./qa.md).

## Deferred; Not Part Of R0

- [ ] Move My Flow or Calendar controller state/effects out of `AppClient`.
- [ ] Split storage aggregates, writes, locks or recovery.
- [ ] Split source-backed contracts/catalog/policy/projection.
- [ ] Move transfer or receipt orchestration.
- [ ] Remove legacy artifact code or compatibility facades.
- [ ] Redesign UI/copy or integrate Text-to-Flow.

## Owner Decision After Local Completion

- [ ] Review the scoped R0 diff and verification summary.
- [ ] Separately authorize commit/push/PR if the local result should be
  published to GitHub.
- [ ] Separately authorize preview or production deployment if needed.
- [ ] Decide whether to stop at R0 for the MVP or promote one new bounded
  refactor slice.
