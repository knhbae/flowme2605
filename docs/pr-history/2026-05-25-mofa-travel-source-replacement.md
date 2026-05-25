# MOFA Travel Source Replacement

Date: 2026-05-25
Branch: `content/mofa-travel-source-replacement`
PR: #71
Status: Merged

## Why

`real-mofa-overseas-travel-prep` used the broad MOFA overseas safety portal even though its natural-artifact audit already simulates a Vietnam trip. The user should not have to choose the country page after opening the Flow.

## Changed

- Replaced the broad MOFA portal source with the exact MOFA Vietnam country page.
- Kept the route in `reshape_content_or_ux`.
- Updated broad-source guard count from 2 to 1.
- Added audit/spec docs.

## Not Done

- Did not promote the route.
- Did not mark validation.
- Did not add destination auto-detection.
- Did not rewrite the full travel UX in this batch.

## Verification

- RED: targeted source replacement tests failed before implementation.
- GREEN: targeted tests passed after implementation.
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with existing CRLF warnings only.
- Screenshot: `docs/screenshots/2026-05-25-mofa-travel-source-replacement-flow-lab.png`
- Vercel: https://vercel.com/flowme/flowme2605/5ZPWaaKQwL1ekmG5MujNGD5Ubxm4
- Merged: PR #71 as squash commit `d0d1d7206a7da8c920131de2a7e3c308bcb6b319`.
