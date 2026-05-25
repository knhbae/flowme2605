# QA

Date: 2026-05-25

## TDD

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on `real-thankyou-bubu-home-workout-starter should not ask users to manage a five-step workout plan`.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed after both routes were reduced to one exact-video action.

## Pending

## Verification

- PASS: `npm run build`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "former broad ThankyouBUBU routes"`
- PASS: `git diff --check` with CRLF warnings only
- PASS: Vercel preview `https://vercel.com/flowme/flowme2605/HArwpPBorrMM3jwJDwADAdxSTMTZ`
- PASS: PR #87 squash-merged as `adacc21a60fab942e4cb844dd2bedb41b79fec3d`

## Screenshots

- `docs/screenshots/2026-05-25-thankyou-bubu-starter-exact-video-desktop.png`
- `docs/screenshots/2026-05-25-thankyou-bubu-starter-exact-video-mobile.png`
- `docs/screenshots/2026-05-25-thankyou-bubu-20min-exact-video-mobile.png`

## Mobile Density Note

The routes are still long on mobile because the shared routine workbench shows calendar, preview, export controls, and execution detail. The content rewrite removes the five competing action cards, but a future UX pass should consider collapsing the monthly calendar preview for non-representative exact-video routes.
