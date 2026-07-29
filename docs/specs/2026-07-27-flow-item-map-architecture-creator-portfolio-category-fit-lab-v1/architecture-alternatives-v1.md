# FlowMe Item·Map Architecture Alternatives v1

**Date:** 2026-07-27<br>
**Status:** Test designs, not a final architecture decision

## 1. Shared semantic target

Every contender must preserve the same semantic graph:

```text
SourceRow -> Item -> Step -> Flow -> optional Flow Map
                  |
                  +-> completion / decision / record / hold / resource state
                  +-> optional schedule / fields / memos / caution
                  +-> Calendar / Checklist / Todo / Sheet / Memo projections
```

The shared target also separates:

- published source/content;
- internal review and promotion;
- user copy/overlay;
- execution run and occurrence override;
- creator, provider, source owner, curator, and trust anchors.

The three contenders may encode this target differently, but they cannot change the source rows, user job, Item boundary, minimum input, or review gates to make their structure look better.

## 2. Runtime baseline — comparison only

The current runtime uses `FlowBundle`, `Flow`, `FlowSection`, `FlowItem`, and `FlowItemDetail`.

Observed baseline characteristics:

- `category`, `structure_type`, `primary_destination`, and `FlowItem.type` contain mixed or compatibility meanings;
- `FlowItem.type` is `todo | calendar`;
- dates, offsets, date windows, repeat rules, details, cautions, and source fields are spread across runtime types;
- `SourceBackedMyFlowMap` is primarily an inventory/publishing bridge with child slugs, counts, one setup input, and map-level source metadata;
- first-class SourceSnapshot, SourceRow, SourceRef, typed completion, and general Field ownership are not complete runtime boundaries.

The baseline is measured for:

- automatic adapter coverage;
- values that require human review;
- stable identity and execution-history preservation;
- non-destructive rollback.

It is not the fourth contender and does not receive an architecture score.

## 3. Contender A — current canonical v1

### Structure

```text
Flow Map
  -> Flow (one user job, one primary source)
    -> Step (semantic/order group)
      -> Item (independent state)
```

Item owns:

- stable identity;
- action-first title and intent;
- completion mode;
- optional schedule;
- Field/Memo/caution references;
- SourceRefs.

Step owns grouping and order, not schedule authority or completion. Flow Map groups child Flows and owns no child execution state.

### Scheduling

`Item.schedule` is authoritative:

- `absolute`;
- `anchor_offset`;
- `date_window`;
- recurrence on supported schedules.

Repeated source schedule values may appear on several Items. A UI can still batch-edit them, but the canonical document does not contain a reusable shared-context entity.

### Projection

- scheduled Item -> `per_item` VEVENT by default;
- several Items sharing one real session -> validated `step_bundle`;
- unscheduled Item -> no Calendar artifact;
- checklist/todo -> Item rows grouped by Step;
- sheet -> Item/occurrence rows and typed Field columns;
- memo -> source/detail/caution fallback.

### Strengths

- already approved and backed by golden fixtures;
- stable SourceRow-to-Item provenance;
- independent state, version, overlay, run, and occurrence ownership;
- rich core remains independent from external formats;
- migration direction is already documented.

### Falsification conditions

Revise or reject this contender if representative same-context content requires repeated edits that cause material errors, if Step-bundle projection cannot be derived deterministically, or if the creator corpus cannot preserve Map semantics without ad hoc fields.

## 4. Contender B — literal ICS-first

### Standards-valid interpretation

This contender does **not** nest one ICS event inside another. It models one VCALENDAR object containing sibling components:

```text
VCALENDAR
  |- VEVENT   (scheduled event)
  |- VTODO    (to-do, optionally undated)
  |- VJOURNAL (memo/journal)
  `- VTIMEZONE / VALARM where RFC 5545 permits them
