# P33 Cross-entry Canonical Flow Alignment 제안

판정: P32 downstream workspace는 유지하고 discovery/save identity만 제한적으로 다시 연다.

## P33-00 Canonical inventory and reconciliation contract

앱 UI를 수정하지 않는다.

- source URL, Flow Map ID, public slug, URL lookup result, saved slug의 alias graph를 만든다.
- representative source별 canonical Flow ID를 확정한다.
- moving의 24-item/5-item 차이를 source fidelity와 user job 기준으로 판정한다.
- existing localStorage 중복 record의 보존·병합·충돌 규칙을 테스트로 고정한다.
- 완료, 날짜, 메모, personal overlay, run history를 잃지 않는 rollback plan을 만든다.

완료 gate:

- canonical source -> Flow table
- alias -> canonical route table
- duplicate saved data fixture
- no destructive migration

## P33-01 Moving vertical slice

- Home, Find, URL lookup의 moving entry를 한 canonical Flow로 연결한다.
- `/flow-maps/moving-d30`는 internal bundle 또는 canonical handoff로 낮춘다.
- title, source, 24/5 item decision, artifact choice, adjustment, receipt를 하나로 통일한다.
- 두 legacy alias를 순서대로 저장해도 My Flow object가 하나여야 한다.
- 기존 개인 날짜/메모/완료/run 기록을 보존한다.

Rollback:

- route alias registry 또는 feature flag만 제거하면 legacy route로 복귀 가능해야 한다.
- persistence function을 fork하지 않는다.

## P33-02 Catalog rollout

- 나머지 4개 `/flow-maps` catalog entry를 canonical public Flow에 연결한다.
- hydrated catalog와 server fallback inventory를 일치시킨다.
- Home example은 Find에서 같은 identity로 검색되게 한다.
- Flow Map은 사용자 card/save grammar가 아니라 내부 source bundle로 유지한다.

## P33-03 Artifact choice and promise parity

- 모든 eligible result choice가 실제 projection/save result를 바꾸게 한다.
- 선택 불가능한 shape는 button으로 렌더링하지 않는다.
- Home card의 title/source/result가 target default state와 일치하게 한다.
- vehicle은 generic checklist인지 D-14 calendar인지 하나의 user job으로 정리한다.
- raw recurrence rule을 사용자 문구로 projection한다.

## P33-04 Cross-entry regression gate

- Home -> detail -> save -> My Flow -> Calendar
- Find -> detail -> save -> My Flow -> Calendar
- URL lookup -> detail -> save -> My Flow -> Calendar
- 같은 source의 세 entry를 연속 실행
- duplicate Flow count 0
- item count/result mismatch 0
- artifact choice false affordance 0
- 390/1024/1440 overflow, focus, console/page error 0

## P33-05 Production closeout

- clean origin/main
- unit, docs, build, targeted/full E2E
- production deploy smoke
- current route screenshot recapture
- observed-user count를 별도로 기록

## 우선순위

`P33-00 -> P33-01 -> P33-02 -> P33-03 -> P33-04 -> P33-05`

P33-00 승인 전에는 slug 삭제, localStorage merge, redirect를 바로 구현하지 않는다.
