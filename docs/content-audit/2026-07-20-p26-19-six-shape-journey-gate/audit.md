# P26-19 상세 감사

## 1. Evidence 경계

- `current_command`: `bb2f10b`에서 이번 turn에 직접 실행한 명령
- `current_browser`: 로컬 production-mode Playwright가 실제 route와 localStorage를 조작한 결과
- `current_screenshot`: 같은 실행에서 생성한 390x844/1024x768 PNG
- `prior_design_artifact`: 로컬 usage preview HTML. 현재 source나 production 정답으로 사용하지 않음
- `heuristic`: screenshot을 보고 수행한 정보 위계와 밀도 판단
- `observed_user`: 없음

초기 harness 작성 중 Windows argument quoting 실패가 두 번 있었지만 브라우저 테스트는 시작되지 않았다. Playwright CLI를 Node로 직접 실행하도록 수정한 뒤 최종 명령은 `7 / 7`을 반환했다.

## 2. 기존 P24 회귀 이관

P26-16 상태 문서에 남아 있던 stale selector 문제를 먼저 재현했다.

1. 최초 전체 실행: `13 / 15`, 두 실패 모두 120~180초 동안 폐기된 UI selector를 기다림
2. 수정한 경로:
   - 개인 draft 상세: 현재 visible detail + quick editor
   - source-backed row: 공통 execution row + `열기`
   - post-save: receipt에서 전체 Flow로 명시적 진입
   - public save: 문구 목록 대신 primary action contract
   - reload 후 personal draft: expanded execution row와 compact step row를 같은 item 집합으로 검증
3. 최종 전체 재실행: `15 / 15`

기능 기대값은 낮추지 않았다. 저장 count, reload persistence, Calendar/ICS parity, 완료 취소, export scope assertion은 유지했다.

## 3. 여정별 결과

### J1 기준일 역산형

- route: `/flow-maps/moving-d30` → `/my?savedMap=moving-d30`
- viewport: 390x844, 1024x768
- fixture: 이사일 `2030-08-15`
- 확인: 저장 직후 5개 전체 Flow, returning workspace 동일 5개, 완료 후 reload, 완료 탭에서 다시 열기, wide detail pane
- 실제: mobile/wide 모두 동일 effective rows와 stable completion control 유지
- 판정: supported

### J2 날짜 없는 체크형

- route: `/f/vehicle-inspection-prep` → `/calendar` → `/my?view=flows`
- viewport: 390x844, 1024x768
- 확인: 날짜 없이 시작, Calendar tray 10개, 1개 preview, 3개 atomic placement, 날짜 제거와 undo, ICS 3 VEVENT
- 실제: unscheduled work는 My Flow에 남고 Calendar에는 배치 후만 등장. 날짜 제거는 membership만 바꾸고 item을 지우지 않음
- 판정: supported

### J3 반복 루틴형

- route: `/f/washer-tub-clean-monthly` → `/my` → `/calendar`
- viewport: 390x844, 1024x768
- 확인: 4회 preview, series row completion control 0, occurrence control 1, done→reopened, public/My Flow/row ICS RRULE와 UID
- 실제: `FREQ=MONTHLY;BYMONTHDAY=20`, duplicate VEVENT 0, wide agenda title width guard 유지
- 판정: supported

### J4 순서·날짜 혼합형

- route: `/flows` memo → `/my`
- viewport: 390x844, 1024x768
- 확인: 3개 draft, structure mode, 2개 선택 날짜 이동·undo, selected export, 날짜 제거·undo, tombstone·restore, source-backed remove control 0
- 실제: selection mode에서 completion control이 사라지고 선택 범위가 2개로 일치. 개인 순서와 값 보존
- 판정: supported

### J5 기록·메모형

- route: `/flows` memo → `/my`
- viewport: 390x844, 1024x768
- 입력: `8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인`
- 확인: 5개 분할, source fragment, merge/split/reorder/exclude, 4개 receipt, reload, memo export 4개
- 실제: filler 0, accepted/save/export count 모두 4, source fragment 보존
- 판정: supported

