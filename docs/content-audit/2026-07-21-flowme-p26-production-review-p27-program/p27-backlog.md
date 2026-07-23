# P27 전체 UX/UI 개선 프로그램

## 프로그램 원칙

- P26의 source / personal overlay / execution run / occurrence / export identity를 유지한다.
- 기능을 더 붙이지 않고 현재 한 행동에 필요한 control만 보이게 한다.
- 긴 설명, 5번째 탭, 안정된 데이터 계약 재작성, planner화로 문제를 덮지 않는다.
- P27-01 비교 prototype이 승인되기 전 app UI 구현을 시작하지 않는다.
- 자동 검증과 agent simulation은 실제 사용자 검증으로 표현하지 않는다.

## 전체 순서

### 반드시 순차

`P27-01 -> (P27-03, P27-04, P27-05) -> (P27-06, P27-07) -> P27-10 -> P27-11 -> P27-12`

### 병렬 가능

- P27-02 접근성 foundation은 P27-01 이후 다른 feature slice와 병렬
- P27-03 composer와 P27-04 editor는 shared visual primitive가 확정된 뒤 병렬
- P27-05 export와 P27-06 Calendar는 서로 다른 state adapter를 사용하므로 병렬
- P27-08 recurrence와 P27-09 completion/reflection은 P27-02 이후 병렬

## Foundation / Correctness

### P27-01 [High, mandatory gate] 390/1024 current-vs-proposed interaction prototype 확정

- **문제:** production의 기능은 정확하지만 어떤 surface를 얼마나 줄일지 합의 없이 곧바로 코드화하면 P26 복잡성을 다른 layout으로 옮길 수 있다.
- **사용자 영향:** 핵심 route마다 action hierarchy가 다시 달라질 위험.
- **Route:** `/`, `/flows`, save-before, post-save, `/my`, `/calendar`, export
- **UX/UI 방향:** Home/Find, 저장 전, 저장 직후, My Flow, Calendar, item editor, export를 390/1024에서 current/proposed로 비교한다. 첫 시선, primary 1개, 기본 노출, 접힘, 제거 copy를 annotation한다.
- **데이터 영향:** 없음. P26 fixture와 current production state만 사용.
- **구현 범위:** docs/content-audit interactive prototype, 6개 journey state fixture, decision matrix.
- **비범위:** app/runtime 변경, new component, schema 변경.
- **선행 의존성:** 없음.
- **390/1024 검증:** 두 viewport에서 overflow 0, mobile bottom layers 2개 이하, wide는 rail/list/detail 또는 queue/grid의 실제 폭 표시.
- **접근성:** wireframe의 tab order, focus return, accessible name을 annotation.
- **Unit/E2E:** 없음. prototype browser interaction 및 screenshot comparison.
- **Evidence marker:** `P27-01-{surface}-{390|1024}-{current|proposed}.png`, `p27-01-decision.json`.
- **완료 기준:** owner가 각 화면별 Keep/Change/Remove를 선택할 수 있고 app 구현 slice가 ambiguity 없이 분리됨.

### P27-02 [High correctness] Calendar routine event와 공통 overlay 접근성 정리

- **문제:** routine Calendar event의 FullCalendar outer anchor가 이름 없이 focus tree에 남고 named button을 내부에 포함한다.
- **사용자 영향:** keyboard/screen reader가 빈 control을 만나거나 같은 occurrence를 두 번 탐색.
- **Route:** `/calendar`, `/my` overlay/sheet
- **UX/UI 방향:** event당 focusable control 하나. dialog/sheet는 open focus, trap, Escape close, trigger return을 공통화.
- **데이터 영향:** occurrence ID와 event key 읽기만 하며 변경 없음.
- **구현 범위:** Calendar event wrapper adapter, overlay primitive, aria/live feedback.
- **비범위:** recurrence expansion, calendar engine 교체.
- **선행 의존성:** P27-01.
- **390/1024 검증:** occurrence mobile/wide accessibility tree, bottom navigation과 overlay overlap 0.
- **접근성:** unnamed visible control 0, nested interactive 0, Enter/Space/click parity.
- **Unit/E2E:** event mount role/name unit; keyboard occurrence open/close/reopen E2E.
- **영향 파일:** `components/flow/AppClient.tsx`, responsive overlay primitive, Calendar targeted E2E.
- **Migration:** 없음.
- **Evidence marker:** `P27-02-a11y-tree.json`, `P27-02-occurrence-{390|1024}.png`.
- **완료 기준:** axe/name scan과 custom unnamed scan 0, occurrence completion/ICS identity regression 0.

