# R3B Production Escape Hotfix

- **PR:** [#173](https://github.com/knhbae/flowme2605/pull/173)
- **Date:** 2026-08-11 KST
- **Branch:** `codex/r3b-production-escape-hotfix-20260811`
- **Status:** Merged / deployed / canonical smoke PASS
- **Base:** `origin/main` at `a599370496ee95a52d14cddd27c94b0c8190a863`
- **Final head:** `210b7c3ae027782fd91a003e88624b38d0243e74`
- **Merge:** `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z`
- **Current deployed source:** `2b937ce811b518950f495341d05736ebd102887a`

## Why

The canonical initial R3B production smoke passed `21/23`. Both failures
repeated in targeted checks:

1. Escape could select a parent bottom sheet while a child help or warning
   sheet was topmost and focus still remained in the parent.
2. Immediate Escape did not close the 767px approved fallback Item editor
   before its delayed focus transfer completed.

The defects were bounded to modal Escape ownership. The hotfix corrected that
interaction without reopening the approved UX or data contracts.

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

## Publication Evidence

| Evidence | State |
| --- | --- |
| Hotfix PR and exact head | [PR #173](https://github.com/knhbae/flowme2605/pull/173), `210b7c3ae027782fd91a003e88624b38d0243e74` |
| GitHub required CI | `PASS` — run [`31448713920`](https://github.com/knhbae/flowme2605/actions/runs/31448713920), [Docs job `93648377755`](https://github.com/knhbae/flowme2605/actions/runs/31448713920/job/93648377755), [Playwright job `93648377771`](https://github.com/knhbae/flowme2605/actions/runs/31448713920/job/93648377771) |
| Vercel Preview | `PASS` |
| Merge SHA | `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z` |
| Post-merge main CI | `PASS` — run [`31449546812`](https://github.com/knhbae/flowme2605/actions/runs/31449546812), [Docs job `93650860049`](https://github.com/knhbae/flowme2605/actions/runs/31449546812/job/93650860049), [Playwright job `93650860029`](https://github.com/knhbae/flowme2605/actions/runs/31449546812/job/93650860029) |
| Vercel Production deployment | `PASS` — GitHub record `5842830294`, status `16645165737`, identifies exact source `2b937ce811b518950f495341d05736ebd102887a` and the [direct deployment URL](https://flowme2605-itg4dhbbt-flowme.vercel.app); anonymous direct access redirects to Vercel login. The [canonical alias](https://flowme2605.vercel.app) served the app and passed `23/23`; the [Vercel record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf) reports success |
| Canonical re-smoke | `PASS` — approved spec `23/23`, workers `1`, retries `0`, `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce` |
| Observed-user validation | `0` |

## Risks And Rollback

- The shared sheet helper assumes visible sheet ancestry and effective layer
  z-index reflect the browser stacking contexts. DOM order is used only when
  those layers tie. The fallback editor assumes the existing one-visible-item
  detail contract.
- R3B is now the current fully smoked production baseline. Reverting this
  hotfix would reintroduce the two production Escape defects.
- No storage migration or recovery operation is required for rollback.

## Follow-ups

- No product gate is active. Await explicit Owner promotion before starting a
  new product, refactor, Text-to-Flow, or observed-user workstream.

## Links

- [R3B PR history](./2026-08-11-r3b-approved-plan-execution-boundaries.md)
- [R3B QA](../specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md)
- [Release history](../HISTORY.md)
- [Current status](../STATUS.md)
