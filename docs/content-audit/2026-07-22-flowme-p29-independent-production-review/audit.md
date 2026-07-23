# FlowMe P29 production 독립 검토

## 1. 전체 판정

**Verdict: `revise`**

P29는 production에서 실질적인 구조 변화를 만들었다. 저장 전 첫 화면은 결과를 먼저 보여주고, 저장 후에는 별도 receipt로 전환된다. 반복 설정은 summary 뒤로 들어갔고, My Flow와 Calendar는 많은 Flow를 다루는 workspace가 됐다. primary/secondary artifact와 whole/selected/current export scope도 count와 identity를 유지한다.

따라서 `redesign`은 과도하다. 다만 `keep`으로 닫기에는 모바일 expanded state에서 primary action을 가리는 fixed layer 2건과 비선형 keyboard focus order가 남아 있다. P30은 이 결함을 먼저 닫고, 긴 Flow 조정 밀도와 Calendar evidence를 제한적으로 보완해야 한다.

자동화, screenshot, agent simulation은 실제 사용자 검증이 아니다. Observed-user count는 `0`이다.

## 2. Findings

### Blocking

없음.

### High 01 - Mobile fixed UI가 export primary action을 덮는다

- Route: `/f/moving-d30-basic`, `/my?demo=ux20&view=flows`
- Viewport: `390x844`
- 재현: 이사일 입력 -> `Flow 가져가기` -> format preflight, 또는 My Flow 열기 -> `가져가기`
- 기대: export primary action이 고정 save/nav layer와 겹치지 않고 전체 label과 target이 보여야 한다.
- 실제:
  - public: `public-flow-mobile-save-cta` rect `0,775..390,844`가 Calendar export rect `29,804..361,875`를 덮음
  - My Flow: `platform-mobile-tabs` rect `12,774..378,832`가 Calendar export rect `33,817..357,888`를 덮음
- 사용자 영향: format과 count를 확인하는 순간 핵심 action 일부가 가려지고, 추가 scroll이 가능한지 예측해야 한다.
- EvidenceKind: `current_production_interaction`, `current_source`
- 권장 변경: export open 동안 save CTA를 suppress하거나 panel 위로 재배치하고, My Flow expanded panel에 실제 nav clearance를 적용한다.
- Acceptance marker: `P30-MOBILE-EXPORT-NO-FIXED-OVERLAP`
- Evidence: [public viewport](./screenshots/mobile-E01-public-export-preflight-viewport.png), [My Flow viewport](./screenshots/mobile-C06-my-flow-export-viewport.png)

P29 E2E의 zero-overlap 검사는 네 route의 initial state만 확인한다. nested export open 상태가 포함되지 않아 13/13 pass와 이 finding은 모순되지 않는다.

### High 02 - Mobile bottom navigation의 focus 순서가 시각적 순서와 다르다

- Route: `/my?demo=ux20&view=flows`, `/calendar?demo=ux20`
- Viewport: `390x844`
- 재현: 페이지 상단에서 Tab 반복
- 기대: 상단 header 이후 현재 화면의 workspace control로 이동하고, 화면 하단 navigation은 문서 순서상 이후에 도달한다.
- 실제: `FLOW -> 보조 메뉴 -> 홈 -> Flow 찾기 -> 캘린더 -> 내 Flow -> 본문 상단 control`이다. focus top 좌표가 `28 -> 779 -> 205` 또는 `24 -> 779 -> 117`로 역행한다.
- 사용자 영향: keyboard 사용자는 화면 하단으로 이동한 뒤 다시 위로 돌아와 현재 과업의 시작점을 잃기 쉽다.
- EvidenceKind: `current_production_interaction`, `current_source`
- 권장 변경: desktop nav와 mobile fixed nav의 DOM 순서를 분리하거나 main skip path를 제공한다.
- Acceptance marker: `P30-MOBILE-WORKSPACE-FOCUS-ORDER`

### Medium 01 - 24-item 조정은 여전히 긴 list부터 열린다

