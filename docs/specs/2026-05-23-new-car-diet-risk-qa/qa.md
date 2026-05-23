# QA Notes

## Natural Artifact Simulation

### `new-car-delivery-check`

- Input: `vehicle=Avante CN7 VIN 4821`, `delivery bay=Mapo`, `photo=door-scratch-4821.jpg`, `dealer confirmation=written repair date pending`.
- Expected artifact: evidence sheet rows plus proof memo fields for photo files, dealer confirmation, and handover boundary.
- Current gap before this PR: the decision table existed, but standalone proof memo fields were not visible beside it.
- Fix: add delivery proof memo fields and verify xlsx download preserves the values.

### `diet-habit-2week`

- Input: `start=2026-06-01`, day 1 meal/activity/measurement/condition/review, day 3 dizziness stop condition, weekly review.
- Expected artifact: observation sheet, not diet prescription.
- Current gap before this PR: spreadsheet-first UX existed, but the warning hierarchy was outside the first workbench surface.
- Fix: show the warning boundary beside the weekly review and verify xlsx download preserves the observation values.

## Screenshots

- [New-car desktop](../../screenshots/2026-05-23-new-car-risk-qa-desktop.png)
- [New-car mobile](../../screenshots/2026-05-23-new-car-risk-qa-mobile.png)
- [Diet desktop](../../screenshots/2026-05-23-diet-risk-qa-desktop.png)
- [Diet mobile](../../screenshots/2026-05-23-diet-risk-qa-mobile.png)

## Verification

- `npm test -- lib/flow/artifact-fields.test.ts` passed.
- `npm test -- lib/flow/content-lab.test.ts` passed.
- `npm test -- lib/flow/export.test.ts` passed.
- `npm test` passed: 125 tests.
- `npm run docs:check` passed: 14 required files, 90 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run build` passed.
- `npm run test:e2e -- --grep "risk-boundary QA"` passed.
- `npm run test:e2e` passed: 41 tests.

## Residual Risk

- These routes are public MVP candidates, not representative candidates.
- Real validation still requires observed open, input, export, check, repeat, and correction behavior.
