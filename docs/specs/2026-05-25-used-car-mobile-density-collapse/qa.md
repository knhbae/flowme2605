# Used-Car Mobile Density Collapse QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"` | Pass | Failed before implementation because `used-car-buying-check` had no collapsed mobile section |
| `npm run build` | Pass | Next.js production build succeeded |
| GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"` | Pass | 1 Playwright test passed |
| `npm test` | Pass | 161 tests passed |
| `npm run docs:check` | Pass | 14 required files, 256 local links |
| `git diff --check` | Pass | CRLF normalization warnings only |

## Review Notes

- Product constraint review: no new purchase advice, scoring, or integration.
- Source/risk review: route remains money-at-risk; FLOW structures evidence only.
- Browser or screenshot review: desktop/mobile screenshots saved in `docs/screenshots/`.
- Residual risk: this is not observed validation; a mobile rehearsal should still check whether buyers understand the buy/hold memo before task completion.
