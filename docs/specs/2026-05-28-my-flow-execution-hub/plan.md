# My Flow Execution Hub Plan

## Files

| File | Responsibility |
| --- | --- |
| `components/flow/AppClient.tsx` | Owns My Flow saved-state layout, view tabs, scope selection, and saved Flow cards/list rows. |
| `tests/e2e/flow-mvp.spec.ts` | Protects saved Flow count scenarios, scope behavior, tab behavior, and mobile overflow. |
| `lib/flow/storage.ts` | Existing local saved-flow state source; avoid storage expansion in this spec unless a later batch requires it. |
| `docs/specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md` | Defines the My Flow item execution types and surface rules for the new UX. |
| `docs/IDEAS.md` | Keeps the deferred conversation context and links to this spec-level decision. |
| `docs/STATUS.md` | Should mention the spec only when work starts or lands. |

## Sequence

1. Preserve the current `전체 Flow + Flow별` correctness: all saved Flows must be visible.
2. Convert all-Flow `Flow별` from detailed repeated cards to compact operating rows/cards.
3. Keep selected single Flow as the detailed management view.
4. Add top summary for today, upcoming, active, and stale/overdue state once the saved-flow row model is stable.
5. Add empty, one-Flow, few-Flow, and many-Flow demo/test fixtures.
6. Add search/filter/sort only when 6+ saved Flow scenarios are covered.
7. Add grouping/collapse only when 20+ saved Flow scenarios are covered.

## Item Type Sequence

1. Keep the matrix document as the source of truth for UX12 item behavior.
2. Add a lightweight derived item type to My Flow rows.
3. Show item type counts and badges in the Flow view.
4. Split Today and Calendar visibility by item type.
5. Split the detail sheet into type-specific fields.
6. Add one E2E assertion per item type before broadening the fixture set.

## Risk Controls

- Do not add account-backed persistence while the current product is still local saved-flow based.
- Do not imply real usage, popularity, validation, or completion quality from internal demo data.
- Keep calendar/checklist/routine as artifact views, not separate product modules.
- Keep destructive actions lower emphasis or behind specific Flow management.
- Verify mobile screenshots for each layout mode before deploy.
