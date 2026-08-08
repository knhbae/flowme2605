# Project Status

**Last Updated:** 2026-08-09 (R3A published in Draft PR #169; CI, merge, and production deployment in progress)
**Status:** v0.1.0 RELEASED / P35 ROUND 2 P′′ SOURCE MERGED / EXISTING PRODUCTION READY / PRODUCTION SMOKE NOT_RUN / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Complete CI, merge, and production deployment for [Draft PR #169](https://github.com/knhbae/flowme2605/pull/169) without changing the default classic experience or claiming observed-user validation. R0-R2 are merged through PR #168; the existing P35 Round 2 deployment remains production until the R3A deployment is verified.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. The P35 Round 2 MVP PoC gate is closed; a new product slice requires explicit owner promotion. |
| Durable source baseline | [PR #166](https://github.com/knhbae/flowme2605/pull/166) merged P35 Round 2 into `main` as `2af4c92407925cb0643e20c2c22c6e8c5b8b0f64`. Final GitHub run `31074433364` passed Docs, Unit, Build, and Playwright `533/533`. |
| Existing production release | Source `f97644abf379c46433847f44aa7bd4da7fadac4a` is served by Vercel deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`, reported `READY` at the [canonical alias](https://flowme2605.vercel.app). PR #166 did not create a new production deployment. |
| Evidence boundary | P′ ended in Codex and Claude Design Pass 2 `REVISE`; its findings were incorporated into P′′. Fresh independent P′′ Pass 1 and Pass 2 are `NOT_RUN` and owner-waived for this MVP, not `PASS`. Production smoke and live runtime BUILD_ID probing are `NOT_RUN`. Observed users remain `0`. |
| User action now | None during the authorized R3A publication workflow unless CI, merge policy, or production smoke reveals a new blocker. |
| AI action now | Commit and push only the dedicated `flow-r3a` scope, merge through a green PR, deploy the merged source to the linked Vercel production project, run smoke, and keep every publish state explicit. Preserve the unowned dirty `flow-mvp` worktree. |
| Paused Text Authoring | Preserved and pushed at `a5d5338`; separate from the release and not promoted. |
| Paused content review | Preserved and pushed at `0d27143` on `archive/flow-content-user-review-wip-20260806`; not a publication candidate. |
| Deferred candidates | P35 P2 mutation follow-ups, Text Authoring `TA-01`, collaborative authoring, content review, and research packages remain separate shelves. Select at most one by explicit decision. |
| Merged architecture baseline | R0, R1, and R2 were merged through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`. Calendar view-model/controller and My Flow saved-library transitions are separated while `AppClient` remains the compatibility adapter. This merge did not create a production deployment, production smoke, or observed-user validation. |
| R3A publication candidate | R3A commit `eeac99213b58eeafb8f39b2cc71c723e6fa32712` is pushed on `codex/r3a-my-flow-experience-boundary-20260809` and published in [Draft PR #169](https://github.com/knhbae/flowme2605/pull/169). It adds a query-only, fail-closed My Flow experience boundary without changing the default UI, persistence, export, or receipt contracts. CI, merge, Vercel production deployment, and smoke are in progress. Observed-user validation remains `0`. |
| Blocked by evidence | Observed usability, real Calendar/VTODO round-trip, cross-device recovery, real review/social data, account persistence, creator/update pilot, real AI backend, and external integrations. |

## System Health

| Area | Command or evidence | Current expectation |
| --- | --- | --- |
| Documentation harness | `npm run docs:check` | Required agent docs, skill synchronization, and local Markdown links pass. |
| Unit tests | `npm test` | Flow contracts and product tests pass. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Browser regression | GitHub run `31074433364` | P35 integrated baseline passed Playwright `533/533`; this is automated browser QA, not observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A candidate | [Draft PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, R3A E2E `4/4`, full runtime regression Playwright `545/545`, and 390/1024/1440 inspection PASS. GitHub CI, merge, and deployment remain separate gates; this is not observed-user validation. |
| Worktree baseline | `git worktree list` | Three intentional worktrees: `flow-mvp` on local `main` is behind `origin/main` with unowned documentation changes; `flow-r0-refactor` preserves the clean published R0-R2 branch; `flow-r3a` is the dedicated local R3A candidate. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
