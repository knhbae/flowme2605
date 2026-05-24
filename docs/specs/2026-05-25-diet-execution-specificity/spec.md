# Diet Exact Video Execution Specificity Spec

## Goal

Keep diet and body-composition exact-video Flows limited to one safe, observable application instead of broad diet planning.

## Product Context

Stage 0 is export-first. A diet principle video should become a portable memo or log action, not a full diet plan and not a health claim.

## Scope

In scope:

- Add failing test coverage for FITVELY diet exact-video detail requirements.
- Update diet exact-video generated details with summary, selected rule, source instruction, observation record, and stop condition.
- Keep memo-first destination and one-action structure.
- Update audit, rules, PR history, and status docs.

Out of scope:

- Diet plan generation.
- Medical or nutrition prescriptions.
- Weight-loss outcome claims.
- Native long-term records or external integrations.
- Validation claims.

## Acceptance Criteria

- `real-fitvely-video-body-fat-6kg-method`, `real-fitvely-video-carb-reason`, and `real-fitvely-video-post-workout-nutrition` keep one memo-first action.
- Item details include summary, application rule, original video instruction, observation record, and stop condition.
- Diet-sensitive cautions mention restriction/binge/dizziness/stop/professional boundaries.
- Tests and docs checks pass before PR.

