# R3B Production Escape Hotfix

- **PR:** `NOT_RUN`
- **Date:** 2026-08-11 KST
- **Branch:** `codex/r3b-production-escape-hotfix-20260811`
- **Status:** Draft / local verification PASS / not published
- **Base:** `origin/main` at `a599370496ee95a52d14cddd27c94b0c8190a863`
- **Current deployed source:** `a599370496ee95a52d14cddd27c94b0c8190a863`

## Why

The canonical initial R3B production smoke passed `21/23`. Both failures
repeated in targeted checks:

1. Escape could select a parent bottom sheet while a child help or warning
   sheet was topmost and focus still remained in the parent.
2. Immediate Escape did not close the 767px approved fallback Item editor
   before its delayed focus transfer completed.

The release gate therefore remains open even though PR #172, its required CI,
the merge, and the exact-source Production deployment all succeeded.

## What Changed

- Made the visually topmost visible `FlowBottomSheet` the sole Escape owner,
  resolving nested ancestry first, effective layer z-index next, and DOM paint
  order only as the final tie-break instead of inferring ownership from focus.
- Added a document-capture Escape owner for the approved mobile fallback Item
  editor. It is active only while that editor is visible, yields to an
  alertdialog or another modal, and delegates clean cancel and dirty-discard
  behavior to the existing runtime commands.
- Added focused unit and browser regressions for parent/child sheet priority,
  immediate 767px editor close, focus return, and Calendar route continuity.

## Not Done

- No UI, copy, route, query, storage key, schema, migration, identity, export
  byte, receipt-order, feature-flag, dependency, or lockfile change.
- No production claim is made from local automation. Hotfix PR, exact-head CI,
  merge, Production deployment, and canonical re-smoke remain `NOT_RUN`.
- No observed-user session was run; the count remains `0`.

## Decisions

- Escape ownership follows visible modal layering: only the topmost visible
  bottom sheet may consume it.
- The approved 0-767 fallback editor may consume Escape before focus reaches
  the editor, but it must yield to a visible alertdialog or another modal.
- This is a release-blocking interaction correction, not a reopened UX or data
  design slice.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/FlowExecutionPrimitives.test.tsx`
- `tests/e2e/approved-plan-execution-ux.spec.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `package.json`

## Verification

| Check | State |
| --- | --- |
| Unit/contract | `PASS` — `182/182` |
| Production build | `PASS` — `18/18`, BUILD_ID `wjpnPhhhMBaWzGTXuxK7U` |
| P26 focused regression | `PASS` — `1/1` |
| Targeted Escape browser regression | `PASS` — `3/3` |
| Approved plan-execution browser suite | `PASS` — `23/23` |
| Full Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2` |
| Documentation | `PASS` — 16 required files and 4,499 local links |
| Repository diff check | `PASS` — `git diff --check` exited `0` |

## Publication Evidence

| Evidence | State |
| --- | --- |
| Hotfix PR and exact head | `NOT_RUN` |
| GitHub required CI | `NOT_RUN` |
| Merge SHA | `NOT_RUN` |
| Vercel Production deployment ID, URL, and source SHA | `NOT_RUN` |
| Canonical re-smoke | `NOT_RUN` |
| Observed-user validation | `0` |

## Risks And Rollback

- The shared sheet helper assumes visible sheet ancestry and effective layer
  z-index reflect the browser stacking contexts. DOM order is used only when
  those layers tie. The fallback editor assumes the existing one-visible-item
  detail contract.
- Revert this bounded hotfix if either assumption fails. No storage migration or
  recovery operation is required.
- R3A deployment `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek` remains the last fully
  smoke-passed rollback baseline.

## Follow-ups

- Open the hotfix PR and require successful exact-head checks.
- Deploy the exact hotfix merge source and repeat the complete canonical
  `23`-check production smoke.
- Update R3B QA, PR history, active control docs, and `docs/HISTORY.md` only
  after observed publication evidence exists.

## Links

- [R3B PR history](./2026-08-11-r3b-approved-plan-execution-boundaries.md)
- [R3B QA](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md)
- [Current status](../STATUS.md)
