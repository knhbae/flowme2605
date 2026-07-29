# Semantic provenance manual adjudication v1

## 결론

동결된 `semantic-provenance-audit-v1.json`의 `manualReviewQueue.traceOnlySemantics` 141개를 26개 콘텐츠에 걸쳐 전부 확인했다.

- `verified_equivalent`: 37
- `bounded_normalization`: 87
- `needs_modify`: 17
- `unknown`: 0

즉, 124개는 SourceRow의 의미를 그대로 보존하거나 허용 가능한 범위에서 짧게 정규화했다. 17개는 중요한 행을 숨기거나, 서로 다른 행동을 잘못 묶거나, 원문에 없는 행동·시점·projection 결론을 섞어 수정이 필요하다.

이 결과는 **141개 trace-only queue의 수동 판정을 완료했다는 뜻**이다. 전체 4,465개 감사 필드에서 발명이 0임을 증명하지 않는다.

## 입력과 범위

| 입력 | SHA-256 |
|---|---|
| `semantic-provenance-audit-v1.json` | `2d988143bbb8df3e15363094c862614c296e3d1e1d6b49a3e1a3215e4e8eb8c0` |
| `content-ui-view-model-v1.json` | `25aacc34ad8b2062a6bf28dec683b14f3d989f407313af519284016d46ea05b9` |
| corpus fingerprint | `d56b289fd301805fe1299b867497b0840f8d379d1459ec0148639f8b7d5dce32` |

각 판정에서 현재 Item의 title·detail과 연결된 SourceRow title·detail·locator를 비교했다. live URL 재확인, 권리·최신성·안전 승인, 사용자 관찰 검증은 수행하지 않았다.

판정 키는 `contentId|itemId|field`다. JSON의 141개 키는 원 audit queue의 141개 키와 정확히 일치한다.

## 판정 기준

- `verified_equivalent`: 같은 행동과 조건을 의미 변화 없이 직접 표현
- `bounded_normalization`: 복수 SourceRow나 상세 조건을 실행형 제목으로 줄였지만 Item detail과 연결 행을 함께 보면 중요한 의미 손실이나 새 행동이 없음
- `needs_modify`: 중요 행을 숨기거나 잘못 묶거나 원문에 없는 행동·제약·시점·projection 결론을 추가
- `unknown`: 동결 증거만으로 판정 불가

## 수정이 필요한 17개

### 이사 D-30: 5개

1. `base-moving-d30-flow-1-step-1-item-1|title`
   - 이사업체 제목 아래 입주청소 업체 견적·예약 행이 숨는다.
   - 이사업체와 입주청소 업체를 분리하거나 둘 다 제목에 명시해야 한다.
2. `base-moving-d30-flow-1-step-2-item-1|title`
   - 관리사무소 퇴거 일정 통보를 주소 변경처럼 묶었다.
3. `base-moving-d30-flow-1-step-2-item-2|title`
   - 원문은 사다리차 사용 여부와 주차 공간 **확인**인데 제목은 모두 **예약**으로 바꿨다.
4. `base-moving-d30-flow-1-step-2-item-3|title`
   - 열쇠·리모컨·설명서 모으기가 폐기물 처리처럼 읽힌다.
5. `base-moving-d30-flow-1-step-4-item-5|title`
   - 조건부 어항 이동 준비가 가전·가구 사진 제목 아래 완전히 숨는다.

### 오픽·신차: 3개

6. `base-opic-plan-flow-1-step-1-item-6|detail`
7. `base-opic-plan-flow-1-step-2-item-6|detail`
   - 원문은 보완 표현 정리까지 말한다. `다음 주에 쓸`이라는 시점은 근거가 없다.
8. `base-new-car-comparison-flow-1-step-4-item-1|title`
   - 출고 예정일과 취소·환불 조건이라는 중요한 계약 행을 제목에서 숨긴다.

### artifact rationale와 user overlay 혼합: 4개

