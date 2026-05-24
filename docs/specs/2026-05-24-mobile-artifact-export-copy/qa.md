# Mobile Artifact Export Copy QA

## FLOW Quality Note

- User need: after checking items on mobile, receive the same checklist, sheet, calendar, or editable draft artifact without interpreting a separate backup panel.
- Destination: checklist/todo, spreadsheet, calendar, editable draft.
- Rubric low point before this batch: copy specificity. The mobile sheet still said `내보내기와 백업`, which described a generic mechanism instead of the user's artifact.
- Key decision: keep the bottom sheet for thumb reach, but align its labels with the artifact-card controls.

## Planned Verification

- RED: targeted mobile E2E fails while the sticky action is still `내보내기`.
- GREEN: `npm run build` passed.
- GREEN: targeted mobile E2E passed.
- GREEN: `npm test` passed 129 tests.
- GREEN: `npm run docs:check` passed 14 required files and 193 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed 46 tests.
- Screenshot: [mobile bottom sheet after one checked moving task](../../screenshots/2026-05-24-mobile-artifact-export-copy-sheet.png).