### J6 개인 초안형

- route: `/flows` URL miss → `/my` → `/calendar`
- viewport: 390x844, 1024x768
- 확인: user item 추가, daily count 3, series/occurrence identity, done/reopen/skip/hold/resume, reload, stable UID/RRULE
- 실제: occurrence 3개, series completion control 0, 상태 전이 후 같은 occurrence ID, before/after ICS UID 동일
- 판정: supported

## 4. 시각 검토

### 유지할 것

- post-save mobile에서 저장 결과 요약 뒤에 전체 Flow가 즉시 이어져 저장 성공과 내용 확인이 한 프레임 안에 있다.
- wide My Flow는 outline과 detail을 나누고 완료 checkbox를 행에만 둔다.
- memo editor는 한 원문 fragment와 여러 실행 항목의 관계를 보여주며, local usage preview의 source rail/compact row 원칙과 맞는다.
- recurring Calendar는 series와 occurrence를 구분하고 occurrence 상태를 행 안의 한 control로 유지한다.
- export는 scope, format, 실제 결과 receipt 순서가 보인다.

### Medium 잔여

1. 모바일 batch editing은 항목 이동 icon, 선택, 날짜 operation, destructive action이 좁은 세로 공간에 연속된다. 동작은 맞지만 첫 사용자가 mode를 이해하는지는 관찰되지 않았다.
2. wide undated tray는 3열 구조를 지키지만 긴 제목이 ellipsis로 생략된다. 선택 전 항목 구분에는 보조 detail 또는 tooltip 검토 여지가 있다.
3. 모바일 Calendar의 tray와 월간 grid를 함께 보는 전체-page capture는 길고 시각적으로 분절된다. 실제 viewport overlap assertion은 0이지만 정보 밀도는 높다.
4. recurring occurrence detail은 상태 전이와 memo/export가 모두 reachable하나 action hierarchy가 조밀하다.

위 네 항목은 current-browser correctness를 깨지 않아 P26-19에서 앱 UI를 다시 수정하지 않았다.

## 5. 접근성·품질

- 완료/다시 열기: checkbox accessible name과 focus 복귀 검증
- batch movement: Enter keyboard 이동 검증
- public primary: `data-action-priority="primary"`와 `/시작/` accessible name 검증
- recurring occurrence: skip/hold/resume accessible name과 Enter/Space 검증
- horizontal overflow: 각 대표 시나리오 assertion 0
- console/page error: 0

이것은 자동화 가능한 접근성 경로다. screen reader 사용자와 실제 touch 사용자의 이해도는 아직 검증하지 않았다.

## 6. P26-20 handoff

P26-20은 다음을 새로 실행해야 한다.

1. full unit, docs, production build, security audit
2. full Playwright suite와 P26-19 대표 gate
3. final screenshot/review package
4. current branch commit/push 후 PR/merge
5. canonical Vercel production deploy와 smoke
6. Claude Design/Codex 독립 검토 prompt

P26-19 screenshot을 production screenshot으로 재표현하지 않는다.

## 7. 현재 명령 결과

- `npm.cmd test`: pretest `13 / 13`, full unit `564 / 564`
- `npm.cmd run docs:check`: required files `14`, local links `2,683`
- `npm.cmd run build`: static pages `18 / 18`
- `npm.cmd run security:audit`: high `0`, critical `0`, moderate `2`
- `npm.cmd run audit:p26:journeys`: representative `7 / 7`
- `npx.cmd playwright test tests/e2e/p24-execution-trust.spec.ts --workers=1 --reporter=line`: `15 / 15`

보안 검증 중 `exceljs` 하위의 두 `brace-expansion` major line에 새 high advisory가 확인됐다. 각 `minimatch` major가 허용하는 patched version으로 override했고 lockfile을 갱신했다. 남은 moderate PostCSS advisory는 현재 Next 내부 의존성이며 `npm audit fix --force`가 파괴적 Next downgrade를 제안하므로 적용하지 않았다.
