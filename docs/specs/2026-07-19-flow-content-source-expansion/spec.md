# Flow 콘텐츠 소스·타깃 확장 검증 v1

**Date:** 2026-07-19
**Status:** Completed research and conversion experiment; user/provider validation remains next
**Owner:** FlowMe product · content · backend readiness
**Parent contracts:** [Flow 콘텐츠 계약 v1](../../content-audit/2026-07-18-flowme-flow-content-contract-v1.json), [Source-to-Flow Conversion Gate](../../flow-rules/source-to-flow-conversion-gate.md), [URL-to-FLOW Prompt Lab v1](../2026-07-14-url-to-flow-prompt-lab/spec.md)

## Goal

현재 반응 근거가 있는 콘텐츠와 제공자를 `사용자 조건 × lifeArea × planningPattern × 플랫폼 역할 × 접근 방식 × 권리 상태`로 다시 탐색한다. 먼저 실제 후보 36개를 한 원장에 모으고, 그중 서로 다른 조건을 대표하는 원문 12개를 같은 Flow 콘텐츠 계약으로 변환하거나 올바르게 보류한다. 마지막으로 대표 6개를 저비용·고비용 모델 조건에서 비교해, P0 콘텐츠 포트폴리오 v2와 URL-to-Flow 백엔드가 지원해야 할 입력·판정 범위를 결정한다.

```text
36개 후보 원장
→ 12개 실제 원문·접근 상태 검증
→ 6개 모델·비용 비교
→ P0 v2 keep / replace / park + backend go / hold / shift
```

이 목표는 “인기 콘텐츠를 많이 모으기”가 아니다. 인기는 발굴 신호이고, Flow 후보 승격은 원문 행의 완결성, 하나의 사용자 일, 자연스러운 결과물, 최신성, 접근 가능성, 권리와 위험을 모두 통과해야 한다.

## Why This Goal Is Next

- 현재 제안 P0 24는 제작자 원본 16개 중 육아 8개, 여행 4개이며 `date_preparation` 8개에 치우쳐 있다.
- 전략상 P0 원본 채널은 YouTube·NAVER·Brunch였지만, 이전 100개 후보 표본은 Tistory·일반 웹·공식 페이지 비중이 높았다.
- 이전 수요 검토 100개 중 눈에 보이는 강한 반응 근거는 4개뿐이었다. 최신 플랫폼·개별 콘텐츠 반응을 다시 수집해야 한다.
- 플랫폼 역할이 섞여 있었다. 원문 호스팅, 제공자 발굴, 배포, 실행 목적지, 벤치마크를 분리해야 한다.
- 조회·저장·별점이 공개 변환 또는 재배포 허가를 뜻하지 않는다.
- 실제 사용자 검증은 아직 없으므로 이번 결과를 “시장 검증”이나 “공개 발행 가능”으로 부르지 않는다.

## Target Conditions

인구통계보다 아래 사용 상태를 후보마다 기록한다.

| ID | 사용 상태 | 간단한 예시 |
| --- | --- | --- |
| `saved_researching_again` | 저장했지만 실행 당일 다시 찾는다 | 여행 준비 글, 아이와 갈 곳 |
| `known_anchor_date` | 마감일·출발일·이사일이 있다 | 이사 D-30, 지원 공고 |
| `repeating_ownership` | 반복 관리·돌봄을 맡아야 한다 | 주간 정리, 운동 루틴 |
| `many_rows_to_progress` | 원문 행·자료가 많아 진도를 잃는다 | 14주 강의, 30일 학습 |
| `decision_uncertainty` | 비교·보류·중단 기준이 필요하다 | 리모델링 계약, 구매 비교 |
| `handoff_or_share` | 가족·팀·동행자에게 인계한다 | 여행 역할, 행사 준비 |
| `official_latest_check` | 공식·지역·최신 조건을 다시 봐야 한다 | 행정 신청, 돌봄·안전 |
| `portable_tool_transfer` | 캘린더·Todo·Sheet·Memo로 옮기고 싶다 | 일정, 체크, 비교표 |

