# FlowMe P35-04 My Flow Safe Split Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- acceptance marker:
  - `P35-MYFLOW-SAFE-SPLIT`
  - `P35-DEAD-VIEW-REMOVAL`
- 판정: `pass`
- 실제 관찰 사용자 수: `0`

## 결과

기존 giant `MyFlows`가 직접 그리던 live Calendar 화면을
`MyFlowCalendarSurface` 경계로 추출했다. `/calendar`는 더 이상
`<MyFlows initialView="calendar" surface="calendar" />`를 호출하지 않고
전용 `MyFlowCalendar` entry를 렌더링한다.

이번 slice는 구조 안전성만 다뤘다. `/my`와 `/calendar`의 사용자 화면,
완료·다시 열기, recurrence, lifecycle, export, demo fixture identity는
재설계하지 않았다.

상위 진입이 없던 `checklist`, `routine` view는 type, state, 계산,
렌더 branch와 해당 부재만 반복 검사하던 E2E assertion에서 제거했다.
Calendar의 실제 routine 항목과 Flow 필터는 그대로 유지한다.

새 localStorage key, schema, migration 또는 사용자 대면 라벨은 추가하지
않았다.

## 구조 변화

- 기존 `MyFlows` 책임 구간: 12,554줄
- 현재 공용 runtime: 12,277줄
- 현재 runtime + 추출 Calendar surface: 12,434줄
- runtime 조건 렌더: 341 → 334
- runtime button: 151 → 142
- dead-view assertion: 10 → 0
- 사용자 대면 한글 token 순증: 0

전체 수치는 [복잡도 비교](./p35-04-complexity-before-after.json)에 같은
측정법과 함께 기록했다.

## Evidence

- [상세 audit](./audit.md)
- [복잡도 비교](./p35-04-complexity-before-after.json)
- [route parity](./p35-04-route-parity.json)
- [My Flow 390px](./screenshots/p35-04-my-390.png)
- [Calendar 1024px](./screenshots/p35-04-calendar-1024.png)

## 현재 slice 검증

- `npm.cmd run docs:check`: pass, required 14 / local links 3195
- `npm.cmd test`: pretest 73/73, unit 590/590 pass
- production build: pass
- P35-04 targeted E2E: 2/2 pass
- lifecycle/export/P35-04 regression E2E: 11/11 pass
- My Flow/Calendar/recurrence parity E2E: 8/8 pass
- 390px horizontal overflow: 0
- 1024px horizontal overflow: 0
- console/page error: 0
- completion → reopen → completion identity change: 0
- `flow:saved:*` fixture write: 0
- source/test dead-view reference: 0

자동화, screenshot, fixture 검증은 실제 사용자 관찰이 아니다.
