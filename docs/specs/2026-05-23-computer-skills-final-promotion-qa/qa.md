# Computer Skills Final Promotion QA

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| RED promotion tests | Pass | New source-fit/lifecycle tests first failed because `computer-skills-d30-study` was still `reshape_before_featured`/`fix`. |
| Targeted unit tests | Pass | `npm test -- lib/flow/source-fit.test.ts`, `npm test -- lib/flow/content-lifecycle.test.ts`, and `npm test -- lib/flow/content-lab.test.ts` each passed after implementation. |
| Production build | Pass | `npm run build` compiled, type-checked, and generated 9 static pages after the temporary dev server was stopped. |
| Targeted E2E | Pass | `npm run test:e2e -- --grep "computer skills final QA"` passed 1 test. |
| Full unit suite | Pass | `npm test` passed 123 tests, 0 failed. |
| Docs check | Pass | `npm run docs:check` passed: 14 required files, 84 local links. |
| Whitespace check | Pass | `git diff --check` reported no whitespace errors. |
| Full E2E suite | Pass | `npm run test:e2e` passed 40 Playwright tests. |

## Screenshot Evidence

- Desktop: [2026-05-23-computer-skills-final-qa-desktop.png](../../screenshots/2026-05-23-computer-skills-final-qa-desktop.png)
- Mobile first screen: [2026-05-23-computer-skills-final-qa-mobile-first-screen.png](../../screenshots/2026-05-23-computer-skills-final-qa-mobile-first-screen.png)
- Mobile export sheet: [2026-05-23-computer-skills-final-qa-mobile-export-sheet.png](../../screenshots/2026-05-23-computer-skills-final-qa-mobile-export-sheet.png)

## Manual QA Notes

- Desktop first screen answered the 10-second test: purpose, exam-date input, next action, progress, and export state were visible without external explanation.
- The artifact workbench exposed both expected natural outputs: D-30 calendar and score/error sheet.
- Simulated user rows used `examDate=2026-06-22`, chapter scope `spreadsheet functions and pivot tables`, score `68`, wrong answers `function formulas, pivot table`, and retry date `2026-06-02`.
- Mobile first screen did not show incoherent overlap at 390px width.
- Mobile bottom sheet opened after one item was checked.
- No representative promotion was applied to `new-car-delivery-check` or `diet-habit-2week`.
