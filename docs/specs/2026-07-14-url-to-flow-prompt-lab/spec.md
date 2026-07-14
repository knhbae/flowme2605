# URL-to-FLOW Prompt Lab v1

**Date:** 2026-07-14<br>
**Status:** Completed controlled Prompt Lab v1 candidate; not a production provider or backend<br>
**Owner:** FlowMe product/content/backend readiness<br>
**Parent contracts:** [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md), [URL-to-Flow Backend Readiness](../2026-07-12-url-to-flow-backend-readiness/spec.md)

## Goal

외부 API 없이 기존 canonical golden fixture 12건을 동일한 source-only 입력 계약으로 다시 변환해, provider-neutral prompt가 원문 근거를 지키면서 쓸 만한 FLOW semantic proposal을 반복 생성하는지 검증한다.

```text
golden fixture
-> generator에 숨긴 canonical 정답
-> source metadata + SourceRows + userJob packet
-> prompt 실행
-> strict proposal validation
-> blind review + 교정본
-> prompt 결함 한 가지 수정
-> 선택 재실행과 회귀 확인
```

## User Need

```text
As a FlowMe product owner preparing a URL-to-FLOW backend,
I need the same real-source cases converted repeatedly under one contract,
so that I can tell whether the prompt preserves source truth and produces a Flow worth reviewing before paying for a provider or building storage.
```

## Why This Lab Exists

`prompt + URL`만 실행하면 fetch, extraction, semantic conversion 실패가 섞인다. v1은 저장된 SourceRows를 모든 실행에 동일하게 제공해 **변환 품질**만 먼저 측정한다. 이후 같은 packet에서 SourceRows를 제거한 URL-only lane을 별도 실험할 수 있지만 이번 목표에는 포함하지 않는다.

이 lab은 다음을 증명하지 않는다.

- production URL fetch/extraction 안전성
- 실제 저가·고가 모델의 품질 또는 비용 우열
- DB/API/worker의 구현 준비 완료
- 공개 발행 또는 사용자 검증

## Fixed Test Set

- positive 10건: D-day, fixed routine, source checklist, ordered procedure, table progress, memo-first, decision/hold, evidence/caution, resource queue, sparse official lifecycle
- negative 2건: missing source rows, non-local sensitive source
- authority: [golden-fixtures-v1.json](../2026-07-11-canonical-flow-data-model/golden-fixtures-v1.json)
- generator input: [cases-v1.json](./cases-v1.json)
- hidden reviewer expectation: [expected-v1.json](./expected-v1.json)

`cases-v1.json`에는 canonical Item, expected status, expected projection, review score를 넣지 않는다. negative fixture는 canonical `content=null`이므로 source acquisition/locale evidence만 기존 review artifact에서 명시적으로 보충한다.

## Prompt Boundary

LLM 역할은 [prompt-v0.1.md](./prompt-v0.1.md)의 semantic proposal까지다.

| Owner | Responsibilities |
| --- | --- |
| Deterministic case builder | stable case IDs, source packet, target locale, maxItems, hidden expectations |
| Prompt/model | source shape, Item boundary, action copy, completion wording, Memo/grouping candidates, omission explanation |
| Deterministic validator | schema, enums, state pairing, SourceRow references, accounting, cap, projection/status invariants |
| Blind reviewer | semantic fidelity, Item keep/edit/delete, risk/localization, final usability |
| Future backend | URL fetch, stable IDs, date parsing, canonical persistence, projection serialization, state transitions |

The model must not create authoritative canonical IDs, parsed dates, RRULE, ICS, persistence state, readiness approval, automatic save, or publication.

## Output Contract

Every run emits [proposal-schema-v1.json](./proposal-schema-v1.json).

Key boundaries:

- `status.readiness` is always `null`; provider output cannot promote content.
- `scheduleCandidate` only cites source text and keeps `parsedByRule=false`.
- every Item has one or more input SourceRow IDs.
- every input SourceRow is mapped or explicitly omitted, unless a declared partial/import boundary accounts for it.
- failed cases contain no Items or projections.
- model/provider/score/cost metadata stays outside user content.

## Iteration Protocol

Maximum three prompt rounds prevent fixture overfitting.

### Round 1 — Baseline

- run all 12 cases once in isolated executions;
- label current sub-agent evidence `in_session_same_model/unclassified`;
- validate and blind-review every output;
- group failures by schema, source accounting, Item boundary, schedule invention, disposition, copy, or risk.

### Round 2 — One Defect Class

- create `prompt-v0.2.md` without rewriting the whole contract;
- change only the highest-risk or most frequent defect class;
- rerun every failed/revise case plus at least three Round 1 pass controls;
- reject the revision if a control regresses.

