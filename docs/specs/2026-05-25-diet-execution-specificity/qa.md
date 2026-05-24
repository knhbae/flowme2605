# QA

## Targeted Checks

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on `real-fitvely-video-body-fat-6kg-method needs a narrow application summary`.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed.

## Full Checks

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.

## Screenshot Requirement

No screenshot is required for this batch. The visible layout is unchanged; the user-facing change is item-detail copy inside the existing Flow surface.
