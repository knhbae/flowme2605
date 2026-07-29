# URL-to-FLOW Prompt Lab v1 — SourceRow-only Corrected Lane

**Date:** 2026-07-15  
**Status:** Preregistered before corrected-lane generation  
**Owner:** FlowMe product/content/backend readiness  
**Preflight evidence:** [2026-07-14 Prompt Lab](../../content-audit/2026-07-14-url-to-flow-prompt-lab/comparison.md)

## Why This Corrected Lane Exists

The 2026-07-14 preflight produced useful schema, validator, review, and presentation artifacts, but it does not prove the requested SourceRow-only conversion quality. All 10 positive generator cases carried a `userJob` that exactly matched the hidden canonical `expectedConversion.userNeed`. The generator therefore received the intended semantic job before conversion.

The preflight remains immutable evidence for prompt-shape and validator defects. It is not reused as corrected-lane quality evidence.

## Goal

Using the same canonical 10 positive and 2 negative cases, test whether a provider-neutral prompt can infer a narrow, source-grounded FLOW proposal when **SourceRow title/detail is the only semantic content supplied to the generator**.

```text
deterministic intake/preflight
-> negative: deterministic no-proposal result, no model call
-> positive: opaque ownership IDs + SourceRows only
-> provider-neutral semantic proposal
-> strict validator
-> blind model-proxy review
-> one defect-class revision
-> representative/negative stability rerun
```

Production URL fetch, external LLM APIs, databases, app runtime, automatic save, and publication remain out of scope.

## Input Contract

### Deterministic preflight only

The pipeline packet may carry the following fields for deterministic gating, but they never enter a generator prompt:

- target locale and source locale/country context;
- source type, rights status, risk level, and access status;
- source title, publisher, URL, checked date, and acquisition notes.

Preflight stops both negative fixtures before model generation:

- `case-11`: missing SourceRows -> `missing_source_rows` / `source_import_required`;
- `case-12`: sensitive non-local applicability is unverified -> `locale_applicability_unverified` / `hold`.

Negative disposition is a pipeline gate, not a claim about model reasoning.

### Generator control fields

Only these non-semantic controls may accompany SourceRows:

- opaque `caseId` and `requestId`;
- `maxItems` as a cap, never a target;
- `sourceOwnership.primarySourceId` and `sourceOwnership.supportingSourceIds` as opaque provenance identifiers.

### Only semantic evidence

- `sourceRows[].rowType`
- `sourceRows[].title`
- `sourceRows[].detail`
- `sourceRows[].order`
- opaque SourceRow/source ownership IDs; canonical descriptive IDs are remapped before prompt construction

### Forbidden generator fields

- canonical or reviewer `userJob` / expected user need
- fixture ID, name, shape, canonical Item, expected status, artifact, projection, score, or readiness
- source title, publisher, URL, checked date, or prose scope description
- prior run, review, corrected preview, model, cost, or timing data

The hidden expectation file may use canonical references for review and warning diagnostics, but it never enters a generator packet.

## Fixed Test Set

- The audit lineage remains exactly `case-01` through `case-12`; generator-visible case, request, source, and SourceRow IDs are opaque remaps.
- Canonical lineage remains `golden-fixtures-v1.json`.
- The corrected case-set version is frozen before any corrected output is generated.
- `case-11` tests missing SourceRows.
- `case-12` tests a sensitive non-local source; its locale/risk decision is made by deterministic preflight and never enters the generator prompt.

## Prompt And Ownership Boundary

The prompt may propose:

- narrow `userNeed`, source shape, and natural artifact candidate;
- SourceRow-to-Item grouping;
- Item title and bounded memo/grouping candidates;
- intent and completion wording under explicit general tie-break rules;
- projection candidates, never serialized exports.

Deterministic code owns:

- intake/preflight, schema, enum, opaque ID mapping, state-pair, cap, SourceRow accounting, and negative-gate output;
- date/cadence parsing and removal of unsupported schedule candidates;
- final projection adapters, storage identity, readiness, save, and publication.

Human review owns disputed source meaning, sensitive/local applicability, rights, and final save.

## Compact Schema Budget

The existing `flowme-semantic-proposal-v1` schema is reused only if the validator proves all of these preregistered limits:

- at most 12 object schemas;
- at most 60 declared properties;
- serialized schema size at most 12 KiB;
- every object has `additionalProperties=false`;
- every declared property required unless explicitly nullable.

## Three-Round Protocol

### Corrected Round 1 — Baseline

- freeze the corrected input cases and prompt before generation;
- execute all 12 pipeline cases in three isolated 4-case batches; only the 10 preflight-positive cases receive model-proxy generation;
- validate raw outputs and preserve every failure;
- identify the highest-risk or most frequent defect class.

### Corrected Round 2 — One Defect Class

- change only one defect class in the prompt;
- re-execute all 12 pipeline cases for full regression coverage; the two negative results remain deterministic and record `modelInvoked=false`;
- validate, create blinded review inputs, and directly review all 12 outputs;
- create corrected user-facing previews for every positive case.

### Corrected Round 3 — Diagnostic Stability

- only after Round 2 satisfies all completion gates;
- rerun the unchanged prompt and all 12 unchanged pipeline packets in fresh contexts;
- require the ordinary schema, grounding, negative, and review-quality gates to pass again;
- compare the preregistered core-decision signature;
- report the exact match rate and mismatch causes.

The user-approved v1 gate list did not specify a stability threshold. Round 3 stability is therefore a required diagnostic result, not a retroactive completion gate. Any future threshold must be preregistered in a separately approved experiment before generation.

## Completion Gates

The corrected v1 completes only when all of the following are proven from the corrected lane. Generation/grounding/quality gates apply independently to both Round 2 and Round 3; cross-round signature stability remains diagnostic only.

| Gate | Threshold |
| --- | ---: |
| SourceRow-only semantic input | 12/12 pipeline packets; 10/10 generator prompts clean; 2/2 negatives stopped pre-model; forbidden semantic fields 0 |
| JSON/schema valid | 100% |
| SourceRow accounting | 100% |
| invented action/date/repeat/fact | 0 |
| negative disposition | 2/2 |
| reviewer Item keep rate | >= 0.80 |
| seven-axis average | >= 3.5 |
| Execution Clarity | >= 4.0 |
| Content Fidelity/Coverage | >= 4.0 |
| Source/Safety Separation | >= 4.0 |
| compact schema budget | all limits pass |
| bare single-result validator | PASS |

## Core-decision Diagnostic Signature

Round 3 compares:

- generation state, outcome, error, and disposition;
- source shape, planning pattern, life area, and primary artifact candidate;
- Item SourceRow grouping, intent, completion mode, and candidate presence;
- omitted SourceRows and projection target/applicability.

Copy wording alone does not create a mismatch.

## Evidence Boundary

- This session may use isolated Codex subagents only as unclassified model-proxy generation/review evidence.
- Generator agents receive only the positive-case generator prompt block and no preflight metadata, canonical IDs, hidden expectations, or earlier reviews.
- Reviewer agents receive blinded source/proposal pairs and no hidden expectations or provider/model labels.
- Provider/model identity, tier, latency, token, cost, and human review remain `not_available` unless directly measured.
- Generated packets remain reusable in later model-selected sessions without changing cases, prompt, schema, validator, or rubric.

## Deliverables

- frozen corrected cases and provider-neutral prompt versions;
- reusable packets for each prompt version;
- compact schema measurement and bare-result validator;
- raw run logs for all corrected rounds;
- blinded Round 2 reviews and positive FLOW previews;
- comparison Markdown and Korean self-contained PPT-style HTML;
- completion verifier and QA record;
- explicit separation of corrected evidence from contaminated preflight evidence.

## Acceptance Criteria

- [ ] corrected pipeline cases separate deterministic preflight metadata from generator input;
- [ ] all 10 positive prompt blocks prove forbidden semantic fields are absent and both negatives prove no model call;
- [ ] corrected Round 1, one-defect Round 2, and diagnostic Round 3 are preserved;
- [ ] every completion gate above passes on corrected evidence;
- [ ] Round 3 stability is reported without post-hoc promotion to a completion gate;
- [ ] model/cost/human evidence boundaries are explicit;
- [ ] comparison Markdown, Korean HTML, and QA are reproducible from scripts.
