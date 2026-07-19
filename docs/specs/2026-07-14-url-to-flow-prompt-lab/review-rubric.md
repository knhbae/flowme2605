# URL-to-FLOW Prompt Lab v1 Review Rubric

Date: 2026-07-14<br>
Scope: 기존 FLOW 콘텐츠 사례를 같은 입력 계약으로 다시 변환한 제안의 블라인드 품질 평가

## 1. 이 리뷰가 답할 질문

이 실험은 모델이 원문을 그럴듯하게 요약하는지보다 아래를 확인한다.

1. 원문 `SourceRow`만으로 사용자가 실제로 실행할 `Item`을 만들었는가?
2. 일정, 체크리스트, 시트, 메모 중 자연스러운 목적지로 옮길 수 있는가?
3. 검토자가 얼마나 적게 고치고도 저장 가능한 FLOW로 만들 수 있는가?
4. 같은 품질을 더 낮은 지연시간과 비용으로 반복할 수 있는가?

품질, 수정 부담, 운영 증거는 서로 다른 레인이다. 높은 품질 점수가 낮은 수정 부담이나 낮은 비용을 자동으로 뜻하지 않는다.

## 2. 평가 순서와 블라인드 규칙

각 사례는 다음 순서로 평가한다.

1. validator를 실행한다. hard fail이 있으면 저장 후보가 아니다.
2. 리뷰용 사본에서 `provider`, `model`, `modelTier`, 토큰, 비용, 지연시간을 숨긴다.
3. 원문 사례 packet과 모델 제안만 보고 7개 품질축을 채점한다.
4. 리뷰어가 저장 가능한 교정본을 만들고 수정 내역과 소요 시간을 기록한다.
5. 품질 및 교정 기록을 잠근 뒤에만 모델·운영 증거를 합친다.

같은 리뷰어가 여러 모델을 비교할 때에는 사례 순서와 A/B 표시 순서를 교차한다. 모델 이름이나 “저가/고가” 표시는 블라인드 해제 전 리뷰 파일에 적지 않는다.

현재 세션 안에서 같은 기반 모델을 여러 서브 세션으로 실행한 결과는 반복성 탐색에는 쓸 수 있지만 모델 가격대 비교 증거는 아니다. 이 경우 run의 `modelEvidence.evidenceKind`는 `in_session_same_model`, `modelTier`는 `unclassified`로 기록한다.

이번 Prompt Lab의 세션 내 블라인드 리뷰어도 사람 사용성 검증을 대신하지 않는다. 리뷰 입력에서는 모델·비용 증거를 제거하고 콘텐츠 품질을 독립적으로 채점하되, `reviewerKind=in_session_model_proxy`, `humanReviewer=false`로 기록한다. 실제 사람의 교정 시간을 재지 못한 경우 `reviewSeconds=null`, `reviewTimeEvidenceKind=not_available`로 두며, 아래 점수·keep-rate 조건만 충족한 결과는 `contentQualityGatePassed=true`로 구분한다. 이 결과에 전체 `USABLE` 판정을 부여하지 않으며 `fullUsabilityVerified=false`로 둔다.

## 3. 점수 척도

모든 품질축은 1~5점이다. 2점과 4점은 인접 기준 사이의 상태에만 쓴다.

| 점수 | 판정 |
| --- | --- |
| 1 | 실패. 핵심 구조를 다시 만들어야 한다. |
| 2 | 약함. 일부는 살릴 수 있지만 많은 추측이나 구조 수정이 필요하다. |
| 3 | 사용 가능. 기본 실행은 되지만 검토 마찰이 남는다. |
| 4 | 좋음. 소수의 문구·세부 수정 후 저장할 수 있다. |
| 5 | 강함. 원문 핵심과 실행·이식 구조가 정확하며 거의 그대로 유지할 수 있다. |

## 4. 일곱 가지 품질축

### 4.1 User Need Fit

`누가 무엇을 하기 위해 이 FLOW를 쓰는가`가 제안에 보이는지 평가한다.

- 1: 카테고리나 원문 주제를 다시 말할 뿐 사용자 일이 없다.
- 3: 사용자 목적은 맞지만 사용 시점이나 자연스러운 결과물이 모호하다.
- 5: 사용자 일, 사용 맥락, 자연스러운 결과물이 한 방향으로 정렬된다.

