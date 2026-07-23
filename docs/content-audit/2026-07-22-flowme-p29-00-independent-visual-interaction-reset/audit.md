# FlowMe P29-00 독립 검토: Visual & Interaction Reset 결정

## 1. 실행 정보

- reviewer 역할: Codex, 독립 product UX·technical reviewer
- 확인한 production URL: <https://flowme2605.vercel.app>
- 확인한 GitHub SHA: `origin/main` `16c380a6a0550f1eafdb6189b0ab56f9358d912d`
- production/P28 기준 SHA: `ec97ff5effd6229c062528f6eb4f6d3f6d7fdc41`
- 사용한 viewport: `390x844`, `1024x768`, `1440x900`
- 직접 조작한 route:
  - `/f/moving-d30-basic`
  - `/f/curated-allblanc-morning-workout`
  - `/my?demo=ux20&view=flows`
  - `/calendar?demo=ux12`
  - `/f/used-car-buying-check`
  - `/f/source-backed-middle-school-math-1`
  - `/f/overseas-safety-register`
  - 연속 여정 `/flows -> /f -> /my -> /calendar`
- 캡처 결과: 64 states / 64 screenshots / 0 scripted failures
- 기계 점검: horizontal overflow 0, unnamed focusable 0, console error 0, page error 0
- observed-user count: 0
- 검토 성격: current production interaction + current source + official reference pattern + heuristic simulation
- 앱 코드 수정: false

자동 조작과 heuristic simulation은 실제 사용자 관찰이 아니다. 캡처 성공과 오류 0은 화면이 사용하기 쉽다는 증거가 아니라, 검토한 상태에서 기능 차단과 명백한 렌더 오류를 찾지 못했다는 제한된 evidence다.

## 2. 전체 판정

- 선택: `coordinated_surface_reset`
- 확신도: 5/5
- 한 문장 근거: P28의 데이터·projection 계약은 안정적이지만 save-before, receipt, routine, My Flow, Calendar, result choice가 서로 다른 카드·설정·명령 문법을 사용하여, token polish만으로는 첫 시선·진행 단계·포커스 순서를 바로잡을 수 없다.
- Blocking finding: 0
- P28에서 반드시 유지할 계약:
  - source, personal overlay, execution run, recurrence occurrence, export identity 분리
  - `FlowExperienceProjection`과 whole-flow/routine derived view model
  - 날짜 없는 일은 유효하며 My Flow에서 실행하고 Calendar에서 배치
  - 완료, reopen, skip, hold, personal exclusion, archive의 의미 분리
  - 콘텐츠별 primary artifact와 제한된 secondary artifact
  - 4탭 IA와 public `/f` shell
  - save-before, saved receipt, returning execution을 별도 frame으로 유지
  - persistence schema와 source-backed seed는 visual reset 때문에 변경하지 않음

### 판정의 의미

`Coordinated surface reset`은 화면을 다시 칠하는 작업이 아니다. 같은 Flow identity와 P28 projection을 그대로 사용하면서 다음 다섯 surface의 composition과 command placement를 하나의 문법으로 맞추는 작업이다.

1. Save-before: 전체 결과와 저장 단위를 먼저 확인한다.
2. Routine setup: 현재 설정을 한 줄로 읽고 필요한 부분만 연다.
3. Saved receipt: 저장 전 화면을 재사용하지 않고 저장된 객체와 다음 행동을 확인한다.
4. My Flow: Flow 찾기, 다음 행동, 전체 계획, 조정을 구분한다.
5. Calendar/result choice: 범위와 손실을 행동 전에 예측한다.

Full rewrite는 기각한다. 현재 문제를 고치기 위해 planner 수준 IA나 데이터 모델을 다시 만들 필요가 없고, 오히려 P28에서 검증한 stable identity를 훼손할 위험이 크다.

## 3. Findings

Blocking finding은 없다. 아래는 severity 순 findings다.

