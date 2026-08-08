# R0-R2 Behavior-Preserving Architecture Refactor Candidate

- **PR:** [#168](https://github.com/knhbae/flowme2605/pull/168)
- **Date:** 2026-08-08
- **Branch:** `codex/r0-behavior-preserving-architecture-refactor-20260806`
- **Status:** Draft
- **Implementation commits:** `1bc0868`, `b03779f`

## Why

`AppClient.tsx` combined large Calendar and My Flow presentation, transition, and
calculation responsibilities. The MVP needs reviewable responsibility boundaries before any
finer refactor, without changing the current product, storage, or result contracts.

## What Changed

- Extracted the pure Calendar view-model and a typed Calendar controller/hook.
- Moved Calendar and My Flow route presentation behind typed route surfaces.
- Added a pure My Flow saved-library list -> Plan -> Item transition planner.
- Fixed stale Item restoration after query/filter transitions and guarded dirty cross-Flow
  navigation while preserving current history, focus, and scroll contracts.
- Added deterministic unit, lock, and browser regression coverage.
- Kept the `/favicon.ico` fallback and the `nanoid` transitive security patch in a separate QA
  blocker commit so reviewers can assess them independently from the refactor.

## Not Done

- No UI/copy redesign, Flow terminology change, storage migration, export/receipt change,
  Text-to-Flow integration, R3 refactor, merge, or production deployment.
- Production smoke and observed-user validation were not run; observed-user sessions remain `0`.

## Decisions

- Publish only the completed R0-R2 candidate for review; do not start R3 automatically.
- Keep `AppClient.tsx` as the compatibility adapter until a later bounded slice is explicitly
  justified and approved.
- Treat the favicon fallback as QA hygiene and the `nanoid` update as a transitive lock-only
  security correction, not as product-scope expansion.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/calendar/`
- `components/flow/my-flow/`
- `lib/flow/my-flow-calendar-view-model.ts`
- `lib/flow/my-flow-calendar-controller.ts`
- `lib/flow/my-flow-library-controller.ts`
- `docs/specs/2026-08-06-r0-behavior-preserving-architecture-refactor/`
- `docs/specs/2026-08-06-r1-calendar-controller-boundary/`
- `docs/specs/2026-08-06-r2-my-flow-library-controller-boundary/`

## Verification

- Documentation: PASS, 16 required files and 4,471 local links before this publication update.
- Security audit: PASS, high-or-greater vulnerabilities `0`.
- Controller/view-model pretest: `153/153`.
- Full unit/contract suite: `615/615`.
- AppClient storage-lock contract: `59/59`.
- Production build: PASS, `18/18` generated pages.
- Current targeted Calendar/My Flow browser regressions: `20/20`.
- Prior final full Playwright on the unchanged R0-R2 code candidate: `542/542`.
- Independent publication audit: P0 `0`, P1 `0`; latest GitHub CI remains the merge gate.

## Risks And Follow-ups

- Dirty archive safely closes the edit after confirmation but requires the user to invoke archive
  again; automatic resume is a separate lifecycle decision.
- Review the narrow deferred-history callback race and browser Forward behavior for a previous
  Item before promoting another navigation refactor.
- Existing R2 QA also retains exact focus and direct-entry scroll follow-ups.

## Links

- [Draft PR #168](https://github.com/knhbae/flowme2605/pull/168)
- [R0 spec](../specs/2026-08-06-r0-behavior-preserving-architecture-refactor/spec.md)
- [R1 spec](../specs/2026-08-06-r1-calendar-controller-boundary/spec.md)
- [R2 spec](../specs/2026-08-06-r2-my-flow-library-controller-boundary/spec.md)
