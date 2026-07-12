# FlowMe cross-category UX audit

## Executive judgment

FlowMe's data and portability direction is stronger than its current visual expression. The current shared workbench often renders every supported artifact as a visible section, so the screen communicates component capability before the user's immediate job. The redesign should not flatten all content into one generic checklist, and it should not become a broad Notion-like workspace.

The correct model is:

> one canonical execution object, several job-specific views, and progressive disclosure of supporting context.

## What strong references consistently do

1. **Separate overview density from action density.** Apple and Google Calendar keep month cells compact and move readable event detail to a selected-day or schedule view. Fantastical uses a quick DayTicker separately from its full calendar.
2. **Use multiple views over the same data.** Notion keeps rich properties in one record while list, board, calendar, timeline, and detail expose different subsets.
3. **Keep Today intentionally small.** Things, Todoist, and Microsoft To Do pull only relevant work into a daily focus view while preserving project context elsewhere.
4. **Separate a program from the current session.** Nike Training Club, Fitbod, and Freeletics show the next workout first; program logic, guidance, recovery, and history support it instead of competing with it.
5. **Keep one trip object but stage the journey.** Wanderlog, Roadtrippers, TripIt, and Polarsteps distinguish planning, day itinerary, map, reservations, live travel, and recap without duplicating the trip itself.
6. **Let users edit where the date or action is visible.** Notion Calendar and timeline patterns reduce the gap between seeing a plan and correcting it.

## Patterns FlowMe should not copy

- Do not expose a blank-property workspace and ask users to design their own database.
- Do not add calendar, habit, focus timer, statistics, map, budget, and collaboration as equal global features.
- Do not use AI as the visual center before editable, trustworthy execution data exists.
- Do not show every export destination at the same hierarchy as the next action.
- Do not force all Flow categories into a month-calendar-plus-checklist layout.

## Flow content archetypes

The archetype chooses the first artifact and visual hierarchy. It does not create separate data silos.

| Archetype | Example content | First visible surface | Keep behind detail | Portable result |
| --- | --- | --- | --- | --- |
| Timeline / project | moving, exam preparation, wedding | anchor, next milestone, compact upcoming sequence | full month, source, all rows | calendar + checklist |
| Checklist / inspection | vehicle inspection, used-car check, document prep | condition, action title, completion control | evidence, source and exception detail | checklist + memo |
| Routine / program | workout, cleaning cycle, study habit | current session, duration/reps, next scheduled session | program theory, history, safety detail | recurring calendar + checklist |
| Record / tracker | diet log, filter change, score tracking | one input row and recent result | trends, full table, supporting notes | sheet + memo |
| Decision / comparison | contract choice, purchase condition | criteria, current option, next decision | source clauses, extended comparison | table + memo |
| Itinerary / trip | travel prep, route plan, camping | current day/phase, place or reservation, next move | map, documents, budget, full packing list | calendar + checklist + memo |
| Source hold / reference | outdated or sensitive schedule | hold reason and official source action | audit history | no executable export |

## Shared view contract

Every public or saved Flow may use the same five levels, but only the relevant levels are visible by default.

1. **Promise:** what useful result this Flow becomes.
2. **Now:** one next action or one required input.
3. **Plan:** compact sequence, selected day, session, or decision rows.
4. **Context:** notes, source, safety, reservation, evidence, and personal edits.
5. **Portability:** one secondary `가져가기` entry that reveals only supported destinations.

## Visual system direction

- Use a neutral canvas and reserve strong color for the current action, selected date, completion, and warnings.
- Give each Flow a stable identity accent, but do not use color alone; pair it with a short name or marker.
- Replace repeated nested cards with full-width bands, rows, dividers, and one framed tool only where interaction needs containment.
- Keep body text at a readable measure; do not stretch paragraphs across wide screens.
- On desktop, give the executable list more width than supporting context. A compact date navigator or context rail must not create a blank column as tall as the full list.
- On mobile, keep one vertical action path: promise -> input/next action -> compact plan -> optional context -> portability.
- Use one primary CTA per state. Source, creator, and export actions stay secondary.

## Route implications

### `/`

- Lead with URL or memo intake as the concrete first action.
- Show representative starts as varied content archetypes, not repeated identical cards.
- Keep the page an entry surface, not a second catalog.

### `/flows`

- Treat hit, miss, draft, and catalog as states of one intake workspace.
- A hit should show the natural artifact preview first; controls follow the archetype.
- A miss should lead to an honest editable draft, not an AI demo or production queue language.

### `/my`

- Follow Things/Todoist's focus rule: today and overdue actions first, project inventory second.
- Preserve the Flow identity beside each task without repeating full progress or metadata in every row.
- Open personal edit controls in place or in one focused detail panel.

### `/calendar`

- Follow Apple/Google's density split: month grid is a date navigator, selected-day agenda owns readable task detail.
- Flow color/marker identifies origin; row title and completion are the dominant content.
- Do not repeat Flow name, date, timing, and progress in both group header and row.

### public `/f/[slug]`

- This is the first major redesign target.
- Replace the generic all-artifacts stack with an archetype-led execution preview.
- On wide screens, do not place a full-height empty month grid beside a narrow long list.
- Save the whole Flow as the primary action. `가져가기` is one secondary entry; source and creator context follow the execution preview.

## First redesign slice

1. Define shared tokens and view primitives without changing the data model.
2. Refactor public `/f` into `promise`, `setup/now`, `primary artifact`, `supporting context`, and `portability` bands.
3. Render timeline, checklist, routine, record, decision, and itinerary representatives through the same contract.
4. Verify mobile 390px and wide 1024px with at least one route per archetype.
5. Then reuse the primitives in My Flow and Calendar instead of restyling those screens independently.

## Current evidence limitation

Automated guardrails and source-currentness checks prove text and behavior constraints, not visual quality. The latest 1024px computer-study screenshot has no overflow but still fails visual balance: the calendar column is mostly empty while the execution list is narrow and wraps excessively. Future evidence must record visual hierarchy findings, not only zero-count technical markers.
