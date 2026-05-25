# Diet Observation Guardrail Copy

Date: 2026-05-25
Branch: `content/diet-observation-guardrail-copy`
Status: In progress

## Why

The representative UX/content review found that `diet-habit-2week` had the correct spreadsheet artifact but could still read like diet coaching. For a health-sensitive route, the first screen must frame the job as observation plus stop/consult conditions.

## Changed

- Reframed `diet-habit-2week` as `2주 식사·활동 관찰 Flow`.
- Replaced prescriptive exercise copy with observation rows for meals, sleep, activity, condition, and repeated warning signs.
- Updated the workbench caution heading to `관찰 전 중단/상담 기준`.
- Updated the weekly memo copy to `주간 관찰 메모`.
- Updated representative UX/content review notes to require a mobile re-check and observed session before stronger framing.

## Not Done

- Did not claim validation.
- Did not add calorie, weight-loss, or exercise prescription logic.
- Did not add external integrations or native long-term records.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on the old route title.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts`
- PASS: desktop screenshot `docs/screenshots/2026-05-25-diet-observation-guardrail-desktop.png`
- PASS: mobile screenshot `docs/screenshots/2026-05-25-diet-observation-guardrail-mobile.png`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "risk-boundary QA exports|public MVP guardrail screens|flow lab shows converted pilot"`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npm run docs:check`
