# Roadmap

**Last Updated:** 2026-07-19<br>
**Current Version:** v0.1.0 (released product PoC)<br>
**Current Validation Stage:** internal alpha / observation-readiness correction<br>
**Next Version:** v0.2.0 (observation-ready product frame)<br>
**Next Milestone:** P24-J5 production closeout for the implemented journey-frame correction

Human-facing control surface: [FlowMe backlog control board](./content-audit/2026-07-15-flowme-backlog-control-board-ko.html).

## Released Baseline

> Release history lives in [HISTORY.md](./HISTORY.md).

v0.1.0 supports the browser-local product loop below:

```text
URL or memo -> prepared Flow or draft -> save -> personal edit
-> My Flow and Calendar execution -> completion -> export -> reuse/version review
```

This is a functioning product PoC with automated and browser QA. It is not evidence that repeated users understand, trust, or retain the product.

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
| P24-J1 | Save decision surface | Done in current branch; merge/deploy pending |
| P24-J2 | Post-save full artifact | Done in current branch; merge/deploy pending |
| P24-J3 | My Flow/Calendar/held role cleanup | Done in current branch; merge/deploy pending |
| P24-J4 | Integration and regression | Done locally; automated Blocking/High 0 and browser evidence captured |
| P24-00B | Five real participants x three sessions | Deferred until explicit owner reopen after P24-J5, `0 / 15` |
| P24-00C | Keep/change/defer and observed fixes | Pending P24-00B |
| P24 final | Internal regression, production deploy, and observation-readiness package | In progress; merge/deploy/public verification remain |

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

There is one active product gate. P24-J5 merges, deploys, and verifies the already-implemented first-use frame; external user observation remains outside the current execution queue.

| Lane | Owner | Work | Next checkpoint | Done when |
| --- | --- | --- | --- | --- |
| Now | AI | P24-J5 production closeout | Commit, push, merge, deploy, and verify the public alias | Deployed SHA and evidence are recorded |
| Completed locally | AI + owner direction | P24-J0~J4 bounded implementation | Selected and implemented the artifact-first, optional-adjustment, whole-Flow confirmation frame | Regression green; independent Blocking/High 0 |
| After deployment | Owner only | Readiness decision | Review the public P24 frame and explicitly decide whether it is ready to show users | Observation remains closed unless explicitly reopened |
| Deferred | User, by explicit decision | P24-00B observed sessions | Reopen only when the owner judges the product ready to show users | Recruitment begins; current count stays `0 / 15` until then |
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

After P24-J5, first decide whether FlowMe is ready to open P24-00B. Only after future P24-00B/P24-00C evidence should one primary next investment be chosen:

1. account-backed persistence,
2. creator/update pilot,
3. production URL intake and AI backend,
4. or another narrow execution-model correction.

Do not open these as parallel product tracks.

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
