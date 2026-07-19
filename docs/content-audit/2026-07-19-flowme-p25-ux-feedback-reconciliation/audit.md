# P25 UX Feedback Reconciliation Audit

## Overall Assessment

The owner's dissatisfaction is justified. The product is not failing because it lacks another button or visual polish pass. It is failing to present one consistent mental model across save, adjustment, whole-Flow inspection, execution, scheduling, and export.

P24 solved useful mechanics, but its final frame still behaves like several partially connected products:

- a public artifact preview,
- a Today-oriented task list,
- a Flow-card inventory,
- a Calendar with an appended undated tray,
- and an advanced personal editor.

P25 should make those surfaces projections of the same personal Flow workspace.

## Input Evidence

| Input | Evidence kind | Strength | Limitation |
| --- | --- | --- | --- |
| Owner feedback in this task | `owner_feedback` | Direct product direction and acceptance signal | One owner, not a usability sample |
| Codex P25 HTML | `current_production_interaction`, `current_source`, `heuristic_simulation` | Finds concrete count/date/parser/IA defects | Automated/simulated, not observed use |
| Claude Design ZIP | `heuristic_design_review`, screenshots | Strong visual hierarchy and responsive critique | Some editor paths were not independently exercised |
| Official product docs | `official_reference` | Establishes tested interaction conventions | Patterns cannot be copied without FlowMe's model |

## Convergence

### 1. The whole Flow is not the stable center

- **Owner:** the save result and full Flow view remain unsatisfying.
- **Codex:** personal Flow name, child Flow, Today, and `전체` compete; some views truncate.
- **Claude:** post-save paths and wide My Flow are weak; the full program is not the persistent workspace.

**Decision:** The saved whole Flow is the primary object. Today, Calendar, and exports are projections. First-save confirmation and returning Flow view use one component and one effective item list.

### 2. Undated work is a hidden implementation state

- **Owner:** cannot tell how an undated task is meant to be used.
- **Codex:** the Calendar tray is conceptually useful but visually misplaced and hard to use.
- **Claude:** tray order, mobile overlap, and CTA placement make the state feel accidental.

**Decision:** An undated actionable item is `언제든 할 일`, not incomplete calendar data. It remains executable without a date. Calendar offers an explicit placement queue; it does not own the item.

### 3. Adjustment exposes schema instead of intent

- **Owner:** adjustment feels roughly made and insufficiently based on user needs.
- **Codex:** an item editor can show seven inputs and twenty buttons.
- **Claude:** progressive editor and a lightweight item row/detail sheet are needed.

**Decision:** Common adjustment is title, date/Anytime state, and note. Time/duration/recurrence are progressive. Multiple-item operations are a separate selection mode with affected-count preview.

### 4. Visual polishing cannot precede correctness

- **Codex:** monthly recurrence produces incompatible dates/counts across preview, Calendar, and export; memo splitting can invent filler.
- **Claude:** visible completion, public duplication, responsive hierarchy, and copy density are the top visual problems.

**Decision:** P25-00B may prototype the future layout, but runtime implementation first closes canonical projection and input integrity. Then the workspace is built on trusted counts and identities.

## Conflicts And Resolution

| Question | Codex emphasis | Claude emphasis | Resolution |
| --- | --- | --- | --- |
| First implementation | Canonical projection/recurrence | Completion and public layout | Fix correctness first; prototype UX in parallel without runtime changes |
| Undated model | Queue beside Calendar | Bottom sheet/order cleanup | Define it as an active My Flow state; Calendar only places it on dates |
| Wide layout | Three-pane workspace | Two-column/desktop correction | Use a responsive three-region model that may collapse to two visible panes depending on context |
| Public adjustment | Source preview correctness | One representation and reduced copy | One artifact preview with include semantics; deeper editing after personal save |
| My Flow tabs | `지금 / Flow / 완료` | Visible completion/reopen | Prototype the three-view local IA in P25-00B before committing labels |

