# MOFA Travel Emergency Card Spec

Date: 2026-05-25

## Goal

Make `real-mofa-overseas-travel-prep` open with a concrete emergency memo card instead of a generic timeline-first travel checklist.

## User Need

As a traveler preparing for Vietnam, I need one portable memo with official-check date, alert result, embassy contact, local emergency numbers, insurance/shelter details, and family sharing status, so I can keep the practical result in my existing notes, sheet, or printed checklist.

## Scope

- Add route-specific MOFA memo fields.
- Make the MOFA route use `memo_card` as the primary artifact surface.
- Keep route status as reshape, not representative/public-MVP/validated.
- Add unit and E2E coverage.
- Capture desktop/mobile screenshots.

## Non-Goals

- No live MOFA API integration.
- No automatic destination risk decision.
- No visa/entry eligibility engine.
- No native travel vault.

## Acceptance

- `getMemoCardFields('real-mofa-overseas-travel-prep')` returns MOFA-specific emergency-card fields.
- `getArtifactPlan('real-mofa-overseas-travel-prep')` returns `memo_card` as primary.
- The route workbench exposes the emergency-card fields.
- Export-first boundary remains documented: this is a portable memo, not travel approval.
