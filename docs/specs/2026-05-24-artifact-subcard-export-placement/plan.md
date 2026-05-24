# Artifact Subcard Export Placement Plan

1. Write E2E coverage that fails while export actions still live in the generic workbench row.
2. Add reusable artifact export controls with the same handlers and disabled behavior.
3. Move the actions into destination-matched cards:
   - list/checklist: copy, Excel when no richer table exists, editable draft
   - calendar: calendar export
   - log/progress/spreadsheet table: Excel
   - decision table: copy, Excel, editable draft
   - routine and meal-reaction surfaces: calendar near schedule, Excel/copy near records
4. Keep duplicate button names to one primary place per workbench where possible so existing E2E locators remain stable.
5. Document natural artifact simulation, Flow/UX gap, and UX reinforcement.
6. Verify with build, targeted E2E, full tests, docs check, browser/screenshot review, PR, and merge when possible.

