# URL-to-FLOW v4 Source-Grounded Value Uplift

Status: active design and executable gate  
Lane: `url-to-flow-source-grounded-value-uplift-v4`

## Why v4 exists

The v3 hybrid controller proved a narrow technical property: given already selected `SourceRow`s, a deterministic compiler can account for them without inventing unsupported actions. It did **not** prove that the resulting content is useful enough to appear in Flow 찾기.

That distinction matters. The live service at `https://flowme2605.vercel.app/flows` currently gives users, before save:

- a concrete job and title;
- an input/no-input/choice rule;
- a named result bundle such as calendar + checklist + memo;
- a first action;
- an Item count and destination;
- source context and a source-to-execution explanation;
- observable checks or a decision/record state after opening the Flow.

The v3 positives mostly preserved one or two sparse labels such as `여권`, `예약과 문진표 준비`, or `Day 1 prompt`. They were faithful to those labels but did not cross the live product baseline. The earlier `4.99/5` score is therefore retained only as **SourceRow fidelity/controller evidence**, not content-quality or baseline-superiority evidence.

## Product claim

A generated Flow may be more useful than its source without claiming facts that are not in the source.

```text
source facts stay source-owned
                 +
safe execution scaffolding is product-owned
                 +
dates, choices, goals, and notes are user-owned
                 =
source-grounded execution value
```

“Better than the source” means that the same verified content becomes easier to start, complete, export, revisit, and audit. It never means adding medical, legal, financial, safety, schedule, quantity, or outcome claims because they sound helpful.

## Canonical units

| Unit | Role | Can own state? | Example |
|---|---|---:|---|
| `SourceEvidence` | smallest truth/provenance unit | no | `극세 필터 청소 주기는 4주에 1회` |
| `Item` | smallest independently completable/decidable/recordable unit | yes | `먼지 양에 맞는 청소 방법 선택` |
| `Step` | ordered or conditional grouping | group only | `청소 → 건조` |
| `Flow` | one user job and one natural execution artifact | composition | `극세 필터 4주 청소 루틴` |
| `FlowMap` | alternatives or related Flows | composition | model/video/template choices |
| `Projection` | destination-specific view | destination state only | ICS, checklist, todo, sheet, memo |

ICS and a checklist remain projections. They are not the minimum content or storage unit.

## Evidence ownership

Every generated field must carry one of these classes.

1. `source_fact`: literal fact, condition, warning, sequence, date rule, quantity, or resource from the source.
2. `source_transform`: lossless grouping, shortening, ordering, or conditional rendering of source facts.
3. `execution_scaffold`: product-created UI structure such as a status, checklist grouping, first-action preview, or export mapping. It cannot create a domain fact.
4. `user_choice`: a value the user selects, including start date, weekday, target, candidate, personal note, or hold/skip decision.
5. `safety_boundary`: an explicit caution, uncertainty, excluded claim, or official-source handoff.

An Item without evidence references and one of these ownership labels cannot be saved or published.

## v4 pipeline

```text
URL / file / memo
  1. safe fetch + immutable snapshot
  2. source diagnosis (type, locale, rights, risk, completeness)
  3. SourceEvidence extraction
  4. user-job and natural-artifact selection
  5. source sufficiency gate
       - publishable evidence
       - draft-only evidence
       - re-extraction required
       - blocked
  6. deterministic execution compiler
  7. copy, completion, projection, and source-trace validators
  8. live-baseline absolute gate
  9. blinded pairwise preference gate
 10. human approve/save/publish
```

The LLM may help at stages 2-4 and may propose copy. It does not own final dates, recurrence, warnings, omission accounting, evidence references, projections, or publish status. Those are validated deterministically.

## Source sufficiency gate

A source packet is not automatically Flow-ready because it contains one or more rows. It must answer, within one bounded user job:

- What will the user accomplish?
- Which actions, decisions, records, or resources support that job?
- What is literal timing versus a user-selected date?
- What does “done,” “hold,” or “needs review” look like?
- Is the extracted scope complete or explicitly bounded?
- Is the destination naturally calendar, checklist/todo, sheet, memo, or a combination?
- Which cautions and links must travel with the result?

The gate returns exactly one disposition:

- `compile_candidate`: the bounded source evidence can support a Flow candidate.
- `draft_only`: useful as a private atomic action or reference, but below the public catalog baseline.
- `reextract_required`: the page may be useful, but the captured rows are too sparse or incomplete.
- `blocked`: access, locale, rights, privacy, or sensitive applicability prevents conversion.

`reextract_required` is a successful safety outcome, not an empty failure. It prevents generic filler from being mistaken for a Flow.

## Safe value licenses

The compiler may add only the following value without a new domain source:

- group or order supported source evidence;
- choose an artifact destination from the evidence shape;
- expose a user-entered anchor, weekday, target, note, or decision;
- derive an observable completion rule directly from source actions;
- add status values such as `not_started`, `in_progress`, `done`, `hold`, or `skipped`;
- keep links, cautions, and source context attached to each Item and export;
- create first-action, result-bundle, and return-state UI copy from already supported fields;
- generate calendar/checklist/todo/sheet/memo projections without dropping evidence.

The compiler may not invent:

- a date, interval, duration, count, order, requirement, warning, result, or outcome;
- a procedure hidden behind a generic label;
- medical, legal, financial, safety, or locale applicability;
- the content of an opaque link, video, PDF, prompt, or table cell;
- more Items merely to reach a target count.

## Public-candidate quality gate

All hard gates must pass:

1. 100% source-evidence accounting and zero unsupported claims.
2. Verified or explicitly bounded source coverage.
3. 100% of Items have an observable completion, decision, record, or resource-open state.
4. 0% generic action titles after the copy linter.
5. A visible `input/choice/no input -> result bundle -> first action` promise.
6. At least one natural destination and a loss ledger for every projection.
7. Source, product scaffolding, user choice, and caution ownership remain distinct.
8. Critical score axes are each at least 4.0/5 and the ten-axis average is at least 4.2/5.
9. The candidate matches all eight live-baseline capabilities in `live-baseline.json`.
10. In randomized blinded comparison, at least 70% of valid judgments prefer the candidate, with no critical source/safety regression.

Until gate 10 has independent evidence, the highest state is `ready_for_pairwise_review`, not `public_ready`.

## Current 12-case implication

The original 12-case set remains valuable as a regression set, but its sparse SourceRows are no longer accepted as sufficient just because the compiler can preserve them.

- Cases 11-12 remain deterministic blocks.
- Most positive cases become `reextract_required` because actual prompt text, table rows, dates, completion conditions, decision factors, resource URLs, or source coverage are missing.
- The official Samsung filter case is re-fetched as a worked example because the current source exposes a complete micro-job: 4-week recurrence, cleaning choices, drying, and a damage caution. It is compiled as a richer candidate without adding a source claim.

The next model comparison must therefore compare extractors on this v4 contract. A cheap model does not win by returning valid JSON; it wins only when its accepted Flow rate, edit distance, latency, and cost are competitive after the same quality gate.

## Deliverables

- live `Flow 찾기` baseline capture;
- versioned v4 contract and quality rubric;
- executable source-sufficiency and value-uplift validator;
- all 12 prior cases reclassified under the new gate;
- one source-refetched worked example with before/after comparison;
- blinded pairwise review packets and results when reviewers are run;
- Korean PPT-style HTML report and per-case previews.

## Non-claims

- Live UI inspection is current-page evidence, not user-behavior validation.
- The worked example does not approve automated public publishing.
- No provider price, token count, or production fetch cost is established in this lane.
- Passing deterministic gates does not replace independent pairwise or human review.

