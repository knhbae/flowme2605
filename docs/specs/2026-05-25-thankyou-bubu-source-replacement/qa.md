# QA

## Targeted Checks

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts` failed while both ThankyouBUBU routes still used the channel-level source and broad count remained 7.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts` passed after exact-source replacement and guard updates.

## Full Checks

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` passed after updating the Source-Fit summary expectation from 7 to 5.
- `git diff --check` passed with CRLF warnings only.

## Screenshot Requirement

An updated Flow Lab screenshot is required because the visible Broad Source Guard count changes from 7 to 5.

Screenshot captured:

- `docs/screenshots/2026-05-25-thankyou-bubu-source-replacement-flow-lab.png`
