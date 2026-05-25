# Routine Mobile Today Session Plan

## Files

| File | Responsibility |
| --- | --- |
| `components/flow/ArtifactWorkbench.tsx` | Reorder routine workbench on mobile and add today/next session card copy. |
| `components/flow/AppClient.tsx` | Keep exact-video routine preview compatible if route-specific mobile treatment is needed. |
| `tests/e2e/flow-mvp.spec.ts` | Add RED coverage for mobile today/next session first-screen ordering. |
| `docs/content-audit/2026-05-26-routine-mobile-today-session.md` | Record UX/content audit and screenshot links. |
| `docs/specs/2026-05-26-routine-mobile-today-session/qa.md` | Record verification evidence. |

## Sequence

1. Add the failing Playwright assertion for mobile routine first-screen order.
2. Implement the smallest routine workbench change that puts the next session card first on mobile while preserving desktop order.
3. Re-run the focused Playwright test, then broaden to unit, build, docs, and related screenshots.

## Risk Controls

- Do not add new generated workout/study/car-care session content.
- Keep desktop artifact labels and export button labels stable unless the test requires only mobile behavior.
- Keep `design-ref/` untracked and treat it as read-only reference input.
- Do not change validation language or representative/public MVP exposure.
