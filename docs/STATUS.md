# Project Status

**Last Updated:** 2026-08-06 (P35 integration and workspace stabilization)
**Status:** v0.1.0 RELEASED / P35 ROUND 2 P′′ SOURCE MERGED / EXISTING PRODUCTION READY / PRODUCTION SMOKE NOT_RUN / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Keep one trustworthy baseline and promote at most one bounded next slice after owner review. No product implementation ticket is active. P35 Round 2 is durable on `main`, but Git integration is not a new deployment, a fresh independent P′′ review, production smoke, or observed-user validation.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. The P35 Round 2 MVP PoC gate is closed; a new product slice requires explicit owner promotion. |
| Durable source baseline | [PR #166](https://github.com/knhbae/flowme2605/pull/166) merged P35 Round 2 into `main` as `2af4c92407925cb0643e20c2c22c6e8c5b8b0f64`. Final GitHub run `31074433364` passed Docs, Unit, Build, and Playwright `533/533`. |
| Existing production release | Source `f97644abf379c46433847f44aa7bd4da7fadac4a` is served by Vercel deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`, reported `READY` at the [canonical alias](https://flowme2605.vercel.app). PR #166 did not create a new production deployment. |
| Evidence boundary | P′ ended in Codex and Claude Design Pass 2 `REVISE`; its findings were incorporated into P′′. Fresh independent P′′ Pass 1 and Pass 2 are `NOT_RUN` and owner-waived for this MVP, not `PASS`. Production smoke and live runtime BUILD_ID probing are `NOT_RUN`. Observed users remain `0`. |
| User action now | Report a production issue if found, or explicitly promote one next product slice. No additional review package is required to preserve the current MVP gate. |
| AI action now | Keep release, worktree, backlog, and evidence truth synchronized. Do not promote Text Authoring, content review, P2 follow-ups, or refactoring implicitly. |
| Paused Text Authoring | Preserved and pushed at `a5d5338`; separate from the release and not promoted. |
| Paused content review | Preserved and pushed at `0d27143` on `archive/flow-content-user-review-wip-20260806`; not a publication candidate. |
| Deferred candidates | P35 P2 mutation follow-ups, Text Authoring `TA-01`, collaborative authoring, content review, and research packages remain separate shelves. Select at most one by explicit decision. |
| Local architecture candidate | R0, R1, and R2 are complete locally on `codex/r0-behavior-preserving-architecture-refactor-20260806`: Calendar view-model/controller and My Flow saved-library transition decisions are separated behind pure boundaries while `AppClient` remains the compatibility adapter. Final R2 evidence is unit/contract `615/615`, build PASS, and Playwright `542/542`. This candidate is not committed, pushed, merged, deployed, production-smoked, or observed-user validated. |
| Blocked by evidence | Observed usability, real Calendar/VTODO round-trip, cross-device recovery, real review/social data, account persistence, creator/update pilot, real AI backend, and external integrations. |

## System Health

| Area | Command or evidence | Current expectation |
| --- | --- | --- |
| Documentation harness | `npm run docs:check` | Required agent docs, skill synchronization, and local Markdown links pass. |
| Unit tests | `npm test` | Flow contracts and product tests pass. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Browser regression | GitHub run `31074433364` | P35 integrated baseline passed Playwright `533/533`; this is automated browser QA, not observed-user evidence. |
| Local R0-R2 candidate | Current isolated worktree | Docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, Playwright `542/542`; publication and production smoke remain `NOT_RUN`. |
| Worktree baseline | `git worktree list` | One active worktree remains after all other streams were merged or remotely preserved. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