한 후보는 여러 조건을 가질 수 있다. 이 값은 `lifeArea`나 `planningPattern`을 대신하지 않는다.

## Platform Roles

| 역할 | 질문 | 예시 | 백엔드 의미 |
| --- | --- | --- | --- |
| `source_host` | 실제 원문 행이 있는가? | 오늘의집, Maily, K-MOOC, GitHub | fetch·extract 후보 |
| `provider_discovery` | 권리자·제공자를 찾는 곳인가? | 숨고, 여행에미치다, Gumroad | 제휴·파일 제공 흐름 |
| `distribution` | 사용자가 콘텐츠를 발견하는 곳인가? | YouTube, Pinterest, Careerly | 원 출처로 이동 |
| `execution_destination` | 완성된 Flow를 어디에 쓰는가? | Calendar, Todoist, Notion, Sheets | projection·export |
| `benchmark_or_competitor` | 구조·수요는 보되 직접 가져오면 안 되는가? | roadmap.sh, Medium 인기 목록 | hold·benchmark |

하나의 플랫폼이 두 역할을 가질 수 있지만, 후보 레코드에서는 이번 실험의 주 역할을 하나로 고정한다.

## Canonical Unit And Output

```text
SourceRow → Item → Step → Flow → Bundle / Flow Map
```

- `SourceRow`는 출처의 최소 근거 단위다.
- `Item`은 독립 완료·결정·기록·보류·일정 상태를 갖는 최소 실행 단위다.
- ICS, Markdown checklist, CSV/XLSX, Memo는 같은 Item을 목적지에 맞게 보여주는 projection이다.
- 원문이 구조를 뒷받침하지 않으면 항목 수를 채우지 않고 `hold` 또는 `source_import_required`를 낸다.

## Experiment Funnel

### Stage A — Candidate Ledger 36

- 실제 URL 또는 명시적 제공자 페이지 36개 이상
- 플랫폼·제공자 class 12개 이상
- 9개 `lifeArea`와 7개 `planningPattern` 전부 포함
- 8개 `targetCondition` 전부 반복 표본 확보
- 각 후보에 반응 지표 종류·값·관측일·근거 URL 기록
- 플랫폼 전체 규모와 개별 콘텐츠 반응을 `signalLevel`로 분리
- 원문 호스트와 제공자 발굴 채널을 구분

### Stage B — Deep Source Set 12

- 한국어·한국 상황 원문 8개 이상
- 공개 라이선스 또는 공식 API 대조군 2개 이상
- 허가·로그인·유료·차단 조건 대조군 2개 이상
- 플랫폼·제공자 유형 6개 이상, 원문 형식 4개 이상
- 12개 모두 원문 스냅샷, SourceRow, 한 가지 user job, 자연 결과물, 접근·권리·지역·위험 판정 보유
- 변환 가능하면 canonical draft package를 만들고, 불가능하면 이유가 보이는 hold package를 만든다.
- 최소 8개는 내부 리뷰 가능한 Flow package까지 도달한다. 이는 공개 발행 승인이 아니다.

### Stage C — Model And Cost Set 6

- 단순 순서형 1, 날짜형 1, 표·행형 1, 자료 큐/단계형 1, 위험·지역성 1, 올바른 보류 1
- 동일 source packet·schema·rubric으로 저비용·고비용 모델을 각각 실행
- 모델명, API/세션 증거 수준, 입력·출력 token, 지연, 비용, 재시도, 편집 시간 기록
- 구조 통과율뿐 아니라 source fidelity, Item keep rate, 편집 부담, 자연 결과물 품질 비교
- 실제 가격·token이 노출되지 않는 세션은 추정치로 표시하고 측정값과 섞지 않는다.

### Stage D — Decision

- 기존 P0 24와 비교한 `keep / replace / park` 제안
- 지원할 `accessMode` 우선순위
- URL-to-Flow backend의 `go / hold / shift` 판정
- 다음 4주에 실제 사용자·제공자에게 보여줄 3~5개 대표 Flow 선정

## Candidate Record Contract

