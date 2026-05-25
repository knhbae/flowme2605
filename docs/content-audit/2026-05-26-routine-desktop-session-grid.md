# Routine Desktop Session Grid Audit

**Date:** 2026-05-26
**Routes checked:** `running-5k-4week`, routine regression routes
**Design reference:** `design-ref/260525-2/flow-routine.jsx`
**Status:** Implemented, not validated

## Findings

1. **Medium - Desktop artifact clarity:** The previous desktop workbench still read as a generic repeated calendar plus memo card. It did not clearly separate the primary session grid from the secondary session log.
2. **Medium - Recording destination:** Session notes were present, but the sheet-shaped record surface was buried inside the calendar card instead of being its own artifact.

## Rubric

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

## Fixes

1. The desktop routine primary card is now `회차 그리드 · primary`, with week rows and session cells.
2. The secondary artifact is now `회차 기록표 · secondary`, with intensity, done, and memo fields shaped for sheet export.
3. The right rail now serves weekly summary plus next-session focus.
4. Mobile keeps the next-session card first; desktop-only summary metrics are hidden below `lg`.

## Evidence

- Desktop screenshot: [2026-05-26-routine-desktop-session-grid-full.png](../screenshots/2026-05-26-routine-desktop-session-grid-full.png)
- Mobile guard screenshot: [2026-05-26-routine-desktop-session-grid-mobile-guard.png](../screenshots/2026-05-26-routine-desktop-session-grid-mobile-guard.png)
- Figma review screenshot: [2026-05-26-routine-desktop-session-grid-figma.png](../screenshots/2026-05-26-routine-desktop-session-grid-figma.png)
- Figma file: https://www.figma.com/design/Tsubuwt1wlPiUgpWbcLTw3

No route is called validated.
