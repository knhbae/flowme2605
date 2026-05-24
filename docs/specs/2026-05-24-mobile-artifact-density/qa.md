# Mobile Artifact Density QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| RED: `npm run test:e2e -- --grep "mobile workbench keeps export buttons"` | Pass | Failed before implementation because the mobile study progress card still exposed `엑셀로 받기`. |
| GREEN: `npm run test:e2e -- --grep "mobile workbench keeps export buttons"` | Pass | 1 test passed after rebuilding and hiding card buttons on mobile. |
| `npm run build` | Pass | Required before GREEN because Playwright had reused a previous `next start` build. |
| `npm run docs:check` | Pass | Documentation check passed: 14 required files, 205 local links. |
| `npm test` | Pass | 129 tests passed. |
| `npm run test:e2e` | Pass | 47 tests passed. |

## Screenshots

- Study mobile: [2026-05-24-mobile-artifact-density-study-mobile.png](../../screenshots/2026-05-24-mobile-artifact-density-study-mobile.png)

## Review Notes

- Product constraint review: export-first remains intact; no native record feature was added.
- Source/risk review: no source or warning copy changed.
- Browser or screenshot review: mobile screenshot confirms artifact-card buttons are hidden and sticky export remains visible.
- Residual risk: the bottom sheet still contains multiple export options; split it later only if mobile screenshots or user behavior show continued confusion.
