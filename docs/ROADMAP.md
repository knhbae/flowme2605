# Roadmap

**Last Updated:** 2026-07-19<br>
**Current Version:** v0.1.0 (released product PoC)<br>
**Current Validation Stage:** internal alpha / P25 execution-workspace structural correction<br>
**Next Version:** v0.2.0 (coherent personal execution workspace)<br>
**Next Milestone:** P25-02 responsive whole-Flow workspace using the P25-00B Option B working frame

Human-facing control surface: [FlowMe backlog control board](./content-audit/2026-07-15-flowme-backlog-control-board-ko.html).

## Released Baseline

> Release history lives in [HISTORY.md](./HISTORY.md).

v0.1.0 supports the browser-local product loop below:

```text
URL or memo -> prepared Flow or draft -> save -> personal edit
-> My Flow and Calendar execution -> completion -> export -> reuse/version review
```

This is a functioning product PoC with automated and browser QA. It is not evidence that repeated users understand, trust, or retain the product.

## P25 Execution Workspace Correction

Owner, Codex, and Claude Design feedback reopened the product frame after P24 implementation closeout. P25 is not another broad polish loop. It must make the complete personal Flow, optional scheduling, bounded personal adjustment, execution state, Calendar, and export read as one model.

Detailed scope: [P25 Execution Workspace Foundation](./specs/2026-07-19-execution-workspace-foundation/spec.md).
Review board: [P25 UX feedback reconciliation](./content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/README.md).
Prototype gate: [P25-00B core workspace decision](./content-audit/2026-07-19-p25-00b-core-workspace-prototype-decision/README.md).

| Slice | Purpose | Gate |
| --- | --- | --- |
| P25-00A | Reconcile owner/Codex/Claude feedback and official references | Done; structural correction and staged scope recorded |
| P25-00B | Compare core mobile/wide workspace prototypes and capture owner decisions | A/B prototype and six-shape simulation complete; Option B adopted as the working implementation frame under the owner's instruction to continue P25 step by step; screen-level review remains open |
| P25-01A | Canonical routine series/occurrence projection | Done by current unit/browser evidence; public preview, My Flow Calendar, and ICS now share source cadence and stable occurrence identity |
| P25-01B | Memo draft split and count integrity | Done by current unit/browser evidence; no generic filler, explicit acceptance, stable IDs, and accepted/saved/reloaded/list-export parity |
| P25-02 | Responsive whole-Flow workspace and post-save handoff | Full artifact reachable; no unexplained truncation |
| P25-03 | Progressive item editor and selected-item batch adjustment | Common edit is one drawer; batch date/include/export impact is previewed |
| P25-04 | Anytime task model and Calendar placement queue | Undated work can be found, executed, dated, moved, and cleared |
| P25-05 | Completion/reopen and export scope parity | One occurrence/control; immediate undo and persistent reopen; exact export counts |
| P25-06/07 | Public artifact simplification and shared responsive visual language | Duplicate representation/copy/overflow/control variants reduced to zero targets |
| P25-08 | Internal six-journey integration gate | Automated Blocking/High zero and owner readiness decision; no observed-user claim |

P25 implementation must proceed in this order. Option B is the working P25-02 frame because the owner explicitly asked the agent to continue the full P25 program and allowed substantial changes; this is implementation authorization, not observed-user validation or a final screen-by-screen approval. No visually persuasive recurrence UI ships while P25-01 parity is failing.

### Stage 0 First Flag MVP

| Item | Description | Status |
| --- | --- | --- |
| First flag flow | Parenting/infant vaccination and checkup preparation route | Released, observation pending |
| Alternate route | Moving D-30 timeline route for lower-risk comparison | Released, observation pending |
| Execution actions | Save, edit, schedule, complete/reopen, export, note, and reuse | Implemented, observation pending |
| Source-backed conversion readiness | Exact source replacement, natural artifact simulation, and source/risk separation before representative framing | Implemented baseline |
| Verification | Unit tests, production build, Playwright E2E, public production | Automated green; human evidence pending |

## Current P24 Completion Gate

Detailed status lives in the [P24 completion audit](./content-audit/2026-07-14-p24-completion-audit/README.md) and [P24 execution-trust spec](./specs/2026-07-14-p24-execution-trust-ux-simplification/spec.md).

| Item | Description | Status |
| --- | --- | --- |
| P24 implementation | Date/effective projection, recurrence, draft integrity, completion undo, editor, Calendar tray, export scope, execution notes | Done by automated evidence |
| P24-00OPS1 | Public anonymous production URL | Done |
| P24-00OPS2 | Controlled dependency upgrade with high `0`, build/E2E, and rollback | Done |
| P24-J0 | Save, personalize, execute journey decision package | Done; artifact-first, optional adjustment, first-save whole-Flow frame selected |
| P24-J1 | Save decision surface | Done and deployed |
| P24-J2 | Post-save full artifact | Done and deployed |
| P24-J3 | My Flow/Calendar/held role cleanup | Done and deployed |
| P24-J4 | Integration and regression | Done; automated Blocking/High 0 and browser evidence captured |
| P24-J5 | Internal production readiness | Done; PR #128, merge `616025bf`, production READY |
| P24-00B | Five real participants x three sessions | Deferred until explicit owner reopen after P24-J5, `0 / 15` |
| P24-00C | Keep/change/defer and observed fixes | Pending P24-00B |
| P24 final | Internal regression, production deploy, and observation-readiness package | Done as `implementation_complete_observation_not_started`; observed users `0 / 15` |

