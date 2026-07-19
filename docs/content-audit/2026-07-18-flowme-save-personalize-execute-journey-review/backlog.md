# P24 Journey Frame Backlog

## Gate Status

| Gate | Status | Exit condition |
| --- | --- | --- |
| P24-J0 journey decision | done | artifact-first + optional adjustment + first-save whole-Flow frame selected |
| P24-J1 save decision surface | done in branch | save/adjust hierarchy and compact copy implemented |
| P24-J2 post-save full artifact | done in branch | saved effective rows visible at depth 0 |
| P24-J3 My Flow/Calendar/held roles | done in branch | ordinary held 0; dated/undated roles explicit |
| P24-J4 integration/regression | done locally | automated and independent Blocking/High 0 |
| P24-J5 internal production readiness | in progress | merge, deploy, and public production verification remain |
| P24-00B observed-user pilot | deferred, not scheduled | owner가 J5 이후 명시적으로 재개; 현재 `0 / 15` |

## P24-J0 Deliverables

- current vs alternative A/B wireframes at 390px and 1024px
- moving, vehicle, memo draft scenario simulation
- copy delete/collapse/keep map
- post-save first-visit vs returning-visit state contract
- My Flow/Calendar/undated/held visibility map
- owner walkthrough와 independent agent review record
- one selected implementation direction

## Execution Record

1. **P24-J1 done:** moving/vehicle save-before shell과 설명 밀도
2. **P24-J2 done:** 저장 직후 전체 Flow landing
3. **P24-J3A done:** My Flow artifact selection과 returning Today
4. **P24-J3B done:** Calendar undated tray와 held visibility
5. **P24-J4 done locally:** 세 대표 유형 통합과 regression
6. **P24-J5 current:** merge, production deploy, public verification, exact SHA 기록
7. **P24-00B deferred:** owner가 별도 목표로 명시할 때만 재개; 현재 `0 / 15`

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
