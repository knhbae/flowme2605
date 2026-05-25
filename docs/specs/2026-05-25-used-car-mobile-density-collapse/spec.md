# Used-Car Mobile Density Collapse Spec

**Date:** 2026-05-25
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** Stage 0 export-first execution behavior.

## Goal

Reduce mobile density on `used-car-buying-check` by keeping candidate comparison and buy/hold memo first while collapsing secondary checklist sections on mobile.

## Stage Fit

This is a Stage 0 UX cleanup. It improves the first exported artifact path without adding integrations, purchase advice, or native long-term records.

## User Need

As a used-car buyer comparing candidates on mobile, I need the comparison sheet and hold memo before the long checklist, so that I can decide what evidence is missing before checking tasks.

## Scope

In:

- Add `used-car-buying-check` to route-scoped mobile secondary-section collapse.
- E2E coverage that verifies the comparison artifact remains visible.
- Screenshot and audit documentation.

Out:

- New purchase scoring.
- Vehicle condition certification.
- Representative/public MVP/validated promotion.

## Acceptance Criteria

- On mobile, `used-car-buying-check` has at least one closed `mobile-collapsed-section`.
- Candidate comparison rows remain visible in the artifact workbench.
- Desktop behavior remains expanded through the existing desktop layout.
- Documentation records no validation claim.
