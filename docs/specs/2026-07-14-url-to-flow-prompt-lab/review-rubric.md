# URL-to-FLOW Prompt Lab v1 블라인드 리뷰 계약 v2

Date: 2026-07-15
Rubric version: `flowme-url-to-flow-prompt-lab-review-rubric-v2`

## 1. 리뷰의 목적

이 리뷰는 모델이 원문을 그럴듯하게 요약했는지가 아니라, 제공된 `SourceRow`만으로 사용자가 실행할 수 있는 최소 FLOW를 만들었는지 판정한다.

리뷰 순서는 다음과 같다.

1. 원본 run에 대한 deterministic validator 결과를 확인한다.
2. 각 원본 Item의 행동, 완료 기준, 메모, 일정이 SourceRow에 근거하는지 감사한다.
3. projection이 원문과 자연스러운 목적지에 근거하는지 감사한다.
4. 원문에 없는 행동·날짜·반복·사실을 hard fail로 기록한다.
5. SourceRow accounting과 교정본의 Item keep rate를 계산한다.
6. validator를 통과한 positive case만 7개 품질 축을 채점한다.

높은 점수는 근거 누락이나 발명을 상쇄하지 못한다.

## 2. 블라인드 입력 경계

리뷰어가 받는 case 파일에는 다음만 있어야 한다.

- 고정 `sourcePacket`
- 한 개의 raw `proposal`
- raw `runFile`과 `runId`
- `proposalFingerprint`
- deterministic validator의 `passed`와 `codes`
- rubric 및 결과 template 경로

다음 정보는 리뷰 입력과 리뷰 결과에 포함하면 안 된다.

- `hiddenExpectation`, `expectation`, `expectedStatus`, `fixtureKind` 등 expected fixture 데이터
- provider, model, model tier 또는 기타 model evidence
- latency, 시작·종료 시각, token usage, cost, pricing evidence

`runFile`은 저장소 루트 기준 경로이며 해당 round의 `runs/<round>/` 아래 JSON을 가리켜야 한다. 리뷰 validator는 `sourcePacket`을 `cases-v1.json`의 해당 case와 deep-compare하고, `proposal`을 그 raw run의 해당 output과 deep-compare한다.

## 3. 독립 리뷰 provenance

각 리뷰 결과의 `reviewMethod`은 정확히 다음 값을 사용한다.

```json
{
  "reviewerKind": "in_session_model_proxy",
  "modelIdentityBlinded": true,
  "humanReviewer": false,
  "contextIsolation": "fresh_subagent_no_expected_answers"
}
```

`contextIsolation=fresh_subagent_no_expected_answers`는 expected answer나 앞선 리뷰 결론이 전달되지 않은 새 subagent 세션에서 다시 읽고 판정했다는 뜻이다. 이전 대화나 리뷰를 fork한 세션은 이 값을 주장할 수 없다.

이 provenance는 사람 사용성 검증을 뜻하지 않는다. 따라서 이번 실험의 모든 결과는 `fullUsabilityVerified=false`를 유지하며, 실제 사람의 교정 시간을 측정하지 않았다면 `reviewSeconds=null`, `reviewTimeEvidenceKind=not_available`, `burden=null`로 둔다.

## 4. raw proposal 결합

`proposalFingerprint` 형식은 다음과 같다.

```text
sha256:<64 lowercase hex>
```

해시 입력은 raw run에서 JSON으로 읽은 해당 proposal 객체에 대해 실행한 UTF-8 `JSON.stringify(proposal)` 결과다. 공백을 추가하지 않고 object key를 재정렬하지 않는다.

동일한 fingerprint를 다음 세 곳에 기록한다.

1. review input의 `proposalFingerprint`
2. review input manifest의 case entry
3. review result의 `groundingAudit.proposalFingerprint`

리뷰 validator는 세 값이 raw run에서 다시 계산한 값과 같은지 확인한다.

## 5. deterministic validator 선행 규칙

review input의 validator 증거는 실제 raw run에 대해 `validate-url-to-flow-prompt-lab.mjs`를 실행해 만든다.

```json
{
  "validatorVersion": "flowme-url-to-flow-prompt-lab-validator-v1",
  "passed": true,
  "codes": []
}
```

`codes`에는 run-level error code와 해당 output의 error code를 중복 없이 정렬해 넣는다. expected fixture에서 계산되는 warning이나 metric은 블라인드 입력에 넣지 않는다.

리뷰 결과의 `validator.passed`와 `validator.hardFailCodes`는 이 증거와 정확히 같아야 한다.

