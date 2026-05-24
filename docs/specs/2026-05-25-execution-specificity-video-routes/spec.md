# Execution Specificity For Video Routes Spec

## Goal

Make source-reviewed creator video Flows more executable without expanding Stage 0 scope.

## Product Context

The user pointed out that `ThankyouBUBU 전신 다이어트 실천 Flow` tells users to do a workout, but not enough about how to use the source, what to record, or when to stop. That is a real UX gap: source review proves source boundary, not execution readiness.

Stage 0 remains export-first. The fix should strengthen conversion quality, not add native record keeping, automatic generation, direct integrations, or new platform features.

## Scope

In scope:

- Add category-level execution-specificity rules.
- Strengthen exact follow-along workout video details with summary, detailed guide, original source link instruction, post-workout record, and stop condition.
- Keep exact workout videos as one execution action.
- Add tests for the new exact-video detail requirement.
- Update content audit, PR history, and status docs.

Out of scope:

- Automatic movement extraction from YouTube.
- Inventing exercise sequences not present in the source.
- Native long-term workout records.
- Direct YouTube, Calendar, Sheets, or health-app integrations.
- Calling the route validated.

## Acceptance Criteria

- `real-thankyou-bubu-video-full-body-no-jump`, `real-thankyou-bubu-video-daily-stretch-9min`, and `real-thankyou-bubu-video-no-knee-cardio-strength` keep one action.
- Their item details include summary, detailed guide, original video instruction, post-workout record, and stop condition.
- The source link remains a creator link.
- Docs explain that `source reviewed` is not enough for execution-specific readiness.
- Verification runs include targeted unit tests, docs check, full unit tests, build, and diff check.

