# Passport Submission Memo First-Screen PR History

**Date:** 2026-05-24
**Branch:** `codex/passport-submission-memo-first-screen`
**PR:** [#34 Make passport renewal memo-first](https://github.com/knhbae/flowme2605/pull/34)
**Status:** In Progress
**Related spec:** [2026-05-24-passport-submission-memo-first-screen](../specs/2026-05-24-passport-submission-memo-first-screen/spec.md)
**Related audit:** [2026-05-24-passport-submission-memo-first-screen.md](../content-audit/2026-05-24-passport-submission-memo-first-screen.md)

## Why

The representative simplification audit found that passport renewal should stay simple but needed a more natural first artifact. A real user is likely to keep a submission memo with travel timing, photo readiness, receipt proof, and pickup/storage details before they care about a long checklist.

## What Changed

- Promoted `passport-renewal-docs` to `memo_card` primary surface.
- Added passport-specific memo fields for applicant context, photo check, old passport status, application proof, and pickup/storage.
- Kept the checklist as the secondary execution surface.
- Added unit and E2E coverage for the first-screen artifact fit.
- Captured desktop/mobile screenshots and documented a natural artifact simulation.

## Not Done

- No representative promotion.
- No official eligibility validation.
- No upload, vault, reminder, or native passport record feature.

## Decisions

- Passport renewal is better as a submission memo first, checklist second.
- Official-source flows should record user-checked values and proof locations without turning FLOW into an authority.
- This route reinforces the export-first product direction: use FLOW to shape a note the user can keep elsewhere.

## Files Touched

- `lib/flow/artifact-plan.ts`
- `lib/flow/artifact-fields.ts`
- `lib/flow/artifact-plan.test.ts`
- `lib/flow/artifact-fields.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/specs/2026-05-24-passport-submission-memo-first-screen/`
- `docs/content-audit/2026-05-24-passport-submission-memo-first-screen.md`
- `docs/screenshots/2026-05-24-passport-submission-memo-first-screen-*.png`

## Verification

- RED: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` failed before implementation.
- RED: `npm run test:e2e -- --grep "reshaped official route workbenches"` failed before implementation.
- GREEN: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` passed: 128 tests.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "reshaped official route workbenches"` passed: 1 test.
- GREEN: `npm test` passed: 128 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 155 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 44 tests.

## Risks

- The first-screen artifact is clearer, but there is still no real user data proving fewer missed photo, receipt, or pickup mistakes.
- The route depends on users confirming official requirements outside FLOW.

## Follow-Ups

- Use this as the official-route memo-first control before considering richer native document handling.