- Route: `/f/moving-d30-basic`
- Viewport: `390x844`
- 재현: 이사일 입력 -> `조정`
- 기대: 사용자의 수정 의도에 맞는 최소 mode를 먼저 선택하거나, 현재 변경 범위를 compact하게 확인한다.
- 실제: `항목 고르기`가 기본이고 24개 row가 즉시 렌더링된다. `날짜`, `제목·메모`, `순서`는 별도 mode에 있다.
- 사용자 영향: 제목이나 날짜 하나만 바꾸려는 사용자도 전체 item list를 먼저 마주친다.
- EvidenceKind: `current_production_interaction`, `heuristic_simulation`
- 권장 변경: 4개 mode와 overlay 계약은 유지하되, 긴 목록은 section grouping/progressive expansion을 사용한다.
- Acceptance marker: `P30-LONG-FLOW-CONTEXTUAL-ADJUST`
- Evidence: [adjustment](./screenshots/mobile-A02-moving-adjust.png)

### Medium 02 - Exact Calendar demo가 undated journey를 증명하지 못한다

- Route: `/calendar?demo=ux20`
- Viewport: `390x844`
- 재현: route 진입 -> undated tray 탐색
- 기대: 검토 route 자체로 날짜 없는 item 선택, 배치, undo를 재현한다.
- 실제: tray count `0`; reviewer가 production client에 localStorage fixture를 넣었을 때만 `10 -> 8 -> undo -> 10`을 확인했다.
- 사용자 영향: production 기능 결함은 아니지만 release evidence만으로 실제 deployed path를 반복 검증할 수 없다.
- EvidenceKind: `current_production_interaction`, `heuristic_simulation`
- 권장 변경: deterministic production demo 또는 공식 E2E fixture를 정본 evidence path로 지정한다.
- Acceptance marker: `P30-CALENDAR-UNDATED-EVIDENCE`
- Evidence: [controlled tray](./screenshots/mobile-D06-calendar-undated-sheet.png)

### Medium 03 - 1024 Calendar의 긴 Flow label은 시각적으로 축약된다

- Route: `/calendar?demo=ux20`
- Viewport: `1024x768`
- 재현: Flow scope에서 2개 선택 -> month view 확인
- 기대: 같은 날짜의 여러 Flow를 month cell과 selected-day에서 연결할 수 있다.
- 실제: `컴퓨터활용능력 1급 학습` 4개가 폭 `60..61px`에서 `컴퓨터활용능력...`로 표시된다. `title`, parent `aria-label`, selected-day full title은 유지된다.
- 사용자 영향: 접근 가능한 이름은 보존됐지만 시각적 scanning에서 긴 Flow 간 차이가 suffix에 있을 경우 구분이 어렵다.
- EvidenceKind: `current_production_interaction`, `current_source`, `heuristic_simulation`
- 권장 변경: 새 저장 alias 없이 existing marker/color와 selected-day identity를 이용하는 compact label 기준을 screenshot gate로 확정한다.
- Acceptance marker: `P30-CALENDAR-COMPACT-IDENTITY`
- Evidence: [wide Calendar](./screenshots/wide-D05-calendar-workspace.png)

### Low 01 - Routine advanced mode는 한 화면에 설정 필드가 밀집한다

- Route: `/f/curated-allblanc-morning-workout`
- Viewport: `390x844`
- 재현: 시작일 입력 -> `반복 설정 바꾸기`
- 기대: 명시적으로 연 advanced mode 안에서도 `언제`와 `언제 끝`이 빠르게 구분된다.
- 실제: 7개 요일, time mode, time, duration, end mode, count가 한 연속 form으로 열린다.
- 사용자 영향: 기능은 찾을 수 있고 progressive disclosure도 동작하지만, 좁은 화면에서 16개 interactive가 같은 viewport에 걸친다.
- EvidenceKind: `current_production_interaction`, `heuristic_simulation`
- 권장 변경: 필드를 추가하지 말고 두 의미 그룹과 summary feedback을 강화한다.
- Acceptance marker: `P30-ROUTINE-ADVANCED-DENSITY`
- Evidence: [routine adjustment](./screenshots/mobile-B02-routine-adjust.png)

## 3. P29에서 실제로 개선된 점

