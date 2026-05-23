# Source Replacement And Risk Reshape QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| RED targeted tests | Pass | `npm test -- lib/flow/artifact-fields.test.ts lib/flow/artifact-plan.test.ts` failed before implementation on missing study logs and sheet-first diet routing. |
| GREEN targeted tests | Pass | `npm test -- lib/flow/artifact-fields.test.ts lib/flow/artifact-plan.test.ts` passed after implementation. |
| `npm test` | Pass | 118 tests passed, 0 failed. |
| `npm run docs:check` | Pass | Documentation check passed: 14 required files, 63 local links. |
| `git diff --check` | Pass | No whitespace errors reported. |
| `npm run build` | Pass | Next.js production build compiled, type-checked, and generated 9 static pages. |
| `npm run test:e2e` | Pass | 39 Playwright tests passed after rebuilding the Next.js production bundle. |

## Review Notes

- Product constraint review: Route reshaping remains direct-route execution hardening; no route is promoted to validated or representative status.
- Source/risk review: Tax, medical, labor, business, and family routes record official-confirmation questions and proof locations rather than generated eligibility advice.
- UX review: Users now see the artifact shape they would actually keep: study logs, diet sheets, car defect evidence rows, and official memo cards.
- Residual risk: Static fields improve execution but do not yet rewrite every checklist item or add conditional branching from user input. One E2E failure exposed an accessibility-label collision between the health-check anchor input and a new memo field; the memo field label was changed to avoid strict-locator ambiguity.
