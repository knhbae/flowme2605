# Diet Exact Video Execution Specificity Audit

Date: 2026-05-25

## Decision

Diet and body-composition exact videos should not become broad diet plans. In Stage 0 they should become one portable memo or log action: choose one rule, apply it to one meal or workout-adjacent moment, record observation, and stop when risk signals appear.

## Natural Artifact Simulation

Route: `real-fitvely-video-body-fat-6kg-method`

Simulated user input:

- Next meal: dinner
- Application target: one plate composition rule
- Observation: hunger level, dizziness, binge trigger, whether to repeat

Expected outside artifacts:

- Memo: selected rule, source URL, meal/time applied, body-state note, keep/stop decision.
- FLOW check: one action is done after applying the rule once and recording whether it felt safe and repeatable.

Previous UX gap:

- The Flow already narrowed the action to one meal, but the detail did not clearly separate narrow summary, selected rule, source-video authority, observation record, and stop condition.

Current change:

- FITVELY diet exact-video details now include summary, application rule, original video instruction, observation record, and stop condition while keeping memo-first routing.

## Route Status

| Route | Label | Notes |
|---|---|---|
| `real-fitvely-video-body-fat-6kg-method` | `execution-specific` for first diet exact-video pass | Still not validated; no user behavior evidence yet. |
| `real-fitvely-video-carb-reason` | `execution-specific` for first diet exact-video pass | Keeps one carbohydrate-rule application instead of a full diet plan. |
| `real-fitvely-video-post-workout-nutrition` | `execution-specific` for first diet exact-video pass | Keeps one workout-adjacent nutrition memo and stop condition. |
| Other FITVELY diet/nutrition exact videos | Needs follow-up review | The generator improvement applies broadly, but each route still needs source-level judgment before promotion. |

## Follow-Up

- Review workout-plan exact videos separately; they are hybrid weekly-plan content, not memo-first diet content.
- Review measurement-implied routes for whether a sheet log is needed without promising body-size outcomes.
- Keep all route status below `validated` until observed user sessions exist.

