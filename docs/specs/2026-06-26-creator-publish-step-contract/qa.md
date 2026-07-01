# QA Notes

**Date:** 2026-06-26  
**Scope:** Creator publish gate and saved Step contract

## Checks to Run

- `npm run docs:check`
- `npm test`
- `npm run build`
- targeted Playwright for:
  - public Flow Map save path;
  - creator page separation;
  - My Flow Step inline detail;
  - mobile saved-map revisit;
  - Step date override reflected in calendar;
  - Step text copy and `.ics` download use edited Step fields.

## Current Verification Evidence

- `npx tsx --test lib\flow\my-flow-step-export.test.ts lib\flow\source-backed-my-flow.test.ts` passed.
- `npm test` passed 263 tests.
- `npm run docs:check` passed.
- `npm run build` passed.
- Targeted Playwright passed 10 tests:
  - `product IA v2 keeps discovery simple and saved execution clear`
  - `source-backed flow map public page stays save-before focused`
  - `source-backed flow map public page saves into the real My Flow path`
  - `source-backed moving map saves one dated timeline into My Flow calendar`
  - `source-backed baby health map saves input-bearing official schedule flows into My Flow`
  - `source-backed flow map creator page shows publish structure without mixing user execution`
  - `source-backed creator saved preview opens the requested My Flow map demo`
  - `my flow step detail saves portable calendar task fields`
  - `my flow mobile saved map edit and revisit keeps step detail lightweight`
  - `source-backed baby health creator page keeps official source review separate from execution`
- `npm run test:e2e` passed 128 Playwright tests after aligning stale catalog/public-copy expectations with the representative-catalog UX.

## Manual Review Focus

Review public and My Flow pages for these questions:

1. Does the public page feel like a user save page, not an internal review page?
2. Does My Flow immediately show what was saved and what can be done next?
3. When a Step is tapped, does the detail open in-place without forcing a scroll hunt?
4. Are Step details close to calendar/todo app complexity?
5. Does source/detail remain available without becoming the primary surface?
6. Does the creator page make source-row-to-Step conversion visible?
7. Are weak candidates still blocked from representative homepage exposure?

## Known Remaining Work

- Todo/sheet regeneration from edited Step contracts still needs a future pass.
- Creator publish is local/draft-only and not account-backed.
- Baby health schedule remains a revise candidate despite having a stronger Step contract.
- Creator saved-result preview now opens a map-specific My Flow demo such as `/my?demo=source-backed&savedMap=baby-health-schedule`.
- Real usage evidence remains required before validation claims.
