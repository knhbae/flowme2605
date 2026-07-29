# P35-05 Audit

## 1. 판정

`pass`

My Flow의 문제를 새 탭이나 새 planner 기능으로 해결하지 않고, 저장한 Flow를
찾는 라이브러리와 선택한 Flow를 실행·수정하는 focused workspace로 역할을
분리했다.

## 2. 제거한 중복

- 상위 `지금`, `완료` local view
- 모바일 Flow 목록 위의 별도 요약 카드
- 와이드에서 첫 Flow를 자동 선택해 목록과 상세를 동시에 강요하던 동작
- 같은 occurrence를 Today와 전체 계획에서 각각 실행시키던 명령 중복
- Studio와 데이터 관리의 독립 primary 진입

기존 `?view=now`, `?view=completed` URL은 데이터를 지우지 않고
`?view=flows`로 안전하게 정규화한다.

## 3. 현재 문법

### Library

- 개인 제목
- 진행 수치
- 한 줄 다음 행동
- 행 전체의 명시적 열기 action
- 규모가 커질 때만 검색과 상태 필터

### Focused workspace

- `다음 행동`: 지금 실행할 한 항목과 완료/다시 열기
- `전체 계획`: ordered whole Flow와 항목 수정
- `기록`: 실행 기록과 회고
- `Flow 관리`: export, 재사용, 보관 등 secondary command

완료 알림의 `항목 보기`는 이제 체크박스에 초점만 옮기지 않고 같은 Flow의
전체 계획과 해당 항목 상세를 실제로 연다.

## 4. 데이터 영향

변경 없음:

- source content
- personal overlay
- execution run
- recurrence occurrence
- export identity
- localStorage key 및 snapshot schema
- migration

데모 규모 fixture는 화면 검증용 projection만 자르며 저장 데이터를 만들거나
수정하지 않는다.

## 5. Browser evidence

### `/my?demo=ux1&view=flows`, 390x844

- library row: 1
- row visible command: 1
- search/filter: hidden
- top-level Today/completed view: 0
- overflow: 0
- unnamed interactive: 0

### `/my?demo=ux20&view=flows`, 390x844

- total Flow: 20
- initial rows: 8
- progressive remainder: 12
- search/filter: visible
- focused Flow marker: `P35-PERSONAL-SINGLE-FOCUS`
- quick title/date/memo edit reachable

### `/my?demo=ux20&view=flows`, 1024x768

- library rows: 20
- initial selected Flow: 0
- explicit open 이후 detail: 1
- library rail과 detail canvas overlap: 0

### `/my?demo=ux60&view=flows`, 1440x900

- library rows: 60
- search visible: true
- first/last row visible command: 각각 1
- overflow: 0

## 6. 회귀 확인

- 완료 → 되돌리기 → 완료 → 전체 계획 → 다시 열기
- 저장 후 reload persistence
- whole Flow outline
- archive/restore/permanent-delete command surface
- Calendar completion identity
- legacy My Flow view URL canonicalization

위 항목은 current command/browser 결과다. 이전 artifact의 pass 기록을 이번
실행 결과로 사용하지 않았다.

## 7. Evidence kind

- current_source
- current_command
- current_browser
- current_package_screenshot
- heuristic_review

실제 관찰 사용자 수는 0이다.