9. `oq-oq-c08-ac-decision-item-decision|detail`
   - 세척 범위·시간·비용 설명 대신 “Memo가 주 결과물”이라는 projection 근거를 Item detail에 넣었다.
10. `oq-oq-b03-remodel-item-decision|title`
    - SourceRows는 10개 계약 확인 기준이다. `비교`와 `보완 요청 결정`은 직접 근거가 없다.
11. `oq-oq-b03-remodel-item-decision|detail`
    - 계약 기준 설명 대신 “Sheet가 주 결과물”이라는 projection 근거를 넣었다.
12. `oq-oq-p03-vehicle-item-1|title`
    - 원문이 뒷받침하는 검사 가능 기간 조회와 사용자가 정할 방문일을 한 source-backed 제목에 섞었다.

### 행정·면접·안전 조건: 5개

13. `interview-docs-step-item|title`
    - 원문은 준비할 서류만 말하며 `한 파일`이라는 포장 제약은 없다.
14. `license-class1-medical-check-period-item|title`
15. `license-class2-renewal-period-item|title`
    - 원문은 안전운전 통합민원 마이페이지 **또는** 교통민원24를 제시하지만 제목은 마이페이지만 남긴다.
16. `business-doc-license|title`
    - 운수업의 차량등록증·허가증·위수탁계약서 조건부 분기가 제목에서 숨는다.
17. `generalization:GB-03:item:humidifying-filter|title`
    - 물세척 금지라는 중요한 주의가 빈 detail과 짧은 제목에서 사라진다.

## temporal 5개

Dyson 필터 세척의 5개 단계는 별도로 확인했다.

- SourceRow의 `최소 월 1회 세척`은 5개 단계가 속한 세척 세션의 cadence를 뒷받침한다.
- `monthly interval=1`은 bounded normalization으로 허용할 수 있다.
- 시작일, `allDay`, `Asia/Seoul`, anchor day 0은 source fact가 아니다.
- 따라서 source cadence와 user/system schedule placement를 owner·derivation으로 분리해야 한다.

5개 모두 `bounded_normalization`으로 판정했지만 schedule provenance gap을 해소한 것으로 보지 않는다.

## 그대로 남는 aggregate gap

| gap | 필드 수 | 이번 판정으로 해소? |
|---|---:|---|
| completion provenance 미인코딩 | 412 | 아니오 |
| schedule owner·derivation 미인코딩 | 124 | 아니오 |
| 합계 | 536 | 아니오 |

completion 문구가 원문 완료 기준인지 UI 템플릿인지, schedule이 source·user overlay·system derivation 중 무엇인지 canonical field에서 직접 구분할 수 있어야 한다.

## 합친 claim boundary

말할 수 있는 것:

- trace-only 141개는 모두 수동 판정을 받았다.
- 124개는 동결 SourceRow 대비 의미 보존 범위 안에 있다.
- 17개는 수정해야 한다.
- Dyson 5개 schedule의 월 cadence는 source-backed지만 개인 배치는 source가 아니다.

말할 수 없는 것:

- 전체 corpus에서 발명 0
- 동결 SourceRow가 현재 live source를 완전히 재현한다는 것
- completion 412개와 schedule 124개의 provenance 무결성
- 권리·최신성·지역성·안전 승인
- 실제 사용자 검증
- 외부 Calendar/VTODO 왕복 검증

최종 zero-invention 상태는 `NOT_PROVEN`이다.

## 자체 검증

인라인 validator로 다음 13개를 확인했고 모두 통과했다.

- 두 입력 파일 hash 일치
- queue index `0..140` 정확히 한 번씩 존재
- unique key 141개
- audit queue와 key 집합 완전 일치
- 허용 verdict만 사용
- 분포 `37 / 87 / 17 / 0` 일치
- 모든 reason code가 catalog에 존재
- `needs_modify` 17개와 mismatch 17개 index 일치
- temporal 5개 key가 audit의 Dyson schedule 5개와 일치

결과: `PASS 13/13`
