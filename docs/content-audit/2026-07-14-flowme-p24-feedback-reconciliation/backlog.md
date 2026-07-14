# Revised P24 Backlog

## Gate Status

| Gate | Status | Reason |
| --- | --- | --- |
| P24-00A independent automated journey QA | done | Codex clean baseline and Claude Code dirty-dev audits both available |
| P24-00R evidence/runtime reconciliation | done | clean and dependency-candidate worktrees were measured from `211827d` |
| P24-00B observed users | blocked | correctness and public preview gates are not closed |
| P24-01A source v2 merge | deferred | current effective-state and occurrence parity must be trusted first |

## Priority 0 - Establish One Baseline

### P24-00R Baseline and evidence reconciliation - done

- Separate clean `a9ae10e` from dependency-upgrade candidate.
- Run the same install/docs/unit/build/E2E matrix.
- Reproduce all disputed findings.
- Classify each as `confirmed_clean`, `dirty_only`, `not_reproduced`, or `blocked`.
- Verify anonymous Vercel access.
- Do not modify app behavior in this slice.

Done when one commit/lockfile/runtime becomes the implementation baseline and the first code fix is unambiguous.

## Blocking Correctness

### P24-00F1 Local date boundary - done

KST and DST local date fixtures, Today/default date/Calendar parity.

### P24-00F2A Effective-date projection parity - done

Today summary, full list, Calendar, ICS use one effective date.

### P24-00F2B Reuse override transfer - done

`fixed date 유지` and `anchor 재계산` produce different new-run results as labelled.

### P24-00F3A Recurrence occurrence parity

Preview, My Flow, Calendar, ICS show the same occurrences; one occurrence has one completion control.

### P24-00F3B Draft Item inclusion and validation

All memo-split Items remain visible/exported; empty miss input creates no Flow.

### P24-00F4 Entry and hydration reliability

Direct `/flows` load and post-save `/my` work without refresh in production mode.

## High UX

### P24-00U1 Completion and Today simplification

- one executable Today row
- immediate undo
- completed section in context
- next preview without checkbox

### P24-00S1 Date movement contract

- single, selected, anchor, occurrence, future series, whole series
- linked versus fixed
- preview, undo, history, projection

### P24-00U2 Progressive editor

- title/date/time/memo first
- advanced schedule/decision/record only when relevant
- no generic decision field on incompatible Items

## Medium UX

### P24-00U3 Calendar unscheduled tray

Calendar-visible unscheduled inbox, explicit scheduling, no fake date.

### P24-00S2 Export scope

Whole/selected/current scope first, destination second, count visible.

### P24-00U4 Incremental notes

Optional item note, private/correction boundary, final aggregation.

## Operations

### P24-00OPS1 Public preview

Anonymous observation URL with 390px smoke and source commit recorded.

### P25-02 Controlled dependency upgrade

Keep separate from product fixes. No forced downgrade. Require audit, build, full E2E, rollback.

## Human Validation

### P24-00B

5 participants x 3 sessions after all Blocking and selected High items are green.

### P24-00C

Convert observation into keep/change/defer. Only then reopen broad visual work, source v2 merge, or persistence investment.

## Explicitly Deferred, Not Forgotten

- arbitrary URL production fetch/real LLM
- source-backed add/delete/reorder
- direct Calendar/Notion/Todo OAuth
- account/DB/cloud sync
- Studio tab promotion
- drag-and-drop before keyboard/touch alternative and undo
