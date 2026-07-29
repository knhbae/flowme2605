# URL-to-FLOW Prompt Lab v1

**Date:** 2026-07-14<br>
**Status:** Stopped after 3/3 rounds; Prompt Lab v1 incomplete (stability 3/7); Backend No-Go<br>
**Owner:** FlowMe product/content/backend readiness<br>
**Parent contracts:** [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md), [URL-to-Flow Backend Readiness](../2026-07-12-url-to-flow-backend-readiness/spec.md)

## Goal

외부 API 없이 기존 canonical golden fixture 12건을 동일한 source-controlled packet(Source metadata + SourceRows + canonical userJob) 계약으로 다시 변환해, provider-neutral prompt가 원문 근거를 지키면서 쓸 만한 FLOW semantic proposal을 반복 생성하는지 검증한다.

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

- run 12 isolated case packets once and group the evidence into three four-case run logs;
- label current sub-agent evidence `in_session_same_model/unclassified`;
- validate every output, preserve raw failures, and exclude Round 1 qualitative reviews from completion evidence;
- group failures by schema, source accounting, Item boundary, schedule invention, disposition, copy, or risk.

### Round 2 — One Defect Class

- create `prompt-v0.2.md` without rewriting the whole contract;
- change only the highest-risk or most frequent defect class;
- rerun all 12 cases, which covers every Round 1 failure and the sole available pass control;
- reject the revision if a control regresses.

### Round 3 — Stability

- only when Round 2 meets the quality gates;
- rerun all negative cases and representative positive shapes;
- compare the declared core-decision signature and document any semantic-candidate or copy variation;
- do not claim full semantic no-regression without a separate blind review of the stability outputs;
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
| Round 3 core-decision stability | >= 80% (at least 6/7) |

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
- source-controlled cases and hidden expectations
- deterministic builder and validator
- raw run logs for every round
- Round 2 direct blind reviews and corrected user-facing previews; Round 1 qualitative reviews excluded
- comparison Markdown
- Korean self-contained HTML report
- QA evidence for scripts, docs links, HTML rendering, and responsive overflow

## Results

외부 URL fetch나 외부 LLM API 없이 세 번의 라운드 실행 자체는 끝냈다. 그러나 v1 completion gate는 실패했다. 3회 한도를 모두 사용했으며 v0.3이나 4회차는 실행하지 않았다.

| Evidence | Result |
| --- | ---: |
| Round 1 strict validity | 1/12 |
| Round 2 strict validity | 12/12 |
| SourceRow accounting | 16/16 (100%) |
| explicit unsupported action/date/repeat/fact signals | 0 |
| negative dispositions | 2/2 |
| Item keep rate | 100% |
| seven-axis quality average | 4.6/5 |
| Execution Clarity | 4.1/5 |
| Content Fidelity/Coverage | 4.7/5 |
| Source/Safety Separation | 4.7/5 |
| positive case quality gates | 10/10 |
| Round 3 core-decision stability | 3/7 (42.9%) — FAIL |

Round 1은 exact enum과 nested shape가 충분히 고정되지 않은 계약 결함을 드러냈다. prompt-v0.2.md는 이 결함 계층만 보강했고, Round 2는 schema·SourceRow accounting·직접 블라인드 리뷰 품질 gate를 통과했다.

Round 3에서 다시 생성한 7건 중 case-02·11·12만 핵심 결정이 일치했다. 불일치는 다음과 같다.

- case-01: primary artifact와 projection applicability
- case-05: Item intent·completion·candidate 존재 여부
- case-06: projection applicability
- case-10: Item candidate 존재 여부

이 안정성 signature는 status, disposition, artifact/pattern, Item의 SourceRow 묶음·intent·completion mode·candidate 존재 여부, omitted row, projection applicability를 비교한다. 제목이나 완료 문구의 단순 copy 차이보다 더 엄격한 구조 결정 비교다.

질적 평가는 Round 2의 fresh subagent direct blind review 12건만 사용한다. Round 1 리뷰 파일은 문자 손상과 독립성 문제 때문에 completion evidence에서 제외하고, Round 1 raw run과 deterministic validator 결과만 baseline 증거로 남긴다. reviewer는 사람이 아니며 provider/model identity, latency, token, cost, human review time, observed usability는 모두 미측정이다.

따라서 prompt v0.2는 구조 계약 후보이지만 backend나 실제 provider 비교로 넘길 수 있는 안정성 후보는 아니다. 현재 결정은 Backend No-Go다. 추가 tie-break 규칙과 unseen/metamorphic 사례 검증은 사용자가 Prompt Lab v2를 승인한 뒤 별도 4회차로 수행한다.

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

- [x] 12개 source-controlled packet이 hidden expectation과 분리되어 재현 가능하게 생성된다.
- [x] prompt와 schema가 provider-neutral이며 canonical 경계를 강제한다.
- [x] deterministic validator가 schema, SourceRow accounting, negative disposition을 재계산한다.
- [x] Round 1 raw output 12건과 38개 오류를 baseline 증거로 보존한다.
- [x] Round 1 질적 리뷰를 completion evidence에서 제외한다.
- [x] Round 2 direct blind review 12건이 문자 무결성과 fingerprint 검증을 통과한다.
- [x] 세 번의 라운드 실행을 마쳤고 4회차는 실행하지 않았다.
- [ ] Round 3 core-decision stability가 6/7 이상이다. 실제는 3/7이다.
- [ ] 모든 v1 completion gate가 통과한다.
- [x] 비교 Markdown과 15장 한국어 HTML 보고서가 증거 경계와 Backend No-Go를 공개한다.
- [x] Prompt Lab 범위의 스크립트·링크·반응형 HTML 증거 무결성이 검증된다.
