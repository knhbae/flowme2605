# Setup Export Card Reduction Plan

## Implementation

1. Add RED E2E coverage that expects `내보내기와 백업` to be absent from the normal Flow first screen.
2. Update existing export-download E2E calls to use the workbench buttons added in PR #37.
3. Remove the setup export card from `components/flow/AppClient.tsx`.
4. Keep `copy`, `downloadExcel`, `downloadCalendar`, and mobile export sheet code unchanged.
5. Capture moving desktop and study mobile screenshots.
6. Run full verification, open PR, merge if checks pass, and sync main.

## Review Checkpoints

- Do not remove mobile bottom-sheet copy.
- Do not remove artifact-near export controls.
- Do not change download filenames or formats.
- Keep this PR as a layout reduction, not a new export system.
