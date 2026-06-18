# My Flow Management Filters Spec

## Stage Fit

This is a Stage 0 support path, not a new native workspace push. Public Flow pages remain export-first. `/my` only helps users who already saved a Flow continue checking it inside FLOW when they did not export or want to return later.

## First User Action

The user opens `/my` after saving one or more Flows. Their first action should be choosing a management shape or narrowing the saved Flow list, then checking the next remaining item.

Completion looks like:

- A user can filter saved records by all Flows or a single Flow.
- A user can filter checklist rows by all, remaining, or completed.
- A user with a saved routine Flow sees a weekly routine surface instead of a generic card.

## Artifact Destination

- Calendar tab: internal calendar preview of saved dated items.
- Checklist tab: internal persisted check state.
- Routine tab: internal weekly routine preview plus persisted check state.
- Export artifacts remain on the public Flow detail workbench.

## Source/Risk Boundary

This change does not alter source, creator, or risk copy. The saved management views use existing Flow item titles and schedule metadata only.

## Natural Artifact

For `moving-d30-basic`, the natural artifact remains a dated moving checklist/calendar. In `/my`, users can inspect the same dates by Flow filter and mark remaining rows complete.

For a routine Flow such as `home-workout-20min`, the natural artifact is a weekly routine grid with selected weekdays and current action rows.

## UI Requirements

- Add a saved Flow filter when two or more saved Flows exist.
- The filter must affect `Flow별`, `캘린더`, `체크리스트`, and `루틴`.
- Add checklist status controls: `전체`, `남은 항목`, `완료`.
- Keep mobile compact and avoid horizontal overflow.
- The routine tab must show weekday chips, progress, continue action, and direct checkboxes for saved routine rows.
- If filters produce no rows, show a quiet empty state with the reason.

## Verification

- E2E saves seeded records for one moving Flow and one routine Flow, then verifies Flow filtering, checklist status filtering, and routine weekly UI.
- Build, unit tests, docs check, and full E2E must pass.
- Browser QA checks `/my` mobile at 390px for horizontal overflow.
