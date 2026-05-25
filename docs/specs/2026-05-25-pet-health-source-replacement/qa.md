# QA

## Targeted Checks

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts lib/flow/natural-artifact-audit.test.ts` failed while `real-pet-health-visit-routine` still used `source_precision: broad`.
- GREEN: the same targeted command passed after exact-source replacement and broad guard updates.

## Full Checks

- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with existing CRLF warnings only.

## Screenshot Requirement

Captured updated Flow Lab evidence at `docs/screenshots/2026-05-25-pet-health-source-replacement-flow-lab.png` because the visible Broad Source Guard count changes from 3 to 2.
