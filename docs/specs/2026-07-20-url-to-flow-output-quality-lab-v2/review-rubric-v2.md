# Output Quality Lab v2 review rubric

## Review boundary

This rubric measures source fidelity, structural usefulness and correction effort. Agent agreement and browser QA are not observed-user validation. A user can still reject an artifact that passes every automated gate.

## Review order

Review each case in this order so that a polished projection cannot hide a source failure.

1. Source scope: Is the claimed original range complete for the user job?
2. Feasibility: Should a Flow be generated now, held, imported or rejected?
3. Row roles: Is every SourceRow exactly one of Item, Field, Memo, Reference, Conditional response or Omission?
4. Taxonomy: Do the immediate outcome, acquired row anatomy, execution state change and retained result support the four primary axes?
5. Canonical draft: Is every Item naturally checkable, directly supported and placed in one Step?
6. Projection: Does each applicable tool retain the information needed to finish or resume the job?
7. Independent gates: Are source completeness, access, rights, freshness, locale, safety, privacy and promotion still separate?

## Hard-fail labels

Use `major_regeneration` when any of these occur:

- a partial, metadata-only or missing source is shown as complete;
- an action, date, recurrence, condition, fact or result is invented;
- a hold/reject/no-proposal case is presented as a usable public projection;
- an emergency or stop condition becomes a normal pre-completed checkbox;
- primary artifact selection removes the state needed to finish or resume the user job;
- an essential projection field is missing;
- rights or safety hold is hidden by a valid schema.

## Item judgment

An Item is kept only when all five statements are true.

- A user can intentionally do, inspect, decide, record or use it.
- Its completion can be observed without inventing a new criterion.
- It has at least one direct SourceRow reference.
- It is not merely a warning, explanatory sentence, category heading or missing-source marker.
- Removing it would omit a real execution action from the claimed source range.

Otherwise convert it to Field, Memo, Reference, Conditional response or Omission.

## Artifact tie-breaker

Ask: “Which one result must remain tomorrow so the user can finish or resume?”

| Primary artifact | Use when the retained state is | Do not choose merely because |
| --- | --- | --- |
| Calendar | a source- or user-anchored time/window | the source mentions a duration |
| Checklist | a bounded set or ordered procedure with observable completion | the source title says checklist |
| Todo | one or more next actions that can be independently queued, deferred or reordered | every Item can technically be exported as a task |
| Sheet | stable rows with progress, comparison or multi-field state | the source visually contains a table |
| Memo | decision context, conditions, warnings or reference state that must remain together | the source is narrative text |

`hybrid` is never a new primary artifact. Additional views are secondary projections with explicit loss.

## Special adjudications

- K-MOOC full: 14 lesson rows plus activity types are a progress Sheet. The course window may be a secondary Calendar view.
- K-MOOC metadata-only: “14 weeks” does not authorize 14 generated rows. Require source import.
- Nongsaro heat: only preparation and recovery are normal Items. Hydration, stop and 119 rows remain conditional responses; thresholds and employer duties remain references. The primary result is a response Memo, not a daily checklist.
- Washer cleaning: preserve “every 40 washes or device alert” as the trigger. Do not normalize it to monthly recurrence.
- Passport: keep the adult renewal scope; do not mix minor, loss or damage branches.
- AC service comparison: the result is one decision and its rationale/contact context, not two service tasks.
- Rights-restricted complete source: an internal draft may exist while public export remains false.
- Public landing plus protected rows: visible phase headings do not stand in for missing task rows.

## Edit grades

| Grade | Definition | Keep-rate treatment |
| --- | --- | ---: |
| `no_edit` | publishable for the allowed scope without semantic change | 1.00 |
| `minor_edit` | wording, grouping or optional projection adjustment only | retained Items / proposed Items |
| `major_regeneration` | feasibility, primary structure, role assignment or essential data must change | 0.00 until regenerated |
| `correct_rejection` | no Flow was the expected and correctly produced result | excluded from Item keep median |

## Correction-time evidence

Correction time is measured only when a reviewer actually starts and stops a correction pass. In this lab, unmeasured timing remains `null`; it must not be estimated from agent runtime. Report median and 75th percentile only from cases with measured review seconds, alongside the measured sample count.

## Batch acceptance

- schema/canonical/source accounting: 100%
- invented content: 0
- negative and hold disposition: 100%
- overall checkability precision: at least 95%; safety cases 100%
- four-axis plus primary-artifact gold match: at least 90%
- independent three-way exact match: at least 85%
- core-positive no/minor edit: at least 7/8
- median Item keep rate: at least 0.80
- applicable projection essential-field retention: 100%
- blocking disagreement: 0
- two consecutive corrected batches: zero regression across all six controls
