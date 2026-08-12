# Project Status

**Last Updated:** 2026-08-12 (Plan edit and lifecycle unification merged, deployed, and production-smoked)
**Status:** v0.1.0 RELEASED / PLAN EDIT-LIFECYCLE UNIFICATION CI-PRODUCTION-SMOKE PASS / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Preserve the released Plan/Item editing contract and its evidence boundary; no next product gate is active until the Owner promotes one.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. [Plan Edit And Lifecycle Unification](./pr-history/2026-08-12-plan-edit-lifecycle-unification.md) is released; research shelves and human validation gates do not become implementation work without explicit Owner promotion. |
| Current product release identity | [PR #178](https://github.com/knhbae/flowme2605/pull/178) final head `3cac3cde5bbcf6297b93b8299bfe28693700aebf` passed exact-head PR CI run [`31596540934`](https://github.com/knhbae/flowme2605/actions/runs/31596540934) and merged at `2026-08-12T12:42:45Z` as `908ee849beb15cb10331b72d7894167a61458b18`. Post-merge `main` run [`31597763288`](https://github.com/knhbae/flowme2605/actions/runs/31597763288) passed core job `94117373437` and Playwright job `94117373461`. |
| Last runtime-bearing product deployment | GitHub Production deployment record `5869458520`, status `16715443863`, succeeded for PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18`, the latest merge that changed runtime behavior. Its [protected direct URL](https://flowme2605-ej020et9m-flowme.vercel.app) is deployment-record evidence, not anonymous app proof. The [canonical alias](https://flowme2605.vercel.app) passed smoke `38/38`; the [Vercel deployment record](https://vercel.com/flowme/flowme2605/AF53jatbYV9EuNyjbUeMY3Z6gUWZ) reports success. |
| Evidence boundary | Canonical Production smoke passed `38/38` with workers `1`, retries `0`, in `99.6s`; unexpected, flaky, and skipped results were `0`. Exact-head PR CI, post-merge `main` CI, and deployment are successful. A later documentation-only `main` deployment may be the literal latest Production commit without changing this runtime-bearing product baseline; query GitHub/Vercel when the exact live deployment identity is required. Automated QA, deployment, screenshots, and local capture reports are not observed-user validation; observed users remain `0`. |
| Documentation publication | [PR #177](https://github.com/knhbae/flowme2605/pull/177) and [PR #179](https://github.com/knhbae/flowme2605/pull/179) merged documentation-only release closeouts. They did not change the released product runtime. |
| User action now | Promote one next product gate or open a real-user validation checkpoint when ready. |
| AI action now | Preserve the released baseline and its evidence boundary until a new gate is explicitly opened. No publication task is pending. |
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
| Public Plan/Item edit release | [QA evidence](./specs/2026-08-12-public-plan-edit-surface-unification/qa.md) / [local UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html) | Local checks remain focused `105/105`, full `npm test` PASS, P35 P0 `446/446`, build `18` routes, dedicated E2E `8/8`, Map action `7/7`, and affected browser `154/154`. PR #178 exact-head CI passed, merge `908ee849` reached Production, and canonical smoke passed `38/38`. The capture review remains local evidence. |
| My Plan edit/lifecycle release | [QA evidence](./specs/2026-08-12-my-plan-edit-lifecycle-unification/qa.md) | Local checks remain origin/persistence/source/storage `172/172`, saved-library controller `19/19`, approved execution `187/187`, lock `59/59`, build `18` routes, dedicated E2E `23/23`, affected browser `80/80`, and full `npm test` PASS. The same PR #178 merge and Production smoke released this foundation. |
| Browser regression | Canonical smoke source, runtime-bearing PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18` | Smoke `38/38` passed with workers `1`, retries `0`, in `99.6s`; unexpected, flaky, and skipped results were `0`. This is automated production evidence, not observed use. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`. PR #176 later replaced that runtime, and the latest runtime-bearing PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18` preserves the inherited My Flow contracts. |
| Previous public plan surface release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | PR #176 merge `47c54803c6bb7544aad757ce62c4ce58decbfe53` and smoke `11/11` remain historical evidence; PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18` is the current product-behavior baseline. |
| Worktree boundary | `git worktree list` | Release and documentation follow-ups use dedicated worktrees; user-owned and unrelated worktrees remain untouched. |

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
