# Roadmap

**Last Updated:** 2026-07-13

**Current Version:** v0.1.0 (released product PoC)

**Current Validation Stage:** internal alpha / observed-user gate

**Next Milestone:** execution lifecycle completeness and repeated-use evidence

## Released Baseline

> Release history lives in [HISTORY.md](./HISTORY.md).

### v0.1.0 - Stage 0 First Flag MVP

The current app supports the browser-local product loop below:

```text
URL or memo -> prepared Flow or draft -> save -> personal edit
-> My Flow and Calendar execution -> completion -> export -> reuse/version review
```

This is a functioning product PoC with automated/browser QA. It is not evidence that repeated users understand or retain the product.

## Current Milestone

### P23 - Execution Lifecycle Completeness

**Goal:** Ensure a saved personal Flow remains coherent while the user completes, reopens, schedules, edits structure, exports, finishes, and reuses it.

| Slice | Scope | Status |
| --- | --- | --- |
| P23-00 | Capability, state-transition, projection, and discoverability audit | Active |
| P23-01 | Reversible completion and optional scheduling | Conditional on audit |
| P23-02 | Personal task add/delete/reorder and recovery | Conditional on audit |
| P23-03 | Calendar/checklist/sheet/memo export parity | Conditional on audit |
| P23-04 | Past-run detail and reuse semantics | Conditional on audit |
| P23-05 | Observed-user correction slice | Conditional on observation |

Durable scope: [Execution Lifecycle Completeness spec](./specs/2026-07-13-execution-lifecycle-completeness/spec.md).

Human-facing status: [FlowMe done/next workboard](./content-audit/2026-07-13-flowme-done-next-workboard-ko.html).

## Human Validation Gates

These gates cannot be closed by automated tests or simulated personas.

| Gate | Current state | Pass condition |
| --- | --- | --- |
| Repeated use | 1/15 observation records | 5 participants x 3 sessions |
| Calendar import | Parser/Office evidence only | One configured Calendar app plus duplicate import result |
| Cross-device recovery | Automated/local evidence only | One real browser or device transfer |
| Persistence decision | Undecided | Decide from observed continuity expectations |

## Next Decision

After P23 and the human gates, choose one primary next investment:

1. account-backed persistence,
2. creator/update pilot,
3. production URL/AI backend,
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
