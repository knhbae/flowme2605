# Mobile Artifact Density PR History

**Date:** 2026-05-24
**Branch:** `ux/mobile-artifact-density`
**PR:** [#42 Reduce mobile artifact export density](https://github.com/knhbae/flowme2605/pull/42)
**Status:** Merged
**Vercel:** [Deploy check](https://vercel.com/flowme/flowme2605/7hgsru4R7iePiUCsAbWXhVL7VYh4)
**Merge commit:** `f73ef819f7da8e6b96eed41a82b7363d95e3a06f`
**Related spec:** [2026-05-24-mobile-artifact-density](../specs/2026-05-24-mobile-artifact-density/spec.md)
**Related audit:** [mobile artifact density](../content-audit/2026-05-24-mobile-artifact-density.md)

## Why

The export-first audit found that mobile screens can become dense when every artifact card repeats export buttons while the sticky mobile bar also exposes `산출물 받기`.

## What Changed

- Added RED/GREEN E2E coverage for mobile study workbench density.
- Hid artifact-card export button groups on mobile below the `sm` breakpoint.
- Kept desktop artifact-near export buttons unchanged.
- Kept the mobile sticky export sheet as the mobile export path.
- Captured a mobile screenshot for `computer-skills-d30-study`.

## Not Done

- No redesign of the mobile bottom sheet.
- No new export format.
- No route content rewrite.
- No native FLOW record feature.

## Decisions

- Desktop users keep artifact-near export buttons because the wider layout supports them.
- Mobile users get one compact sticky export entry and then choose the output in the bottom sheet.
- This is a UI density change only; export behavior and file generation stay unchanged.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/content-audit/2026-05-24-mobile-artifact-density.md`
- `docs/specs/2026-05-24-mobile-artifact-density/`
- `docs/pr-history/2026-05-24-mobile-artifact-density.md`
- `docs/STATUS.md`
- `docs/screenshots/2026-05-24-mobile-artifact-density-study-mobile.png`

## Verification

- RED: `npm run test:e2e -- --grep "mobile workbench keeps export buttons"` failed before implementation.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "mobile workbench keeps export buttons"` passed: 1 test.
- GREEN: `npm run docs:check` passed: 14 required files, 205 local links.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run test:e2e` passed: 47 tests.
- Vercel check passed for head commit `30d62e1f3af6691db667e833985bdb6e00924100`.

## Risks

- Hiding card buttons on mobile relies on users noticing the sticky export bar after starting execution.
- If the sticky export sheet remains too dense, the next fix should group sheet actions by primary artifact.

## Follow-Ups

- Re-evaluate mobile bottom-sheet density after one more screenshot pass across `diet-habit-2week` and `new-car-delivery-check`.
