# P24 Journey Frame Backlog

## Gate Status

| Gate | Status | Exit condition |
| --- | --- | --- |
| P24-J0 journey decision | in progress | 대안 wireframe, owner review, 독립 heuristic review, keep/change/defer |
| P24-J1 save decision surface | blocked by J0 | save/adjust와 copy hierarchy 승인 |
| P24-J2 post-save full artifact | blocked by J1 | 저장 직후 전체 확인 depth 0 |
| P24-J3 My Flow/Calendar/held roles | blocked by J2 | ordinary held 0, dated/undated 역할 명확 |
| P24-J4 integration/regression | blocked by J1~J3 | automated Blocking/High 0 |
| P24-J5 internal production readiness | blocked by J4 | deployed journey의 Blocking/High 0과 owner readiness decision |
| P24-00B observed-user pilot | deferred, not scheduled | owner가 J5 이후 명시적으로 재개; 현재 `0 / 15` |

## P24-J0 Deliverables

- current vs alternative A/B wireframes at 390px and 1024px
- moving, vehicle, memo draft scenario simulation
- copy delete/collapse/keep map
- post-save first-visit vs returning-visit state contract
- My Flow/Calendar/undated/held visibility map
- owner walkthrough와 independent agent review record
- one selected implementation direction

## Implementation Order

1. **P24-J1:** moving/vehicle save-before shell과 설명 밀도
2. **P24-J2:** 저장 직후 전체 Flow landing
3. **P24-J3A:** My Flow artifact selection과 returning Today
4. **P24-J3B:** Calendar undated tray와 held visibility
5. **P24-J4:** 세 대표 유형 통합, regression, deploy
6. **P24-J5:** 독립 production-readiness 감사와 owner 준비도 판단
7. **P24-00B:** 현재 실행 순서 밖에서 보류; owner가 별도 목표로 명시할 때만 재개

## Explicitly Deferred

- arbitrary URL production fetch/LLM
- source-backed arbitrary structural edit
- direct external-tool sync
- cloud persistence
- Studio promotion
- drag-and-drop-only interaction
- broad visual refresh outside the target journey

## Stop Rule

J0 owner/independent review에서 다음 중 하나가 화면만으로 판정되지 않으면 J1 구현으로 넘어가지 않는다. 이 판정은 실제 사용자 이해 증거가 아니다.

- 무엇이 저장되는지 예측
- 그대로 저장과 조정 저장 구분
- 저장 직후 전체 결과 확인
- Today와 Calendar 역할 구분
- 날짜 없는 일을 일정에 넣는 위치 발견

P24-J5에서도 아래 조건을 모두 충족하기 전에는 외부 사용자 관찰을 권고하지 않는다.

- production Blocking/High 0
- 저장 전 결과와 저장 직후 전체 Flow가 별도 설명 없이 연결됨
- My Flow와 Calendar 역할 및 undated tray가 일관됨
- ordinary surface의 held 콘텐츠 0
- 익명 production 접근과 모바일/와이드 접근성 검증 통과