| Severity | Surface / route | 재현 단계 | 기대 | 실제 | 사용자 영향 | Evidence kind | 권장 조치 | Acceptance marker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| High | Save-before `/f/moving-d30-basic`, `/f/source-backed-middle-school-math-1`, `/f/overseas-safety-register` / 390·1024 | route 진입 후 첫 viewport와 전체 Flow를 스캔 | source, 저장 단위, primary artifact, 범위를 한 번에 이해 | 5개 outline과 artifact 결과가 같은 항목을 반복하고, source-backed math는 기존 workbench까지 이어져 모바일 3.83 viewport 높이와 23개 bordered surface가 됨 | 무엇이 실제 저장 결과인지 판단하려고 반복 읽기·스크롤 | `current_production_interaction`, `current_package_screenshot`, `current_source` | primary artifact를 첫 결과로 올리고 outline은 한 번만 표시. row별 수정은 adjust mode에서만 노출 | `p29-01-moving-save-before-{390,1024}.png`; 첫 viewport에 title/source/count/primary result/1 primary CTA, 중복 row 0 |
| High | First-save receipt `/f/moving-d30-basic` / 390 | 날짜 설정 후 저장 | 저장된 이름·항목·날짜와 다음 행동을 별도 receipt frame에서 확인 | 저장 전의 긴 화면에 `저장됨` 상태와 `내 Flow에서 보기`만 바뀜 | 저장 성공과 저장된 artifact를 확인하기 어렵고 다시 편집 중인지 혼동 | `current_production_interaction`, `current_package_screenshot`, `current_source` | `SavedReceiptFrame`을 별도 composition으로 만들고 저장 요약, 다음 행동, 전체 Flow disclosure만 노출 | `p29-01-moving-receipt-390.png`; save-before control 0, receipt heading 1, next action 1 |
| High | Mobile keyboard order `/f/*`, `/my`, `/calendar` / 390 | 페이지 최상단에서 Tab 반복 | 시각 순서대로 header -> content -> contextual command -> persistent nav | public은 하단 고정 저장 CTA와 `조정`이 header보다 먼저, My Flow/Calendar는 하단 nav가 main content보다 먼저 포커스됨 | 키보드·스위치 사용자가 문맥 없이 하단 command로 이동 | `current_production_interaction`, `current_source` | DOM order를 시각 order와 일치시키고 fixed UI는 문서 뒤에 배치. focus restore와 skip target 고정 | `p29-a11y-focus-order.spec.ts`; 첫 8개 focus sequence snapshot이 header/main/command/nav 순서 |
| High | Routine setup `/f/curated-allblanc-morning-workout` / 390·1024 | 주 N회·시간·종료 조건 조정 | 현재 routine 한 줄 요약을 보고 바꿀 부분만 연다 | 요일, 주기, 시간 mode, 시각, duration, 종료 mode, 날짜·횟수가 한 번에 펼쳐짐. 조정·resource·저장까지 9 click depth | 1개 운동 Flow보다 설정 UI가 더 복잡하게 보임 | `current_production_interaction`, `current_package_screenshot`, `current_source` | `월·수·금 · 07:30 · 45분 · 8회` summary + `일정 조정` sheet. 종료 조건·duration은 선택한 mode에서만 노출 | `p29-03-routine-{390,1024}.png`; 초기 visible routine controls 1 summary + 1 action, advanced fields 0 |
| High | My Flow library `/my?demo=ux20&view=flows` / 390 | 27개 중 특정 Flow 찾기, 열기, export 찾기 | row 전체가 열기이고 다음 행동이 우선, export는 detail/context menu | 8개 큰 card 후 19개 더 보기, card마다 `가져가기`; 열기는 card click에 암시됨. 초기 문서 3.29 viewport | 라이브러리 스캔보다 export command가 반복되고 Flow 진입 affordance가 약함 | `current_production_interaction`, `current_package_screenshot`, `current_source` | compact Flow row, 명시적 chevron/accessible open name, next-action metadata. export는 detail 또는 overflow로 이동 | `p29-04-my-flow-library-390.png`; 8행 이상/viewport, row당 visible command 최대 1 |
| High | Result choice `/f/used-car-buying-check`, math, safety / 390·1024 | primary·secondary artifact 전환 | 추천 이유, 범위, 다른 형태로 바꿀 때 손실을 선택 전에 예측 | 실제 데이터·eligibility와 count는 맞지만 추천 이유와 loss summary가 없음. 일부 source-backed 화면은 새 preview와 옛 workbench를 중복 노출 | Calendar/Checklist/Sheet/Memo 중 무엇을 가져가야 하는지 label만 보고 추론 | `current_production_interaction`, `current_package_screenshot`, `current_source`, `heuristic_simulation` | persistence 변경 없이 derived `ArtifactRecommendationVM`에 reason/delta/loss를 추가. 최대 primary 1 + secondary 2 | `p29-06-result-choice-390.png`; primary reason 1, secondary delta/loss 1씩, disabled shape 0 |
| High | Cross-surface continuity `/f -> /my -> /calendar` / 390·1024 | moving Flow 저장 후 My Flow와 Calendar에서 재개 | 동일 title/source/count/state와 일관된 `조정/열기/완료/가져가기` 문법 | 데이터 identity는 이어지지만 save-before·receipt·My Flow·Calendar의 header, command 위치, state feedback가 각각 다름 | 같은 객체를 계속 쓰는 느낌보다 서로 다른 도구를 오가는 느낌 | `current_production_interaction`, `current_package_screenshot`, `current_source` | shared identity strip, state line, contextual command bar를 공통 anatomy로 정의하되 frame 역할은 분리 | `p29-continuity-map.json`; 네 surface의 stable id/title/source marker 일치, command vocabulary snapshot |
| Medium | Calendar scope `/calendar?demo=ux12` / 390·1024 | scope picker 열기, 검색, 2개 선택, 적용 | 현재 선택과 최근/활성 Flow를 빠르게 좁힘 | dialog·검색·multi-select는 작동하지만 12개를 같은 무게로 나열. initial first viewport interactive 40개, wide 49개 | scope 선택이 Calendar 읽기보다 앞선 관리 과업으로 커짐 | `current_production_interaction`, `current_package_screenshot`, `current_source` | top scope summary + 최근/활성 grouping, 전체 목록은 dialog 내부. selected-day command와 분리 | `p29-05-calendar-scope-{390,1024}.png`; 닫힌 상태 scope command 1, dialog active/recent section |
| Medium | Undated tray `/calendar?demo=ux12` / 390 | tray 열기, item 선택, 날짜 배치 | 날짜 없는 일이 유효하다는 이유와 선택 결과를 보며 batch placement | 배치·undo는 작동하지만 확장 tray가 15개 item과 controls를 길게 노출해 Calendar를 아래로 밀어냄 | Calendar 맥락을 잃은 채 별도 todo list처럼 느껴짐 | `current_production_interaction`, `current_package_screenshot`, `current_source` | 모바일 bottom sheet에서 count, 선택 summary, date command를 고정하고 목록은 내부 scroll. 닫힌 상태는 count action만 | `p29-05-undated-placement-390.png`; page scroll 변화 0, sheet internal scroll, focus return |
| Medium | Wide composition `/my`, `/calendar`, public `/f` / 1024·1440 | wide 화면 스캔 | rail/context pane이 고유 역할을 가지며 작업 밀도를 높임 | My Flow는 rail-detail이 있으나 border/label이 많고, public·Calendar는 모바일 stack을 넓힌 인상이 남음 | 넓은 화면의 비교·선택 이점이 약하고 빈 공간과 장식 surface가 공존 | `current_package_screenshot`, `heuristic_simulation`, `current_source` | fixed rail width + flexible primary canvas + contextual inspector. section band와 divider를 card stack보다 우선 | `p29-wide-{save-before,my-flow,calendar}-1024.png`; 각 column 역할 label, nested card 0 |
| Medium | Completion/reopen and occurrence `/my`, `/calendar` / 390·1024 | 한 item 완료, 즉시 undo, My Flow에서 reopen, Calendar 확인 | run/occurrence가 유지되고 같은 위치에서 완료·재개 | 즉시 undo와 My Flow reopen은 작동. Calendar에서는 occurrence와 series 문맥이 row 안에서 약하게 표시됨 | 반복 Flow에서 한 회차 완료인지 series 변경인지 재확인이 필요 | `current_production_interaction`, `current_source` | completion control은 유지하고 occurrence label·series link만 anatomy에 추가. 상태 계약은 변경하지 않음 | `p29-03-occurrence-state.png`; occurrence id/state test, series mutation 0 |
| Low | Visual tokens and surface repetition / all / 390·1024·1440 | screenshots 비교 | hierarchy가 typography, spacing, divider, state color로 읽힘 | 토큰은 일관되지만 rounded border, chip, pale action-blue surface가 반복되어 정보 종류보다 container가 먼저 보임 | 상용 제품 대비 문서·카드 묶음 인상 | `current_package_screenshot`, `current_source`, `reference_pattern` | composition 이후 radius·border·type scale·density를 정리. 상태색은 semantic 용도로 제한 | `p29-07-visual-regression`; surface count/contrast/focus snapshot |