## Core Journey / Information Architecture

### P27-03 [High] URL·메모 progressive composer와 first useful preview

- **문제:** URL miss 뒤 이름과 원하는 결과를 먼저 작성해 preview가 늦고, URL과 메모 진입을 별도로 학습해야 한다.
- **사용자 영향:** 사용자가 source를 붙이는 대신 제품의 Flow 구조를 먼저 설계하게 됨.
- **Route:** `/`, `/flows`
- **UX/UI 방향:** 한 composer에서 한 줄/여러 줄/URL을 감지한다. `찾은 source 범위 -> existing Flow 또는 분할 preview -> 필요한 확인` 순서. 표/강의계획은 별도 보조 action.
- **데이터 영향:** ephemeral `empty/typing/detecting/source_found/existing_flow/proposal/partial/import_required/error` UI state 추가. source, draft item, personal overlay persistence는 기존 계약 사용.
- **구현 범위:** composer shell, input-kind detector 연결, memo segmentation preview, existing lookup/miss handoff, retry/cancel.
- **비범위:** crawler, 실제 AI, fake source fill, account storage.
- **선행 의존성:** P27-01.
- **390/1024 검증:** mobile input -> preview 단일 열; wide source identity + preview 2열. 일반 memo preview 전 필수 입력 0~1.
- **접근성:** detect status live region, source result heading focus, error retry name.
- **Unit/E2E:** URL hit/miss/duplicate, newline memo, partial source, provider error, restore draft.
- **영향 파일:** `components/flow/AppClient.tsx` Home/FlowList/url-first surfaces, memo segmentation and URL lookup adapters.
- **Migration:** 없음; 기존 saved candidates/drafts read compatibility 유지.
- **Evidence marker:** `P27-03-composer-{390|1024}.png`, `P27-03-state-contract.json`.
- **완료 기준:** miss에서 가짜 item 0, useful preview 전 required input <=1, 한 화면 primary <=1, 기존 hit route/count parity.

### P27-04 [High] Structure와 batch를 task-specific contextual mode로 분리

- **문제:** add/reorder/select/date/export/remove가 한 mode에 함께 나타남.
- **사용자 영향:** 선택과 완료 control을 혼동하고 destructive operation 가능성이 증가.
- **Route:** `/my`, personal draft review
- **UX/UI 방향:** `항목 구성`은 add/reorder/delete/restore만, `여러 항목 처리`는 선택 후 date/include/export operation 하나만. operation 완료 또는 취소 시 execution mode로 복귀.
- **데이터 영향:** 기존 personal structural overlay와 schedule projection 사용. 임시 selection/operation state만 추가.
- **구현 범위:** contextual toolbar/sheet, drag handle + keyboard move, delete undo, batch preflight.
- **비범위:** rich text editor, arbitrary nesting, new item schema.
- **선행 의존성:** P27-01; P27-02 overlay primitive 권장.
- **390/1024 검증:** mobile sticky action 1개; wide list + operation side panel. 30-control baseline 대비 visible operation control 감소.
- **접근성:** reorder up/down accessible fallback, selection count announcement, destructive confirm/undo.
- **Unit/E2E:** add/delete/restore/reorder identity, batch date, include/exclude, selected export.
- **영향 파일:** `components/flow/AppClient.tsx`, `personal-structural-overlay.ts`, `personal-structural-projection.ts`, P26 structure tests.
- **Migration:** 없음.
- **Evidence marker:** `P27-04-structure-{390|1024}.png`, `P27-04-batch-{390|1024}.png`.
- **완료 기준:** selection 전 batch operation 0, 선택 후 primary 1, source item mutation 0, stable ID/order/export parity green.

## Calendar / Export

### P27-05 [High] Compact export scope sheet/panel

