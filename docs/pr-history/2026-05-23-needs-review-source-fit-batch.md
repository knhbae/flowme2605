# Needs-Review Source-Fit Batch

**Date:** 2026-05-23  
**Branch:** `codex/audit-needs-review-flows`  
**Status:** Open
**PR URL:** https://github.com/knhbae/flowme2605/pull/19
**Deploy URL:** TBD

## Why

PR #18 created the lifecycle queue and identified 9 `needs_review` routes that were ready for manual source-fit audit. This PR executes that first batch so the Content Lab queue reflects actual reviewed state instead of leaving all 21 routes in review.

## What Changed

- Added manual source-fit audits for 9 `audit_now` routes:
  - `driver-license-renewal-check`
  - `family-certificate-issue`
  - `passport-renewal-docs`
  - `pet-registration-basic`
  - `resident-register-copy-issue`
  - `qnet-exam-application-prep`
  - `samsung-aircon-seasonal-check`
  - `samsung-washer-filter-cleaning`
  - `vehicle-inspection-prep`
- Each audit includes:
  - source usefulness judgment
  - ideal reconstruction
  - concrete natural artifact simulation with sample inputs
  - user journey
  - current Flow/content/UX gap
  - next content action
  - next UX action
- Updated source-review priority logic so needs-review routes with manual source-fit audit are removed from the remaining queue.
- Updated Content Lab and tests for the new counts:
  - manual source-fit audits: 19
  - remaining needs-review queue: 12
  - lifecycle keep: 10
  - lifecycle fix: 61
  - remaining priority split: 0 audit-now, 6 source replacement, 6 risk review
- Updated audit documentation with the current lifecycle and queue state.

## Not Done

- Did not delete or hide public routes.
- Did not perform item-level content rewrites for the 4 audited `reshape_before_featured` routes.
- Did not replace broad source URLs for the 6 remaining `source_replacement` routes.
- Did not run the 6 sensitive `risk_review` routes through official/warning review yet.
- Did not promote the 40 `source_status=real` flows to manual source-fit.

## Decisions

- Keep `source_status=needs_review` seed metadata stable for the 21 normalized legacy routes; manual source-fit audit presence now determines whether a route remains in the priority queue.
- Treat audited `keep_representative` routes as lifecycle `keep`, while audited `reshape_before_featured` routes stay in lifecycle `fix`.
- Keep the Content Lab queue focused on remaining work only; completed manual audits move to the source-fit audit section.

## Files Touched

- `lib/flow/source-fit.ts`
- `lib/flow/source-fit.test.ts`
- `lib/flow/source-review-priority.ts`
- `lib/flow/source-review-priority.test.ts`
- `lib/flow/content-inventory.test.ts`
- `lib/flow/content-lifecycle.test.ts`
- `lib/flow/content-lab.test.ts`
- `components/flow/ContentLab.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/STATUS.md`
- `docs/content-audit/2026-05-23-flow-lifecycle-classification.md`
- `docs/content-audit/2026-05-23-needs-review-source-fit-batch.md`

## Verification

- `npm test` passed locally: 106/106.
- `npm run docs:check` passed locally: 12 required files, 50 local links.
- `npm run build` passed locally.
- `npm run test:e2e -- --grep "flow lab"` passed locally: 1/1.
- `npm run test:e2e` passed locally: 38/38.

## Risks

- The audits are product/content judgments based on current source metadata, not live user validation.
- Remaining broad-source routes still need exact source replacement before any representative promotion.
- Sensitive review routes still need explicit warning, official-source, and input/output boundary review.

## Follow-Ups

- Replace broad sources for the 6 `source_replacement` routes.
- Run official/risk review for the 6 `risk_review` routes.
- Implement content/UX reshaping for driver license, family certificate, resident register copy, and Q-Net.
