# Admin Route Reshaping Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/artifact-plan.ts` | Choose memo/table/calendar surfaces for reshaped official routes. |
| `lib/flow/artifact-fields.ts` | Define comparison rows, memo fields, and log tables. |
| `components/flow/ArtifactWorkbench.tsx` | Render memo-card primary surfaces instead of falling back to generic checklist. |
| `lib/flow/export.ts` | Preserve typed workbench fields in text and workbook exports. |
| `lib/flow/seed-flows.ts` | Sharpen route item wording around official-source decisions. |
| `lib/flow/real-content-pilot-flows.ts` | Sharpen Q-Net deadline wording. |
| `lib/flow/*.test.ts` | Lock plan, field, and export behavior. |
| `tests/e2e/flow-mvp.spec.ts` | Verify visible workbench fields for reshaped routes. |
| `docs/content-audit/*` and `docs/pr-history/*` | Record artifact simulation, gap, reinforcement, and PR evidence. |

## Sequence

1. Add failing tests for artifact surfaces, fields, and export labels.
2. Implement the smallest route-specific field definitions and memo-card rendering path.
3. Update route copy and content audit notes.
4. Run unit, docs, build, and targeted E2E checks.
5. Open a PR for the reshaping batch after evidence is recorded.

## Risk Controls

- Keep fields route-specific and static; no new persistence model.
- Keep official facts separate from user-entered memo/log values.
- Do not change unrelated needs-review routes in this branch.
- Preserve the existing handoff stash until it can be restored without mixing scopes.