- **문제:** 정확한 scope 계약 위에 whole Flow와 format matrix를 반복해 2,000px 이상의 panel이 됨.
- **사용자 영향:** 전체/선택/현재와 destination별 제외 수를 실행 전에 빠르게 예측하기 어려움.
- **Route:** save-before, `/my`, item detail, `/calendar`
- **UX/UI 방향:** `범위 -> destination eligibility/count -> format -> receipt`. 기본 목록은 3줄 또는 count, 상세는 disclosure. mobile bottom sheet, wide context panel.
- **데이터 영향:** `FlowExportScopePlan`/`FlowExportResultReceipt`를 single source로 유지.
- **구현 범위:** shared export composer, preflight count, disabled reason, result receipt.
- **비범위:** OAuth, new format, xlsx schema rewrite.
- **선행 의존성:** P27-01; P27-02 overlay primitive.
- **390/1024 검증:** 390에서 한 viewport 안에 scope+eligible count+primary, 1024에서 detail을 가리지 않는 360~420px panel.
- **접근성:** sheet focus, format radio group, download/copy feedback live region.
- **Unit/E2E:** flow/selected/item; ICS dated-only; list undated include; preview/output count equality.
- **영향 파일:** `ArtifactWorkbench.tsx`, `AppClient.tsx`, `export-scope.ts`, export E2E.
- **Migration:** 없음.
- **Evidence marker:** `P27-05-export-{390|1024}.png`, downloaded output manifest.
- **완료 기준:** duplicate full-list default 0, scope label과 output filename/row/event count 일치, format 실행 전 결과 수 노출.

### P27-06 [Medium] Calendar adaptive undated queue와 Flow-scoped scheduling

- **문제:** wide narrow rail은 제목을 자르고 empty detail pane도 공간을 차지하며 mobile tray+grid가 길다.
- **사용자 영향:** 어떤 항목을 어디에 놓는지 확인과 결과 비교가 느림.
- **Route:** `/calendar`
- **UX/UI 방향:** `일정 배치` 진입 시 queue+grid, 일반 진입 시 grid+day detail. wide queue 280~320px와 full title; mobile queue bottom sheet. Flow filter는 queue/grid/day count에 동일 적용.
- **데이터 영향:** existing unscheduled tray, flow scope, atomic date move contracts 사용.
- **구현 범위:** adaptive composition state, selected queue row preview, batch target date, undo.
- **비범위:** new calendar engine, auto scheduling, external sync.
- **선행 의존성:** P27-01, P27-02; P27-04 selection pattern 재사용.
- **390/1024 검증:** 30자 title 식별, queue->grid->day result 최대 2 layer, empty pane 없음.
- **접근성:** queue/grid landmarks, date target name, drag와 동등한 keyboard move.
- **Unit/E2E:** dated/undated count, 3-item schedule, remove date, Flow scope, undo, same-date grouping.
- **영향 파일:** `AppClient.tsx`, `calendar-unscheduled-tray.ts`, `calendar-date-move.ts`, `calendar-flow-scope.ts`.
- **Migration:** 없음.
- **Evidence marker:** `P27-06-calendar-{390|1024}-{queue|day}.png`.
- **완료 기준:** title truncation으로 identity 확인이 막히는 row 0, filter/count parity, move/revert stable identity.

## Editing / Execution

### P27-07 [Medium] 저장 전·저장 직후·재방문 Flow hierarchy 통합

- **문제:** post-save receipt와 일반 My Flow detail이 다른 card sequence를 사용해 일회성 확인과 지속 실행이 분리돼 보임.
- **사용자 영향:** 저장 성공 뒤 어디에서 계속 쓰는지 재학습.
- **Route:** save-before, `/my?savedFlow=*`, `/my?savedMap=*`, bare `/my`
- **UX/UI 방향:** 저장 전 whole Flow grammar를 저장 후에도 유지한다. receipt는 compact band, 첫 action과 whole Flow는 일반 detail component를 사용. 재방문 때 band만 사라짐.
- **데이터 영향:** post-save receipt와 effective outline 그대로 사용.
- **구현 범위:** shared Flow header/outline, first-visit receipt band, next action placement.
- **비범위:** save route/record schema 변경, cloud persistence.
- **선행 의존성:** P27-01.
- **390/1024 검증:** mobile receipt + first items 한 viewport, wide source/summary/list hierarchy; refresh parity.
- **접근성:** save completion live region 후 Flow heading focus, route refresh focus policy.
- **Unit/E2E:** savedFlow/savedMap receipt count, refresh, excluded item, date range, bare return.
- **영향 파일:** `AppClient.tsx`, `post-save-receipt.ts`, `post-save-decision-hub.ts`, My Flow local IA tests.
- **Migration:** 없음.
- **Evidence marker:** `P27-07-post-save-{390|1024}.png`, `P27-07-returning-1024.png`.
- **완료 기준:** receipt total=rendered outline, 중복 success 설명 0, 저장 후 primary 1.

### P27-08 [Medium] Series/occurrence 실행 detail 간소화