```

Relations use stable UID values and `RELATED-TO`. `X-FLOWME-*` properties may be emitted only as optional export metadata.

RFC 5545 boundaries:

- VEVENT, VTODO, and VJOURNAL cannot be nested in another calendar component;
- VALARM may be nested only where the component grammar permits;
- VEVENT represents an event and this lab requires DTSTART for every VEVENT;
- VTODO may omit DTSTART and DUE in the RFC;
- RELATED-TO records a component relationship, not a FlowMe state or hierarchy guarantee.

### Evaluation envelope

The contender schema contains:

1. the serializable VCALENDAR graph;
2. a source/provenance sidecar required for lab auditing;
3. an explicit Map-semantics sidecar because Flow Maps are not modeled as parent VEVENTs;
4. projection loss manifests.

The sidecars make loss visible; they do not turn those semantics into interoperable iCalendar fields.

The generated `runs/literal-ics-first/results-v1.json` stress form deliberately records the weaker implementation that was actually tested: MAP, FLOW, and STEP are emitted as sibling VJOURNAL components linked with `RELATED-TO`, while required canonical semantics are listed in `canonicalLimitations`. `literal-ics-graph-v1.schema.json` accepts that observed graph so the run can be validated without rewriting its evidence. Schema validity therefore means “well-formed candidate output,” not “architecture hard gates passed.” The VJOURNAL parent-graph dependency is adjudicated as loss and cannot become the recommended canonical contract unless the no-parent-ICS rule is satisfied.

### Mapping

| FlowMe meaning | Literal ICS-first representation |
| --- | --- |
| Scheduled Item | VEVENT |
| Unscheduled action Item | VTODO; target preservation remains unverified until tested |
| Memo | VJOURNAL or DESCRIPTION |
| Step/Map relation | RELATED-TO plus sidecar |
| Stable identity | UID derived from Item ID and occurrence |
| Completion | VTODO status/percent where applicable; other completion modes need fallback |
| Decision/record Fields | DESCRIPTION, X-property, or sidecar loss |
| SourceRows and rights/review | sidecar; never user Calendar content |

### Strengths

- uniform calendar-component vocabulary;
- standard UID and recurrence primitives for scheduled content;
- direct VEVENT serialization can be simple for calendar-first cases.

### Risks

- source curation, unordered collections, progress tables, compare/decide, typed records, and review ownership are not native iCalendar jobs;
- VTODO and RELATED-TO import behavior can vary and cannot be assumed from RFC validity;
- Map and Step semantics require sidecars or non-standard extensions;
- DESCRIPTION/X-properties can hide rather than preserve structured meaning;
- calendar identity may be mistaken for FlowMe execution ownership.

### Falsification conditions

This contender becomes ineligible when it needs schedule-less VEVENT, invalid nesting, invented dates, canonical identity stored only in X-properties, or prose-only preservation of required progress/decision/provenance semantics.

## 5. Contender C — Item-first shared context v1

### Structure

This contender keeps current canonical ownership and adds a reusable context reference:

```text
Flow / Step
  -> SharedContext (optional schedule/location/session/visit/anchor binding)
      -> member Item IDs

Item
  -> scheduleBinding: none | item | shared | shared_with_override
  -> effectiveSchedule: unscheduled | unresolved | resolved
```

SharedContext is not a parent Item, not a completion unit, and not an ICS component.

### Valid shared context

Use only when at least two Items share the same real execution situation:

- same date/time;
- same location;
- same session;
- same visit;
- same anchor from which schedules are calculated.

Do not create it merely because Items:

- have the same creator;
- belong to the same category;
- appear in one source curation or resource collection;
- are different child Flows;
- coincidentally resolve to the same date without a shared execution job.

### Effective schedule

The resolver applies ownership precedence before projection:

```text
occurrence override
-> user Item override
-> published Item binding
   -> item schedule OR shared-context schedule
