# URL-to-Flow generation prompt v2.3

You receive one blind source packet per case. Classify only from that packet. Do not search, use a provider's reputation, or invent rows from a title, count, duration, heading or stated user job.

Return this chain in order:

```text
source completeness
-> generation disposition
-> exactly one role for every acquired SourceRow
-> four independent primary taxonomy axes
-> canonical entity plan, only when executableAllowed=true
-> Calendar / Checklist / Todo / Sheet / Memo availability
-> independent access / rights / freshness / locale / safety / privacy / promotion gates
```

The source's subject, row anatomy, user state transition and retained result are four different questions. Do not let one answer choose the other three.

## 1. Decide whether generation succeeded and whether content may exist

Use only these canonical disposition values.

- `generationState`: `completed` when the packet was processed, including a deliberate rejection or import request; `failed` only when usable source acquisition itself failed.
- `outcome`: `proposal`, `no_proposal`, or `rejected`.
- `conversionReadiness`: `ready_for_internal_canary`, `ready_second_wave`, `source_import_required`, or `hold`.

Source completeness:

- `complete`: all rows needed for the bounded user job are present.
- `partial`: some execution rows are present but a known required boundary is absent.
- `metadata_only`: title, counts, dates or phase headings are visible but the execution rows are absent.
- `missing`: no usable SourceRow was acquired.

Disposition precedence:

1. Missing/unreadable/paywalled body with zero rows -> `failed + no_proposal + source_import_required`.
2. Partial or metadata-only body with a plausible job but missing execution rows -> `completed + no_proposal + source_import_required`.
3. Marketing or descriptive metadata with no executable job -> `completed + rejected + hold`.
4. Complete rows -> a proposal may exist. Rights, locale, safety, privacy or editorial review can make it `hold` without deleting the internal draft.

`executableAllowed` means an evidence-backed internal canonical draft can exist. It is not a public-release flag. For a complete source, rights or promotion restrictions normally leave `executableAllowed=true` and `publicExportAllowed=false`. For partial, metadata-only or missing execution rows, use `executableAllowed=false`.

Keep blockers minimal and packet-backed. Do not create a freshness, privacy, safety, account, rights or editorial blocker merely because that category could matter in theory.

## 2. Account for every SourceRow before making an Item

Every acquired row receives exactly one role:

- `item`: the user can intentionally act, inspect, decide, record or use it and observe completion.
- `field`: a stable or user-entered value required by another retained action.
- `memo`: rationale or context that must remain together as prose.
- `reference`: a rule, warning, scope note or explanatory fact that is consulted, not completed.
- `conditional_response`: an action active only when its stated trigger occurs.
- `omission`: a missing boundary or intentionally excluded source row.

Never turn a threshold, warning, emergency action, category heading or missing-row marker into an ordinary checkbox. A safety response may have only a few normal Items while preserving many conditional responses and references.

For zero SourceRows, return an empty role list. For all other cases, the role list must contain every SourceRow ID exactly once and no extra ID.

## 3. Choose the four axes with four separate questions

### 3.1 `primaryLifeArea`: what part of the user's life is being managed?

Choose by the user's managed object and outcome, not the publisher, page medium or incidental transaction.

- a course, curriculum or deliberate learning progress -> `study_reading`;
- employment, professional production or occupational work safety -> `work_career`;
- a home, household system or appliance -> `home_living`;
- identity documents, fees, formal personal administration or purchasing -> `money_admin_purchase`;
- health measurement, treatment or exercise outcome -> `health_fitness`;
- leisure making, games, crafts or recreational activities -> `hobby_pet`.
- travel preparation, packing or an outing itinerary -> `travel_outings`;
- meal planning, cooking or groceries -> `meals_grocery`.

Put a real competing context in `secondaryLifeAreas`. A service cost does not make household maintenance primarily money/admin. Educational material used for a recreational making activity does not automatically make it study. A work-site health rule can be work-primary and health-secondary when the user's job is safe performance of work.

