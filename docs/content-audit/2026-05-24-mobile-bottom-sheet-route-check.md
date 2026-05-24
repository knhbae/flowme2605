# Mobile Bottom-Sheet Route Check

**Date:** 2026-05-24
**Branch:** `docs/mobile-bottom-sheet-route-check`
**Routes:** `diet-habit-2week`, `new-car-delivery-check`
**Input:** [representative route re-evaluation](./2026-05-24-representative-route-reevaluation.md)

## Decision

No immediate code change is needed for the mobile export bottom sheet. After the card-level mobile export buttons were hidden, the sheet presents one compact entry point with three practical choices: checklist copy, xlsx export, and user version.

The remaining density risk is not the bottom sheet itself. It is the route page length and the stacked artifact/warning sections before the user reaches the end.

## Screenshot Evidence

| Flow | Screenshot | Simulated state | Finding |
| --- | --- | --- | --- |
| `diet-habit-2week` | [diet mobile sheet](../screenshots/2026-05-24-mobile-bottom-sheet-diet.png) | `startDate=2026-06-01`, first item checked, mobile export sheet open | Sheet height is about 338px. Main actions are `체크리스트 복사`, `엑셀로 받기`, and `내 버전`. Density is acceptable, but the full page is long because observation sheet, warnings, meals, exercise, and weekly review all stack. |
| `new-car-delivery-check` | [new-car mobile sheet](../screenshots/2026-05-24-mobile-bottom-sheet-new-car.png) | `deliveryDate=2026-06-03`, first item checked, mobile export sheet open | Sheet height is about 338px. Main actions are `체크리스트 복사`, `엑셀로 받기`, and `내 버전`. Density is acceptable, but the full page is long because evidence rows, hold memo, exterior/interior checks, documents, and payment checks all stack. |

## UX Findings

1. **Medium / Page density:** Both routes have long mobile pages because every artifact section is visible in sequence. This is separate from the export sheet.
2. **Low / Export clarity:** The sticky `산출물 받기` entry still reads as the mobile export path, and the sheet choices are not excessive.
3. **Medium / Risk hierarchy:** `diet-habit-2week` must keep stop/consult conditions near the observation sheet. `new-car-delivery-check` must keep handover hold criteria near evidence rows.
4. **Low / Button density:** Hiding artifact-card export buttons on mobile remains the right default. Do not reintroduce them.

## Follow-Up

The next small UX code PR should not redesign the bottom sheet. Better candidates are:

1. Collapse secondary detail blocks below the first artifact on one sensitive route.
2. Keep warning/hold criteria visible but reduce repeated explanatory copy.
3. Add a mobile route-level density test only if a concrete UI change is made.

No route is validated by this screenshot pass. It only confirms the mobile export sheet is not the next bottleneck.