-> unscheduled / unresolved
```

Every evaluation fixture records:

- `effectiveSchedule.status`;
- resolved schedule when present;
- source (`item_schedule`, `shared_context`, `item_override`, `occurrence_override`, or `none`);
- context ID when used;
- input Field IDs needed for resolution.

An unresolved anchor produces no VEVENT.

### Projection

Calendar policy is explicit and independent from context storage:

- `none`: zero VEVENT;
- `per_item`: one event/series per scheduled Item;
- `step_bundle`: one event for one shared real-world session, with child Items preserved as checks in the description and in FlowMe state.

A Flow Map is never exported as a parent event. Users may request a VCALENDAR bundle containing scheduled child Item projections, but Map identity and progress remain in FlowMe.

### Strengths

- retains SourceRow, Item, overlay, run, and version boundaries;
- can reduce duplicate entry and bulk date/location edits;
- preserves Item-level override and completion;
- can represent one shared visit/session without cloning context values.

### Risks

- adds referential-integrity and resolution complexity;
- unclear context scope can create surprising sibling changes;
- a context introduced for category/creator grouping would be semantic overreach;
- migration is not worthwhile if input/edit reduction is small.

### Falsification conditions

Keep current canonical v1 instead if context membership is ambiguous, effective schedules differ across resolvers, one override mutates siblings, round-trip needs destructive flattening, or qualifying cases do not reduce repeated input/edit actions by the frozen threshold.

## 6. Flow Map semantic kinds

The lab keeps four semantic kinds distinct:

| Canonical map type | Shorthand | Core rule |
| --- | --- | --- |
| `ordered_life_event_map` | ordered | Source defines meaningful child order or progression. |
| `source_curation` | source_curation | Curator chose the children; displayed order is not execution dependency unless separately evidenced. |
| `unordered_collection` | unordered | Child Flows are independent and no completion order is implied. |
| `single_sensitive_schedule` | single_sensitive | Exactly one sensitive Flow is wrapped with applicability/trust-review boundaries; it is not a creator-wide Map. |

An ordinary single Flow does not need a Flow Map. Legacy `single_flow` is normalized to `flow_only`, not promoted to one of the four Map types.

Map progress, when shown, is a derived view of descendant Item state. Map and child Flow do not store a second authoritative completion flag.

## 7. Attribution boundary

Each Flow records role-specific references:

- `creatorId`: actual author/video/recipe creator;
- `providerId`: distribution or hosting platform;
- `sourceOwnerId`: operator or rights owner of the source;
- `curatorId`: entity that selected several child sources;
- `trustAnchorRefs`: official or reviewed evidence for sensitive boundaries.

A role may point to the same entity, but role fields are never inferred from equality. Attribution is not rights permission. A multi-creator platform collection may be a curated Map, but each child Flow keeps its own primary source and creator; rows from different creators are not merged into one Flow spine.

## 8. Projection loss comparison

All three contenders emit the same handling vocabulary:

`direct | grouped | memo_fallback | omitted | forbidden | not_applicable`

Literal ICS-first receives no direct-support credit for data retained only in DESCRIPTION, `X-FLOWME-*`, or the lab sidecar. Current canonical and shared-context contenders receive no portability credit merely because their internal JSON retains a field; the target adapter must still state how it travels.

## 9. Expected evidence, not expected winner

Likely hypotheses to test:

- current canonical may remain best for single schedules, progress tables, source curation, and unordered resource queues;
- shared context may improve D-day, same-session, same-visit, and common-location cases;
- literal ICS-first may be concise for scheduled calendar cases but lose structured non-calendar semantics.

These are hypotheses only. The final recommendation follows `decision-criteria-v1.md` and may be:

- current canonical v1;
- current canonical plus shared context;
- literal ICS-first;
- Hold pending stronger evidence.

## References

- [RFC 5545 iCalendar](https://www.rfc-editor.org/rfc/rfc5545.html)
- `docs/specs/2026-07-11-canonical-flow-data-model/`
- `docs/specs/2026-07-12-url-to-flow-backend-readiness/`
- `docs/specs/2026-07-20-flowme-taxonomy-v1-1/`
- `docs/content-audit/2026-07-23-creator-flow-portfolio-logic-handoff-ko.md`
