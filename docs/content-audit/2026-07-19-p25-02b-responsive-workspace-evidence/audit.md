# P25-02B Audit

## Cause

The selected-Flow branch reused a `md:grid-cols-2 lg:grid-cols-3` inventory layout even though only one Flow remained. The card therefore occupied one column and left most of the 1024px canvas empty. Item detail also stayed below the outline, so wide screens did not gain a stable inspection pane.

## Change

1. A selected Flow now spans the full grid.
2. The shared whole-Flow outline opens detail inline only on mobile.
3. Wide view renders the active item in a right detail pane; its completion remains owned by the outline row.
4. When more than one Flow exists, the Flow rail appears from the `lg` breakpoint and the duplicate select is hidden.
5. With no selected item, the right pane shows the next actionable row and whole-Flow progress instead of an empty placeholder.

## Browser Evidence

- `390 x 844`: post-save whole Flow, returning outline, completion cancel.
- `1024 x 768`: single Flow outline/detail and two-Flow rail/outline/detail.
- Bounding-box assertions prove rail x < outline x < detail x.
- Selected Flow width exceeds 700px at 1024px.
- Wide inline detail count is `0`; detail-pane completion-control count is `0`.
- Horizontal overflow is `0` in all targeted scenarios.

## Residual Risk

- The detail editor remains functionally dense; P25-03 owns progressive disclosure.
- The global header and mobile bottom navigation still use the older visual system; P25-06/07 owns shared visual cleanup.
- No real participant has evaluated the pane model.