1. **저장 전 결과 우선:** moving 첫 화면은 Calendar 24개와 Checklist 24개를 실제 row와 함께 먼저 보여준다.
2. **별도 receipt:** 저장 후 입력 form이 사라지고 저장 이름, 24개, destination, date range, next action만 남는다.
3. **Routine summary-first:** 기본값 `월·수·금 · 시간 없음 · 종료일 없음`과 다음 3회를 먼저 보여주고 advanced field는 숨긴다.
4. **My Flow library:** 27개 fixture에서 mobile row가 `68..69px`, row당 open command 1개이며 검색하면 이사 Flow 1개로 줄어든다.
5. **Wide workspace:** My Flow는 280px library와 plan/detail 영역, Calendar는 664px month와 320px agenda로 모바일과 다른 composition을 쓴다.
6. **Calendar scope:** 12개 Flow를 닫힌 trigger 안에서 검색하고 2개를 선택해 grouped selected-day를 볼 수 있다.
7. **Export:** whole `24`, selected `2`, current `1`의 scope가 format보다 먼저 표시되고 receipt count가 prediction과 일치한다.

## 4. Journey scorecard

| Journey | Status | 근거 |
|---|---|---|
| 이사 save-before -> receipt -> My Flow -> Calendar -> export | `partial` | 핵심 흐름은 지원, mobile export overlap 남음 |
| routine summary -> 조정 -> occurrence complete/reopen | `supported` | 7월 27일 완료 후 다음 회차 이동, undo 후 동일 회차 다시 진행 |
| 27개 My Flow scan/search/detail/complete/export | `partial` | compact library 동작, focus order와 export overlap 남음 |
| 12개 Calendar scope/selected-day/undated placement | `partial` | scope 동작, undated는 controlled fixture로만 확인 |
| primary/secondary 및 whole/selected/current export | `partial` | count/identity 일치, mobile preflight overlap 남음 |

## 5. 계약 회귀 판정

| Contract | 판정 | 근거 |
|---|---|---|
| source | 회귀 없음 | source title/URL 유지, personal 수정으로 source row mutation 없음 |
| personal overlay | 회귀 없음 | 개인 title/date/order가 receipt, My Flow, Calendar에 반영 |
| execution run | 회귀 없음 | completion과 reopen이 구조 수정 없이 전환 |
| occurrence | 회귀 없음 | 7월 27일 회차만 완료되고 7월 29일이 다음 회차가 됨; undo로 복구 |
| export identity | 회귀 없음 | whole 24, selected 2, current 1 prediction/output parity |
| schema/migration | 변경 없음 | P29 marker reconciliation의 migration/source mutation count 0, current diff와 unit 확인 |

이 판정은 current source, automated tests, production interaction 기준이다. 실제 사용자 데이터의 장기 동기화 검증은 아니다.

## 6. Responsive와 접근성

- `390`: 실제 결과와 조정/저장 위계는 개선됨. horizontal overflow 0, unnamed focusable 0. fixed layer와 focus order 수정 필요.
- `1024`: public 2열, My Flow library/workspace, Calendar month/agenda가 분리된다. Calendar 긴 label 축약은 남는다.
- `1440`: max-width 안에서 result canvas와 source/reference rail이 분리되고 과도한 stretched mobile UI는 보이지 않는다.
- Console error 0, page error 0.
- Public control의 accessible name과 My Flow row별 contextual aria-label은 유지된다.

## 7. Keep / Revise / Defer

### Keep

- artifact-first public frame
- one-outline + contextual adjustment
- distinct receipt
- routine summary + next three occurrences
- compact My Flow library and wide workspace
- compact Calendar scope and selected-day agenda
- primary 1 + secondary max 2 recommendation
- whole/selected/current export vocabulary

### Revise

- mobile fixed layer coordination
- mobile bottom navigation focus order
- long Flow adjustment first-open density
- official undated evidence path

### Defer

- new planner IA
- persistence/schema migration
- custom Calendar aliases/colors
- new export formats
- account/DB/OAuth

## 8. Verification

- Production independent runner: 17/17 journeys, 39 states, 41 screenshots
- clean `origin/main` `npm.cmd run docs:check`: pass, 2,883 local links
- artifact workspace `npm.cmd run docs:check`: pass, 2,532 local links
- `npm.cmd test`: pretest 33/33, unit 584/584
- `npm.cmd run build`: pass, 18/18 routes
- P29 targeted E2E: 13/13

## 9. 다음 순서

1. P30-01 fixed export overlap
2. P30-02 mobile focus order
3. P30-03 long Flow adjustment density and P30-04 Calendar evidence/identity in parallel
4. P30-05 nested-state independent final gate

상세 범위는 [p30-backlog.md](./p30-backlog.md)에 있다.
