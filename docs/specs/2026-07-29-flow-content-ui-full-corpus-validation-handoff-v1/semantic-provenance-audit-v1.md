# Semantic provenance audit v1

## 결론

이 감사는 정상·구조 corpus 110개, Item 893개, Item 필드 4465개를 전수 검사했다.

- 모든 Item 893/893은 현재 frozen corpus 안의 SourceRow에 연결되며 깨진 참조는 0개다.
- 그러나 SourceRow 연결률 100%는 title·detail·completion·schedule·recurrence의 의미가 모두 원문과 같다는 증명이 아니다.
- 자동 대조가 실제 발명 가능성을 제기한 필드는 0개, SourceRow 연결은 있지만 의미 동등성을 자동 확인하지 못한 필드는 141개다.
- owner 또는 provenance 필드가 빠진 결과는 536개다.
- 따라서 현재 corpus에 대해 **“원문에 없는 행동·날짜·반복·완료 기준 발명 0”을 증명했다고 표현하면 안 된다.** 현재 판정은 `PARTIAL_EVIDENCE`이며, 직접 원문 재확인과 수동 의미 판정 전까지 invention 0은 `NOT_PROVEN`이다.

## 필드별 최종 상태

| 필드 | 직접 원문 대조 | 규칙 정규화 | trace만 있고 의미 미확인 | owner/provenance 누락 | 발명 의심 | 해당 없음 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| title | 602 | 157 | 134 | 0 | 0 | 0 |
| detail | 564 | 127 | 7 | 0 | 0 | 195 |
| completion | 0 | 0 | 0 | 412 | 0 | 481 |
| schedule | 0 | 141 | 0 | 124 | 0 | 628 |
| recurrence | 5 | 0 | 0 | 0 | 0 | 888 |

최종 상태는 provenance 누락을 우선 표시한다. 예를 들어 completion 문장이 알려진 UI 템플릿으로 설명되더라도 `completion.provenance`가 없으면 최종 상태는 `owner_or_provenance_missing`이고, 별도 `semanticBasis`에는 `rule_normalized`가 남는다.

## 의미 기반만 따로 본 결과

| 필드 | 직접 원문 대조 | 규칙 정규화 | trace만 있고 의미 미확인 | 발명 의심 | 해당 없음 |
| --- | ---: | ---: | ---: | ---: | ---: |
| title | 602 | 157 | 134 | 0 | 0 |
| detail | 564 | 127 | 7 | 0 | 195 |
| completion | 0 | 412 | 0 | 0 | 481 |
| schedule | 119 | 141 | 5 | 0 | 628 |
| recurrence | 5 | 0 | 0 | 0 | 888 |

## 확인된 계약 보강점

1. 현재 893개 Item은 모두 SourceRow로 추적되지만, canonical corpus 368개와 adapter corpus 525개가 각각 `sourceTrace/sourceRefs`와 `sourceRowIds`라는 다른 연결 계약을 사용한다.
2. 비어 있지 않은 completion 다수는 UI 완료 문장 템플릿으로 설명되지만 명시적 `completion.provenance`가 없다. source fact가 아니라 UI 생성 규칙임을 필드에 저장해야 한다.
3. source 일정의 일부는 D-day·요일·절대 날짜와 대조되지만 `scheduleOwner`와 `derivation`이 없다. source schedule, user overlay, system-derived schedule을 계약에서 강제해야 한다.
4. null completion과 일정 없음은 결측치가 아니라 “원문에 없는 완료 기준·날짜를 만들지 않음”으로 구분했다.
5. event edition의 `edition_occurrences_not_yearly_rrule`은 원문 반복 사실이 아니라 거짓 yearly RRULE을 막는 정책이다. source recurrence와 모델 정책을 같은 필드처럼 취급하면 안 된다.

## 수동 재검토가 필요한 예시

### 발명 의심

- 자동 규칙이 고신뢰 발명 의심으로 분류한 필드는 없었다. 이것은 invention 0 증명이 아니라 현재 휴리스틱의 탐지 결과다.

