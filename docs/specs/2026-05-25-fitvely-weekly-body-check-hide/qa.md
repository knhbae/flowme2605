# QA

## Planned Commands

- `npm test -- lib/flow/content-lab.test.ts lib/flow/natural-artifact-audit.test.ts lib/flow/content-lifecycle.test.ts`
- `npm run docs:check`
- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- `git diff --check`

## Results

- PASS: targeted unit tests after implementation.
- PASS: screenshot captured at `docs/screenshots/2026-05-25-fitvely-weekly-body-check-hide-flow-lab.png`.
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build` after stopping the local dev server that held `.next/trace`.
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with CRLF warnings only.
