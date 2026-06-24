# Flow Execution Types

Date: 2026-06-18

This document defines the user-facing execution type of a Flow. It exists because several PoCs confused progress tracking, process execution, timeline scheduling, routine repetition, and Flow-of-Flow hierarchy. The result was UI that looked polished but did not match the original content or the user's mental model.

Use this before designing UI. A Flow's execution type is not the same as its storage destination or data structure.

## Three Separate Decisions

For every source-to-Flow conversion, decide these in order:

1. **Natural artifact**
   - Where the Flow naturally goes: calendar, checklist, sheet/table, memo, bucket item, or hybrid.
2. **Execution type**
   - How the user actually uses it over time: progress, process, timeline, routine, reference/bucket, log, or decision.
3. **Hierarchy**
   - Whether it is a single Flow, a collection/map, or a true Flow of Flow.

Do not use `Flow of Flow` to solve an unclear execution type. First classify the child Flow correctly.

## Core Execution Types

### 1. Progress Flow

Use when the source has a sequence of lessons, chapters, rounds, units, videos, assignments, or study rows, and the user's main job is to mark how far they got.

Typical sources:

- curriculum table of contents
- course playlist
- textbook chapter list
- exam-scope list
- creator lesson sequence

User job:

- "I want to know where I am and what is next."

Primary UI:

- progress list or table
- current row detail
- checkboxes/status per row
- short note or wrong-answer note
- source URL near the row

Avoid:

- inventing a learning session workflow if the source only gives a lesson list
- forcing calendar dates unless the user needs scheduling
- turning each row into a custom app screen

Examples:

- Middle-school math units and sub-units
- Certification course chapters
- Video course lesson list

### 2. Process Flow

Use when the source describes steps that should be completed in order to finish a real-world task.

Typical sources:

- application/submission guide
- setup procedure
- inspection checklist
- admin task guide
- purchase/visit checklist

User job:

- "I want to complete this without missing a required step."

Primary UI:

- current execution card
- ordered or grouped checklist
- hold/reason memo
- source URL or official detail
- completion state

Avoid:

- progress-map UI
- arbitrary day-by-day scheduling when the source is just a procedure
- status buttons with unclear consequences

Examples:

- Used-car visit checklist
- Online passport renewal
- eSIM activation when kept as a one-time procedure

### 3. Timeline Flow

Use when the source has an anchor date and offset-based work.

Typical sources:

- D-day preparation guide
- moving schedule
- contract/event preparation
- school entry D-30 guide

User job:

- "I want the right things to appear on the right dates."

Primary UI:

- anchor date input
- dated cards
- selected date detail
- calendar preview when useful
- full timeline list

Avoid:

- one huge undated checklist
- duplicate checklist rows across calendar and all-view
- asking for details that belong in memo/description

Examples:

- Jeonse contract precheck
- Moving D-30
- Elementary school entry D-30

### 4. Routine Flow

Use when the source defines a repeated action or cadence.

Typical sources:

- workout video repeated weekly
- plant watering interval
- cleaning/maintenance cycle
- practice habit

User job:

- "I want this to repeat and let me check each occurrence."

Primary UI:

- repeat rule or source-defined cadence
- next occurrence card
- done/skip/hold only when each state changes future behavior
- compact note
- source URL inside the repeated item

Avoid:

- asking for repeat settings when the source already defines the cadence, unless advanced editing is open
- splitting one follow-along video into fake sub-checklists
- turning a light habit into a dashboard

Examples:

- Home workout video
- Stuckyi watering
- Weekly fridge cleanout only if the source has a repeatable plan

### 5. Reference Or Bucket Flow

Use when the source is primarily something the user wants to save for later and maybe execute once.

Typical sources:

- printable craft
- recipe to try
- travel tip
- tool/resource article
- one-off idea

User job:

- "I want to keep this and optionally pick a date later."

Primary UI:

- saved item
- source URL
- short prep checklist only if source-derived
- optional date
- memo/photo later

Avoid:

- forcing date input before saving
- creating multiple execution stages without source evidence
- turning a saved resource into a timeline

Examples:

