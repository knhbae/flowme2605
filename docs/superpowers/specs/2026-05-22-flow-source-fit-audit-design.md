# FLOW Source Fit Audit Design

## Background

FLOW has grown from a few representative execution pages into a mixed catalog of seed Flows, real-source conversions, exact-video mini Flows, and generated channel previews. The current UX review process checks whether a finished Flow page is understandable, but it does not answer the earlier product question: whether the original source content should become a Flow at all.

This design adds a source-fit audit layer before UX review. The audit decides whether a source has enough executable structure to justify conversion into calendar, todo, sheet, memo, comparison, or routine views.

## Product Goal

When a user arrives from a blog, video, or creator channel, FLOW should make them think:

- "This is the thing I just read or watched."
- "The work is already organized into actions."
- "With a little input, I can put this into my calendar, todo list, sheet, or memo."
- "I can come back tomorrow and keep going."

The app must avoid turning every article, video, or homepage into a public Flow. A source is worth Flow conversion only when the user would naturally need to manage it outside the source itself.

## Source Fit Rubric

Each source receives a 0-100 score.

| Dimension | Max | What It Measures |
| --- | ---: | --- |
| Action density | 15 | The source contains concrete actions, decisions, or checks rather than only opinion or inspiration. |
| Temporal structure | 15 | The source has dates, D-day offsets, phases, recurrence, deadlines, or a clear ordering. |
| External management need | 20 | A user would naturally move the content into a calendar, todo app, sheet, memo, checklist, or comparison table. |
| Completion clarity | 15 | Each action can have a visible done condition. |
| Personalization need | 10 | The user must adapt the source with dates, frequency, budget, candidates, materials, notes, or constraints. |
| Return value | 10 | The user benefits from revisiting the Flow after first read/watch. |
| Source specificity and trust | 10 | The source is exact and credible enough to anchor the Flow. Broad channel pages score lower. |
| Risk boundary clarity | 5 | Official, creator, reference, health, legal, financial, or safety boundaries can be separated clearly. |

Decision bands:

| Score | Decision | Public Handling |
| ---: | --- | --- |
| 80-100 | Keep representative | Can appear as a representative Flow after UX review. |
| 60-79 | Reshape before featured | Keep accessible, but fix source, content, or UX before promotion. |
| 40-59 | Catalog preview only | Do not present as representative; keep only as preview or direct-access candidate. |
| 0-39 | Hide from public catalog | Remove from public catalog until a better source or user job exists. |

## Content Type Reconstruction Models

### Timeline

User reconstruction:

1. User reads a D-day or deadline article.
2. User identifies the anchor date.
3. User maps offsets into calendar dates.
4. User checks tasks by date and records notes.
5. User exports calendar events, a sheet, or a memo checklist.

Required FLOW UI:

- Anchor date input.
- Full list visible early.
- Agenda/month calendar view.
- Source card.
- Export to calendar, sheet, memo, todo.

### Checklist

User reconstruction:

1. User reads a "things to check" article.
2. User prints, copies, or screenshots the list.
3. User checks items in context.
4. User writes notes and evidence.
5. User exports to sheet or memo.

Required FLOW UI:

- Full checklist visible on first screen.
- Clear checkboxes.
- Notes and skip.
- Optional sections.
- Sheet/memo/todo export.

### Routine

User reconstruction:

1. User watches a routine video or reads a habit plan.
2. User chooses start date and days of week.
3. User sees occurrences in a weekly or monthly calendar.
4. User performs the session and checks it off.
5. User handles missed sessions without rebuilding the plan.

Required FLOW UI:

- Start date.
- Weekday/frequency controls.
- Monthly calendar preview.
- Session list.
- Calendar export.
- Missed-session rule.

### Program

User reconstruction:

1. User reads a 30-day, 4-week, or exam plan.
2. User chooses target date or start date.
3. User maps phases, sessions, or chapters into time blocks.
4. User tracks progress and review points.
5. User exports calendar and sheet tracker.

Required FLOW UI:

- Timeline plus routine sessions.
- Chapter/session progress.
- Weekly and monthly views.
- Review milestones.

### Decision

User reconstruction:

1. User reads a buying, vendor, or choice guide.
2. User creates candidates.
3. User compares criteria.
4. User records evidence and questions.
5. User exports a comparison sheet or checklist.

Required FLOW UI:

- Candidate input.
- Comparison table.
- Evidence notes.
- Checklist.
- Sheet/memo export.

### Meal Plan / Phase

User reconstruction:

1. User reads a plan with phases, days, ingredients, or reactions.
2. User chooses start date.
3. User maps slots into dates.
4. User records reactions or outcomes.
5. User exports calendar, sheet, and memo notes.

Required FLOW UI:

- Start date.
- Calendar or agenda.
- Recipe/details.
- Reaction log.
- Safety/source boundaries.

## Initial Audit Scope

The first batch audits the representative public set because these pages shape the first product impression:

- `moving-d30-basic`
- `baby-food-menu-recipe`
- `home-workout-20min`
- `job-change-risk-check` is not representative but remains a migration reference.
- `overseas-travel-d14`
- `study-exam-d30-plan`
- `english-study-30day-routine`
- `used-car-buying-check`
- `car-care-monthly-routine`
- `wedding-d180-basic`
- `running-5k-4week`

For this first implementation, public deletion is not automatic. Audit decisions are exposed in the Flow Lab and documentation first. Public demotion/hiding should happen in the next batch after reviewing the effect on landing, creator pages, and route availability.

## Source Review Notes

Sources checked on 2026-05-22:

- AJD moving checklist: exact D-day table with Excel, PDF, and Notion artifacts.
- Ohprint wedding checklist: exact wedding checklist surfaced by search snippet; direct page has crawler limitations but content is indexed with D-300/D-180/D-90 sections.
- Drive Insight used car checklist: exact stepwise inspection article.
- EnglishFact English tips: broad study advice and routine tips, not a direct exam D-30 source.
- New English 30-day self-study article: exact 30-day routine with weekly progression.
- ThankyouBUBU channel: broad creator channel, not an exact video source for the 20-minute routine.
- Car maintenance Tistory article: exact checklist-like article with intervals and tools, but includes strong savings claims and DIY risk.
- Runday homepage: broad app homepage, not an exact 5 km 4-week plan source.
- Baby food Tistory article: exact downloadable calendar and recipe sequence, but needs official/medical caution supplementation.
- Passport site: official passport source, but the travel Flow covers broader visa/safety/airport tasks than that single page.

## App Implications

Immediate:

- Add source-fit audit records for the representative batch.
- Show source-fit score, decision, and main gap in Flow Lab.
- Keep current routes accessible.
- Do not remove or demote public Flows in this slice.

Next:

- Demote catalog entries whose source fit is below 60.
- Replace mismatched sources before representative exposure.
- Add exact video/source alternatives for broad-channel routine Flows.
- Make calendar/month views and routine recurrence visible for timeline, routine, and program Flow types.
- Define a public removal checklist for low-fit generated previews.

