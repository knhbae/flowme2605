# P7-03 My Flow long-list bottom-clearance evidence

This package records the P7-03 evidence requested by Claude Design for a repeat-user My Flow state with 5+ saved contents.

## Scenario

- Route: `/my`
- Viewport: `390 x 844`
- Fixed today: `2026-05-28T09:00:00+09:00`
- Saved content fixture: 6 saved contents
  - `moving-d30-basic`: dated moving tasks
  - `computer-skills-d30-study`: dated study tasks
  - `home-workout-20min`: routine saved content
  - `baby-food-menu-recipe`: sheet/export-style content
  - `used-car-buying-check`: undated checklist fallback
  - `new-car-delivery-check`: undated checklist content

## Evidence

- [route-evidence.json](./route-evidence.json)
- [my-flow-5plus-flow-list-top.png](./screenshots/my-flow-5plus-flow-list-top.png)
- [my-flow-5plus-flow-list-bottom.png](./screenshots/my-flow-5plus-flow-list-bottom.png)
- [my-flow-5plus-inline-detail-open.png](./screenshots/my-flow-5plus-inline-detail-open.png)
- [my-flow-5plus-inventory-sheet-top.png](./screenshots/my-flow-5plus-inventory-sheet-top.png)
- [my-flow-5plus-inventory-sheet-bottom.png](./screenshots/my-flow-5plus-inventory-sheet-bottom.png)

## Result

- Saved content count: 6
- Mobile structure rows shown before sheet: 4
- Full inventory sheet rows: 6
- Inventory open button clears bottom tabs by 58px
- Last inventory row bottom gap inside sheet: 16px
- Last inventory action/source bottom gaps: 29px / 29px
- User-facing raw ISO date matches in captured state: 0

Conclusion: P7-03 was an evidence gap, not an app bottom-clearance bug. The existing My Flow mobile layout keeps the page CTA above the 4-tab nav and opens the long saved list in a higher z-index inventory sheet whose final row/actions remain reachable.

## Regression Test

Pinned by:

```powershell
npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow long saved list keeps final mobile rows"
```
