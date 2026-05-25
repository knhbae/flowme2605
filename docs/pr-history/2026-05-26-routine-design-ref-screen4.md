# Routine Design Reference Screen 4

Date: 2026-05-26
Branch: `routine-setup-design-ref-batch`
PR: #108
Status: Merged and Vercel check passed

## Why

The user provided `design-ref/260526` as the preferred UX direction. The main routine gap was that Flow pages still showed generic item/calendar previews instead of clearly proposing the external artifact: a repeated calendar plus session memo.

## Changed

- Renamed the routine primary artifact to `반복 캘린더 · primary`.
- Renamed the secondary routine panel to `회차 메모 · secondary`.
- Added routine-specific destination labels: `캘린더에 넣기 · .ics`, `시트로 받기 · .xlsx`, and `편집`.
- Made routine structures calendar-exportable from the workbench.
- Expanded exact workout-video preview from one-week cards to a 4-week repeated calendar preview.
- Added audit/spec/QA docs and four desktop/mobile screenshots.

## Not Done

- Did not add automatic routine generation beyond the selected weekday preview.
- Did not add direct Google/Apple calendar integration.
- Did not add native long-term FLOW record management.
- Did not invent exercise details beyond the source video handoff.
- Did not call any route validated.

## Verification

- RED: related Playwright failed before implementation because `운동 캘린더 · primary`, `반복 캘린더 · primary`, and `회차 메모 · secondary` did not exist.
- `npm run build` passed.
- `npm test` passed with 173 tests.
- `npm run docs:check` passed with 14 required files and 284 local links.
- Related Playwright passed with 3 tests.
- Additional exact-video Playwright passed with 3 tests after label selector updates.
- `npm run test:e2e` passed with 56 tests.
- Vercel PR check passed before merge.

## Risks

- Mobile still uses the existing global export sheet pattern outside the routine artifact; the design reference argues for card-local export hierarchy, but that wider mobile pattern was left for a later batch.
- Exact-video pages now have clearer destination labels, but FITVELY nutrition and workout-programming routes still need a separate UX pass if the generic exact-video panel feels too calendar-heavy.

## Follow-Ups

- Continue with mobile first-viewport density using the same `design-ref/260526` rules.
- Review whether exact-video sheet-first routes should use a more generic accessible region label than `영상 반복 캘린더 설정`.
- Keep Figma as the companion path for future layout exploration; this batch implemented from the local design reference files.