### 4.2 Execution Clarity

각 Item이 독립적으로 확인·결정·기록·실행 가능하고 완료 기준이 분명한지 평가한다.

- 1: `관리하기`, `준비하기`, `확인하기` 같은 추상 제목뿐이다.
- 3: 첫 행동은 보이지만 완료 기준, 순서, 조건 중 일부가 약하다.
- 5: 행동, 대상, 완료 기준, 필요한 순서·조건이 원문 범위 안에서 분명하다.

원문에 날짜가 없다는 이유로 점수를 깎지 않는다. 날짜 없는 콘텐츠를 억지로 일정화한 경우에는 hard fail을 적용한다.

### 4.3 Content Fidelity And Coverage

원문의 핵심 판단·순서·조건이 보존되고 모든 실행 가능한 SourceRow가 설명되었는지 평가한다.

- 1: 일반 지식이나 관습으로 내용을 채웠거나 핵심 행을 조용히 버렸다.
- 3: 주제와 주요 행은 맞지만 병합·누락 이유 또는 세부 맥락이 약하다.
- 5: 모든 실행 가능한 행이 Item에 연결되거나 명시적 제외 사유가 있고, 원문 의미가 바뀌지 않는다.

### 4.4 Portability And Natural Artifact

Calendar/ICS, Todo/Checklist, Sheet, Memo 중 원문에 자연스러운 목적지를 골랐고 필요한 데이터가 이동 가능한지 평가한다.

- 1: FLOW 전용 설명 구조이며 목적지에서 실행할 수 없다.
- 3: 목적지는 대체로 맞지만 제목, 완료 기준, 링크, 행 구조 중 일부가 약하다.
- 5: Item 중심 구조가 자연스러운 목적지로 손실을 설명하며 투영될 수 있다.

Calendar가 부적합한 사례에서 Calendar를 만들지 않은 것은 감점이 아니다.

### 4.5 Cognitive Load

원문 복잡도에 비해 Item, Step, 필드, 설명이 과도하지 않은지 평가한다.

- 1: 같은 수의 Item을 맞추거나 세부 사실을 잘게 쪼개 사용자가 구조를 다시 해석해야 한다.
- 3: 실행은 가능하지만 병합하거나 메모로 내려야 할 요소가 남아 있다.
- 5: 확인할 가치가 있는 최소 Item만 앞에 있고 세부·주의·링크는 적절히 내려가 있다.

### 4.6 Copy Specificity

제목과 완료 기준이 원문에 근거한 구체적 다음 행동인지 평가한다.

- 1: 동기부여 문구, 포괄적 명사, 반복되는 generic filler가 중심이다.
- 3: 행동은 구체적이지만 일부 제목이나 완료 기준을 다시 써야 한다.
- 5: 모든 문장이 사용자가 손으로 할 행동·판단·기록을 짧고 정확하게 말한다.

### 4.7 Source And Safety Separation

출처 사실, 제작자 경험, 사용자 입력, 주의 및 민감 판단이 구조적으로 구분되는지 평가한다.

- 1: 근거 없는 내용을 공식 사실처럼 쓰거나 민감한 결론을 보장한다.
- 3: SourceRef는 있으나 경험·주의·지역 적용성 경계가 일부 약하다.
- 5: SourceRow 추적, 출처 역할, 주의, 지역·권리·민감도 경계가 명시적이다.

## 5. 점수보다 먼저 적용할 hard fail

아래 중 하나라도 있으면 평균 점수와 관계없이 해당 시도는 `FAIL`이다.

- Item에 유효한 `sourceRowIds` 또는 명시적 private `user_request` 근거가 없다.
- 원문이나 사용자 입력에 없는 행동, 대상, 수치, 사실, 결과를 만들었다.
- 원문이나 사용자 anchor에 없는 날짜·기간·반복을 만들었다.
- 실행 가능한 SourceRow를 Item에도, `omittedRows`의 사유에도 기록하지 않았다.
- Item 수를 목표치에 맞추기 위해 내용을 채웠다.
- `items.length > maxItems`인데 부분 결과나 import 경계를 명시하지 않았다.
- 둘 이상의 primary source가 FLOW 구조를 통제한다.
- 의료·법률·재무·안전 결론을 내리거나 대상 지역 적용성을 확인하지 않은 민감 콘텐츠를 승격했다.
- `generationState`, `outcome`, `readiness`, `errorCode`를 서로 바꾸어 썼다.
- 실패·부분 상태인데 완전한 저장·발행·Calendar 투영이 가능하다고 표시했다.

