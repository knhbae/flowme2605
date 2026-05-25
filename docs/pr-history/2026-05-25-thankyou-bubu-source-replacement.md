# ThankyouBUBU Broad Source Replacement

Date: 2026-05-25
Branch: `content/thankyou-bubu-broad-source-replacement`
PR: #63
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/4ptnKoiRjqSYye2PF49xmGANSHYb

## Why

The broad-source review found two ThankyouBUBU routes that looked actionable but only pointed to the creator channel. That left users guessing which workout video to open. The route needed exact video sources before any further UX/content reshaping could be meaningful.

## Changed

- Replaced `real-thankyou-bubu-home-workout-starter` channel source with an exact ThankyouBUBU video URL.
- Replaced `real-thankyou-bubu-20min-routine` channel source with an exact ThankyouBUBU video URL.
- Updated route copy so item details refer to the original video instead of channel browsing.
- Updated natural-artifact audit records from catalog review to `reshape_content_or_ux`.
- Updated Content Lab and Flow Lab guard expectations: broad real-source count is now 5 and representative leaks remain 0.
- Added source replacement audit/spec docs.

## Not Done

- Did not claim either route is validated.
- Did not promote either route to representative/public-MVP status.
- Did not extract or invent movement-by-movement instructions.
- Did not build automatic source discovery or direct YouTube integration.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/content-lab.test.ts` failed before implementation.
- GREEN: targeted unit tests passed after implementation.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` passed.
- `git diff --check` passed with CRLF warnings only.
- Vercel PR check passed before merge.

## Screenshot

- `docs/screenshots/2026-05-25-thankyou-bubu-source-replacement-flow-lab.png`

## Follow-Ups

- Compact both exact-source ThankyouBUBU routes around original video, execution summary, condition log, and stop condition.
- Continue source replacement with the two FITVELY broad site routes.
