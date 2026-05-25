# Sinagong Study Merge Decision

Date: 2026-05-25

## Summary

PR #102 carried the `my_tests/` study source-boundary conclusion into code-level audit and backlog data. `real-sinagong-computer-d30-study` remains a direct-QA merge/rewrite candidate, not a separate representative, featured, public-MVP, or validated route.

## Scope

- Added natural artifact audit coverage for the duplicate/canonical-route decision.
- Updated the Sinagong audit to resolve test-result conflict toward source fidelity.
- Updated the UX cleanup backlog to require a canonical route decision before featured framing.
- Documented the decision in dated audit/spec/QA docs.

## Verification

- RED: `npm test -- lib/flow/natural-artifact-audit.test.ts lib/flow/ux-cleanup-backlog.test.ts` failed before implementation because duplicate/canonical-route language was missing.
- GREEN: `npm run build` passed.
- GREEN: `npm test` passed with 170 tests.
- GREEN: `npm run docs:check` passed with 14 required files and 256 local links.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "computer skills final QA|study progress table|artifact workbench saves local execution entries"` passed with 3 tests.
- GREEN: `npm run test:e2e` passed with 53 tests.
- Vercel check passed on PR #102 before merge.

## Merge

- PR: #102
- Squash merge commit: `6e844cd8cc656b70c86bcc974b81dcedca7e0918`
- Post-merge main sync completed locally.
