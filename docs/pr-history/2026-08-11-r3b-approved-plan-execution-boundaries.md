# R3B Approved Plan Execution Boundaries

- **PR:** [#172](https://github.com/knhbae/flowme2605/pull/172)
- **Date:** 2026-08-11 KST
- **Branch:** `codex/approved-plan-execution-ux-20260810`
- **Status:** Merged / deployed / canonical smoke requires Escape hotfix
- **Base:** `origin/main` at `14014bf3872c5587ee9ebbc8d8936aee2d754ec4`
- **Merge:** `a599370496ee95a52d14cddd27c94b0c8190a863`
- **Current deployed source:** `a599370496ee95a52d14cddd27c94b0c8190a863`

## Why

The Owner approved a concrete plan-execution UX contract and authorized its
implementation and release. The same product PR also needs bounded architecture
seams so continued UX and data experimentation does not keep expanding the
shared `AppClient` compatibility runtime.

The user-owned 2026-08-10 source set remains in the dirty `flow-mvp` checkout.
This PR records its exact paths and SHA-256 values in the [R3B spec](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md) without taking ownership of or importing its 47-file linked closure.

## What Changed

- Implemented the approved product delta for Plan ordering, date-grouped Todo,
  public Item preview, My Plan and Calendar composition, contextual help and
  warnings, duplicate-copy display, raw memo/checklist preservation, responsive
  surfaces, and saved export scope.
- Reused shared pure mappings across public preview, My Plan, and Calendar
  instead of creating content-specific persistence or conversion owners.
- Added `MyPlanExecutionSurface` as the typed selected-Plan composition boundary.
- Added a pure saved-transfer controller for immutable request construction and
  revalidation while leaving clipboard/download effects and receipt persistence
  in `AppClient`.
- Characterized Item detail/editor coupling and stopped its extraction rather
  than introducing a mega prop bag or duplicate view model.

## Not Done

- No storage key/schema/migration, identity rewrite, new export format, feature
  flag, Text-to-Flow integration, broad legacy deletion, or external account
  integration.
- The separate read-only Item detail extraction candidate is not promoted.
- Canonical release verification is not complete: the initial production smoke
  passed `21/23`, and both Escape failures require the bounded hotfix.
- No observed-user session was run; the count remains `0`.

## Decisions

- Treat the approved product delta from R3A and the behavior-preserving R3B
  architecture delta against that candidate as two ordered contracts.
- Keep public result controls non-mutating and keep personal completion,
  persistence, artifact effects, and receipts with their existing runtime owners.
- Treat R3B merge `a599370496ee95a52d14cddd27c94b0c8190a863` as the current
  deployed source, but do not claim canonical smoke PASS until the exact hotfix
  merge source passes the complete `23/23` re-smoke.
- Do not claim GitHub, merge, deployment, smoke, or observed-user evidence before
  it is actually observed.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/my-flow/MyPlanExecutionSurface.tsx`
- `lib/flow/saved-plan-transfer-controller.ts`
- `components/flow/DateGroupedTodoList.tsx`
- `components/flow/PublicFlowItemPreview.tsx`
- `components/flow/my-flow/MyFlowSortMenu.tsx`
- `lib/flow/date-grouped-todo-list.ts`
- `lib/flow/my-flow-local-ia.ts`
- `tests/e2e/approved-plan-execution-ux.spec.ts`
- `docs/specs/2026-08-11-r3b-approved-plan-execution-boundaries/`

## Verification

| Check | State |
| --- | --- |
| Canonical source hashes | `PASS` — `7/7` files match the SHA-256 values recorded in the R3B spec |
| Approved unit | `PASS` — `176/176` |
| Aggregate `npm.cmd run verify` | `PASS` — docs, full `npm test`, and production build |
| Full `npm test` | `PASS`, including the `verify` run |
| AppClient storage lock | `PASS` — `59/59` |
| Documentation | `PASS` — 16 required files / 4,492 local links after reconciliation |
| Security audit | `PASS` — configured findings `0` |
| Repository diff check | `PASS` — `git diff --check` exited `0` |
| Production build | `PASS` — `18/18`, BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Canonical browser gates | `PASS` — URL-first `20/20` plus approved E2E `23/23`, total `43/43` |
| Scoped migration evidence | `PASS` — overlapping targeted lanes include Group B `33/33`, P26 `40/40`, D1 `68/68`, P28-P31 `37/37`, P35 saved library `18/18`, Q3 `12/12` plus off-lane `7/7`, 50-Item `1/1`, legacy transfer `26/26`, and Calendar `2/2` |
| Full Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2`, exact BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Diff/ownership/rollback closeout | `PASS` — evidence PNGs restored to `HEAD`, generated `test-results-*` excluded, intended tracked/new-file closure confirmed, product P0/P1 `0` |
| Hotfix local verification | `PASS` — unit `182/182`, build `18/18` at BUILD_ID `wjpnPhhhMBaWzGTXuxK7U`, P26 `1/1`, targeted browser `3/3`, approved browser `23/23`, and full Playwright `569/569` with failures, skips, and flaky tests all `0` using workers `2` |

## Publication Evidence

| Evidence | State |
| --- | --- |
| PR URL and exact head | [PR #172](https://github.com/knhbae/flowme2605/pull/172), final head `b1106b6a319eb2ff5671be99ab446d68d6597f0b` |
| GitHub required CI | `PASS` — final PR head passed exact-head required checks; post-merge run [`31441290450`](https://github.com/knhbae/flowme2605/actions/runs/31441290450) also passed Docs, Unit, Build, and Playwright |
| Merge SHA | `a599370496ee95a52d14cddd27c94b0c8190a863` |
| Production deployment | `PASS` — GitHub deployment record `5841506853`, source `a599370496ee95a52d14cddd27c94b0c8190a863`, [direct URL](https://flowme2605-24g7918o1-flowme.vercel.app), and [Vercel record](https://vercel.com/flowme/flowme2605/HBW56gHNcW6BSKp26SRs1KNveWa5) report success |
| Canonical initial smoke | `FAIL` — `21/23`; nested child-sheet Escape and immediate 767px fallback-editor Escape both failed and repeated in targeted checks |
| Escape hotfix publication | `NOT_RUN` — PR, exact-head CI, merge, Production deployment, and canonical re-smoke |
| Observed-user validation | `0` |

The [R3B production Escape hotfix](./2026-08-11-r3b-production-escape-hotfix.md)
owns the remaining publication evidence. Add the release to `docs/HISTORY.md`
only after the exact hotfix merge source is deployed and canonical re-smoke
passes.

## Risks And Rollback

- The approved product source documents are hash-pinned local provenance, not
  independently reviewable files in this PR, because their dirty ownership was
  not transferred.
- Release risk is narrowed to Escape layer ownership. It remains open until the
  hotfix exact-head GitHub CI, deployment, and canonical `23/23` re-smoke pass.
- No migration is required for rollback. Revert the bounded product PR and keep
  the existing `savedPlanLibrary=off` compatibility lane and R3A deployment
  available as the last fully smoke-passed rollback baseline.

## Follow-ups

- Reassess a narrow read-only Item detail boundary only in a separately promoted
  PR with its own characterization and rollback evidence.
- Complete the bounded [production Escape hotfix](./2026-08-11-r3b-production-escape-hotfix.md)
  before closing the R3B release gate.
- Keep Text-to-Flow and observed-user work outside this gate unless explicitly
  promoted.

## Links

- [R3B spec](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
- [R3B plan](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/plan.md)
- [R3B tasks](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/tasks.md)
- [R3B QA](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md)
- [Current status](../STATUS.md)
