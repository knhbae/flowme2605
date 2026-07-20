# P26-14 Audit

## 변경 전 문제

날짜 없는 항목을 Calendar에 놓는 기능은 있었지만 이름과 행동 위계가 불명확했다. `날짜 정하기`는 사용자가 무엇을 모아 둔 곳인지 설명하지 못했고, `날짜 없이` 행동은 이미 날짜 없는 항목을 다시 날짜 없이 두는 중복 행동이었다. 날짜를 제거한 뒤에는 tray로 돌아왔다는 feedback과 복구 경로도 없었다. 모바일에서는 tray가 월간 grid 뒤에 있어 첫 화면에서 발견하기 어려웠다.

## 구현

### 사용자 객체와 문구

- 객체 이름: `날짜 없는 할 일`
- 보조 문구: `아직 일정에 놓지 않은 실행 항목`
- public 결과: `Calendar에는 넣지 않고 My Flow에 저장합니다.`
- 선택 preview: `{N}개 선택 · Flow {M}개 → {날짜}`
- 적용: `선택한 {N}개를 이 날짜에 놓기`
- 빠른 배치: `오늘에 놓기`

긴 설명 카드 대신 count, 선택 preview, 날짜, commit 순서로 결과를 보여준다.

### Membership

tray는 현재 실행 가능한 Flow의 effective rows에서 다음 조건을 만족한 항목만 읽는다.

- effective date가 없다.
- 완료된 항목이 아니다.
- 반복 series 정의가 아니다.
- 현재 Calendar Flow scope 안에 있다.

checkbox는 completion control이 아니라 batch selection control이며 accessible name은 `{제목} 일정에 놓을 항목으로 선택`이다.

### 한 개·여러 개 배치

배치는 기존 personal date override/personal structural schedule adapter를 사용한다. 선택된 모든 항목을 먼저 resolve하고 적용 가능한 항목만 한 commit에 저장한다. preview count와 실제 tray/agenda/export count가 같은 state를 읽는다.

### 날짜 제거와 되돌리기

날짜 제거 undo는 원래 날짜가 없던 실행 항목을 다시 날짜 없음으로 바꿀 때만 생성한다. source date override를 단순 reset하는 경우와 혼동하지 않는다.

- source-backed personal copy: 이전 snapshot과 persistence record를 복원한다.
- personal draft user item: 이전 structural overlay schedule을 복원한다.
- URL draft source item: 이전 personal date override를 복원한다.
- 일반 row: 이전 date override를 복원한다.

undo는 8초 동안 같은 Calendar 화면에서 제공한다. 별도 undo history schema는 추가하지 않았다.

## 브라우저 시나리오

### public 차량 점검 -> 한 개 배치 -> undo

Route: `/f/vehicle-inspection-prep` -> `/my?view=flows` -> `/calendar`, 390x844.

1. 날짜 없이 저장한다.
2. My Flow Calendar export가 0건이며 비활성인지 확인한다.
3. 접힌 tray count 10을 확인한다.
4. keyboard Space로 한 항목을 선택하고 2026-07-28에 놓는다.
5. tray 9, 선택일 agenda 1을 확인한다.
6. 되돌려 tray 10, agenda 0을 확인한다.

결과: 통과.

### 세 항목 배치와 persistence

1. 세 항목을 선택한다.
2. preview `3개 선택 · Flow 1개 → 7월 29일`을 확인한다.
3. 적용 후 tray 7, agenda 3을 확인한다.
4. 새로고침 후 같은 수를 확인한다.

결과: 통과.

### 날짜 제거와 undo

1. 7월 29일 agenda 항목 하나를 연다.
2. 날짜를 지우고 저장한다.
3. tray 8과 `1개가 날짜 없는 할 일로 돌아왔습니다.`를 확인한다.
4. 되돌려 tray 7, agenda 3을 확인한다.

결과: 같은 항목과 날짜가 복원됐다.

### ICS parity

My Flow에서 Calendar export count 3을 확인한 후 ICS를 내려받았다. VEVENT는 3개이고 모두 2026-07-29 종일 일정이다. 중복 event는 0이다.

## 반응형·접근성

- 390x844: 선택일 -> 접힌 날짜 없는 할 일 -> 월간 grid 순서다.
- 1024x768: tray는 `data-layout=sidebar` rail로 항상 보인다.
- tray selection에 completion-like accessible name은 0건이다.
- 첫 항목은 keyboard Space로 선택했다.
- 10개 모두 선택 전후 commit control의 x/width 변화는 1px 이하다.
- horizontal overflow 0, console/page error 0.

자동화 screenshot은 현재 브라우저 근거이며 실제 사용자 관찰이 아니다.

## 소유권과 회귀

- Source: mutation 0.
- Personal overlay: 선택한 항목의 날짜만 저장.
- Execution run: 완료/완료 취소 상태 변경 없음.
- Recurrence: series definition은 tray에서 제외.
- Export: 날짜가 정해진 항목만 Calendar/ICS에 포함.
- Storage schema: 변경 없음.

## 검증

- P26-14 dedicated Playwright: 1 passed.
- 기존 date-intent/tray/personal-draft scheduling 회귀: 3 passed.
- Full unit: 556 passed, 0 failed.
- Production build: 18 routes.
- docs check: 14 required files, 2,641 local links.
- `git diff --check`: 오류 0, 기존 line-ending warning만 확인.
- `npm audit --audit-level=high`: high/critical 0, 기존 Next 내부 PostCSS moderate 2. Breaking force upgrade는 적용하지 않았다.

관찰 사용자 수는 0이며, 발견성·문구 이해도는 P26-19 전까지 heuristic/browser evidence로만 판정한다.
