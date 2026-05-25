# Export-First Redesign Batch 1 Spec

Date: 2026-05-25

## Source

Design reference: `my_tests/flow_redesign_mockups.html`

## Problem

FLOW pages over-expose execution item lists before users understand the artifact they can move to their calendar, spreadsheet, or notes. For Stage 0, the first screen must show the external output first and keep internal editing secondary.

## Batch Scope

- Apply Screen 2 to `moving-d30-basic` only.
- Apply Screen 3 mobile export-sheet copy and hierarchy globally.
- Apply Screen 5 item-card control and skipped-state hierarchy globally.

## Acceptance Criteria

- `moving-d30-basic` shows an `Export-first flow hero` before the item cards.
- The hero previews calendar rows such as D-30, D-10, and D-Day after the user enters an 이사일.
- The hero primary CTA says `내 도구로 가져가기`.
- The mobile export sheet says `어디로 가져갈까요` and presents calendar, Excel, and text before edit.
- Item cards show checkbox, memo, 해당 없음, and detail controls in a compact row.
- Skipped item cards expose `data-skipped="true"` and visible copy saying they are excluded from progress.
- No route is called validated.

## Figma

No Figma file is created in this batch because the user supplied a concrete HTML mockup. Figma should be used for the next route-family generalization or component-library pass.
