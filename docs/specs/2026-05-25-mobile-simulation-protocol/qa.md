# QA

## Planned Commands

- `npm test -- lib/flow/mobile-simulation-protocol.test.ts lib/flow/content-lab.test.ts`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- `npm test`
- `npm run build`
- `npm run docs:check`
- `git diff --check`

## Results

- PASS: targeted unit tests after implementation.
- PASS: production build.
- PASS: targeted E2E after rebuilding `.next`; the first run used stale `next start` output and correctly failed to see the new panel.
- PASS: Flow Lab screenshot `docs/screenshots/2026-05-25-mobile-simulation-protocol-flow-lab.png`.
- PASS: full unit tests after adding `lib/flow/mobile-simulation-protocol.test.ts` to the default `npm test` script.
- PASS: docs check.
- PASS: diff check with CRLF warnings only.
