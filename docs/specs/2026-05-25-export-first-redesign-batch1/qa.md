# Export-First Redesign Batch 1 QA

Date: 2026-05-25

## Required Checks

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "moving flow opens with an export-first|mobile export actions open|flow item card makes detail"`
- `npm run test:e2e`

## Screenshot Targets

- `/f/moving-d30-basic` desktop, after entering `2026-06-22`.
- `/f/moving-d30-basic` mobile, after entering `2026-06-22`, with one item detail opened.

## Expected UX

- The first viewport shows the calendar artifact preview before the full item list.
- The hero makes `이렇게 캘린더에 들어갑니다` visible.
- The mobile export sheet prioritizes calendar, Excel, and text.
- `내 버전으로 편집` is visually secondary.
- Skipped item cards are muted and state that they are excluded from progress.

## Results

- `npm run build`: passed on 2026-05-25.
- `npm test`: 173 passed on 2026-05-25.
- `npm run docs:check`: passed with 14 required files and 276 local links on 2026-05-25.
- Related Playwright: 4 passed on 2026-05-25.
- `npm run test:e2e`: 56 passed on 2026-05-25.

## Evidence

- Desktop screenshot: [export-first redesign batch 1 desktop](../../screenshots/2026-05-25-export-first-redesign-batch1-moving-desktop.png)
- Mobile screenshot: [export-first redesign batch 1 mobile](../../screenshots/2026-05-25-export-first-redesign-batch1-moving-mobile.png)
