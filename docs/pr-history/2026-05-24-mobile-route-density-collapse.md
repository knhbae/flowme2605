# Mobile Route Density Collapse PR History

**Date:** 2026-05-24
**Branch:** `ux/mobile-route-density`
**PR:** [#45 Reduce sensitive route mobile density](https://github.com/knhbae/flowme2605/pull/45)
**Status:** Open
**Related spec:** [2026-05-24-mobile-route-density-collapse](../specs/2026-05-24-mobile-route-density-collapse/spec.md)
**Related audit:** [mobile route density collapse](../content-audit/2026-05-24-mobile-route-density-collapse.md)

## Why

After the mobile bottom-sheet audit, the remaining density issue was page-level artifact and caution stacking on `diet-habit-2week` and `new-car-delivery-check`.

## What Changed

- Added route-scoped mobile collapsed secondary execution sections.
- Kept first execution sections visible.
- Kept desktop sections expanded.
- Added RED/GREEN E2E coverage.
- Captured updated mobile screenshots.
- Marked PR #44 as merged in its PR-history file.

## Not Done

- No bottom-sheet redesign.
- No export format change.
- No route content rewrite.
- No exposure change.
- No validation claim.

## Verification

- RED: `npm run test:e2e -- --grep "mobile sensitive routes collapse"` failed before implementation.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "mobile sensitive routes collapse"` passed: 1 test.
- GREEN: `npm run docs:check` passed: 14 required files, 220 local links.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e` passed: 48 tests.
- Vercel check is tracked on PR #45.
