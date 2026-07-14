# P24-00U3 Calendar 날짜 없음 선반 Audit

## 원인

Calendar는 `projectionRows`의 scheduled Item만 읽었다. My Flow의 effective list에는 남아 있는 날짜 없는 Item이 Calendar에서는 흔적 없이 사라져, 사용자가 다시 My Flow 상세 편집 경로를 찾아야 했다.

## UX 결정

1. `날짜 없음`은 오류나 누락이 아니라 Calendar의 별도 상태다.
2. Calendar grid에는 가짜 날짜를 만들지 않는다.
3. 선반은 설명 카드가 아니라 Item 목록, 선택, 날짜, 실행으로만 구성한다.
4. 이동 전 `선택 N개 · M개 Flow`를 보여준다.
5. 이동 후 selected-day agenda가 정본이며, 5초 동안 즉시 되돌릴 수 있다.
6. 완료된 날짜 없는 Item은 이번 실행 선반에서 제외한다. 완료 취소 후 다시 open 상태가 되면 선반 대상이 된다.
7. Calendar route의 최초 hydration에서는 빈 오늘 대신 가장 가까운 저장 일정을 한 번 선택한다. 사용자가 이후 직접 빈 달로 이동한 상태는 유지한다.

## 데이터 경계

| Item 종류 | 날짜 저장 경로 | source 변경 |
| --- | --- | --- |
| 개인 draft user-created | personal structural overlay schedule | 없음 |
| 개인 draft source Item | personal draft value/date override | 없음 |
| source-backed Item | personal execution date override | 없음 |

선반은 `visibleExecutionFlows[].rows`의 effective Item을 읽는다. Calendar marker와 agenda는 기존 projection consumer가 읽으므로 배치 후 별도 Calendar 사본을 만들지 않는다.

## Claude Design `(8)` 반영

- 반영: Calendar 상단 `날짜 없음 N`, 여러 항목 선택, 이동 전 preview, 직접 되돌리기
- 보류: drag-and-drop. 현재 단계에서는 pointer 전용 조작과 불명확한 drop 결과를 피한다.
- 유지: Calendar는 날짜 중심, My Flow는 실행 중심이라는 기존 역할 분리

## 자동화 시나리오

1. URL-first miss에서 개인 draft 저장
2. My Flow에서 user-created 날짜 없는 Item 추가
3. `/calendar`에서 선반 확인
4. Space key로 Item 선택
5. `2026-07-21` 입력 및 preview 확인
6. 배치 후 selected-day agenda 반영
7. 즉시 되돌리기 후 선반 복구
8. 재배치 후 새로고침 persistence
9. 390px과 1024px horizontal overflow 확인

## 남은 위험

- 선반을 기본 펼침으로 두는 것이 항목이 많은 사용자에게 과밀한지는 관찰이 필요하다.
- completed Item을 선반에서 제외하는 정책이 사용자의 재계획 기대와 맞는지 확인해야 한다.
- 여러 destination을 함께 다루는 선택 모델은 P24-00S2에서 같은 selection semantics로 통합해야 한다.
- drag-and-drop은 keyboard/touch/undo를 함께 설계하지 않으면 추가하지 않는다.
