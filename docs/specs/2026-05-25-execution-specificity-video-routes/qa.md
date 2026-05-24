# QA

## Targeted Checks

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on `real-thankyou-bubu-video-full-body-no-jump needs an execution summary`.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed.

## Full Checks

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.

## Screenshot Requirement

No screenshot is required for this batch. The visible page layout is unchanged; the user-facing change is detail copy inside existing item-detail content.