- validator 실패: semantic score와 grounding 판단을 하지 않고 `invalid_run`으로 기록한다.
- validator 통과: grounding audit, accounting, 교정 preview, positive score 또는 negative gate를 완성한다.

## 6. groundingAudit

모든 리뷰 결과에 `groundingAudit` 객체가 필요하다.

### 6.1 validator를 통과한 proposal

```json
{
  "proposalFingerprint": "sha256:...",
  "items": [
    {
      "proposalId": "p-01",
      "sourceRowIds": ["row-01"],
      "actionGrounded": true,
      "completionGrounded": true,
      "memoGrounded": true,
      "scheduleGrounded": true,
      "comment": "행동과 완료 기준은 row-01의 표현 범위 안이며 별도 메모와 일정은 없다."
    }
  ],
  "projectionGrounded": true,
  "projectionComment": "날짜 근거가 없어 calendar는 blocked이고 checklist만 applicable이다.",
  "unsupportedContentFindings": []
}
```

`items`에는 raw proposal의 원본 Item마다 정확히 한 개의 감사 row를 넣는다.

- `proposalId`: 원본 Item의 ID와 동일
- `sourceRowIds`: 원본 Item의 배열과 순서까지 동일
- `actionGrounded`: title과 intent가 연결된 SourceRow에서 직접 도출되는가
- `completionGrounded`: `completion.doneWhen`이 원문 행동의 완료를 확인할 뿐 새 결과를 만들지 않는가
- `memoGrounded`: `memoCandidate`의 내용이 SourceRow 또는 source metadata에 있는가. 값이 `null`이면 발명이 없으므로 `true`로 기록한다.
- `scheduleGrounded`: `scheduleCandidate`의 날짜·기간·반복이 SourceRow에 있는가. 값이 `null`이면 발명이 없으므로 `true`로 기록한다.
- `comment`: 네 판단의 근거를 구체적으로 적는 비어 있지 않은 문자열

`projectionGrounded`는 모든 `projectionPlan` target, applicability, reason이 원문과 자연스러운 artifact 경계에 근거할 때만 `true`다. projection이 빈 valid negative proposal도, 빈 상태가 원문 부족 판정과 일치하면 `true`로 기록하고 이유를 쓴다.

### 6.2 validator가 실패한 proposal

Round 1처럼 schema/run 자체가 invalid라 semantic grounding을 신뢰할 수 없는 경우에는 fingerprint만 결합하고 나머지를 `null`로 둔다.

```json
{
  "proposalFingerprint": "sha256:...",
  "items": null,
  "projectionGrounded": null,
  "projectionComment": null,
  "unsupportedContentFindings": null
}
```

이 경우 score와 `qualityAverage`, `reviewHardFailCodes`도 `null`이며 `decision=invalid_run`이다. deterministic validator의 error code는 `validator.hardFailCodes`에 계속 남는다.

## 7. unsupportedContentFindings

허용 code는 네 개뿐이다.

| code | 의미 |
| --- | --- |
| `invented_action` | SourceRow에 없는 행동·판단·완료 결과를 추가함 |
| `invented_date` | SourceRow 또는 사용자 anchor에 없는 날짜·기간·마감을 추가함 |
| `invented_repeat` | SourceRow에 없는 반복 주기나 횟수를 추가함 |
| `invented_fact` | SourceRow/source metadata에 없는 사실·수치·조건·효과를 추가함 |

각 finding은 정확히 다음 shape을 사용한다.

```json
{
  "code": "invented_fact",
  "field": "proposal.items[p-01].memoCandidate",
  "evidence": "row-01에는 준비물 수량이 없지만 memoCandidate가 3개라고 단정한다."
}
```

`field`는 다음 audit 범위 중 하나를 가리켜야 한다. 더 세부적인 하위 field가 필요하면 뒤에 `.sourceText`처럼 이어 쓸 수 있다.

- `proposal.items[<proposalId>].title` 또는 `.intent` → `actionGrounded`
- `proposal.items[<proposalId>].completion` → `completionGrounded`
- `proposal.items[<proposalId>].memoCandidate` → `memoGrounded`
- `proposal.items[<proposalId>].scheduleCandidate` → `scheduleGrounded`
- `projectionPlan` → `projectionGrounded`

양방향 일치가 필수다.

- grounding boolean이 `false`이면 해당 범위를 가리키는 finding이 최소 한 개 있어야 한다.
- finding이 있으면 해당 범위의 grounding boolean은 반드시 `false`여야 한다.
- finding의 모든 code는 `reviewHardFailCodes`에 포함되어야 한다.
- `reviewHardFailCodes`에 네 invented code 중 하나가 있으면 같은 code의 finding도 있어야 한다.

