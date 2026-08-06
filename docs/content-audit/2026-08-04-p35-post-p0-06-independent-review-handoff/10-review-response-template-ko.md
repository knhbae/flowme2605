# 독립 검토 응답 템플릿

## A. 입력·독립성 manifest

```yaml
reviewer:
review_started_at:
review_finished_at:
input_commit:
input_urls: []
unreadable_inputs: []
blind_result_path:
blind_result_sha256:
blind_result_locked_at:
blind_independence: INDEPENDENT
other_reviewer_result_seen_before_lock: false
cross_reviewer_independence: INDEPENDENT
production_state_checked:
local_state_checked:
observed_user_count: 0
user_understanding: NOT_ASSESSED
```

## B. 한 줄 verdict

`confirm / bounded_amendment / stop_and_reopen` 중 하나와 가장 중요한 근거를 한 문장으로 쓴다. 필요하면 별도 escalation flag `DESIGN_RISK_NEEDS_OWNER_DECISION`을 추가한다.

Exact enum:

- Namespace: `P35_PRODUCTION_BASELINE / ROUND2_LOCAL_P0_06 / HISTORICAL_BEFORE / PROPOSAL / NO_CURRENT_ARTIFACT`
- Evidence kind: `RUNTIME_OBSERVED / CODE_CONFIRMED / PAYLOAD_CONFIRMED / STATIC_CAPTURE / SYNTHETIC_STRESS / DESIGN_INFERENCE / UNVERIFIED`
- 구현: `O / △ / X / NOT_IMPLEMENTED / TBD / N/A`
- Proposal coverage: `FULL / PARTIAL / MISSING / REJECTED / LOCAL_CONFIRMATION_REQUIRED`

## C. 근본 영역 D0~D6

| ID | 확인한 사실 | 설계 추론 | 결론 | 유지할 것 | 바꿀 것 | 기각안·이유 | 근거 |
|---|---|---|---|---|---|---|---|
| D0 |  |  |  |  |  |  |  |
| D1 |  |  |  |  |  |  |  |
| D2 |  |  |  |  |  |  |  |
| D3 |  |  |  |  |  |  |  |
| D4 |  |  |  |  |  |  |  |
| D5 |  |  |  |  |  |  |  |
| D6 |  |  |  |  |  |  |  |

## D. 시나리오 S01~S13

| ID | Namespace | Evidence kind | 구현 결과 | 관찰/예상 | 위반 불변식 | 근본 원인 | 권장안 | acceptance | 근거 |
|---|---|---|---|---|---|---|---|---|---|
| S01 |  |  |  |  |  |  |  |  |  |
| S02 |  |  |  |  |  |  |  |  |  |
| S03 |  |  |  |  |  |  |  |  |  |
| S04 |  |  |  |  |  |  |  |  |  |
| S05 |  |  |  |  |  |  |  |  |  |
| S06 |  |  |  |  |  |  |  |  |  |
| S07 |  |  |  |  |  |  |  |  |  |
| S08 |  |  |  |  |  |  |  |  |  |
| S09 |  |  |  |  |  |  |  |  |  |
| S10 |  |  |  |  |  |  |  |  |  |
| S11 |  |  |  |  |  |  |  |  |  |
| S12 |  |  |  |  |  |  |  |  |  |
| S13 |  |  |  |  |  |  |  |  |  |

## E. 사용자 피드백 U01~U10

| ID | Production | Local P0-06 | Proposal coverage | 판단 | 그대로 적용할 위험 | 수정안 | After/TBD | 근거 | 사용자 이해 |
|---|---|---|---|---|---|---|---|---|---|
| U01 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U02 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U03 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U04 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U05 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U06 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U07 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U08 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U09 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |
| U10 |  |  |  |  |  |  |  |  | `NOT_ASSESSED` |

## F. Proposal 또는 patch 목록

| ID | 관련 U/D/S | 바뀌는 상태 | primary/secondary | 제거 | 오류·Back·빈 상태 | a11y·안전 | local 확인 | 기각한 대안 |
|---|---|---|---|---|---|---|---|---|

## G. 증거 index

| Evidence ID | Namespace | Evidence kind | Route/state | Viewport | Fixture | Before→Action→After | Storage diff | Console/network | Artifact/hash |
|---|---|---|---|---|---|---|---|---|---|

## H. 다음 gate

### 지금 진행 가능

- (기입)

### 먼저 확인 필요

- (기입)

### Owner 결정 필요 — 최대 3개

- (기입)

```text
observed_user_count: 0
user_understanding: NOT_ASSESSED
production_changed_by_this_review: no
text_to_flow_reviewed: no
```
