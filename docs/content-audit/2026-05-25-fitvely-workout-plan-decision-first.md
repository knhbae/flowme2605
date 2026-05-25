# FITVELY Workout Plan Decision-First Audit

Date: 2026-05-25

## Scope

Routes:

- `real-fitvely-video-bulk-up-method`
- `real-fitvely-video-workout-order`
- `real-fitvely-video-workout-split-science`

These are exact FITVELY workout programming videos. They are not follow-along workout videos. The user need is to compare a source rule, choose one rule that fits their situation, and then copy that chosen rule into a weekly workout table or calendar reminder.

## Decision

Keep these routes as one-action, hybrid exact-video Flows, but make the first artifact a decision table before the weekly workout table.

No route is validated by this pass.

## Changes

- Artifact plan now maps the three workout programming routes to `decision_table`.
- The comparison table uses route-specific rows:
  - source-rule candidate from the original video
  - user condition fit such as schedule, recovery, and equipment
  - weekly workout table application
  - revise-or-hold condition
- Item detail copy now says `결정표:` before `결정 후 운동표:`.
- The exact-video tool card now says `운동 기준 결정표에 들어간 적용 Flow` instead of implying a workout table is already ready.

## Source and Risk Boundary

- The Flow does not invent exercise sequences, sets, weights, or outcome promises.
- The original video link remains the authority for the rule rationale and exceptions.
- FLOW only helps the user record a selected rule and move it into their own table, calendar, sheet, or memo.
- Pain, excessive fatigue, breathing trouble, recovery shortage, and schedule conflict remain revise-or-stop conditions.

## UX Result

The first screen now starts from the decision artifact:

1. Compare candidate rules.
2. Choose one source rule that fits the user's current condition.
3. Move only that rule into this week's workout table.
4. Export to calendar, sheet, or memo without needing FLOW signup.

Screenshots:

- [Desktop](../screenshots/2026-05-25-fitvely-workout-plan-decision-first-desktop.png)
- [Mobile](../screenshots/2026-05-25-fitvely-workout-plan-decision-first-mobile.png)

## Out Of Scope

- Automatic workout-plan generation.
- Direct external app integration.
- Native long-term workout records.
- New exercise instructions not present in the source video.
- Figma canvas handoff. This pass reused the existing decision-table component and was verified with Playwright screenshots.
