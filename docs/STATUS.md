# Project Status

**Last Updated:** 2026-08-12 (public plan surface production release complete)
**Status:** v0.1.0 RELEASED / PUBLIC PLAN SURFACE PRODUCTION / CANONICAL SMOKE PASS / NO ACTIVE PRODUCT GATE / DOCS CLOSEOUT PENDING / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Publish the documentation-only release closeout. The product release is complete and no product gate is active.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. [Public Plan Surface Unification](./specs/2026-08-12-public-plan-surface-unification/spec.md) is released; no next product, refactor, Text-to-Flow, integration, or observed-user initiative is promoted. |
| Current release identity | [PR #176](https://github.com/knhbae/flowme2605/pull/176) final head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e` merged at `2026-08-11T20:59:16Z` as `47c54803c6bb7544aad757ce62c4ce58decbfe53`. Exact-head PR CI run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714) and post-merge `main` CI run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210) passed. |
| Current deployed source | GitHub Production deployment record `5858571759`, status `16686799631`, identifies exact source `47c54803c6bb7544aad757ce62c4ce58decbfe53`. Its [protected direct URL](https://flowme2605-la2tqpw8e-flowme.vercel.app) is a deployment-record link, not anonymous app proof. The [canonical alias](https://flowme2605.vercel.app) served HTTP `200` and passed canonical smoke `11/11`; the [Vercel deployment record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp) reports success. |
| Evidence boundary | Canonical production smoke passed `11/11` in sequential isolated contexts in `19.023s`; runtime, network, same-origin 4xx/5xx, overflow, clipped, unnamed, pass-gated fixed-overlap, and pass-gated short-target violations were all `0`. The harness separately observed `4` sticky/control intersections (`2` current save-all, `1` Flow rollback, `1` choose-child rollback) and `10` short targets (`4` review-hold plus `6` across three rollback scenarios). These are observational usability signals, not closed evidence. Automated production QA is not observed-user validation; observed users remain `0`. |
| Documentation publication | [Release closeout history](./pr-history/2026-08-12-public-plan-surface-release-closeout.md) is being prepared from base `47c54803c6bb7544aad757ce62c4ce58decbfe53` on `codex/public-surface-release-closeout-20260812`. It changes documentation only and does not reopen the released product. |
| User action now | None. Await an explicit Owner promotion before starting the next product gate or observed-user workstream. |
| AI action now | Publish only the documentation closeout, verify its exact external state, and leave all product shelves inactive. |
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
| Browser regression | Canonical production source `47c54803c6bb7544aad757ce62c4ce58decbfe53` | Public plan surface smoke `11/11` passed in sequential isolated contexts in `19.023s`; runtime, network, same-origin, layout, naming, pass-gated overlap, and pass-gated target violations were `0`. Observational sticky/control intersections were `4` and short targets were `10`; they are not closed user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`; public plan surface release `47c54803c6bb7544aad757ce62c4ce58decbfe53` has replaced R3B as the current production source without changing those My Flow contracts. |
| Public plan surface production release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | Local evidence remains pretest `173/173`, main `622/622`, approved `182/182`, public-surface `8/8`, build `18/18`, new E2E `9/9`, Map rollback/copy `24/24`, and full Playwright `578/578`. PR and `main` CI passed, exact merge `47c54803c6bb7544aad757ce62c4ce58decbfe53` reached Production, and canonical smoke passed `11/11`; observed users remain `0`. |
| Worktree baseline | `git worktree list` | `flow-public-surface-release-closeout-20260812` is on `codex/public-surface-release-closeout-20260812` from exact released source `47c54803c6bb7544aad757ce62c4ce58decbfe53`. Its scope is documentation only. Generated Playwright output remains local evidence, not a committed artifact; the dirty `flow-mvp` checkout remains user-owned and untouched. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Default executable Flow Maps use the unified public presentation. Exact `visualSubtraction=off` restores the exact legacy Map shell, presentation, action, and anchor behavior for both `save_all` and `choose_child`; exact `savedPlanLibrary=off` restores the prior/default result mode. Neither rollback changes storage keys or schema.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
