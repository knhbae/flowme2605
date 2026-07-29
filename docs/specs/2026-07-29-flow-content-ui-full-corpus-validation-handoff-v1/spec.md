# Flow Content UI Full-Corpus Validation & Planning Handoff Lab v1

- Status: Active implementation
- Date: 2026-07-29
- Scope: standalone docs harness, derived corpus/view model, projection and
  interaction previews, internal review, planning handoff
- Production app/runtime/DB/API: unchanged
- Observed-user validation: `NOT_RUN`
- External Calendar/VTODO round-trip: `NOT_RUN`

## 1. Goal

Build a source-backed, interactive FlowMe-shaped review environment that lets a
reviewer open every included content job, inspect every Item, compare five
projections, try personal pacing, inspect event occurrences and provenance, and
record local feedback.

The lab must not approve the canonical architecture from an explanatory score
alone. It uses the following chain as a frozen baseline and records repeated UI
failures as contract or generation-rule gaps:

`SourceRow → Item → Step → Flow → Bundle / Flow Map → Projection`

Calendar, ICS, Checklist, Todo, Sheet, and Memo remain derived projections for
this experiment. The lab may recommend changes but does not modify production
types or routes.

## 2. Corpus contract

The Gallery separates four evidence tiers:

1. `product_candidate`: source-complete content with a clear execution value;
2. `structure_probe`: source-backed content useful for a structural question;
3. `boundary_control`: minimal stop/rights/locale/safety controls;
4. `historical_preview`: an older preview whose current source contract is not
   complete enough to count as normal validation.

The default Gallery filter is `product_candidate`. Boundary and historical
records never count toward the minimum normal corpus.

The minimum acceptance count is 80 distinct `canonical URL + user job` records
across Product candidate and Structure probe. The target is 100 or more
Gallery records without using title-only duplicates or invented SourceRows.

## 3. Frozen inputs

The implementation reads but does not rewrite:

- the 42-fixture canonical corpus from 2026-07-28;
- the 21-fixture Checklist/Todo and event corpus from 2026-07-29;
- earlier creator, qualified, benchmark, source-selection, and UX-preview
  artifacts;
- current runtime types and exporters only as a compatibility crosswalk.

Every input artifact is recorded with a relative path and SHA-256 hash.

## 4. Content modes

The derived view model uses a discriminated union:

- `flow_content`: SourceRows already mapped to canonical Items;
- `event_source_before_user_intent`: Series/Edition/Occurrence source facts
  exist, and an Item is activated only after attendance, booking, saving, or
  result-checking intent;
- `field_template_probe`: a source-backed row/field contract used to inspect a
  non-action tracking surface;
- `boundary_control`;
- `historical_preview`.

An Item count of zero is valid only for event source before intent, field
template probes, boundaries stopped before conversion, or explicitly labeled
historical previews.

## 5. Projection contract

Every normal content record has exactly five projection cells:

- Calendar
- Checklist
- Todo
- Sheet
- Memo

Each cell independently records:

- recommendation:
  `primary | secondary | optional | not_recommended`;
- availability:
  `available_now | available_after_user_overlay | unavailable`;
- fidelity:
  `lossless_or_low_loss | bounded_loss | misleading_or_prohibited`;
- generation state:
  `generated | preview_requires_overlay | prohibited`;
- destination capabilities, required input, preservation, property-level loss,
  fallback, and explicit record counts.

An overlay preview is not called an exported or confirmed schedule.

### Checklist

A closed, finite, omission-sensitive set in one situation, session, or goal.
Step grouping and source order are visible.

### Todo

Independent, reorderable or deferrable next actions/resources. When a
destination supports parent/subtask, Step may project to a parent and Item to a
subtask. A flat fallback must also exist.

### Calendar

Execution time, attendance, or an explicit source date/window. A due-only Item
is not automatically time blocked. An undated source Item receives no
source-derived VEVENT.

### Sheet

Stable, typed Item/Occurrence rows and columns with IDs and provenance.

### Memo

A human-readable TXT/Markdown document projection. It is never canonical raw
JSON.

## 6. Personal pacing

Pacing is stored on a UserFlowCopy overlay:

`draft preview → user confirmation → pacing policy → derived personal schedule`

It supports start date, daily/weekly rate, target end date, allowed weekdays,
rest days, preferred time/all-day, per-Item/session bundle, and Todo
due/Calendar output.

The generator must assign each target Item exactly once, preserve source order
and dependency, leave source schedules untouched, and recalculate only future
unfinished assignments after a policy change.

## 7. Event intent

Event UI uses:

`Series → Edition → Occurrence / Window / Milestone → user intent → Item`

It preserves ticket/application windows, showtimes, place/URL, cancellation and
reschedule status. An annually reannounced event is not represented with a
fabricated yearly RRULE.

## 8. Interactive UI

The standalone harness provides:

- searchable, filterable Gallery with list/card views and next-unreviewed;
- complete Flow detail with all Steps, Items, details, completion, sourceRefs,
  schedules, conditions and locations;
- five real projection renderers and explained unavailable states;
- pacing playground with before/after comparison;
- event series/edition/occurrence selection;
- data-structure mode for actual per-content nodes, fields and provenance;
- local user review with JSON export/import and corpus fingerprint checking;
- coverage, exclusion, loss, mismatch and direct-link views.

Recommended hash routes:

```text
#gallery
#content/{contentId}
#content/{contentId}/projection/{calendar|checklist|todo|sheet|memo}
#content/{contentId}/pacing
#content/{contentId}/event
#content/{contentId}/lineage
#content/{contentId}/review
#coverage
```

## 9. Review boundary

Two independent internal-agent reviews inspect Item granularity, primary
projection, Checklist/Todo semantics, pacing suitability, content value and UI
understandability. They are kept separate from local user review.

Every local user state begins as `NOT_REVIEWED_BY_USER`. Screenshots, browser
QA, agent agreement and validator success are not observed-user validation.

## 10. Out of scope

- production routes or app UI;
- runtime types and export APIs;
- DB migration, crawler, production LLM API;
- actual Calendar account integration;
- rights/publication workflow redesign;
- commit, push, PR, merge or deploy.

