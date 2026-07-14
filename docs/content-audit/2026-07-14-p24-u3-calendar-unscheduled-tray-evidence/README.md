# P24-00U3 Calendar 날짜 없음 선반 Evidence

## 판정

`supported` — My Flow의 open effective Item 중 날짜가 없는 항목을 Calendar 상단에서 발견하고, 하나 이상 선택해 날짜에 놓고, 직후 되돌릴 수 있다.

이번 slice는 Claude Design `(8)`의 `날짜 없음` Calendar 진입과 이동 전 결과 확인 패턴을 반영했다. 목업의 drag-and-drop은 keyboard/touch 대안과 장기 undo 정책이 정해질 때까지 열지 않고, 명시적 checkbox 선택과 native date input을 사용했다.

## 구현 범위

- Calendar 상단 `날짜 없음` 개수와 open tray
- Flow 이름을 보조 정보로 둔 할 일 선택 목록
- 단일/다중 선택 공통 날짜 지정
- 선택 수와 영향받는 Flow 수 preview
- 개인 draft user-created Item은 structural schedule에 저장
- 개인 draft source Item과 source-backed Item은 기존 personal date override에 저장
- 배치 직후 5초 `되돌리기`
- 새로고침 후 Calendar projection 유지

## 제외 범위

- drag-and-drop
- 시간·반복 일괄 변경
- 완료된 날짜 없는 항목의 재배치
- 반복 series 이동
- export 범위 선택 UI

## 증거

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [screenshots/00-calendar-unscheduled-selection-mobile.png](./screenshots/00-calendar-unscheduled-selection-mobile.png)
- [screenshots/01-calendar-unscheduled-applied-mobile.png](./screenshots/01-calendar-unscheduled-applied-mobile.png)
- [screenshots/02-calendar-unscheduled-wide.png](./screenshots/02-calendar-unscheduled-wide.png)

## 검증 성격

Playwright 자동화와 브라우저 screenshot 검사 결과다. 실제 관찰 사용자 세션은 `0`건이며, 선반 명칭·초기 펼침 상태·다중 선택의 이해도는 P24-00B에서 확인해야 한다.

## 현재 실행 결과

- `npm.cmd test`: 502/502 pass
- `npm.cmd run docs:check`: pass, 14 required files / 2129 local links
- `npm.cmd run build`: pass
- P24 execution trust: 12/12 pass
- URL-first user surface: 19/19 pass
- public share CTA order: 33/33 pass
- workbench source density: 11/11 pass
- Calendar targeted regression: 5/5 pass
