# FlowMe Platform Feature Planning From Reference Research

**Date:** 2026-06-24  
**Status:** Planning baseline, not user-validated  
**Related baseline:** [Source-backed Flow Map Productization Baseline](../2026-06-24-source-backed-flow-map-productization/spec.md)

## Why This Spec Exists

FlowMe has reached a usable internal baseline for three source-backed cases: middle-school math, baby health checkup/vaccination, and moving D-30. The next question is not whether FlowMe can make one small Flow. The next question is:

> Can FlowMe become a creator platform where outside content becomes a lightweight execution map, while the user's saved app still feels closer to calendar/todo than Jira or a full LMS?

This spec uses related service references to define the next product slices before implementation grows in the wrong direction.

## Reference Services Reviewed

The references were used for product pattern extraction, not for copying UI.

| Area | Services | Pattern observed | FlowMe implication |
| --- | --- | --- | --- |
| Project/work hierarchy | Jira, ClickUp, Asana | Large systems expose hierarchy and multiple views, but each item still needs a clear actionable unit. | FlowMe can keep `Flow Map > Flow > Step > Item` internally, but user screens should stay Step-first. |
| Calendar/task apps | Google Tasks/Calendar, Apple Reminders, Todoist, Trello | Due date, recurrence, subtasks/checklists, filters, and smart views are common. | A Flow Step should become a calendar/task-like unit with optional date/time/repeat/memo/URL. |
| Creator/course platforms | Thinkific, Moodle, Khan Academy | Creators manage chapters/lessons/source rows; learners see progress and completion criteria. | Creator source-row editing must be separate from My Flow execution. |
| Template/workspace tools | Notion, Trello, Airtable | Templates and buttons generate repeatable records, but complex workspaces can become heavy. | FlowMe should generate artifacts from source content, not become a blank database builder. |

### External Source Notes

- Asana documents list/board/calendar/timeline project views and recommends timeline for dependencies and calendar for simple date visibility: <https://asana.com/features/project-management/project-views>
- Atlassian describes Jira epics, stories, and tasks as a hierarchy for organizing and tracking work: <https://www.atlassian.com/agile/project-management/epics-stories-themes>
- ClickUp documents a deep Workspace/Space/Folder/List/Task/Subtask hierarchy: <https://help.clickup.com/hc/en-us/articles/13856392825367-Intro-to-the-Hierarchy>
- Trello cards can have checklists, checklist progress, checklist due dates, calendar views, and conversion of checklist items into cards: <https://support.atlassian.com/trello/docs/adding-checklists-to-cards/> and <https://support.atlassian.com/trello/docs/how-to-use-advanced-checklists-to-set-due-dates/>
- Todoist frames subtasks as steps under a larger task and supports dates on subtasks: <https://www.todoist.com/help/articles/introduction-to-sub-tasks-kMamDo>
- Apple Reminders Smart Lists collect reminders by tag/date/time/priority/location while reminders stay in their original lists: <https://support.apple.com/guide/reminders/create-custom-smart-lists-remnfec66479/mac>
- Google Tasks/Calendar supports recurring task date rules and editing one task or a series: <https://support.google.com/calendar/answer/12132599>
- Thinkific courses use chapters and lessons in a curriculum builder, with new chapters/lessons starting as draft: <https://support.thinkific.com/hc/en-us/articles/360030739253-Add-a-Chapter-or-Lesson-to-Your-Course>
- Moodle activity completion lets teachers define completion criteria such as viewing, score, or student marking complete: <https://docs.moodle.org/502/en/Activity_completion>
- Khan Academy separates course-level and unit-level mastery goals with due dates: <https://support.khanacademy.org/hc/en-us/articles/360030694212-How-do-I-create-Course-or-Unit-Mastery-Goals-for-my-students>
- Notion database templates can prefill properties/content and repeat on a schedule; database buttons can trigger one-click workflow actions: <https://www.notion.com/help/database-templates> and <https://www.notion.com/help/database-buttons>

## Product Interpretation

### What FlowMe Should Learn

1. **Hierarchy is useful, but not always visible.**  
   Project tools prove that hierarchy helps organize work. They also show the risk: too many levels become management overhead. FlowMe should preserve hierarchy internally and reveal it only when it helps the user find the next Step.

2. **Step must be the portable execution unit.**  
   Calendar/task tools converge around dated tasks, recurring tasks, subtasks, and smart filters. FlowMe's `Step` should carry the portable data needed for calendar/todo/sheet export. `Item` is supporting checklist or text fallback, not a full separate scheduling unit by default.

3. **Creator and learner/user surfaces must stay separate.**  
   Course platforms separate curriculum building from learner progress. FlowMe should do the same: creator edits source rows and generated Step/Item output; user sees save, execute, check, memo, link, update notice.

