# 독립 검토 공통 scorecard와 증거 규칙

Codex와 Claude Design은 같은 표를 각각 독립적으로 채운다. 숫자 총점은 사용하지 않는다. 증거가 없는 항목을 평균 점수로 감추지 않고, 구현 상태·설계 판단·사용자 이해를 서로 다른 축으로 기록한다.

## 1. 판정 축

### A. 구현 상태

| 값 | 의미 |
|---|---|
| `O` | 해당 상태에서 직접 재현되고 acceptance를 충족함 |
| `△` | 일부 context만 충족하거나 중요한 예외·증거 공백이 있음 |
| `X` | 직접 재현된 실패 또는 계약 위반이 있음 |
| `NOT_IMPLEMENTED` | 아직 구현 범위가 아니므로 성공·실패로 판정하지 않음 |
| `TBD` | 필요한 화면·데이터·재현 정보가 없어 판단 불가 |
| `N/A` | 해당 context에는 적용되지 않으며 이유가 있음 |

### B. 제안 coverage

`FULL / PARTIAL / MISSING / REJECTED / LOCAL_CONFIRMATION_REQUIRED` 중 하나를 쓴다. 이것은 구현 여부가 아니라 제안이 문제를 얼마나 다뤘는지 나타낸다.

### C. 사용자 이해

이번 검토의 값은 항상 `NOT_ASSESSED`다. Owner, Codex, Claude의 검토·시뮬레이션·자동화·스크린샷은 실제 사용자 관찰이 아니다.

### D. 결론

| 값 | 쓰는 조건 |
|---|---|
| `confirm` | 승인된 방향을 유지하며 명세 보강만 필요 |
| `bounded_amendment` | 근본 방향은 유지하되 구현 전 제한된 수정이 필요 |
| `stop_and_reopen` | 데이터 손상, 상태 소유권 충돌, 안전 은폐, rollback 불가 같은 hard fail 때문에 결정을 다시 열어야 함 |

취향 차이, 경쟁 앱과의 외형 차이, 더 예뻐 보이는 대안만으로 `stop_and_reopen`을 쓰지 않는다.

기술 hard fail은 아니지만 IA·용어·상태 인지가 근본적으로 갈려 Owner 선택 없이는 다음 명세를 한 가지로 고정할 수 없으면 verdict와 별도로 `DESIGN_RISK_NEEDS_OWNER_DECISION`을 붙인다. 대안·trade-off·추천안과 Owner가 답할 질문을 한 개로 압축해야 하며, 증거 부족을 취향 질문으로 넘기는 용도로 쓰지 않는다.

## 2. 상태 namespace

모든 표·이미지·결론에는 다음 중 하나를 붙인다.

- `P35_PRODUCTION_BASELINE`: 현재 배포된 P35
- `ROUND2_LOCAL_P0_06`: 아직 게시·배포되지 않은 로컬 후보
- `HISTORICAL_BEFORE`: 2026-08-03 또는 그 이전 증거
- `PROPOSAL`: 구현되지 않은 설계안
- `NO_CURRENT_ARTIFACT`: 현재 After가 없는 항목

`ROUND2_LOCAL_P0_06`을 `Production After`라고 부르지 않는다. P0-07 이후 제안을 `After`라고 부르지 않는다.

## 3. 증거의 최소 단위

각 핵심 주장에는 다음을 붙인다.

```text
evidence ID:
state namespace:
evidence kind: RUNTIME_OBSERVED | CODE_CONFIRMED | PAYLOAD_CONFIRMED | STATIC_CAPTURE | SYNTHETIC_STRESS | DESIGN_INFERENCE | UNVERIFIED
branch / HEAD / build ID:
route + query + feature flags:
viewport + scroll position:
fixture + fixture hash + 입력 날짜:
before -> action -> after:
visible primary / secondary action:
storage keys changed + before/after hash:
console / page / failed request:
artifact path or GitHub URL + SHA-256:
reviewer inference:
local confirmation required:
```

