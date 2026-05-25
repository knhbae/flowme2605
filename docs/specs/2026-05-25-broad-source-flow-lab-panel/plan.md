# Broad Source Flow Lab Panel Plan

## Files

| File | Purpose |
|---|---|
| `tests/e2e/flow-mvp.spec.ts` | Add Flow Lab visibility coverage for the broad-source panel. |
| `components/flow/ContentLab.tsx` | Render the panel from Content Lab summary fields. |
| `docs/screenshots/2026-05-25-broad-source-flow-lab-panel-desktop.png` | Desktop screenshot evidence. |
| `docs/content-audit/2026-05-25-broad-source-flow-lab-panel.md` | Record UX decision and result. |
| `docs/specs/2026-05-25-broad-source-flow-lab-panel/*` | Durable spec, plan, tasks, QA. |
| `docs/pr-history/2026-05-25-broad-source-flow-lab-panel.md` | PR-level record. |
| `docs/STATUS.md` | Project status update. |

## Steps

1. Add failing Flow Lab E2E expectations.
2. Render the Broad Source Guard panel.
3. Rebuild and run targeted E2E.
4. Capture screenshot.
5. Update docs.
6. Run verification.

## Constraints

- Keep the panel compact.
- Do not change public route exposure.
- Do not call any route validated.
