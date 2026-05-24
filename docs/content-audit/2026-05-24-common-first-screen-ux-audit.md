# Common First-Screen UX Audit

**Date:** 2026-05-24
**Branch:** `codex/export-first-study-ux-direction`
**Input context:** export-first product direction and recent first-screen simplification PRs.

## Decision

The shared Flow page should keep moving toward "first action plus natural artifact" instead of showing every generic feature above the fold.

## Representative Findings

| Route | Natural first artifact | First-screen pressure | Recommended reduction |
| --- | --- | --- | --- |
| `computer-skills-d30-study` | D-30 calendar plus source-derived study sheet | Header, progress, export panel, full workbench, and checklist compete with the exam-date action. | Keep exam date, calendar, source-derived progress rows, and score log; move native study dashboard ideas and long source explanation below. |
| `baby-food-menu-recipe` | Meal calendar plus reaction log | Recipe detail can distract from the first feeding/reaction record. | Keep first feeding schedule and reaction log first; keep recipe detail secondary. |
| `used-car-buying-check` | Candidate comparison plus hold memo | Generic checklist can feel like the main product if it appears before the comparison. | Keep comparison/hold memo first; checklist remains field support. |
| `new-car-delivery-check` | Evidence comparison plus hold boundary | Warning copy must stay near evidence rows without becoming a separate advice page. | Keep warning inside workbench; avoid accept/reject recommendation language. |
| `passport-renewal-docs` | Submission memo | Checklist density can hide receipt, pickup, and storage values. | Keep submission memo first; checklist remains secondary. |

## Common UX Gaps

- Some routes still show page-level progress and workbench progress at the same time.
- Export buttons can appear before the user understands what artifact will be exported.
- "전체 흐름" previews are useful, but often compete with the first executable artifact.
- Checklist fallback is still visually heavy on routes where memo, sheet, calendar, or comparison is the real artifact.

## Recommended Next Reductions

1. Treat export controls as artifact-specific actions: calendar button near calendar, xlsx button near sheet, memo copy near memo.
2. Collapse or lower "전체 흐름" when a richer natural artifact exists above it.
3. Reduce duplicate progress indicators to one local indicator near the current artifact.
4. Keep warnings inside the artifact where they affect a decision, not in a disconnected page banner.

## Follow-Up

Run a separate common-layout PR after two or three more route-level first-screen fixes. The risk is broad visual churn; keep this audit as the checklist for that future pass.
