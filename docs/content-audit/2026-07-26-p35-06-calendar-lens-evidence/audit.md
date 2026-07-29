# P35-06 Audit

## 1. 판정

`pass`

Calendar를 별도 planner/editor로 확장하지 않고, 날짜가 있는 개인 실행 상태를
월간 grid와 선택일 agenda로 읽는 화면으로 한정했다.

## 2. 제거한 중복

- 날짜 없는 항목 tray
- Calendar 전용 날짜 이동 panel과 drag/drop
- Calendar row의 메모 작성
- Calendar item detail sheet
- 날짜 배치 undo가 Calendar tray를 다시 여는 경로
- 화면 위에 길게 늘어서던 Flow scope chip rail

날짜 없음, 날짜 지정·제거, 제목·메모와 구조 편집은 선택한 Flow의 My Flow
workspace가 소유한다.

## 3. 현재 화면 문법

### 월간 grid

- 날짜별 주요 Flow label 최대 2개
- 나머지는 `+N`으로 요약
- 날짜 선택만 수행
- event drag/drop과 item editor 진입 없음

### 선택일 agenda

- Flow title별 group
- dated item 전체 표시
- 동일한 완료 / 다시 열기 checkbox
- group 또는 row의 `Flow 열기` / `Flow에서 열기`
- stable Flow 및 item identity를 query로 전달

### Flow scope

- 닫힌 상태에서는 `전체 Flow` 또는 현재 선택 요약 한 개
- dialog 안에서 검색하고 여러 Flow를 선택
- Escape로 닫고 trigger로 focus 복귀
- 날짜 없는 항목만 있는 Flow는 Calendar scope 후보에서 제외

## 4. 데이터 영향

변경 없음:

- source content
- personal structural/value overlay
- execution run과 completion identity
- recurrence occurrence
- export identity
- localStorage key 및 schema
- migration

Calendar consumer와 interaction composition만 축소했다. 날짜 없는 항목이나
기존 개인 날짜 값을 삭제하지 않는다.

## 5. Browser evidence

### `/calendar?demo=ux20`, 390x844

- 월간 grid compact summary: visible
- 선택일 Flow group: visible
- Calendar edit owner: completion/reopen only
- My Flow deep link: Flow 및 item 유지
- horizontal overflow: 0
- unnamed interactive: 0
- console/page error: 0

### `/calendar?demo=ux20`, 1024x768

- scope presentation: compact picker
- exposed Flow chip rail: 0
- selected-day group: visible
- Calendar date move entry: 0
- Calendar item detail sheet: 0
- horizontal overflow: 0

### `/calendar?demo=ux60`, 1440x900

- dated rows: 258
- recurring series: 1
- closed scope command: 1
- searchable picker: visible on demand
- Escape 후 trigger focus return: true
- grid label overflow는 `+N` summary로 제한
- horizontal overflow: 0

## 6. 실행 상태 검증

- 완료된 row의 `다시 열기`
- 다시 열린 row의 `완료`
- 완료 직후 `되돌리기`
- 원래 Calendar checkbox로 focus return
- 구조 membership과 stable row identity 유지
- `Flow에서 열기` 후 focused My Flow 및 item detail 도달

## 7. Evidence kind

- current_source
- current_command
- current_browser
- current_package_screenshot
- heuristic_review

실제 관찰 사용자 수는 0이다.
