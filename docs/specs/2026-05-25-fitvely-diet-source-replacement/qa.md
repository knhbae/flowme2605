# QA

## Targeted Checks

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts` failed while `real-fitvely-diet-record-routine` still used the broad site source.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts lib/flow/artifact-plan.test.ts` passed after exact-source replacement and broad guard updates.

## Full Checks

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` passed.
- `git diff --check` passed with CRLF warnings only.

## Screenshot Requirement

An updated Flow Lab screenshot is required because the visible Broad Source Guard count changes from 5 to 4.

Screenshot captured:

- `docs/screenshots/2026-05-25-fitvely-diet-source-replacement-flow-lab.png`