- Printable squishy craft
- A single recipe
- An eSIM guide if the user only wants to keep the source link for trip prep

### 6. Log Or Record Flow

Use when repeated records matter more than completing a fixed checklist.

Typical sources:

- health observation log
- baby feeding/reaction log
- score tracker
- plant condition record
- wrong-answer or study score log

User job:

- "I want to record what happened and compare later."

Primary UI:

- lightweight table or log rows
- date/status/value/memo
- source/caution separated
- minimal required fields

Avoid:

- making users write long notes
- implying medical, financial, legal, or safety judgment
- adding checklist rows when the source is a record template

Examples:

- Wrong-answer table
- Baby food reaction note
- Plant condition observations

### 7. Decision Flow

Use when the source helps the user choose between options, and the output is a selected option, note, or next task.

Typical sources:

- comparison guide
- decision checklist
- vendor/service selection guide
- eligibility guide

User job:

- "I want to narrow options and remember why."

Primary UI:

- criteria checklist
- option rows
- selected option or hold memo
- source URL
- next action

Avoid:

- pretending FLOW makes the decision
- hiding criteria in long description
- adding unrelated scheduling UI

Examples:

- Moving service type/vendor comparison when the source actually branches by method
- Product/vendor shortlist

## Flow Of Flow Rule

Flow of Flow applies only after the child Flow execution type is clear.

Use this hierarchy when naming and modeling parent-child execution content:

```text
Flow Map > Flow > Step > Item
```

- **Flow Map:** the upper map that groups related executable Flows. Example: middle-school math year, baby vaccination map, certification study map.
- **Flow:** one executable content unit inside the map. Example: a math unit, one vaccine/visit group, one subject or part.
- **Step:** the minimum execution row that can become a calendar event, todo task, checklist row, sheet row, or progress row. Example: lesson title, chapter, visit period, source-defined task.
- **Item:** a detail field attached to a Step, such as memo prompt, URL, material, criterion, selected option, confirmation number, or calendar-event description variable. It is usually not saved as an independent calendar/todo entry.

Not every Flow needs all four levels. If the source is a lecture list, book chapter list, or official schedule table, `Flow Map > Flow > Step` can be enough. Add `Item` only when the Step needs structured details in memo, description, URL, or event/task variables. In FlowMe, Items may render as an internal checklist inside the Step detail when that helps execution. In outside apps that do not support nested checklist items, Items should collapse into plain text in the calendar event description, todo note/body, sheet note column, or memo. Items should not become separate scheduled tasks unless the source truly requires it.

Good Flow of Flow:

- Parent: curriculum, roadmap, creator program, care map, or project map
- Child Flows: repeated children with the same execution type
- Example: middle-school math map -> each unit is a Progress Flow
- Example: creator running program -> each week is a Routine/Progress Flow
- Example: baby vaccination map -> each vaccine/visit is a Timeline or Process Flow

Weak Flow of Flow:

- Parent is just a folder of unrelated Flows
- Child items have different jobs and need different UI
- Parent exists only to make the PoC look larger

## Selection Checklist

Before UI, answer:

```text
Source shape:
Natural artifact:
Execution type:
Single Flow / Map / Flow of Flow:
Top-level inputs:
First action:
Completion signal:
What goes to memo/detail/URL:
What must not be invented:
```

If the execution type cannot be chosen, do not build the UI yet.

## UX Defaults By Type

| Execution type | First screen should show | Details should hold |
|---|---|---|
| Progress | current row/unit, progress, next row | notes, source links, full list |
| Process | current task/checklist, completion/hold | source detail, caution, memo |
| Timeline | anchor date, selected date, dated items | full timeline, calendar preview, memo |
| Routine | next occurrence, repeat rule, done/skip | source URL, stop/hold condition, note |
| Reference/Bucket | saved item, source URL, optional date | prep, memo, photos, later plan |
| Log/Record | latest row, add record, recent history | trend table, caution, source boundary |
| Decision | criteria, options, selected/hold state | reasons, source links, next action |

## Practical Rule

When a Flow feels too complex, check whether the wrong execution type was chosen before changing visual design.
