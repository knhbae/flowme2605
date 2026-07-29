# SourceRow-only Blind Review Rubric v2

**Version:** `flowme-source-row-blind-review-v2`  
**Frozen before:** Round 1 generation

## Reviewer input boundary

The reviewer receives only an opaque SourceRow packet, the proposal, and this rubric. The reviewer does not receive canonical case IDs, original URLs, hidden expectations, earlier rounds, generator identity, cost, or another review.

Review the proposal as a bounded transformation of the supplied rows, not as a summary of an imagined original page.

## Shared row-type policy

- `check`: preserving an action phrase or adding only `확인하기` to a noun is supported.
- `procedure`: performing the named procedure is supported; only literal detail may move to memo.
- `table_row`: adding only `완료하기` is supported.
- `resource`: adding only `열어보기` and using `open_resource` is supported. Do not reject this merely because the resource contents are unknown; reject only claims about those contents.
- `date`: an explicit source action may add only `하기`; a date/window label may add only `확인하기`. Schedule evidence still needs a literal value; without one, require `missing_date_value` and the row in `humanCheckRowRefs`, and reject Calendar projection.
- `reference`: it is not an Item. A supporting-source reference must be omitted as a boundary.

These licensed verbs are grammar, not invented actions.

## Fixed artifact policy

The reviewer uses the same deterministic matrix as the generator:

- any literal schedule evidence -> exactly one `calendar` projection;
- otherwise all table rows -> `sheet`;
- otherwise one resource -> `memo`;
- otherwise multiple resources -> `checklist`;
- otherwise one eligible Item -> `todo`;
- otherwise multiple eligible Items -> `checklist`.

`hybrid` is not valid in this frozen profile. The ten positive packets contain 15 eligible primary rows, so each must be a `proposal` with one Item per eligible row. Only the single supporting/reference row may be omitted.

## Item verdicts

Give every proposed Item one verdict:

- `keep`: mapping, title, intent, completion mode, memo, and schedule evidence are supported as written.
- `edit`: the row supports an Item, but at least one proposed field needs a bounded correction.
- `remove`: the row does not support an Item or the Item depends on unseen content.

The frozen ten positive inputs contain 15 Item-eligible primary rows and one supporting/reference-only row. Compute `rawItemKeep = keep / all proposed Items` and `eligibleRowKeepCoverage = eligible rows connected to kept Items / 15`. The gate uses the lower value. This prevents a generator from improving keep rate by omitting a difficult eligible row.

## Unsupported content counts

Count each distinct unsupported claim in exactly one primary class:

- `action`: an unlicensed user action or object use;
- `date`: a date/window/offset not literally present;
- `repeat`: a cadence not literally present;
- `fact`: any other unsupported quantity, condition, domain fact, resource-content claim, result, tool, or link.

Do not count:

- the row-type licensed verbs;
- nullable/unknown classification;
- a projection candidate that follows the fixed artifact policy;
- literal source text copied to memo or schedule evidence.

Any unsupported count is a hard quality-gate failure.

## Seven axes

Score 1-5. Use all ten model-positive proposals for averages. `partial` and `insufficient` are reusable-schema states but are invalid for this frozen ten-positive corpus.

1. **User Need Fit** — the source labels and bounded Items together reveal a coherent narrow job without requiring a generated user-need sentence.
2. **Execution Clarity** — Items are concrete and completion/projection behavior is understandable.
3. **Content Fidelity/Coverage** — every kept decision follows the rows, and all rows are mapped or explicitly omitted.
4. **Portability** — projections match the actual Item and schedule evidence without claiming serialized exports.
5. **Cognitive Load** — no padding, redundant Items, or unnecessary classifications.
6. **Copy Specificity** — titles use concrete source words and only licensed grammar.
7. **Source/Safety Separation** — supporting/reference boundaries, unseen resource contents, missing dates, and uncertainty are handled explicitly.

Score anchors:

- 5: strong, directly supported, no meaningful correction needed;
- 4: good and usable, with at most a minor non-grounding wording improvement;
- 3: usable but material friction or ambiguity remains;
- 2: weak; substantial correction required;
- 1: unsafe, invented, structurally wrong, or unusable.

## Case verdict

- `pass`: schema/accounting presentation is coherent, unsupported count is zero, and no Item requires removal.
- `revise`: bounded edits are needed but the proposal spine remains usable.
- `fail`: invented/unsafe structure, missing source coverage, or wrong insufficient/blocked behavior.

Deterministic negatives are not given seven-axis scores. Verify only:

- `modelInvoked=false` in the controller evidence;
- exact state, reason, empty content, and disposition;
- no model-quality credit is added.

## Required review JSON

Each positive case review records:

```json
{
  "sampleRef": "opaque sample ref",
  "reviewInputSha256": "copied frozen input hash",
  "proposalFingerprint": "copied proposal hash",
  "caseVerdict": "pass",
  "itemVerdicts": [
    { "itemRef": "item-01", "verdict": "keep", "reasonCode": "supported_as_written" }
  ],
  "unsupportedSignals": [],
  "scores": {
    "userNeedFit": 4,
    "executionClarity": 4,
    "contentFidelityCoverage": 5,
    "portability": 4,
    "cognitiveLoad": 5,
    "copySpecificity": 4,
    "sourceSafetySeparation": 5
  },
  "scoreComments": {
    "userNeedFit": "source labels and Items show one narrow job",
    "executionClarity": "each Item has a concrete bounded action",
    "contentFidelityCoverage": "all rows are mapped or explicitly bounded",
    "portability": "artifact follows the fixed matrix",
    "cognitiveLoad": "there is no padding",
    "copySpecificity": "titles use source words and licensed grammar",
    "sourceSafetySeparation": "uncertainty and supporting rows remain separate"
  },
  "topIssueCode": null,
  "note": "short evidence-based note"
}
```

For every unsupported claim, add one signal with `class`, `path`, and an exact `quote` found at that proposal path. The validator derives action/date/repeat/fact totals from these signals and rejects a signal whose path or quote cannot be verified against the proposal.

Allowed Item `reasonCode` values: `supported_as_written`, `wording_only`, `intent_mismatch`, `completion_mismatch`, `unsupported_action`, `unsupported_schedule`, `unsupported_fact`, `resource_contents_invented`, `should_be_omitted`.

Allowed `topIssueCode`: `null`, `generic_copy`, `classification_overreach`, `projection_mismatch`, `missing_uncertainty`, `row_policy_mismatch`, `unsupported_content`, `accounting_problem`, `wrong_insufficient_boundary`.
