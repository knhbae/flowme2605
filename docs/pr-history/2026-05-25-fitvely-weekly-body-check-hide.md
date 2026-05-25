# FITVELY Weekly Body Check Hide

Date: 2026-05-25
Branch: `content/fitvely-weekly-body-check-hide`
PR: #73
Status: Merged

## Why

`real-fitvely-weekly-body-check` was the last active broad real-source route, but no exact FITVELY weekly body-check/check-in source was confirmed. Keeping it in the active replacement queue implied the route only needed source assignment, while the safer decision is to hide/remove it unless a matching source appears.

## Changed

- Marked the natural-artifact audit as `replace_or_hide_source`.
- Classified the route into lifecycle `hide`.
- Split Content Lab broad-source summary into active replacement queue and hidden broad-source decisions.
- Updated Flow Lab to show hidden broad-source decisions separately.
- Added audit/spec docs.

## Not Done

- Did not invent measurement, photo, or adjustment rules.
- Did not assign a non-matching generic body-measurement source.
- Did not promote or validate the route.
- Did not remove the route data from the repository.

## Verification

- RED: targeted tests failed before implementation.
- GREEN: `npm test -- lib/flow/content-lab.test.ts lib/flow/natural-artifact-audit.test.ts lib/flow/content-lifecycle.test.ts`
- PASS: screenshot captured at `docs/screenshots/2026-05-25-fitvely-weekly-body-check-hide-flow-lab.png`
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build` after stopping the local dev server that held `.next/trace`.
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/2EKudsfcZmFsmCGjNZvJHPaRyDEF`
- Merged: PR #73 as squash commit `73409fe9d22a192bc67ca9be4a671b4d6f987bf7`.
