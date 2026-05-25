# Export-First Redesign Batch 1 Audit

Date: 2026-05-25

## Trigger

The redesign mockup in `my_tests/flow_redesign_mockups.html` reframed the main UX problem: FLOW pages still ask users to inspect item lists before they understand the external artifact they will get. Screen 2, Screen 3, and Screen 5 define the first implementation batch.

## Scope

- Reference route: `moving-d30-basic`
- Screen 2: export-first hero with calendar-result preview and date input.
- Screen 3: mobile bottom sheet with primary export destinations separated from editing.
- Screen 5: item card state hierarchy for checkbox, memo, skip, detail, and skipped state.

## Final Judgment

- The first viewport should show the natural external output before the full item list.
- Export actions should read as destinations: calendar, Excel, and text.
- Editing should be secondary because it is a different job from exporting.
- Item cards should make skip state visibly distinct and exclude skipped items from progress.
- This batch is a UX structure correction, not validation.

## Issues Addressed

- High: moving Flow first screen was still dominated by setup/workbench/list sequence rather than the calendar result preview.
- High: mobile export actions treated copy, Excel, calendar, and editing as equivalent actions.
- Medium: item card controls were boxed equally, making memo, skip, and detail feel like competing primary actions.
- Medium: skipped cards did not state clearly that they are excluded from progress.

## Fixes

- Added an export-first hero for `moving-d30-basic` showing milestone calendar rows before the item list.
- Moved the moving date input into the hero while preserving existing anchor behavior.
- Updated mobile export sheet copy and action order: calendar, Excel, text, then edit.
- Updated the sticky mobile CTA to `내 도구로 가져가기`.
- Restyled item card controls as a compact row and added explicit skipped-state text.

## Excluded

- Applying the hero to all routes.
- Redesigning routine-video calendar generation.
- Adding direct external integrations.
- Changing export data semantics.
- Calling the redesign validated.

## Figma

The installed Figma workflow was considered, but this batch used the provided HTML mockup as the visual source and implemented directly in code. Use Figma for the next larger layout pass if Screen 2 is generalized across route families or if mobile table/card variants need a shared design artifact.

## Screenshots

- Desktop: [export-first redesign batch 1 desktop](../screenshots/2026-05-25-export-first-redesign-batch1-moving-desktop.png)
- Mobile: [export-first redesign batch 1 mobile](../screenshots/2026-05-25-export-first-redesign-batch1-moving-mobile.png)
