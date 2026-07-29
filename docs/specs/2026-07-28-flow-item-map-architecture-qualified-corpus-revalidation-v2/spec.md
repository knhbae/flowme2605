# Flow Item·Map Architecture Qualified Corpus Revalidation v2

## 1. 목표

2026-07-27 `creator-portfolio-qualified-v2`에서 실제 로직 이관 대상으로
확정한 8개 Bundle을 동일한 의미 계약으로 세 아키텍처에 투입한다. 최신
corpus에서도 다음 계층과 projection 원칙이 가장 손실이 적은지 다시
검증한다.

`SourceRow → Item → Step → Flow → Bundle/Flow Map → Projection`

검증 대상은 다음 세 구조다.

1. **A · Current canonical**: Item이 실행·완료·일정·출처 상태를 소유한다.
2. **B · Literal ICS-first**: VEVENT, VTODO, RELATED-TO, X-property를 중심으로
   실행 구조를 표현한다.
3. **C · Item-first shared context**: Item canonical은 유지하면서 같은 기준일,
   같은 날짜, 공통 context를 별도 객체로 재사용한다.

이번 목표는 앱 데이터 모델을 바꾸는 구현 작업이 아니다. 문서·fixture·검증
실험으로 결론을 재확인하며, app runtime, DB, seed, production API는
변경하지 않는다.

## 2. 재검증이 필요한 이유

기존 v1은 2026-07-23 탐색 corpus를 동결해 다음 규모로 실험했다.

- 9 Bundle
- 22 Flow
- 57 Step
- 148 Item
- 198 SourceRow
- 일정 Item 118
- 날짜 없는 Item 30

최신 Qualified v2의 로직 이관 corpus는 다음처럼 바뀌었다.

- 8 Bundle
- 21 Flow
- 49 Step
- 160 Item
- 210 SourceRow
- 일정 Item 112
- 날짜 없는 Item 48

트리플 여행 체크와 핏펫 예방접종은 최신 정상 corpus에서 제외되고 경계
사례로 보존된다. 생활코딩 WEB1 진도표가 26개 날짜 없는 Item을 가진 신규
정상 사례로 들어오며 현재 유일한 `Public Go`다. 그러므로 v1의
`96 / 51 / 95`, validator 752, projection loss, round-trip 결과를 최신
결과처럼 재사용할 수 없다.

## 3. 동결 입력

정상 corpus의 유일한 기준은 다음 파일의 `logicHandoffSelections` 및
`userContentBundles` 8개다.

- `docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json`

사용 Bundle:

1. 이사 D-30 체크리스트
2. 초기 이유식 D+174~209 식단
3. 오픽 모의고사 계획표
4. 생활코딩 WEB1 진도표
5. 신차 구매 8단계
6. Allblanc 7일 복근 챌린지
7. 이번 주 여름 반찬 5가지
8. AND 취업 준비 영상 3편

입력 파일 경로, byte 수, SHA-256, 관찰일, 원본 validation 상태는
`input-lineage-v2.json`에 기록한다. 파생 수치는 fixture에서 계산하며
HTML에만 손으로 입력하지 않는다.

## 4. 핵심 의미 계약

### 4.1 SourceRow

원문에서 실제로 확인한 최소 근거 행이다. SourceRow는 URL과 locator를
포함하며, Item 생성의 provenance를 제공한다. 한 Item은 하나 이상의
SourceRow를 참조할 수 있고 하나의 SourceRow가 여러 Item에 쓰이면 그
관계를 명시한다.

### 4.2 Item

사용자가 독립적으로 완료·결정·기록·소비할 수 있는 최소 실행 단위다.
Item은 다음을 소유한다.

- 안정적인 식별자
- 제목과 상세 설명
- 완료 방식
- 선택적 일정
- 선택적 사용자 메모·필드
- SourceRow 참조
- 권리·검토 상태와 분리된 개인 실행 상태

### 4.3 Step, Flow, Bundle/Flow Map

- Step: Item을 읽기 좋게 묶는 의미 단위다.
- Flow: 하나의 사용자 job을 끝내는 실행 단위다.
- Bundle/Flow Map: 관련 Flow의 순서·병렬·선택 관계를 표현한다.

이 계층을 VEVENT나 VTODO component 계층으로 치환하지 않는다. iCalendar는
projection의 한 형식이며 canonical 의미 원본이 아니다.

### 4.4 Projection

각 Item은 상황에 따라 Calendar/ICS, Checklist, Todo, Sheet, Memo로
투영된다.

- 일정이 확인된 Item만 VEVENT 후보가 된다.
- 날짜가 없는 Item은 VEVENT를 만들지 않는다.
- VTODO는 표준상 가능한 실험 projection이다. 실제 destination이
  지원한다고 확인하지 않은 경우 Todo/Checklist/Sheet/Memo로 fallback한다.
