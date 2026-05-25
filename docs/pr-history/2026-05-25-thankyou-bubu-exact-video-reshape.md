# ThankyouBUBU Exact Video Reshape

Date: 2026-05-25

Branch: `content/thankyoububu-workout-detail`

PR: [#87](https://github.com/knhbae/flowme2605/pull/87)

Status: Merged

Vercel: https://vercel.com/flowme/flowme2605/HArwpPBorrMM3jwJDwADAdxSTMTZ

Merged SHA: `adacc21a60fab942e4cb844dd2bedb41b79fec3d`

## Summary

The first P1 cleanup batch reshapes the two former broad-source ThankyouBUBU workout routes after exact YouTube sources were attached. Both routes now keep one calendar-first exact-video action and one detail panel instead of five setup/planning actions.

## Changed

- Added seed-flow coverage for the two exact-source replacement routes.
- Rewrote `real-thankyou-bubu-home-workout-starter` into one source/video/log/stop-condition action.
- Rewrote `real-thankyou-bubu-20min-routine` into one source/video/log/stop-condition action.
- Added the `exact-video` tag and explicit `calendar` primary destination to both routes.
- Updated content audit, natural artifact audit, execution-specificity rules, status, and spec docs.

## Validation Boundary

This is not user validation. Both routes remain below representative and public-MVP framing until observed users can export, open the source, execute, record condition, and repeat.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts`
- PASS: `npm test -- lib/flow/seed-flows.test.ts`
- PASS: `npm run build`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "former broad ThankyouBUBU routes"`
- PASS: `git diff --check` with CRLF warnings only

## Screenshots

- `docs/screenshots/2026-05-25-thankyou-bubu-starter-exact-video-desktop.png`
- `docs/screenshots/2026-05-25-thankyou-bubu-starter-exact-video-mobile.png`
- `docs/screenshots/2026-05-25-thankyou-bubu-20min-exact-video-mobile.png`
