# FlowMe Item·Map Architecture Decision Criteria v1

**Date:** 2026-07-27<br>
**Status:** Evaluation contract; no architecture is selected by this file<br>
**Scope:** Creator portfolio category-fit lab only; no runtime, database, crawler, provider, or public-catalog change

## 1. Decision question

Choose the smallest canonical architecture that can preserve the same source-backed execution meaning across the creator portfolio without making Calendar/ICS the owner of unscheduled work, progress rows, decisions, evidence, or review state.

The lab compares one runtime baseline and three architecture contenders:

| Role | ID | Treatment |
| --- | --- | --- |
| Migration baseline | `runtime_baseline` | Measured for compatibility and migration impact only. It is not scored as an architecture contender. |
| Contender A | `current_canonical_v1` | Existing `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map` contract. Item schedule is authoritative. |
| Contender B | `literal_ics_first` | A standards-valid VCALENDAR graph using VEVENT, VTODO, VJOURNAL, UID, and RELATED-TO. Invalid component nesting is not permitted. |
| Contender C | `item_first_shared_context` | Item-first canonical graph plus reusable date/time/location/session/visit/anchor contexts and deterministic `effectiveSchedule`. |

`item_first_shared_context` is a hypothesis, not a preselected winner. The current canonical model remains the default if shared context does not create a material, safe reduction in repeated input or editing.

## 2. Frozen evaluation input

Before any contender output is generated, freeze the following for every case:

- one concrete user job;
- the primary source and immutable SourceRows;
- allowed and forbidden Items;
- Item completion meaning;
- source-defined schedules, recurrence, windows, and order;
- setup fields and which values are source, user, or derived;
- expected and forbidden projections;
- creator, provider, source owner, curator, and trust-anchor roles;
- rights, freshness, locale, safety, and privacy gates;
- existing `Go`, `Modify`, `Single`, or `Hold` judgment.

All contenders receive the same frozen input. A contender cannot gain points by changing the Item count, adding an action, inventing a date, weakening a caution, or asking the user to re-enter a source value.

The primary evidence corpus is the nine `representativeFlowExamples` in `2026-07-23-creator-flow-portfolio-data-v1.json`. Existing value-qualified cases are regression evidence, not a replacement primary corpus.

## 3. Hard gates

Any hard-gate failure makes the contender `ineligible` for a global recommendation, regardless of weighted score.

| Gate | Required result |
| --- | --- |
| Source fidelity | Invented action, date, recurrence, order, or completion criterion: `0`. |
| Provenance | Every source-derived Item has one or more valid SourceRefs reaching frozen SourceRows: `100%`. |
| State ownership | Item remains the minimum independently completable, decidable, recordable, holdable, or consumable unit. Map and Step do not own duplicate child completion state. |
| Source ownership | Each Flow has exactly one structure-controlling primary source. Supporting sources may add boundary or safety evidence, not silent actions. |
| Stop controls | `source_import_required`, rights, locale, sensitive, and insufficient-row controls stop correctly: `100%`. |
| Unscheduled calendar safety | An unscheduled Item creates no VEVENT and no invented calendar date. |
| ICS syntax | VEVENT, VTODO, and VJOURNAL are not nested inside one another. Only RFC-permitted VALARM nesting is allowed. |
| VEVENT schedule | Every VEVENT has an explicit DTSTART produced from source data or explicit user input. |
| Stable identity | Projection identity derives from stable Item ID plus occurrence key, never from title. |
| Effective schedule | Every scheduled Item resolves to one deterministic effective schedule. The shared-context contender records `effectiveSchedule` explicitly; current canonical derives it from Item schedule plus overlay precedence. Unresolved input remains unresolved and emits no VEVENT. |
| Bundle safety | `step_bundle` is used only when all bundled Items genuinely share one effective schedule and remain independently checkable. |
| Attribution | Creator, provider, source owner, and curator roles are independently recorded; platform does not silently become creator. |
| Sensitive boundary | Required rights, freshness, locale, safety, privacy, and trust-anchor facts survive or the projection is forbidden. |
| Loss accounting | Every evaluated canonical path is marked `direct`, `grouped`, `memo_fallback`, `omitted`, `forbidden`, or `not_applicable`. |
| Internal-data boundary | Provider/model/prompt, review score, rights notes, and extraction internals do not enter user artifacts. |
| Extension honesty | Meaning stored only in `X-FLOWME-*`, DESCRIPTION, or a non-interoperable sidecar is not scored as direct target support. |

RFC 5545 permits VEVENT, VTODO, and VJOURNAL components inside VCALENDAR and relates components through `RELATED-TO`; it explicitly disallows nesting VEVENT or VTODO in another calendar component. An undated VTODO is valid in the RFC, but target-client preservation must be verified per target and is not assumed.

## 4. Weighted criteria

Score each dimension from `0` to `5`. Weighted points are `dimension score / 5 * weight`.

| Dimension | Weight | A score of 5 requires |
| --- | ---: | --- |
| Source meaning and provenance | 20 | All SourceRows, omissions, source/creator/caution distinctions, and stable Item traces survive without invention. |
| Independent state and completion | 15 | Check, decision, record, hold, resource use, run, and occurrence semantics remain separately addressable. |
| Category and Map generality | 15 | The same contract handles all nine life areas and ordered, source-curation, unordered, and single-sensitive Map semantics without category-specific schema forks. |
| Natural projection and explicit loss | 15 | Calendar, checklist, todo, sheet, and memo use natural granularity; every loss is explicit and required boundaries travel. |
| User input and editing simplicity | 10 | Normal start requires 0–2 inputs; shared values are entered once; one-Item override does not mutate siblings. |
| External interoperability | 10 | Standard fields survive a parse/re-serialize test and target-specific claims are limited to tested capabilities. |
| Progress, condition, and decision support | 10 | K-MOOC-style progress, conditional response, resource queues, comparison, and sensitive windows remain structured rather than prose-only. |
| Runtime migration and rollback | 5 | Additive adapter, stable identity, ownership boundaries, and rollback are explicit; no destructive rewrite is required. |

