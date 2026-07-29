# Flow Canonical Conversion Rules v1

**Date:** 2026-07-28  
**Status:** Planning/backend contract; runtime not implemented  
**Base contracts:** Canonical Flow Data Model v1 + Taxonomy v1.1

## 1. Decision in one sentence

```text
One primary source
→ traceable SourceRows
→ independently stateful Items
→ semantic Step/Flow/Map grouping
→ destination-specific projections
```

`Item` remains the canonical minimum execution unit. Calendar, ICS,
Checklist, Todo, Sheet, and Memo remain projections. This corpus does not
replace canonical v1 with an ICS-first model.

## 2. What this contract adds without changing canonical v1

The corpus needs more conversion evidence than the published canonical content
document should carry. Therefore it uses two conversion-audit sidecars:

1. **SourceRow accounting:** every SourceRow is mapped to Item, Field, Memo, or
   an explicit omission.
2. **Property-level provenance:** action title, detail, completion, schedule,
   condition, dependency, and source-filled Field values each state which
   SourceRows support them.

Canonical `SourceReference` remains the entity-level relation used by the
content model. The audit sidecars explain *which property* the evidence supports
and *how* a row was merged or split. They are not user-facing content and do not
enter exports.

## 3. Source intake and hard stops

### 3.1 A complete structure fixture requires

- one bounded user job;
- one primary source that controls the Flow structure;
- a named source document or snapshot/evidence packet;
- stable SourceRow IDs, order, locators when available, and captured facts;
- at least one source-backed Item;
- accounting for every captured SourceRow;
- a natural non-invented completion and projection.

### 3.2 Stop instead of completing the fixture when

- required source rows are not available;
- access restrictions would need to be bypassed;
- a useful Flow requires invented actions, dates, recurrence, or completion;
- provenance cannot be retained; or
- unrelated sources must be blended to create the job.

If several independent sources are individually useful, make one Flow per
source and evaluate a higher Flow Map. Do not silently blend their rows.

### 3.3 Structure research is not promotion review

Sensitive subject matter is not a structural stop by itself. The research
fixture keeps only:

- `sourceAccessStatus`;
- `researchUseStatus`;
- `reviewFlags[]`;
- `publicReadiness: "not_assessed"`;
- `observedAt`.

Rights, medical, legal, locale, safety, and public-promotion decisions remain
separate review work. A structurally valid fixture is not automatically safe or
cleared for public use.

## 4. SourceRow contract

A SourceRow is the smallest captured source fact that can be independently
located or accounted for. It needs:

- stable `sourceRowId`;
- `sourceId` and snapshot/evidence packet identity;
- controlled row type;
- source order;
- title or structured fact;
- optional detail and locator;
- observed timestamp through its source evidence record.

Do not split prose merely to increase row count. Use the smallest row boundary
that preserves the source's own checklist row, table row, lesson, date, offset,
procedure instruction, decision criterion, resource, or reference fact.

## 5. SourceRow → Item/Field/Memo/omission

### 5.1 One row → one Item

Use when the row contains one action or decision worth independent completion.

Example: one curriculum lesson row becomes one progress Item.

### 5.2 Many rows → one Item

Merge when the rows describe one user action whose parts should not have
independent state.

Allowed reasons:

- several ingredients/details support one cooking session;
- several criteria support one compare/decide action;
- several preparation facts support one bounded visit or application action.

The Item keeps every contributing SourceRow ID. The mapping sidecar records
`many_to_one` and the merge reason.

### 5.3 One row → many Items

Split only when the source row explicitly contains several independently
completable actions. Each child Item points to the same SourceRow, and the audit
sidecar records the exact source fragment or property that supports each split.

Do not split a general sentence into artificial actions.

### 5.4 Many rows → many Items

Use only when the source exposes a row group containing several explicit actions
and each Item legitimately depends on more than one row. Store the full N:M
mapping; never reduce it to one guessed "representative" row.

### 5.5 Row → Field

Use a Field when the value is needed for schedule, sort, filter, record, export,
or generation but is not itself a checkable action.

Source-filled Fields use `valueSource: "source"` and are never asked from the
user again. User-owned setup or run values use `valueSource: "user"`.

### 5.6 Row → Memo

Use Memo for method, quantity, link, context, creator experience, caution,
exception, or explanation that should travel with an Item but should not own
completion.

### 5.7 Omission

Omit only with a reason:

