# QA

Date: 2026-05-25

## TDD Evidence

Red check:

- `npm test -- lib/flow/seed-flows.test.ts`
- Expected failures before implementation:
  - FITVELY diet exact-video routes still inferred `memo`.
  - Detail copy did not expose `기준 후보` or `관찰표`.

Red backlog check:

- `npm test -- lib/flow/ux-cleanup-backlog.test.ts`
- Expected failure before implementation:
  - Health-observation backlog did not record sheet-first/observation-sheet progress.

Green checks:

- `npm test -- lib/flow/seed-flows.test.ts`
  - Passed with 170 tests after implementation.
- `npm test -- lib/flow/seed-flows.test.ts lib/flow/ux-cleanup-backlog.test.ts`
  - Passed with 170 tests after backlog update.
- Related Playwright E2E
  - Passed on 2026-05-25: `diet exact video flow`, `artifact workbench shows the primary usable surface first`, and `artifact workbench saves local execution entries`.

## Verification

- `npm run build`
  - Passed on 2026-05-25.
- `npm test`
  - Passed on 2026-05-25: 170 tests passed.
- `npm run docs:check`
  - Passed on 2026-05-25: 14 required files and 260 local links.
- Related Playwright E2E
  - Passed on 2026-05-25: 3 tests.
- Screenshots
  - Captured on 2026-05-25: [desktop](../../screenshots/2026-05-25-fitvely-diet-video-observation-sheet-final-desktop.png) and [mobile](../../screenshots/2026-05-25-fitvely-diet-video-observation-sheet-final-mobile.png).
- `npm run test:e2e`
  - Passed on 2026-05-25: 53 tests passed.
- Vercel
  - Passed on PR #103 before merge.
- Merge
  - PR #103 was squash-merged as `94bdeaef0e03db7079003e21e421513e56283692`.
