# 2026-05-23 Computer Skills Final Promotion QA

This pass performs the final browser/export QA for `computer-skills-d30-study` and records why it can become representative-eligible.

## Decision

| Flow | Previous state | New state | Reason |
| --- | --- | --- | --- |
| `computer-skills-d30-study` | `reshape_before_featured` / final promotion QA candidate | `keep_representative` | Low-risk exact source, clear exam-date anchor, visible D-30 calendar, visible chapter-progress table, visible mock-score table, and working xlsx/ics exports. |
| `new-car-delivery-check` | Public MVP after UX fix | No change | Money-at-risk handover route still needs evidence/photo UX and risk-boundary QA. |
| `diet-habit-2week` | Public MVP after UX fix | No change | Health-sensitive observation route still needs warning hierarchy QA. |

## Natural Artifact Simulation

| Artifact | Simulated input values | Expected output | Current Flow match | Current UX support | Gap |
| --- | --- | --- | --- | --- | --- |
| Calendar | `examDate=2026-06-22` | D-30 schedule starting `2026-05-23`, with dated study tasks through exam week | Strong: timeline rows calculate from the exam date and calendar export is available after check | Supported: first screen accepts exam date and workbench shows monthly calendar preview | No P0/P1 gap found in this pass |
| Spreadsheet | `chapterScope=spreadsheet functions and pivot tables`, `mockScore=68`, `wrongAnswers=function formulas, pivot table`, `retryDate=2026-06-02` | Chapter-progress rows plus mock-score/error rows | Strong: workbench exposes chapter table and score/error table | Supported: xlsx export is enabled after one check and preserves the route slug filename | Keep future UX polish focused on clearer preview density, not native record keeping |

## UX Review

Findings:
1. **Low / Cognitive load:** the workbench is dense, but the first screen still keeps the primary path clear: enter exam date, check first action, export.
2. **Low / Export-first clarity:** calendar and score sheet are both visible before export, which matches the route's natural user artifact.
3. **Low / Feature diet:** this route should stay export-first; native study tracking is not needed for Stage 0 promotion.

Rubric:
- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

Recommended fixes:
1. Promote `computer-skills-d30-study` only.
2. Keep `new-car-delivery-check` and `diet-habit-2week` in fix until their own risk/UX QA passes.
3. Use this route as the next low-risk representative example for export-first behavior.

## Evidence

- Desktop screenshot: [2026-05-23-computer-skills-final-qa-desktop.png](../screenshots/2026-05-23-computer-skills-final-qa-desktop.png)
- Mobile first-screen screenshot: [2026-05-23-computer-skills-final-qa-mobile-first-screen.png](../screenshots/2026-05-23-computer-skills-final-qa-mobile-first-screen.png)
- Mobile export-sheet screenshot: [2026-05-23-computer-skills-final-qa-mobile-export-sheet.png](../screenshots/2026-05-23-computer-skills-final-qa-mobile-export-sheet.png)

