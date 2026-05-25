# FITVELY Nutrition Exact-Video Action Clarity Audit

Date: 2026-05-25

## Trigger

The product review found that FITVELY nutrition exact-video Flows still did not answer the user's immediate question: "what do I do when this Flow item appears in my sheet, memo, or reminder?" The earlier sheet-first pass made the route portable, but the item details and workbench did not make the before/after action explicit enough.

## Routes Covered

- `real-fitvely-video-body-fat-6kg-method`
- `real-fitvely-video-carb-reason`
- `real-fitvely-video-three-week-check`
- `real-fitvely-video-post-workout-nutrition`
- `real-fitvely-video-carb-amount-shorts`
- `real-fitvely-video-after-work-nutrition`
- `real-fitvely-video-weight-class-method`

## Final Judgment

- Keep these routes one-action and sheet-first.
- The action is not a full diet plan: open the source video, choose one source rule, apply it once to the next meal or workout-adjacent behavior, then record before/after reaction and keep-or-stop decision.
- The workbench should export an apply-before-after observation row, not a generic diet log.
- No route is validated by this batch; this is a content/UX correction based on review and simulation.

## Issues

- High: item details had "choose a rule" language, but not a clear first action that would survive export into a calendar reminder or sheet row.
- High: the sheet workbench used generic record-table affordances for these exact videos, so the user could not see what to capture before and after applying the rule.
- Medium: the route copy talked about an observation sheet but did not name the concrete output as apply-before/apply-after fields.
- Low: no Figma layout work is needed for this copy and field-structure pass; use Figma if a later pass redesigns the source-rule selector or mobile sheet density.

## Small Fix In This Batch

- Added `첫 행동`, `적용 전 기록`, `적용 후 기록`, and `유지/중단 결정` language to all FITVELY nutrition exact-video item details.
- Added route-specific observation table columns: date, target action, selected source rule, before condition, after reaction, and keep-or-stop decision.
- Updated the embedded tool copy from generic `관찰표` to `적용 전후 관찰표`.
- Included `real-fitvely-video-weight-class-method` in the same nutrition exact-video guard.

## Larger Work Excluded

- Automatic gram targets, meal plans, or body-weight outcome logic.
- External app direct integrations.
- Native long-term health records.
- Treating creator nutrition advice as official medical guidance.
- Calling the route validated without observed user behavior.

## Screenshots

- Desktop: [FITVELY nutrition action clarity desktop](../screenshots/2026-05-25-fitvely-nutrition-action-clarity-desktop.png)
- Mobile: [FITVELY nutrition action clarity mobile](../screenshots/2026-05-25-fitvely-nutrition-action-clarity-mobile.png)