- out of the bounded user job;
- duplicate within the same snapshot;
- descriptive only and already retained in a parent Memo;
- unsupported/private detail not allowed in this fixture;
- incomplete fragment that cannot be converted without invention.

An omitted row has zero Item/Field/Memo targets and a non-empty reason.

### 5.8 SourceRows with zero Items

Do not create a synthetic Item merely to make every fixture executable. A
source such as a form/template may define only typed Fields. It is stored as
`structure_only_no_items`, keeps every SourceRow→Field/Memo mapping, and may
project a Sheet of field definitions. It is not an executable Flow until a
source-backed or explicit user action creates an Item.

The zero-Item exception is valid only when:

- one or more Field or Memo entities remain;
- the selected non-Calendar projection contains those entities;
- no Calendar projection is selected;
- the review/DTO decision explicitly says `structure_only_no_items`.

## 6. Property-level provenance

Every generated Item must trace at least these properties:

- `title`;
- `detail` when present;
- `completion`;
- `schedule` when present.

Trace these when present:

- `optional`;
- `conditions`;
- `dependencies`;
- `location`;
- source-filled Field defaults;
- Memo text.

Each provenance record contains:

- target entity and JSON-path-like property path;
- one or more SourceRow IDs, or an explicit `user_request`;
- support level: `direct`, `creator_interpretation`, `user_request`, or
  `inferred_draft`;
- transformation: `copy`, `normalize`, `merge`, `split`, `derive`, or `omit`;
- a short non-empty explanation for `merge`, `split`, `derive`, and `omit`.

`inferred_draft` is never sufficient for a complete research fixture. A derived
schedule is allowed only when its formula and every operand have source/user
provenance.

## 7. Item, Field, and Memo boundary

### Item

Create only for an independently stateful execution, inspection, decision,
record, or resource-use action.

Required:

- stable ID and parent Step;
- action-first title;
- intent;
- completion;
- order;
- one or more SourceRefs;
- property provenance for title and completion.

Optional:

- detail;
- schedule;
- Fields and Memos;
- caution;
- source-explicit optionality, condition, dependency, or location.

### Field

Create only when a typed value is necessary for schedule, filtering, recording,
export, or future generation. A Field never becomes a fake task.

### Memo

Keep explanatory and caution content as Memo. “Read this caution” is not an Item
unless acknowledgement is itself the real user job.

## 8. Intent, completion, and execution state

### 8.1 Intent

Use exactly one canonical intent:

- `act`;
- `inspect`;
- `decide`;
- `record`;
- `use_resource`.

“Consume” is represented as `use_resource`; it is not a new free-text intent.

### 8.2 Completion

Use exactly one completion mode:

- `check`: an action or resource use has a source-backed `doneWhen`;
- `decision`: a source-backed choice is recorded;
- `record`: required Field values are captured.

Do not invent a new success condition. The product may apply a controlled
system grammar such as “원문 설명대로 마쳤다” to a source-backed action, but
the audit must distinguish that system wording from the source fact and retain
the supporting SourceRows. When a meaningful completion cannot be supported,
stop or keep the row as Memo.

### 8.3 Runtime state

`pending`, `done`, `skipped`, and `held` belong to the personal execution run.
They do not change the published Item. “Park” or conversion `hold` belongs to
conversion/review state, not Item intent.

Recurring Items keep state per `(itemId, occurrenceKey)`.

## 9. Schedule rules

`Item.schedule` is authoritative. Step titles, row order, “week 1,” and visual
grouping do not create calendar dates by themselves.

- `absolute`: only a source date or user-owned date.
- `date_window`: retain the interval and at most one explicit reminder
  occurrence.
- `anchor_offset`: retain the named anchor, offset, and provenance.
- recurrence: structured cadence attached to a supported schedule.
- no schedule: omit `schedule`; never make a VEVENT.

Sequence day, age/month index, week number, or lesson order stays order/grouping
metadata unless a source/user anchor can resolve it to a real schedule.

Conditional due dates are not silently encoded as absolute dates. Until a
source-explicit trigger rule is represented and resolved, keep the Item undated
with its condition in the audit sidecar/Memo. The exact canonical condition
model remains open.

## 10. Optional, condition, dependency, and shared context

Canonical v1 has no first-class optional/condition/dependency entities. This
corpus may record them in the conversion-audit sidecar only when explicit in the
source.

- `optional`: boolean plus SourceRow support; it changes inclusion default, not
  completion semantics.
- `condition`: simple source-explicit predicate and affected Item IDs; prose or
  medical judgment stays Memo.
