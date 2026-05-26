# Design-ref gap queue

Date: 2026-05-26

This batch turns the latest `design-ref/` alignment audit into a visible Content Lab queue.

## Change

- Added a `design-ref` gap queue data model with landed and pending alignment items.
- Exposed queue totals in Content Lab summary data: total, landed, pending, P1 pending, and validated.
- Added a Flow Lab panel that separates pending alignment work from already landed UI work.
- Kept validation count at 0 because internal design alignment is not user behavior evidence.

## Current queue

- Landed: moving calendar-first timeline, moving desktop source rail, mobile log summary cards, mobile comparison summary cards.
- Pending: desktop rail generalization, mobile study log summary, baby-food reaction-first mobile entry, observed-session package.

## Why

The previous audit explained that design-reference work was not fully done, but the remaining work was only in docs and chat context. This makes the queue durable inside the internal lab so future batches can pick the next design-ref gap without treating landed UI work as validation.

No route is called validated.

## Verification

- RED: `npm test -- lib/flow/content-lab.test.ts` failed because `designRefGapQueueTotalCount` was missing.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after adding the queue summary.
- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot and scale validation boards"` failed because `design-ref-gap-queue-panel` was missing.
- GREEN: the same targeted Playwright test passed after adding the Flow Lab panel.
