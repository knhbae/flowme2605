# PR History: Source Replacement And Risk Reshape

**Date:** 2026-05-23
**Branch:** `codex/source-replacement-risk-reshape`
**PR:** [#25](https://github.com/knhbae/flowme2605/pull/25)
**Related audit:** [2026-05-23-source-replacement-risk-reshape.md](../content-audit/2026-05-23-source-replacement-risk-reshape.md)
**Related spec:** [2026-05-23-source-replacement-risk-reshape](../specs/2026-05-23-source-replacement-risk-reshape/spec.md)

## Intent

The previous source replacement/risk review batch cleared the manual `needs_review` queue, but the routes still needed artifact-first UX reshaping. This batch implements the next layer: route-specific logs, sheets, comparison rows, and official/risk memo cards for the twelve remaining follow-up routes.

## Changes

- Added study score/progress logs to `computer-skills-d30-study`.
- Routed `diet-habit-2week`, `diet-meal-exercise-log`, and `diet-reset-2week` to spreadsheet-first workbench surfaces.
- Added new-car delivery defect/evidence comparison rows.
- Added official/risk memo fields for tax, business registration, Happy Birth, industrial accident, health checkup, vaccination certificate, and job-change risk routes.
- Updated decision-table workbench layout so a route can show both comparison rows and a route-specific memo card.
- Added tests and docs for natural artifact simulation, current Flow/UX gap, and content/UX reinforcement.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test -- lib/flow/artifact-fields.test.ts lib/flow/artifact-plan.test.ts` | Pass | Targeted field/surface tests passed after implementation. |
| `npm test` | Pass | 118 tests passed, 0 failed. |
| `npm run docs:check` | Pass | Documentation check passed: 14 required files, 63 local links. |
| `git diff --check` | Pass | No whitespace errors reported. |
| `npm run build` | Pass | Next.js production build compiled, type-checked, and generated 9 static pages. |
| `npm run test:e2e` | Pass | 39 Playwright tests passed after rebuilding the Next.js production bundle. |

## Residual Risk

- These routes still need item-level copy polishing before representative public exposure.
- Static fields do not replace official source checks or professional advice for medical, labor, tax, business, or benefit decisions.
- The health-check memo label avoids duplicating the anchor input accessible name; future memo fields should avoid partial label collisions with first-screen inputs.
