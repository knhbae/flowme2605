# Source Replacement And Risk Review Batch

**Date:** 2026-05-23  
**Branch:** `codex/source-replacement-risk-review`  
**Status:** Open  
**PR URL:** https://github.com/knhbae/flowme2605/pull/20
**Deploy URL:** See PR checks for the current Vercel preview.

## Why

PR #19 merged the first `needs_review` audit-now batch and left 12 source-backed routes in the Content Lab priority queue: 6 broad or mismatched source replacements and 6 sensitive official/risk reviews. This batch closes that queue with manual source-fit audits while keeping all routes in lifecycle `fix` until item-level UX/content reshaping is implemented.

## What Changed

- Replaced broad or mismatched source metadata for:
  - `computer-skills-d30-study`
  - `diet-habit-2week`
  - `new-car-delivery-check`
  - `year-end-tax-docs`
  - `diet-meal-exercise-log`
  - `diet-reset-2week`
- Added manual source-fit audits for those 6 source replacement routes.
- Added official/warning/input-output risk reviews for:
  - `business-registration-basic`
  - `happy-birth-service-check`
  - `industrial-accident-claim-docs`
  - `national-health-checkup-d7`
  - `vaccination-certificate-issue`
  - `job-change-risk-check`
- Each audit includes a concrete natural artifact simulation, current Flow/UX gap, next content action, and next UX action.
- Updated tests and Content Lab expectations:
  - manual source-fit audits: 31
  - remaining source review priority queue: 0
  - source replacement: 0
  - risk review: 0
  - lifecycle keep/fix/preview counts remain stable.
- Added the content audit record at `docs/content-audit/2026-05-23-source-replacement-risk-review-batch.md`.

## Decisions

- Source replacement does not mean representative promotion. All 12 routes are audited as `reshape_before_featured` because they need route-specific fields, sheet previews, warning cards, or official-confirmation memos before stronger public exposure.
- Diet-related source replacements use the 질병관리청 health guidance as the exact safety basis instead of creator/channel references, because the current Flow should behave as a record/observation tool rather than a weight-loss prescription.
- `job-change-risk-check` keeps its experience source but treats legal/financial/labor details as official-confirmation questions, not FLOW advice.
- The existing local harness/spec-layer docs are preserved in this branch and will be verified with `docs:check`.

## Not Done

- Did not implement the item-level UX reshaping described in the audits.
- Did not promote any of the 12 routes to representative exposure.
- Did not convert the 40 `source_status=real` flows to manual source-fit.

## Verification

- RED check: `npm test -- lib/flow/source-fit.test.ts lib/flow/source-review-priority.test.ts` failed before implementation because the new audits and empty queue did not exist.
- `npm test -- lib/flow/source-fit.test.ts lib/flow/source-review-priority.test.ts` passed locally: 107/107 after implementation.
- `npm test` passed locally: 107/107.
- `npm run docs:check` passed locally: 14 required files, 59 local links.
- `npm run build` passed locally.
- `npm run test:e2e -- --grep "flow lab"` passed locally: 1/1.
- `npm run test:e2e` passed locally: 38/38.
- `git diff --check` passed locally.
- Vercel PR preview passed for PR #20 before final handoff.

## Risks

- The audits are structured content/product judgments, not live user validation.
- Some official pages are dynamic government/mobile URLs; future source checks may need URL refresh or alternate official mirrors.
- The priority queue is empty, but the next meaningful work is still item and UX reshaping, not public promotion.

## Follow-Ups

- Implement route-specific reshaping for the audited `reshape_before_featured` routes.
- Re-run full unit, docs, build, and Flow Lab e2e checks before opening the PR.
- Update this PR history with PR URL, deployment status, and final verification evidence.
