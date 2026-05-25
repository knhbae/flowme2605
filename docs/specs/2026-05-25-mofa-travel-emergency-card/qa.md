# MOFA Travel Emergency Card QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| RED: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` | Pass | Failed before implementation because MOFA used generic travel fields and `timeline_calendar` |
| `npm run build` | Pass | Next.js production build succeeded |
| GREEN: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` | Pass | 163 tests passed in the targeted command |
| `npx playwright test tests/e2e/flow-mvp.spec.ts -g "MOFA travel route"` | Pass | 1 Playwright test passed |
| `npm test` | Pass | 163 tests passed |
| `npm run docs:check` | Pass | 14 required files, 256 local links |
| `git diff --check` | Pass | CRLF normalization warnings only |

## Review Notes

- Product constraint review: no automatic travel eligibility/risk decision.
- Source/risk review: MOFA remains the official source; FLOW only structures the user's check result and emergency contacts.
- Browser or screenshot review: desktop/mobile screenshots saved in `docs/screenshots/`.
- Residual risk: this is not observed validation; the next rehearsal should confirm whether a traveler can fill the memo without confusing it with travel safety approval.
