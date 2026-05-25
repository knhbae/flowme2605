# Broad Source Flow Lab Panel

Date: 2026-05-25
Branch: `ux/broad-source-flow-lab-panel`
PR: #61
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/B5HJdJZPaGSXQ17MxUpFVXYFgaGJ

## Why

The broad-source code guard exposed the right summary data, but the internal editor surface did not show it. Flow Lab now needs a compact panel so broad source replacement work remains visible before any representative/public MVP framing changes.

## Changed

- Added Flow Lab E2E coverage for a `Broad Source Guard` panel.
- Rendered broad real-source count, representative leak count, and the source replacement route queue.
- Captured a desktop screenshot.
- Added audit/spec/status documentation.

## Not Done

- Did not change public route exposure.
- Did not replace source URLs.
- Did not redesign Flow Lab broadly.
- Did not mark any route validated.

## Verification

- RED: targeted Flow Lab E2E failed before implementation because the panel did not exist.
- GREEN: targeted Flow Lab E2E passed after implementation and rebuild.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` passed.
- `git diff --check` passed with CRLF warnings only.
- Vercel PR check passed before merge.

## Screenshot

- `docs/screenshots/2026-05-25-broad-source-flow-lab-panel-desktop.png`
