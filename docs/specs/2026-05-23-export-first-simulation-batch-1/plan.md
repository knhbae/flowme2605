# Export-First Simulation Batch 1 Plan

## Files

| File | Purpose |
| --- | --- |
| `lib/flow/export-first-simulation-review.ts` | Store route-level user simulation review records. |
| `lib/flow/content-lab.ts` | Add simulation summary fields. |
| `lib/flow/content-lab.test.ts` | Assert simulation count, decisions, and concrete artifact rows. |
| `components/flow/ContentLab.tsx` | Render the Flow Lab simulation queue. |
| `tests/e2e/flow-mvp.spec.ts` | Verify the Flow Lab section and sample rows. |
| `docs/content-audit/2026-05-23-export-first-simulation-batch-1.md` | Record UX/content review findings. |
| `docs/pr-history/2026-05-23-export-first-simulation-batch-1.md` | Track PR evidence and residual risk. |

## Implementation Order

1. Add RED unit test for the three simulation records.
2. Implement the simulation record module and Content Lab summary.
3. Render the Flow Lab section.
4. Add E2E expectations.
5. Record docs and QA evidence.
6. Run unit, docs, build, and E2E verification.
7. Open PR and update PR history.

## Guardrails

- Keep export-first behavior primary.
- Do not promote any route in this batch.
- Do not add native persistence or account-backed records.
- Keep health and contract/financial risk boundaries explicit.

