# Flow Projection Semantics·Scheduling·Event Corpus Lab v1

- Status: Active research implementation
- Date: 2026-07-29
- Scope: planning contract, fixtures, projection generator, validator, review report
- Runtime / DB / production API: unchanged
- External Calendar and VTODO round-trip: `NOT_RUN`
- Observed-user validation: `NOT_RUN`

## 1. Goal

Keep the current canonical chain:

`SourceRow → Item → Step → Flow → Bundle / Flow Map → Projection`

and make the semantics and generation rules of Calendar, Checklist, Todo, Sheet,
and Memo explicit. Test those rules against the frozen 42-fixture corpus and an
additional event-and-boundary corpus grounded in directly inspected sources.

The lab must answer:

1. What makes Checklist different from Todo?
2. What does each projection preserve and lose?
3. When is a projection technically available but unnatural or misleading?
4. Where does user pacing such as “two lessons per day” live?
5. How are due dates different from calendar execution times?
6. What is the correct VEVENT/VTODO granularity?
7. How should festivals, performances, exams, occurrences, editions, and series
   coexist with FlowMe Items?
8. Does a fixed `Action → Checklist → Todo → Calendar` hierarchy outperform
   sibling projections?

## 2. Frozen baseline

The lab reads but does not rewrite:

- `docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/canonical-corpus-v1.json`
- 42 complete fixtures
- 55 Flow
- 225 Step
- 406 Item
- 484 SourceRow
- 144 scheduled Item
- 262 undated Item

Existing reports, runtime types, seeds, and export code remain untouched.

## 3. Canonical boundary

### 3.1 Item

An Item is the smallest source-grounded unit worth keeping independent state
for. A phrase is not split merely because it contains multiple verbs. Multiple
SourceRows may support one Item when they describe one completion judgment.

An Item may represent:

- an action,
- a decision,
- a record,
- a resource-consumption unit,
- a hold or occurrence-attendance intent.

### 3.2 Event source facts

Event information is not automatically a Todo. The lab uses:

`EventSeries → EventEdition → SourceOccurrence / AvailabilityWindow`

and creates or binds a user-owned Item only after a user expresses an interest,
booking, attendance, or result-checking intent. Source-explicit administrative
actions such as an application window may directly support an actionable Item.

### 3.3 User overlay

Source schedules and personal schedules are independent:

- source fact: source-owned date/time/window/recurrence;
- user overlay: confirmed personal anchor, pacing, selected showtime, reminder;
- system derivation: deterministic expansion from one of the above.

No source fact is overwritten by a user pacing policy.

## 4. Projection semantics

### Checklist

A closed, bounded, omission-sensitive group of Items inside one situation,
session, or goal. Step grouping and source order are preserved. It is natural
when the user asks “did I miss anything?”

### Todo

Independent, reorderable, deferable next actions or resources. Each task must
remain useful when taken out of its original list. An adapter may emit
`Step → parent task` and `Item → subtask`, but that hierarchy does not replace
the canonical Step and Item.

### Calendar

Execution time or attendance on a date/time axis. A due-only task is not turned
into a time-block VEVENT. Undated source Items do not receive source-derived
VEVENTs. Confirmed personal pacing may yield dated Todos or optional all-day
VEVENTs.

### Sheet

Stable typed rows and columns for comparing, tracking, filtering, importing, or
editing Item and Occurrence data. It preserves more fields than a prose export
but not all canonical relationships without explicit ID columns.

### Memo

A human-readable text or Markdown projection for understanding, copying, and
sharing. Memo is not canonical raw data. JSON/DTO remains the machine-readable
canonical representation.

## 5. Three independent projection axes

Every content/projection pair records:

1. recommendation: `primary | secondary | optional | not_recommended`
2. availability:
   `available_now | available_after_user_overlay | unavailable`
3. fidelity:
   `lossless_or_low_loss | bounded_loss | misleading_or_prohibited`

`recommended`, `eligible`, and `generated` are not synonyms.

## 6. Todo and Checklist decision

Use Checklist when all are true:

- the set is finite at creation time;
- omission matters;
- one context/session/goal gives the set meaning;
- grouping or order should be preserved.

Use Todo when all are true:

- Items remain meaningful independently;
- postponing, reordering, or adding Items is natural;
- completion order is not the source meaning, unless expressed as dependency;
- the user is managing a queue of next actions or resources.

