# Public Plan Surface Unification

- **PR:** [#176](https://github.com/knhbae/flowme2605/pull/176)
- **Date:** 2026-08-12 KST
- **Branch:** `codex/public-surface-unification-20260812`
- **Status:** Merged / deployed / canonical smoke PASS
- **Base:** `origin/main` at `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`
- **Initial implementation commit / opening PR head:** `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`
- **Final PR head:** `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`
- **Merge:** `47c54803c6bb7544aad757ce62c4ce58decbfe53` at `2026-08-11T20:59:16Z`
- **Deployment:** GitHub Production record `5858571759`, status `16686799631`, exact source `47c54803c6bb7544aad757ce62c4ce58decbfe53`

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
- No runtime, UI, storage, schema, migration, route, or dependency follow-up was
  added after final PR head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`.
- The protected direct deployment URL is retained as a deployment-record link,
  not as anonymous app proof; canonical app HTTP `200` is recorded separately.
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
| Initial implementation commit | `PASS` — `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a` |
| Push / PR | `MERGED` — [PR #176](https://github.com/knhbae/flowme2605/pull/176), opening head `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`, final head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e` |
| Exact-head PR CI | `PASS` — run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714), [Docs `93921714110`](https://github.com/knhbae/flowme2605/actions/runs/31534309714/job/93921714110), [Playwright `93921714060`](https://github.com/knhbae/flowme2605/actions/runs/31534309714/job/93921714060) |
| Merge SHA | `PASS` — `47c54803c6bb7544aad757ce62c4ce58decbfe53` at `2026-08-11T20:59:16Z` |
| Post-merge main CI | `PASS` — run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210), [Docs `93926137070`](https://github.com/knhbae/flowme2605/actions/runs/31535691210/job/93926137070), [Playwright `93926137063`](https://github.com/knhbae/flowme2605/actions/runs/31535691210/job/93926137063) |
| Vercel Production deployment | `PASS` — GitHub record `5858571759`, status `16686799631`, exact source `47c54803c6bb7544aad757ce62c4ce58decbfe53`; [protected direct record URL](https://flowme2605-la2tqpw8e-flowme.vercel.app), [canonical app](https://flowme2605.vercel.app) HTTP `200`, [Vercel record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp) success |
| Canonical production smoke | `PASS` — authoritative final `11/11`, sequential isolated contexts, `19.023s`; runtime/network/same-origin 4xx/5xx/overflow/clipped/unnamed/pass-gated fixed-overlap/pass-gated short-target violations `0`; observed sticky/control intersections `4` and short targets `10` remain non-gating usability observations. Earlier `7/11` and `9/11` were harness false negatives. |
| Observed-user validation | `0` |

## Risks And Rollback

- The main risk is presentation/controller drift across Flow, `save_all`, and
  `choose_child`; the focused and full browser suites cover those boundaries.
- Exact `visualSubtraction=off` and `savedPlanLibrary=off` remain the bounded
  presentation rollback paths.
- Revert the publication commit to restore the prior default public Map
  composition. No data migration or recovery operation is required.

## Follow-ups

- No product gate is active. Keep external integrations and observed-user study
  work separate until explicit Owner promotion.
- Publish the documentation-only release closeout from exact released base
  `47c54803c6bb7544aad757ce62c4ce58decbfe53`; it must not alter runtime.

## Links

- [PR #176](https://github.com/knhbae/flowme2605/pull/176)
- [Specification](../specs/2026-08-12-public-plan-surface-unification/spec.md)
- [QA evidence](../specs/2026-08-12-public-plan-surface-unification/qa.md)
- [Current status](../STATUS.md)
- [Current roadmap](../ROADMAP.md)