### 유지해야 할 positive evidence

- 다섯 결과 형태가 실제 데이터로 렌더되고 eligibility가 콘텐츠별로 달랐다.
- moving은 Calendar 24 + Checklist 24, used-car는 Checklist, math는 Sheet + Checklist, safety는 Memo + Checklist로 나타났다.
- 64개 캡처 상태에서 가로 overflow, console/page error, 이름 없는 focusable은 발견되지 않았다.
- Calendar scope 검색·다중 선택, 날짜 없는 항목 배치·undo, My Flow 완료·reopen이 작동했다.
- wide My Flow의 rail-detail 구조는 전면 폐기 대상이 아니라 밀도·명령 위계를 조정할 기반이다.

## 4. Persona journey 판정

| Persona | 발견 | 저장 전 확인 | 조정 | 저장 | 실행·완료 취소 | Calendar | 결과 가져가기 | 전체 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 이사 Flow 첫 사용자 | clear | friction | friction | friction | clear | clear | friction | friction |
| 홈트 반복 Flow 사용자 | clear | friction | friction | friction | clear | clear | friction | friction |
| 27개 Flow 재방문 사용자 | friction | not_tested | friction | not_tested | clear | clear | friction | friction |
| 12개 Flow Calendar 사용자 | not_tested | not_tested | clear | not_tested | clear | friction | not_tested | friction |
| 결과 형태를 고르는 기존 도구 사용자 | clear | friction | friction | friction | not_tested | not_tested | friction | friction |
| `/flows -> /f -> /my -> /calendar` 연속 사용자 | clear | friction | friction | friction | clear | clear | friction | friction |

`blocked` 여정은 없었다. `clear` 전체 판정도 없다. P28 기능 지원 여부와 P29 hierarchy 품질은 분리해서 봐야 한다.

## 5. Current vs proposed

### 5.1 Save-before

**Current hierarchy**

`Flow identity -> schedule intent -> 5개 outline + row별 수정 -> 전체 펼치기 -> artifact shape buttons -> primary result -> setup/action -> old detailed workbench`

**유지할 요소**

- title, source URL, source status
- 전체 item 수와 date/undated 범위
- 실제 데이터 기반 primary/secondary artifact
- 개인 title/date/item overlay
- `전체 Flow 보기` disclosure

**제거하거나 낮출 요소**

- 기본 상태의 row별 `수정`
- 같은 item을 outline과 artifact에서 연속 반복
- 새 preview 아래의 옛 5-tab workbench
- primary action과 경쟁하는 shape/action chip