Tie-breaker:

- if a fixed procedure must preserve order, use Checklist;
- if a lesson sequence is consumed over many days and each lesson is a unit of
  progress, use Todo as the execution queue and Sheet as the progress overview;
- if the user needs both, select one primary projection and mark the other
  secondary rather than merging their schemas.

## 7. Temporal intent

Supported temporal meanings are:

- fixed occurrence;
- all-day occurrence;
- time block;
- due deadline;
- availability window;
- application window;
- ticket open;
- anchor offset;
- source recurrence;
- user pacing assignment;
- manually selected date;
- no schedule.

Mapping is explicit. VEVENT represents a scheduled Item occurrence. VTODO
represents an independently actionable Item with optional DUE. VEVENT and VTODO
are siblings inside VCALENDAR and never nest. VALARM is emitted only from an
explicit reminder policy.

## 8. User pacing

Pacing is a `UserFlowCopy` overlay, never source content. The flow is:

`draft preview → user confirmation → pacing policy → derived personal schedule`

The scheduler must:

- assign each target Item exactly once;
- preserve source order and dependencies;
- avoid splitting Items;
- avoid replacing source schedules;
- recompute only future unfinished assignments after a policy change;
- be deterministic for identical inputs;
- avoid inventing duration or effort.

## 9. Calendar grouping

Supported policies:

- `none`
- `per_item`
- `session_or_step_bundle`

Bundling is allowed only when children share date/time, location or execution
context, and one user session. Every child Item ID remains in the export plan.
FlowMe retains individual completion state, and the external Calendar loss is
made explicit.

## 10. Architecture alternatives

### A. Current sibling projections

`Item → Calendar / Checklist / Todo / Sheet / Memo`

### B. Progressive wrapper hierarchy

`Action → Checklist → Todo → Calendar`

### C. Item canonical plus destination-specific grouping

Keep Item and Step canonical; create parent/subtask, checklist group, event
bundle, or row grouping only in the destination adapter.

The final verdict is calculated from the frozen fixture set and explicit
criteria. It is not copied from earlier architecture scores.

## 11. Evidence and claim boundaries

- New source fixtures are grounded in public pages directly inspected on
  2026-07-29.
- Search snippets alone are not used as SourceRows.
- Rights, availability, and freshness notes remain distinct from structural fit.
- Automated validation and independent agent classification are not
  observed-user validation.
- Google, Outlook, Apple Calendar, and VTODO client round-trips remain
  `NOT_RUN`.

## 12. Out of scope

- application UX changes;
- runtime type or exporter changes;
- DB migration;
- production crawler or LLM API;
- live Calendar account integration;
- rights/publication workflow redesign;
- observed-user validation;
- commit, push, PR, merge, or deploy.

## 13. Required gate answers

- **Stage fit:** This is a planning/data-contract gate before URL-to-Flow backend
  implementation. It clarifies what the backend may emit without changing the
  current app.
- **First user action:** The future user submits a source URL or selects saved
  content. If the source lacks a personal date or has multiple showtimes, the
  user confirms only the missing anchor, pacing policy, or occurrence.
  Completion is a generated projection whose every record traces to a
  SourceRow or confirmed user overlay.
- **Artifact destination:** Calendar, Checklist, Todo, Sheet, and Memo are
  sibling projections. JSON/DTO is the canonical machine representation.
- **Source/risk boundary:** Source schedules, user schedules, and system
  derivations have separate owners and provenance. Incomplete event details are
  held at the affected occurrence rather than filled from general knowledge.
- **Natural artifact:** Calendar for attendance/time, Checklist for a bounded
  session, Todo for an independent queue, Sheet for progress/comparison, and
  Memo for a readable handoff.
- **Service structure impact:** No route, component, persistence, runtime type,
  or exporter is changed. `docs/SERVICE_STRUCTURE.md` therefore does not need
  an implementation update in this lab.
- **Tooling and verification lane:** Flow content conversion rules guide Item
  boundaries; independent classifiers test decision reproducibility; the local
  validator and Playwright browser QA verify machine and visual artifacts.
- **Verification:** Generator replay, 42×5 matrix checks, pacing invariants,
  independent agreement, validator tests, docs checks, and 1440×900 / 390×844
  browser checks. External client round-trip and observed-user validation
  remain `NOT_RUN`.
