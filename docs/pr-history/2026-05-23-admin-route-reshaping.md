# Admin Route Reshaping

**Date:** 2026-05-23
**Branch:** `codex/reshape-audited-admin-routes`
**PR URL:** https://github.com/knhbae/flowme2605/pull/22
**Status:** Open

## Why

PR #20 cleared the remaining needs-review source-fit queue, but four exact-source routes were still marked `reshape_before_featured`: driver license renewal, family certificate issue, resident register copy issue, and Q-Net exam application. They had trustworthy sources but generic checklist UX, so users could not preserve the condition, disclosure scope, or deadline evidence that makes the task complete.

## What Changed

- Added a FlowMe spec at `docs/specs/2026-05-23-admin-route-reshaping/`.
- Added route-specific artifact fields:
  - driver license renewal condition comparison rows.
  - family certificate submitter/disclosure memo fields.
  - resident register copy submitter/privacy memo fields.
  - Q-Net application/payment/admission-ticket/exam-site log tables.
- Updated artifact planning so driver renewal opens as a comparison table and certificate issue routes open as memo-card workbenches.
- Added memo-card rendering for `memo_card` primary surfaces instead of falling back to a generic checklist.
- Updated route copy for the four reshaped routes so the first actions match their natural artifacts.
- Added text/workbook export coverage for structured memo and deadline records.

## Not Done

- No full branching engine or conditional hiding of checklist items.
- No multi-anchor date model for Q-Net deadlines.
- No exposure promotion beyond the existing `reshape_before_featured` source-review state.

## Decisions

- Route-specific fields are static because Stage 0 needs visible artifact value before a generalized form system.
- Official source facts and user memo/log values remain separated: source metadata stays in route details, while user values live in workbench state and exports.
- The Q-Net auxiliary deadlines are modeled as log rows for now, because timeline anchoring still accepts one primary exam date.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/artifact-fields.ts`
- `lib/flow/artifact-fields.test.ts`
- `lib/flow/artifact-plan.ts`
- `lib/flow/artifact-plan.test.ts`
- `lib/flow/export.test.ts`
- `lib/flow/seed-flows.ts`
- `lib/flow/real-content-pilot-flows.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/specs/2026-05-23-admin-route-reshaping/*`
- `docs/content-audit/2026-05-23-admin-route-reshaping.md`

## Verification

- `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed: 114 tests, 0 failures.
- `npm test` passed: 114 tests, 0 failures.
- `npm run docs:check` passed: 14 required files, 59 local links.
- `npm run build` passed: Next.js production build compiled and type-checked successfully.
- `npm run test:e2e -- --grep "reshaped official route"` passed: 1 targeted Playwright test.
- `npm run test:e2e` passed: 39 Playwright tests.

## Risks

- The driver comparison table is a condition record, not a true filter; users still see the underlying checklist.
- Q-Net deadline records are exportable but not yet calculated against separate deadline anchors.
- Existing `docs/handoff/` stash remains preserved from the earlier PR #20 sync and is intentionally not mixed into this branch.

## Follow-Ups

- Start the 40 `source_status=real` manual source-fit promotion/audit queue after this PR is opened.
- Consider the same memo-card workbench for passport renewal, pet registration, vehicle inspection follow-up, and service-reservation routes.
