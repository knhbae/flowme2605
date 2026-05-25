# Baby Food Sensitive Mobile Plan

## Files

| File | Responsibility |
| --- | --- |
| `components/flow/ArtifactWorkbench.tsx` | Reorder and add a compact mobile reaction card for meal-plan workbench. |
| `tests/e2e/flow-mvp.spec.ts` | Add RED coverage for sensitive mobile first-screen ordering. |
| `docs/content-audit/2026-05-26-baby-food-sensitive-mobile.md` | Record FLOW UX review and screenshot links. |
| `docs/specs/2026-05-26-baby-food-sensitive-mobile/qa.md` | Record verification evidence. |

## Sequence

1. Add failing Playwright assertions for baby-food mobile warning/reaction-card order.
2. Implement the smallest responsive change in `MealReactionWorkbench`.
3. Verify focused e2e, then build/unit/docs/full e2e.
4. Capture desktop/mobile screenshots and update audit notes.

## Risk Controls

- Do not change source URLs, medical warning content, or lifecycle status.
- Do not invent new baby-food schedules or reaction rules.
- Use responsive order/test ids instead of duplicating the entire workbench.
- Preserve existing desktop tests and exports.
