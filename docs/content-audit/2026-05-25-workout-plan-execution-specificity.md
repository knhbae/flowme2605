# Workout-Plan Exact Video Execution Specificity Audit

Date: 2026-05-25

## Decision

Workout-plan exact videos are not the same as follow-along workout videos. They should not be calendar-only "do this workout" actions and should not become full training prescriptions.

For Stage 0, the right conversion is hybrid:

- choose one source-derived rule,
- put it into the user's weekly workout table,
- apply it once,
- record fatigue, pain/breathing issues, and next-session adjustment,
- revise or hold when the body or schedule says the plan is not working.

## Natural Artifact Simulation

Route: `real-fitvely-video-workout-split-science`

Simulated user input:

- Current schedule: 3 workout days per week
- Selected rule: split/rest structure from the source
- Weekly plan row: Mon lower, Wed upper, Sat full-body review
- Record: completed, fatigue 3/5, no pain, keep next week

Expected outside artifacts:

- Weekly workout table: chosen source rule, workout day, session order, target area, set/rest note, next-session adjustment.
- Calendar/check state: the user applies the chosen rule during the next workout block.
- FLOW detail: source video remains authoritative for the reasoning and exceptions.

Previous UX gap:

- The Flow said to put the rule into the weekly workout plan, but did not separate selected rule, weekly table, original video authority, record, and revise/hold conditions.

Current change:

- FITVELY workout-plan exact-video details now include summary, preparation, selected rule, weekly workout table guidance, original video instruction, record fields, and revise-or-hold condition.

## Route Status

| Route | Label | Notes |
|---|---|---|
| `real-fitvely-video-bulk-up-method` | `execution-specific` for first workout-plan pass | Still not validated; needs observed user behavior. |
| `real-fitvely-video-workout-order` | `execution-specific` for first workout-plan pass | Keeps goal/order choice as one rule before weekly plan application. |
| `real-fitvely-video-workout-split-science` | `execution-specific` for first workout-plan pass | Keeps split/rest logic as one weekly workout-table rule. |

## Follow-Up

- Workbench/export artifacts still need a richer workout-plan sheet if these routes become public MVP candidates.
- Broad ThankyouBUBU and FITVELY source routes still need exact source replacement or preview-only treatment before promotion.
- Do not mark these routes validated until observed sessions show users can choose a rule and move it into their actual workout tool.

