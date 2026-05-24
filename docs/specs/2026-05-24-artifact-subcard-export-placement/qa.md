# Artifact Subcard Export Placement QA

## FLOW Quality Note

- User need: move a converted Flow artifact into the user's own todo, calendar, sheet, or editable draft without scanning a generic export panel.
- Destination: checklist/todo, calendar, spreadsheet, memo/draft.
- Rubric low points before this batch: cognitive load and portability. Export existed, but the workbench still made users map generic buttons to the right artifact.
- Key decisions: remove the generic top export row; place buttons beside the exact artifact that will be exported; keep study progress source-derived.

## Planned Verification

- RED: targeted E2E fails because `artifact-list-card` and subcard buttons do not exist.
- GREEN: `npm run build`.
- GREEN: targeted E2E for artifact-near export placement.
- GREEN: `npm test` passed 129 tests.
- GREEN: `npm run docs:check` passed 14 required files and 185 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed 46 tests.
- Browser: moving desktop DOM check confirmed the generic export row is absent and list/calendar card export controls exist.
- Screenshot: [moving desktop](../../screenshots/2026-05-24-artifact-subcard-export-placement-moving-desktop.png)
- Screenshot: [study mobile](../../screenshots/2026-05-24-artifact-subcard-export-placement-study-mobile.png)

## Manual UX Checks

- Moving desktop: no generic export instruction row appears above the list/calendar grid.
- Moving desktop: list card has checklist copy, Excel, and editable draft; calendar card has calendar export.
- Study mobile: chapter progress table has Excel; calendar has calendar export; progress rows remain prefilled from source shape.
- No-anchor route: calendar export remains absent while checklist copy remains available.