### Round 3 — Stability

- only when Round 2 meets the quality gates;
- rerun all negative cases and representative positive shapes;
- confirm structural decision consistency and no regression;
- otherwise document the residual blocker instead of adding fixture-specific answers to the prompt.

## Completion Gates

v1 completes only when current evidence proves all of the following.

| Gate | Threshold |
| --- | ---: |
| JSON/schema valid | 100% |
| SourceRow accounting | 100% |
| invented action/date/repeat/fact | 0 |
| negative disposition | 2/2 |
| reviewer Item keep rate | >= 0.80 |
| seven-axis average | >= 3.5 |
| Execution Clarity | >= 4 |
| Content Fidelity/Coverage | >= 4 |
| Source/Safety Separation | >= 4 |

The detailed scoring and evidence separation are in [review-rubric.md](./review-rubric.md).

## Model Comparison Evidence

Every run records:

- prompt/case/schema version;
- provider/model label when known;
- `evidenceKind`;
- latency/token/cost values plus their evidence quality;
- raw proposal and validator result.

The current Codex sub-session runs are useful for prompt contract and repeatability only. They are not cheap/premium evidence because this environment does not expose per-subagent model selection. The generated copy-paste packets can later be run in separate model-selected sessions with the same prompt, cases, schema, and reviewer.

## Deliverables

- prompt versions and proposal schema
- source-only cases and hidden expectations
- deterministic builder and validator
- raw run logs for every round
- blind reviews and corrected user-facing previews
- comparison Markdown
- Korean self-contained HTML report
- QA evidence for scripts, docs links, HTML rendering, and responsive overflow

## Results

The controlled experiment completed in three rounds without external URL fetching or an external LLM API.

| Evidence | Result |
| --- | ---: |
| Round 1 strict validity | 1/12 |
| Round 2 strict validity | 12/12 |
| SourceRow accounting | 100% |
| explicit unsupported action/date/repeat/fact hard fails | 0 |
| negative dispositions | 2/2 |
| Item keep rate | 100% |
| seven-axis quality average | 4.41/5 |
| Execution Clarity | 4.0/5 |
| Content Fidelity/Coverage | 4.9/5 |
| Source/Safety Separation | 4.4/5 |
| Round 3 exact structural stability | 6/7 (85.7%) |

Round 1 exposed one dominant contract defect: the prompt described the intended structure but did not enumerate every exact enum and nested shape accepted by the strict schema. `prompt-v0.2.md` changes only that defect class. Round 2 then passed every deterministic gate. Round 3 independently reran five representative positives and both negatives; case 05 alone added a blocked Calendar projection while preserving status, artifact, Item count, SourceRow grouping, and applicable destinations.

The blind review is an in-session model proxy, not observed-user evidence. Provider tier, latency, token usage, cost, human review time, and full usability remain unmeasured. The report therefore treats v0.2 as a backend experiment candidate, not as production or cheap-versus-premium proof.

## Scope Boundaries

### In

- controlled prompt quality and stability
- source/risk and projection planning
- reusable model-session packets
- current-session evidence disclosure

### Out

- arbitrary live URL fetch
- external LLM API or secret
- prompt pricing lookup and provider selection
- DB, app runtime, API route, worker, automatic retry
- save, publish, external account write

## Direction Capture

This spec is the canonical record of the user's approved multi-step prompt experiment. Source/run/review/report evidence stays under `docs/content-audit/2026-07-14-url-to-flow-prompt-lab/`. A new durable product decision is added to `docs/DECISIONS.md` only if the experiment changes the existing rules-first/Item-centered contract.

## Reopen Triggers

Reopen the experiment design when:

- existing SourceRows are too sparse to judge expected scheduling or completion semantics;
- a real provider supports a stricter structured-output contract;
- selected cheap/premium models can be run with measured pricing and latency;
- observed users reject the reviewer-defined Item boundary even when the contract passes.

## Acceptance Criteria

- [x] 12 source-only packets are reproducibly generated and separated from expectations.
- [x] prompt and schema are provider-neutral and enforce current canonical boundaries.
- [x] a single/batch validator covers every completion gate it claims.
- [x] all 12 cases have Round 1 raw outputs, reviews, and positive FLOW or negative-disposition previews.
- [x] prompt defects are revised and selected cases are rerun, within three rounds.
- [x] final metrics satisfy every completion gate.
- [x] comparison Markdown and Korean HTML report disclose evidence limits.
- [x] docs, scripts, and rendered HTML pass their verification lanes.
