# Routine Desktop Session Grid Spec

**Date:** 2026-05-26
**Status:** Implemented
**Owner:** Codex
**Design reference:** `design-ref/260525-2/flow-routine.jsx`

## Goal

Bring routine desktop workbenches closer to the design reference by making the primary artifact a week-by-day session grid and the secondary artifact a session log table.

## Scope

In:
- Rename the desktop routine primary artifact from a generic repeated calendar to `회차 그리드 · primary`.
- Render 4 weeks of session cells by weekday, with current/complete session states.
- Add a separate `회차 기록표 · secondary` table for intensity and memo fields.
- Keep the right rail focused on weekly summary and the next session.
- Preserve mobile's first-card behavior from the previous batch.

Out:
- Inventing new running/workout content beyond existing recurrence/session labels.
- Direct calendar or sheet integrations.
- Replacing the entire Flow detail page layout.
- Validation claims.

## Acceptance Criteria

- Desktop routine page exposes `routine-session-grid-card` before `routine-session-log-card`.
- The primary card shows `회차 그리드 · primary`, `4주 루틴`, week rows, and session cells.
- The secondary card shows `회차 기록표 · secondary`, `세트/강도`, `한 줄 메모`, and sheet export.
- Mobile still shows the next-session card before the calendar/grid.
- No route is called validated.

## Figma

Created a Figma review artifact:

- File: https://www.figma.com/design/Tsubuwt1wlPiUgpWbcLTw3
- Local screenshot: [routine-desktop-session-grid-figma.png](../../screenshots/2026-05-26-routine-desktop-session-grid-figma.png)

The Figma frame is an editable review artifact, not the source of implementation truth.