**Proposed hierarchy**

`Flow identity -> primary artifact preview -> 범위/손실 summary -> 최소 개인화 -> 전체 Flow disclosure -> contextual command bar`

390px wireframe:

```text
┌ FLOW / 출처 확인됨 ──────────────┐
│ 이사 D-30 준비             24개 │
│ AJD 원문 · 기준일 역산형        │
├ 추천 결과: Calendar ────────────┤
│ 7/2  이사 방식 정하기           │
│ 7/18 입주청소 확인              │
│ 8/1  이사 당일                  │
│ 24개 일정 · 날짜 없는 일 0      │
│ [전체 Flow 보기]                │
├ 내 상황 ───────────────────────┤
│ 이사일  2026.08.01       [조정] │
└─────────────────────────────────┘
┌ sticky command bar ─────────────┐
│ [내 Flow에 저장]        [•••]   │
└─────────────────────────────────┘
```

1024/1440px wireframe:

```text
┌ identity + source + count ─────────────────────────────────────┐
├ primary artifact canvas 65% ───────────┬ context inspector 35% ┤
│ Calendar / Sheet / Memo actual preview │ 이 Flow가 맞는 이유   │
│ full scope and representative rows     │ 최소 입력             │
│                                        │ secondary result       │
│                                        │ [조정] [저장]          │
├────────────────────────────────────────┴────────────────────────┤
│ 전체 Flow outline (한 번만, section disclosure)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Keyboard/focus 변화**

- header와 source link가 fixed CTA보다 먼저 포커스된다.
- `전체 Flow 보기` 다음에 outline, 이후 contextual command로 이동한다.
- adjust sheet를 닫으면 열었던 `조정`으로 focus를 돌린다.

**CSS/token만으로 가능한 부분**

- divider, type scale, spacing, result canvas background, semantic state color

**Component/state composition 필요**

- `FlowSaveBeforeFrame` 순서 재구성
- `FlowArtifactDataPreview`를 first-class canvas로 승격
- row edit를 `adjustMode` 안으로 이동
- public fixed CTA DOM order 수정
- source-backed old workbench 중복 제거

### 5.2 Routine setup

**Current hierarchy**

`Flow identity -> one-item outline -> weekday/frequency/time/duration/end controls all expanded -> occurrence preview -> resource -> save`

**유지할 요소**

- effective routine projection
- series와 occurrence identity
- resource link
- 종료 날짜/횟수 정책

**제거하거나 낮출 요소**

- 첫 화면의 전체 weekday/time/end form
- 설정 설명을 반복하는 chip과 paragraph
- resource와 schedule command의 같은 시각적 무게

**Proposed hierarchy**

`Routine identity -> one-line schedule summary -> next 3 occurrences -> resource -> adjust sheet -> save`

390px wireframe:

```text
┌ 아침 전신 운동 · 1개 동작 ─────┐
│ 영상 15분 · 원문 보기           │
├ 반복 계획 ─────────────────────┤
│ 월·수·금 · 07:30 · 45분 · 8회  │
│ 다음: 7/22, 7/24, 7/27   [조정]│
├ 실행할 내용 ───────────────────┤
│ □ 영상 따라 전신 운동 완료     │
└─────────────────────────────────┘
[이 계획으로 저장]

조정 sheet:
요일/횟수 -> 시간 -> 종료 조건
선택한 mode의 필드만 표시
```

1024/1440px wireframe:

```text
┌ routine summary / next occurrences ─────┬ resource / adjust ┐
│ series timeline                         │ 영상 원문          │
│ one execution item                      │ [일정 조정]        │
└─────────────────────────────────────────┴────────────────────┘
```

**Keyboard/focus 변화**

- 첫 tab stop은 schedule summary의 `일정 조정` 하나다.
- sheet 안에서 focus trap과 close restore를 유지한다.
- radio 선택으로 생긴 conditional field에 heading/description을 연결한다.

**CSS/token만으로 가능한 부분**

- summary row density, occurrence timeline style

**Component/state composition 필요**

- `RoutineScheduleEditor` compact/expanded mode
- mode별 conditional field
- resource를 routine 설정과 분리

### 5.3 My Flow

**Current hierarchy**

- mobile: tabs -> search/filter -> 8 large cards + repeated export -> 19 more
- wide: library rail -> whole-flow outline -> detail/next action -> export/archive

**유지할 요소**

- `지금 / 내 Flow / 완료` 구분
- mobile drill-in, wide rail-detail
- whole-flow section/reading projection
- complete/reopen, archive/restore, batch edit

**제거하거나 낮출 요소**

- library row마다 반복되는 `가져가기`
- card 안 card와 count chip 반복
- library와 detail에서 같은 metadata 중복
- implicit open action

**Proposed hierarchy**

- mobile: compact library rows -> Flow detail -> next action -> whole plan -> contextual commands
- wide: 280px library rail -> flexible plan canvas -> 320px item/context inspector

390px wireframe:

```text
내 Flow 27                         🔍
[지금] [내 Flow] [완료]
──────────────────────────────────
이사 D-30 준비                 ›
다음 7/22 · 24개 · 0/24
──────────────────────────────────
아침 전신 운동                ›
다음 오늘 07:30 · 1/8회
──────────────────────────────────
차량 점검                     ›
날짜 없음 · 10개

