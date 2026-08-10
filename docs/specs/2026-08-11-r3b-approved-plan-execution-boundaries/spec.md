# R3B Approved Plan Execution Boundaries

## Status

Owner-approved for implementation, publication, merge, and production deployment on 2026-08-11.

## Goal

Implement the Owner-approved 2026-08-10 plan-execution UX on the R3A base, then
preserve that approved candidate while moving selected Plan execution
composition and transfer request planning out of
`components/flow/AppClient.tsx` behind typed boundaries.

This PR has two ordered deltas:

1. The approved product delta changes composition, copy, and DOM only where the
   hashed 2026-08-10 product contract requires it.
2. The R3B architecture delta is behavior-preserving against that approved
   candidate and must not introduce additional UX, persistence, identity,
   artifact-byte, receipt-order, or rollback drift.

## Baseline evidence

- Base: `origin/main` at `14014bf3872c5587ee9ebbc8d8936aee2d754ec4`.
- `AppClient.tsx`: 28,565 physical lines and about 1.31 MB before R3B.
- `MyFlowRuntime`: about 16,019 lines with route, focus, edit, completion,
  lifecycle, and transfer orchestration sharing one compatibility owner.
- The approved UX already has pure sort, date grouping, raw memo, transfer
  codec, Calendar controller, and typed route surfaces. R3B must reuse them.

## Canonical product input

The approved 2026-08-10 product documents were read from the user-owned dirty
`D:\flowme2605\flow-mvp` checkout and were not copied or rewritten in this clean
worktree. Their repo-relative paths and source SHA-256 values fix the
implementation input without taking ownership of that separate user-owned
approved source set:

- `docs/specs/2026-08-10-approved-plan-execution-ux/spec.md`:
  `837ac856f49bdd192c993600a93d7e1af0e1dde73e5c40d91994c544e73b80f7`
- `docs/specs/2026-08-10-approved-plan-execution-ux/plan.md`:
  `b4d387d950b100e751452c8b82897fe9677ccf4ac6fd5782b8b6946a6dddcd9a`
- `docs/specs/2026-08-10-approved-plan-execution-ux/tasks.md`:
  `4e2045eb2a544659e96f9ec37f09ce19e9a5263ba29bd22f39110eec97e42d3b`
- `docs/specs/2026-08-10-approved-plan-execution-ux/qa.md`:
  `daaa571727ef10ee37dfa2e87610fd632884aed244560191f66053be24d50ef7`
- `docs/specs/2026-08-10-approved-plan-execution-ux/development-kickoff-prompt-ko.md`:
  `2ab3a2020df8380390b309a595555494a0dcd54e204450232ce8a93b7a2ccc0b`
- `docs/content-audit/2026-08-10-production-before-after-wireframe-input-review/07-final-development-handoff-ko.md`:
  `fc1ac8c4ebacc7f768830f94b3c645487a3c6562221a58af69a0ba18e0856e47`
- `docs/content-audit/2026-08-10-production-before-after-wireframe-input-review/10-approved-development-wireframes.html`:
  `8e47b97bd3eaea3d3bc6fbaad2f88ed8c6870f79d9d88b8be70ea92a60ec9682`

These path-and-hash records preserve local provenance; they do not make the
user-owned source set independently reviewable from this PR. The 47-file linked
closure remains excluded from this product PR because its dirty ownership was
not transferred.

## Scope

1. Implement the hashed approved product contract across public preview,
   My Plan, Calendar, responsive composition, contextual help and warnings,
   duplicate-copy display, raw memo/checklist handling, and export scope.
2. Reuse shared sort, date-grouping, raw-memo, responsive, and export-scope
   mappings instead of creating content-specific data owners.
3. Extract the approved selected-Plan workspace JSX into a typed
   `MyPlanExecutionSurface` model/action boundary.
4. Create a pure approved saved-transfer controller for immutable request
   planning and revalidation decisions. Browser artifact effects and receipt
   persistence remain explicit ports owned by the runtime adapter.
5. Characterize Item detail/editor presentation coupling, but stop this PR's
   extraction if a narrow model/action surface cannot be introduced without
   moving storage or mutation ownership.
6. Migrate stale URL-first browser journeys to either the current approved
   surface or an explicit rollback lane so repository CI remains meaningful.
7. Publish the implementation with updated ownership documentation and full
   release evidence.

## Required dependency direction

```text
lib/flow pure contracts and controllers
  -> components/flow focused surfaces and runtime ports
  -> AppClient compatibility facade
  -> Next route shells
```

Pure modules must not import React, DOM, browser storage, route components, or
`AppClient`.

## Contracts the R3B extraction must not further change

- The user-visible copy, DOM order, test IDs, accessibility names, 48px targets,
  and responsive composition fixed by the hashed approved product contract.
- `sort=next|saved|name`, browser Back, scroll, and focus restoration.
- Every existing localStorage key, raw JSON value, write lock, transaction,
  rollback, recovery journal, and feature-flag behavior.
- Source, personal overlay, execution, occurrence, artifact request, and
  receipt identities.
- Public result formats remaining Text, Todo, and Calendar only.
- Saved transfer remaining TXT, VTODO, VEVENT, and XLSX, with receipt storage
  only after a successful local effect.
- `savedPlanLibrary=off` rollback and existing route exports through
  `AppClient`.

## Non-goals

- Whole `AppClient` rewrite or global state-library adoption.
- Storage/schema migration, identity rewrite, or data-model redesign.
- Public and personal state merging.
- Text-to-Flow integration, dependency upgrades, or new product capability.
- Bulk legacy deletion or broad folder renaming.

## Completion criteria

- New boundaries have narrow typed inputs/actions and no import cycle back to
  `AppClient`.
- The selected Plan surface and transfer planning are independently unit tested.
- Targeted tests, full unit, production build, docs, and full Playwright CI pass.
- Approved 11-width browser matrix, storage-write-zero, export byte/parse, and
  rollback evidence remain green.
- The PR is merged and the resulting commit is deployed to Vercel Production
  with canonical-alias smoke evidence.
- Automated QA is reported separately from observed-user validation, which
  remains `0` unless new human evidence is supplied.
