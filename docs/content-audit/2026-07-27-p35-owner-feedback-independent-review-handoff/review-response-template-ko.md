# 독립 검토 응답 형식

검토 결과는 아래 순서로 작성한다. 일반적인 칭찬이나 취향 설명보다 findings와
구체적인 상태 전이를 먼저 제시한다.

## 1. 검토 기준

- 확인한 Preview URL
- 확인한 branch 또는 source
- viewport
- 사용한 evidence 종류
- 접근하지 못한 자료
- 실제 관찰 사용자 수

## 2. Findings

Blocking, High, Medium, Low 순서로 작성한다.

각 finding은 다음 필드를 포함한다.

```text
ID:
Severity:
Route:
Viewport:
Persona / Flow shape:
재현 단계:
기대:
실제:
사용자 영향:
원인 가설:
제안:
Acceptance marker:
EvidenceKind:
```

문제가 없으면 “문제 없음”으로 끝내지 말고 검증하지 못한 공백과 잔여 위험을 적는다.

## 3. P35 방향 판정

다음 중 하나를 선택한다.

- `retain`
- `revise`
- `structural_reopen`

아래 항목을 각각 판정한다.

| 항목 | 판정 | 근거 | 변경 필요 |
| --- | --- | --- | --- |
| 3탭 entry router |  |  |  |
| public result-first |  |  |  |
| 한 번에 한 조정 |  |  |  |
| My Flow library → focused workspace |  |  |  |
| Calendar date lens |  |  |  |
| scope-first export |  |  |  |

## 4. 사용자 피드백 F01~F07

각 항목은 아래 중 하나로 판정한다.

- `supported`
- `partly_supported`
- `rejected`
- `needs_observation`

| ID | 판정 | 현재 문제 | 선택 대안 | 이유 | 부작용 |
| --- | --- | --- | --- | --- | --- |
| F01 저장 전 항목 상세·날짜 |  |  |  |  |  |
| F02 저장 후 첫 화면 |  |  |  |  |  |
| F03 같은 날짜 다음 묶음 |  |  |  |  |  |
| F04 저장 전 artifact·외부 가져가기 |  |  |  |  |  |
| F05 되돌리기 조건 |  |  |  |  |  |
| F06 다음 행동 정체성 |  |  |  |  |  |
| F07 기록 정체성 |  |  |  |  |  |

## 5. Persona 여정 결과

`J01`~`J05` 각각에 대해 다음을 기록한다.

- 완료 가능한가
- 막히는 단계
- action count
- 설명 없이 이해 가능한가
- current/proposed 차이
- 실제 사용자 관찰이 필요한 가정

자동화 또는 simulation은 observed-user로 기록하지 않는다.

## 6. 레퍼런스 비교

제품별 화면 모양을 복제하지 말고 다음 패턴만 비교한다.

- Todoist: Today와 task detail, completion undo
- Things: Today/Anytime/Logbook과 project next step
- Google Calendar Tasks: dated task와 task detail
- Notion: 동일 데이터의 view와 contextual page edit
- Wanderlog: 날짜별 묶음과 전체 일정 변경
- Strava/Nike: routine plan, occurrence, history

각 패턴에 대해 `adopt`, `adapt`, `reject`와 이유를 적는다.

## 7. Proposed structure

390x844와 1024x768을 각각 제안한다.

필수 화면:

1. Public result + contextual Item edit
2. Artifact preflight + FlowMe/외부 destination
3. Saved receipt
4. Personal Flow 첫 화면
5. 날짜형 next group
6. 날짜 없는 checklist
7. Routine occurrence
8. Record/history

각 화면에 다음을 표시한다.

- 화면이 답하는 질문
- primary action
- secondary action
- 숨긴 command
- 다음 상태
- focus order

## 8. Surface ownership

최종 표를 작성한다.

| 행동 | 소유 surface | 다른 surface의 행동 |
| --- | --- | --- |
| 항목 제목·상세·날짜 저장 전 수정 |  |  |
| FlowMe 저장 |  |  |
| 외부 가져가기 |  |  |
| 전체 저장 결과 확인 |  |  |
| 다음 실행 |  |  |
| 완료·다시 열기 |  |  |
| 단계 메모 |  |  |
| 실행 기록 |  |  |
| 회고 |  |  |
| 새 실행으로 다시 쓰기 |  |  |

## 9. 구현 프로그램

한 번에 전체를 구현하지 말고 다음을 포함한다.

- slice 순서와 dependency
- 각 slice의 범위와 비범위
- rollback 경계
- 데이터 migration 필요 여부
- unit/E2E/browser acceptance
- 390/1024 screenshot marker

P35의 안정된 source, personal overlay, execution run, occurrence, export identity는
특별한 근거 없이 다시 작성하지 않는다.

## 10. 실제 사용자에게 확인할 질문

자동화로 답할 수 없는 질문만 5개 이하로 적는다.

예:

- 저장 전에 어느 정도까지 수정해야 저장할 마음이 드는가?
- 저장 직후 전체 결과와 첫 할 일 중 무엇을 먼저 찾는가?
- 외부 가져가기만 한 뒤에도 FlowMe 기록 기능을 사용할 이유가 있는가?

## 11. 최종 권고

다음 중 하나와 바로 다음 한 slice를 제시한다.

- `retain_and_polish`
- `bounded_composition_revision`
- `structural_reopen_before_publish`

실제 사용자 관찰 전 반드시 고칠 항목과 관찰 뒤 결정할 항목을 분리한다.
