# Routine Design Reference Screen 4 QA

Date: 2026-05-26

## Required Checks

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npm run test:e2e -- --grep "fitness exact video flow keeps|promoted P1 flows expose|routine flow highlights"`
- `npm run test:e2e`

## TDD Evidence

RED:

- Related Playwright failed because `운동 캘린더 · primary`, `반복 캘린더 · primary`, and `회차 메모 · secondary` did not exist yet.

GREEN:

- Related Playwright passed with 3 tests after implementation.

## Screenshot Evidence

- [Running routine desktop](../../screenshots/2026-05-26-routine-design-ref-running-desktop.png)
- [Running routine mobile](../../screenshots/2026-05-26-routine-design-ref-running-mobile.png)
- [ThankyouBUBU exact video desktop](../../screenshots/2026-05-26-routine-design-ref-thankyou-video-desktop.png)
- [ThankyouBUBU exact video mobile](../../screenshots/2026-05-26-routine-design-ref-thankyou-video-mobile.png)

## Results

- `npm run build`: passed on 2026-05-26.
- `npm test`: 173 passed on 2026-05-26.
- `npm run docs:check`: passed with 14 required files and 284 local links on 2026-05-26.
- Related Playwright: 3 passed on 2026-05-26.
- `npm run test:e2e`: 56 passed on 2026-05-26.
