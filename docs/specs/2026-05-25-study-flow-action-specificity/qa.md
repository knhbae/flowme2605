# QA

Date: 2026-05-25

## TDD Evidence

Red check:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts`
- Expected failures before implementation:
  - D-30 FLOW-conversion source boundary was missing.
  - Dated study ICS events did not include `실행:` guidance.

Green check:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts`
- Result after implementation: 169 tests passed.

## Verification

- `npm run build`
  - Passed on 2026-05-25.
- `npm test`
  - Passed on 2026-05-25: 169 tests passed.
- `npm run docs:check`
  - Passed on 2026-05-25: 14 required files and 256 local links.
- Related Playwright E2E
  - Passed on 2026-05-25: `computer skills final QA exports study calendar and score sheet records` and `study progress table exposes source-derived guard metadata`.
- `npm run test:e2e`
  - Passed on 2026-05-25: 53 tests passed.
- Vercel
  - Passed on PR #101 before merge.
- Merge
  - PR #101 was squash-merged as `495c9cf8302760f189bb0bc3a0b77573943ff69a`.
