# Revised P24 Backlog

## Gate Status

| Gate | Status | Reason |
| --- | --- | --- |
| P24-00A independent automated journey QA | done | Codex clean baseline and Claude Code dirty-dev audits both available |
| P24-00R evidence/runtime reconciliation | done | clean and dependency-candidate worktrees were measured from `211827d` |
| P24-00OPS2 dependency upgrade | done | audit high 0; unit 514, build and 274 distinct Playwright tests passed on Next 15.5.20 |
| P24-J0 journey-frame decision | in progress | owner feedback reopened save-before, post-save whole-Flow confirmation, My Flow/Calendar roles, and held-content visibility |
| P24-00B observed users | deferred, not scheduled | owner explicitly judged the product not ready for external observation; reopen only after P24-J5 readiness audit and a separate owner decision; real sessions remain 0 / 15 |
| P24-01A source v2 merge | deferred | wait for P24-00B/00C observation evidence before broadening merge behavior |

Current journey-frame package: [2026-07-18 Save, Personalize, Execute Journey Review](../2026-07-18-flowme-save-personalize-execute-journey-review/README.md).

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

Current state: done. PR [#120](https://github.com/knhbae/flowme2605/pull/120) merged as `bc8fc649`, deployment `dpl_GdeGC2WdBz34ttHp4fZyQkYmRLP6` reached `Ready`, and <https://flowme2605.vercel.app> returned anonymous HTTP 200 with the FLOW home. Generated branch preview URLs remain protected; the public production alias is available for internal production inspection, not current participant recruitment.

### P24-00OPS2 Controlled dependency upgrade - done

Promoted from P25 because the prior production baseline reported high `4`. The isolated upgrade reached high `0` with Next `15.5.20`, Playwright `1.61.1`, and PostCSS `8.5.16` without a forced ExcelJS downgrade. Docs, unit `514 / 514`, build, `274 / 274` distinct Playwright tests across bounded shards, 390px/1024px capture and rollback evidence are recorded in the [P24-00OPS2 package](../2026-07-14-p24-00ops2-controlled-dependency-upgrade-evidence/README.md).

## Human Validation

### P24-00B

This future gate remains defined as 5 participants x 3 sessions, but no participant should be recruited or asked to observe FlowMe now. The [P24-00B observed-user guide](../2026-07-14-p24-00b-observed-user-test-guide/README.md) is a deferred shelf artifact, not a current operating instruction.

The [two-person first-session pilot package](../2026-07-14-p24-00b1-two-person-pilot/README.md) remains a historical, deferred shelf artifact. It does not establish current readiness and must not be used to recruit participants; both sessions remain `not_started`.

Prior product and operations checks do not make the current journey observation-ready. Observed-user session count remains `0 / 15`, and the gate is not scheduled.

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

1. P24-J0: compare current production, the prior simulation, Claude mockups, and two alternative wireframes; use owner and independent heuristic review only.
2. P24-J1~J3: implement only the selected save-before, post-save, My Flow/Calendar, and held-visibility corrections.
3. P24-J4: run integrated regression and deploy the corrected frame.
4. P24-J5: run an independent production-readiness audit and report `implementation_complete_observation_not_started` or `not_ready_for_observation`.
5. P24-00B/P24-00C: remain outside the current execution queue until the owner explicitly reopens observation after J5.
