# UX Cleanup Backlog

Date: 2026-05-25
Branch: `content/ux-cleanup-backlog`
PR: #85
Status: Merged

## Why

The product direction and review standards are now mostly organized, but the user correctly flagged that this does not mean every route's content and UX is clean. This batch organizes the remaining cleanup areas before broad external AI review or route-by-route rewriting.

## Changed

- Added a code-backed UX cleanup backlog with 9 groups and 36 routes.
- Marked first rewrite batches: exact workout video detail, health observation guardrails, and vehicle evidence-first UX.
- Surfaced the backlog in Flow Lab with route count, priority count, and 0 validated count.
- Documented the cleanup categories and next rewrite order.

## Not Done

- Did not rewrite individual route content yet.
- Did not promote any route.
- Did not claim validation.

## Verification

- RED: `npm test -- lib/flow/ux-cleanup-backlog.test.ts lib/flow/content-lab.test.ts` failed before implementation because the backlog module and summary fields did not exist.
- GREEN: `npm test -- lib/flow/ux-cleanup-backlog.test.ts lib/flow/content-lab.test.ts`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: screenshot `docs/screenshots/2026-05-25-ux-cleanup-backlog-flow-lab.png`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/G6iy2WJ6qePH47kgtZYm2fokexDC`
- Merged: PR #85 as squash commit `f86e6cc626a65ae1b7475bc17947ea9e93b7b1ca`.
