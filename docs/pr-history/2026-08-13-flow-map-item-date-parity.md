# Flow Map Item Date Parity

- **PR:** [#182](https://github.com/knhbae/flowme2605/pull/182)
- **Date:** 2026-08-13 KST
- **Branch:** `codex/public-map-item-date-parity-ui-20260813`
- **Status:** Merged / deployed / canonical smoke PASS
- **Base:** `origin/main` at `b700923f5121665617386be3d2bfaa78bbf3a426`
- **Final PR head:** `0aca76687ac582ff4cf11b19a0f46db5593c768e`
- **Merge:** `f6f796c035d5762eea07ec35abb7f1af1577a5a5` at `2026-08-13T01:05:33Z`
- **Deployment:** GitHub Production record `5880059975`, status `16743295490`

## Why

Ordinary public Flows already let a user edit one Item's title, memo, and date,
but executable single-plan Flow Maps exposed only title, inclusion, and order in
the shared Plan surface. The same `수정` action therefore lost date capability
based on source route even though both routes used the same public Plan/Item
editing grammar.

## What Changed

- Reused the existing `PublicFlowItemEditor` for executable single-plan Map Item
  title, personal memo, and date editing; no separate Map editor was added.
- Allowed source-undated Items to add a private fixed date and reset to no date.
- Allowed source-dated Items to use a private fixed date and reset to the source
  projection for the current Plan anchor.
- Reprojected Item rows, editor values, and reset baselines immediately from an
  in-session Plan anchor before Plan apply.
- Preserved a source-equal fixed-date pin on a semantic no-op and removed it only
  after an explicit reset.
- Preserved the existing Map identity, storage keys, snapshots, bridge records,
  unknown fields, and atomic persistence/rollback owner.

## Not Done

- No Map, child, Item, storage-key, or schema migration was introduced.
- No cross-child reorder control, synthetic unscheduled tombstone, source
  mutation, creator publishing, account persistence, or external calendar write
  was added.
- `choose_child` and `review_hold` behavior was not reopened.
- No observed-user session was run. The count remains `0`.

## Decisions

- Flow Map remains an internal source/version/aggregate identity rather than a
  separate user-facing plan or editor type.
- Date reset means return to the actual source projection for the current Plan
  anchor. It does not manufacture a second undated persistence state.
- Item and Plan apply remain provisional; only the existing final Map save
  transaction writes persistent data.

## Files Touched

- `components/flow/PublicFlowAdjustmentPanel.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `components/flow/SourceBackedFlowMapSaveExperience.tsx`
- `lib/flow/effective-flow-map-result.ts`
- Focused component, model, persistence, and browser regression tests
- Public Plan/Item specification and release documentation

## Verification

| Check | State |
| --- | --- |
| Local focused contracts | `PASS 33/33` |
| Full unit/contract suite | `npm.cmd test` PASS |
| Production build | PASS, `18` routes |
| Dedicated date-parity browser suite | `PASS 11/11`, workers `1` |
| Exact-head PR CI | `PASS` — final head `0aca76687ac582ff4cf11b19a0f46db5593c768e`, run [`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163), [core `94309366777`](https://github.com/knhbae/flowme2605/actions/runs/31655643163/job/94309366777), [Playwright `94309366755`](https://github.com/knhbae/flowme2605/actions/runs/31655643163/job/94309366755) |
| Merge | `PASS` — `f6f796c035d5762eea07ec35abb7f1af1577a5a5` at `2026-08-13T01:05:33Z` |
| Post-merge `main` CI | `PASS` — run [`31656595092`](https://github.com/knhbae/flowme2605/actions/runs/31656595092), [core `94312307779`](https://github.com/knhbae/flowme2605/actions/runs/31656595092/job/94312307779) completed `2026-08-13T01:07:30Z`, [Playwright `94312307849`](https://github.com/knhbae/flowme2605/actions/runs/31656595092/job/94312307849) completed `2026-08-13T01:22:08Z` |
| Production | `PASS` — GitHub record `5880059975`, status `16743295490`; [protected direct deployment-record URL](https://flowme2605-hph3l1si0-flowme.vercel.app) and [canonical app](https://flowme2605.vercel.app) |
| Canonical Production smoke | `PASS 41/41` — workers `1`, retries `0`, `264804.24ms`; unexpected, flaky, and skipped results `0` |
| Observed-user validation | `0` |

## Risks And Rollback

- Automated CI, deployment, screenshots, and smoke prove implementation and
  runtime behavior, not whether target users understand or repeatedly use it.
- The protected direct URL is deployment-record evidence; the canonical alias
  is the smoke target.
- Revert merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5` to restore the PR #178 runtime.
  No data migration or recovery step is required.

## Follow-Up

- Keep real-user validation and any broader scheduling model separate until the
  Owner explicitly opens one as a product gate.

## Links

- [Public Plan/Item specification](../specs/2026-08-12-public-plan-edit-surface-unification/spec.md)
- [QA evidence](../specs/2026-08-12-public-plan-edit-surface-unification/qa.md)
- [Current status](../STATUS.md)
- [Current roadmap](../ROADMAP.md)
- [Release history](../HISTORY.md)
