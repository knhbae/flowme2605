# FITVELY Workout Plan Decision First

Date: 2026-05-25

## Problem

FITVELY workout programming videos were treated too much like a weekly workout table. Users first need to choose a source rule or split that fits their schedule, recovery, equipment, and goal before calendarizing anything.

## Scope

- Keep the three workout programming exact-video routes as one-action hybrid Flows.
- Make their primary artifact `decision_table`.
- Add route-specific decision rows for source-rule candidate, user-condition fit, weekly-plan application, and revise-or-hold condition.
- Rewrite item detail copy so `결정표:` comes before `결정 후 운동표:`.
- Rewrite exact-video tool copy so it describes decision-table-first application.

## Out Of Scope

- Automatic routine generation.
- External app direct integrations.
- New source-specific exercise details, sets, weights, or outcome claims.
- Login, payment, community, or native long-term records.

## Acceptance Criteria

- Each target route starts from a comparison/decision table in artifact plan and public UI.
- Calendar and sheet export affordances remain available.
- Detail copy preserves source-video authority and revise-or-stop conditions.
- No route is called validated.
- Desktop and mobile screenshots are captured after the UI change.