- **문제:** 회차 실행, 메모, series 설정, export가 가까이 있어 occurrence의 한 행동이 약함.
- **사용자 영향:** 현재 회차와 전체 반복 설정을 혼동할 가능성.
- **Route:** `/my`, `/calendar`, recurring public Flow
- **UX/UI 방향:** series card는 cadence/next occurrence/edit series, occurrence card는 complete/reopen + current memo. export는 secondary action에서 scope를 명시.
- **데이터 영향:** series ID/revision/occurrence ID와 execution state 유지.
- **구현 범위:** distinct row anatomy, occurrence detail, series setting entry, current-vs-series export label.
- **비범위:** recurrence parser/expansion rewrite.
- **선행 의존성:** P27-02, P27-05.
- **390/1024 검증:** mobile occurrence primary가 first viewport, wide selected occurrence context.
- **접근성:** one occurrence one completion control, current/all recurrence dialog labels.
- **Unit/E2E:** complete/reopen one occurrence, next occurrence, visible count vs RRULE series count, ICS UID.
- **영향 파일:** `AppClient.tsx`, `ArtifactWorkbench.tsx`, `saved-routine-occurrence.ts`, recurrence E2E.
- **Migration:** 없음.
- **Evidence marker:** `P27-08-series.png`, `P27-08-occurrence-{390|1024}.png`.
- **완료 기준:** definition completion control 0, occurrence completion control 1, series/current scope가 실행 전 표시.

### P27-09 [Medium] 완료 후 reflection·correction·reuse progressive disclosure

- **문제:** 완료 직후 회고, source correction, export, reuse가 모두 기본 노출.
- **사용자 영향:** 실행의 끝이 흐려지고 개인 회고와 원문 보정을 혼동.
- **Route:** `/my` completed Flow/item
- **UX/UI 방향:** `완료 summary -> 한 줄 회고 -> 다시 쓰기` 기본. export는 menu, source correction은 분리된 disclosure와 ownership label.
- **데이터 영향:** execution/reflection/correction/reuse key 분리 유지.
- **구현 범위:** completion state panel, collapsed secondary actions, reopen/reuse entry.
- **비범위:** journaling product, analytics dashboard.
- **선행 의존성:** P27-01; P27-02 overlay primitive.
- **390/1024 검증:** complete summary와 reflection input 한 viewport, wide textarea max width.
- **접근성:** completion announcement, reopen at same row, reflection label, correction warning association.
- **Unit/E2E:** complete all, reopen, save reflection, correction isolation, reuse anchor policy.
- **영향 파일:** `AppClient.tsx`, run/reflection/reuse helpers and tests.
- **Migration:** 없음.
- **Evidence marker:** `P27-09-complete-{390|1024}.png`.
- **완료 기준:** 기본 expanded secondary section <=1, reflection/correction cross-write 0, reuse preview count/date parity.

## Visual System / Responsive

### P27-10 [Medium] Adaptive wide My Flow, 같은 날짜 목록, 공통 compact execution row

- **문제:** 단일 Flow에서도 inventory/search chrome이 유지되고, 같은 날짜의 여러 Flow 항목은 primary continuation과 별도 Today list로 갈라지며, surface마다 row anatomy와 chip density가 다름.
- **사용자 영향:** wide가 작업 공간보다 긴 mobile page처럼 보이고 오늘 전체 작업량을 한 scan sequence로 읽기 어려움.
- **Route:** Home, `/flows`, `/my`, `/calendar`
- **UX/UI 방향:** common row anatomy; Today는 날짜별 compact list에서 첫 행만 `다음 실행` 강조. 1024 My Flow는 optional Flow rail + execution list + detail peek. 1 Flow면 rail 접기. chips는 상태 1 + source 1 상한.
- **데이터 영향:** 없음. projection identity를 display props로만 사용.
- **구현 범위:** row/header/marker primitives, responsive grid, spacing/type/color tokens, snackbar slot.
- **비범위:** brand redesign, new navigation tab.
- **선행 의존성:** P27-03~09의 화면 hierarchy 확정.
- **390/1024 검증:** 1/2/5 Flow, long title, same-date multiple Flow; wide content max/rail bounds.
- **접근성:** 44px targets, visible focus, status not color-only, reduced-motion safe.
- **Unit/E2E:** 1/2/5 Flow component states, 두 Flow 같은 날짜 count/rows/markers, visual snapshots, navigation/focus.
- **영향 파일:** `AppClient.tsx`, shared UI classes/components, responsive workspace helper.
- **Migration:** 없음.
- **Evidence marker:** `P27-10-row-anatomy.png`, `P27-10-my-flow-{390|1024}.png`.
- **완료 기준:** same item marker/title/timing order across 4 surfaces, 같은 날짜 count와 visible row 수 일치, horizontal overflow/fixed overlap 0.

