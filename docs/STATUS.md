# Project Status

**Last Updated:** 2026-08-13 (Flow Map Item date parity merged, deployed, and production-smoked)
**Status:** v0.1.0 RELEASED / FLOW MAP ITEM DATE PARITY CI-PRODUCTION-SMOKE PASS / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Preserve the released Plan/Item contract while the approved Text Authoring stack is refreshed on latest main as track-sized Draft PRs; merge and Production remain separate gates.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | None. [Flow Map Item Date Parity](./pr-history/2026-08-13-flow-map-item-date-parity.md) is released; research shelves and human validation gates do not become implementation work without explicit Owner promotion. |
| Current product release identity | [PR #182](https://github.com/knhbae/flowme2605/pull/182) final head `0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head PR CI run [`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163) and merged at `2026-08-13T01:05:33Z` as `f6f796c035d5762eea07ec35abb7f1af1577a5a5`. Post-merge `main` run [`31656595092`](https://github.com/knhbae/flowme2605/actions/runs/31656595092) passed core job `94312307779` and Playwright job `94312307849`. |
| Last runtime-bearing product deployment | GitHub Production deployment record `5880059975`, status `16743295490`, succeeded for PR #182 merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5`, the latest merge that changed runtime behavior. Its [protected direct URL](https://flowme2605-hph3l1si0-flowme.vercel.app) is deployment-record evidence, not anonymous app proof. The [canonical alias](https://flowme2605.vercel.app) passed smoke `41/41`. |
| Evidence boundary | Canonical Production smoke passed `41/41` with workers `1`, retries `0`, in `264804.24ms`; unexpected, flaky, and skipped results were `0`. Exact-head PR CI, exact-source deployment, and post-merge `main` CI are successful. A later documentation-only `main` deployment may be the literal latest Production commit without changing runtime-bearing product baseline `f6f796c035d5762eea07ec35abb7f1af1577a5a5`; query GitHub/Vercel when the exact live deployment identity is required. Automated QA, deployment, screenshots, and local capture reports are not observed-user validation; observed users remain `0`. |
| Documentation publication | [PR #177](https://github.com/knhbae/flowme2605/pull/177) and [PR #179](https://github.com/knhbae/flowme2605/pull/179) remain historical documentation-only closeouts. The current bounded release-closeout documentation change also changes no product runtime. |
| User action now | Promote one next product gate or open a real-user validation checkpoint when ready. |
| AI action now | Preserve the released baseline and its evidence boundary until a new gate is explicitly opened. No product implementation task is pending. |
| Paused Text Authoring | Preserved and pushed at `a5d5338`; separate from the release and not promoted. |
| Text Authoring integration candidate | The v5 implementation and local P0/P1 follow-ups are being refreshed on latest `origin/main` as stacked Draft PRs. Closed Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175) remains historical evidence only; merge, production deployment, P35 integration, and observed-user validation remain 0. |
| Historical P0 promotion | Approval `TA-P0-PROMOTE-20260813-01` applied row-set SHA-256 `687E943319C86D9A60F947753453295AACCC7C68594DD480DE03BB5138281D45` to local commit `5ef186d4`. Its `259/259`, full-test exit `0`, build `19` routes, and E2E `58/58` remain dated local evidence rather than fresh proof for the current refresh. |
| Paused content review | Preserved and pushed at `0d27143` on `archive/flow-content-user-review-wip-20260806`; not a publication candidate. |
| Deferred candidates | P35 P2 mutation follow-ups, collaborative authoring, content review, mixed fact/action table semantics, and research packages remain separate shelves. Select at most one by explicit decision. |
| Merged architecture baseline | R0, R1, and R2 were merged through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`. Calendar view-model/controller and My Flow saved-library transitions are separated while `AppClient` remains the compatibility adapter. This merge did not create a production deployment, production smoke, or observed-user validation. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) merged implementation commit `eeac99213b58eeafb8f39b2cc71c723e6fa32712` and publication commit `950fd55f4176bf74d4739647040874a601faffcc` as `95a69257c73633077df2305232299f58cca03f73`. It adds a query-only, fail-closed My Flow experience boundary without changing the default UI, persistence, export, or receipt contracts. Production smoke passed; observed-user validation remains `0`. |
| Blocked by evidence | Observed usability, real Calendar/VTODO round-trip, cross-device recovery, real review/social data, account persistence, creator/update pilot, real AI backend, and external integrations. |

## System Health

| Area | Command or evidence | Current expectation |
| --- | --- | --- |
| Documentation harness | `npm run docs:check` | Required agent docs, skill synchronization, and local Markdown links pass. |
| Unit tests | `npm test` | Flow contracts and product tests pass. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Public Plan/Item edit release | [QA evidence](./specs/2026-08-12-public-plan-edit-surface-unification/qa.md) / [local UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html) | The PR #178 foundation retains focused `105/105`, P35 P0 `446/446`, dedicated E2E `8/8`, Map action `7/7`, and affected browser `154/154`. The date-parity follow-up passed focused `33/33`, full `npm test`, build `18` routes, and dedicated E2E `11/11`; PR #182 exact-head CI and Production passed, with canonical smoke `41/41`. The capture review remains local evidence. |
| My Plan edit/lifecycle release | [QA evidence](./specs/2026-08-12-my-plan-edit-lifecycle-unification/qa.md) | Local checks remain origin/persistence/source/storage `172/172`, saved-library controller `19/19`, approved execution `187/187`, lock `59/59`, build `18` routes, dedicated E2E `23/23`, affected browser `80/80`, and full `npm test` PASS. The same PR #178 merge and Production smoke released this foundation. |
| Browser regression | Canonical smoke source, runtime-bearing PR #182 merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5` | Smoke `41/41` passed with workers `1`, retries `0`, in `264804.24ms`; unexpected, flaky, and skipped results were `0`. This is automated production evidence, not observed use. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`. PR #176 and PR #178 later replaced that runtime, and the latest runtime-bearing PR #182 merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5` preserves the inherited My Flow contracts. |
| Previous public plan surface release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | PR #176 merge `47c54803c6bb7544aad757ce62c4ce58decbfe53` and PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18` remain historical foundations; PR #182 merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5` is the current product-behavior baseline. |
| Worktree boundary | `git worktree list` | Release and documentation follow-ups use dedicated worktrees; user-owned and unrelated worktrees remain untouched. |
| Historical Text Authoring v5 QA | [v5 result ledger](./content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/README.md) | Closed PR #175 carried Text Authoring `203/203`, main unit lanes `173/173 + 622/622 + 182/182`, focused E2E `37/37`, legacy fallback `2/2`, build 18 routes, grammar `30/30`, and standalone five-viewport browser QA. GitHub run [`31466654229`](https://github.com/knhbae/flowme2605/actions/runs/31466654229) and its Vercel Preview passed, but these remain historical pre-refresh results rather than fresh evidence for the new stacked PRs. |
| Text Authoring P0 local promotion | [P0 goal](./specs/2026-08-11-flowme-text-authoring-service-p0/00-development-goal-ko.md) / [source result](./content-audit/2026-08-11-flowme-text-authoring-service-p0-results/README.md) / [promotion result](./content-audit/2026-08-13-flowme-text-authoring-p0-promotion-results/README.md) | Approval-bound `51` files plus the promotion ledger were included in local commit `5ef186d4`; the current latest-main branch replays that exact approved boundary and requires fresh QA before its Draft PR is treated as green. |

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
