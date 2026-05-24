# Mobile Route Density Collapse

**Date:** 2026-05-24
**Branch:** `ux/mobile-route-density`
**Routes:** `diet-habit-2week`, `new-car-delivery-check`
**Input:** [mobile bottom-sheet route check](./2026-05-24-mobile-bottom-sheet-route-check.md)

## Decision

The mobile export bottom sheet was not the bottleneck. The next density issue was page-level stacking: artifact workbench, route overview, source/risk cards, and every execution section all appeared in sequence.

This batch keeps the first execution section open and collapses secondary execution sections on mobile for the two sensitive public-MVP candidates:

- `diet-habit-2week`
- `new-car-delivery-check`

Desktop keeps the existing expanded section layout.

## User Impact

| Flow | Before | After |
| --- | --- | --- |
| `diet-habit-2week` | Mobile showed observation artifact, warning/source cards, and meal/exercise/weekly review sections all expanded. | First food log section stays visible; `운동 기록` and `주간 점검` start collapsed below it. |
| `new-car-delivery-check` | Mobile showed evidence artifact plus all exterior/interior/document/payment sections expanded. | First handover-prep section stays visible; later inspection sections start collapsed below it. |

## Screenshot Evidence

| Flow | Screenshot | Collapsed sections |
| --- | --- | --- |
| `diet-habit-2week` | [diet route density](../screenshots/2026-05-24-mobile-route-density-diet.png) | 2 closed sections |
| `new-car-delivery-check` | [new-car route density](../screenshots/2026-05-24-mobile-route-density-new-car.png) | 3 closed sections |

## UX Findings

1. **Medium / Cognitive load:** Collapsing secondary sections lowers the initial mobile scan cost without hiding the first action or natural artifact.
2. **Low / Export-first fit:** Export behavior is unchanged. Users still export through the sticky `산출물 받기` sheet on mobile.
3. **Medium / Risk hierarchy:** Warnings and evidence/observation artifacts remain above the execution sections, so caution context is not buried.
4. **Low / Desktop continuity:** Desktop keeps expanded sections where there is enough width and scrolling cost is lower.

## Follow-Up

Do not promote either route to representative based on this UI polish. Both remain public MVP candidates with guardrails and still need real user behavior evidence.
