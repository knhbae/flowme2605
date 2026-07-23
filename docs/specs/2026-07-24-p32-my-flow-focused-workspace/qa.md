# P32 시뮬레이션·검증·재계획 기준

## 1. Evidence 분류

모든 주요 결과에 아래 중 하나를 붙인다.

- `current_production_interaction`
- `current_source`
- `current_fixture_browser`
- `current_command`
- `current_screenshot`
- `prior_design_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `observed_user`
- `inaccessible`

자동화, fixture, screenshot, agent simulation을 `observed_user`로 기록하지 않는다.

## 2. Current Measurement Contract

### Depth

첫 route load는 depth에 포함하지 않는다. 사용자가 목적을 달성하기 위해 수행한 tap/click/keyboard activation 수를 센다.

- `flowOpenDepth`: My Flow에서 특정 Flow workspace가 열린 상태까지
- `itemEditDepth`: 특정 Item의 제목·날짜·메모를 수정하고 저장할 수 있는 form까지
- `wholeExportDepth`: whole Flow scope/count가 보이는 preflight까지
- `archiveDepth`: 활성 Flow를 보관하는 command까지
- `restoreDepth`: reload 후 archived Flow를 찾아 복구하는 command까지
- `reopenDepth`: 완료 Item을 다시 pending으로 바꾸는 command까지

### Duplicate

`actionableDuplicateCount`는 같은 stable Item 또는 occurrence를 동시에 변경할 수 있는 primary control 수에서 1을 뺀 값이다.

- 같은 Item을 설명하는 text/link는 duplicate가 아님
- completion checkbox/button 두 개는 duplicate
- Home/Calendar deep-link는 state mutation을 하지 않으면 duplicate가 아님

### Context loss

다음이 이유 없이 초기화되면 1건이다.

- My Flow query/filter
- library scroll
- selected Flow
- selected Item
- Calendar selected date/scope
- archived filter

## 3. P32-01 Comparison Matrix

| 상태 | Current | B1 | B2 | 필수 측정 |
| --- | --- | --- | --- | --- |
| 1 Flow 저장 직후 | capture | prototype | prototype | first action, receipt continuity |
| 5 Flow library | capture | prototype | prototype | open depth, command count |
| 20 Flow search | capture | prototype | prototype | search/open, scroll restore |
| 60 Flow search | fixture | prototype | prototype | rendered rows, open depth |
| Flow opened | capture | prototype | prototype | primary, card types, headings |
| completed Item | capture | prototype | prototype | reopen and record meaning |
| Calendar roundtrip | capture | prototype | prototype | context loss |
| routine | capture | prototype | prototype | definition/run/history |

P32-01은 app code를 바꾸지 않는다. HTML prototype 또는 isolated review artifact를 사용하고 `production UI가 아님`을 표시한다.

## 4. Persona Journey Matrix

### P1 이사 기준일 사용자

S1:

- public Flow 확인
- 이사일 입력
- 저장 receipt
- My Flow 전체 계획 확인

S2:

- Item 날짜 고정
- Flow 기준일 변경
- fixed date 유지 확인
- Calendar/ICS 비교

S3:

- 완료/다시 열기
- whole export
- 새 이사일로 재사용
- 과거 run 확인

### P2 날짜 없는 checklist 사용자

S1:

- vehicle Flow 저장
- 날짜 없음 의미 확인
- My Flow에서 실행

S2:

- Item 날짜 지정
- Calendar 배치
- 완료/다시 열기

S3:

- 날짜 제거
- list export 유지
- 보관/복구

### P3 routine 사용자

S1:

- routine definition 확인
- 다음 occurrence 확인

S2:

- occurrence 완료/다시 열기
- series definition 불변 확인
- Calendar/ICS 비교

S3:

- 기록 확인
- export
- 재사용

### P4 artifact-choice 사용자

S1:

- primary result 선택
- secondary result 확인
- 예상 count 확인

S2:

- whole/selected/current export
- result receipt

S3:

- 저장본 열기
- Item 수정
- 다시 export

### P5 mixed date/check/resource 사용자

S1:

- 날짜, check, resource 역할 식별
- source 확인

S2:

- check 완료
- resource 열기
- 날짜 Item 수정

S3:

- whole Flow 확인
- export eligibility
- 보관/복구

유효한 fixture가 없으면 `blocked`로 유지한다.

### P6 personal draft 사용자

S1:

- memo/URL miss draft 저장
- 전체 Item 확인

S2:

- quick edit
- structure add/delete/restore/reorder
- date placement

S3:

- export
- archive/restore
- permanent delete copy 확인

### P7 completion/history 사용자

S1:

- next action 완료
- immediate undo

S2:

- completed view에서 다시 열기
- per-Flow record 확인

S3:

- reopen 이후 같은 stable Item 확인
- history 유지

### P8 lifecycle/reuse 사용자

S1:

- Flow 관리 menu 찾기
- archive

S2:

- reload
- archived filter
- restore

S3:

- archived-only permanent delete
- source rediscovery
- re-save

## 5. Content-shape Assertions

| Shape | 반드시 보일 것 | 보이면 안 되는 것 |
| --- | --- | --- |
| anchor timeline | 기준일, date/phase group, fixed date 구분 | anchor 변경으로 fixed date 손실 |
| undated checklist | 날짜 없음, 선택적 날짜入口 | Calendar가 없으면 실행 불가라는 암시 |
| routine | series, next occurrence, current run, record | series row completion |
| artifact choice | primary, secondary<=2, scope/count | disabled five-tab gallery |
| mixed | date/check/resource role | resource completion checkbox |
| draft | quick value edit, structure mode | source-backed structure mutation |

## 6. Viewport And Layout

### 390x844

- global bottom nav가 main workspace 뒤에 focus
- sticky object header와 bottom nav가 content/primary action을 가리지 않음
- Item title/control overlap 0
- horizontal overflow 0
- sheet/dialog body scroll과 page scroll 분리

### 1024x768

- rail/canvas/inspector 역할 구분
- inspector 최소 폭이 canvas 내용을 자르지 않음
- duplicate command 0
- horizontal overflow 0

### 1440x900

- canvas가 불필요한 card stack으로 늘어나지 않음
- line length와 plan density가 과도하지 않음
- inspector가 선택 Item 맥락을 유지

## 7. Accessibility

- Flow row 전체가 막연한 click target이면 명시적 accessible open action 제공
- icon-only control은 accessible name과 tooltip
- completion control name에 Item title 또는 occurrence date 포함
- `보관`, `복구`, `영구 삭제` 목적이 visible label과 accessible name에서 일치
- dialog/sheet:
  - focus trap
  - Escape close
  - cancel
  - close 후 trigger focus return
- loading/receipt/error:
  - status/alert semantics
  - 의미 있는 focus 이동
- keyboard:
  - Tab/Shift+Tab
  - Enter/Space
  - Escape

## 8. Projection And Identity

각 행동 전후 아래를 비교한다.

- `flowId`
- stable Item ID
- run ID
- occurrence ID
- Calendar event identity
- export row identity
- effective title/date/memo
- completion/reopen state
- archive state

허용되는 변경만 바뀌어야 한다.

| 행동 | 변경 가능 | 변경 금지 |
| --- | --- | --- |
| quick edit | personal title/date/memo | source, run, occurrence identity |
| anchor edit | anchor-linked dates | fixed personal date, past run |
| completion | run/occurrence state | structural membership |
| archive | lifecycle visibility | source/personal values |
| restore | lifecycle visibility | stable identity |
| permanent delete | personal local records | public source |
| export | receipt | source/personal/run state |

## 9. Regression Suites

### Unit

- command view model
- anchor impact plan
- personal fixed-date precedence
- export scope/count
- archive/restore/delete storage
- context restoration reducer/helper
- shape body projection

### Targeted E2E

- focused workspace mobile/wide
- quick edit parity
- anchor change preservation
- whole/selected/current export
- archive/reload/restore/delete
- completion/reopen owner
- 1/5/20/60 scale
- six shapes
- Calendar roundtrip

### Existing regressions

- P31 My Flow/lifecycle
- P31 Calendar sheet
- P30 focus order
- P29 export/fixed layer
- P28 content shapes
- public share CTA order
- workbench source density
- URL-first surface

## 10. Command Gate

각 slice:

```text
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
targeted Playwright
git diff --check
```

P32-07:

```text
npm.cmd ci
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
targeted P32 E2E
affected regression E2E
full E2E
git diff --check
```

명령 실패는 성공으로 요약하지 않는다. 병렬 browser worker가 host memory로 실패하면 원인과 exact pass accounting을 기록하고, 누락 scenario만 직렬 재실행한다.

## 11. Screenshot Contract

각 구현 slice:

- current 390
- proposed/implemented 390
- current 1024
- proposed/implemented 1024
- implemented 1440
- nested state
- keyboard/focus state
- receipt/dialog/sheet state

파일명에는 slice, route/state, viewport를 포함한다.

예:

```text
p32-03-moving-item-quick-edit-390.png
p32-05-archived-delete-confirm-1024.png
```

## 12. 재계획 Gate

### Gate A: P32-01

B1/B2 중 선택하지 못하거나 current discrepancy가 해소되지 않으면 구현 중단.

### Gate B: P32-02

vertical slice가 depth, command, context 목표를 충족하지 못하면 common rollout 중단.

### Gate C: P32-04

anchor adjustment가 personal fixed date 또는 past run을 바꾸면 implementation rollback.

### Gate D: P32-06

route-specific 예외가 shared body block보다 많으면 renderer strategy 재설계. 데이터 계약은 열지 않음.

### Gate E: P32-07

Blocking/High, identity mismatch, overflow/focus blocker가 있으면 deploy 금지.

## 13. Security Gate

dependency advisory는 UX finding과 분리한다.

- critical/high target: 0
- forced downgrade: 0
- `npm audit fix --force`: 금지
- compatible patch가 없으면 release exception에 package, advisory, exposure, mitigation, revisit trigger 기록

## 14. Observed-user 경계

P32 자동 gate는 실제 사용자 관찰을 대체하지 않는다.

P32 후 실제 사용자에게 확인할 질문:

1. `지금`과 한 Flow의 `다음 행동`을 서로 다르게 이해하는가
2. Item 수정入口를 설명 없이 찾는가
3. 기준일 변경과 Item 날짜 변경을 구분하는가
4. whole/selected/current export 결과를 예측하는가
5. 보관/복구/영구 삭제 차이를 이해하는가
6. Calendar 왕복 후 맥락이 유지됐다고 느끼는가