`invented_schedule`은 유효한 Item을 날짜 없이 살릴 수 있을 때만 `partial + hold`로 정리할 수 있다. Calendar/ICS는 차단하고 해당 일정은 제거해야 한다.

## 6. SourceRow accounting

각 실행 가능한 SourceRow는 정확히 다음 중 하나로 설명되어야 한다.

1. 한 개 이상의 유지된 Item에서 참조
2. `omittedRows`에 구체적 사유와 함께 기록
3. `maxItems` 또는 원문 import 부족으로 인해 `partial`/`source_import_required` 범위에 기록

다음 지표를 함께 기록한다.

```text
accountedSourceRowRate
= (Item에 연결된 고유 실행 SourceRow 수 + 승인된 omitted SourceRow 수)
  / 전체 실행 SourceRow 수
```

통과 기준은 `100%`다. 같은 행을 여러 Item이 참조해도 분자는 한 번만 센다. 비실행 설명 행은 분모에서 제외하되, 사례 packet의 `executable` 판정을 리뷰 중 임의로 바꾸지 않는다.

## 7. Item keep rate와 교정 부담

### 7.1 Item keep rate

```text
itemKeepRate = 교정본에 남은 원 제안 Item 수 / 원 제안 Item 수
```

- 제목이나 메모만 고친 Item은 유지로 센다.
- 두 Item을 하나로 병합하면 대표로 남은 원 Item 한 개만 유지로 센다.
- 한 Item을 둘로 분할하면 원 Item 한 개만 유지로 센다. 새 Item이 keep rate 분자를 늘리지 않는다.
- 제안 Item이 0개면 keep rate는 `null`이다.
- 목표는 `0.80 이상`이지만 invented Item 하나라도 있으면 keep rate와 무관하게 hard fail이다.

keep rate는 “얼마나 살렸는가”만 말한다. 원문 행을 충분히 커버했는지는 `accountedSourceRowRate`로 별도 판정한다.

### 7.2 Correction burden 기록

리뷰어는 교정 시작·종료 시간을 재고 아래 수정 횟수를 기록한다.

- `deletedItems`
- `mergedItems`
- `splitItems`
- `titleRewrites`
- `completionRewrites`
- `sourceRefFixes`
- `omissionFixes`
- `scheduleRemovals`
- `destinationChanges`
- `riskBoundaryFixes`
- `fullRegenerationRequired`

| 부담 | 기준 |
| --- | --- |
| Low | 5분 이내, keep rate 0.80 이상, full regeneration 없음, hard fail 없음 |
| Medium | 5분 초과 10분 이내 또는 구조 수정이 있으나 원 제안의 절반 이상 유지 |
| High | 10분 초과, keep rate 0.50 미만, full regeneration 필요, 또는 hard fail |

속도만 맞추려고 hard fail을 남긴 교정본은 Low가 될 수 없다.

## 8. 사례 및 배치 판정

### 사례 단위

`USABLE`은 아래를 모두 만족할 때만 부여한다.

- validator hard fail 0개
- `accountedSourceRowRate = 1.00`
- `itemKeepRate >= 0.80`
- 교정 시간 5분 이내
- 7개 축 평균 3.5 이상
- Execution Clarity, Content Fidelity And Coverage, Source And Safety Separation 각각 4 이상

그 외는 다음처럼 나눈다.

- `REVISE`: 유효한 뼈대가 있으나 5분 또는 점수 기준을 넘음
- `HOLD`: 권리, 지역 적용성, 민감도, SourceRow import가 해결되지 않음
- `REJECT`: 원문에 실행 가능한 사용자 일이 없거나 발명 없이는 FLOW가 성립하지 않음
- `INVALID_RUN`: schema/run 증거가 불완전하여 모델 품질을 판정할 수 없음

### 배치 단위

