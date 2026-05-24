# QA

## Targeted Checks

- `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed.
- `npm run build` passed.
- `npm run test:e2e -- --grep "study progress table exposes source-derived guard"` passed.

## Full Checks

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.

## Screenshot Requirement

No screenshot is required for this batch because the shipped behavior is export merge protection and test-only DOM metadata, not a visible layout or copy change.