## Official Reference Findings

### Things

Things separates work by when it should come to attention: Today, Upcoming, Anytime, and Someday. Clearing a schedule returns an item to Anytime. The reusable principle is not the exact tab set; it is that an undated task can remain active and visible without being a calendar event.

### Structured

Structured separates an inbox for unscheduled tasks from a daily timeline and supports drag/drop, replan, and undo. FlowMe should adopt the inbox-to-schedule boundary, but start with explicit controls and batch placement rather than making drag/drop a prerequisite.

### Google Calendar and Tasks

Google documents that tasks need a date to appear on the Calendar and exposes task lists/pending tasks separately. It also distinguishes start date/time, deadline, and duration. FlowMe should keep Calendar dated-only while preserving the task in My Flow.

### Todoist

Todoist uses one row-level completion circle, immediate undo, and a completed-task view for later uncompletion. The limitation around old recurring occurrences reinforces why FlowMe must explicitly model series and occurrence rather than copying generic task completion.

### Notion

Notion lets users duplicate a public page into a private editable workspace and render the same data through list, table, timeline, and Calendar views. FlowMe should adopt the source-copy boundary and shared-data/multiple-view principle, not the unlimited property/editor surface.

### Wanderlog

Wanderlog separates guides, lists, reservations/documents, and daily itinerary, and supports moving multiple places. FlowMe should similarly distinguish source/reference, whole Flow structure, schedule, and batch adjustment.

## Proposed Core Screens

### Save-before

```text
[Flow title] [source]
[one complete artifact preview]
[include/exclude summary]

[그대로 저장] [조정]
[source/caution disclosure]
```

### Post-save / whole Flow

```text
[personal Flow name] [saved]
[section 1] 3 items
  [ ] actual task          Aug 15
  [ ] actual task          Anytime
[section 2] 2 items

[시작] [조정] [가져가기]
```

### My Flow

```text
지금 | Flow | 완료

지금: one row per actionable item/occurrence
Flow: complete saved artifacts and structure
완료: persistent history and reopen
```

### Calendar

```text
wide:  [일정에 놓기 queue] [month/week grid] [selected-day agenda]
mobile:[grid/agenda] -> [일정에 놓기 drawer]
```

An Anytime item has `오늘`, `날짜 선택`, and `그대로 두기`. The control communicates the model; a paragraph does not.

### Item adjustment

```text
title
when: Anytime | date
note

세부 일정 > time / duration / recurrence
source/details > read-only disclosure
```

Selection mode is separate:

```text
3 selected
[날짜 이동] [날짜 지우기] [포함/제외] [가져가기]
```

## Copy Reduction Rule

Remove copy that merely narrates visible UI. Keep text only when it does one of these jobs:

1. defines a non-obvious anchor or consequence;
2. communicates safety/source limits;
3. previews the result of a destructive or batch action;
4. explains why an action is unavailable.

The moving page does not need three paragraphs saying that one moving date creates a D-30 plan if the date field, timeline preview, and item labels already show that. One short anchor hint near the input is sufficient.

## Risks

### Data risk

Source-backed personal structural editing must remain an overlay. A visible full editor must not mutate source items or weaken source-version review.

### Product risk

`언제든 할 일` and `일정 대기` express different jobs. P25-00B must test which label belongs in My Flow and which belongs in Calendar; do not expose both as interchangeable global states.

### Scope risk

Adding every familiar planner control would recreate Notion/Todoist/Calendar complexity. P25 only adds controls needed to personalize a converted Flow and move it to execution destinations.

### Evidence risk

P25 internal simulations can catch parity and hierarchy defects, but cannot prove first-use comprehension. Observation remains explicitly deferred until the owner judges the redesigned frame ready.

## Recommendation

Start with P25-00B, not a production component patch. The immediate deliverable is a current/proposed screen decision package. After owner selection, P25-01A fixes projection truth before the first runtime workspace slice.