### SourceRow trace는 있으나 의미 동등성 미확인

- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-1-item-1` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-1-item-2` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-1-item-3` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-1-item-4` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-2-item-1` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-2-item-2` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-2-item-3` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-2-item-4` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-2-item-5` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.
- `canonical:base-moving-d30` / `base-moving-d30-flow-1-step-3-item-1` / title: SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.

전체 큐는 `semantic-provenance-audit-v1.json#/manualReviewQueue`에 있다.

### 수동 의미 판정 우선순위

| 콘텐츠 | 미확인 필드 | 필드 구성 |
| --- | ---: | --- |
| 이사 D-30 체크리스트 (`canonical:base-moving-d30`) | 25 | title 25 |
| 제자백가의 사상 15주 학습 (`legacy:round2:kmooc-hundred-schools-fifteen-week`) | 15 | title 15 |
| 오픽 모의고사 계획표 (`canonical:base-opic-plan`) | 14 | title 12, detail 2 |
| 신차 구매 8단계 (`canonical:base-new-car-comparison`) | 13 | title 13 |
| 새끼 고양이 첫 주 적응 (`legacy:preapp:kitten-arrival-first-week`) | 10 | title 10 |
| 개인 사업자등록 준비 (`legacy:round2:personal-business-registration-flow`) | 7 | title 4, detail 3 |
| 출생신고 준비 및 제출 (`generalization:GB-01`) | 5 | title 5 |
| LG 가습기 필터 및 본체 반복 관리 (`generalization:GB-03`) | 5 | title 5 |
| 법인 통신판매업 신고 (`legacy:round2:corporate-mail-order-registration-flow`) | 5 | title 5 |
| 국립현대미술관 어린이 단체관람 예약 및 방문 (`generalization:GB-08`) | 4 | title 4 |
| 2주 소셜 미디어 콘텐츠 계획 (`generalization:GB-16`) | 4 | title 4 |
| 면접 D-1 체크 (`legacy:preapp:interview-d1-check`) | 4 | title 4 |

## 판정 규칙

- `direct_source_supported`: 인용 SourceRow의 title/detail/original 구조화 값에서 해당 문구 또는 시간값을 직접 대조했다.
- `rule_normalized`: 원문 값을 실행형 제목, UI 완료 문장, 사용자 overlay 일정 또는 anti-fake-recurrence 정책으로 변환하는 알려진 규칙으로 설명된다.
- `trace_only_semantics_unverified`: 유효한 SourceRow 연결은 있지만 자동 텍스트·시간 대조로 의미 동등성을 확인하지 못했다.
- `owner_or_provenance_missing`: 의미 기반은 설명되더라도 source/user/system owner 또는 derivation/provenance가 데이터에 없다.
- `suspected_invention`: 인용 행이나 알려진 정규화 규칙으로 숫자·URL·시간·완료 의미를 설명하기 어려워 직접 원문 확인이 필요하다.
- `not_applicable`: 해당 주장이 없다. 특히 null completion, 일정 없음, 반복 없음은 발명이 아니다.

## 증명 범위

이 감사는 frozen SourceRow와 lineage 산출물을 대상으로 한 deterministic internal audit다. 실제 URL을 다시 열어 frozen row가 원문 전체를 충실히 반영하는지 검증하지 않았고, 한국어 paraphrase의 의미 동등성을 전부 판정하지 않았다. rights·locale·safety·freshness 승인, 실제 사용자 검증, 외부 Calendar/VTODO 왕복도 수행하지 않았다.

- live source reinspection: `NOT_RUN_IN_THIS_AUDIT`
- observed-user validation: `NOT_RUN`
- external Calendar/VTODO round-trip: `NOT_RUN`
- invention zero: `NOT_PROVEN`

## 재현

```powershell
node docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/build-semantic-provenance-audit-v1.mjs
```

입력 hash와 validator용 요약은 JSON의 `inputArtifacts`, `validatorSummary`에 기록된다.
