# URL-to-Flow Output Quality Lab v2

**Date:** 2026-07-20

**Status:** Review-ready / automated evidence complete; product-owner review pending

**Scope:** source-backed output generation and review evidence; no app or production backend change

## Goal

실제 원문을 기준으로 URL-to-Flow의 전체 산출물 체인을 반복 생성·비교한다.

```text
원문과 SourceSnapshot
→ SourceRows와 누락 범위
→ Flow 콘텐츠 가능 여부와 이유
→ Taxonomy v1.1 분류
→ canonical Flow / Step / Item / Field / Memo
→ Calendar / Checklist / Todo / Sheet / Memo projection
→ 손실·권리·안전·검토 상태
```

대표 18건을 기본 3회 독립 생성·검토한다. 강화된 validator가 이전에는 보이지 않던 control regression을 새로 검출한 경우에만 안정성 Round 4를 한 번 허용하며, 연속 두 배치가 종료 기준을 통과한 뒤에만 사용자가 판단할 수 있는 한국어 HTML 갤러리를 검토 요청 상태로 올린다.

## Why v2

[Prompt Lab v1](../2026-07-14-url-to-flow-prompt-lab/spec.md)은 주어진 SourceRow packet 안에서의 schema, SourceRow accounting, 발명 방지와 semantic proposal 품질을 확인했다. 그러나 아래는 충분히 검증하지 못했다.

- 원문 전체가 SourceRows에 충분히 담겼는가
- 각 SourceRow가 실제로 체크 가능한 Item인가, 아니면 Field/Memo/Reference/Conditional/Omission인가
- 평균 점수가 잘못된 primary artifact를 가리지 않는가
- 실제 Calendar/Checklist/Todo/Sheet/Memo 결과물에 필수 정보가 남는가
- 사람이 구조를 다시 만들지 않고도 검토·교정할 수 있는가

대표적인 회귀 사례는 두 개다.

- K-MOOC는 과거 Prompt Lab에서 전체 강좌 중 2개 주차만 입력하고도 높은 원문 충실도 점수를 받았다. v2에서는 확인한 14개 주차 행 전체가 진도표에 보여야 한다.
- 농사로 폭염 가이드는 예방 체크, 조건부 작업 중지, 응급 대응, 경영주 의무가 섞여 있다. 모든 행을 반복 체크 Item으로 바꾸지 않는다.

## User Need

```text
As a FlowMe product owner reviewing URL-to-Flow quality,
I need full-source examples shown from evidence through actual tool outputs,
so that I can judge whether the result is useful, awkward, or wrongly structured without reading internal schemas first.
```

## Evidence Baseline

- [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md)
- [URL-to-Flow Backend Readiness](../2026-07-12-url-to-flow-backend-readiness/spec.md)
- [Prompt Lab v1](../2026-07-14-url-to-flow-prompt-lab/spec.md) and its [review rubric](../2026-07-14-url-to-flow-prompt-lab/review-rubric.md)
- [Taxonomy v1.1](../2026-07-20-flowme-taxonomy-v1-1/spec.md)
- [Source expansion evidence](../../content-audit/2026-07-19-flow-content-source-expansion-final-ko.html)
- [Current five-case usage preview](../../content-audit/2026-07-19-flow-content-usage-preview-ko.html)
- Other-session P0 display experiments under `docs/content-audit/2026-07-20-flowme-four-modes-p0-24-gallery-assets/`

The P0 display assets are a presentation reference only. Their in-progress files are not modified by this goal.

## Test Portfolio

### 18-case structure

| Lane | Count | Purpose |
| --- | ---: | --- |
| Core positive | 8 | 사용자 검토 화면에서 완전한 원문→Flow→projection을 평가 |
| Core boundary | 4 | `partial`, `source_import_required`, `hold`, `reject`가 완전한 Flow처럼 보이지 않는지 평가 |
| Positive regression controls | 4 | 규칙 수정 후 이미 통과한 구조의 회귀 검사 |
| Negative regression controls | 2 | 발명, 누락, 잘못된 승격을 차단하는 회귀 검사 |

사용자 검토 갤러리는 core 12건을 먼저 보여주고, regression 6건은 접힌 부록과 machine-readable evidence로 제공한다.

### Required coverage

