# QA

## Planned Commands

- `npm test -- lib/flow/representative-ux-content-review.test.ts lib/flow/content-lab.test.ts`
- `npm run docs:check`
- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- `git diff --check`

## Results

- PASS: targeted unit tests after implementation.
- PASS: screenshot captured at `docs/screenshots/2026-05-25-representative-ux-content-review-flow-lab.png`.
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/GmhZEBiACC1VkYnWFKbzNFgL91Ei`
- PASS: merged PR #75 as squash commit `a3b14f3773e3a2dc373ae12548e9ac076eb76cf7`.