## Integration / Final Review

### P27-11 [High gate] State·projection·identity regression pack

- **문제:** presentation을 줄이는 과정에서 hidden item, undated eligibility, occurrence identity, export count를 잃을 수 있음.
- **사용자 영향:** 더 단순해 보이지만 저장·Calendar·export 결과가 달라지는 치명적 회귀.
- **Route:** 전체 핵심 route
- **UX/UI 방향:** UI의 count와 action은 canonical projection/plan 결과만 소비.
- **데이터 영향:** migration 없음. source/overlay/run/occurrence/export identity matrix를 golden fixture로 고정.
- **구현 범위:** unit + targeted/full E2E, a11y scan, output manifest, localStorage migration compatibility.
- **비범위:** 새 기능.
- **선행 의존성:** 각 feature slice와 병렬 작성, P27-12 전 필수.
- **390/1024 검증:** 6 journey exact accounting, overflow/error/name/focus.
- **접근성:** keyboard-only all primary journeys; axe/custom scans.
- **Unit/E2E:** full unit, build, targeted/full E2E, export file parse.
- **영향 파일:** flow libs tests, `tests/e2e/p27-*`.
- **Migration:** 기존 P26 projection migration fixture만 재검증.
- **Evidence marker:** `P27-11-test-accounting.json`, `P27-11-output-manifest.json`.
- **완료 기준:** identity/count mismatch 0, source mutation 0, unnamed control 0, all gates green.

### P27-12 [Integration] 6개 journey final review와 production closeout

- **문제:** 개별 개선이 전체 portable execution journey에서 서로 충돌할 수 있음.
- **사용자 영향:** 발견은 단순해졌지만 Calendar/export/reuse가 다시 분절될 위험.
- **Route:** 여섯 journey 전체
- **UX/UI 방향:** 발견 -> 이해 -> start/adjust -> receipt -> whole Flow -> edit -> execute/reopen -> Calendar -> export -> reflection -> reuse를 한 harness로 재검증.
- **데이터 영향:** 없음.
- **구현 범위:** clean origin/main verification, production-like local run, deploy 후 production smoke package.
- **비범위:** 사용자 관찰 주장, P28 기능.
- **선행 의존성:** P27-02~11 완료.
- **390/1024 검증:** 각 핵심 state screenshot, mobile/wide comparison board.
- **접근성:** full keyboard path and accessible-name accounting.
- **Unit/E2E:** docs:check, unit, build, targeted/full E2E, production smoke.
- **Evidence marker:** `p27-final-review-package/`, `journey-results.json`, `screenshots/`.
- **완료 기준:** Blocking/High automated finding 0, accepted Medium 명시, observed-user count 실제 값 유지, rollback/release boundary 기록.

## 실제 구현 전 비교 prototype이 반드시 필요한 화면

1. `/flows` unified composer: URL hit / miss / memo proposal
2. mobile structure vs batch mode
3. mobile/wide compact export
4. wide Calendar queue+grid vs grid+day detail
5. mobile post-save receipt + whole Flow
6. wide single-Flow vs multi-Flow My Flow
7. recurring series card vs occurrence detail
8. completed Flow reflection/reuse state

## P27 final review 조건

- 6개 journey가 390/1024에서 모두 실행됨
- overflow, fixed overlap, console/page error, unnamed visible control `0`
- first screen primary action `<=1`
- general memo useful preview 전 required input `<=1`
- structure/batch에서 current operation 외 control 기본 숨김
- export preview count와 file row/event count 일치
- source/personal/run/occurrence/export stable identity 불변
- docs:check, unit, build, targeted/full E2E 통과
- automated evidence와 observed-user evidence를 구분

## P28로 넘길 항목

- account/database/cloud sync
- external Calendar/Notion/Todo/Sheets OAuth
- real URL extraction and AI provider
- creator publish/update workflow
- marketplace, social proof, ratings, payment
- collaboration and cross-device conflict resolution

## 실제 사용자 확인 전 내부에서 닫을 항목

- unnamed routine Calendar control
- mobile structure/batch control density
- export scope panel 중복 목록
- wide undated title truncation과 empty pane
- post-save/returning component grammar
- completion/reflection/correction ownership hierarchy