- execution patterns: `date_preparation`, `ordered_procedure`, `repeating_routine`, `progress_tracking`, `resource_queue`, `compare_decide`, `phase_lifecycle`
- conditional/reference pressure case: 농사로 안전 가이드
- primary artifacts: `calendar`, `checklist`, `todo`, `sheet`, `memo`; 각 artifact는 최소 2개의 판정 근거를 확보
- source shapes: 날짜 역산, 날짜창, 절차, 체크리스트, 표·강의 행, 자료 모음, 결정 기준, 서술·조건 혼합
- source/provider formats: 공식 HTML/PDF, creator/blog, video/resource, table/file, curriculum, template
- review states: ready candidate, partial, source import required, rights hold, safety/locale hold, no executable user job
- life areas: 최소 7개 영역; 한 좁은 주제나 같은 artifact가 배치를 지배하지 않음

K-MOOC 전체 주차 진도와 농사로 조건부 안전 콘텐츠는 고정 회귀 사례다. 기존 10개 representative DTO는 후보 풀이지 정답이 아니며, 실제 원문과 어긋나면 재분류한다.

## Frozen Source Contract Before Generation

모델이나 독립 변환 에이전트에 결과를 보여주기 전에 각 사례마다 다음 gold evidence를 잠근다.

- primary source와 snapshot locator
- bounded Flow가 주장하는 원문 범위
- 예상 전체 행 수와 반드시 보존할 landmark
- 각 행의 허용 역할: `Item`, `Field`, `Memo`, `Reference`, `Conditional response`, `Omission`
- 허용 가능한 primary/secondary artifact
- 금지되는 일정·반복·체크·판단
- 기대 상태: complete, partial, source import required, hold, reject
- 권리·지역·안전·개인정보·공개 blocker

`SourceRow accounting=100%`는 이 gold source contract가 확인한 전체 범위를 기준으로 계산한다. 모델에 제공한 작은 packet만 100% 사용했다고 통과시키지 않는다.

## Required Output Envelope Per Case

1. **Source evidence**
   - URL, snapshot, checked time, source scope
   - SourceRows, landmarks, omitted/missing rows
2. **Feasibility**
   - `generationState`, `outcome`, `conversionReadiness`, `errorCode`
   - 가능/부분/보류/거절 이유와 blockers
3. **Classification**
   - life areas and topic tags
   - source shape, execution pattern, primary/secondary artifacts
   - audience/applicability, access, rights and review states
4. **Canonical Flow draft**
   - Flow, Steps, Items, Fields, Memos and SourceReferences
   - completion/schedule semantics and user-edit boundary
5. **Five projections**
   - Calendar, Checklist, Todo, Sheet, Memo
   - each result is `primary`, `secondary`, `fallback`, `blocked`, or `not_applicable`
   - essential retained fields and explicit loss manifest
6. **Review evidence**
   - validator result, independent classifications, corrections, review time
   - before/after output and unresolved disagreements

## Iteration Protocol

### Round 0 — Evidence freeze

- Freeze the 18 case IDs, source scope, gold landmarks, role labels and expected gates.
- Separate source acquisition/extraction quality from semantic conversion quality.
- Preserve model/provider identity outside blind review packets.

### Round 1 — Baseline

- Run all 18 cases under one frozen prompt/schema/validator version.
- Produce the full output envelope even for partial/hold/reject cases; failed cases contain no invented canonical Items or projections.
- Review rules-first, independent conversion, and independent reviewer judgments without sharing results in advance.

### Round 2 — One global defect class

- Fix only the highest-risk or most frequent global defect: for example source completeness, checkability, primary artifact, conditional/reference handling, or projection loss.
- Rerun every failed/revise case plus all 6 regression controls.
- Reject a change that improves one case by adding case-specific exceptions or regresses a control.

### Round 3 — Stability only if needed

- Run when Round 2 does not yet satisfy two consecutive clean batches or when blocking disagreement remains.
- Round 3 이후 새 semantic validator가 과거 대조군의 선언-실물 불일치를 처음 검출한 경우에만 동일 규칙의 Round 4 stability 배치를 허용한다.
- Round 4 이후에는 중단하고 unresolved model/taxonomy/projection boundary를 숨기지 않고 보고한다.

## Review Gates

### Hard gates

