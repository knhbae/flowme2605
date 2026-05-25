# Design Reference Flow UI Alignment

Date: 2026-05-26
Branch: `design-ref-flow-ui-alignment`
PR: #109
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/BsoNNaM8HPPmvBBwGKjy6A3pM3Gh

## Why

The user said the current FLOW UI still diverged from the local `design-ref/260525-2` guide. The main gaps were routine first-screen priority, baby-food sensitive flow priority, routine desktop artifact specificity, and export CTA accessibility.

## Changed

- Routine mobile routes now put the next-session card and record CTA before the calendar grid.
- `baby-food-menu-recipe` now opens mobile workbench content with a compact caution boundary and today's reaction-record card before meal calendar/table density.
- Mobile export sheet actions and the baby-food reaction sheet CTA now have destination-and-artifact accessible labels.
- Routine desktop workbenches now expose `회차 그리드 · primary`, a separate `회차 기록표 · secondary`, and a weekly summary/next-session rail.
- Added audit/spec/QA docs and screenshots for the routine mobile, baby-food sensitive mobile, export CTA accessibility, and routine desktop session-grid batches.
- Created a Figma review artifact: https://www.figma.com/design/Tsubuwt1wlPiUgpWbcLTw3

## Not Done

- Did not add direct Google Calendar, Google Sheets, Notion, or Apple Calendar integration.
- Did not replace the global mobile export sheet everywhere.
- Did not invent exercise plans, baby-food recommendations, or medical authority content.
- Did not add native long-term FLOW record management.
- Did not call any route validated.

## Decisions

- `design-ref/` remains local reference material and is not committed.
- Figma was used as an editable review artifact, while the code and Playwright screenshots remain the implementation source of truth.
- Routine desktop can become more specific without changing the underlying recurrence/export model.
- Sensitive baby-food flow keeps source/risk warning separate from the reaction-record artifact.

## Files Touched

- `components/flow/AppClient.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/STATUS.md`
- `docs/content-audit/2026-05-26-*.md`
- `docs/specs/2026-05-26-*/`
- `docs/screenshots/2026-05-26-*.png`

## Verification

- RED Playwright checks failed before implementation for missing routine desktop session grid/log and baby-food mobile first-screen order.
- `npm run build` passed.
- `npm test` passed with 173 tests.
- `npm run docs:check` passed with 298 local links.
- `npm run test:e2e` passed with 59 tests.
- Vercel PR status passed before merge.

## Risks

- Mobile export still depends on the sticky export sheet for many routes. The next UX batch should move destination-specific CTAs closer to the first artifact where it does not increase density.
- The new routine session log stores intensity in generic workbench log rows; this is acceptable for Stage 0 export-first behavior but is not a full training-log model.
- Figma review frame is intentionally lightweight and should not be treated as a design-system source of truth.

## Follow-Ups

- Run a focused mobile export surface cleanup for `moving-d30-basic`, `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Continue avoiding validation language until real user behavior data exists.
- Keep sensitive source/risk boundaries separate in future health, baby/family, safety, finance, and legal routes.

## Links

- PR: https://github.com/knhbae/flowme2605/pull/109
- Figma review: https://www.figma.com/design/Tsubuwt1wlPiUgpWbcLTw3
- Routine desktop screenshot: [2026-05-26-routine-desktop-session-grid-full.png](../screenshots/2026-05-26-routine-desktop-session-grid-full.png)
- Baby-food mobile screenshot: [2026-05-26-baby-food-sensitive-mobile.png](../screenshots/2026-05-26-baby-food-sensitive-mobile.png)
