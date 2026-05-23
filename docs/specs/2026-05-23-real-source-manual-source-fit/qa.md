# Real-Source Manual Source-Fit QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm test` | Passed | 108 tests, 0 failures. |
| `npm run docs:check` | Passed | 14 required files, 60 local links. |
| `npm run build` | Passed | Next.js production build compiled and type-checked successfully. |
| `npm run test:e2e -- --grep "flow lab"` | Passed | 1 targeted Playwright test passed. |
| `npm run test:e2e` | Passed | 38 Playwright tests passed. |

## Review Notes

- Product constraint review: This updates audit/exposure metadata only, not user-facing route reshaping.
- Source/risk review: Broad channel/site sources remain catalog preview; sensitive or exact-video content can remain source-review until UX gaps close.
- Browser or screenshot review: Flow Lab count check confirms the visible manual source-fit count and catalog-preview count changed.
- Residual risk: Score profiles are batch-level mappings from already-written manual natural-artifact decisions, not freshly rescored line-by-line route entries.
