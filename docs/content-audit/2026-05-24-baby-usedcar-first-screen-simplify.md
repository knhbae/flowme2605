# Baby Food and Used Car First-Screen Simplification

**Date:** 2026-05-24
**Branch:** `codex/baby-usedcar-first-screen-simplify`
**Input audit:** [2026-05-23 representative UX content simplification](./2026-05-23-representative-ux-content-simplification.md)

## Decision

Implement the first two simplification tasks from the representative UX/content audit:

| Flow | Decision | First-screen artifact |
| --- | --- | --- |
| `baby-food-menu-recipe` | Recipe richness moves behind the first execution job. | Meal calendar + reaction log + allergy/expert warning. |
| `used-car-buying-check` | Generic checklist density moves behind candidate decision support. | Candidate comparison sheet + buy/hold memo. |

## Natural Artifact Simulations

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap before this batch | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `baby-food-menu-recipe` | `startDate=2026-06-01`, `babyAge=6 months`, first foods `쌀미음`, `찹쌀미음`, `애호박미음`; reaction notes `40ml`, `발진 없음`, `변 평소와 같음` | A parent-maintained meal calendar plus reaction log sheet that can be copied to Excel or shared during a pediatric visit. | The old first workbench looked like a generic timeline/calendar, while recipe detail could compete with the more important first job: feed once and record reaction. | Add `meal_reaction_log`, show meal slots and new ingredients, keep allergy/expert warning above the table, and collect amount/skin/vomiting/stool/sleep/preference notes. |
| `used-car-buying-check` | `candidateA=2021 Avante`, `candidateB=2020 K3`, `budget=1,500만원`, proof files `performance-record.pdf`, expert memo `하부 누유 확인 필요`, decision memo `기록 불일치 시 보류` | A candidate comparison sheet plus buy/hold memo used before visiting or signing. | The old first workbench exposed many generic checklist rows before the user could compare candidates or record why to stop. | Add route-specific comparison rows for price/mileage, history record, seller memo, and hold reason; add evidence/expert/buy-hold memo fields before checklist density. |

## Source And Risk Boundary

- Baby-food keeps the warning visible in the workbench and does not present recipe content as medical guidance.
- Used-car records evidence and expert-check notes without telling the user to buy.
- Neither route changes public exposure or claims validation.
- Export-first behavior remains the product frame: the user can move the work into a calendar, spreadsheet, or memo before FLOW asks them to keep native records.

## Screenshot Evidence

- `baby-food-menu-recipe`: [desktop](../screenshots/2026-05-24-baby-food-first-screen-simplify-desktop.png), [mobile](../screenshots/2026-05-24-baby-food-first-screen-simplify-mobile.png)
- `used-car-buying-check`: [desktop](../screenshots/2026-05-24-used-car-first-screen-simplify-desktop.png), [mobile](../screenshots/2026-05-24-used-car-first-screen-simplify-mobile.png)

## Follow-Up

- Re-run this same simplification method on the next representative/public-MVP candidates only after this PR lands.
- Consider a later native record view only after export, check, repeat, and feedback behavior is measured.