- VEVENT와 VTODO는 VCALENDAR 안의 형제 component다. 서로 중첩하지 않는다.
- VALARM만 VEVENT 또는 VTODO 아래에 중첩할 수 있다.
- 같은 날짜의 여러 Item을 calendar step bundle로 묶더라도 canonical
  Item별 완료 상태는 projection 밖 canonical state에 남는다.
- Flow·Step·Map 의미는 ICS round-trip 보존에 의존하지 않는다.

## 5. 판정 축

모든 Bundle은 다음 상태를 독립적으로 가진다.

- `architectureFit`
- `logicReadiness`
- `publicReadiness`
- `rightsStatus`
- `personalConversionAvailability`
- `sourceCompleteness`
- `safetyReview`
- `localeReview`
- `privacyReview`
- `promotionState`

`Architecture Go`, `Logic Go`, `Public Go`는 서로 대체할 수 없다. 공개
판정은 최신 corpus와 정확히 일치해야 한다.

- Public Go: 1
- Public Modify: 6
- Public Hold: 1

생활코딩 WEB1만 Public Go다.

## 6. 세 아키텍처에 공통으로 고정할 데이터

비교 실험에서 다음 입력은 바꾸지 않는다.

- SourceRow와 provenance
- Item 경계와 개수
- 사용자 job
- 최소 입력
- completion
- schedule
- sourceRefs
- rights와 review 상태

특정 아키텍처의 점수를 올리기 위해 Item을 합치거나 쪼개거나 원문 행을
추가하지 않는다.

## 7. 점수 모델

아키텍처별 100점은 다음 10개 기준을 동일 가중치로 평가한다. 각 기준은
machine-readable 근거와 계산식을 가져야 하며 v1 총점을 복사하지 않는다.

1. source 의미·provenance 보존
2. Item별 독립 완료 상태
3. 일정/비일정 콘텐츠 포괄성
4. 최소 사용자 입력
5. Calendar client 호환 위험
6. 권리·검토·개인 overlay 보존
7. projection 손실
8. 기존 runtime migration 영향
9. backend DTO 구현 복잡도
10. 외부 도구 이식성

총점은 결론을 돕는 요약이며 hard invariant를 대체하지 않는다. 예를 들어
일정 없는 VEVENT가 하나라도 생기면 점수가 높아도 해당 설계는 채택할 수
없다.

## 8. Projection 검증 계약

160 Item 전체에 대해 다음 projection 후보를 기록한다.

- VEVENT
- VTODO
- calendar step bundle
- calendar per-item
- checklist
- todo
- sheet
- memo
- no-calendar

필수 invariant:

- 일정 없는 VEVENT 0
- VEVENT/VTODO 중첩 0
- 원문에 없는 행동·날짜·반복·완료 기준 0
- 160 Item 모두 SourceRow provenance 보존
- 날짜 없는 Item 48개 모두 자연스러운 비Calendar 결과물 보유
- calendar bundle에서도 개별 완료 상태 보존
- VTODO 미지원 destination fallback 명시
- Flow·Step·Map 의미가 ICS round-trip에 의존하지 않음

## 9. 경계와 확장 부록

트리플 여행 체크와 핏펫 예방접종은 정상 수치에서 제외하고 historical /
boundary appendix에 보존한다.

- 트리플: Logic Modify, Public Modify, 최신성 관리 주체 불명확
- 핏펫: Logic Hold, Public Hold, 권리 허가와 최신 공식 수의학 근거 필요

Vertical 서비스 benchmark의 36개 발견, 24개 공개 근거 검증, 10개 심층
분석, 8개 콘텐츠 기회는 실제 creator SourceRow corpus가 아니다. 따라서
Item/SourceRow 수치에 합치지 않고 다음 발굴 계약만 정리한다.

- userMoment
- naturalArtifact
- minimumAnchor
- requiredSourceRows
- dateIntent
- defaultDestination
- doNotBuildBoundary
- Go / Partner 상태

`study_learning`은 `study_reading`, `travel_outings_events`는
`travel_outings`으로 명시적으로 매핑한다. Vertical 행동 패턴은 benchmark
metadata와 canonical `primaryExecutionPattern`을 분리한다.

## 10. 검증하지 않는 것

- Google, Outlook, Apple Calendar에서의 실제 import/export 왕복
- VTODO/RELATED-TO/X-property의 실제 client 보존
- 실제 사용자의 저장 의도·이해도·완료 행동
- production crawler, LLM, DB 동작

수행하지 않은 검증은 `NOT_RUN`으로 기록한다. 자동 QA나 에이전트 판정을
실제 사용자 검증으로 표현하지 않는다.

## 11. 산출물

본 폴더의 Markdown, JSON, schema, validator, test와 다음 HTML을 만든다.

- `docs/content-audit/2026-07-28-flow-item-map-architecture-qualified-portfolio-fit-review-v2-ko.html`

PPTX는 이번 목표의 완료 조건이 아니다.
