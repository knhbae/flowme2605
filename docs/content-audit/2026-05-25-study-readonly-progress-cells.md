# Study Read-Only Progress Cells

Date: 2026-05-25

## Scope

This audit records the small UX change that makes `computer-skills-d30-study` look less like a blank user-authored tracker.

## User Simulation

Route: `computer-skills-d30-study`

Simulated first action:

- Open the route.
- Set the exam date.
- Read the source-derived study scope rows.
- Edit only target date and status for the first row.

Expected natural artifact:

- The progress table already contains source-derived scope values.
- The learner edits scheduling/status fields instead of designing the table structure.
- Spreadsheet export remains aligned with the source-derived scope guard from PR #47.

## UX Gap Closed

The source scope column previously rendered as the same input style as user fields. Even with export protection, the screen still implied the learner could rewrite the curriculum row. The scope column now renders as a neutral read-only value for the source-derived table.

## Screenshots

- [Desktop source-derived progress table](../screenshots/2026-05-25-study-readonly-progress-desktop.png)
- [Mobile source-derived progress table](../screenshots/2026-05-25-study-readonly-progress-mobile.png)

## Remaining Risk

The table remains horizontally scrollable on mobile. This is acceptable for the current small PR because it avoids a larger table redesign, but mobile study density should be revisited if real users struggle to edit target dates/status.