Flow detail:
이사 D-30 준비 · 원문
[다음 할 일 열기]
전체 계획 24개
□ 7/2 이사 방식 정하기
...
[조정] [가져가기] [•••]
```

1024/1440px wireframe:

```text
┌ library 280 ─────┬ plan canvas flex ─────────┬ context 320 ┐
│ search + filter  │ title/source/progress     │ next item   │
│ compact rows     │ grouped execution rows   │ notes       │
│ no export repeat │ one batch toolbar        │ commands    │
└──────────────────┴───────────────────────────┴──────────────┘
```

**Keyboard/focus 변화**

- top nav -> view tabs -> search -> list rows -> detail 순서다.
- bottom nav는 main content 뒤에 둔다.
- row 전체는 하나의 accessible link/button이고 내부 중첩 button을 만들지 않는다.

**CSS/token만으로 가능한 부분**

- compact row height, divider, selected state, rail width

**Component/state composition 필요**

- mobile library card를 row anatomy로 교체
- export/archive를 detail/overflow로 이동
- shared item inspector와 command bar 적용

### 5.4 Calendar

**Current hierarchy**

- mobile: selected day -> scope trigger -> month grid -> undated tray
- wide: scope/undated region -> month grid -> selected day
- scope dialog에서 12개를 검색·다중 선택

**유지할 요소**

- selected-day agenda
- searchable multi-select scope
- undated selection/date placement/undo
- Flow color/identity와 occurrence projection

**제거하거나 낮출 요소**

- 닫힌 화면의 반복 scope label
- 12개 전체를 같은 우선순위로 노출
- expanded undated list가 page flow를 늘리는 구조

**Proposed hierarchy**

- mobile: selected day agenda -> compact scope summary -> month grid -> undated count action/bottom sheet
- wide: Flow scope rail -> calendar canvas -> selected-day inspector

390px wireframe:

```text
7월 22일 · 오늘
□ 이사 방식 정하기        이사 ›
□ 아침 전신 운동          홈트 ›
────────────────────────────────
보는 Flow 2개             [변경]
‹ 2026년 7월 ›
┌ 월 화 수 목 금 토 일 ┐
│ ... calendar grid ... │
└───────────────────────┘
[날짜 없는 일 15개 배치]

bottom sheet:
3개 선택 · 7/25에 배치
internal scroll item list
```

1024/1440px wireframe:

```text
┌ scope rail 240 ─┬ calendar canvas flex ──────┬ day 300 ┐
│ active/recent   │ month/week                 │ agenda  │
│ undated count   │ selected Flow colors       │ move    │
│ all in dialog   │                            │ open    │
└─────────────────┴────────────────────────────┴─────────┘
```

**Keyboard/focus 변화**

- scope dialog는 기존 trap/return을 유지한다.
- month navigation -> grid -> selected day agenda -> undated command 순서를 명시한다.
- bottom sheet 닫기 후 `날짜 없는 일 N개 배치`로 돌아간다.

**CSS/token만으로 가능한 부분**

- event density, Flow color marker, selected day contrast

**Component/state composition 필요**

- `CalendarFlowScopePicker` recent/active grouping
- `CalendarUnscheduledTray` mobile sheet/internal scroll
- wide rail/calendar/day inspector composition

### 5.5 Result choice and receipt

**Current hierarchy**

`shape buttons with count -> selected actual-data preview -> details/export -> save state on same page`

**유지할 요소**

- content-specific eligibility
- 실제 item/date/resource 데이터
- primary 1 + secondary 최대 2
- export scope와 stable identity

**제거하거나 낮출 요소**

- 이유 없이 shape 이름/count만 나열
- 지원하지 않는 projection을 기대하게 하는 공통 5-tab 문법
- save-before와 receipt의 시각적 동일성

**Proposed hierarchy**

`recommended result + reason -> representative actual rows -> secondary result + delta/loss -> action-specific receipt`

390px wireframe:

```text
추천: 실행표 8행
주차와 순서를 한눈에 관리하기 좋아요.
1주차 | 수와 연산 | 미완료
2주차 | 문자와 식 | 미완료
[14주 진도표로 시작]

함께 쓰기
체크리스트 8개
주차 열과 현재 위치는 빠져요.      [보기]

