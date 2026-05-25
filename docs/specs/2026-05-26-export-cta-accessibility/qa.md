# Export CTA Accessibility QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Related Playwright | Pass | `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile export actions\|baby food mobile starts"` passed 2 tests. |
| `npm run build` | Pass | Next.js production build completed successfully. |
| `npm test` | Pass | 173 unit/parser/export/content tests passed. |
| `npm run docs:check` | Pass | Documentation check passed after final QA note updates. |
| `npm run test:e2e` | Pass | 58 Playwright tests passed. |

## Review Notes

- The pass is intentionally scoped. It avoids changing the accessible name for every desktop export button because many existing tests and user paths rely on those visible labels.
- Visible labels remain short; screen readers receive destination plus artifact context.
