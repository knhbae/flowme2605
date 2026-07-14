# QA

## Audit Quality

- Capability status is grounded in current code or a reproduced route state.
- Missing, hidden, partial, and supported are not conflated.
- Screenshots use the same fixture and scenario IDs as machine-readable matrices.
- Automated evidence and observed-user evidence are labeled separately.

## Product Invariants

- Four-tab IA remains unchanged.
- Public `/f` remains a save-first share shell.
- Studio remains a secondary surface.
- Source content is immutable from personal editing.
- My Flow, Calendar, and exports read the same effective personal state.
- Internal review terms do not appear on normal user routes.

## Required Viewports

- Mobile: 390px.
- Wide: 1024px.
- Horizontal overflow: zero for reviewed normal routes.

## Required Regression Lanes

- Unit tests for state and projection rules.
- Targeted `flow-mvp` E2E for edited lifecycle states.
- URL-first user-surface regression.
- Public share CTA and workbench regression.
- Production build and documentation check.
- Browser screenshots for every changed user-facing slice.

## Observed-User Gate

- Five participants, three sessions each.
- At least four of five complete each core task without instruction.
- Completion, date, and export state errors are zero.
- Any Blocking or High issue is corrected and re-observed.
