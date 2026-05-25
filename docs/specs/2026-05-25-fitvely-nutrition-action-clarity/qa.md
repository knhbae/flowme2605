# FITVELY Nutrition Action Clarity QA

Date: 2026-05-25

## Required Checks

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "diet exact video flow uses application language"`
- `npm run test:e2e`

## Screenshot Targets

- `/f/real-fitvely-video-body-fat-6kg-method` desktop
- `/f/real-fitvely-video-body-fat-6kg-method` mobile

## Expected UX

- First screen names the artifact as `오늘 한 끼 적용 관찰표 Flow`.
- Workbench displays `적용 전후 관찰표`.
- The row labels expose `적용 전 기록` and `적용 후 기록`.
- Field labels include selected source rule, before condition, after reaction, and keep-or-stop decision.
- Source video remains the authority for reasons and exceptions.
- No outcome promise or validation claim appears.

## Results

- `npm run build`: passed.
- `npm test`: passed, 173 tests.
- `npm run docs:check`: passed, 268 local links.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "diet exact video flow uses application language"`: passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "artifact workbench shows the primary usable surface first|artifact workbench saves local execution entries|diet exact video flow uses application language"`: passed after updating E2E expectations from the old generic diet log to the new apply-before-after observation table.
- `npm run test:e2e`: passed, 54 tests.

## Evidence

- Desktop screenshot: [FITVELY nutrition action clarity desktop](../../screenshots/2026-05-25-fitvely-nutrition-action-clarity-desktop.png)
- Mobile screenshot: [FITVELY nutrition action clarity mobile](../../screenshots/2026-05-25-fitvely-nutrition-action-clarity-mobile.png)