정적 이미지는 상태 전이를 증명하지 않는다. 저장·취소·Back·중복 저장·실패·재시도 주장은 행동 전후와 storage diff가 있어야 한다. `public-plan-50-items-390.png`는 실제 50 Item 콘텐츠가 아니라 합성 layout stress로만 사용한다.

## 4. 근본 hard-fail gate

아래 질문 중 하나라도 근거 있는 `X`면 다음 구현을 시작하기 전에 원인을 닫는다.

| ID | 근본 질문 | Hard fail 예시 |
|---|---|---|
| D0 | 콘텐츠가 공통 canonical data와 renderer를 공유하는가 | 콘텐츠별 화면 코드가 Item 의미·저장·CTA를 따로 소유해 같은 필드가 다른 결과를 냄 |
| D1 | `/my`가 저장 계획의 집이고 Today가 파생 요약인가 | 같은 데이터가 별도 저장소처럼 갈라져 한쪽 변경이 다른 쪽에 반영되지 않음 |
| D2 | 공개→수정→저장→실행→옮기기의 소유권이 하나씩인가 | 같은 결과 생성 행동이 공개·저장 화면에 중복되고 서로 다른 버전을 사용함 |
| D3 | 결과 형식이 capability와 실제 데이터에 기반하는가 | 지원하지 않거나 빈 형식을 정상 탭처럼 보여줌, 날짜 없는 Item을 임의 일정으로 만듦 |
| D4 | 공통 editor family가 context별 commit 효과를 정확히 알리는가 | 같은 버튼이 public draft와 persistent save를 구분하지 못하거나 Item 적용이 즉시 전체 저장됨 |
| D5 | 감산·도움·주의가 안전과 접근성을 보존하는가 | 건강·안전·비가역 영향이 `!`를 열어야만 보임, 키보드·Back·focus return이 없음 |
| D6 | 용어·CTA가 현재 상태와 다음 결과를 말하는가 | `완료`가 편집 종료·계획 저장·Item 완료에 동시에 쓰임 |

## 5. 사용자 피드백 U01~U10 추적표

각 검토자는 빈칸을 모두 채운다. 한 셀에 `O O X`처럼 상태를 합치지 말고 열을 나눠 의미를 보존한다.

| ID | 문제/의도 | Production | Local P0-06 | Proposal coverage | 권장 판단 | 그대로 적용할 위험 | 수정안 | 근거 ID | 사용자 이해 |
|---|---|---|---|---|---|---|---|---|---|
| U01 | 실제 옮기기의 주 위치 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U02 | 도움·주의 감산 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U03 | `/my` 전체 IA·순서 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U04 | Item 상세→메모 작성·수정→완료→되돌리기→reload 흐름과 surface·중복 heading·수정 문구 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U05 | Flow Map 3칸 요약 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U06 | 시작일 중복 echo |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U07 | 공개 CTA·여러 결과·저장 후 이동 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U08 | 공개/저장 편집 family·화면 분리 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U09 | 더보기·미리보기·편집 역할 |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U10 | `Flow` 용어 이해 가능성 |  |  |  |  |  |  |  | `NOT_ASSESSED` |

권장 판단은 `채택 / 의도 채택·해결법 수정 / 일부 채택 / 기각 / 검증 필요` 중 하나다. 최소 세 항목에서 사용자가 제안한 해결법을 그대로 적용할 때의 위험 또는 더 작은 대안을 적는다.

## 6. 공통 시나리오 scorecard

두 검토자는 S01~S13을 같은 순서로 평가한다. Claude는 실행할 수 없는 항목을 `LOCAL_CONFIRMATION_REQUIRED`로 남기고 화면·상태 계약을 평가한다.

