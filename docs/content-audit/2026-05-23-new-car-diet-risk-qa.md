# New Car + Diet Risk QA Audit

This pass continues the source-risk queue after the computer-skills final promotion. It focuses on the two routes that are useful enough for public MVP but too sensitive for representative promotion.

| Flow | Decision | Natural artifact simulation | Current Flow/UX gap | Content/UX reinforcement |
|---|---|---|---|---|
| `new-car-delivery-check` | Public MVP after risk QA | Delivery-day evidence sheet with defect row, photo filename, dealer confirmation, and handover boundary memo. | Decision table was useful, but proof memo fields were not visible as a standalone handover artifact. | Added proof memo fields beside the decision table and kept signing/acceptance as user documentation, not FLOW advice. |
| `diet-habit-2week` | Public MVP after risk QA | Two-week observation sheet with meals, activity, measurement, condition, stop condition, and weekly review. | Spreadsheet surface fit the job, but warning/observation hierarchy was not close enough to the weekly review surface. | Added a warning card inside the spreadsheet workbench and kept the language observation-first. |

## UX Review

Findings:

1. **High / New-car evidence:** Users at delivery need photo filenames and dealer confirmation beside the comparison table. Otherwise the export can look like a checklist instead of evidence.
2. **High / Diet safety:** Medical-sensitive content must lead with observation and stop conditions before any result-oriented interpretation.
3. **Medium / Feature diet:** Neither route should become an automated contract or health decision workflow yet.

Rubric:

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

## Evidence

- Unit tests cover risk-boundary QA records, new-car memo fields, and export values.
- Playwright E2E enters realistic values and downloads `new-car-delivery-check.xlsx` and `diet-habit-2week.xlsx`.
- Screenshots were saved for desktop and mobile.

## Next

1. Keep both routes in lifecycle `fix`.
2. Watch for real usage data before any representative promotion.
3. Continue broader UX simplification review across public Flow pages.
