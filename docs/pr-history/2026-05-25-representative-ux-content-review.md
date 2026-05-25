# Representative UX Content Review

Date: 2026-05-25
Branch: `content/representative-ux-content-review`
PR: #75
Status: Merged

## Why

The source cleanup and broad-source guardrails are now mostly stable. The next risk is whether the representative/public-MVP candidates actually read as usable, export-first routes when a user opens them.

## Changed

- Added a typed representative UX/content review module for the three current candidates.
- Added Content Lab summary fields and tests.
- Added a compact Flow Lab panel.
- Documented simulated user runs, gaps, mobile density risks, and next small fixes.

## Not Done

- Did not claim validation.
- Did not change public exposure.
- Did not rewrite the full route screens.
- Did not add native records or integrations.

## Verification

- RED: targeted tests failed before the review module and Content Lab fields existed.
- GREEN: `npm test -- lib/flow/representative-ux-content-review.test.ts lib/flow/content-lab.test.ts`
- PASS: screenshot captured at `docs/screenshots/2026-05-25-representative-ux-content-review-flow-lab.png`
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/GmhZEBiACC1VkYnWFKbzNFgL91Ei`
- Merged: PR #75 as squash commit `a3b14f3773e3a2dc373ae12548e9ac076eb76cf7`.
