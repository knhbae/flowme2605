# Observed-session run sheet

Date: 2026-05-26

This batch turns the observed-session prep records into downloadable moderator run sheets inside Flow Lab.

## Change

- Added run-sheet markdown generation from existing observed-session prep records.
- Added a run-sheet preview and download button beside the observed-session note intake.
- Included goal, moderator prompt, expected artifacts, screenshot targets, pass signals, failure signals, handoff note, and allowed decision labels.
- Kept `validated candidate` out of the run sheet decision options.

## Boundary

This is session-operation support only. It does not create user evidence, does not store session results, and does not mark any route validated.

## Verification

- RED: `npm test -- lib/flow/content-lab.test.ts` failed before run-sheet helpers existed.
- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted"` failed before run-sheet preview existed.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after adding run-sheet generation.
- GREEN: `npm run build` passed after wiring prep records through Flow Lab.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted"` passed after verifying preview and download.
