# P34 Plan

## Gate

1. Work from P33 SHA `8c54992`.
2. Preserve the original dirty worktree.
3. Keep P34 in a dependent branch until P33 production smoke passes.
4. Do not auto-merge canonical legacy copies.

## Implementation Sequence

1. Record current capability truth and reference-pattern boundaries.
2. Add shared Flow, Item, occurrence, and export command grammar.
3. Connect one visible `Flow 관리` surface to existing lifecycle handlers.
4. Preview the archive recovery path in `Flow 관리`, then expose direct restore
   when an archived Flow exists.
5. Harden permanent-delete focus, backup, and personal/source copy.
6. Hide draft split/merge/reorder behind `구조 편집`.
7. Make Item and occurrence labels ownership- and scope-specific.
8. Add roving Calendar keyboard navigation.
9. Make export entry labels state scope and count.
10. Re-run representative public, My Flow, Calendar, recurrence, and export
   journeys at 390, 1024, and 1440.
11. Run full deterministic verification and produce a final evidence package.

## Alternative Gate

- A: copy-only cleanup. Rejected because archived discovery and Calendar
  keyboard cost remain.
- B: shared command grammar with bounded structural composition. Selected.
- C: full CRUD/planner redesign. Rejected unless B fails the final journey gate.

## Replan Triggers

Escalate from B only if one of these remains after implementation:

- lifecycle requires more than two taps from a focused Flow;
- one Item has more than one competing edit entry;
- series and occurrence operations still share an ambiguous action;
- Calendar still exposes more than one date Tab stop;
- export preview count differs from generated output.
