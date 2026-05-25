# Workout-Plan Exact Video Execution Specificity Spec

## Goal

Keep workout-programming exact videos distinct from follow-along workout and diet videos.

## Product Context

Stage 0 remains export-first. Workout-plan videos should move one source-derived rule into the user's weekly workout table, not produce an automatic training plan or a medical/fitness prescription.

## Scope

In scope:

- Add failing test coverage for FITVELY workout-plan exact-video detail requirements.
- Update workout-plan generated details with selected rule, weekly workout table, original source instruction, record fields, and revise-or-hold conditions.
- Keep one-action and hybrid destination semantics.
- Update audit, rules, PR history, and status docs.

Out of scope:

- Full workout-plan sheet redesign.
- Automatic multi-week training generation.
- Movement extraction or exercise prescription.
- Native long-term records or external integrations.
- Validation claims.

## Acceptance Criteria

- `real-fitvely-video-bulk-up-method`, `real-fitvely-video-workout-order`, and `real-fitvely-video-workout-split-science` remain one-action and hybrid.
- Item details include summary, selected rule, weekly workout table guidance, original source instruction, record fields, and revise-or-hold condition.
- Caution copy covers pain, fatigue, breathing, stopping, and expert consultation.
- Tests and docs checks pass before PR.

