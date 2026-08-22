# Project Status

**Last Updated:** 2026-08-23 (PR #194 released and Production verified; PR #195 exact-head release gate active)
**Status:** v0.1.0 RELEASED / PR #194 VISUAL REFRESH IN PRODUCTION / PR #195 RELEASE AUTHORIZED / EXACT-HEAD CI AND POST-MERGE PRODUCTION VERIFICATION PENDING / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Unify discovery entry and make each prepared Flow's complete Text, Todo, and Calendar result understandable before save, while preserving released ownership and persistence contracts.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | [Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md) is the one active gate. [PR #196](https://github.com/knhbae/flowme2605/pull/196) resolved the source-review prerequisite with `135` normal-user routes current and overdue/missing counts `0`, and [PR #194](https://github.com/knhbae/flowme2605/pull/194) is released. The Owner completed FPC-11 and authorized [PR #195](https://github.com/knhbae/flowme2605/pull/195); reconciled exact-head CI, merge, and post-merge Production verification remain. Observed users remain `0`. |
| Current product release identity | [PR #194](https://github.com/knhbae/flowme2605/pull/194) merged as `c8a57ba37c4087b84b526bc778c3604f68299faa` after its exact-head release gate passed. This visual-only refresh is the current runtime-bearing product baseline. |
| Last runtime-bearing product deployment | The resulting PR #194 Production deployment was verified at the [canonical alias](https://flowme2605.vercel.app). Exact deployment evidence remains automation/deployment proof, not observed-user validation. |
| Evidence boundary | PR #196 merge `8c0bfd8de9fb8877c4045b2c3f725b60ca236843` records `135` current normal-user routes and overdue/missing counts `0`. Earlier PR #195 runs `624/625`, `623/629`, and `629/629` remain dated QA history; they do not prove the reconciled exact head and are not a current source-freshness blocker. Automated QA, deployment, screenshots, and local capture reports are not observed-user validation; observed users remain `0`. |
| Publication boundary | PR #194 is merged and Production-verified. PR #195 is Owner-authorized but remains unreleased until its reconciled exact head passes CI; its resulting Production deployment must be verified separately after merge. |
| User action now | Review the final Production result after PR #195 release evidence is reported. |
| AI action now | Pass PR #195 reconciled exact-head CI, merge only that green head, and verify the resulting Production deployment without expanding scope. |
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
| Unit tests | `npm test` | PASS on the merged PR #196 prerequisite baseline; every subsequent PR exact head must pass again before merge. |
| Production build | `npm run build` | Next.js production build succeeds. |
| Flow entry and preview clarity | [Active spec](./specs/2026-08-20-flow-entry-preview-clarity/spec.md) / [QA evidence](./specs/2026-08-20-flow-entry-preview-clarity/qa.md) | One-input intent routing, source-faithful full Text, full approved Todo/Calendar, copy-title cardinality, legacy regression, production build, independent review, and three-width browser checks passed on the prior review head. The Owner authorized release. Because PR #195 was reconciled with the released baseline, its new exact head must pass CI before merge and its resulting Production deployment must be verified afterward. |
| Production visual-only refresh | [QA evidence](./specs/2026-08-20-production-visual-only-refresh/qa.md) | Focused components `53/53`, P35 P0 `449/449`, approved execution `191/191`, public surface `14/14`, build `18/18`, visual matrix `12/12`, affected E2E `52/52`, and final discovery/My Plan subset `9/9` pass. The historical `623/624` source-review result was resolved by PR #196. PR #194 passed its release gate, merged as `c8a57ba37c4087b84b526bc778c3604f68299faa`, and Production was verified. |
| Public Plan/Item edit release | [QA evidence](./specs/2026-08-12-public-plan-edit-surface-unification/qa.md) / [local UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html) | The PR #178 foundation retains focused `105/105`, P35 P0 `446/446`, dedicated E2E `8/8`, Map action `7/7`, and affected browser `154/154`. The date-parity follow-up passed focused `33/33`, full `npm test`, build `18` routes, and dedicated E2E `11/11`; PR #182 exact-head CI and Production passed, with canonical smoke `41/41`. The capture review remains local evidence. |
| My Plan edit/lifecycle release | [QA evidence](./specs/2026-08-12-my-plan-edit-lifecycle-unification/qa.md) | Local checks remain origin/persistence/source/storage `172/172`, saved-library controller `19/19`, approved execution `187/187`, lock `59/59`, build `18` routes, dedicated E2E `23/23`, affected browser `80/80`, and full `npm test` PASS. The same PR #178 merge and Production smoke released this foundation. |
| Browser regression | Current runtime-bearing PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` | Exact-head release checks and resulting Production verification passed. The earlier PR #182 canonical smoke `41/41` remains historical regression evidence. Neither is observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| Previous R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 and hotfix PR #173 established the inherited approved execution contracts and canonical smoke `23/23`. PR #176, PR #178, and PR #182 later extended that runtime; current PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` preserves the inherited My Flow contracts. |
| Previous public plan surface release | [QA evidence](./specs/2026-08-12-public-plan-surface-unification/qa.md) | PR #176 merge `47c54803c6bb7544aad757ce62c4ce58decbfe53`, PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18`, and PR #182 date parity remain historical foundations; PR #194 merge `c8a57ba37c4087b84b526bc778c3604f68299faa` is the current product-behavior baseline. |
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
