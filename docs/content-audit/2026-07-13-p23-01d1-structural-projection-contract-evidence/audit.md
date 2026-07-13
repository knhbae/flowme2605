# P23-01D1 Audit

## Current Consumer Inventory

My Flow already renders the P23-01A resolver's effective structural Items for
eligible personal drafts. Calendar intentionally reads the pre-structural
projection rows, so personal add/delete/reorder is not visible there yet.

The portable per-step export builders read the selected My Flow row. The legacy
full-Flow text, workbook, and ICS builders read `FlowBundle.items`. None of
these builders consumes the P23-01D1 adapter in this slice.

## Contract Decision

`buildPersonalStructuralProjection` is a pure adapter over the existing
structural resolver. It returns destination-ready rows but does not perform
serialization or modify consumer state.

Calendar screen and ICS remain separate destinations because they may adopt the
contract in different slices. Both require a resolved date. Checklist, sheet,
and memo are list projections and retain unscheduled Items and personal order.

## Ownership

- Source: canonical Item values and source schedule.
- Personal structural overlay: user Items, tombstones, selection, and order.
- Personal value overlay: title, memo, and schedule overrides.
- Execution run: completion/reopen metadata only.

The adapter joins these layers for reading. It does not write any layer and
does not allow run state to change structure.

## Safety Findings

- Source arrays and source Item objects remain unchanged.
- Tombstoned and excluded Items are visible in audit rows but eligible for no
  destination.
- Unknown order IDs and source/user ID collisions produce warnings.
- Source v2 additions are appended safely instead of being lost.
- Missing or invalid calendar dates remove only Calendar/ICS eligibility.

## Next Slices

P23-01D2 should replace only the personal-draft Calendar screen input and prove
marker/agenda parity. P23-01D3 should connect export builders one destination at
a time, retaining existing payload and user-copy guardrails.
