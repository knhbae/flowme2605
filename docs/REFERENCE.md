# Product Reference: Execution UX and Productivity Methods

**Last reviewed:** 2026-05-21
**Purpose:** Keep external UX/UI and workflow references available for future FLOW design decisions. This is research memory, not a committed roadmap.

FLOW should use these notes when designing public flow pages, planner/export behavior, checklist execution, reminder copy, routine loops, health/exercise flows, and future creator/editor experiences.

## 1. UX/UI Patterns From Comparable Products

### Calendar and Scheduling

Relevant references:
- [Google Calendar Tasks](https://support.google.com/calendar/answer/9901136?hl=en-uk)
- [Notion Calendar](https://www.notion.com/product/calendar)
- [Routine calendar](https://routine.co/solutions/individuals/calendaring)
- [Todoist time blocking](https://www.todoist.com/help/articles/time-blocking-in-todoist-d6Pf1uTpc)
- [CMS Calendar Picker guidance](https://design.cms.gov/components/date-field/date-picker/?view=guidance)

Patterns to reuse:
- Separate concepts clearly: event, deadline, task time block, reminder, and routine are not the same object.
- Let users see task work beside scheduled events so they can judge capacity and avoid overlaps.
- Support quick time blocking with date, start time, and duration. Drag/drop is useful later; Stage 0 can begin with exportable schedule rows.
- Provide an agenda view that answers "what matters today" without forcing users through a full calendar grid.
- Date inputs need both typed entry and picker support. A calendar picker is useful when day-of-week context matters; direct input is better for known dates.
- For FLOW: keep `anchorDate + dayOffset` visible enough that users trust the generated dates, but make the default screen an execution agenda, not a date-calculation tool.

### Task and To-Do Management

Relevant references:
- [Todoist features](https://www.todoist.com/features)
- [Microsoft To Do](https://www.microsoft.com/en-us/microsoft-365/microsoft-to-do-list-app)
- [Things Today / Upcoming / Anytime / Someday](https://culturedcode.com/things/support/articles/4001304/)
- [Apple Reminders organization](https://support.apple.com/en-mide/119953)
- [TickTick features](https://ticktick.com/features?language=en_US)

Patterns to reuse:
- Maintain simple capture first: inbox, quick add, or import should be faster than organizing.
- Offer focused views: Today, Upcoming, later/someday, and context/tag filtered lists.
- Keep daily scope small. Microsoft To Do explicitly frames a manageable daily list around a few high-value items.
- Preserve multiple views for the same content: list for execution, board/section view for planning, calendar for time capacity.
- Tags/labels are useful only if they reduce clutter. Avoid forcing every user to learn query syntax before they get value.
- For FLOW: a public route should support "copy all", but the on-screen execution view should emphasize today/next items and source/risk context.

### Reminders and Notifications

Relevant references:
- [Microsoft To Do due dates and reminders](https://support.microsoft.com/en-us/office/add-due-dates-and-reminders-in-microsoft-to-do-064d9696-08d1-4433-bfdd-f661dc97491f)
- [Apple Human Interface Guidelines: Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [TickTick reminder patterns](https://ticktick.com/features?language=en_US)

Patterns to reuse:
- Ask for notification permission only when the user has a clear reason to understand the value.
- Reminder text should be short, specific, and action-oriented.
- Use reminder urgency sparingly. Not every checklist item deserves a push notification.
- Location reminders are powerful for errands and health visits, but require explicit trust and platform permissions.
- For FLOW: Stage 0 should phrase reminders as exportable schedule/copy text. Native push, SMS, or calendar integrations should wait until copy/export/check behavior is proven.

### Routines, Habits, and Focus

Relevant references:
- [TickTick habits / Pomodoro / recurring reminders](https://ticktick.com/features?language=en_US)
- [Routine focus, timers, and unified inbox](https://routine.co/)
- [Todoist recurring time blocking](https://www.todoist.com/help/articles/time-blocking-in-todoist-d6Pf1uTpc)

Patterns to reuse:
- Routines need recurrence, a light reset path, and progress feedback. They should not become overdue debt that punishes users for missing a day.
- Pomodoro/timers are useful when a task is about focused effort rather than a simple completion check.
- A daily planning reminder can be more valuable than reminders for every individual routine item.
- For FLOW: model routines as repeatable execution loops with "next session" and "recent completion" rather than as a long overdue checklist.

### Health, Exercise, and Sensitive Execution

Relevant references:
- [Apple HealthKit HIG](https://developer.apple.com/design/human-interface-guidelines/healthkit/)
- [Strava Training Log](https://support.strava.com/hc/en-us/articles/206535704-Training-Log)
- [Google Fit activity goals](https://developers.google.com/fit/android/using-goals)

Patterns to reuse:
- Health data access requires explicit purpose, user permission, and a clear privacy explanation.
- Progress views work best when they show history and trend, not only a single score.
- Color and tags help users scan different activity types, milestones, and recovery/workout categories.
- For FLOW: do not request health data in Stage 0/1. Health and exercise flows should use user-entered check states and conservative safety copy until there is a real reason to integrate HealthKit, Google Fit, or wearable data.

## 2. Productivity Methods and Operating Know-How

### GTD: Capture, Clarify, Organize, Reflect, Engage

Relevant references:
- [Todoist GTD guide](https://www.todoist.com/sv/productivity-methods/getting-things-done)
- [Todoist Weekly Review](https://www.todoist.com/productivity-methods/weekly-review)

Useful principles:
- Capture first, organize second. FLOW should let users save/import a route quickly before asking for detailed structure.
- Every active project or route needs a visible next action.
- Keep reference material separate from tasks. Sources, official links, and creator notes should support execution without becoming checklist items.
- Use "waiting for" and "someday/maybe" concepts to prevent clutter.
- Weekly review is the cleanup loop: check active routes, deferred ideas, blocked items, and upcoming deadlines.

### Time Blocking

Relevant references:
- [Todoist time blocking](https://www.todoist.com/help/articles/time-blocking-in-todoist-d6Pf1uTpc)
- [Google Calendar Tasks](https://support.google.com/calendar/answer/9901136?hl=en-uk)
- [Routine calendar](https://routine.co/solutions/individuals/calendaring)

Useful principles:
- Calendar shows capacity; task lists show work content. FLOW should not blur that distinction.
- Time blocking needs duration, not only due date.
- A good planner helps users move unscheduled/backlog tasks into realistic time slots.
- For FLOW export: include title, date, optional start/end time, duration, type, source/risk, and notes so users can move the plan into their preferred tool.

### Prioritization

Relevant references:
- [Asana Eisenhower Matrix](https://asana.com/resources/eisenhower-matrix)
- [Microsoft To Do](https://www.microsoft.com/en-us/microsoft-365/microsoft-to-do-list-app)

Useful principles:
- Separate urgent from important. Many "today" lists fail because they mix real deadlines with vague intentions.
- A daily plan should be intentionally small: one big task plus a few medium/small actions is usually more usable than a complete backlog.
- For FLOW: avoid ranking every item as equally important. Use plain labels such as `must do before visit`, `good to prepare`, `optional`, `ask expert`, or `waiting for`.

## 3. FLOW Design Implications

Use this checklist before adding or changing execution UX:

- **Object type:** Is this item an event, task, reminder, routine, reference, or decision?
- **Anchor:** Does it depend on a date, phase, baby age, recurrence, location, or no anchor?
- **User intent:** Is the user planning, executing today, exporting, sharing, checking progress, or reviewing?
- **Default view:** Does the screen show the smallest useful next step before advanced organization?
- **Source safety:** Are official information, creator experience, and user custom notes visually separated?
- **Exportability:** Can the plan become clipboard text, CSV/XLSX, ICS/calendar, or a to-do import without losing context?
- **Review loop:** Is there a weekly/daily review moment that lets users recover from missed tasks without shame or clutter?

## 4. Do Not Over-Adopt Yet

- Do not build full AI scheduling, native reminders, health data integration, or wearable sync before Stage 0 copy/export/check evidence.
- Do not add social proof, streak pressure, or activity counts without real usage data.
- Do not make FLOW imitate a full task app. FLOW should remain the execution route layer that exports cleanly into task/calendar tools.