A formal purchase, fee or contract review is money/admin-primary even when the purchased work concerns a home. Conversely, choosing maintenance for an appliance is home-primary even when price is one criterion.

When execution rows are missing but the packet explicitly states the user's domain, `primaryLifeArea` may still be classified. Do not null it merely because the Flow itself is blocked.

### 3.2 `sourceShape`: what is the semantic anatomy of the acquired rows?

- `date_offsets`: actions grouped by distance from one user anchor.
- `date_window`: a source- or user-supplied start/end window.
- `recurrence_rule`: an explicit repeated trigger or interval.
- `procedure_rows`: actions whose sequence is necessary.
- `checklist_rows`: a bounded omission-prevention set; order is secondary.
- `lesson_rows`: lessons, weeks, modules or curriculum courses whose identity supports learning progress.
- `resource_collection`: independently consumable media or resources in a queue.
- `decision_criteria`: criteria or alternatives used for one decision.
- `narrative_guidance`: explanation mixed with thresholds, warnings, conditions or response guidance.
- `table_rows`: generic stable records whose columns, rather than lesson/resource/decision semantics, define the rows.

Use semantic anatomy, not the HTML tag, visible table, JSON `rowType` label or page layout. Course units remain `lesson_rows` even when displayed in a table or acquired as resource links. Media chapters remain `resource_collection`. A mixed application packet dominated by required documents/checks is `checklist_rows`; keep its route or fee rows as secondary shapes or references. A condition-heavy safety guide is `narrative_guidance` even if several sentences use imperative verbs.

When only metadata/headings are available and actual body rows are missing, set `sourceShape=null`. Do not pretend headings are procedure, lesson or template rows.

### 3.3 `primaryExecutionPattern`: what state transition must the user manage?

- `date_preparation`: an anchor/window determines preparation timing.
- `ordered_procedure`: actions must be completed in a required sequence.
- `repeating_routine`: an explicit interval or trigger starts the same action again.
- `progress_tracking`: stable rows retain not-started/in-progress/done or measured learning/work state.
- `resource_queue`: the user consumes independent resources while preserving queue position.
- `compare_decide`: criteria/options lead to one saved decision.
- `phase_lifecycle`: work or response moves through distinct states with different outputs, rules or activation conditions.

Precedence rules:

1. Course/curriculum rows with per-row status -> `progress_tracking`.
2. Independent media chapters/resources -> `resource_queue`; per-row completion may still make Sheet the artifact.
3. Explicit repeated trigger/interval -> `repeating_routine`; never invent a calendar date.
4. Before/during/stop-emergency/recovery states, or plan/build/release stages with distinct outputs -> `phase_lifecycle`.
5. A fixed sequence with no distinct phase outputs -> `ordered_procedure`.

A bounded one-time omission-prevention list also uses `ordered_procedure` as its execution pattern when no recurrence or persistent per-row progress state exists. Flexible item order does not turn a packing/preparation checklist into `progress_tracking`.

A single bounded build/test activity is still `ordered_procedure` with a Checklist when the user only needs to complete its steps once. Do not promote it to phase lifecycle or Sheet merely because the instructions use headings such as prepare, build and test. Phase lifecycle requires state/output that must persist across distinct stages or sessions.

For a blocked partial or metadata-only source, an intended execution pattern may still be recorded only when the acquired metadata explicitly identifies a stable pattern such as course progress or named project phases. This is classification-only: keep `sourceShape=null`, `executableAllowed=false`, no canonical draft and no projection payload. Otherwise use `primaryExecutionPattern=null`.

### 3.4 `primaryArtifact`: what one retained result is required to finish or resume tomorrow?

Apply this priority test; do not choose by title or by what can technically be exported.

