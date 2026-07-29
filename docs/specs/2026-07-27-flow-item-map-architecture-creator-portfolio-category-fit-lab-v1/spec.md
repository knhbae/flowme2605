# FlowMe Item·Map Architecture & Creator Portfolio Category Fit Lab v1

**Date:** 2026-07-27  
**Status:** active architecture lab; no runtime adoption  
**Owner:** FlowMe product/data architecture  
**Evidence level:** source-backed dry-run, deterministic validation, internal expert review

## Goal

FlowMe의 current canonical v1, 표준에 맞춘 literal ICS-first, Item-first shared-context 세 구조를 같은 콘텐츠 의미 계약에 적용한다. 제작자 콘텐츠 발굴 세션의 9개 카테고리 대표 번들을 primary corpus로 삼아 Item뿐 아니라 Flow Map 구성, attribution, 외부 projection, round-trip 손실과 runtime 이행 영향을 비교한다.

이번 결과는 데이터 구조 채택 제안이다. 앱 구현, 실제 외부 Calendar import, 공개 승인, 관찰 사용자 검증은 아니다.

## Decision Question

다음 중 어느 구조가 source provenance와 독립 실행 상태를 보존하면서 사용자의 공통 일정 입력을 줄이고, 9개 lifeArea 및 서로 다른 Map 형태를 가장 자연스럽게 지원하는가?

1. `current_canonical_v1`
2. `literal_ics_first`
3. `item_first_shared_context`

현재 runtime은 이행 비용 비교용 baseline이며 채택 후보가 아니다.

## Primary Evidence

- `docs/content-audit/2026-07-23-creator-flow-portfolio-data-v1.json`
- `docs/content-audit/2026-07-23-creator-flow-portfolio-review-ko.html`
- `docs/content-audit/2026-07-23-creator-flow-portfolio-logic-handoff-ko.md`
- `docs/content-audit/2026-07-23-creator-flow-portfolio-assets/opened-creator-url-ledger-v1.json`
- Canonical Flow Data Model v1, Taxonomy v1.1, URL-to-Flow backend readiness

`representativeFlowExamples[].userContentBundle`은 사용자용 입력이고, `sourceRows`는 provenance 기준이다. `creatorPortfolioRecords`와 `candidateDiscoveryLedger`는 내부 선정 자료이며 사용자용 Flow로 직접 변환하지 않는다.

## Corpus

### Primary category corpus

9개 `representativeFlowExamples` 전체를 사용한다.

| lifeArea | creator | bundle | shape |
| --- | --- | --- | --- |
| home_living | 아정당 | 이사 D-30 | ordered date-offset map |
| family_parenting | 뿐이토핑이유식 | 초기 이유식 D+174~209 | ordered source-day table |
| study_reading | 오픽만수르 | 모의고사 계획표 | progress plan variants |
| money_admin_purchase | 겟차 | 신차 구매 8단계 | ordered procedure + decision |
| health_fitness | Allblanc TV | 7일 복근 챌린지 | ordered resource challenge |
| travel_outings | 트리플 | 출국 전 체크 | unscheduled checklist |
| meals_grocery | 우리의식탁 | 여름 반찬 5가지 | source curation |
| work_career | AND Studio | 취업 준비 영상 3편 | unordered collection |
| hobby_pet | 핏펫 | 생후 6~16주 예방접종 | single sensitive schedule |

입력 기준 수치는 Flow 22, Step 57, Item 148, SourceRow 198이다.

### Expansion, boundary, regression

- expansion은 27개 심층 creator 중 실제 열린 단일 원문과 실행 행이 확인되는 콘텐츠만 최대 9개 고른다.
- boundary는 기존 `source_import_required`, `Hold`, `Single`, 다중 creator platform, source-row 미확보 사례를 최소 6개 둔다.
- value-qualified benchmark는 creator corpus에 없는 공식 날짜창, 행정, 비교표, 안전, 권리/원문 경계만 4~6개 회귀검증한다.

Creator `Go`는 source readiness, 권리 승인, 공개 승인 또는 제휴 완료를 뜻하지 않는다.

## Map Contract

최소 네 Map 의미를 보존한다.

