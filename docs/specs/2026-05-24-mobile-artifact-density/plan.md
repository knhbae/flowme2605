# Mobile Artifact Density Plan

## Files

| File | Responsibility |
| --- | --- |
| `tests/e2e/flow-mvp.spec.ts` | RED/GREEN mobile density coverage. |
| `components/flow/ArtifactWorkbench.tsx` | Hide artifact-card export button groups on mobile. |
| `docs/content-audit/2026-05-24-mobile-artifact-density.md` | Record UX finding and screenshot. |
| `docs/specs/2026-05-24-mobile-artifact-density/` | Batch spec, plan, tasks, and QA. |
| `docs/pr-history/2026-05-24-mobile-artifact-density.md` | PR-sized implementation memory. |
| `docs/STATUS.md` | Current-state memory. |

## Sequence

1. Add failing mobile E2E for hidden card buttons and sticky-sheet export access.
2. Hide artifact-card export buttons on mobile only.
3. Rebuild and rerun the targeted E2E.
4. Capture mobile screenshot.
5. Run full verification.
6. Open PR and merge if checks pass.

## Risk Controls

- Desktop artifact-near export buttons stay visible.
- The mobile sticky sheet remains the single mobile export entry.
- No export behavior or file format changes.
