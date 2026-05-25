# Diet Observation Guardrail Copy QA

Date: 2026-05-25

## Checks

| Check | Status | Notes |
|---|---|---|
| RED unit test | Pass | `diet habit route is framed as an observation sheet, not a diet prescription` failed on the old route title. |
| GREEN unit test | Pass | `npm test -- lib/flow/seed-flows.test.ts` passes after the rewrite. |
| Screenshot | Pass | Desktop and mobile screenshots captured for the rewritten route. |
| Targeted E2E | Pass | `npx playwright test tests/e2e/flow-mvp.spec.ts -g "risk-boundary QA exports|public MVP guardrail screens|flow lab shows converted pilot"` |
| Unit tests | Pass | `npm test` |
| Build | Pass | `npm run build` |
| Docs check | Pass | `npm run docs:check` |

## Quality Note

- User need: observe meals, sleep, activity, condition, and stop/consult signs for two weeks.
- Destination: sheet first, weekly memo second.
- Rubric low points: still needs mobile first-screen re-check and observed user evidence.
- Key decision: copy says observation and stop/consult condition before any diet habit language.
- Validation: not claimed.

## Screenshots

- [Desktop](../../screenshots/2026-05-25-diet-observation-guardrail-desktop.png)
- [Mobile](../../screenshots/2026-05-25-diet-observation-guardrail-mobile.png)
