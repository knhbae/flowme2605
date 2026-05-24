# Representative Route Re-Evaluation

**Date:** 2026-05-24
**Branch:** `docs/representative-route-reevaluation`
**Inputs:** [study progress table criteria](./2026-05-24-study-progress-table-criteria.md), [six-route export-first audit](./2026-05-24-export-first-user-audit.md), [mobile artifact density audit](./2026-05-24-mobile-artifact-density.md)

## Decision

The mobile density fix improves the representative candidate surface because mobile users now get one sticky export entry instead of repeated artifact-card buttons. It does not create user behavior evidence.

No route is validated. The current states remain:

| Flow | State after re-evaluation | Why |
| --- | --- | --- |
| `computer-skills-d30-study` | Representative-eligible, not validated | Low-risk study route, exact source fit, source-derived progress rows, D-30 calendar, study spreadsheet, and mobile density now align with export-first behavior. It still lacks real user open, date-entry, export, repeat-use, and correction data. |
| `diet-habit-2week` | Public MVP candidate with guardrails, not representative | The two-week observation sheet is useful, but health-sensitive framing requires stop/consult conditions, warning hierarchy, and real-use evidence before stronger exposure. |
| `new-car-delivery-check` | Public MVP candidate with guardrails, not representative | Evidence capture and memo export fit the delivery moment, but money-at-risk handover decisions make representative exposure premature without field evidence. |
| `moving-d30-basic` | Export-first density benchmark | The route remains the cleanest low-risk example of anchor date, calendar/checklist artifact, and low mobile load. |
| `baby-food-menu-recipe` | Monitor before broader exposure | Meal calendar plus reaction log fits the job, but health-adjacent caution and recipe detail can still crowd the first artifact. |
| `used-car-buying-check` | Comparison-first candidate, not validated | Candidate comparison plus hold memo fits sheet/memo export, but checklist completion must not read as purchase certification. |

## User Journey Recheck

### `computer-skills-d30-study`

- First action: Enter exam date, then review the creator-provided chapter/progress rows.
- Natural artifacts: D-30 study calendar, source-derived progress spreadsheet, mock-score and wrong-answer log.
- Gap after mobile density fix: The mobile page is less button-heavy, but the route still needs evidence that users understand the table as prefilled source rows rather than a blank planner.
- Reinforcement: Keep row labels source-derived, keep editable fields narrow, and keep calendar/progress/score outputs as separate artifacts.
- Export-first fit: Strong. Calendar and spreadsheet are natural outputs.

### `diet-habit-2week`

- First action: Enter start date and open the observation sheet.
- Natural artifacts: Two-week meal/activity/condition spreadsheet and weekly review rows.
- Gap after mobile density fix: Fewer repeated mobile export buttons help, but the route can still feel like advice if observation and stop/consult language is not visually dominant.
- Reinforcement: Keep health caution near the sheet, avoid weight-loss promises, and move secondary explanation below the first artifact.
- Export-first fit: Good with guardrails. Spreadsheet is primary; internal long-term record is out of scope.

### `new-car-delivery-check`

- First action: Record delivery context and defect evidence before acceptance.
- Natural artifacts: Delivery evidence sheet, defect/photo filename rows, dealer confirmation memo, handover hold note.
- Gap after mobile density fix: Export controls are less repetitive, but the route still carries signing/acceptance risk if evidence rows and hold memo are not first.
- Reinforcement: Keep evidence preservation and hold criteria above generic checklist density.
- Export-first fit: Good with guardrails. Spreadsheet and memo are primary.

## Candidate Gate

Representative exposure needs all of:

- Clear first action and natural artifact on mobile.
- Destination-specific export that matches the user's outside tool.
- Source/risk separation appropriate to the domain.
- No unsupported outcome claim.
- No hard fail from the quality gate.
- Real user behavior data before using `validated`.

Current evidence supports only `representative-eligible` for `computer-skills-d30-study`. It does not support `validated` for any route.

## Next Small UX Candidates

1. Run a mobile bottom-sheet screenshot pass on `diet-habit-2week` and `new-car-delivery-check`.
2. If dense, group mobile sheet actions by primary artifact instead of restoring card-level mobile buttons.
3. Add a copy/test guard that study progress rows remain source-derived defaults, not user-designed table schema.
4. Keep route promotion decisions separate from implementation polish.
