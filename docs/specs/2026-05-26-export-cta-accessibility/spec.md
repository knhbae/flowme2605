# Export CTA Accessibility Spec

**Date:** 2026-05-26
**Status:** Implemented
**Owner:** Codex

## Goal

Improve export CTA accessible names where this design-reference batch touched mobile export surfaces, without globally renaming every export button or changing visible labels.

## Scope

In:
- Add destination-and-artifact `aria-label` values to the mobile export sheet actions.
- Add a destination-and-artifact `aria-label` to the baby-food mobile reaction sheet CTA.
- Keep visible CTA labels short.

Out:
- Renaming all desktop artifact export buttons.
- Replacing the mobile export sheet pattern globally.
- Any validation or medical authority claim.

## Acceptance Criteria

- Mobile export sheet calendar, Excel, and copy actions expose accessible names that include destination plus artifact context.
- Baby-food today's reaction sheet CTA exposes an accessible name that includes the sheet destination and reaction-record artifact.
- Existing visible labels and export behavior remain unchanged.
