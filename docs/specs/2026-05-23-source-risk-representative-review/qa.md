# Source Risk Representative Review QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| RED targeted test | Pass | `npm test -- lib/flow/content-lab.test.ts` failed before implementation because `./representative-readiness-review` did not exist. |
| GREEN targeted test | Pass | `npm test -- lib/flow/content-lab.test.ts` passed after implementation: 120 tests passed, 0 failed. |
| `npm test` | Pass | 120 tests passed, 0 failed. |
| `npm run docs:check` | Pass | Documentation check passed: 14 required files, 68 local links. |
| `git diff --check` | Pass | No whitespace errors reported. |
| `npm run build` | Pass | Next.js production build compiled, type-checked, and generated 9 static pages. |
| `npm run test:e2e` | Pass | 39 Playwright tests passed. |

## Review Notes

- Product constraint review: No actual representative exposure changes are made.
- Source/risk review: `new-car-delivery-check` and `diet-habit-2week` stay public MVP candidates, not representative candidates, because they are financial/medical sensitive.
- UX review: Flow Lab now exposes the promotion queue explicitly instead of burying the decision in docs.
- Residual risk: The three public pages still need browser screenshots/manual page QA before any final promotion PR.
