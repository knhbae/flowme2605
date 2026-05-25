# FITVELY Diet Video Observation Sheet Audit

Date: 2026-05-25

## Trigger

The external review synthesis flagged `real-fitvely-diet-record-routine` and related FITVELY nutrition videos as useful but too compressed if the user cannot see which source rule they are applying. The Stage 0 value is not diet coaching; it is moving one creator nutrition idea into a small sheet the user can observe and later decide to keep or stop.

## Final Judgment

- FITVELY nutrition exact-video Flows should be sheet-first, not memo-first.
- Each route should keep one action: choose one source rule, apply it to one meal or workout-adjacent behavior, and record one observation row.
- The route must keep the original video link for details and exceptions.
- No route is validated by this batch.

## Routes Covered

- `real-fitvely-video-body-fat-6kg-method`
- `real-fitvely-video-carb-reason`
- `real-fitvely-video-three-week-check`
- `real-fitvely-video-post-workout-nutrition`
- `real-fitvely-video-carb-amount-shorts`
- `real-fitvely-video-after-work-nutrition`

## Issues

- High: `primary_destination` was still `memo`, even though the visible first artifact is a record table and the user needs a portable observation sheet.
- High: detail copy said to choose a rule, but did not expose a clear `기준 후보` step before applying it.
- Medium: detail copy mentioned recording, but not the sheet row shape strongly enough.
- Low: no Figma canvas is needed because this batch changes generated route metadata/copy, not layout or component hierarchy.

## Small Fix In This Batch

- Changed FITVELY diet exact-video routes to `sheet` primary destination.
- Added `기준 후보:` copy so the user first picks one rule from the source video.
- Added `관찰표:` copy so the route points to a date/action/rule/condition/keep-or-stop row.
- Updated backlog data so the next health-observation review does not repeat already landed work.

## Larger Work Excluded

- Automatic nutrition targets, gram calculations, or meal planning.
- Medical/diet claims or outcome promises.
- External app direct integrations.
- Native long-term health tracking.
- Rewriting workout-plan videos, which remain a separate decision-table/hybrid batch.

## Figma Use

No Figma file is required for this batch. Use Figma if a later pass changes the diet-video page layout, mobile workbench density, or source-rule selection UI.

## Screenshots

- Desktop: [fitvely diet video observation sheet desktop](../screenshots/2026-05-25-fitvely-diet-video-observation-sheet-final-desktop.png)
- Mobile: [fitvely diet video observation sheet mobile](../screenshots/2026-05-25-fitvely-diet-video-observation-sheet-final-mobile.png)