## 8. SourceRow accounting

원본 proposal에서 다음 두 집합을 만든다.

- mapped: 모든 Item의 `sourceRowIds`
- omitted: `proposal.omittedRows[].sourceRowId`

validator를 통과한 proposal은 다음을 모두 만족해야 한다.

1. mapped와 omitted에 case 밖의 ID가 없다.
2. mapped와 omitted은 서로 겹치지 않는다.
3. 두 집합의 합집합은 case의 모든 SourceRow와 정확히 같다.
4. omitted ID는 중복되지 않는다.

```text
accountedSourceRowRate
= unique(mapped ∪ omitted) / all case SourceRows
```

SourceRow가 0개면 rate는 `1`이다. 같은 SourceRow가 여러 Item에 연결되어도 한 번만 센다. accounting 100%가 발명 없음까지 뜻하지는 않으므로 grounding audit과 함께 판정한다.

## 9. correctedPreview와 Item keep rate

corrected preview의 각 Item은 다음 shape을 사용한다.

```json
{
  "title": "교정된 실행 제목",
  "doneWhen": "교정된 완료 기준",
  "sourceRowIds": ["row-01"],
  "sourceProposalIds": ["p-01"]
}
```

`sourceProposalIds`는 그 preview Item에 남아 있는 원본 proposal Item ID다.

- title이나 completion만 고친 Item은 원본 ID를 유지한다.
- 여러 원본 Item을 합치면 모든 원본 ID를 넣는다.
- 하나를 여러 preview Item으로 나누면 같은 원본 ID를 각 결과에 넣을 수 있다.
- 원본에 없는 ID나 빈 ID를 넣을 수 없다.

`keptOriginalItems`는 모든 preview Item의 `sourceProposalIds`에서 유효한 원본 ID를 중복 제거한 개수로 validator가 직접 계산한다. 사람이 임의로 숫자를 선언하지 않는다.

```text
itemKeepRate = unique valid sourceProposalIds / originalItemCount
```

원본 Item이 0개면 `keptOriginalItems=0`, `itemKeepRate=null`이다.

## 10. 일곱 가지 품질 축

validator를 통과한 positive case만 각 축을 1~5점 정수로 채점하고 축마다 구체적인 comment를 남긴다.

1. `userNeedFit`: 누구의 어떤 일을 돕는지 분명한가
2. `executionClarity`: 첫 행동과 완료 기준을 바로 이해할 수 있는가
3. `contentFidelityAndCoverage`: SourceRow의 핵심을 빠뜨리거나 일반 지식으로 채우지 않았는가
4. `portabilityAndNaturalArtifact`: calendar/checklist/todo/sheet/memo 중 자연스러운 목적지로 옮길 수 있는가
5. `cognitiveLoad`: 원문 복잡도보다 불필요하게 많은 Item·field·설명이 생기지 않았는가
6. `copySpecificity`: 제목과 완료 기준이 사용자의 다음 행동을 구체적으로 말하는가
7. `sourceAndSafetySeparation`: 출처 사실, 경험, 주의, 민감 판단의 경계가 분명한가

점수 기준:

- 1: 구조를 다시 만들어야 한다.
- 2: 일부 쓸 수 있지만 큰 추론이나 교정이 필요하다.
- 3: 기본 실행은 가능하지만 마찰이나 모호함이 남는다.
- 4: 작은 문구·표현 수정만으로 쓸 수 있다.
- 5: 원문 근거, 실행, 목적지 구조가 정확해 거의 그대로 쓸 수 있다.

## 11. gate 판정

positive case의 `contentQualityGatePassed=true` 조건:

- deterministic validator 통과
- `reviewHardFailCodes=[]`
- mapped/omitted disjoint 및 SourceRow accounting 100%
- `itemKeepRate >= 0.80`
- 7축 평균 `>= 3.5`
- Execution Clarity `>= 4`
- Content Fidelity And Coverage `>= 4`
- Source And Safety Separation `>= 4`

negative case는 score와 content gate를 `null`로 두고, post-review validator가 hidden fixture를 입력에 노출하지 않은 채 disposition을 대조해 `negativeGatePassed`를 검증한다.

결정 enum:

- `content_gate_pass`
- `revise`
- `source_import_required`
- `hold`
- `reject`
- `invalid_run`

사람 사용성 검증을 하지 않았으므로 이 Prompt Lab 결과만으로 `USABLE` 또는 사용자 검증 완료를 주장하지 않는다.
