# Pet Health Source Replacement

Date: 2026-05-25
Branch: `content/pet-health-source-replacement`
PR: TBD
Status: Ready for PR

## Why

`real-pet-health-visit-routine` was still backed by a broad Animal.go.kr FAQ. That source was useful for animal registration/admin facts, but too broad for a hospital visit preparation and follow-up record Flow.

## Changed

- Replaced the broad FAQ source with the exact 서울시 우리동네 동물병원 official page.
- Kept the route in `keep_catalog_review`.
- Updated broad-source guard count from 3 to 2.
- Added audit/spec docs.

## Not Done

- Did not promote the route.
- Did not mark validation.
- Did not create medical guidance.
- Did not rewrite the full pet-health UX in this batch.

## Verification

- RED: targeted source replacement tests failed before implementation.
- GREEN: targeted tests passed after implementation.
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with existing CRLF warnings only.
- Screenshot: `docs/screenshots/2026-05-25-pet-health-source-replacement-flow-lab.png`
