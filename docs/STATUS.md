# Project Status

**Last Updated:** 2026-08-12 (Public Plan/Item edit unification local implementation and automated QA complete)
**Status:** v0.1.0 RELEASED / PUBLIC PLAN-ITEM EDIT UNIFICATION LOCALLY VERIFIED / COMMIT-PUSH-DRAFT PR-PREVIEW AUTHORIZED / MERGE-PRODUCTION NOT AUTHORIZED / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Publish the verified My Plan and Public Plan/Item candidates as one scoped branch, Draft PR, and Vercel Preview; keep merge and Production gated.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | [Public Plan/Item Edit Surface Unification](./specs/2026-08-12-public-plan-edit-surface-unification/spec.md): ordinary `/f` and executable single-plan Maps share one editor and close/focus contract; true alternatives use `choose_child`, and `review_hold` stays editor-free. Local implementation and automated QA are complete from `origin/main@2f93f00d`; the Owner authorized commit, push, Draft PR, and Preview on 2026-08-12. Merge and Production remain unauthorized. |
| Current release identity | [PR #176](https://github.com/knhbae/flowme2605/pull/176) final head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e` merged at `2026-08-11T20:59:16Z` as `47c54803c6bb7544aad757ce62c4ce58decbfe53`. Exact-head PR CI run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714) and post-merge `main` CI run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210) passed. |
| Current deployed source | GitHub Production deployment record `5858571759`, status `16686799631`, identifies exact source `47c54803c6bb7544aad757ce62c4ce58decbfe53`. Its [protected direct URL](https://flowme2605-la2tqpw8e-flowme.vercel.app) is a deployment-record link, not anonymous app proof. The [canonical alias](https://flowme2605.vercel.app) served HTTP `200` and passed canonical smoke `11/11`; the [Vercel deployment record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp) reports success. |
| Evidence boundary | Canonical production smoke passed `11/11` in sequential isolated contexts in `19.023s`; runtime, network, same-origin 4xx/5xx, overflow, clipped, unnamed, pass-gated fixed-overlap, and pass-gated short-target violations were all `0`. The harness separately observed `4` sticky/control intersections (`2` current save-all, `1` Flow rollback, `1` choose-child rollback) and `10` short targets (`4` review-hold plus `6` across three rollback scenarios). These are observational usability signals, not closed evidence. Automated production QA is not observed-user validation; observed users remain `0`. |
| Documentation publication | [PR #177](https://github.com/knhbae/flowme2605/pull/177) merged the documentation-only release closeout as `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`. It did not change the released product runtime. |
| User action now | Review the Draft PR and Preview after publication; separately authorize merge and Production only if desired. |
| AI action now | Commit and push the scoped work, open a Draft PR, create a Preview, and verify those external states without merging or promoting Production. |
| Paused Text Authoring | Preserved and pushed at `a5d5338`; separate from the release and not promoted. |
| Paused content review | Preserved and pushed at `0d27143` on `archive/flow-content-user-review-wip-20260806`; not a publication candidate. |
| Deferred candidates | P35 P2 mutation follow-ups, Text Authoring `TA-01`, collaborative authoring, content review, and research packages remain separate shelves. Select at most one by explicit decision. |
| Merged architecture baseline | R0, R1, and R2 were merged through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`. Calendar view-model/controller and My Flow saved-library transitions are separated while `AppClient` remains the compatibility adapter. This merge did not create a production deployment, production smoke, or observed-user validation. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) merged implementation commit `eeac99213b58eeafb8f39b2cc71c723e6fa32712` and publication commit `950fd55f4176bf74d4739647040874a601faffcc` as `95a69257c73633077df2305232299f58cca03f73`. It adds a query-only, fail-closed My Flow experience boundary without changing the default UI, persistence, export, or receipt contracts. Production smoke passed; observed-user validation remains `0`. |
| Blocked by evidence | Observed usability, real Calendar/VTODO round-trip, cross-device recovery, real review/social data, account persistence, creator/update pilot, real AI backend, and external integrations. |

## System Health

| Area | Command or evidence | Current expectation |
| --- | --- | --- |
| Documentation harness | `npm run docs:check` | Required agent docs, skill synchronization, and local Markdown links pass. |
| Unit tests | `npm test` | Flow contracts and product tests pass. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Public Plan/Item edit local candidate | [QA evidence](./specs/2026-08-12-public-plan-edit-surface-unification/qa.md) / [UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html) | Local implementation and automated QA are complete. Shared editor/model/component checks `105/105`, full `npm test` PASS, P35 P0 `446/446`, production build PASS with `18` routes, dedicated E2E `8/8`, Map action regression `7/7`, affected browser regression `154/154`, docs `16` required files / `4539` local links, and six fresh runtime captures plus three-width report verification are confirmed. Observed users are `0`. |
| My Plan edit/lifecycle local candidate | [QA evidence](./specs/2026-08-12-my-plan-edit-lifecycle-unification/qa.md) | Local implementation and verification complete. Confirmed: origin/persistence/source/storage `172/172`, saved-library controller `19/19`, approved execution `187/187`, lock `59/59`, build `18` routes, dedicated E2E `23/23`, affected browser regression `80/80`, full `npm test` PASS, docs `16` required files / `4525` local links, and independent Blocking/High findings `0`. Observed users are `0`. |
| Browser regression | Canonical production source `47c54803c6bb7544aad757ce62c4ce58decbfe53` | Public plan surface smoke `11/11` passed in sequential isolated contexts in `19.023s`; runtime, network, same-origin, layout, naming, pass-gated overlap, and pass-gated target violations were `0`. Observational sticky/control intersections were `4` and short targets were `10`; they are not closed user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`; public plan surface release `47c54803c6bb7544aad757ce62c4ce58decbfe53` has replaced R3B as the current production source without changing those My Flow contracts. |
| Public plan surface production release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | Local evidence remains pretest `173/173`, main `622/622`, approved `182/182`, public-surface `8/8`, build `18/18`, new E2E `9/9`, Map rollback/copy `24/24`, and full Playwright `578/578`. PR and `main` CI passed, exact merge `47c54803c6bb7544aad757ce62c4ce58decbfe53` reached Production, and canonical smoke passed `11/11`; observed users remain `0`. |
| Worktree baseline | `git worktree list` | Active implementation is isolated in `flow-my-plan-edit-lifecycle-20260812` on `codex/my-plan-edit-lifecycle-unification-20260812` from `origin/main@2f93f00d`. Structured Checklist, Text Authoring, release worktrees, and the dirty user-owned `flow-mvp` checkout remain untouched. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Flow Map is an internal source/version/aggregate identity, not a separate user-facing plan type. Single-plan `save_all` content uses the ordinary Flow editor, real alternatives use `choose_child` then `/f`, and `review_hold` stays editor-free. Exact rollback flags retain their compatibility behavior without changing storage keys or schema.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
