# Mobile Simulation Protocol

Date: 2026-05-25
Branch: `content/mobile-simulation-protocol`
PR: #81
Status: Merged

## Why

User recruiting is currently difficult, but the three candidate routes still need a stronger simulation method before more UX/content edits. The existing reviews identified gaps; this batch turns them into a repeatable mobile task script with pass/failure signals and no validation claim.

## Changed

- Added mobile simulation protocol records for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Added Content Lab summary fields for total count, route slugs, average score, validation count, and records.
- Added a Flow Lab panel that surfaces the protocol and explicitly shows `No validated routes`.
- Documented route-specific pass/failure signals and next evidence actions.

## Not Done

- Did not promote any route.
- Did not claim validation.
- Did not add automatic study progress generation, integrations, login, payment, native long-term records, or AI publishing.

## Verification

- RED: `npm test -- lib/flow/mobile-simulation-protocol.test.ts lib/flow/content-lab.test.ts` failed before implementation because the protocol module and summary fields did not exist.
- GREEN: `npm test -- lib/flow/mobile-simulation-protocol.test.ts lib/flow/content-lab.test.ts`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` after rebuilding `.next`
- PASS: screenshot `docs/screenshots/2026-05-25-mobile-simulation-protocol-flow-lab.png`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only.
- PASS: Vercel `https://vercel.com/flowme/flowme2605/7Ta71FiuHFh5SGKGovNSTHCA1uRQ`
- Merged: PR #81 as squash commit `29f25e16edc2c4ed8991a5fe4325a1906c6151e5`.
