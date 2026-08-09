# Project Status

**Last Updated:** 2026-08-09 (R3A merged, deployed, and production-smoked)
**Status:** v0.1.0 RELEASED / R3A MERGED / PRODUCTION READY / PRODUCTION SMOKE PASS / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** No product slice is active. Preserve `classic` as the default My Flow experience and keep `r3a-lab` limited to its exact query-only internal route until a later slice is explicitly promoted.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. The R3A release is closed; a new product slice requires explicit owner promotion. |
| Durable source baseline | [PR #169](https://github.com/knhbae/flowme2605/pull/169) merged R3A into `main` as `95a69257c73633077df2305232299f58cca03f73`. GitHub run [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308) passed Docs, Unit, Build, and Playwright `546/546`. |
| Existing production release | R3A product source `95a69257c73633077df2305232299f58cca03f73` was deployed as Vercel `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek`, reported `READY` at the [direct deployment](https://flowme2605-a0aasd9ic-flowme.vercel.app) and [canonical alias](https://flowme2605.vercel.app). |
| Evidence boundary | Internal and GitHub automated QA, exact-source deployment verification, and production smoke are `PASS`. This does not establish user comprehension, preference, or observed usability; observed users remain `0`. |
| User action now | None. Review the internal `r3a-lab` route only if deciding whether to promote, revise, or remove that candidate in a later product slice. |
| AI action now | Preserve the released classic default and R3A boundary. Do not start R3B, UI redesign, data migration, or Text-to-Flow integration without a separately promoted goal. Preserve the unowned dirty `flow-mvp` worktree. |
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
| Browser regression | GitHub run [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308) | R3A PR head `950fd55f4176bf74d4739647040874a601faffcc`, whose tree is identical to merge commit `95a69257c73633077df2305232299f58cca03f73`, passed Playwright `546/546`; this is automated browser QA, not observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Worktree baseline | `git worktree list` | Three intentional worktrees: `flow-mvp` on local `main` remains preserved with unowned documentation changes; `flow-r0-refactor` preserves the published R0-R2 branch; `flow-r3a` carries the isolated R3A release-closeout branch. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
