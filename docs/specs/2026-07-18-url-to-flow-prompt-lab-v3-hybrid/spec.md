# URL-to-FLOW Prompt Lab v3 Hybrid Controller

Status: preregistration before v3 execution  
Lane: `url-to-flow-source-row-v3-hybrid-controller`

## Why this lane exists

Strict v2.0 and the single allowed v2.1 prompt revision both produced 11/12 valid outputs. The same row failed twice because the generator treated `예약과 문진표 준비` as an inspection label while the validator treated `준비` as an existing action. Round 3 is forbidden by the v2 gate and v2 evidence remains unchanged.

The failure is a field-ownership problem, not evidence that another case-specific prompt example is needed. v3 removes Korean surface-form normalization from the LLM contract.

## v3 ownership contract

```text
URL source (future scope)
  -> SourceRow extraction (future parser or LLM)
  -> versioned deterministic row-license compiler
  -> final semantic proposal
  -> isolated blind model-proxy review
  -> human save/publish decision
```

For the frozen 12 cases, SourceRows already exist. Therefore v3 invokes no LLM. It measures the controller/contract layer only.

The compiler owns:

- Item `title`, `intent`, and `completionMode`;
- exactly one Item per eligible primary SourceRow;
- artifact and projection selection;
- mandatory resource, missing-date, and supporting-source review markers;
- deterministic negative dispositions.

The source title remains preserved in each SourceRow. Each compiled Item and omission records a rule trace, while the proposal trace records the artifact rule and output hash. The rules never read case IDs, previous outputs, hidden expected answers, or review scores.

## Evidence and non-claims

- v2 raw generator responses and No-Go validations are preserved.
- v3 outputs are `deterministic_controller_replay`, not LLM quality evidence.
- two fresh Node process runs must produce identical proposal fingerprints.
- provider, model tier, tokens, latency, and cost remain unknown; no cheap/premium conclusion is allowed.
- production URL fetch, external API, DB, app runtime, save, publish, and deployment remain out of scope.

## Required outputs

- versioned rules, compiler, protocol, cases, and freeze manifest;
- two deterministic run envelopes and validations;
- cross-run stability comparison;
- three isolated blind model-proxy review batches and review validation;
- ten positive FLOW previews;
- v2 LLM-only versus v3 controller comparison;
- Korean PPT-style HTML report.

## Pass gates

Automatic gates require 12/12 valid proposals, 15/15 eligible rows as Items, 16/16 SourceRows accounted exactly once, 2/2 deterministic negatives, zero unsupported action/date/repeat/fact signals, exact compiler trace integrity, and identical round-1/round-2 proposal fingerprints.

Isolated blind model-proxy review requires Item keep rate at least 80%, seven-axis average at least 3.5, and Execution Clarity, Content Fidelity/Coverage, and Source/Safety Separation each at least 4.0. Any `fail` case or `remove` Item verdict fails the lane. A real human still owns the later save/publish decision.

Passing this lane validates only `SourceRow -> compiled FLOW`. It does not validate `URL -> SourceRow`; that remains the next backend experiment with real fetched pages and provider evidence.
