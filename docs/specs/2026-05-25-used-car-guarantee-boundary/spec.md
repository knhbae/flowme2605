# Used-Car Guarantee Boundary

Date: 2026-05-25

## Goal

Keep `used-car-buying-check` useful as a candidate comparison and buy/hold memo Flow while making it clear on-page and in exports that FLOW does not guarantee vehicle condition.

## Scope

- Add an explicit no-guarantee warning to the route seed.
- Include route warnings near the top of copied text exports so the boundary travels to external notes.
- Do not change source data, candidate comparison fields, mobile layout, or external integrations.

## Acceptance Criteria

- `used-car-buying-check` warning contains `차량 상태를 보증하지 않습니다`.
- Text export includes the warning before the comparison/checklist content.
- Existing workbook warning behavior remains unchanged.
- No route is called validated.