| ID | 시나리오 | 필수 판정 |
|---|---|---|
| S01 | 날짜형 공개 계획 첫 방문·시작일 전/후 | 날짜 echo, primary action, 저장 전 상태 |
| S02 | 날짜 없는 체크리스트형 공개 계획 | 가능한 결과와 날짜를 요구하면 안 되는 결과 |
| S03 | 반복·주의가 있는 공개 계획 | 반복 편집, 항상 보여야 할 안전 정보, disclosure |
| S04 | 메모/참고 중심 공개 계획 | 억지 일정·할 일 생성 여부와 원문 보존 |
| S05 | Flow Map 8개→7개 수정·적용·저장 | selected/applied/preview/saved count parity와 3칸 감산 |
| S06 | Public Plan 편집 clean/dirty/invalid | 공통 family, Apply 효과, close/Back/focus |
| S07 | Public Item 편집 후 부모 Plan 반영 | Item 적용과 Plan 적용의 구분, storage write 0 |
| S08 | 저장 직후 `/my` 선택 계획 도착 | 중간 메뉴 없이 직접 이동, 배너 1개, 다음 행동 |
| S09 | `/my` 0·1·5·20개와 Today 없음/있음 | library shell, selected detail, 확장성, 빈 상태 |
| S10 | Saved Plan/Item 편집과 Item 메모·완료·되돌리기 | parent draft와 final commit 구분, 상세→메모→완료→되돌리기→reload, Today/계획 반영, authoring/execution 분리 |
| S11 | 여러 결과 preview·conditional·unavailable | 실제 필드가 보이는 preview, 고정 5형식 금지 |
| S12 | 저장 계획에서 실제 옮기기 성공·부분 성공·실패·재시도 | 범위·형식·버전·receipt·중복 방지 |
| S13 | flag off·legacy read-only·reload·중복 저장 | rollback, no-write, stale state, 기존 사본 보호 |

각 시나리오 결과는 다음 형식으로 쓴다.

```text
scenario:
state(s):
result: O | △ | X | NOT_IMPLEMENTED | TBD | N/A
what happened:
expected invariant:
evidence IDs:
root cause, not symptom:
recommendation:
acceptance test:
```

## 7. 비교안 작성 규칙

IA·lifecycle·format·editor 대안은 각각 최소 두 안을 비교하되, 모든 안에 다음을 적는다.

- 첫 화면에서 보이는 것과 숨기는 것
- 기본 검증 가설은 primary 1개·secondary 최대 1개다. 더 명확한 대안이 있으면 반증 근거와 함께 제안할 수 있지만, 같은 효과의 primary 중복은 허용하지 않는다.
- 누가 어느 버전의 계획을 바꾸는지
- 저장 전·저장 후·실패 후·Back 후 상태
- 0·1·5·20개 계획과 날짜 없음 처리
- 안전·접근성·rollback 영향
- 채택하지 않은 이유

경쟁 앱의 기능 목록을 붙이는 것으로 비교를 끝내지 않는다. FlowMe의 `공개 원본 → 개인 사본 → 실행 overlay → portable 결과` 관계에 어떤 원칙만 가져오는지 적는다.

## 8. 최종 제출 형식

1. `review_manifest`: 입력 URL/commit, 확인 시간, independence, 누락 입력
2. `root_findings`: D0~D6별 사실·추론·대안·결론
3. `scenario_results`: S01~S13
4. `user_feedback_matrix`: U01~U10
5. `proposal_or_patch`: 제안 ID 또는 코드 경로, 제거 항목, acceptance
6. `evidence_index`: 이미지·로그·storage diff와 hash
7. `verdict`: `confirm / bounded_amendment / stop_and_reopen`
8. `next_gate`: 지금 구현 가능한 것, 추가 확인이 먼저인 것, Owner 결정이 필요한 것 최대 3개

마지막에 다음을 그대로 기입한다.

```text
observed_user_count: 0
user_understanding: NOT_ASSESSED
production_changed_by_this_review: no
text_to_flow_reviewed: no
```
