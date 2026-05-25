# QA

## Planned Commands

- `npm test -- lib/flow/ux-cleanup-backlog.test.ts lib/flow/content-lab.test.ts`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- `npm test`
- `npm run docs:check`
- `git diff --check`

## Results

- RED: targeted tests failed before implementation because `ux-cleanup-backlog` and Content Lab summary fields did not exist.
- PASS: targeted tests after implementation.
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: screenshot `docs/screenshots/2026-05-25-ux-cleanup-backlog-flow-lab.png`.
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/G6iy2WJ6qePH47kgtZYm2fokexDC`
- PASS: merged PR #85 as squash commit `f86e6cc626a65ae1b7475bc17947ea9e93b7b1ca`.
