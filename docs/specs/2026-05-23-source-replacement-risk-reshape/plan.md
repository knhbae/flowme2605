# Source Replacement And Risk Reshape Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/artifact-fields.ts` | Route slugs to study logs, comparison rows, and memo-card fields. |
| `lib/flow/artifact-plan.ts` | Primary-surface overrides for sheet-first, memo-first, and decision-first routes. |
| `components/flow/ArtifactWorkbench.tsx` | Display memo cards alongside decision tables when a route needs both. |
| `lib/flow/artifact-fields.test.ts` | Regression coverage for the route-specific records. |
| `lib/flow/artifact-plan.test.ts` | Regression coverage for artifact-first primary surfaces. |
| `docs/content-audit/2026-05-23-source-replacement-risk-reshape.md` | Route-by-route simulation, gap, and reinforcement record. |
| `docs/pr-history/2026-05-23-source-replacement-risk-reshape.md` | PR evidence, verification, and residual risk. |

## Sequence

1. Add failing tests for the twelve route records and surface routing.
2. Implement artifact field mappings and primary-surface overrides.
3. Wire decision-table memo fields into the workbench without nesting cards.
4. Record docs for natural artifact simulation, current Flow/UX gap, and content/UX reinforcement.
5. Run the full verification sequence and update QA/PR history with evidence.

## Risk Controls

- Keep all changes static and route-scoped.
- Keep official/risk routes in `reshape_before_featured` lifecycle; this is execution hardening, not validation.
- Do not rewrite seeded flow copy outside the artifact layer.
- Do not rely on live network or source recrawl for tests.
