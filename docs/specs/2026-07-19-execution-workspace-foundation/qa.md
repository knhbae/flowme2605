# P25 Execution Workspace Foundation QA

## Evidence Rules

- Owner feedback is high-confidence product-direction evidence, not usability statistics.
- Codex and Claude findings are independent automated/heuristic reviews, not observed-user sessions.
- Prior screenshots establish a comparison baseline only.
- Every implementation slice must report current command and browser results separately.

## Slice Gates

| Slice | Required proof |
| --- | --- |
| P25-00B | Current/proposed wireframes at 390/1024, six Flow-shape simulations, owner decision log |
| P25-01 | Projection fixtures, recurrence identity/count parity, no invented items, destination parity E2E |
| P25-02 | Whole Flow visible without truncation, item reachability, mobile/wide workspace screenshots |
| P25-03 | Common edit depth, advanced field collapse, batch impact preview, overlay/source invariants |
| P25-04 | Undated find/execute/schedule/clear paths, Calendar membership parity, accessibility labels |
| P25-05 | Immediate undo, persistent reopen, recurrence scope, export scope/count parity |
| P25-06/07 | Copy-density count, one public representation, responsive shared states, visual regression |
| P25-08 | Six integrated journeys, Blocking/High zero, owner readiness decision |

## Representative Scenarios

1. **Moving:** save five tasks, exclude one, move anchor, override one date, batch move selected tasks, export all.
2. **Vehicle checklist:** save ten undated tasks, complete one undated, schedule selected tasks, clear one date, export selected/all.
3. **Routine:** preview monthly occurrences, complete/reopen one occurrence, compare Calendar/ICS and next occurrence.
4. **Trip/project:** inspect grouped whole Flow, reorder, batch schedule, keep reference notes separate.
5. **Record flow:** keep memo/record fields progressive and export readable history.
6. **Personal draft:** parse a comma/list memo, confirm splits, add/delete/restore/reorder, schedule, export.

## Accessibility And Visual Checks

- Every item action includes the effective item title in its accessible name.
- Preview include controls and execution complete controls have distinct role/name.
- Keyboard users can complete, reopen, open detail, edit, select, move date, clear date, and export.
- Mobile controls do not collide with bottom navigation or sticky actions.
- Wide layouts use available space without long stretched mobile cards.
- Horizontal overflow and incoherent overlap are zero at 390x844 and 1024x768.
- Color is never the sole Flow, status, or selection signal.

## Required Checks For This Planning Slice

| Check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run docs:check` | Pass | 14 required files, 2410 local links |
| `git diff --check` | Pass | No whitespace errors after the planning diff was finalized |
| HTML workboard 390px | Pass | 390px document width, horizontal overflow 0, console errors 0 |
| HTML workboard 1024px | Pass | 1024px document width, horizontal overflow 0, console errors 0 |
| App runtime tests | Not required | Planning-only; app code and schemas must be unchanged |

## Stop Conditions

- Do not implement P25-02 UI before P25-00B owner approval.
- Do not visually redesign recurrence output while P25-01 parity is failing.
- Do not expose more editor fields to solve discoverability.
- Do not start external-user recruitment during P25.
- Do not merge multiple unverified slices into one broad PR.
