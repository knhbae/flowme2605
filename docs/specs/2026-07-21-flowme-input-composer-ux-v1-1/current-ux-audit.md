# Current UX Audit

## 1. Method and boundary

The current v1 HTML was operated in a real browser at 1440x900 and 390x844. All eight frozen cases were switched, their creator/user stages were opened, conditional inputs were exercised, long rows were expanded, dates and task state were changed, and DOM accessibility/overflow/localStorage were inspected.

Evidence labels:

- `current_prototype_interaction`: directly operated v1 HTML
- `current_prototype_source`: v1 HTML/JS and frozen scenario JSON
- `repo_rule`: current Flow quality, taxonomy, copy, My Flow/Calendar rules
- `heuristic`: expert inference, not observed-user validation

## 2. Executive finding

The v1 prototype has a viable foundation: the 3-column workbench, source scope, source-specific Items, and natural artifact judgment are worth preserving. It is not yet an end-to-end product journey. The active surface stops at preview, asks users to understand input modes and content roles too early, exposes unavailable projections, and has no export/save receipt or return location.

The correct v1.1 move is structural refinement, not visual replacement.

## 3. Findings

### Blocking

#### B-01. The journey ends at preview

- Route/cases: all executable cases
- Viewport: 1440 and 390
- Reproduction: select a case, enter or accept required input, inspect the right column
- Expected: concrete artifact action, scope/count preview, success receipt, and return destination
- Actual: the primary action is usually `결과 미리보기` even though the result is already visible; there is no external copy/download or My Flow save completion state
- Impact: no complete source -> result -> use path can be evaluated
- Evidence: `current_prototype_interaction`, `current_prototype_source`
- Resolution: replace preview CTA with case-specific outcome CTA and add `exported` / `saved_to_my_flow` states

### High

#### H-01. Input method is a prerequisite concept

- Route/cases: all; especially quick line, multiline, URL
- Viewport: 1440 and 390
- Reproduction: start at top of workbench
- Expected: paste/type first, then verify detected kind
- Actual: four route buttons appear before the composer and before all eight case buttons
- Impact: users can choose the wrong route and mobile/keyboard focus is spent on routing rather than outcome
- Evidence: `current_prototype_interaction`
- Resolution: unified text composer for line/multiline/URL; keep structured table import as auxiliary

#### H-02. Creator and final-user stages are switchable modes on one surface

- Route/cases: all
- Viewport: 1440 and 390
- Reproduction: toggle `콘텐츠 만들기` / `내 것으로 쓰기`
- Expected: journey role is inferred from entry and writes to a distinct layer
- Actual: both modes are always available, use the same screen, and have no selection semantics (`aria-pressed`/tab state)
- Impact: users may interpret source editing and personal values as equivalent operations
- Evidence: `current_prototype_interaction`, `current_prototype_source`, `repo_rule`
- Resolution: split after source scope; published Flow discovery opens consumer preview directly

#### H-03. Mobile defers the useful result too far

- Route/cases: all; measured with moving and Todoist
- Viewport: 390x844
- Reproduction: load, choose a case, remain at scroll top
- Expected: input and useful result summary in first viewport or one short continuation
- Actual: route rail, case rail, title, source block, inputs, source-derived list, and journey precede preview; Todoist preview starts about 1,000px below the viewport
- Impact: users cannot judge result quality before committing attention
- Evidence: `current_prototype_interaction`
- Resolution: compact scenario selector, composer, and artifact summary first; source details collapsed below

#### H-04. Unavailable artifacts look interactive

- Route/cases: all; most severe for heat and Todoist
- Viewport: 1440 and 390
- Reproduction: inspect/click five artifact buttons
- Expected: unavailable projections omitted or disabled with a reason
- Actual: all five buttons remain enabled; even every blocked artifact in boundary cases is clickable
- Impact: output policy is harder to predict and a blocked source appears closer to export than it is
- Evidence: `current_prototype_interaction`, `current_prototype_source`
- Resolution: one primary result, up to two eligible alternatives, no empty tabs

#### H-05. LibriVox `현재 장` control does not select a chapter

- Route/case: IC-C03-LIBRIVOX
- Viewport: 1440
- Reproduction: switch to `내 것으로 쓰기`, open later values
- Expected: choose chapter 1..38, then optionally record playback position
- Actual: control label is `현재 장`, but options are `미시작/진행 중/완료`
- Impact: the defining resource-queue position cannot be expressed
- Evidence: `current_prototype_interaction`, `current_prototype_source`
- Resolution: chapter picker/search + current chapter status + position field

#### H-06. Long Sheet lacks orientation

- Route/cases: K-MOOC 14, LibriVox 38
- Viewport: 1440 and 390
- Reproduction: expand all rows
- Expected: current position, search, progress summary, collapsed completed rows
- Actual: only `모두 펼치기` and row status controls exist
- Impact: resource queue/progress use becomes scan-heavy, particularly on mobile
- Evidence: `current_prototype_interaction`, `heuristic`
- Resolution: current-row pin, search, progress filter, resume action

### Medium

#### M-01. Primary copy describes an already visible state

- Cases: six executable cases
- Actual: `결과 미리보기` is shown beside a live preview
- Impact: action consequence is ambiguous
- Evidence: `current_prototype_interaction`, `repo_rule`
- Resolution: use count and destination in CTA

#### M-02. No visible draft recovery or source-update reconciliation

- Cases: all
- Actual: localStorage keeps values/progress, but reload gives no recovery message; source version change is not modeled
- Impact: users cannot tell whether a draft was restored or whether personal changes are safe
- Evidence: `current_prototype_interaction`, `current_prototype_source`
- Resolution: `draft restored` feedback and `source_updated` compare state

