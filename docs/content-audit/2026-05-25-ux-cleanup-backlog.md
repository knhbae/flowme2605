# UX Cleanup Backlog

Date: 2026-05-25

## Decision

The product direction and review standards are organized, but the actual content/UX cleanup is not complete across the catalog. This backlog separates unresolved cleanup areas from source review status.

No route is validated by this backlog.

## Summary

| Priority | Group | Route count | Decision | Next batch |
| --- | --- | ---: | --- | --- |
| P1 | `exact_workout_video_execution_detail` | 12 | Rewrite content before featured | Start with the two former broad-source ThankyouBUBU routes |
| P1 | `health_observation_guardrail` | 8 | Rewrite content before featured | Use `diet-habit-2week` as the observation-first reference for FITVELY nutrition routes |
| P1 | `vehicle_purchase_evidence_first` | 3 | Improve UX before featured | Keep evidence/comparison before checklist completion |
| P2 | `official_admin_condition_memo` | 5 | Improve UX before featured | Use passport/driver/Q-Net patterns for remaining official routes |
| P2 | `study_source_row_eligibility` | 1 | Merge or rewrite before featured | Decide whether `real-sinagong-computer-d30-study` duplicates the representative study route |
| P2 | `baby_food_reaction_first` | 1 | Improve UX before featured | Keep meal slot and reaction log before recipe density |
| P2 | `travel_safety_multi_source` | 2 | Rewrite content before featured | Add country-check and emergency-card outputs |
| P2 | `workout_programming_decision_table` | 3 | Rewrite content before featured | Separate programming decisions from follow-along workout videos |
| P3 | `hidden_or_hold_source_gap` | 1 | Hide or hold | Do not rewrite without a matching exact source |

Total: 9 groups, 36 routes.

Validated route count: 0.

## What Is Now Organized

The unresolved areas are no longer just scattered notes:

- Workout video routes need `summary / detailed guide / original video link / post-workout record / stop condition`.
- Diet and nutrition routes need `one selected source rule / observation row / stop-consult condition / no outcome promise`.
- Vehicle routes need `evidence or comparison table / proof fields / seller or dealer confirmation / hold memo`.
- Official routes need `official link / user situation fields / condition or submission memo / verification reminder`.
- Study routes need `source-derived rows` or a merge/hide decision if the route duplicates an existing representative route.
- Baby-food routes need meal slot and reaction log priority before recipe density.
- Travel routes need emergency memo and source separation, not a generic travel checklist.
- Routes without exact matching source stay hidden or on hold.

## First Rewrite Order

1. `exact_workout_video_execution_detail`
   - Reason: user specifically flagged that workout steps can say "exercise" without enough detail.
   - First route candidates: `real-thankyou-bubu-home-workout-starter`, `real-thankyou-bubu-20min-routine`.
   - 2026-05-25 update: first reshape pass completed for both candidates. They now keep one action and one detail panel with summary, detailed guide, original video link, post-workout record, and stop condition. They are still not validated.
2. `health_observation_guardrail`
   - Reason: health/diet routes can imply prescription or outcomes if wording is loose.
   - First route candidates: FITVELY exact nutrition routes after `diet-habit-2week` reference.
   - 2026-05-25 update: first exact FITVELY route reshape completed for `real-fitvely-diet-record-routine`. It now uses one source-rule action, a spreadsheet observation table, and stop/consult copy. It is still not validated.
3. `vehicle_purchase_evidence_first`
   - Reason: checklist completion can be mistaken for acceptance/readiness.
   - First route candidates: `vehicle-inspection-prep`, then re-check `used-car-buying-check`.
   - 2026-05-25 update: `vehicle-inspection-prep` now has a reservation/result follow-up memo card for reservation info, documents, precheck evidence, result sheet, and repair/reinspection follow-up. It is still not validated.
   - 2026-05-25 update: `used-car-buying-check` now keeps secondary checklist sections collapsed on mobile so candidate comparison and buy/hold memo stay first. It is still not validated.
4. `travel_safety_multi_source`
   - Reason: destination safety routes should not be generic travel checklists once an official country page exists.
   - First route candidate: `real-mofa-overseas-travel-prep`.
   - 2026-05-25 update: `real-mofa-overseas-travel-prep` now opens with a MOFA emergency memo card for official check date, alert result, embassy/consular contact, local emergency numbers, and family sharing. It is still not validated.
5. `baby_food_reaction_first`
   - Reason: baby-food content should keep reaction logging ahead of recipe/checklist density.
   - First route candidate: `baby-food-menu-recipe`.
   - 2026-05-25 update: `baby-food-menu-recipe` now keeps secondary meal-plan execution sections collapsed on mobile so the meal calendar and reaction log stay first. It is still not validated.

## External AI Review Readiness

This backlog makes external AI review safer, but the review prompt still needs strict constraints:

- Do not call anything validated.
- Simulate the natural artifact first.
- Classify findings by content, UX, source/risk, and export.
- Flag missing concrete execution detail as P1/P2, not polish.
- Do not invent source-specific details.

## Screenshot

![UX Cleanup Backlog Flow Lab panel](../screenshots/2026-05-25-ux-cleanup-backlog-flow-lab.png)
