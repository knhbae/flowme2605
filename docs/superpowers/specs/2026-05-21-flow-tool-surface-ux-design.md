# FLOW Tool Surface UX Redesign

Date: 2026-05-21

## Goal

Redesign FLOW so users experience each Flow as something already placed into their own working tools: calendar, checklist, sheet, or memo. The redesign should make the user's next action visible before source notes, generic explanations, or raw Markdown editing.

This is the chosen "C" direction, but scoped as a FLOW-native tool surface layer. It should not recreate full calendar, spreadsheet, or Notion products inside FLOW. It should show enough realistic structure for users to understand, adjust, export, and execute the Flow.

## Problem

Production UX testing showed three major disconnects:

1. Flow detail pages have improved with preview-first sections, but still mix source explanation, warnings, setup, and execution in a way that weakens first-screen recognition.
2. Copying a Flow into "My Flow" drops users into a Markdown-first editor. This contradicts the user's intent: they copied the Flow to adjust schedule, checklist, or export target.
3. Creator channels expose many Flows, but many cards share similar generic titles and descriptions. Users cannot easily choose a Flow based on goal, target tool, or execution rhythm.

## Product Principle

Every user-facing Flow surface must answer these questions within the first screen:

1. What original content is this based on?
2. What do I do first?
3. When or how often do I do it?
4. Which tool does it become: calendar, checklist, sheet, or memo?
5. What will I edit after copying it?

If a screen does not answer these questions, it is incomplete.

## Flow Types

Each Flow gets one primary tool surface type. Detail, copy-edit, and creator-card UX derive from this type.

### `calendar_routine`

For workouts, stretches, recurring routines, and repeatable practice.

- Primary surface: weekly or monthly calendar preview.
- Required settings: start date, repeat days, duration, missed-day behavior.
- Primary export: calendar file.
- Secondary exports: sheet execution table, memo copy.

### `daily_check`

For diet, meal rules, habits, and daily records.

- Primary surface: 7-day checklist.
- Required settings: start date, active days, daily check item, optional note field.
- Primary export: sheet/checklist.
- Secondary exports: memo copy, calendar reminder.

### `dday_timeline`

For moving, exams, wedding prep, applications, and deadline-driven projects.

- Primary surface: D-Day timeline with grouped phases.
- Required settings: target date or start date, phase visibility, high-priority reminders.
- Primary export: sheet timeline.
- Secondary exports: calendar milestones, memo copy.

### `single_action`

For civil service tasks, purchase checks, one-time submissions, or visit preparation.

- Primary surface: today action card with required documents, links, and done signal.
- Required settings: action date, location or link, completion evidence note.
- Primary export: memo/checklist.
- Secondary exports: calendar reminder, sheet row.

### `sheet_tracker`

For comparison, logging, tracking, and repeated maintenance.

- Primary surface: spreadsheet-like table.
- Required settings: columns, recurrence, row template, status field.
- Primary export: Excel workbook.
- Secondary exports: memo copy, calendar reminder when needed.

Hybrid flows can combine surfaces, but one primary surface must be selected for first-screen clarity.

## Detail Page Design

The Flow detail page becomes a "before importing" preview. It prioritizes the user's future tool view over explanatory content.

### Structure

1. Header summary
   - Title using source, content premise, user action, and tool/rhythm.
   - Original content/source line.
   - First action.
   - Primary tool type.
   - Recommended rhythm.

2. Tool surface preview
   - Calendar routine: monthly or weekly preview.
   - Daily check: 7-day checklist.
   - D-Day timeline: grouped phase table.
   - Single action: today action card.
   - Sheet tracker: sheet-like grid.

3. Adjust to my situation
   - Show only settings relevant to the primary surface.
   - Avoid generic setup labels if a concrete label exists.

4. Take it with me
   - Export buttons match the surface type.
   - Primary export is visually dominant.
   - Secondary exports remain available but lower priority.

5. Execution detail
   - Checklist item details, prep/execution/finish notes, links, and risk notes.
   - Source and caution information remains accessible but does not dominate the first screen.

## Copy/Edit Page Design

The copy/edit page must stop behaving like a raw content parser by default. It behaves like the user's personal version of the selected tool surface.

### Structure

1. Confirmation header
   - Confirm that the Flow has been imported into My Flow.
   - Explain the primary surface in one sentence.
   - Example meaning: "This Flow becomes a workout routine in your calendar. Change only the start date and weekdays."

2. My settings
   - Calendar routine: start date, repeat days, duration, missed-day behavior.
   - Daily check: start date, active days, daily check label, optional note.
   - D-Day timeline: target date, visible phases, reminder priorities.
   - Single action: action date, required proof/note, official link.
   - Sheet tracker: row template, columns, recurrence.

3. My tool preview
   - Same primary surface as the detail page, updated live from settings.

