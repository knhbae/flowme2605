# ThankyouBUBU Video Reminder Detail

Date: 2026-05-26
Branch: `thankyou-bubu-video-reminder-detail`
PR: #107
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/Bc8jk4jD6RyRe4sYhU61soua9AaZ

## Why

The user pointed out that repeated video Flows must work from calendar reminders. Earlier cleanup made the two former broad-source ThankyouBUBU routes reminder-ready, but the ten exact-video ThankyouBUBU routes still needed the same calendar-notification-ready contract.

## Changed

- Expanded repeated workout video seed coverage from two routes to all twelve ThankyouBUBU single-video workout routes.
- Expanded calendar export coverage so every covered route must include standalone reminder text.
- Added `캘린더 알림` guidance to generated ThankyouBUBU workout-video details.
- Kept movement sequence, posture, and pace in the original YouTube source instead of inventing exercise detail.
- Updated the UX cleanup backlog to move the next batch toward Screen 4 routine setup UX.
- Added audit/spec/QA docs for the batch.

## Not Done

- Did not redesign Screen 4 start-date, weekday, or session-count controls.
- Did not add automatic 12-session generation.
- Did not add direct external app integrations.
- Did not add login, payment, community, or native long-term FLOW records.
- Did not call the route family validated.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` failed before implementation on missing `캘린더 알림`.
- RED: `npm test -- lib/flow/ux-cleanup-backlog.test.ts` failed before implementation because the backlog still pointed to the old ThankyouBUBU audit step.
- `npm run build` passed.
- `npm test` passed with 173 tests.
- `npm run docs:check` passed with 14 required files and 276 local links.
- Related Playwright passed with 2 tests.
- `npm run test:e2e` passed with 56 tests.
- Vercel PR check passed before merge.

## Risks

- The reminder text is now portable, but the routine setup UI is still generic and can feel heavy on mobile.
- These routes remain below representative/public-MVP/validated framing until real user behavior is available.

## Follow-Ups

- Use Figma for the Screen 4 routine setup layout pass.
- Reduce start-date, weekday, and session-count friction without generating unsupported exercise plans.
- Keep multi-video sequence Flows separate from repeated single-video workout Flows.