```text
targetConditions
lifeArea
planningPattern
portfolioRole
sourcePlatform
platformRole
providerType
sourceFormat
engagementSignal { signalLevel, metric, value, observedAt, evidenceUrl }
userJob
sourceRowsAvailable
primaryArtifact
accessMode
rightsMode
localizationAndRisk
conversionState
promotionState
```

지원할 초기 상태값:

- `accessMode`: `public_html`, `official_api`, `rss`, `user_authorized`, `creator_file`
- `rightsMode`: `open_license`, `link_only`, `permission_required`, `paid_private`, `blocked`
- `conversionState`: `ready`, `source_import_required`, `permission_required`, `provider_lead`, `hold`

## Deliverables

1. 후보 36개 JSON ledger와 검색·선정 근거
2. 12개 원문별 `원문 → SourceRow → Flow/hold → projection` 비교 gallery
3. 6개 저비용·고비용 모델 비교표와 실제·추정 비용 분리
4. 초반부터 구체 예시가 보이는 한국어 HTML 의사결정 보드
5. P0 포트폴리오 v2 `keep / replace / park` 제안
6. URL-to-Flow backend 입력·접근·권리·판정 요구사항
7. 실제 사용자·제공자 검증으로 넘길 3~5개 대표 Flow와 관찰 질문

초기 조사 근거는 [후보 원장](../../content-audit/2026-07-19-flow-content-source-expansion-seed.json)에, 최종 결과는 [한국어 의사결정 보드](../../content-audit/2026-07-19-flow-content-source-expansion-final-ko.html)와 [12개 deep set](../../content-audit/2026-07-19-flow-content-source-expansion/deep-set-v1.json), [제품 결정 JSON](../../content-audit/2026-07-19-flow-content-source-expansion/product-decision-v1.json)에 둔다.

## Scope

### In

- 현재 반응 신호가 있는 국내외 원문·제공자 검색
- 원문 접근·권리·최신성·지역성·민감성 판정
- canonical draft 또는 명시적 hold 생성
- 세션/모델 비교와 비용·편집 부담 측정 설계
- 기존 P0 24 대비 포트폴리오 결정

### Out

- 앱 seed·서비스 코드 변경
- DB·queue·worker·live LLM API 구현
- 플랫폼 무단 크롤링 또는 로그인을 우회한 수집
- 제작자에게 연락하거나 제휴를 확정하는 외부 행동
- 자동 공개 발행·마켓플레이스·결제
- 자동화 QA를 실제 사용자 검증이라고 부르는 것

## Completion Gates

| Gate | 완료 기준 |
| --- | --- |
| Coverage | 후보 36+, class 12+, lifeArea 9/9, planningPattern 7/7, targetCondition 8/8 |
| Evidence | 모든 후보가 지표 종류·값·관측일·근거 URL 또는 `no_visible_metric`을 명시 |
| Deep set | 실제 원문 12/12가 source snapshot과 올바른 disposition을 보유 |
| Fidelity | 출처 없는 행동·날짜·반복·사실 0건 |
| Usability | 내부 리뷰 가능한 Flow package 8개 이상, 각각 자연 결과물 1개 이상 |
| Access & rights | 12/12가 accessMode·rightsMode·공개 가능 여부를 분리 |
| Model comparison | 대표 6개가 동일 packet으로 저비용·고비용 비교되고 증거 수준이 표시됨 |
| Cost | token·비용·지연·재시도·사람 편집 시간이 측정 또는 명시적으로 미측정 처리됨 |
| Decision | P0 v2와 backend `go / hold / shift`가 근거와 함께 제시됨 |
| Validation boundary | 자동 QA와 실제 사용자·제공자 검증이 분리됨 |

## Reopen Triggers

- 실제 사용자가 lifeArea보다 다른 발견 기준을 일관되게 사용한다.
- 플랫폼 약관·API·권리 정책이 바뀐다.
- 원문 행이 짧은 영상·이미지·PDF에서 안정적으로 추출되지 않는다.
- 저비용 모델의 편집 부담이 비용 차이를 상쇄한다.
- 12개 중 8개 내부 리뷰 package 기준을 자연스럽게 채울 수 없다.
