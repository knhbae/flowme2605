# Execution Lifecycle Completeness

**Date:** 2026-07-13<br>
**Status:** Completed local lifecycle contract; observed-user and external-system gates moved to P24/P25<br>
**Owner:** FlowMe product / UX / execution data

## Decision

Before adding more creator, Studio, AI, or integration surface, audit and close the personal Flow execution lifecycle. The audit covers reversible completion, optional scheduling, personal structure edits, projection parity, history, and reuse. Implement only gaps rated Blocking or High.

## User Need

As a person who saved or drafted a Flow, I need to adjust its tasks, dates, order, and completion state without losing the trusted source, so that My Flow, Calendar, and exported artifacts all represent the same personal plan.

## Problem

The current app supports source-backed saving, personal title/date/memo overlays, completion, Calendar projection, export, feedback, and reuse. It does not yet prove that users can safely complete and reopen tasks, add or remove dates, add/delete/reorder personal tasks, recover destructive changes, and export the resulting effective structure without ambiguity.

## In Scope

- Capability and state-transition audit across six representative Flow shapes.
- Completion to incomplete reversal, skip/exclude/delete semantics, and recovery.
- Unscheduled to scheduled to unscheduled transitions.
- Personal task add, delete, restore, reorder, and stable identity policy.
- Source version, personal overlay, execution run, and export precedence.
- Calendar, checklist/todo, sheet, and memo projection parity.
- Mobile 390px and wide 1024px discoverability.
- Observed-user scenarios and evidence requirements.

## Out Of Scope

- Real LLM provider or arbitrary production URL fetching.
- Account persistence or direct provider synchronization.
- Marketplace, payment, community, or Studio promotion to a fifth tab.
- Replacing source-backed canonical content with user edits.
- Implementing every audited gap before severity and user value are known.

## Lifecycle Under Review

```text
discover -> review -> save -> personalize -> schedule -> execute
-> complete -> reopen -> revise structure -> export -> finish -> reuse/update
```

Every transition must state its owner, persisted data, recovery path, and effect on My Flow, Calendar, export, history, and source-version review.

## Representative Flow Shapes

1. Anchor-offset preparation such as moving.
2. Unscheduled field checklist such as vehicle inspection.
3. Repeating routine such as exercise or maintenance.
4. Ordered travel or project plan.
5. Record or memo-first Flow.
6. URL-first or memo-first personal draft.

## Required Policy Outputs

- Meaning of complete, incomplete, skipped, excluded, and deleted.
- Date priority and the path back to an unscheduled state.
- Stable ID and tombstone policy for user-added and user-deleted tasks.
- Order override policy across source version updates.
- Destination-specific treatment of completed, skipped, excluded, deleted, and undated tasks.
- History and reuse boundary between one run and the Flow template.

## Evidence

Primary human-facing board: [FlowMe done/next workboard](../../content-audit/2026-07-13-flowme-done-next-workboard-ko.html).

The audit package should live under:

```text
docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/
```

It should contain `README.md`, `audit.md`, `review.html`, capability/state/export matrices, screenshots, and a pasteable next-goal prompt.

## Acceptance

- Every reviewed action is classified as `supported`, `hidden`, `partial`, or `missing`.
- Every destructive action has a confirmation, undo, restore, or explicit irreversible boundary.
- My Flow, Calendar, and export read one effective personal Flow model.
- Source content, personal overlay, and execution history remain distinct.
- Blocking and High findings become small implementation slices; Medium and Low remain documented.
- Automated QA is not presented as observed-user validation.