4. Export and save
   - Save draft.
   - Publish if the user is a creator.
   - Export to the surface's primary destination.

5. Advanced edit
   - Raw Markdown.
   - Raw execution item fields.
   - Source metadata.
   - This section is collapsed by default.

## Creator Channel Design

Creator channels become purpose-based Flow libraries rather than long uniform card grids.

### Structure

1. Creator header
   - Creator name, channel type, primary user goals.
   - Counts split by verified source-backed Flows and sample Flows.
   - Surface distribution: calendar, daily check, D-Day, sheet, memo/action.

2. Start here
   - 3 to 6 source-backed representative Flows.
   - Prefer diversity by goal and surface type.

3. Goal filters
   - Fitness examples: 10-minute workout, full-body workout, stretch, diet check, record/manage.
   - Official/admin examples: application, document, exam day, deadline, visit prep.

4. Full library
   - Filter by source status, surface type, rhythm, and goal.
   - Samples remain available but visually separated from verified source-backed Flows.

### Card Content

Cards must communicate action, rhythm, and destination.

Required fields:

- Source: creator/video/page.
- Task: what the user does.
- Rhythm: once, daily, weekly, D-Day.
- Tool: calendar, checklist, sheet, memo.
- First setting: start date, target date, active days, or no-date quick check.

## Naming Rules

Flow titles should use this formula:

`[source/creator] + [content premise] + [user action] + [tool or rhythm]`

Good title meanings:

- ThankyouBUBU full-body workout into a 3-day-per-week calendar routine.
- FITVELY body-fat reduction principle into a 7-day meal checklist.
- Q-Net exam-day preparation into a D-Day checklist.
- Moving D-30 tasks into a monthly preparation schedule.

Avoid titles that only name an internal abstraction:

- Criteria Flow.
- Apply Flow.
- Manage Flow.
- Set goals and criteria.
- Issue response order.
- Checklist execution.

The shipped Korean copy should preserve the same semantic shape even though the exact wording will be localized.

## Implementation Scope

### Phase 1: Tool Surface Layer

Build shared surface components:

- Calendar routine preview.
- Daily checklist preview.
- D-Day timeline preview.
- Single action preview.
- Sheet tracker preview.

Add a surface inference or explicit mapping layer so each Flow consistently chooses one primary surface.

### Phase 2: Copy/Edit Redesign

Replace the default Markdown-first editor with a personal tool-surface editor:

- Show confirmation and surface-specific settings first.
- Show live tool preview second.
- Keep raw Markdown in collapsed advanced edit.

### Phase 3: Creator Channel Redesign

Rebuild creator channels around purpose and tool surface:

- Source-backed Flows first.
- Samples separated.
- Cards rewritten around task, rhythm, and destination.
- Filters aligned to user goals and surface type.

### Phase 4: Content Cleanup

Apply naming and copy rules to existing source-backed fitness flows first, then high-traffic lifestyle/admin flows.

Initial cleanup scope:

- ThankyouBUBU exact video flows.
- FITVELY exact video flows.
- Moving D-30.
- Q-Net application/exam day.

## Testing

### Automated Tests

Add or update tests for:

- Surface type inference/mapping.
- Detail page renders correct primary surface.
- Copy/edit page shows surface settings before raw Markdown.
- Creator channel separates source-backed flows from samples.
- Titles reject generic internal labels for source-backed Flows.
- Export buttons align with primary surface.

### Manual UX Tests

For each representative Flow, test:

1. Can a user identify the target tool within 5 seconds?
2. Can a user identify the first action within 5 seconds?
3. Can a user adjust date/rhythm without reading Markdown?
4. Does the preview match the export destination?
5. Does the creator card make the expected action clear without opening the detail page?

Representative test pages:

- `real-thankyou-bubu-video-full-body-no-jump`
- `real-fitvely-video-body-fat-6kg-method`
- `moving-d30-basic`
- `real-qnet-application-examday-check`
- `/u/thankyou-bubu`
- `/u/fitvely`

## Non-Goals

- Do not build a full replacement for Google Calendar, Excel, Notion, or Apple Reminders.
- Do not add account-level sync in this phase.
- Do not create a complex multi-tab productivity suite.
- Do not expose raw parser syntax to normal users as a default path.

## Acceptance Criteria

The redesign is acceptable when:

1. The first screen of each representative Flow clearly shows the primary tool surface.
2. Copying a Flow lands on a surface-specific editor, not a Markdown-first editor.
3. Fitness video Flows feel like calendar or checklist routines, not generic content summaries.
4. Creator channel cards make source, task, rhythm, and destination visible.
5. Source-backed Flows are visually separated from generated samples.
6. Export actions match the primary surface and remain close to the preview they export.
7. Existing unit, build, and e2e test suites pass.