- `dependency`: a directed edge between existing Items; no cycle; default
  interpretation is “finish before start.” A numbered row or visual order alone
  never creates a dependency; the source must explicitly describe a procedure
  or prerequisite, and the dependency keeps its SourceRef.
- shared context: bind repeated anchor/target/location values without moving
  completion away from Item.

Promotion of any of these sidecar shapes into canonical core remains an open
planning decision. A persistent cross-Flow `SharedContext` entity is not adopted
until independent fixtures demonstrate a common need beyond ordinary Flow setup
Fields.

## 11. Step, Flow, and Bundle/Map creation

### Step

Create a Step when two or more Items share source semantics such as one period,
phase, week, procedure group, row group, or user moment. A single-Item Step is
valid when it preserves a meaningful source group. Step never owns completion.

### Flow

Create one Flow for:

- one bounded user job;
- one primary source;
- one primary natural artifact;
- at least one Step and Item.

The `structure_only_no_items` template exception may keep a zero-Step Flow
container solely to own Fields and projection metadata. It must not be reported
as an executable Flow.

A course with several lessons remains one Flow when progress through that
course is one job. Independent source programs or different terminal jobs become
separate Flows.

### Bundle / Flow Map

Create a Map only when child Flows are independently usable but should be
discovered or started together as variants, stages, or a source-defined family.
Map owns no Item state and does not become an iCalendar component.

## 12. User input rules

Ask before first execution only for values required to instantiate the artifact:

- a missing user anchor;
- one source-required user choice;
- exceptionally, anchor plus one choice.

Do not ask for:

- source URL, title, publisher, source date, source cadence, or source rows
  already captured;
- source-filled Field values;
- optional memo, location, or advanced export setting.

Separate:

- `requiredBeforeStart`;
- `optionalBeforeStart`;
- `autoFilledFromSource`;
- `capturedDuringRun`;
- `neverAskAgain`.

## 13. Creator, user, run, and review layers

1. Immutable source and source snapshot/evidence packet.
2. Versioned creator/published canonical content.
3. Conversion-audit sidecars.
4. User copy and personal overlays.
5. Execution run and occurrence state.
6. Projection request and generated artifact.
7. Internal structure/promotion review sidecars.

A creator edit creates a new content version. A user title, schedule, inclusion,
or memo changes only the user copy. Run completion never rewrites either source
or published content.

User-added private Items need a separate user-owned Item contract; canonical v1
does not yet provide a complete add/delete model. Until that contract exists,
`included: false` hides a published Item without deleting its history.

## 14. Projection selection

Choose the primary artifact whose loss would make the user job fail:

1. real date/time control → `calendar`;
2. bounded completion set → `checklist`;
3. open next-action queue → `todo`;
4. stable row/status/record schema → `sheet`;
5. retained guidance/context → `memo`.

New canonical data never persists `hybrid`. Put additional useful outputs in
`secondaryArtifacts`.

Calendar policy:

- default `per_item`;
- allow `step_bundle` only when child Items share one effective schedule and
  one user moment;
- keep all child Item IDs and declare independent-completion loss;
- otherwise use `none`.

VTODO is optional only after destination capability confirmation. Because
Google/Outlook/Apple VTODO and relation round-trip is not proven, use
Checklist/Todo/Sheet/Memo as the default fallback.

## 15. Projection loss record

Every generated projection records:

- target and format;
- included entity/Item IDs;
- omitted properties;
- loss severity: `none`, `display_only`, `state_not_round_trippable`, or
  `unsupported`;
- fallback target;
- whether the artifact can own completion;
- external interoperability status.

Review metadata, rights notes, extraction internals, and private values never
enter public/user export unless the user explicitly owns and requests the value.

## 16. Conversion completion checklist

- [ ] one user job and one primary source;
- [ ] every required row captured;
- [ ] every SourceRow accounted for;
- [ ] every Item title/completion/schedule traced at property level;
- [ ] no invented action, date, recurrence, or completion;
- [ ] no source value requested again;
- [ ] Item/Field/Memo boundary justified;
- [ ] Step/Flow/Map references resolve;
- [ ] primary artifact is one of the five Taxonomy v1.1 artifacts;
- [ ] undated VEVENT count is zero;
- [ ] VTODO fallback and projection loss are explicit;
- [ ] `publicReadiness` remains `not_assessed` for this structure corpus;
- [ ] automated checks are not described as user validation or external
  calendar interoperability.
