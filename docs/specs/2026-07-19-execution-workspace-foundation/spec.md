# P25 Execution Workspace Foundation Spec

**Date:** 2026-07-19
**Status:** Approved for staged planning; implementation starts only after P25-00B owner review
**Owner:** Product owner + implementation agent
**Related roadmap:** [P25 execution workspace correction](../../ROADMAP.md#p25-execution-workspace-correction)

## Goal

Rebuild the core FlowMe experience around one understandable execution model instead of continuing P24 surface polish. A user must be able to inspect the whole Flow they saved, keep tasks usable without dates, adjust only what they need, place selected work on a calendar, complete and reopen work, and export the same effective result. The current source, personal overlay, execution run, and portable export contracts remain the foundation.

## Why P24 Is Not The Finish Line

P24 connected many actions and improved first-save framing, but the owner, Codex review, and Claude Design review converge on four unresolved product problems:

1. `날짜 없는 할 일` is exposed as an implementation state, not a user job.
2. Adjustment feels like a dense form rather than a deliberate path for different needs.
3. The post-save and whole-Flow views do not yet create confidence that the complete artifact was saved.
4. My Flow, Calendar, public preview, and export can show the same Flow with different hierarchy, counts, or recurrence meaning.

P25 therefore treats the current service as an internal alpha baseline. It does not ask external participants to evaluate it yet.

## Stage Fit

This is Stage 0 execution-workspace work. It strengthens the path from outside content to a personal, editable, portable artifact without turning FlowMe into a general-purpose document editor or a calendar replacement.

It must not add account systems, database migration, AI generation, direct OAuth synchronization, a fifth navigation tab, or an unrestricted Notion-style workspace.

## Product Model

### The four layers

| Layer | User meaning | Primary surface | Rule |
| --- | --- | --- | --- |
| Flow artifact | The complete saved plan/checklist/program | Whole Flow view | This is the primary saved object |
| Personal adjustment | My title, included tasks, order, dates, notes | Flow view + item drawer | Source remains immutable; changes are overlays |
| Execution | What I can act on now and what I finished | My Flow `지금` / `완료` | One occurrence has one completion control |
| Schedule and portability | When work happens and where it goes | Calendar + export scope | Every destination reads one effective projection |

### Date states

`날짜 없음` is a data condition, not the user-facing product name.

| Effective state | User-facing meaning | My Flow | Calendar | Exports |
| --- | --- | --- | --- | --- |
| No date, actionable | `언제든 할 일` | Visible and completable | Available in `일정에 놓기`; not on grid | List exports include; ICS excludes |
| Dated | `예정된 할 일` | Visible by Flow and relevant time | Grid/agenda | All eligible destinations include |
| Completed | `완료한 일` | Reopenable from completed view | Existing dated row may remain by policy | Membership follows destination policy |
| Held/review | Not executable yet | Hidden from ordinary execution | Hidden | No ordinary export |

The exact labels must be confirmed in P25-00B, but the state ownership is fixed: users may keep a task undated indefinitely and still execute it from My Flow.

## Core User Needs

1. **Use as-is:** Save the complete artifact without configuring every field.
2. **Use only part:** Include/exclude or select a subset before or after saving.
3. **Personalize lightly:** Change a title, date, note, or order without opening an advanced form.
4. **Schedule selectively:** Put one or several undated tasks on dates, move them, or clear dates.
5. **Execute and recover:** Complete, immediately undo, and later reopen from a persistent completed view.
6. **Take it elsewhere:** Choose scope before file format and receive the same effective items seen in FlowMe.

## Proposed Information Architecture

The global four-tab IA remains. P25 may change My Flow's local views after P25-00B review:

- `지금`: dated work relevant now plus undated work intentionally pulled into focus.
- `Flow`: complete saved artifacts, their sections, progress, adjustment, and export.
- `완료`: persistent history and reopen path.

Calendar remains date-first. It shows dated work on the grid and uses a separate scheduling queue for undated work. It must not become the only place where an undated task can be found or completed.

## Experience Contracts

### Save-before

- Show one coherent artifact preview, not three representations of the same Flow.
- Keep source/risk context behind one disclosure unless a caution must block action.
- `그대로 저장` is the fast path.
- `조정` is optional and limited to the fields needed to predict the saved result.
- Preview inclusion controls must not look like execution completion.

### Post-save

- Show the complete effective Flow at depth 0, including section structure and item count.
- Never truncate the first confirmation to the first five items without an explicit count and expansion.
- Make the personal Flow name primary and source/content identity secondary.
- Offer a small number of next actions: begin, adjust/schedule, or take elsewhere.

### Whole Flow

- The same whole-Flow component powers first-save confirmation and later Flow view.
- Mobile uses outline -> item drawer navigation.
- Wide uses Flow rail -> item list/outline -> detail drawer/pane.
- Today/next projections never replace the complete artifact.

### Adjustment

- Default item editing shows title, date state, and note.
- Time, duration, and recurrence stay under `세부 일정`.
- Batch mode supports selected item date move/clear, inclusion, and export scope.
- Any saved Flow is a personal copy. Source-backed items remain immutable underneath personal aliases, hides/tombstones, additions, dates, and order.
- Destructive changes have immediate undo and persistent recovery where the existing overlay supports it.

### Completion

- One item/occurrence exposes one primary completion checkbox.
- Completing shows immediate undo.
- Completed work is discoverable later and can be reopened.
- Repeating series, one occurrence, and an occurrence's internal checklist are distinct levels.

### Export

- Choose `현재 항목`, `선택한 항목`, or `Flow 전체` before choosing a format.
- Preview count, exported count, Calendar events, and recurrence occurrences derive from one effective projection.
- A task without a date stays in checklist/sheet/memo exports and is excluded from Calendar/ICS.

## Reference Decisions

P25 borrows bounded interaction patterns, not entire products:

- Things: separate `Today`, `Upcoming`, `Anytime`, and `Someday`; clearing a schedule returns a task to an active undated state.
- Structured: keep unscheduled work in an inbox and move it into a timeline when scheduling is desired.
- Google Calendar/Tasks: only dated tasks appear on Calendar, while task lists remain a separate home for work.
- Todoist: completion is a row-level circle, immediate undo is transient, and completed work has a persistent view for reopening.
- Notion: duplicate public material into a private editable copy and render the same underlying information through different views.
- Wanderlog: keep guide/source material distinct from the user's trip plan, daily itinerary, reservations, and checklists.

FlowMe must not copy Notion's unrestricted property surface or compete with a full calendar/task suite. Its advantage is converting outside content into a coherent personal execution artifact and portable projections.

## Scope

### In

- P25-00 alternative wireframes and owner decision gate.
- Canonical effective projection and recurrence/count parity.
- Memo draft parse preview without generic filler.
- Whole-Flow post-save and returning workspace.
- Progressive item editor and selected-item bulk actions.
- Explicit undated/Anytime behavior and Calendar scheduling queue.
- Completion/reopen and export-scope clarity.
- Public Flow representation/copy simplification.
- Responsive shared components and internal simulated journey gate.

### Out

- External-user observation during P25 implementation.
- AI URL extraction or live draft generation.
- Account, database, cloud sync, or direct service integrations.
- Drag-and-drop as a required first scheduling method.
- Arbitrary page/block authoring.
- Studio promotion or global IA expansion.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Inspect the complete artifact, then save as-is or make a bounded adjustment |
| Completion signal | The same effective Flow is visible in whole Flow, My Flow, Calendar, and selected export scopes |
| Artifact destination | My Flow, Calendar/ICS, checklist, sheet, and memo |
| Source/risk boundary | Source is immutable; personal adjustment and execution records stay separate |
| Natural artifact | A full moving timeline, vehicle checklist, routine series, trip plan, or personal draft |
| Verification | Contract tests, E2E journeys, 390/1024 screenshots, counts/parity checks, owner design review |

## Acceptance Criteria

- A user can explain where an undated task lives and can keep it undated without losing execution or list export access.
- The first post-save screen shows the whole effective Flow, not only Today's item or a truncated card summary.
- Default editing does not expose time, duration, recurrence, decision fields, and source details simultaneously.
- Batch selection supports at least date move/clear and scoped export without mutating source data.
- Preview, My Flow, Calendar, ICS, and list exports agree on item and occurrence identity/count.
- Completion has both immediate undo and a persistent reopen path.
- Public save-before shows one artifact representation and materially less explanatory copy.
- Mobile 390px and wide 1024px use the same hierarchy without stretched mobile cards, horizontal overflow, or fixed-control overlap.
- P25-00B is approved by the owner before P25-02 UI implementation begins.
- Automated simulation is not reported as observed-user validation.
