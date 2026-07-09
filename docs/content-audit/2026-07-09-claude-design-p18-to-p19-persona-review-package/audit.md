# P18 -> P19 Persona Review Audit

## Source

This handoff uses the latest P18 final evidence package:

- `docs/content-audit/2026-07-09-claude-design-p18-final-review-package/README.md`
- `docs/content-audit/2026-07-09-claude-design-p18-final-review-package/route-evidence.json`
- `docs/content-audit/2026-07-09-claude-design-p18-final-review-package/screenshots/`

The screenshots were copied here so Claude Design can review this folder without jumping between packages.

## What Changed Through P18

- Calendar now distinguishes multiple saved Flows on the same date by Flow marker/group.
- My Flow today area uses one frame, one remaining-count source, and inline completion controls.
- Public `/f` keeps save/setup as the primary path and moves export into a Flow-level secondary area.
- Calendar and My Flow role language was separated: Calendar is date-first, My Flow is task-first.
- URL-first personal overlay now supports user-specific title/date/memo changes after save.
- Moving Flow uses `이사일`/anchor-date copy instead of generic `시작일` where possible.
- URL-first miss has a draft-preparation gate, not a fake live AI generator.

## User Feedback To Preserve In Review

These points should guide Claude Design's P19 backlog:

1. Calendar still needs a product-quality judgment:
   - Are Flow colors/markers enough?
   - Do multiple Flows on the same date feel clean?
   - Is `1/5` or similar progress useful in Calendar, or unnecessary detail?

2. My Flow needs an execution-depth judgment:
   - Today's tasks are visible, but is the action model consistent?
   - Does the mix of checkbox, completion button, open action, and progress count feel clear?
   - Is `1/5`, `2/5` meaningful to users, or should progress move lower?

3. Public `/f` needs stronger unit hierarchy judgment:
   - Is the user choosing "save the whole Flow" or "export this Flow" clearly?
   - Do item checkboxes look like preview/progress, or like item-level export/save?
   - Should Flow-level and item-level actions be separated more strongly?

4. URL-first needs product model judgment:
   - Hit/custom-start works, but is the edit freedom sufficient?
   - Should item-level date/title/memo editing move earlier, or stay after save?
   - Miss/draft gate is honest, but what is the right first AI-assisted draft slice?

5. Studio needs direction judgment:
   - Keep Studio/creator as secondary surface?
   - Build only a proposal/review flow first?
   - Or pause Studio until Calendar/My Flow/public save/export are stronger?

## Scenario Review Checklist

### 1. First-Time User

Screenshots:

- `01-home-mobile.png`
- `02-flows-mobile.png`
- `32-home-wide.png`
- `33-flows-wide.png`

Questions:

- Can the product be summarized in one sentence after seeing `/` and `/flows`?
- Does the user understand that FlowMe is not a generic todo app, but a URL/memo-to-execution tool?
- Is the next step obvious without reading long explanations?

### 2. URL-First Hit / Custom Start

Screenshots:

- `27-url-first-hit-mobile.png`
- `28-url-first-custom-start-mobile.png`
- `28b-url-first-moving-custom-start-mobile.png`
- `37-url-first-hit-wide.png`

Questions:

- Does hit state feel like "prepared Flow found"?
- Is `이사일`/anchor date clear enough?
- Is Step include/exclude enough before save, or too shallow for a platform direction?
- Is "save now, edit details later" understandable?

### 3. URL-First Miss / Candidate / Draft Gate

Screenshots:

- `29-url-first-miss-candidate-form-mobile.png`
- `30-url-first-candidate-detail-mobile.png`
- `38-url-first-candidate-detail-wide.png`

Questions:

- Does miss state avoid overpromising live AI?
- Does the user know what happens after "초안 요청 저장"?
- What should be the first AI draft implementation slice?

### 4. Public Share Recipient

Screenshots:

