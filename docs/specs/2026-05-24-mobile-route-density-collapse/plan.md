# Mobile Route Density Collapse Plan

## Files

| File | Change |
| --- | --- |
| `components/flow/AppClient.tsx` | Add route-scoped mobile secondary-section collapse shell. |
| `tests/e2e/flow-mvp.spec.ts` | Add RED/GREEN mobile E2E for collapsed secondary sections. |
| `docs/screenshots/2026-05-24-mobile-route-density-diet.png` | Capture updated diet mobile route density. |
| `docs/screenshots/2026-05-24-mobile-route-density-new-car.png` | Capture updated new-car mobile route density. |
| `docs/content-audit/2026-05-24-mobile-route-density-collapse.md` | Record UX decision and screenshot findings. |
| `docs/specs/2026-05-24-mobile-route-density-collapse/` | Spec, plan, tasks, and QA notes. |
| `docs/pr-history/2026-05-24-mobile-route-density-collapse.md` | Track the PR. |
| `docs/STATUS.md` | Add recent-change note. |

## Steps

1. Write E2E that expects mobile secondary sections to be collapsed.
2. Verify RED.
3. Implement route-scoped mobile collapsed section shell.
4. Verify GREEN.
5. Rebuild and capture screenshots.
6. Update docs.
7. Run verification.
8. Open and merge a small PR if checks are green.
