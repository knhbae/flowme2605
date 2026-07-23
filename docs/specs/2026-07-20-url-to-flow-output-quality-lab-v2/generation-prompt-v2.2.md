# URL-to-Flow generation prompt v2.2

You receive one blind source packet per case. Do not use a title, provider reputation or stated user job to fill rows that are not present in the acquired source range.

Return this chain in order:

```text
source completeness
→ generation disposition
→ one role for every SourceRow
→ four primary taxonomy axes
→ canonical entity plan
→ five projection availabilities
→ independent access/rights/freshness/locale/safety/privacy/promotion gates
```

## 1. Stop before classification when the source is insufficient

- `complete`: all rows needed for the bounded user job are present.
- `partial`: some execution rows are present but a known boundary is missing.
- `metadata_only`: title, counts or phase headings are visible but the execution rows are not.
- `missing`: no usable SourceRow was acquired.

`partial`, `metadata_only` and `missing` cannot become ready executable content. Use `source_import_required + no_proposal`, except a landing with no executable user job is `hold + rejected`.

Complete source does not imply public export. In this lab, keep `publicExportAllowed=false` unless the packet itself proves every rights, locale, safety, privacy and promotion gate is cleared.

## 2. Assign SourceRow roles before choosing an artifact

Every acquired row gets exactly one role.

- `item`: a user can intentionally act, inspect, decide, record or use it and observe completion.
- `field`: a stable value or user-entered value needed by another action or retained row.
- `memo`: decision rationale or context that must remain together as prose.
- `reference`: a rule, warning, scope note or explanatory fact that is consulted but not completed.
- `conditional_response`: an action that is active only when its stated trigger occurs.
- `omission`: a missing boundary or intentionally excluded source row.

Never turn a threshold, emergency trigger, warning, category heading or missing-row marker into a normal checkbox. A document may contain only two ordinary Items while preserving several conditions and references.

## 3. Choose the four primary taxonomy axes independently

### Source shape: anatomy of rows actually acquired

- `date_offsets`: actions grouped by relative distance from a user anchor.
- `date_window`: an explicit or user-supplied start/end window.
- `recurrence_rule`: the source states a repeated trigger or interval.
- `procedure_rows`: actions whose order matters.
- `checklist_rows`: a bounded omission-prevention list; order is not the main state.
- `lesson_rows`: course/week/lesson rows with learning state.
- `resource_collection`: independently consumable resources in a queue.
- `decision_criteria`: option or criterion rows used to make one decision.
- `narrative_guidance`: explanation mixed with thresholds, warnings or conditional responses.
- `table_rows`: stable rows whose columns are the main source anatomy.

Do not call visible metadata `lesson_rows`, `procedure_rows` or `template_fields` when the actual rows are missing.

### Execution pattern: state transition the user must complete or repeat

- `date_preparation`: anchor/window determines when preparation occurs.
- `ordered_procedure`: complete actions in a required sequence.
- `repeating_routine`: repeat only on a source-backed interval or trigger.
- `progress_tracking`: stable rows retain not-started/in-progress/done or measured state.
- `resource_queue`: select/consume resources and preserve queue position.
- `compare_decide`: compare criteria/options and save one decision plus rationale.
- `phase_lifecycle`: multi-stage work moves through distinct phases and phase outputs.

Tie-breakers:

- Course weeks with topic/activity/status columns are `progress_tracking`; a course duration alone is not a lifecycle.
- Fixed media chapters primarily form a `resource_queue`; progress status is secondary.
- A service journey that produces different state/output at registration, visit, measurement, result and follow-up is `phase_lifecycle`; its ordered steps are secondary.
- A device trigger such as “after N uses or when the device alerts” is `repeating_routine`, not a Calendar date.
- A before/during/after safety guide with stop or emergency triggers is not a repeating routine unless the source explicitly schedules recurrence.

### Primary artifact: one retained result needed to finish or resume

- `calendar`: source- or user-anchored time/window is the indispensable state.
- `checklist`: a bounded set or ordered procedure is completed once as a unit.
- `todo`: independent next actions can be queued, deferred or reordered; a source-backed non-date trigger may create the next Todo.
- `sheet`: stable rows retain progress, comparison or multiple fields.
- `memo`: conditions, decision context, warnings or references must remain together to act safely or explain a choice.

Tie-breakers:

- Weeks/chapters/courses with per-row state need a Sheet even if they can be exported as tasks.
- A one-time application can be Todo-primary when route choice, preparation and submission are independently actionable; its documents can appear as a secondary checklist.
- A condition-triggered maintenance action is Todo-primary when no real date exists; Calendar must not invent one.
- Many comparable criteria/candidates favor Sheet. One compact choice whose rationale, unknown cost and contact context must stay together favors Memo.
- Safety thresholds, stop rules and emergency responses favor Memo; only ordinary preparation/recovery actions enter a secondary checklist.
- `hybrid` is forbidden. Put other useful views in `secondaryArtifacts` with explicit loss.

## 4. Gate rules

- `ready_second_wave`: complete, locally applicable, non-sensitive structure suitable for internal review.
- `ready_for_internal_canary`: complete but needs a bounded locale/safety adaptation or has a new transformation pattern worth canary review.
- `hold`: a complete internal draft may exist, but rights, safety or editorial gates block export/promotion.
- `source_import_required`: rows are insufficient; no canonical Flow or usable projection.

Keep these values independent:

- discovery access and row access;
- source row status and conversion readiness;
- rights review and personal/public use;
- freshness, locale, safety and privacy review;
- promotion state.

Rights/safety/locale hold may retain an internal canonical draft, but all five export projections remain blocked until the relevant gate clears.

## 5. Projection rule

Return exactly Calendar, Checklist, Todo, Sheet and Memo. Exactly one is `primary` for an executable non-held proposal. Use `secondary` only when it retains a useful subset, `fallback` for a readable but lossy summary, `not_applicable` when the view is unnatural, and `blocked` when conversion or an export gate prevents use. Do not attach a payload to `blocked` or `not_applicable`.