## P24 Journey-Frame Correction Gate

Owner feedback identified a first-use framing gap after the execution model became feature-complete: users must read too much explanation before saving, cannot immediately confirm the whole saved artifact, and can confuse My Flow scope with Calendar filtering. The current recommendation is a bounded reset, not a 4-tab or schema rewrite.

Detailed scope: [Save, Personalize, Execute Journey Reset](./specs/2026-07-18-save-personalize-execute-journey-reset/spec.md).

| Slice | Purpose | Gate |
| --- | --- | --- |
| P24-J0 | Current replay, alternative wireframes, owner review, and independent heuristic review | Select one implementation direction without recruiting users |
| P24-J1 | Artifact-first save preview and optional lightweight adjustment | User predicts what save/adjust will do |
| P24-J2 | Post-save whole-Flow confirmation, returning Today preserved | Whole Flow visible with action depth 0 |
| P24-J3 | My Flow/Calendar role cleanup, undated tray, held-content visibility | Held ordinary count 0; dated/undated roles clear |
| P24-J4 | Integrated implementation, regression, production deploy | Automated Blocking/High 0 |
| P24-J5 | Independent production-readiness audit | Deployed journey has Blocking/High 0; owner decides whether observation may be reopened |

## Operating Queue

There is no active external-user gate. P24-J0~J5 remain the deployed baseline, while P25 is the only active internal product track. External user observation stays outside the queue until the owner explicitly judges a future P25 frame ready.

| Lane | Owner | Work | Next checkpoint | Done when |
| --- | --- | --- | --- | --- |
| Now | Owner direction | P25-00B core workspace prototype decision | Review the prepared mobile/wide A/B package for save, whole Flow, My Flow, Calendar, adjustment, and export | Owner keep/change/reject decisions are recorded; runtime unchanged |
| In parallel | AI | P25-01B correctness | P25-01A recurrence is closed; fix memo split and count parity without depending on visual labels | Accepted memo preview equals saved whole Flow and exported item counts |
| Then | AI + owner checkpoints | P25-02~P25-07 staged implementation | Close one product/data/browser gate per slice | Approved frame is implemented without source/run ownership drift |
| Completed | AI + owner direction | P24-J0~J5 bounded implementation | Selected, implemented, merged, deployed, and production-checked the artifact-first frame | P24 remains a baseline, not the final UX |
| Deferred | User, by explicit future decision | Observed sessions | Reopen only when the owner judges the P25 frame ready to show users | Recruitment begins; current count stays `0 / 15` until then |
| Blocked | AI, after future human evidence | P24-00C synthesis and narrow correction | Classify keep/change/defer only after real session evidence exists | Findings are prioritized and any Blocking/High fix is re-observed |
| Parallel human check | User | Real Calendar import and duplicate import | Import the same ICS twice in one configured app | Result and duplicate behavior are recorded |
| Parallel human check | User | Real backup and restore | Restore one backup in another browser or device | Transfer result and friction are recorded |
| Review shelf | User, non-blocking | Prompt Lab and recent strategy artifacts | Read when choosing the post-observation investment | Feedback is recorded without delaying P24 sessions |

## Human Validation Gates

These gates cannot be closed by automated tests or simulated personas.

| Gate | Current state | Pass condition |
| --- | --- | --- |
| Repeated use | `0 / 15`; not scheduled | Owner explicitly reopens a 5 participants x 3 sessions study after P24-J5 |
| Calendar import | Parser/Office evidence only | One configured Calendar app plus duplicate-import result |
| Cross-device recovery | Automated/local evidence only | One real browser or device transfer |
| Persistence decision | Undecided | Decide from observed continuity expectations |

## Next Decision

The immediate decision is P25-00B: select the core execution-workspace frame before more runtime UI work. Account persistence, creator/update pilot, production URL/AI backend, direct integrations, and observed-user recruitment remain gated. Do not open them as parallel product tracks.

## Gated Backlog

### Product And Value Chain

- Feedback/correction transport, moderation, and response states.
- Creator pilot, canonical publishing, and update workflow.
- Honest review, use, and maintenance signals from real data.
- Content freshness, rights, localization, and portfolio focus.

### Platform

- Canonical runtime database migration, Auth, RLS, and rollback.
- Account-backed persistence and cross-device synchronization.
- Production URL fetch/extraction and a real LLM provider.
- Direct Calendar, Notion, Todo, and Sheets integrations.

### Long Horizon

- Flow Pack / Flow-of-Flows.
- Marketplace, payments, community, and creator revenue systems.
- Experience graph and aggregate value or growth views.

The gates and revisit conditions for uncommitted directions remain in [IDEAS.md](./IDEAS.md). Approved multi-step work remains in [docs/specs/](./specs/README.md).
