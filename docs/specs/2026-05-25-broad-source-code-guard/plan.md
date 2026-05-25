# Broad Source Code Guard Plan

## Files

| File | Purpose |
|---|---|
| `lib/flow/content-lab.test.ts` | Add RED/GREEN guard for broad real-source summary fields. |
| `lib/flow/content-lab.ts` | Return broad route count, slug list, and representative leak list. |
| `docs/content-audit/2026-05-25-broad-source-code-guard.md` | Record the audit and result. |
| `docs/specs/2026-05-25-broad-source-code-guard/*` | Durable spec, plan, tasks, and QA. |
| `docs/pr-history/2026-05-25-broad-source-code-guard.md` | PR-level record. |
| `docs/STATUS.md` | Project status update. |

## Steps

1. Add failing Content Lab summary test.
2. Implement broad real-source summary fields.
3. Run targeted test.
4. Add docs and status.
5. Run full requested verification where feasible.

## Constraints

- Keep this batch small and data-only.
- Do not change public route exposure.
- Do not call the routes validated.
