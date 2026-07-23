# QA Plan and Evidence

> This file records deterministic prototype and repository checks. It does not claim observed-user validation.

## 1. Baseline evidence

Environment:

- Browser: Playwright Chromium via local static server
- Desktop: 1440x900
- Mobile: 390x844
- Source: `2026-07-20-flowme-input-composer-lab-v1-ko.html`

Observed baseline:

- document horizontal overflow: 0px at 1440 and 390
- console: application error 0, missing favicon request 1
- mobile: preview begins roughly 1,000px below viewport in blocked case
- keyboard: 4 route buttons + 8 case buttons precede composer controls
- artifact buttons: not-applicable/blocked buttons remain enabled
- stage switch: no `aria-pressed` or tab semantics
- washer trigger checkbox and Todoist recovery controls contain accessible-name gaps in DOM audit
- localStorage persists input values and progress, but there is no visible recovery receipt

Baseline screenshots:

- `output/playwright/input-composer-ux-v1-1/baseline/v1-desktop-moving.png`
- `output/playwright/input-composer-ux-v1-1/baseline/v1-desktop-kmooc-user-expanded.png`
- `output/playwright/input-composer-ux-v1-1/baseline/v1-desktop-todoist-blocked.png`
- `output/playwright/input-composer-ux-v1-1/baseline/v1-mobile-moving.png`
- `output/playwright/input-composer-ux-v1-1/baseline/v1-mobile-kmooc.png`
- `output/playwright/input-composer-ux-v1-1/baseline/v1-mobile-todoist-blocked.png`

## 2. Prototype checks

### Contract

- state JSON parses and contains exactly 18 unique states
- every state has title, description, one primary action or explicit no-action reason, secondary action list, editable values, next state, back/cancel, persisted data, hidden internal data
- case matrix contains exactly 8 unique cases
- every case has source, input, Item, primary artifact or blocked reason, export/save path
- alternative JSON includes A/B metrics and final recommendation

### Interaction

- case switch updates source, user values, Item preview, artifact, and action
- current/improved switch changes interaction model, not only styling
- unified composer can simulate typing -> detecting -> found/proposal/blocked
- format can be corrected without losing input
- source scope can be opened and confirmed
- conditional user fields appear only when their prerequisite is selected
- export shows format, scope, count, and receipt
- save shows destination and return action
- provider/retry state keeps the draft
- source update state preserves user overlay and requests reconciliation

### Visual/responsive

- no document horizontal overflow at 1440x900 and 390x844
- primary action count in the active work surface is <= 1
- mobile first viewport contains input and useful result summary
- long Sheet has search/current-position/expand controls
- blocked state omits artifact tabs and provides a recovery action
- focus ring is visible
- controls have programmatic labels or names

## 3. Browser run record

| Check | Result | Evidence |
|---|---|---|
| Desktop 8-case smoke | pass, 8/8 | result title, case-specific primary action, state transition |
| Mobile 8-case smoke | pass, 8/8 | useful-result card and primary action within 844px viewport |
| Keyboard/focus | pass | first focus is `입력으로 건너뛰기`; Enter focuses `#unifiedInput` |
| Accessible names | pass | 0 unnamed visible controls across 8 proposed cases |
| Overflow | pass | document/workbench horizontal overflow 0px at 1440 and 390 |
| Console/page error | pass | 0 errors, 0 warnings; data URL favicon |
| JSON consistency | pass | 18/18 unique states, 8/8 unique cases, 2 alternatives |
| HTML script syntax | pass | 1 inline script compiled with `new Function` |
| docs:check | pass | 14 required files, 2447 local links |

Detailed interaction results:

- desktop first screen: all eight cases exposed exactly one in-viewport primary action
- mobile first screen: result card top 669-689px, bottom 787-807px within 390x844
- six executable cases: `existing_flow_found -> personalized -> exported/saved_to_my_flow` passed
- Moving: date change, title override, personal note, exclusion, Calendar projection, and count changed together
- K-MOOC: current completed week 4 pinned week 5 as next; one current row
- LibriVox: chapter picker contained 38 chapters; chapter 7 and `00:04:12` pinned correctly
- Passport: visit selection revealed one location field and updated Todo context
- Washer: trigger started one run while monthly Calendar/ICS remained prohibited
- AC: choice and quote appeared in Memo
- Heat: safety review state showed condition cards and no artifact alternatives
- Todoist: source import required showed 0 invented Items and an authorized-file action

Final screenshots:

- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-current-moving.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-moving.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-side-by-side.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-kmooc-personalized.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-todoist-source-import.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-desktop-export-receipt.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-mobile-moving.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-mobile-kmooc.png`
- `output/playwright/input-composer-ux-v1-1/final/v11-mobile-todoist-source-import.png`

## 4. Iteration record

### Iteration 1

- Preserved the v1 visual language and 3-column workbench.
- Added unified composer, recommended artifact, source scope, personal fields, state simulator, and receipts.
- Found that desktop action dock and mobile result were below the first viewport.

### Iteration 2

- Fixed desktop workbench height and internal artifact scrolling so the primary action remains visible.
- Added mobile result card immediately after input.
- Demoted `입력 다시 확인` after detection so only one first-screen primary action competes.
- Found projection inconsistency when an Item was excluded.

### Iteration 3

- Applied include/exclude, title override, and note overlay to Calendar/Sheet/Todo projections.
- Added skip-to-input keyboard navigation and separated state feedback from state title.
- Replaced the mobile horizontal case rail with one case picker.
- Re-ran 8-case, 18-state, accessibility, overflow, console, syntax, and docs checks.

## 5. Claim boundary

Passing this QA means the frozen prototype is internally coherent and operable in the tested browser sizes. It does not establish production provider behavior, crawler fidelity, rights approval, safety approval, external integration success, or observed-user usability.