- `06-public-vehicle-mobile.png`
- `07-public-moving-mobile.png`
- `08-public-moving-bottom-mobile.png`
- `09-workbench-fridge-mobile.png`
- `10-workbench-washer-mobile.png`
- `11-workbench-new-car-mobile.png`
- `12-workbench-used-car-mobile.png`
- `25-workbench-new-car-open-details-mobile.png`
- `26-workbench-used-car-open-details-mobile.png`
- `35-public-vehicle-wide.png`

Questions:

- Is `내 Flow에 저장` unmistakably the primary route?
- Is export clearly Flow-level and secondary?
- Do item checkboxes help preview progress, or create unit confusion?

### 5. My Flow Repeat User

Screenshots:

- `13-post-save-my-moving-mobile.png`
- `13b-my-moving-personal-anchor-settings-mobile.png`
- `13c-my-moving-personal-step-date-override-mobile.png`
- `15-post-save-my-math-mobile.png`
- `16-my-multi-queue-mobile.png`
- `17-my-multi-queue-overdue-sheet-mobile.png`
- `18-my-long-list-top-mobile.png`
- `19-my-long-list-bottom-mobile.png`
- `20-my-long-list-inventory-bottom-mobile.png`
- `36-post-save-my-moving-wide.png`

Questions:

- Is today's work immediately actionable?
- Are inline completion controls consistent?
- Should progress counts be visible in every row, or moved into detail?
- Is whole-Flow anchor edit versus one-item date override clear?

### 6. Calendar-Heavy User

Screenshots:

- `14-calendar-after-moving-save-mobile.png`
- `43-calendar-same-date-multi-flow-mobile.png`
- `44-calendar-same-date-multi-flow-wide.png`

Questions:

- Does Calendar feel like a core date-based execution surface?
- Are multiple Flows on one date visually clean and distinguishable?
- Does agenda detail look too complex for a date screen?
- Should Calendar hide progress fractions and focus on task identity/action?

### 7. Creator / Studio Direction

Screenshots:

- `39-creator-profile-my-flow-studio-mobile.png`
- `40-creator-profile-my-flow-studio-wide.png`
- `41-creator-profile-flow-curation-team-mobile.png`
- `42-creator-profile-flow-curation-team-wide.png`

Questions:

- Should Studio remain a secondary route outside the 4-tab IA?
- Is the right first Studio path "AI proposes -> user reviews -> saves"?
- Should Studio wait until Calendar/My Flow/public unit clarity is stronger?

### 8. Prototype / Internal Gate

Screenshots:

- `21-restart-moving-top-mobile.png`
- `22-restart-moving-source-export-mobile.png`
- `23-restart-moving-bottom-mobile.png`
- `24-restart-moving-full-schedule-mobile.png`
- `31-flow-lab-url-first-p0-mobile.png`

Questions:

- Does `/restart/moving-d30` still look like a release-preview route?
- Is `/flow-lab/url-first-p0` clearly internal-console and not normal user IA?
- Are these routes properly excluded from normal user navigation?

## Evidence Summary To Cite

- Normal route internal copy hits: 0
- URL-first visible Markdown hits: 0
- Candidate user copy internal hits: 0
- Miss draft gate visible: true
- Miss draft gate implies live AI: false
- Calendar same-date distinct Flow groups: 2
- Calendar agenda grouped by Flow: true
- My Flow today frame count: 1
- My Flow today remaining-count sources: 1
- My Flow inline complete controls: 5
- Public sticky save/setup first actions: 9
- My Flow anchor edit entry visible: true
- Wide horizontal overflow: 0

## Requested P19 Output

Claude Design should return:

1. Overall product direction judgment.
2. Persona-by-persona findings.
3. P19 backlog grouped by Blocking / High / Medium / Low.
4. For each backlog item:
   - problem
   - route/screenshot evidence
   - expected user impact
   - recommended implementation scope
   - guardrail/evidence needed
5. A short recommendation on whether to prioritize Calendar/My Flow/public `/f` clarity before Studio/AI draft expansion.