#### M-03. Selection controls lack programmatic state

- Cases: stage switch, artifact switch, passport route, AC choice
- Actual: button styling carries selection; no `aria-pressed`, `aria-selected`, or radio semantics
- Impact: assistive technology cannot reliably identify current choice
- Evidence: `current_prototype_interaction`
- Resolution: segmented radio/pressed controls and true tabs only when content is genuinely tabbed

#### M-04. Some controls have accessible-name gaps

- Cases: washer trigger, Todoist recovery sample/import
- Actual: DOM audit found visible controls without reliable accessible names
- Impact: keyboard users can reach controls but may not know purpose
- Evidence: `current_prototype_interaction`
- Resolution: explicit labels, described-by messages, named file action

#### M-05. Moving checklist completion copy is generic

- Case: moving, Checklist projection
- Actual: several items use `{title} 처리를 마쳤다`
- Impact: a checklist is portable but completion is not decision-grade
- Evidence: `current_prototype_interaction`, `repo_rule`
- Resolution: retain source-specific completion where available; otherwise mark editorial improvement rather than imply precision

#### M-06. User-stage help can contradict a block

- Case: heat
- Actual: user stage says the result can be started immediately while safety review blocks export and personal preview
- Impact: trust boundary is weakened
- Evidence: `current_prototype_interaction`
- Resolution: state-specific help and no consumer stage until approval

### Low

#### L-01. Raw source URLs dominate narrow cards

- Cases: all URL-backed cases
- Impact: source is trustworthy but visually noisy
- Evidence: `current_prototype_interaction`
- Resolution: domain + source title, full URL in details

#### L-02. Missing favicon creates one console error

- Route: local static HTML
- Impact: no user-facing failure; QA noise only
- Evidence: `current_prototype_interaction`
- Resolution: data URL favicon in v1.1 HTML

## 4. Eight-case interaction inventory

| Case | First seen | First action | Inputs before first result | Source-filled | User-owned | Editable | Default result | External action now | Return now | Main risk |
|---|---|---|---:|---|---|---|---|---|---|---|
| Moving | source scope + date + 24-item preview | set/accept moving date | 2 total, 1 user | 6 rows, 24 Items, relative offsets | moving date | date, later completion | Calendar | missing | missing | preview CTA is redundant |
| K-MOOC | file control + 14-row Sheet | import frozen table | 1 creator | 14 weeks, topics, activities | current state/note | row status | Sheet | missing | missing | long list and role split |
| LibriVox | file control + 38-row Sheet | import chapter table | 1 creator | chapter order/title/duration | current chapter/position | mislabeled current control | Sheet | missing | missing | cannot select chapter |
| Passport | pasted source + 6 Todo | paste/confirm rows | 1 creator | requirements, warnings | visit/online, place | route/place | Todo | missing | missing | route hidden after preview |
| Washer | typed query + condition Todo | accept query/existing Flow | 1 user | trigger, 4 tasks, warning | alert occurrence | trigger/completion | Todo | missing | missing | could be mistaken for routine |
| AC | comparison rows + Memo | paste/confirm rows | 1 creator | service differences/contact | choice, quote | choice/quote | Memo | missing | missing | secondary outputs unexplained |
| Heat | source scope + condition cards | inspect read scope | 1 creator | 10 rows, 2 Items, 3 responses | none | none | blocked review | missing by policy | missing | blocked tabs still enabled |
| Todoist | metadata-only boundary | inspect/import source | 1 creator | phase names only | authorized file | recovery file | no artifact | source import only in details | missing | fake-flow avoidance is good but recovery is hidden |

## 5. Rubric score (1-5)

| Case | Need Fit | Execution | Fidelity | Portability | Cognitive Load | Copy | Source/Safety | A11y | Avg |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Moving | 4 | 4 | 4 | 2 | 3 | 3 | 4 | 3 | 3.38 |
| K-MOOC | 5 | 4 | 5 | 3 | 3 | 4 | 4 | 3 | 3.88 |
| LibriVox | 5 | 3 | 5 | 3 | 3 | 4 | 4 | 3 | 3.75 |
| Passport | 4 | 4 | 5 | 3 | 3 | 4 | 5 | 3 | 3.88 |
| Washer | 5 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 4.00 |
| AC | 5 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 4.00 |
| Heat | 5 | 3 | 5 | 1 | 3 | 4 | 5 | 3 | 3.63 |
| Todoist | 5 | 2 | 5 | 1 | 3 | 4 | 5 | 3 | 3.50 |

Interpretation:

- strongest: source-specific need fit and fidelity
- weakest: portability because the lab stops before handoff
- next weakest: operability semantics and mobile cognitive order

## 6. Keep / Change / Remove / Defer

### Keep

- 3-column workbench on wide screens
- actual source-backed Items and artifact previews
- source scope status and boundary honesty
- progressive fields such as passport location after visit choice
- source vs personal value summary

### Change

- route selection -> input detection
- stage toggle -> entry-aware role lane
- five tabs -> recommended result + eligible alternatives
- generic preview CTA -> destination/count CTA
- mobile order -> composer + result before source detail
- Sheet expand-only -> resume/search/filter

### Remove

- clickable unavailable artifact tabs
- consumer-facing creator controls
- user-facing internal taxonomy/backend labels
- generic `저장/실행/내보내기` without object/scope

### Defer

- real crawler/provider
- direct Calendar/Todo/Notion/Obsidian API
- account/server sync
- source-update merge implementation
- rights/safety approval operations
