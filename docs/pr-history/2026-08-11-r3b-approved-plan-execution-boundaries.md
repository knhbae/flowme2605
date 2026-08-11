# R3B Approved Plan Execution Boundaries

- **Product PR:** [#172](https://github.com/knhbae/flowme2605/pull/172)
- **Production hotfix PR:** [#173](https://github.com/knhbae/flowme2605/pull/173)
- **Date:** 2026-08-11 KST
- **Product branch:** `codex/approved-plan-execution-ux-20260810`
- **Status:** Merged / deployed / canonical smoke PASS through PR #173
- **Base:** `origin/main` at `14014bf3872c5587ee9ebbc8d8936aee2d754ec4`
- **Initial merge:** `a599370496ee95a52d14cddd27c94b0c8190a863`
- **Current deployed source:** `2b937ce811b518950f495341d05736ebd102887a`

## Why

The Owner approved a concrete plan-execution UX contract and authorized its
implementation and release. The same product PR also needed bounded architecture
seams so continued UX and data experimentation would not keep expanding the
shared `AppClient` compatibility runtime.

The user-owned 2026-08-10 source set remains in the dirty `flow-mvp` checkout.
The [R3B spec](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
records its exact paths and SHA-256 values without taking ownership of or
importing its 47-file linked closure.

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
- Corrected nested bottom-sheet and immediate mobile fallback-editor Escape
  ownership in bounded [PR #173](https://github.com/knhbae/flowme2605/pull/173).

## Not Done

- No storage key/schema/migration, identity rewrite, new export format, feature
  flag, Text-to-Flow integration, broad legacy deletion, or external account
  integration.
- The separate read-only Item detail extraction candidate is not promoted.
- No observed-user session was run; the count remains `0`.

## Decisions

- R3B merge `2b937ce811b518950f495341d05736ebd102887a` is the current
  production baseline after exact-head CI, post-merge CI, exact-source
  deployment, and canonical `23/23` smoke all passed.
- Keep public result controls non-mutating and keep personal completion,
  persistence, artifact effects, and receipts with their existing runtime owners.
- Keep modal Escape ownership with the visually topmost visible modal and let
  the approved 0-767 fallback editor handle immediate Escape only when topmost.
- Do not infer observed-user validation from GitHub, deployment, or smoke
  evidence.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
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
| Approved unit | `PASS` — `176/176` before PR #172 |
| Aggregate `npm.cmd run verify` | `PASS` — docs, full `npm test`, and production build |
| AppClient storage lock | `PASS` — `59/59` |
| Security audit | `PASS` — configured findings `0` |
| R3B production build | `PASS` — `18/18`, BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Canonical browser gates | `PASS` — URL-first `20/20` plus approved E2E `23/23`, total `43/43` |
| Full pre-merge Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2`, exact BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Hotfix local verification | `PASS` — unit `182/182`, build `18/18` at BUILD_ID `wjpnPhhhMBaWzGTXuxK7U`, P26 `1/1`, targeted browser `3/3`, approved browser `23/23`, and full Playwright `569/569` with failures, skips, and flaky tests all `0` using workers `2` |

## Publication Evidence

| Evidence | State |
| --- | --- |
| Product PR | [PR #172](https://github.com/knhbae/flowme2605/pull/172), final head `b1106b6a319eb2ff5671be99ab446d68d6597f0b`, merge `a599370496ee95a52d14cddd27c94b0c8190a863` |
| Initial Production deployment | `PASS` — record `5841506853` served source `a599370496ee95a52d14cddd27c94b0c8190a863` |
| Canonical initial smoke | `FAIL` — `21/23`; both Escape failures repeated and led to PR #173 |
| Hotfix PR and exact head | [PR #173](https://github.com/knhbae/flowme2605/pull/173), final head `210b7c3ae027782fd91a003e88624b38d0243e74` |
| Hotfix PR CI | `PASS` — run [`31448713920`](https://github.com/knhbae/flowme2605/actions/runs/31448713920), including Docs job `93648377755` and Playwright job `93648377771`; Vercel Preview succeeded |
| Final merge | `PASS` — `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z` |
| Post-merge main CI | `PASS` — run [`31449546812`](https://github.com/knhbae/flowme2605/actions/runs/31449546812), including Docs job `93650860049` and Playwright job `93650860029` |
| Current Production deployment | `PASS` — record `5842830294`, status `16645165737`, identifies exact source `2b937ce811b518950f495341d05736ebd102887a` and the [direct deployment URL](https://flowme2605-itg4dhbbt-flowme.vercel.app); anonymous direct access redirects to Vercel login. The [canonical alias](https://flowme2605.vercel.app) served the app and passed `23/23`; the [Vercel record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf) reports success |
| Canonical production smoke | `PASS` — approved spec `23/23`, workers `1`, retries `0`, `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce` |
| Observed-user validation | `0` |

## Risks And Rollback

- The approved product source documents are hash-pinned local provenance, not
  independently reviewable files in these PRs, because their dirty ownership
  was not transferred.
- The automated release gate is closed. Real usability and external round-trip
  evidence remain separate and were not observed.
- No migration is required for rollback. The bounded PRs can be reverted while
  preserving the `savedPlanLibrary=off` compatibility lane and the prior R3A
  release source.

## Follow-ups

- Reassess a narrow read-only Item detail boundary only in a separately promoted
  PR with its own characterization and rollback evidence.
- Keep Text-to-Flow, deferred P2 candidates, and observed-user work inactive
  until explicitly promoted.

## Links

- [R3B spec](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
- [R3B plan](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/plan.md)
- [R3B tasks](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/tasks.md)
- [R3B QA](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md)
- [Escape hotfix history](./2026-08-11-r3b-production-escape-hotfix.md)
- [Release history](../HISTORY.md)
- [Current status](../STATUS.md)