4. **Templates are powerful but can become blank-workspace bloat.**  
   Notion/Trello patterns justify reusable generation, but FlowMe should not ask users to configure a generic workspace. The creator's source content and FlowMe conversion gate should generate the structure.

## Proposed Product Model

The existing terms remain valid:

```text
Flow Map > Flow > Step > Item
```

Use them like this:

| Level | Product meaning | User visibility | Creator visibility |
| --- | --- | --- | --- |
| Flow Map | A source-backed executable map or collection | Visible as saved map group when it helps orientation | Visible as the publishable product |
| Flow | A repeated child structure or execution lane | Visible as a card/list entry | Visible as a generated child Flow |
| Step | Minimum calendar/todo/sheet executable unit | Primary user action | Editable generated row |
| Item | Checklist/text fallback inside a Step | Visible inside detail or exported text | Editable fallback/detail lines |

## Next Feature Slices

### Slice 1: Creator Source-Row Editor And Version Review

**Goal:** Let a creator inspect and correct how source rows become Steps and Items before publishing a Flow Map.

**Why first:** FlowMe is a creator platform. If creators cannot make and maintain Flow content, My Flow management improvements become isolated demos.

**Scope:**

- Show source row, generated Step title, generated Item fallback, source URL, risk/source label, and readiness.
- Allow editing only the generated execution fields first:
  - Step title
  - Step destination
  - Step date/repeat rule when source-backed
  - Item fallback lines
  - source URL
  - creator note
- Keep raw source extraction and AI auto-generation out of scope.
- Add publish blocker summary.
- Add version draft state: current published version vs edited draft.

**Non-goals:**

- No marketplace.
- No payment.
- No full LMS.
- No generic drag-and-drop workspace builder.

### Slice 2: Saved Map Update Compare And Apply

**Goal:** Extend the current My Flow update notice into a small compare/apply workflow.

**Why second:** Saved maps can change after a user has checked Steps. Users need control before a source update affects their saved execution record.

**Scope:**

- Keep current notice in the Flow tab.
- Add a compare drawer or page:
  - saved version
  - current version
  - changed Flow list
  - changed Step counts
  - source/risk reason
- For official/sensitive maps, default to review-before-apply.
- Applying an update should never erase checked state without explicit user confirmation.

**Non-goals:**

- No auto-apply for sensitive maps.
- No row-level merge editor in v1 unless necessary.

### Slice 3: Step-Level Calendar/Task Fields

**Goal:** Make each Step capable of holding calendar/todo-level metadata without turning My Flow into a heavy project manager.

**Scope:**

- date
- optional time
- optional repeat
- optional location
- memo
- source URL/detail URL
- completion state
- Item checklist fallback

**Rule:** Expose these fields progressively. A user should not see all fields until they open a Step detail or edit action.

### Slice 4: High-Volume My Flow Management

**Goal:** Keep My Flow usable when a user saves many Flows and Flow Maps.

**Scope:**

- Search by title/source/category.
- Filter by due date, source-backed map, routine/schedule/progress, and hidden/done.
- Hide or archive saved Flows.
- Keep Today and Calendar execution-first.
- Use smart-list logic, but avoid introducing a visible power-user query language.

### Slice 5: Production Persistence And Footprint

**Goal:** Move from localStorage bridge to account-backed saved records and behavior evidence.

**Scope:**

- Stable DB contract for Flow Map, Flow, Step, Item, saved snapshot, user Step state, dismissed update notice.
- Event/footprint logging:
  - open
  - anchor entered
  - save
  - export/copy
  - Step opened
  - Step checked
  - source link opened
  - return visit
- Keep validation language blocked until real user behavior exists.

## Recommended Order

1. Creator source-row editor and version review.
2. Saved map update compare/apply.
3. Step-level calendar/task fields.
4. High-volume My Flow management.
5. Account persistence and footprint logging.

This order keeps the platform story intact:

```text
creator source -> Flow Map draft -> publish version -> user save -> user execute -> source update -> user-controlled update
```

## Design Principles For The Next Implementation

1. **Do not add a feature only because Jira/ClickUp/Notion has it.**
2. **Keep the user's first action visible before hierarchy controls.**
3. **Creator screens may be denser than user screens.**
4. **Step is the portability boundary.**
5. **Item is fallback/check detail unless the source clearly makes it a dated unit.**
6. **Official/sensitive updates require review before apply.**
7. **No "validated" wording until real behavior exists.**

## Open Questions

- Does the creator editor need inline editing first, or should it start as a review table plus side drawer?
- Should update compare live inside My Flow or the public Flow Map page?
- Should Step-level repeat support use a simple preset first, or mirror Google Calendar-style custom recurrence?
- Should account persistence start before update apply, or can update apply remain localStorage-backed for one more slice?

