# Public Plan Surface Unification

- **PR:** Pending
- **Date:** 2026-08-12 KST
- **Branch:** `codex/public-surface-unification-20260812`
- **Status:** Draft
- **Base:** `origin/main` at `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`
- **Candidate commit / PR head:** Pending
- **Deployment:** Pending

## Why

Plan discovery exposed two public product generations. Direct `/f/[slug]`
routes used the approved Text/Todo/Calendar result grammar, while executable
`/flow-maps/[map]` routes still used the legacy saved-list shell. The visible
experience therefore depended on content packaging and `saveMode`, even though
both routes belonged to the same plan-discovery journey.

## What Changed

- Added one public share shell and one approved result preview for executable
  Flow and Flow Map routes.
- Added a pure Flow Map result adapter that preserves Map owner identity,
  canonical child IDs, source version, and snapshot hash without turning a Map
  into a synthetic persisted Flow.
- Kept `save_all` on the existing atomic Map transaction and made
  `choose_child` select one child preview and continue to its `/f/[slug]` route.
- Bound Calendar preview and save to one controlled anchor and persisted the
  selected Text/Todo/Calendar destination to child records.
- Preserved review-hold and redirect boundaries and restored the full legacy
  Map shell, actions, anchor behavior, and preview under exact
  `visualSubtraction=off`.
- Added focused unit, responsive public-surface, rollback, and full-repository
  regression coverage and updated current route/component ownership docs.

## Not Done

- No storage key, schema, migration, API route, dependency, lockfile, account,
  cloud-sync, creator-review, or review-hold policy change.
- No commit, push, PR, CI, merge, Production deployment, or canonical smoke is
  claimed at this pre-open checkpoint.
- No observed-user session was run; the count remains `0`.

## Decisions

- `saveMode` chooses selection and persistence behavior, not the public UI
  generation or app shell.
- Shared presentation reads canonical Flow or Map data but never owns their
  persistence identity.
- Review-held Maps remain non-executable, and query-only rollback paths retain
  their existing storage bytes and independent behavior.
- Release evidence is recorded only after the exact commit, CI, merge,
  deployment, and production smoke states exist.

## Important Files

- `components/flow/PublicPlanShareShell.tsx`
- `components/flow/PublicPlanResultPreview.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveExperience.tsx`
- `components/flow/SourceBackedFlowMapChooseChildExperience.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `lib/flow/effective-flow-map-result.ts`
- `tests/e2e/public-plan-surface-unification.spec.ts`
- `docs/specs/2026-08-12-public-plan-surface-unification/`

## Verification

| Check | State |
| --- | --- |
| Security audit | `PASS` — high/critical vulnerabilities `0` |
| Unit/contract | `PASS` — pretest `173/173`, main `622/622`, approved `182/182`, public-surface `8/8` |
| Production build | `PASS` — `18/18`, BUILD_ID `bzdhR-nY_afpTfx_xDZ7e` |
| Public-surface browser | `PASS` — `9/9`, four widths, storage/runtime/quality diagnostics clean |
| Map rollback/copy browser | `PASS` — `24/24` |
| Full Playwright | `PASS` — `578/578`, `74` files, workers `2`, retries `0`, unexpected/skipped/flaky `0` |
| Documentation | `PASS` — `16` required files and `4,510` local links |

## Publication Evidence

| Evidence | State |
| --- | --- |
| Candidate commit | `PENDING` |
| Push / PR | `PENDING` |
| Exact-head PR CI | `PENDING` |
| Merge SHA | `PENDING` |
| Post-merge main CI | `PENDING` |
| Vercel Production deployment | `PENDING` |
| Canonical production smoke | `PENDING` |
| Observed-user validation | `0` |

## Risks And Rollback

- The main risk is presentation/controller drift across Flow, `save_all`, and
  `choose_child`; the focused and full browser suites cover those boundaries.
- Exact `visualSubtraction=off` and `savedPlanLibrary=off` remain the bounded
  presentation rollback paths.
- Revert the publication commit to restore the prior default public Map
  composition. No data migration or recovery operation is required.

## Follow-ups

- Open the PR, verify exact-head CI, merge only when required checks are green,
  then bind the exact merge SHA to the Production deployment and run canonical
  smoke.
- Keep external integrations and observed-user study work separate from this
  release.

## Links

- [Specification](../specs/2026-08-12-public-plan-surface-unification/spec.md)
- [QA evidence](../specs/2026-08-12-public-plan-surface-unification/qa.md)
- [Current status](../STATUS.md)
- [Current roadmap](../ROADMAP.md)