저장 후:
저장됨 · 중1 수학 8개
실행표 기준 · source 유지
[내 Flow에서 열기]
[TSV 받기]
```

1024/1440px wireframe:

```text
┌ recommended artifact canvas 70% ─┬ choice inspector 30% ┐
│ actual data + scope              │ why / what changes   │
│                                  │ secondary max 2      │
│                                  │ save/export command  │
└──────────────────────────────────┴───────────────────────┘
```

**Keyboard/focus 변화**

- primary artifact -> secondary choices -> action 순으로 이동한다.
- shape button의 accessible name에 count와 결과 차이를 포함한다.

**CSS/token만으로 가능한 부분**

- selected artifact emphasis, receipt tone

**Component/state composition 필요**

- derived reason/loss presentation
- distinct saved/export receipt
- legacy workbench 중복 제거

## 6. 대안 비교

| 대안 | 사용자 가치 | 시각적 체감 변화 | 구현 위험 | 계약 회귀 위험 | 모바일 적합성 | 권장 여부 |
| --- | --- | --- | --- | --- | --- | --- |
| A. Incremental polish | 낮음. hierarchy 문제 유지 | 중하 | 낮음 | 매우 낮음 | 낮음 | 기각, 56/100 |
| B. Coordinated surface reset | 높음. 핵심 여정 문법 통일 | 높음 | 중간, slice로 통제 가능 | 낮음, projection/persistence 유지 | 높음 | **권장, 95/100** |
| C. Full product rewrite | 불확실. 범위 과다 | 매우 높음 | 매우 높음 | 매우 높음 | 불확실 | 기각, 63/100 |

### 왜 A가 아닌가

타입, 색, spacing을 바꿔도 다음은 남는다: 중복된 outline/result, receipt frame 부재, routine 전체 폼, mobile DOM focus order, My Flow 반복 export, Calendar scope 관리 과부하. 이 문제들은 component order와 interaction state의 문제다.

### 왜 C가 아닌가

P28에서 실제로 작동한 stable projection, routine occurrence, completion/reopen, undated placement, artifact eligibility를 폐기할 근거가 없다. planner rewrite는 FlowMe의 portable execution layer 범위를 벗어난다.

## 7. P29 실행 제안

- P29-00에서 승인할 설계: `Artifact-first frame + contextual adjustment + distinct receipt + action-first returning surfaces`
- 첫 vertical slice: **P29-01 `/f/moving-d30-basic` save-before -> saved receipt**
- 선행 dependency: P28 production baseline 고정, shared anatomy의 prop/VM contract 테스트
- 함께 하면 안 되는 범위: persistence migration, 4탭 IA 변경, seed 수정, account/DB, AI/crawler, OAuth, My Flow 전체 rewrite
- rollback 경계: route-level opt-in 또는 frame version prop로 기존 frame 보존. localStorage schema와 projection output은 동일하게 유지
- acceptance screenshot:
  - `p29-01-moving-save-before-390.png`
  - `p29-01-moving-save-before-1024.png`
  - `p29-01-moving-adjust-390.png`
  - `p29-01-moving-receipt-390.png`
  - `p29-01-moving-receipt-1024.png`
- unit/E2E marker:
  - `P29-SAVE-BEFORE-PRIMARY-RESULT`
  - `P29-SAVED-RECEIPT-DISTINCT`
  - `P29-MOBILE-FOCUS-ORDER`
  - 기존 P28 projection/identity assertions 그대로 통과

### Continuity map

| Frame | 사용자의 질문 | 표시할 stable identity | 주 행동 | 보조 행동 | 저장 상태 |
| --- | --- | --- | --- | --- | --- |
| Save-before | 무엇이 저장되나? | title, source, item count, primary artifact | `내 Flow에 저장` | `조정`, secondary 결과 보기 | not_saved + draft overlay |
| Saved receipt | 무엇이 저장됐고 다음은? | personal title, included count, date range, source | `내 Flow에서 열기` | `파일 받기`, `다시 조정` | saved personal copy |
| My Flow | 지금 무엇을 하나? | same copy id, progress, next item | `다음 할 일 열기` | `전체 계획`, `조정`, `가져가기` | execution run |
| Calendar | 언제 실행하나? | same Flow marker, occurrence id, date | `항목 열기` 또는 날짜 이동 | scope, undated 배치 | dated occurrence |
| Export | 무엇을 어디로 옮기나? | same copy id, selected scope, source link | format-specific action | scope 변경 | immutable export snapshot |

### Shared visual grammar와 component anatomy

1. **Flow identity strip**: title, source, content type, item count. card가 아니라 header band다.
2. **Primary artifact canvas**: 실제 결과가 중심이고 추천 이유·범위가 붙는다.
3. **Flow outline**: section + execution row, 한 surface에서 한 번만 표시한다.
4. **Context inspector**: 개인화, 선택 결과, item detail을 담는다. mobile에서는 sheet, wide에서는 right pane다.
5. **Command bar**: frame당 primary 1개, secondary 최대 2개. command 명칭은 결과를 포함한다.
6. **Receipt band/frame**: 저장·export 성공 결과와 다음 위치를 명시한다.
7. **State marker**: source, personal, run, occurrence를 개발 enum이 아닌 사용자 문장으로 표시한다.

### P29 backlog

| Slice | 목적 | 범위 | 비범위 | 영향 surface | Acceptance criteria | Dependency |
| --- | --- | --- | --- | --- | --- | --- |
| P29-01 | artifact-first와 distinct receipt를 작은 수직 흐름으로 증명 | moving save-before, adjust entry, saved receipt, shared identity/artifact/command primitives | 다른 public Flow rollout, persistence 변경 | `/f/moving-d30-basic` | 첫 viewport에 실제 Calendar 결과와 primary 1개, 저장 후 별도 receipt, 390/1024 focus order 통과 | P28 baseline |
| P29-02 | 모든 public/source-backed save-before의 중복 제거 | `FlowSaveBeforeFrame`, `SourceBackedFlowMapPage`, legacy workbench 정리, contextual edit | routine 특수 editor | public `/f`, source-backed `/f` | 5 shape route에서 outline 1회, supported shape만 표시, 390/1024 캡처 | P29-01 |
| P29-03 | routine을 summary-first로 전환 | routine summary, progressive sheet, occurrence/resource anatomy | 운동 analytics, 새 recurrence model | workout/cleaning routine | 초기 advanced field 0, 다음 3회 표시, series mutation 0, 완료/reopen 유지 | P29-01; P29-02와 병렬 가능 |
| P29-04 | returning My Flow를 action-first library/detail로 전환 | compact mobile rows, wide rail/canvas/inspector, export 이동, explicit open | 새 IA 탭, server search | `/my` | 27 fixture 검색·열기·완료·reopen·export, row당 visible command 최대 1 | P29-01; P29-03과 병렬 가능 |
| P29-05 | Calendar의 scope/day/undated composition 통합 | active/recent scope, selected-day inspector, mobile undated sheet, focus restore | calendar engine 교체 | `/calendar` | 12 fixture 2개 선택, batch date, undated 배치/undo, internal sheet scroll | P29-01; P29-04 grammar 사용 |
| P29-06 | result choice와 export 범위를 예측 가능하게 함 | derived reason/delta/loss, max 3 eligible shapes, scope-specific receipt | 새 export format, persistence migration | public preview, My Flow export | 5 shape expectations, disabled shape 0, output count와 preview count 일치 | P29-02, P29-04, P29-05 |
| P29-07 | 공통 visual system과 접근성 마감 | type/density/divider/radius/state token, DOM focus order, mobile/wide responsive contract | brand 전면 교체 | all reviewed surfaces | contrast, focus sequence, 390/1024/1440 overflow 0, nested card 0 target | P29-02~06 |
| P29-08 | production 통합·회귀 gate | unit, targeted/full E2E, build, 64-state recapture, independent review | 신규 기능 | production | P28 contract regression 0, P29 markers pass, screenshot manifest, observed users 0 명시 | P29-01~07 |

### 순차와 병렬

- 반드시 순차: `P29-01 -> P29-02 -> P29-06 -> P29-07 -> P29-08`
- P29-01 이후 병렬 가능: `P29-03`과 `P29-04`
- P29-05는 P29-01 이후 시작할 수 있으나 P29-04의 identity/command grammar를 받아 최종 합친다.

### 사람 관찰 전에 닫을 correctness/accessibility gate

- save-before와 receipt의 frame/state 구분
- source/personal/run/occurrence/export stable identity 회귀 0
- artifact preview count와 실제 export row/event count 일치
- 완료/reopen, archive/restore, undated move/undo 의미 유지
- mobile DOM focus order와 sheet/dialog focus return
- 390/1024/1440 horizontal overflow 0, fixed overlap 0
- visible label과 accessible name의 목적·scope 일치

## 8. Reviewer 역할별 추가 결과

### Claude Design에 적용할 reference pattern과 가져오지 않을 부분

| Reference | 적용/변형할 pattern | FlowMe에 가져오지 않을 부분 | Evidence kind |
| --- | --- | --- | --- |
| Google Calendar | 선택한 calendar를 sidebar에서 보이기/숨기기, color로 scope 식별 | Calendar 자체를 제품 중심으로 만들기 | `reference_pattern` |
| Apple Reminders | section/subtask, multi-select 후 contextual action | 깊은 list hierarchy와 planner 기능 | `reference_pattern` |
| Todoist | Today와 project/library 역할 분리, undated는 project/filter에 유지 | filter query를 주 navigation으로 만들기 | `reference_pattern` |
| Notion Calendar | sidebar scope, event context pane, series edit scope | desktop-first 복합 event manager | `reference_pattern` |
| Fitbod | before/during/after edit 분리, advanced schedule를 한 edit flow로 묶기 | 운동 분석·추천 엔진 | `reference_pattern` |
| Strava | overview와 occurrence detail, filter를 별도 control로 분리 | metrics, feed, social layer | `reference_pattern` |
| TripIt | trip 전체와 개별 plan 편집을 분리 | 여행 전용 데이터 모델 | `reference_pattern` |

공식 참고 URL:

- Google Calendar: <https://support.google.com/calendar/answer/37095?hl=en>
- Apple Reminders: <https://support.apple.com/en-mide/guide/iphone/iph82596cb20/ios>
- Todoist Filters: <https://www.todoist.com/help/articles/introduction-to-filters-V98wIH>
- Todoist Today: <https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs>
- Notion Calendar: <https://www.notion.com/help/manage-your-calendars-and-events>
- Fitbod workout editing: <https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod>
- Strava Training Log: <https://support.strava.com/en-us/articles/15402077-training-log>
- TripIt plan editing: <https://help.tripit.com/en/support/solutions/articles/103000063302-create_ticket>

### Codex: 영향 component와 data consumer

| 분류 | 주요 영향 파일 | 변경 성격 | migration | 위험 |
| --- | --- | --- | --- | --- |
| CSS-only | `app/globals.css`, `components/flow/flow-ui.ts` | typography, spacing, divider, selected/focus state | 없음 | 낮음. composition 전에 단독 적용하면 효과 제한 |
| Component composition | `FlowSaveBeforeFrame.tsx`, `FlowArtifactDataPreview.tsx`, `FlowExecutionPrimitives.tsx`, `SourceBackedFlowMapPage.tsx` | artifact-first order, one outline, command bar, receipt frame | 없음 | 중간. public route 전반 회귀 |
| Interaction state | `RoutineScheduleEditor.tsx`, `CalendarFlowScopePicker.tsx`, `CalendarUnscheduledTray.tsx`, `AppClient.tsx`, `PostSaveDecisionHub.tsx` | compact/expanded, sheet/dialog, focus restore, receipt transition | 없음 | 중간. ephemeral state와 focus |
| Derived presentation | `lib/flow/flow-experience-projection.ts` 또는 별도 recommendation VM | reason, delta, loss summary | 없음 | 낮음~중간. eligibility와 count 불일치 방지 |
| Stable data contract | source/personal/run/occurrence/export consumers | 변경하지 않음 | 없음 | 회귀 guard 필수 |

### Stable contract와 migration 영향

- persistence migration: 필요 없음
- source-backed seed migration: 필요 없음
- localStorage schema: 변경하지 않음
- 새 값이 필요하면 UI-only derived VM 또는 ephemeral disclosure state로 제한
- artifact reason/loss는 기존 role/count/date/resource projection에서 계산하고 저장하지 않음
- archive/restore, completion/reopen, occurrence id는 현 계약을 그대로 소비

### 테스트·capture·배포 범위

- unit: artifact recommendation, outline de-duplication, routine disclosure, scope grouping
- targeted E2E: P29 slice별 390/1024; focus sequence와 focus return 포함
- full E2E: P28 전체 + P29 전체
- visual capture: 기존 64-state manifest를 P29 기준으로 갱신하되 current/proposed 비교 보존
- build/docs: `npm.cmd run docs:check`, `npm test`, `npm.cmd run build`
- deploy 후 production smoke와 screenshot을 새 SHA에서 재실행

### 구현 난이도와 blast radius

| Slice | 난이도 | Blast radius | 기술 질문 |
| --- | --- | --- | --- |
| P29-01 | 중 | moving public route + shared primitive | legacy frame를 prop opt-in으로 둘지 route wrapper로 둘지 |
| P29-02 | 중상 | 모든 public/source-backed route | old workbench의 creator-only 기능을 어디까지 유지할지 |
| P29-03 | 중 | routine public + occurrence preview | compact summary가 모든 recurrence mode를 손실 없이 표현하는지 |
| P29-04 | 상 | My Flow mobile/wide | 27+ library virtualization은 현 단계에서 필요 없는지 |
| P29-05 | 상 | Calendar mobile/wide | active/recent grouping을 현재 client data만으로 결정할지 |
| P29-06 | 중 | preview/export consumers | loss 문구를 static policy와 derived data 중 어디에 둘지 |
| P29-07 | 중 | 전 surface | DOM order 변경이 fixed layer z-index와 충돌하는지 |
| P29-08 | 중 | 전체 product | production seed/demo fixture와 local state 격리 재확인 |

## 9. 사람에게 나중에 확인할 질문

실제 사용자 관찰은 이번 gate의 완료 조건이 아니다. P29 구현 후 다음 질문만 사람에게 확인한다.

1. 저장 전 첫 화면에서 무엇이 저장되는지 10초 안에 설명할 수 있는가?
2. 추천 결과와 보조 결과의 차이를 실제 export 전에 예측할 수 있는가?
3. `조정`을 열지 않고도 그대로 저장해도 된다는 확신이 드는가?
4. 저장 직후 receipt에서 다음 행동 하나를 망설임 없이 고를 수 있는가?
5. 20개 이상 Flow에서 원하는 Flow와 다음 행동을 찾는가?
6. 날짜 없는 일을 My Flow에서 실행하고 Calendar에서 배치한다는 역할 차이가 자연스러운가?
7. 반복 Flow에서 series 전체와 이번 회차의 변경 범위를 구분하는가?

## 10. 최종 요약

- keep: P28 projection·identity·artifact eligibility·completion/reopen·undated placement·4탭 IA
- revise: visual tokens, density, divider, responsive rail/inspector, semantic state feedback
- redesign: save-before composition, distinct receipt, routine progressive disclosure, My Flow command hierarchy, Calendar scope/undated composition, result reason/loss
- defer: account/DB, AI/crawler, OAuth, creator marketplace, planner rewrite, 실제 사용자 관찰
- P29 첫 목표: `/f/moving-d30-basic`의 artifact-first save-before와 별도 saved receipt를 migration 없이 구현하고 390/1024 focus·identity·projection 회귀를 고정
- 앱 코드 수정 여부: false

## Evidence index

- production raw evidence: [production-review-results.json](./production-review-results.json)
- production capture script: [run-production-review.mjs](./run-production-review.mjs)
- screenshot directory: [screenshots](./screenshots/)
- A/B/C matrix: [decision-matrix.json](./decision-matrix.json)
- journey matrix: [journey-scorecard.json](./journey-scorecard.json)
- implementation program: [p29-backlog.md](./p29-backlog.md)
- copy-ready goals: [p29-goal-prompts.md](./p29-goal-prompts.md)