십여 개 사례를 한 번 돈 결과만으로 prompt를 확정하지 않는다. 권장 반복 규칙은 다음과 같다.

1. 모든 사례를 1회 실행해 실패 유형을 분류한다.
2. prompt/schema/validator는 가장 빈번하거나 위험한 실패 유형 하나를 겨냥해 한 번에 한 요소만 수정한다.
3. 실패 사례 전체와 통과 사례 최소 3개를 다시 실행해 회귀를 확인한다.
4. 아래 종료 조건을 연속 2개 batch에서 만족하면 prompt v1 후보로 잠근다.

권장 종료 조건:

- 전체 `USABLE` 비율 80% 이상
- invented action/schedule/fact 0건
- accounted SourceRow 100%
- 사례 중앙값 item keep rate 0.80 이상
- 사례 중앙값 교정 시간 5분 이하
- negative/hold/reject 기대 사례 판정 정확도 100%
- 같은 입력 재실행에서 구조 판정 일치율 80% 이상

모델 비교는 같은 prompt version, 같은 case version, 같은 validator version, 같은 반복 횟수에서만 한다.

## 9. 지연시간·토큰·비용 증거는 별도 레인

콘텐츠 리뷰 파일에는 운영 지표를 넣지 않는다. run log에만 다음을 기록한다.

- `latencyMs`: 외부 타이머로 잰 요청 시작부터 완전한 응답 수신까지의 시간
- `usage.inputTokens`, `usage.outputTokens`: provider가 반환한 값인지 추정값인지 구분
- `cost.amount`, `cost.currency`: 토큰 사용량과 실행 당시 가격표로 계산한 값
- `pricingRef`: 모델·날짜·단가가 적힌 가격 근거
- 각 값의 `evidenceKind`: `measured`, `provider_reported`, `calculated`, `estimated`, `not_available`

규칙:

- 모델이 자기 응답 시간이나 토큰 수를 말한 값은 측정 증거가 아니다.
- 세션 내부 응답에는 실제 API 청구액이 없으므로 비용을 0으로 기록하지 않는다. `null + not_available`로 둔다.
- 가격표 없이 계산한 비용은 `estimated`이며 모델 가격대 Go/No-Go 근거로 쓰지 않는다.
- p50/p95는 같은 조건의 충분한 실행 표본에서 계산하며 단일 실행의 latency와 혼동하지 않는다.
- 캐시 hit 시간, 생성 시간, 사람 리뷰 시간은 각각 분리한다.
- `in_session_same_model` 결과끼리는 prompt 반복성만 비교하며 cheap/premium 우열을 주장하지 않는다.

## 10. 리뷰 기록 최소 형식

```json
{
  "caseId": "CASE-001",
  "blindRunLabel": "B",
  "validator": {
    "passed": true,
    "hardFailCodes": []
  },
  "scores": {
    "userNeedFit": 4,
    "executionClarity": 4,
    "contentFidelityAndCoverage": 5,
    "portabilityAndNaturalArtifact": 4,
    "cognitiveLoad": 4,
    "copySpecificity": 4,
    "sourceAndSafetySeparation": 5
  },
  "scoreComments": {
    "userNeedFit": "사용자 일과 체크리스트 목적지가 일치한다."
  },
  "sourceRowAccounting": {
    "executableRows": 6,
    "mappedUniqueRows": 5,
    "approvedOmittedRows": 1,
    "accountedSourceRowRate": 1
  },
  "correction": {
    "reviewSeconds": 240,
    "originalItemCount": 5,
    "keptOriginalItems": 4,
    "itemKeepRate": 0.8,
    "deletedItems": 1,
    "mergedItems": 0,
    "splitItems": 0,
    "titleRewrites": 1,
    "completionRewrites": 0,
    "sourceRefFixes": 0,
    "omissionFixes": 0,
    "scheduleRemovals": 0,
    "destinationChanges": 0,
    "riskBoundaryFixes": 0,
    "fullRegenerationRequired": false,
    "burden": "low"
  },
  "decision": "usable",
  "topFixes": []
}
```

모든 1~5점에는 짧은 근거 comment를 남긴다. 평균 점수만으로 원문 충실도나 모델 우열을 주장하지 않는다.