1. `calendar`: an anchor or time window is indispensable state.
2. `sheet`: many stable rows need per-row position, progress, status, measurement or phase output across sessions.
3. `memo`: conditions, warnings, comparison rationale or contact/context must stay together.
4. `todo`: independent next actions can be queued, deferred or reordered.
5. `checklist`: one bounded, fixed unit mainly needs complete/incomplete state.

Hard tie-breakers:

- Weeks, curriculum units, media chapters and multi-session project phases -> Sheet when row state must survive, even if each row could be a Todo.
- A one-time service journey with a fixed route and no per-phase data to record -> Checklist, even when the execution pattern is phase lifecycle.
- A one-time application with route selection, preparation and submission as independently manageable next actions -> Todo; required documents are a secondary Checklist.
- A non-date condition-triggered maintenance action -> Todo; Calendar is not primary.
- One compact decision whose rationale, unknowns and contact context must remain together -> Memo. Use Sheet only for many comparable candidates/criteria whose cells must be retained.
- A safety response dominated by thresholds, stop rules and emergency conditions -> Memo. Ordinary preparation/recovery may form a secondary Checklist.
- For a blocked task-template page whose visible metadata names phases but whose actual task rows are protected, the intended artifact is Todo when the product explicitly promises task execution. Phase headings alone do not prove the per-row fields needed for a Sheet.

For a blocked partial/metadata-only source, an intended artifact may be classified only under the same explicit-pattern rule above. It is not a generated projection: every projection remains `blocked` and has no payload.

`hybrid` is forbidden. Put useful alternative views in `secondaryArtifacts` and state their information loss.

## 4. Keep access, rights and review gates independent

Do not infer one gate from another.

- Discovery access can be public while row access is partial, metadata-only or unavailable.
- Source completeness does not grant rights.
- Rights restriction does not make a complete internal draft source-incomplete.
- A public page does not prove public derivative release permission.
- Locale, safety, privacy, freshness and promotion each retain their own review value.

Use packet values whenever supplied. `publicExportAllowed=true` only if the packet positively clears all applicable rights, locale, safety, privacy and promotion gates; otherwise false.

Apply this deterministic gate normalization. This is a label adapter, not a reason to invent a blocker.

1. Copy `discoveryAccess`, `rowAccess`, `rightsBasis`, `allowedUse` and `rightsReview` directly from the packet's source metadata. Do not reinterpret `restricted` as unreadable and do not add allowed uses.
2. `freshnessReview=current` when the packet contains an acquired snapshot checked on the lab date; use `unknown` when acquisition failed and no rows exist. Do not change it to pending merely because a future refresh will eventually be needed.
3. `localeReview=applicable` for `ko-KR`. It is also applicable to an original-language media/resource queue that the user is meant to consume in that language. Non-Korean instructional procedures, safety directions, packing guidance or curriculum rows for a Korean-facing Flow use `adaptation_required` plus `locale_review_required`.
4. `safetyReview=restricted` when the transformed artifact contains emergency, stop-work or life-risk thresholds that require human safety editorial review. Use `passed_with_boundary` when the source includes a person-safety warning or a health-service route but FlowMe preserves the official boundary and generates no diagnosis, treatment or new safety instruction. A product-care prohibition whose purpose is only to protect a device or cleaning result is not a person-safety review; use `not_required`. Otherwise use `not_required`.
5. `privacyReview=not_required` unless the packet itself requires sensitive user data to be stored. A topic such as a passport or health service does not by itself prove that FlowMe stores identity or health data.
6. `promotionState=research_only` for source import, rejection, an explicit safety/editorial hold, or `pending`/`unknown` rights. `rightsReview=restricted` plus packet-backed `allowedUse` containing `internal_review` is not by itself a rights hold: a complete internal proposal uses `internal_review` while `publicExportAllowed` remains false. Use `internal_canary` only when rights are approved and every applicable locale/safety/privacy gate is already clear. Otherwise an internally reviewable proposal is `internal_review`.

Readiness normalization:

- complete with no review blocker -> `ready_second_wave`;
- complete with locale adaptation or a bounded new transformation pattern, but no safety/editorial/rights hold -> `ready_for_internal_canary`;
- complete with safety/editorial or pending/unknown-rights hold -> `hold`;
- incomplete executable rows -> `source_import_required`.

Locale adaptation is a canary blocker, not a full hold. Even with approved/open rights, `publicExportAllowed=false` until the locale gate is cleared.

Blocker normalization:

- partial acquired body with known missing executable rows -> `source_incomplete` and `source_import_required`;
- protected template/body whose visible metadata explicitly points to the hidden rows -> `source_import_required` and `account_or_entitlement_required`, without the generic `source_incomplete` duplicate (add `source_unavailable` only when no row at all was acquired);
- marketing metadata with no executable shape -> `source_incomplete` and `unsupported_shape`;
- non-Korean instructional adaptation -> `locale_review_required`;
- emergency/stop-work safety transformation -> `safety_review_required` and `editorial_review_required`;
- complete source with pending/unknown rights -> `rights_permission_required`; add `editorial_review_required` only when regulated, legal, safety or similarly high-stakes editorial interpretation is also present.

Do not add `rights_permission_required` merely because `rightsReview=restricted` when the intended output is already limited to internal review and the packet's allowed uses include `internal_review`. Do not add generic `freshness_pending`, `privacy_review_required`, `safety_review_required` or `editorial_review_required` without the packet-backed condition above.

A required user value such as an anchor date, vehicle-specific date or chosen option belongs in a canonical Field or `userInputPath`. It is not a review blocker. Do not add `user_input_required` to review blockers or downgrade readiness when the source-backed template is otherwise complete.

When no body row was acquired, locale applicability cannot be inspected even if the title locale is known. Use `localeReview=pending`, not `applicable`. The `ko-KR -> applicable` default applies only when at least one usable body row was acquired.

## 5. Projection contract

Return exactly Calendar, Checklist, Todo, Sheet and Memo.

- Exactly one is `primary` for an executable, non-export-blocked proposal.
- `secondary`: preserves a useful subset and states any loss.
- `fallback`: readable but materially lossy summary.
- `not_applicable`: unnatural view.
- `blocked`: source or export gate prevents use.

Never attach payload to `blocked` or `not_applicable`. A rights/safety/locale hold may retain an internal canonical draft while external projections are all blocked. A source-import/rejected/failed case has no canonical Flow and no usable projection.

## 6. Canonical raw decision format

Return one decision set with:

- top-level `documentType="flowme-independent-decision-set"`, `decisionSetVersion="independent-decision-v2.1"`, the supplied `roundId`, `profile`, `caseSetVersion`, `blind=true`, and `modelEvidence.actualApiCostMeasured=false`;
- exactly one decision for every supplied case, in input order;
- canonical feasibility enums from section 1;
- `classification.access`, `classification.rights`, and `classification.review` as nested objects;
- `roles` as the SourceRow role array;
- no gold label, comparison result, provider API cost or observed-user claim.

Before returning, run this mental check:

```text
all case IDs exact
and all SourceRow IDs exact once
and canonical feasibility enum values only
and blocked projections carry no payload
and complete-but-rights-held is not misreported as source incomplete
```

The nested gate objects are not optional shorthand. `classification.review` must include, at minimum, these packet-normalized fields:

```json
{
  "sourceRowStatus": "complete | partial | metadata_only | missing",
  "freshnessReview": "...",
  "localeReview": "...",
  "safetyReview": "...",
  "privacyReview": "...",
  "rightsReview": "...",
  "promotionState": "...",
  "blockers": []
}
```

Set `sourceRowStatus` to the case's source completeness value. Copy the same normalized blocker set into feasibility and classification review; do not omit it from one location. Include the packet-backed access and rights fields in their nested objects. A structurally present but semantically incomplete gate object fails the raw contract.
