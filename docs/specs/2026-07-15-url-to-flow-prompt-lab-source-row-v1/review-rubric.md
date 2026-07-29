# SourceRow-only Blind Review Rubric v1

**Version:** `flowme-source-row-blind-review-v1`  
**Applies to:** corrected Round 1–3 proposals only

## Blind Boundary

The reviewer receives only:

- the exact generator-visible SourceRow input;
- the raw SemanticProposal;
- its SHA-256 fingerprint;
- deterministic validator pass/fail codes;
- this rubric and the result template.

The reviewer must not inspect canonical expectations, source title/URL/publisher, preflight metadata, the opaque-to-canonical ID map, prior runs/reviews, provider/model labels, timing, token, or cost data. Opaque IDs are identity only and never semantic evidence.

## Hard Review Rules

1. Judge every semantic claim only against `rowType`, `title`, `detail`, and `order` in the supplied SourceRows.
2. A value may be reasonable general knowledge and still be unsupported. Record it when the SourceRows do not say it.
3. A `date` row type alone does not prove an actual date, window, offset, or repeat value.
4. A row ordinal alone does not prove a calendar schedule.
5. Source ownership IDs do not prove topic, authority, locale, risk, or rights.
6. Missing canonical detail is not a model failure when it is unobservable from the packet.
7. Positive invalid/no-proposal output receives 1 on all axes; it is never removed from the denominator.

## Item Decision

Review every proposed Item with exactly one decision:

- `keep`: usable as written and fully grounded;
- `edit`: the Item boundary is useful, but wording, intent, completion, memo, grouping, or schedule needs a grounded correction;
- `delete`: invented, redundant, not independently useful, or cannot be repaired without changing the Item boundary.

Item keep rate is `keep / (keep + edit + delete)` across the 10 positive cases.

## Unsupported Signal Classes

Record each unsupported signal separately:

- `action`: the proposal asks the user to do something not present in the rows;
- `date`: a date, window, offset, deadline, or time is added without a literal row value;
- `repeat`: a cadence is added without a literal row value;
- `fact`: topic, object, authority, locale, outcome, caution, or other claim is not present in the rows.

Quote the proposal text and name the affected field. Zero unsupported signals is a completion gate.

## Seven Axes

Use integer scores from 1 to 5 and write a concrete comment for every score.

### 1. User Need Fit

- 1: no usable job or a job mainly invented from outside the rows;
- 3: narrow job is visible but ambiguous or awkward;
- 5: the smallest useful job is clear and entirely row-grounded.

### 2. Execution Clarity

- 1: the user cannot tell what to do or what done means;
- 3: a plausible action exists but the boundary or completion wording needs editing;
- 5: each Item has a concrete row-grounded action/decision/record/use boundary and observable completion.

### 3. Content Fidelity / Coverage

- 1: key rows are lost or substantial content is invented;
- 3: all rows are accounted for but grouping or omission rationale is weak;
- 5: every row is mapped or omitted once, source shape is preserved, and nothing outside the packet is added.

### 4. Portability

- 1: artifact/projection is unusable or contradicts the rows;
- 3: at least one useful destination exists but mapping needs editing;
- 5: the smallest natural calendar/checklist/todo/sheet/memo representation is explicit with no invented schedule.

### 5. Cognitive Load

- 1: too many Items, projections, or explanations for the supplied rows;
- 3: usable but has avoidable grouping or explanation;
- 5: minimum necessary Items and destinations, with detail kept downstream.

### 6. Copy Specificity

- 1: generic filler or unsupported concrete claims;
- 3: mostly grounded but some title/done wording is vague;
- 5: concise action-first wording names only objects and outcomes present in the rows.

### 7. Source / Safety Separation

- 1: proposal asserts authority, locality, rights, medical/legal/financial certainty, or unsupported safety advice;
- 3: no dangerous claim, but source/safety uncertainty is poorly bounded;
- 5: content stays inside the rows, supporting-source boundaries are respected, and disputed applicability remains outside the model proposal.

## Completion Math

Compute quality over all 10 positive cases:

- seven-axis average: at least `3.5`;
- Execution Clarity average: at least `4.0`;
- Content Fidelity/Coverage average: at least `4.0`;
- Source/Safety Separation average: at least `4.0`;
- Item keep rate: at least `0.80`;
- unsupported signals: exactly `0`.

The two deterministic negatives are reviewed for exact state/error/disposition and `modelInvoked=false`, but they are not added to the positive quality-score average.