- `ordered`: 원문이 child 순서를 정의한다.
- `source_curation`: curator가 고른 묶음이지만 실행 순서는 필수가 아니다.
- `unordered_collection`: child Flow가 독립적이다.
- `single_sensitive_schedule`: 한 민감 일정이며 trust anchor와 최신성 검토가 필요하다.

Map은 날짜 없는 부모 ICS가 아니다. Map/Flow/Step은 자식 Item의 완료 상태를 중복 소유하지 않고 진행률을 파생한다.

## Architecture Hypothesis

`item_first_shared_context`가 선행 가설이다.

- Item ID, completion, source refs는 독립 보존한다.
- 같은 날짜·장소·세션·방문·기준일을 실제로 공유하는 Item만 `sharedContextRef`로 묶는다.
- 각 Item의 `effectiveSchedule`은 결정적이다.
- Item override는 다른 Item을 바꾸지 않는다.
- Calendar 정책은 `none | per_item | step_bundle`이다.

이 가설이 current canonical보다 의미 보존이나 투영 품질을 낮추거나 입력 감소를 증명하지 못하면 current canonical을 유지한다.

## Non-negotiable Invariants

- SourceRow가 있는 Item provenance 100%.
- 원문에 없는 행동·날짜·반복·완료 기준 0.
- 일정 없는 VEVENT 0.
- VEVENT/VTODO 물리적 중첩 0.
- primary source가 다른 child Flow의 SourceRow 혼합 0.
- rights, locale, safety, privacy 누락 0.
- 신규 `primaryArtifact=hybrid` 0.
- 모든 projection에 loss manifest 존재.
- source 값을 사용자에게 다시 요구하는 입력 0.
- Stop control recall 100%.

## Evaluation

Hard gate 통과 후 다음 가중치로 평가한다.

| dimension | weight |
| --- | ---: |
| source meaning and provenance | 20 |
| independent execution/completion state | 15 |
| category and Map generality | 15 |
| natural projection quality | 15 |
| user input/edit simplicity | 10 |
| ICS/external interoperability | 10 |
| progress/decision/conditional expression | 10 |
| runtime migration complexity | 5 |

내부 expert task walkthrough는 다음을 확인한다.

- 첫 행동을 찾을 수 있는가
- 필수 시작 입력이 0~2개인가
- 공통 날짜를 한 번만 입력·수정할 수 있는가
- 한 Item만 일정 override할 수 있는가
- 형제 Item 완료 상태가 독립적인가
- export 결과와 손실을 예측할 수 있는가
- source와 caution을 찾을 수 있는가

이는 관찰 사용자 검증이 아니다.

## Adoption Rule

`item_first_shared_context`는 다음이 모두 참일 때만 채택 권고한다.

1. 같은 일정의 다중 Item 사례 3개 이상에서 일정 입력/수정이 1회다.
2. effective schedule과 `per_item`/`step_bundle` 출력이 결정적이다.
3. 단일 Item override가 형제 Item을 바꾸지 않는다.
4. Item/source/completion/version 의미 손실이 없다.
5. current canonical 대비 projection 품질 저하가 없다.
6. 기존 canonical adapter를 비파괴적으로 확장할 수 있다.

Literal ICS-first는 VTODO/관계가 round-trip에서 소실되거나, Sheet/결정/Memo/SourceRow 의미를 DESCRIPTION 또는 대량의 X-property에 의존하거나, FlowMe 실행 상태와 외부 Calendar 상태를 분리하지 못하면 canonical 후보에서 탈락한다.

## Deliverables

- Machine-readable corpus, gold contract, three schemas, runs and fixtures
- Projection loss and round-trip evidence
- Category/Map fit matrix and architecture scorecard
- Attribution and Map type contracts
- Runtime migration impact and final architecture decision
- Validator/tests
- Korean PPT-style HTML review
- Korean 10~12 slide PowerPoint decision summary

## Out Of Scope

- 앱 runtime, DB, crawler, production LLM API, seed 변경
- 신규 broad content discovery
- 외부 계정 import/write
- 콘텐츠 공개 승인 또는 제휴 판단
- commit, push, PR, merge, deploy
- 자동 QA를 observed-user validation으로 표현하는 일

