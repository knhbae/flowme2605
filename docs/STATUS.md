# Project Status

**Last Updated:** 2026-08-11 (R3B deployed; production Escape hotfix active)
**Status:** v0.1.0 RELEASED / R3B DEPLOYED / ESCAPE HOTFIX LOCAL VERIFIED / CANONICAL RE-SMOKE PENDING / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Publish the bounded R3B production Escape hotfix and re-smoke its exact merge source without additional UX, route, storage, identity, export-byte, receipt-order, or rollback drift.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | Production hotfix: only the topmost visible bottom sheet may own Escape, and the 0-767 approved fallback Item editor must handle Escape before focus transfer while yielding to an alertdialog or another modal. |
| Durable source baseline | [PR #172](https://github.com/knhbae/flowme2605/pull/172) final head `b1106b6a319eb2ff5671be99ab446d68d6597f0b` merged R3B into `main` as `a599370496ee95a52d14cddd27c94b0c8190a863`. Exact-head required checks and post-merge CI run [`31441290450`](https://github.com/knhbae/flowme2605/actions/runs/31441290450) passed. |
| Existing deployed source | GitHub Production deployment record `5841506853` reports `success` for source `a599370496ee95a52d14cddd27c94b0c8190a863` at the [direct deployment](https://flowme2605-24g7918o1-flowme.vercel.app); the [Vercel deployment record](https://vercel.com/flowme/flowme2605/HBW56gHNcW6BSKp26SRs1KNveWa5) also reports success. Canonical release verification remains open because the initial production smoke passed `21/23`. |
| Evidence boundary | R3B is merged and deployed. The canonical initial smoke passed `21/23`; both failures repeated in targeted checks and require the Escape hotfix. The local hotfix passes unit `182/182`, production build `18/18` at BUILD_ID `wjpnPhhhMBaWzGTXuxK7U`, P26 `1/1`, targeted browser `3/3`, approved browser `23/23`, and full Playwright `569/569` with failures, skips, and flaky tests all `0` using workers `2`. Hotfix PR, CI, merge, deployment, and canonical re-smoke remain `NOT_RUN`. Observed users remain `0`. |
| User action now | None. The Owner explicitly authorized the R3B implementation and its commit, push, PR, merge, and Vercel deployment. |
| AI action now | Publish the isolated hotfix through its own PR, require exact-head CI, deploy the exact merge source, and repeat the canonical `23`-check smoke without implying observed-user validation. Keep the unowned dirty `flow-mvp` worktree untouched. |
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
| Browser regression | Local hotfix exact build `wjpnPhhhMBaWzGTXuxK7U` | P26 `1/1`, targeted `3/3`, approved `23/23`, and full Playwright `569/569` pass with failures, skips, and flaky tests all `0` using workers `2`; this is automated browser QA, not observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| R3B deployment and hotfix | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 merged as `a599370496ee95a52d14cddd27c94b0c8190a863`, exact-source Production deployment succeeded, and canonical initial smoke is `21/23`. The bounded Escape hotfix is locally green on unit `182/182`, build `18/18`, approved browser `23/23`, and full Playwright `569/569`; its publication and canonical re-smoke remain `NOT_RUN`. |
| Worktree baseline | `git worktree list` | `flow-approved-plan-execution-ux` is the active named hotfix worktree from `origin/main` at `a599370496ee95a52d14cddd27c94b0c8190a863`. Generated `test-results-*` paths remain excluded from publication. The dirty `flow-mvp` checkout remains user-owned and untouched. Reconfirm exact inventory at closeout. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
