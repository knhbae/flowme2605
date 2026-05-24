# Mobile Artifact Density Audit

**Date:** 2026-05-24
**Branch:** `ux/mobile-artifact-density`
**Primary route:** `computer-skills-d30-study`

## Decision

On mobile, artifact-card export buttons add repeated controls to already dense workbench cards. The sticky export bar and bottom sheet already provide the mobile export path, so card-level export buttons should be hidden below the `sm` breakpoint while remaining visible on desktop.

## Natural Artifact Simulation

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap before this batch | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | `examDate=2026-06-22`, first study item checked, source-derived chapter rows visible | D-30 calendar plus source-derived study spreadsheet | Mobile showed `엑셀로 받기` on the progress card and `캘린더 받기` on the calendar card while also keeping the sticky `산출물 받기` shortcut. | Hide artifact-card export buttons on mobile and keep sticky sheet as the one compact export entry. |

## UX Findings

1. **Medium / Cognitive load:** Study mobile already combines anchor input, execution list, calendar, progress table, score table, sticky bar, and source/risk notes. Repeated card buttons make the page feel more like a dashboard.
2. **Medium / Portability clarity:** Desktop benefits from artifact-near export buttons. Mobile benefits more from one sticky export entry because the destination buttons are close together in the bottom sheet.
3. **Low / Accessibility:** The bottom sheet keeps the same export actions reachable on mobile after at least one item is checked.

## Verification Notes

- RED E2E failed because the mobile study progress card still exposed `엑셀로 받기`.
- GREEN E2E passed after hiding workbench export-button groups below `sm`.
- Screenshot: [study mobile](../screenshots/2026-05-24-mobile-artifact-density-study-mobile.png)

## Follow-Up

If future mobile screenshots show the bottom sheet itself is still too dense, split it by primary artifact rather than reintroducing card-level mobile export buttons.
