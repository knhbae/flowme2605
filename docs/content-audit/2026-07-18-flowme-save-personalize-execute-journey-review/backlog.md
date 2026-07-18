# P24 Journey Frame Backlog

## Gate Status

| Gate | Status | Exit condition |
| --- | --- | --- |
| P24-J0 journey decision | in progress | 대안 wireframe, 2개 짧은 prototype test, keep/change/defer |
| P24-J1 save decision surface | blocked by J0 | save/adjust와 copy hierarchy 승인 |
| P24-J2 post-save full artifact | blocked by J1 | 저장 직후 전체 확인 depth 0 |
| P24-J3 My Flow/Calendar/held roles | blocked by J2 | ordinary held 0, dated/undated 역할 명확 |
| P24-J4 integration/regression | blocked by J1~J3 | automated Blocking/High 0 |
| P24-J5 observed-user pilot | held | 짧은 재검증 Blocking 0 후 5명 x 3회 재개 |

## P24-J0 Deliverables

- current vs alternative A/B wireframes at 390px and 1024px
- moving, vehicle, memo draft scenario simulation
- copy delete/collapse/keep map
- post-save first-visit vs returning-visit state contract
- My Flow/Calendar/undated/held visibility map
- 2개의 10분 prototype test record
- one selected implementation direction

## Implementation Order

1. **P24-J1:** moving/vehicle save-before shell과 설명 밀도
2. **P24-J2:** 저장 직후 전체 Flow landing
3. **P24-J3A:** My Flow artifact selection과 returning Today
4. **P24-J3B:** Calendar undated tray와 held visibility
5. **P24-J4:** 세 대표 유형 통합, regression, deploy
6. **P24-J5:** short re-test 후 P24-00B 재개

## Explicitly Deferred

- arbitrary URL production fetch/LLM
- source-backed arbitrary structural edit
- direct external-tool sync
- cloud persistence
- Studio promotion
- drag-and-drop-only interaction
- broad visual refresh outside the target journey

## Stop Rule

J0 prototype에서 사용자가 다음 중 하나를 실패하면 J1 구현으로 넘어가지 않는다.

- 무엇이 저장되는지 예측
- 그대로 저장과 조정 저장 구분
- 저장 직후 전체 결과 확인
- Today와 Calendar 역할 구분
- 날짜 없는 일을 일정에 넣는 위치 발견
