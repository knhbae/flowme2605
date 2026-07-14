# Roadmap

**Last Updated:** 2026-07-15<br>
**Current Version:** v0.1.0 (released, observed-user validation pending)<br>
**Current Validation Stage:** internal alpha / observed-user gate<br>
**Next Version:** v0.2.0 (post-observation decisions)<br>
**Next Milestone:** P24 observed-user evidence and keep/change/defer decisions

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
| P24-00B | Five real participants x three sessions | Ready, `0 / 15` |
| P24-00C | Keep/change/defer and observed fixes | Pending P24-00B |
| P24 final | Final regression, production deploy, and completion package | Pending |

## Operating Queue

There is one active product gate. No strategy-document approval is currently blocking the work.

| Lane | Owner | Work | Next checkpoint | Done when |
| --- | --- | --- | --- | --- |
| Now | User + AI | P24-00B1 first two observed sessions | Complete P1-S1 and P2-S1 using the fixed pilot kit | `2 / 2` first sessions have usable notes |
| Next | User + AI | Remaining P24-00B sessions | Repeat the same three-session protocol | `15 / 15` sessions complete |
| Blocked | AI, after evidence | P24-00C synthesis and narrow correction | Classify keep/change/defer only after session evidence exists | Findings are prioritized and any Blocking/High fix is re-observed |
| Parallel human check | User | Real Calendar import and duplicate import | Import the same ICS twice in one configured app | Result and duplicate behavior are recorded |
| Parallel human check | User | Real backup and restore | Restore one backup in another browser or device | Transfer result and friction are recorded |
| Review shelf | User, non-blocking | Prompt Lab and recent strategy artifacts | Read when choosing the post-observation investment | Feedback is recorded without delaying P24 sessions |

## Human Validation Gates

These gates cannot be closed by automated tests or simulated personas.

| Gate | Current state | Pass condition |
| --- | --- | --- |
| Repeated use | `0 / 15` observed sessions | 5 participants x 3 sessions |
| Calendar import | Parser/Office evidence only | One configured Calendar app plus duplicate-import result |
| Cross-device recovery | Automated/local evidence only | One real browser or device transfer |
| Persistence decision | Undecided | Decide from observed continuity expectations |

## Next Decision

After P24-00B and P24-00C, choose one primary next investment:

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
