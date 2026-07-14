# Revised P24 Backlog

## Gate Status

| Gate | Status | Reason |
| --- | --- | --- |
| P24-00A independent automated journey QA | done | Codex clean baseline and Claude Code dirty-dev audits both available |
| P24-00R evidence/runtime reconciliation | done | clean and dependency-candidate worktrees were measured from `211827d` |
| P24-00OPS2 dependency upgrade | in progress | current audit high 4; isolated Next/Playwright/PostCSS candidate reached high 0 and passed unit/build |
| P24-00B observed users | ready after OPS2 | product correctness and anonymous production access are green; real sessions remain 0 / 15 |
| P24-01A source v2 merge | deferred | wait for P24-00B/00C observation evidence before broadening merge behavior |

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

### P24-00F3A Recurrence occurrence parity - done

Preview, My Flow, Calendar, ICS show the same occurrences; one occurrence has one completion control.

### P24-00F3B Draft Item inclusion and validation - done

All memo-split Items remain visible/exported; empty miss input creates no Flow.

### P24-00F4 Entry and hydration reliability - done

Direct `/flows` load and post-save `/my` work without refresh in production mode.

## High UX

### P24-00U1 Completion and Today simplification - done

- one executable Today row
- immediate undo
- completed section in context
- next preview without checkbox

### P24-00S1 Date movement contract - done

- single, selected, anchor, occurrence, future series, whole series
- linked versus fixed
- preview, undo, history, projection

### P24-00U2 Progressive editor - done

- title/date/time/memo first
- advanced schedule/decision/record only when relevant
- no generic decision field on incompatible Items

## Medium UX

### P24-00U3 Calendar unscheduled tray - done

Calendar-visible unscheduled inbox, explicit scheduling, no fake date.

### P24-00S2 Export scope - done

Whole/selected/current scope first, destination second, count visible.

### P24-00U4 Incremental notes - done

Optional item note, private/correction boundary, final aggregation.

Evidence: [P24 U4 inline execution notes](../2026-07-14-p24-u4-inline-execution-notes-evidence/README.md). The implementation adapts Claude Design `(8)` mockup G into a shared one-tap row entry, keeps source correction explicitly unsent, omits empty aggregation, and preserves completed-run history without adding mandatory ratings or tags.

## Operations

### P24-00OPS1 Public preview - done

Anonymous observation URL with 390px smoke and source commit recorded.

Current state: done. PR [#120](https://github.com/knhbae/flowme2605/pull/120) merged as `bc8fc649`, deployment `dpl_GdeGC2WdBz34ttHp4fZyQkYmRLP6` reached `Ready`, and <https://flowme2605.vercel.app> returned anonymous HTTP 200 with the FLOW home. Generated branch preview URLs remain protected; the public production alias is the observation URL.

### P24-00OPS2 Controlled dependency upgrade - in progress

Promoted from P25 because the current production baseline still reports high `4`. Keep it separate from product behavior changes. Update Next `15.5.20`, Playwright `1.61.1`, and PostCSS `8.5.16`; do not force an ExcelJS downgrade. Require high `0`, docs/unit/build, full or bounded-shard E2E, mobile/wide smoke, preview, production and rollback evidence.

## Human Validation

### P24-00B

5 participants x 3 sessions after all Blocking and selected High items are green. Use the [P24-00B observed-user guide](../2026-07-14-p24-00b-observed-user-test-guide/README.md) and keep each participant across discovery/save, edit/execute, and export/review/reuse sessions.

Product gate: green by automated QA. Operations gate: green on the public production alias. Observed-user session count remains 0 / 15, so this gate is ready rather than done.

### P24-00C

Convert observation into keep/change/defer. Only then reopen broad visual work, source v2 merge, or persistence investment.

## Explicitly Deferred, Not Forgotten

- arbitrary URL production fetch/real LLM
- source-backed add/delete/reorder
- direct Calendar/Notion/Todo OAuth
- account/DB/cloud sync
- Studio tab promotion
- drag-and-drop before keyboard/touch alternative and undo

## Current Execution Order

1. Next: close P24-00OPS2 with high `0`, full/sharded E2E and rollback evidence.
2. Then P24-00B1: run two real first-use pilot sessions and adjust only the script or any Blocking defect.
3. Then P24-00B2/B3: complete the five-person first-use cohort and two return sessions, reaching `15 / 15`.
4. Then P24-00C1: classify findings as keep/change/defer/blocking.
5. Then P24-00C2/C3: implement observed Blocking/High fixes and run the final completion audit before reopening source v2 merge, cloud persistence, or integrations.
