# New-Car Evidence Guardrail Copy QA

Date: 2026-05-25

## Checks

| Check | Status | Notes |
|---|---|---|
| RED unit test | Pass | Targeted test failed on the old `신차 인수 증빙 비교표` title and generic route description. |
| GREEN unit test | Pass | `npm test -- lib/flow/artifact-fields.test.ts lib/flow/seed-flows.test.ts` passes after the rewrite. |
| Targeted E2E | Pass | `npx playwright test tests/e2e/flow-mvp.spec.ts -g "public MVP guardrail screens"` |
| Screenshot | Pass | Desktop and mobile screenshots captured for the rewritten route. |
| Full unit tests | Pass | `npm test` |
| Build | Pass | `npm run build` |
| Docs check | Pass | `npm run docs:check` |

## Quality Note

- User need: capture delivery-day evidence before signing.
- Destination: spreadsheet evidence table plus memo.
- Rubric low points: still needs observed handover simulation; not validated.
- Key decision: copy says photo filename, dealer confirmation, and signing hold condition before generic checklist progress.

## Screenshots

- [Desktop](../../screenshots/2026-05-25-new-car-evidence-guardrail-desktop.png)
- [Mobile](../../screenshots/2026-05-25-new-car-evidence-guardrail-mobile.png)
