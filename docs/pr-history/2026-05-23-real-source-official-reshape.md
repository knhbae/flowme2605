# Real-Source Official Reshape

**Date:** 2026-05-23
**Branch:** `codex/real-source-reshape-official-batch`
**PR URL:** Pending
**Status:** In Progress

## Why

PR #23 projected all 40 real-source natural-artifact audits into source-fit decisions, leaving 30 routes in `reshape_before_featured`. This batch starts the reshaping work with six official/service routes that already have usable sources but still needed concrete workbench records.

## What Changed

- Added a FlowMe spec at `docs/specs/2026-05-23-real-source-official-reshape/`.
- Added a RED/GREEN unit test for six real-source route-specific workbench records.
- Reused existing Q-Net, driver-license, and resident-register artifact records for matching real-source slugs.
- Added childcare visit and KDCA travel-health memo fields.
- Added childcare-support comparison rows.
- Added content audit documentation for natural artifact simulation, Flow/UX gap, and content/UX reinforcement.

## Not Done

- No representative promotion.
- No source replacement work for broad-source `catalog_preview_only` routes.
- No conditional hiding or multi-anchor deadline engine.

## Verification

- RED check: `npm test -- lib/flow/artifact-fields.test.ts` failed before implementation because the new real-source official reshape test found no Q-Net log tables for `real-qnet-application-examday-check`.
- GREEN check: `npm test -- lib/flow/artifact-fields.test.ts` passed: 116 tests, 0 failures.
- `npm test` passed: 116 tests, 0 failures.
- `npm run docs:check` passed: 14 required files, 60 local links.
- `npm run build` passed: Next.js production build compiled and type-checked successfully.
- `npm run test:e2e` passed: 39 Playwright tests.

## Risks

- The fields are static route mappings, not a generalized form system.
- Medical/childcare flows still require user judgment and professional consultation; FlowMe only records questions and official-check dates.
- `reshape_before_featured` remains the source-fit state until first-screen UX and representative readiness are reviewed.