Maximum score: `100`.

Essential dimensions are source meaning/provenance, independent state/completion, natural projection/loss, and progress/condition/decision support. A recommended contender must score at least `4/5` in each essential dimension.

## 5. Shared-context adoption test

`item_first_shared_context` is recommended over `current_canonical_v1` only if all of the following hold:

1. it passes every hard gate;
2. its total score is at least `80/100`;
3. no essential dimension scores below `4/5`;
4. across qualifying same-context cases, it reduces repeated date/time/location edits by at least `25%`;
5. every member Item resolves to the same expected schedule before overrides;
6. overriding one Item leaves every sibling Item unchanged;
7. context membership is based on the same execution situation, not merely the same creator, category, curation, collection, or coincidental date;
8. the extension can be introduced additively and projected back to current canonical Items without loss.

If the input reduction is smaller, ambiguous, or achieved by merging independent Item state, keep `current_canonical_v1`.

## 6. Literal ICS-first eligibility test

`literal_ics_first` may win only if it passes the common hard gates and additionally:

- SourceRow provenance, completion modes, typed Fields, cautions, overlay/run ownership, and Map semantics round-trip structurally;
- it does not depend on invalid nested VEVENT/VTODO components;
- it does not represent a Flow Map as a date-less parent VEVENT, VTODO, or VJOURNAL;
- required semantics are not recoverable only from DESCRIPTION or `X-FLOWME-*`;
- VTODO and RELATED-TO preservation is demonstrated for every claimed target;
- unscheduled checklists, source curation, unordered collections, and progress Sheets remain natural artifacts rather than forced calendar objects.

An RFC-valid file is not, by itself, proof of full FlowMe semantic round-trip or target-client interoperability.

## 7. Calendar policy decision

Every Flow or Step resolves one explicit policy:

| Policy | Use when | Forbidden when |
| --- | --- | --- |
| `none` | No source/user schedule exists, or Calendar would distort a sheet, resource queue, comparison, curation, or memo job. | A required source-defined date would be lost. |
| `per_item` | Each scheduled Item needs its own reminder, occurrence identity, or independent date override. | The source represents one real-world session and multiple events would create noise. |
| `step_bundle` | One real-world session/date contains several independent checks that must appear together in one event description. | Child Items have different effective schedules, recurrence, locations, or independent reminder needs. |

`step_bundle` changes Calendar granularity only. It never merges canonical Items or their completion state.

## 8. Loss-manifest rules

Allowed handling values:

- `direct`: the target has a natural structured field for the value;
- `grouped`: meaning survives but hierarchy or granularity is flattened;
- `memo_fallback`: meaning survives only as description, note, or document text;
- `omitted`: applicable artifact intentionally leaves out a non-essential path without changing execution meaning;
- `forbidden`: generation is blocked because the artifact would misrepresent meaning or lose a required boundary;
- `not_applicable`: no artifact should be generated for this Item or context.

Rules:

1. one canonical path receives exactly one handling value per target result;
2. `not_applicable` at result level requires a null artifact;
3. `forbidden` blocks artifact generation;
4. source URL, completion, caution, hold, and sensitive boundaries must travel when relevant;
5. internal review/provider metadata is always `forbidden`;
6. a DESCRIPTION or `X-FLOWME-*` fallback is never `direct`;
7. deterministic regeneration from the same effective state is required.

## 9. Decision procedure and tie-breakers

1. Reject contenders that fail a hard gate.
2. Compare total weighted score.
3. If scores differ by fewer than three points, prefer the contender with lower source/projection loss.
4. If still tied, prefer fewer required user inputs and edits.
5. If still tied, prefer lower additive migration complexity and clearer rollback.
6. Do not force one global winner when evidence supports a single canonical model with different projection policies. Category-specific projection profiles are allowed; category-specific canonical schemas are not.

Final judgments are:

- `Go`: passes gates and thresholds;
- `Revise`: semantic model is viable but a general contract defect remains;
- `Hold`: evidence or interoperability is insufficient;
- `Ineligible`: a hard gate failed.

## 10. Claim boundary

Schema parsing, round-trip fixtures, screenshots, and agent review are automated or internal QA. They are not observed-user validation. External account imports are `not_run` unless actually performed with explicit authorization, and parser success must not be described as Google, Apple, Outlook, Todo, Sheet, or Notion behavioral validation.

## References

- `docs/DECISIONS.md` — 2026-07-11 Item decision and 2026-07-12 backend decision
- `docs/specs/2026-07-11-canonical-flow-data-model/spec.md`
- `docs/specs/2026-07-12-url-to-flow-backend-readiness/spec.md`
- `docs/specs/2026-07-12-url-to-flow-backend-readiness/projection-loss-matrix.md`
- `docs/specs/2026-07-20-flowme-taxonomy-v1-1/spec.md`
- `docs/content-audit/2026-07-23-creator-flow-portfolio-logic-handoff-ko.md`
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html)
