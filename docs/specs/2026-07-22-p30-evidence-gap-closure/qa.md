# P30 Evidence Gap Closure QA

## Evidence Taxonomy

Every result records one or more kinds:

- `current_command`
- `current_local_browser`
- `current_production_interaction`
- `current_package_screenshot`
- `current_source`
- `prior_artifact`
- `heuristic_simulation`
- `observed_user`
- `inaccessible`

Only `observed_user` counts as actual user observation. P30 automated closeout must report observed-user count `0` unless a separate, explicit observation study occurred.

## Required Viewports

| Viewport | Purpose |
| --- | --- |
| `390x844` | mobile fixed layers, bottom nav, long adjustment, sheets, focus order |
| `1024x768` | wide workspace, Calendar month identity, rail/canvas/inspector |
| `1440x900` | desktop max-width, hierarchy, unintended stretching |

## Nested-State Matrix

| Surface | Required states | Core assertions |
| --- | --- | --- |
| Public `/f/moving-d30-basic` | save-before, adjust, export preflight, saved receipt | primary <= 1, fixed/export intersection 0, focus restored, count parity |
| My Flow | library, detail, export closed/open, selected/current/whole receipt, overflow open | next action dominant, bottom-nav intersection 0, overflow focus return |
| Calendar | default, scope picker, 50+ search, selected day, undated sheet, batch place, undo | grouped scope, internal scroll, full identity in agenda, focus trap/return |
| Routine | summary, advanced, next 3 occurrences, one occurrence done/reopened | definition/run separation, no duplicate completion control |
| Cross-surface | same Flow in save receipt/My Flow/Calendar/export | stable Flow/item/occurrence/export identity and count parity |

## Geometry Assertions

Initial route overflow checks are insufficient. Measure each expanded nested state.

For every fixed/sticky layer and primary action:

```text
intersectionWidth  = max(0, min(a.right, b.right) - max(a.left, b.left))
intersectionHeight = max(0, min(a.bottom, b.bottom) - max(a.top, b.top))
intersectionArea   = intersectionWidth * intersectionHeight
```

Acceptance:

- fixed layer x primary action `intersectionArea = 0`
- horizontal page overflow `scrollWidth - clientWidth <= 1`
- internal sheet scroll is measured separately and is allowed when intentional
- fixed UI does not cover the focused element after `scrollIntoView`

## Keyboard And Accessibility Sequence

### Mobile route order

1. brand or skip link
2. auxiliary menu trigger
3. current page heading/main region
4. current page primary and contextual controls
5. remaining document content
6. persistent 4-tab navigation

The exact number of focusable controls may vary, but the y-position must not jump from header to fixed bottom nav and back to main top content.

### Dialog/sheet/menu rules

- trigger exposes `aria-expanded` and appropriate `aria-haspopup`
- opening moves focus to heading, search, or first meaningful control
- Tab/Shift+Tab stays inside modal layers
- Escape closes when safe
- close/apply returns focus to the invoking trigger
- icon-only controls have accessible name and tooltip/title
- unnamed focusable count `0`

## Slice Verification

| Slice | Unit/component | Targeted E2E | Browser evidence | Production |
| --- | --- | --- | --- | --- |
| P30-01 | layer/clearance helper if extracted | public + My Flow export nested states | 390 before/after geometry | required before P30-02 |
| P30-02 | nav composition if helper exists | `/my`, `/calendar`, sheet/menu focus | keyboard sequence at 390 | required before Wave 2 |
| P30-03 | adjustment mode/summary tests | moving 24-item save-before | 390/1024 current-proposed | after merge |
| P30-04 | action VM/overflow presentation tests | 1/20/50 Flow detail | 390/1024 hierarchy | after merge |
| P30-05 | scope grouping/compact label tests | 50+ scope + 10->2->undo | 390/1024 Calendar | after merge |
| P30-06 | routine presentation matrix | none/until/count summary/advanced | 390/1024 only if implemented | after merge |
| P30-07 | consumer inventory + no-diff tests | five-shape/public routes | 390/1024 no visual regression | after merge |
| P30-08 | full regression | full relevant E2E | 390/1024/1440 package | canonical production |

## Required Screenshots

### P30-01

- `p30-01-public-export-open-390.png`
- `p30-01-my-flow-export-open-390.png`
- `p30-01-public-export-open-1024.png`
- `p30-01-my-flow-export-open-1024.png`

### P30-02

- `p30-02-my-flow-focus-order-390.png`
- `p30-02-calendar-focus-order-390.png`
- focus sequence JSON with selector, accessible name, DOM index, rect

### P30-03

- `p30-03-moving-decision-390.png`
- `p30-03-moving-adjust-summary-390.png`
- `p30-03-moving-item-selection-390.png`
- `p30-03-moving-adjust-1024.png`

### P30-04

- `p30-04-my-flow-detail-390.png`
- `p30-04-my-flow-overflow-390.png`
- `p30-04-my-flow-workspace-1024.png`

### P30-05

- `p30-05-calendar-scope-50-390.png`
- `p30-05-calendar-undated-390.png`
- `p30-05-calendar-placed-undo-390.png`
- `p30-05-calendar-month-identity-1024.png`
- `p30-05-calendar-selected-day-1024.png`

### P30-06/P30-07/P30-08

- routine summary/advanced at 390/1024 if P30-06 changes
- reviewed five-shape no-diff set for P30-07
- complete production manifest at 390/1024/1440 for P30-08

## Required Commands

Use the repo scripts current at implementation time. Minimum:

```powershell
npm.cmd ci
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- <targeted spec/options>
git diff --check
```

- Run full E2E for P30-01, P30-02, P30-07, and P30-08 because they affect shared layout or navigation.
- P30-03~06 may start targeted but must run affected legacy/P29 regression files.
- Do not report a previous run as current evidence.

## Release Gate Metrics

| Metric | Target |
| --- | ---: |
| fixed-primary intersection count | `0` |
| horizontal overflow count | `0` |
| fixed/sticky incoherent overlap count | `0` |
| unnamed focusable count | `0` |
| console/page error count | `0` |
| export predicted/actual count mismatch | `0` |
| source mutation count | `0` |
| personal overlay identity loss | `0` |
| occurrence identity change from presentation edit | `0` |
| P29 marker regression | `0` |
| observed-user sessions claimed by automation | `0` |

## Current Planning QA

| Check | Result | Evidence |
| --- | --- | --- |
| App/runtime code changed | Pass: no | planning worktree status contains only `docs/` paths |
| Claude/Codex findings reconciled | Pass | [feedback-reconciliation.md](./feedback-reconciliation.md) |
| `npm.cmd run docs:check` | Pass | 14 required files, 2,902 local links |
| `git diff --check` | Pass with repository line-ending notices | no whitespace error; PowerShell reported existing LF-to-CRLF conversion notices for edited tracked docs |
