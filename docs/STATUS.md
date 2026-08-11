# Project Status

**Last Updated:** 2026-08-11 (Text Authoring Draft PR #175 opened)
**Status:** v0.1.0 RELEASED / R3B PRODUCTION BASELINE / TEXT AUTHORING DRAFT PR #175 / LOCAL QA PASS / NOT MERGED OR DEPLOYED / OBSERVED USERS 0
**Current Version:** v0.1.0  
**Primary Focus:** Review Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175). Do not merge, deploy, or connect Text Authoring to P35 without a separate Owner decision.

## Current Control Panel

Start from [PROJECT_CONTROL.md](./PROJECT_CONTROL.md). Dated HTML boards remain evidence snapshots; this file, [ROADMAP.md](./ROADMAP.md), and [specs/README.md](./specs/README.md) carry current truth.

| Lane | Current truth |
| --- | --- |
| Active product gate | Text Authoring v5 is in Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175). R3B remains the released production baseline. |
| Durable source baseline | [PR #173](https://github.com/knhbae/flowme2605/pull/173) final head `210b7c3ae027782fd91a003e88624b38d0243e74` merged the R3B Escape correction into `main` as `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z`. Exact-head CI run [`31448713920`](https://github.com/knhbae/flowme2605/actions/runs/31448713920) and post-merge main CI run [`31449546812`](https://github.com/knhbae/flowme2605/actions/runs/31449546812) passed. |
| Existing deployed source | GitHub Production deployment record `5842830294`, status `16645165737`, identifies exact source `2b937ce811b518950f495341d05736ebd102887a` and the [direct deployment URL](https://flowme2605-itg4dhbbt-flowme.vercel.app); an anonymous direct-URL request redirects to Vercel login. The [canonical alias](https://flowme2605.vercel.app) served the app and passed canonical smoke `23/23`; the [Vercel deployment record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf) reports success. |
| Evidence boundary | Canonical production approved-spec smoke passed `23/23` with workers `1`, retries `0`, in `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce`. This is automated production QA, not observed-user validation; observed users remain `0`. |
| User action now | Review the creator journey, source fidelity, Calendar/Todo distinction, repeated occurrence parity, mobile reachability, and whether the v5 boundary is ready to merge. |
| AI action now | Monitor Draft PR checks and address review feedback only when requested. Keep the dirty `flow-mvp` worktree and preserved review source untouched. |
| Active Text Authoring | Clean integration branch `codex/text-authoring-v5-integration-20260811`, feature commit `f5928d8`, Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175). Local automated QA passes; merge, deployment, P35 adapter integration, and observed-user validation are not done. |
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
| Browser regression | Canonical production source `2b937ce811b518950f495341d05736ebd102887a` | Approved-spec smoke `23/23` passed with workers `1`, retries `0`, in `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce`; this is automated browser QA, not observed-user evidence. |
| Merged R0-R2 baseline | [PR #168](https://github.com/knhbae/flowme2605/pull/168) / `efa4d90a78a06134180701bed74874579ac94154` | Before merge: local docs PASS, controller `15/15`, lock `59/59`, unit/contract `615/615`, build PASS, selected E2E `20/20`, and final Playwright `542/542`. Production deployment and smoke remain `NOT_RUN`. |
| R3A release | [PR #169](https://github.com/knhbae/flowme2605/pull/169) / [R3A QA](./specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md) | Focused boundary `72/72`, pretest `164/164`, P35 P0 `420/420`, lock `59/59`, main unit/contract `615/615`, build `18/18`, local R3A E2E `4/4`, local full runtime regression `545/545`, GitHub Playwright `546/546`, production deployment `READY`, and classic/lab production smoke PASS. Observed-user validation remains `0`. |
| R3B production release | [R3B QA](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md) | PR #172 delivered the approved UX; hotfix PR #173 merged as `2b937ce811b518950f495341d05736ebd102887a`. Exact-head and post-merge CI passed, the exact source reached Production, and canonical approved-spec smoke passed `23/23`. Observed-user validation remains `0`. |
| Text Authoring Draft PR | [v5 result ledger](./content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/README.md) | Text Authoring `203/203`, main unit lanes `173/173 + 622/622 + 182/182`, focused E2E `37/37`, legacy fallback `2/2`, production build 18 routes, grammar `30/30`, standalone five-viewport browser QA PASS. Acceptance API rows are `27/27`; obsolete pre-v5 browser rows 8 are pending and excluded from current UI claims. |
| Worktree baseline | `git worktree list` | `flow-approved-plan-execution-ux` is on `codex/r3b-release-closeout-20260811` from `origin/main` at `2b937ce811b518950f495341d05736ebd102887a`. Generated `test-results-*` paths remain excluded from publication. The dirty `flow-mvp` checkout remains user-owned and untouched. |

## Active Product Constraints

- Keep FLOW export-first in Stage 0: turn outside content into a user's familiar calendar, checklist, spreadsheet, or memo before expanding native record management.
- Keep source, creator version, personal overlay, execution, receipt, and export ownership separate.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label screenshots, simulation, internal review, automated QA, or deployment readiness as observed-user validation.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before repeat-use evidence.
- Keep decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

## Status History

P35 Round 2 release details and older implementation notes are preserved in [STATUS_HISTORY.md](./STATUS_HISTORY.md), the [P35 Round 2 spec](./specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), and the [production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md). They are evidence, not the current queue.
