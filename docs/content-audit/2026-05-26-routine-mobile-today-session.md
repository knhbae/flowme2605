# Routine Mobile Today Session Audit

**Date:** 2026-05-26
**Scope:** Batch A from `next_job.md`: routine mobile first screen.

## Routes Checked

- `running-5k-4week`
- `home-workout-20min`
- `english-study-30day-routine`
- `car-care-monthly-routine`
- `real-thankyou-bubu-video-full-body-no-jump`

## Decision

Routine mobile pages now put the next session card ahead of the calendar grid. Desktop keeps the routine calendar artifact first. Operational status/source-fit panels move below the workbench on mobile only, so the first viewport can show the route header plus the actionable session card.

## Source/Risk Boundary

- No source URL, risk level, warning, or lifecycle classification changed.
- No route is called validated.
- Source-fit and migration status remain visible; they are only moved below the mobile workbench for routine routes.

## Natural Artifact Check

With the default preview start date and selected weekdays, the mobile user sees:

1. The current route title and category badges.
2. The routine artifact name.
3. The next session row with date and weekday.
4. A direct session record button.
5. The full routine calendar below the session card.

Desktop still shows the setup area and the routine calendar artifact in the existing order.

## Screenshots

- Running desktop: [2026-05-26-routine-mobile-today-session-running-desktop.png](../screenshots/2026-05-26-routine-mobile-today-session-running-desktop.png)
- Running mobile: [2026-05-26-routine-mobile-today-session-running-mobile.png](../screenshots/2026-05-26-routine-mobile-today-session-running-mobile.png)
- Exact workout video mobile: [2026-05-26-routine-mobile-today-session-thankyou-video-mobile.png](../screenshots/2026-05-26-routine-mobile-today-session-thankyou-video-mobile.png)

## Verification

- RED: focused Playwright failed before implementation because `routine-today-session-card` was missing.
- RED: stricter mobile viewport assertion failed with the session card at `y=1450`, then the CTA at `y=892`.
- GREEN: focused Playwright passes after moving routine mobile workbench/status order and placing the CTA before optional memo entry.
