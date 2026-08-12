# QA Evidence

**Status:** LOCAL QA PASS / PR #176 MERGED / PRODUCTION PASS / CANONICAL SMOKE 11/11

**Base:** `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`

**Initial implementation commit / opening PR head:** `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`

**PR:** [#176](https://github.com/knhbae/flowme2605/pull/176)

**Final PR head:** `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`

**Merge / deployed source:** `47c54803c6bb7544aad757ce62c4ce58decbfe53`

**Final verified BUILD_ID:** `bzdhR-nY_afpTfx_xDZ7e`

**Observed users:** `0`

The verified implementation was committed as
`1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`, finalized at PR head
`3555cd1db9f426dcbc30c81652be01dd38b1ce5e`, and released as exact
merge/deployed source `47c54803c6bb7544aad757ce62c4ce58decbfe53`.
Local, CI, deployment, production smoke, and observed-user states are recorded
separately below.

| Gate | State | Evidence |
| --- | --- | --- |
| Route/data inventory | PASS | Direct executable Map routes `10`: canonical redirects `2`, rendered `save_all` `6`, rendered `choose_child` `2`; review-hold Maps `5` preserve their non-executable boundary. |
| Storage/schema migration | PASS — NONE | Existing Map/Flow keys, snapshot versions, atomic Map transactions, bridge records, and canonical child IDs are retained; no migration was added. |
| Unit/contract | PASS | `npm test`: pretest `173/173`, main `622/622`, approved `182/182`, public-surface `8/8`. |
| Production build | PASS | Next.js build `18/18`; final BUILD_ID `bzdhR-nY_afpTfx_xDZ7e`. |
| New public-surface E2E | PASS | `9/9`, workers `1`, retries `0`, duration `54.3s`; covers all `9` executable routes at 390/768/1024/1440, unchanged raw storage on entry and tab selection, unnamed/clipped/fixed-overlap controls `0`, and runtime/network errors `0`. Output: `output/playwright/public-plan-surface-unification-final/public-surface-9-final3-run3`. |
| Map rollback/copy contracts | PASS | `24/24`, workers `1`, retries `0`, duration `1.5m`; preserves Map save, review-hold, redirect, copy, and exact rollback-specific contracts. Output: `output/playwright/public-plan-surface-unification-final/map-rollback-contracts-final3`. |
| Flow MVP display regression | PASS AFTER BOUNDED FIX | First run `127/129` exposed two product-display failures; the bounded product display correction then passed the targeted cases `2/2`. |
| Current-source full Playwright | PASS | `578/578` across `74` files, workers `2`, retries `0`, duration `1,375,459.685ms` (`~22.9m`), unexpected/skipped/flaky `0`, failure artifacts `0`, server stderr `0`. JSON: `output/playwright/public-plan-surface-unification-final/full-578-final3-results.json`. |
| Implementation documentation check | PASS | `npm.cmd run docs:check` -> skill sync PASS, 16 required files, 4510 local links. |
| Release closeout documentation check | PASS | `npm.cmd run docs:check` -> skill sync PASS, 16 required files, 4518 local links. |
| Release closeout diff check | PASS | `git diff --check` -> exit `0` for the scoped docs-only worktree diff. |
| Candidate commit | PASS | Initial implementation commit `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`. |
| Push / PR | MERGED | [PR #176](https://github.com/knhbae/flowme2605/pull/176), opening head `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`, final head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`. |
| PR CI | PASS | Run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714): [Docs `93921714110`](https://github.com/knhbae/flowme2605/actions/runs/31534309714/job/93921714110), [Playwright `93921714060`](https://github.com/knhbae/flowme2605/actions/runs/31534309714/job/93921714060). |
| Merge | PASS | `47c54803c6bb7544aad757ce62c4ce58decbfe53` at `2026-08-11T20:59:16Z`. |
| Post-merge `main` CI | PASS | Run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210): [Docs `93926137070`](https://github.com/knhbae/flowme2605/actions/runs/31535691210/job/93926137070), [Playwright `93926137063`](https://github.com/knhbae/flowme2605/actions/runs/31535691210/job/93926137063). |
| Production deployment | PASS | GitHub Production record `5858571759`, status `16686799631`, identifies exact source `47c54803c6bb7544aad757ce62c4ce58decbfe53`. The [direct URL](https://flowme2605-la2tqpw8e-flowme.vercel.app) is retained as a protected deployment-record link, not anonymous app proof; the [canonical app](https://flowme2605.vercel.app) returned HTTP `200`, and the [Vercel record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp) reports success. |
| Canonical production smoke | PASS | Authoritative final `11/11` in sequential isolated contexts in `19.023s`; runtime, network, same-origin 4xx/5xx, overflow, clipped, unnamed, pass-gated fixed-overlap, and pass-gated short-target violations `0`. Observed sticky/control intersections `4` and short targets `10` remain non-gating usability observations. Earlier `7/11` and `9/11` were harness false negatives and are non-authoritative. Local ignored JSON: sibling worktree `output/playwright/public-plan-surface-production-smoke/runs/2026-08-12T01-15-58-368Z/results.json`. |
| Observed users | `0` | Automated QA and internal browser runs are not observed-user validation. |

## Verified public result contract

- Executable `/f/[slug]` and default executable `/flow-maps/[map]` use one `flow-public-shell` and the approved Text/Todo/Calendar result grammar.
- Canonical Todo rows, content, child order, Map identity, selected IDs, selected artifact mode, controlled anchor, and existing persistence transactions remain authoritative.
- Executable Maps do not expose `platform-nav`, `platform-mobile-tabs`, `flow-map-execution-outline`, the legacy Map artifact preview, or `저장될 전체 계획` in the default unified presentation.
- `choose_child` previews one child and navigates to `/f/[slug]` without creating a Map save key.
- Review-hold Maps expose no result, edit, save, or export action and retain their source/risk/noindex boundary.

## Exact rollback qualification

- Default executable Maps use the unified public presentation.
- Exact `visualSubtraction=off` restores the exact legacy Map shell, presentation, action, and anchor behavior for both `save_all` and `choose_child`.
- Exact `savedPlanLibrary=off` restores the prior/default result mode.
- These query-only switches do not rename keys, migrate schema, or change Map/child Flow identity.

## Evidence boundary

Local implementation and authorized automated QA are complete. PR #176 final
head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`, exact merge/deployed
source `47c54803c6bb7544aad757ce62c4ce58decbfe53`, required PR and
post-merge CI, GitHub Production record, canonical HTTP `200`, and authoritative
production smoke `11/11` are verified. The smoke is automated release QA. It
does not close the `4` observed sticky/control intersections, `10` observed
short targets, or any observed-user gate; observed-user validation remains `0`.
