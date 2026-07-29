# Flow Content UI Full-Corpus Validation & Planning Handoff Lab v1

- Status: Internal implementation and QA complete — direct user review pending
- Date: 2026-07-29
- Scope: standalone docs harness, derived corpus/view model, projection and
  interaction previews, internal review, planning handoff
- Production app/runtime/DB/API: unchanged
- Final browser QA: `PASS`
- Local user review state: `NOT_REVIEWED_BY_USER`
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

## 1.1 Current machine-readable snapshot

The current generated snapshot contains:

- 156 Gallery records;
- 110 normal Product/Structure records;
- 91 existing/inherited normal records plus 19 distinct normal records added
  from 24 directly inspected new URLs;
- 893 canonical Items;
- 1,172 SourceRows;
- 550 explained projection cells;
- 16 pacing fixtures; and
- 14 event interaction fixtures.

One boundary record and 45 historical previews remain visible but do not count
toward the 110 normal records. These counts come from the JSON artifacts, not
from hand-entered report markup.

Of the 24 newly inspected URLs, 22 passed the normal source/structure gate. The
remaining difference is intentional: three normal sources reverified an
existing `canonical URL + user job` and were merged instead of counted as new
content.

The snapshot is implementation and internal-review evidence. It is not an
approved product default, observed-user validation, or external Calendar
compatibility proof.

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
#exclusions
```

## 9. Review boundary

Two independent internal-agent reviews inspect Item granularity, primary
projection, Checklist/Todo semantics, pacing suitability, content value and UI
understandability. They are kept separate from local user review.

The final A2/B2 runs each cover all 110 normal contents and record the same
frozen Gallery, view-model and projection-result fingerprints. Their normalized
agreement rates are 88% for Item granularity, 72% for primary-projection
suitability, 95% for Checklist/Todo semantics, 66% for schedule suitability,
52% for content value and 46% for UI understandability. Only 6/110 records
match across all six verdicts plus both concrete projection choices. This low
exact match is retained as a planning signal rather than hidden by averaging.

The independent reviews inspected Gallery SHA
`9be4105dcf5a62a82dc31ddc3a6b37acaa87b9e886d70d27c9fc5f979c1d7d0b`.
After synthesis and source-field/tier/display normalization, the final Gallery
SHA is
`021667d19d042a5dfd418f3dbcbf553fd871a08b0fd47703fe716538419aaf56`.
The independent review was not rerun and is not described as byte-identical
review of this final surface. Its 110 content IDs and 550 projection judgments
remain frozen internal evidence; the final normalization was instead checked
through exact semantic-queue reconciliation and a new full browser pass.

Every local user state begins as `NOT_REVIEWED_BY_USER`. Screenshots, browser
QA, agent agreement and validator success are not observed-user validation.

The independent-review output is an internal reading of the frozen corpus and
review surface. Its disagreement counts identify rules that need inspection;
they do not substitute for the user's direct review in the Gallery.

### 9.1 Manual semantic provenance boundary

The deterministic provenance audit left 141 title/detail fields in a
`trace_only_semantics_unverified` queue. A separate manual adjudication compared
all 141 fields across 26 contents with their frozen linked SourceRows:

- `verified_equivalent`: 37;
- `bounded_normalization`: 87;
- `needs_modify`: 17;
- `unknown`: 0.

The 17 modifications are field-level keys across 11 contents, not 17 distinct
contents:

- `canonical:base-moving-d30` — 5;
- `canonical:base-opic-plan` — 2;
- `canonical:oq-oq-b03-remodel` — 2;
- `canonical:base-new-car-comparison` — 1;
- `canonical:oq-oq-c08-ac-decision` — 1;
- `canonical:oq-oq-p03-vehicle` — 1;
- `legacy:preapp:interview-d1-check` — 1;
- `legacy:preapp:license-class1-medical-check` — 1;
- `legacy:preapp:license-class2-renewal` — 1;
- `legacy:round2:personal-business-registration-flow` — 1;
- `generalization:GB-03` — 1.

Repeated causes include hidden critical SourceRows, misleading mixed-action
labels, unsupported actions or future timeframes, projection rationale
replacing source detail, narrowed official routes, user overlay mixed into a
source Item, hidden conditional branches, and hidden safety instructions.

This closes the 141-entry manual queue but does not prove zero invention for
the full corpus. Completion owner/derivation remains unencoded for 412 fields
and schedule owner/derivation for 124 fields. The combined
`zeroInventionClaim` is `NOT_PROVEN`.

## 10. Deliverables and current gate

Primary review surfaces:

- `docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html`
- `docs/content-audit/2026-07-29-flow-content-ui-full-corpus-validation-review-v1-ko.html`

Five-minute handoff:

- `decision-summary-ko.md`

Machine-readable planning evidence:

- `planning-decision-handoff-v1.json`
- `content-and-logic-gap-register-v1.json`
- `semantic-provenance-audit-v1.json`
- `semantic-provenance-manual-adjudication-v1.json`
- `validation-results-v1.json`

All planning decisions remain `DRAFT_PENDING_USER_REVIEW`. Final browser QA is
`PASS`, the integrated validator is 61/61 and targeted tests are 14/14. These
include the manual semantic adjudication and final fingerprint contracts.
Observed-user validation and external Calendar/VTODO round-trip remain
`NOT_RUN`.

## 11. Out of scope

- production routes or app UI;
- runtime types and export APIs;
- DB migration, crawler, production LLM API;
- actual Calendar account integration;
- rights/publication workflow redesign;
- commit, push, PR, merge or deploy.
