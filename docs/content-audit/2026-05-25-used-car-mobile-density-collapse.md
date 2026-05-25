# Used-Car Mobile Density Collapse

Date: 2026-05-25

## Decision

`used-car-buying-check` already starts from candidate comparison and buy/hold memo fields. The remaining mobile risk was that the long checklist could still compete with the comparison artifact after the first screen.

This pass keeps the comparison table and decision memo visible, while secondary execution sections start collapsed on mobile.

No representative, public-MVP, or validation status changes in this batch.

## Natural Artifact Simulation

Route: `used-car-buying-check`

Simulated user:

- Candidate A: `2020 Avante, 14.5M KRW, 60k km`
- Candidate B: `2019 K3, 12.5M KRW, 80k km`
- First decision: compare price, mileage, history record, seller memo, and hold reason.

Expected mobile output:

- Candidate comparison table remains first.
- Buy/hold memo remains visible before the longer checklist.
- Secondary checklist sections are available but collapsed, so checking tasks is not mistaken for purchase advice.

## UX Boundary

FLOW structures comparison evidence. It does not certify vehicle condition or recommend buying.

## Screenshots

- `docs/screenshots/2026-05-25-used-car-mobile-density-collapse.png`
- `docs/screenshots/2026-05-25-used-car-mobile-density-collapse-desktop.png`