| Gate | Threshold |
| --- | ---: |
| Schema and canonical validator | 100% |
| Full-source row and landmark coverage | 100% |
| SourceRows assigned to Item/Field/Memo/Reference/Conditional/Omission | 100% |
| Partial source mislabeled complete | 0 |
| Invented action/date/repeat/fact/result | 0 |
| Unsupported projection presented as usable | 0 |
| Essential-field retention in applicable projections | 100% |
| Negative/hold/reject expected disposition | 100% |
| Safety-case checkability precision | 100% |
| Blocking disagreement between independent reviews | 0 |

### Quality and correction gates

| Gate | Threshold |
| --- | ---: |
| Overall checkability precision | >= 95% |
| Core taxonomy and primary-artifact gold match | >= 90% |
| Independent three-way exact match | >= 85% |
| Median Item keep rate | >= 0.80 |
| Core positive no/minor edit | >= 7 / 8 |
| Major/full structural regeneration among ready-labeled cases | 0 |
| Median independent correction time | <= 5 minutes |
| 75th percentile correction time | <= 10 minutes |
| Control regression | 0 in two consecutive batches |

The goal's 85% minimum agreement remains a floor; gold-match gates are stricter. Agreement is repeatability evidence, not proof of correctness.

## Human Review Request Gate

사용자에게 검토를 요청하는 시점은 산출물 파일이 생긴 때가 아니라 아래 조건이 모두 충족된 때다.

- core 12건이 `원문 → 추출 → 가능 여부 → 분류 → Flow → 실제 도구 결과 → 손실·검토 상태` 순서로 이어진다.
- 첫 화면부터 실제 강한 사례 4건과 논쟁/보류 사례 2건을 보여준다.
- K-MOOC는 전체 진도 행, 농사로는 조건·참고·응급과 실제 체크 행동의 경계를 보여준다.
- ready로 표시한 사례에는 미해결 blocker와 blocking disagreement가 없다.
- 사용자는 내부 enum을 읽지 않고도 `쓸 만함 / 애매함 / 부자연스러움`과 이유를 판단할 수 있다.
- 자동·에이전트 QA는 별도 섹션에 두고 observed-user evidence나 실제 유용성 검증이라고 부르지 않는다.

## Deliverables

Under this spec:

- `spec.md`
- `plan.md`
- `tasks.md`
- `qa.md`
- `case-manifest-v2.json`
- `gold-source-contract-v2.json`
- `output-envelope-v2.schema.json`
- `review-rubric-v2.md`
- `review-results-v2.json`
- `comparison-v2.json`
- `runs/round-*/`

Human-facing evidence:

- `docs/content-audit/2026-07-20-url-to-flow-output-quality-review-ko.html`
- optional companion assets only when they materially improve source/result comparison

## Scope Boundaries

### In scope

- existing and newly verified source snapshots
- source completeness and role labeling
- feasibility, taxonomy, canonical draft and projection generation
- deterministic validators and read-only model/agent comparison
- reviewable HTML/JSON evidence

### Out of scope

- app runtime and current seed changes
- DB/storage and account behavior
- real provider/LLM API integration or cheap-versus-premium cost claims
- production URL crawler, worker, retry queue or arbitrary fetch security
- public content approval, commit, push, PR, merge or deploy
- claims of observed-user validation

## Reopen Triggers

Reopen the contract when a full source cannot fit the current SourceRow roles, conditional/reference behavior cannot be represented canonically, a destination loses execution-critical information, or the user's review rejects the supposedly natural artifact in more than two core cases.

## Completion Evidence

- Frozen portfolio: 18 cases, 152 SourceRows, exact-once role accounting 100%.
- Round 3 and Round 4: four-axis three-way agreement 100%, gate three-way agreement 100%, actual projection semantic retention 100%, unsupported inference 0, control regression 0.
- Independent stopwatch review: Round 3 core 8/8 and Round 4 core 8/8 measured. Round 4 median 34.966 seconds, P75 51.198 seconds.
- Round 4 copy review found three non-structural minor edits; the K-MOOC, NASA and 국민체력100 completion copy was corrected without changing Items, taxonomy or gates.
- Browser QA: desktop 1280px and mobile 390px have no document-level horizontal overflow or console error. K-MOOC renders 14 rows and 농사로 renders two normal Items plus three conditional responses in an internal-only Memo.
- This evidence is deterministic QA, blind independent-agent comparison and browser QA. Actual usefulness remains pending product-owner review and is not observed-user validation.
- Provider/model token use, latency and monetary cost were not measured because no real LLM API was called.
