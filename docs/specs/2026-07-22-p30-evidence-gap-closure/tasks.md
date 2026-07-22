# P30 Evidence Gap Closure Tasks

## Status Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete by current evidence
- `[~]` conditionally deferred with reason

## P30-00 - Feedback Reconciliation And Contract Freeze

**State:** `[x]` planning artifact complete, implementation not started

### Purpose

Claude Design과 Codex의 P29 독립 검토를 evidence strength로 조정하고, P30이 P29를 재설계하지 않도록 범위와 순서를 고정한다.

### Tasks

- [x] Claude Design standalone review의 판정, finding, inaccessible 범위를 기록한다.
- [x] Codex production review의 route, viewport, DOMRect, screenshot finding을 기록한다.
- [x] `afe834a..3c7b59e` 앱 코드 차이가 없음을 확인한다.
- [x] P29 stable product/data contract를 freeze한다.
- [x] P30-01~08 dependency와 rollback을 정의한다.
- [ ] Owner가 P30-01 착수를 승인한다.

### Deliverables

- [README.md](./README.md)
- [feedback-reconciliation.md](./feedback-reconciliation.md)
- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [qa.md](./qa.md)
- [goal-prompts.md](./goal-prompts.md)

---

## P30-01 - Mobile Export Fixed-Layer Correctness

**Priority:** High  
**Dependency:** P30-00  
**Primary marker:** `P30-MOBILE-EXPORT-NO-FIXED-OVERLAP`

### User problem

모바일에서 export preflight를 열면 public save CTA 또는 My Flow bottom navigation이 primary export action을 덮는다. 결과를 실행하는 마지막 단계가 가장 낮은 layer correctness를 가진다.

### Implementation tasks

- [ ] Clean `origin/main`에서 failing routes를 다시 재현하고 rect를 저장한다.
- [ ] `FlowExportPanel` open state와 public mobile save CTA visibility 관계를 inventory한다.
- [ ] My Flow export panel의 마지막 action과 bottom nav clearance 계산 경로를 inventory한다.
- [ ] public export open 시 save CTA를 suppress할지 safe position으로 이동할지 한 정책을 선택한다.
- [ ] My Flow export surface가 bottom nav와 safe area를 포함한 실제 clearance를 갖게 한다.
- [ ] export close/receipt transition 후 기존 CTA/nav와 focus가 복구되게 한다.
- [ ] CSS padding만 누적하지 말고 layer ownership을 explicit state/attribute로 표현한다.
- [ ] nested state geometry assertion을 P30 E2E에 추가한다.
- [ ] 1024/1440에서 fixed behavior가 생기지 않았는지 확인한다.

### Acceptance

- [ ] public export primary x `public-flow-mobile-save-cta` intersection `0`
- [ ] My Flow export primary x `platform-mobile-tabs` intersection `0`
- [ ] export primary가 추가 corrective scroll 없이 완전히 보임
- [ ] close 후 invoking control로 focus 복귀
- [ ] predicted count와 actual receipt count 유지
- [ ] 4탭 IA, export format, persistence 변화 `0`

### Required verification

- [ ] unit/component test if a shared layer helper is extracted
- [ ] targeted public export E2E
- [ ] targeted My Flow whole/selected/current export E2E
- [ ] full E2E because shared fixed layers change
- [ ] `docs:check`, unit, build, `git diff --check`
- [ ] local and production 390 screenshots/geometry JSON

### Explicit non-goals

- export panel redesign
- new artifact format
- bottom navigation IA change
- save/export schema migration

---

## P30-02 - Mobile Workspace Focus Order

**Priority:** High  
**Dependency:** P30-01 production green  
**Primary marker:** `P30-MOBILE-WORKSPACE-FOCUS-ORDER`

### User problem

`/my`와 `/calendar`에서 keyboard focus가 header에서 fixed bottom tabs로 내려간 뒤 본문 상단으로 돌아온다. 시각적 위치와 읽기 순서가 어긋난다.

### Implementation tasks

- [ ] current DOM order와 CSS fixed positioning을 별도로 기록한다.
- [ ] desktop nav와 mobile persistent nav의 render position을 분리한다.
- [ ] main region에 안정적인 skip target과 heading relationship을 확인한다.
- [ ] mobile sequential order를 header/skip -> main -> bottom nav로 맞춘다.
- [ ] sheet/dialog/menu open 시 focus trap과 close/apply return을 확인한다.
- [ ] bottom nav link의 aria-current, name, destination을 유지한다.
- [ ] focus sequence recorder를 E2E helper로 추가한다.
- [ ] rect y와 DOM index를 evidence JSON에 저장한다.

### Acceptance

- [ ] `/my` 첫 main action이 bottom nav보다 먼저 focus됨
- [ ] `/calendar` scope/selected-day action이 bottom nav보다 먼저 focus됨
- [ ] bottom nav는 keyboard/screen reader로 계속 접근 가능
- [ ] scope picker/undated sheet/export layer close 후 focus loss `0`
- [ ] unnamed focusable `0`
- [ ] 4탭 순서와 visible layout 변화 없음

### Required verification

- [ ] targeted `/my`, `/calendar` keyboard E2E
- [ ] dialog/sheet/menu focus trap and return E2E
- [ ] full E2E because global navigation composition changes
- [ ] 390 focus sequence JSON and screenshots
- [ ] 1024/1440 desktop navigation regression

---

## P30-03 - Save-Before Decision And Long-Flow Adjustment

**Priority:** Medium  
**Dependency:** P30-02  
**Markers:** `P30-SAVE-BEFORE-SINGLE-DECISION`, `P30-LONG-FLOW-CONTEXTUAL-ADJUST`

### User problem

artifact-first preview는 좋아졌지만 moving save-before의 결정 영역에는 anchor, 세 가지 날짜 intent, 조정, primary가 함께 보인다. 조정을 열면 24개 항목 선택이 먼저 펼쳐져 제목·날짜 같은 흔한 수정이 늦다.

### Design rule

먼저 전체 결과를 보여주고, 현재 선택한 조정 목적만 펼친다. full editor나 모든 field 동시 노출로 되돌아가지 않는다.

### Implementation tasks

- [ ] current frame의 visible action/input count를 390/1024에서 inventory한다.
- [ ] anchor-required Flow와 optional-date Flow의 decision grammar를 분리하되 같은 component contract를 쓴다.
- [ ] primary save action과 receipt vocabulary를 일치시킨다.
- [ ] secondary date intent는 contextual adjustment 안에서 선택하게 한다.
- [ ] adjust entry를 누르면 먼저 `제목·메모`, `날짜`, `항목 선택`, `순서` 목적과 current summary를 보여준다.
- [ ] `제목·메모`와 `날짜`는 24-item list를 렌더/탐색하기 전에 접근 가능하게 한다.
- [ ] `항목 선택`을 명시적으로 열었을 때만 24개 목록을 group/disclosure로 보여준다.
- [ ] selection count, current order, save payload는 기존 projection/overlay에서 derive한다.
- [ ] active adjustment mode는 한 번에 하나만 유지한다.
- [ ] close/cancel/apply focus return과 unsaved draft behavior를 정의한다.

### Acceptance

- [ ] initial save-before row-level edit control `0`
- [ ] first viewport primary action `<= 1`
- [ ] title/date adjustment click depth가 item selection traversal과 독립
- [ ] 24개 include/exclude는 모두 keyboard reachable
- [ ] save result count/source/date range가 P29와 동일
- [ ] personal overlay, order ID, save payload 변화 `0`
- [ ] 390 horizontal overflow/fixed overlap `0`

### Required screenshots

- current/proposed moving decision 390
- adjust purpose summary 390
- item selection expanded 390
- two-column save-before/adjust 1024

### Non-goals

- free-form planner/editor
- new item schema or AI edit
- source content rewrite

---

## P30-04 - My Flow Next-Action Command Hierarchy

**Priority:** Medium  
**Dependency:** P30-02  
**Primary marker:** `P30-MY-FLOW-COMMAND-HIERARCHY`

### User problem

My Flow detail에서 다음 실행 행동 아래 `여러 할 일 조정`, `원문 보기`, `보관하기`, `가져가기`가 비슷한 무게로 노출된다. 사용자는 실행과 관리의 우선순위를 다시 판단해야 한다.

### Implementation tasks

- [ ] mobile 1/20/50 Flow fixture에서 visible command inventory를 만든다.
- [ ] next action 또는 reopen을 유일한 visible primary로 유지한다.
- [ ] 현재 context에서 자주 쓰는 adjust/export 중 최대 2개만 secondary로 둔다.
- [ ] source, archive/restore, low-frequency management를 accessible overflow menu로 이동한다.
- [ ] overflow trigger에 label, `aria-haspopup`, expanded state를 준다.
- [ ] Escape/outside click/selection 후 focus를 trigger로 복귀한다.
- [ ] command handler를 새로 만들지 않고 existing action을 호출한다.
- [ ] saved receipt와 일반 detail이 같은 command grammar를 사용하게 한다.
- [ ] completed/reopened state에서 primary가 중복되지 않게 한다.

### Acceptance

- [ ] mobile detail visible primary `1`
- [ ] mobile detail visible secondary `<= 2`
- [ ] source/archive commands accessible but not peer primary
- [ ] completion/reopen control pattern unchanged
- [ ] export whole/selected/current scope unchanged
- [ ] 20~50 Flow library search/open/detail journey unchanged
- [ ] overflow keyboard/focus return pass

### Non-goals

- new My Flow tab/IA
- server search or cloud account
- permanent delete policy
- data migration

---

## P30-05 - Calendar Scale, Undated Evidence, And Compact Identity

**Priority:** Medium  
**Dependency:** P30-02  
**Markers:** `P30-CALENDAR-UNDATED-EVIDENCE`, `P30-CALENDAR-SCOPE-SCALE`, `P30-CALENDAR-COMPACT-IDENTITY`

### P30-05A deterministic undated evidence

- [ ] Decide a query-gated demo or deterministic E2E fixture; never use real user data.
- [ ] Fixture has at least 10 undated items across multiple Flow identities.
- [ ] Reproduce select 2 -> choose date -> preview -> apply -> undo.
- [ ] Record before/after counts and stable item IDs.
- [ ] Verify sheet internal scroll separately from page scroll.
- [ ] Label fixture evidence as automated, not observed user.

Acceptance:

- [ ] 10 -> 8 undated count after placing 2
- [ ] target date agenda gains exactly 2
- [ ] undo returns counts and IDs
- [ ] page scroll/calendar position unchanged on sheet open/close

### P30-05B scalable Flow scope

- [ ] Test 12, 20, and 50+ Flow options.
- [ ] Keep selected and current-month groups visible.
- [ ] Collapse `다른 Flow` when query is empty.
- [ ] Automatically expose matching `다른 Flow` rows during search.
- [ ] Preserve draft selection while query/group state changes.
- [ ] Apply and close with focus return.

Acceptance:

- [ ] closed state scope command `1`
- [ ] find and select 2 of 50 in `<= 5` meaningful interactions after opening
- [ ] no horizontal chip strip
- [ ] selected/month/other counts are projection-derived

### P30-05C compact month identity

- [ ] Inventory 1024 truncation examples and marker/color/count availability.
- [ ] Prefer marker/color/short count in month cell; avoid storing a new alias.
- [ ] Preserve full Flow/item title in selected-day agenda, `title`, and accessible name.
- [ ] Keep same-date multi-Flow grouping and personal order tie-break.
- [ ] Verify 3~5 same-date Flow compact summary.

Acceptance:

- [ ] month cell remains compact at 1024
- [ ] selected-day agenda shows full identity and all events
- [ ] color-only identification is not required
- [ ] event stable identity/occurrence unchanged
- [ ] Calendar/ICS projection behavior unchanged

### Non-goals

- Calendar engine replacement
- persisted short alias/custom color
- direct external calendar sync
- recurrence semantics changes

---

## P30-06 - Routine Advanced Setting Density

**Priority:** Low/Medium, conditional  
**Dependency:** P30-03~05 evidence  
**Primary marker:** `P30-ROUTINE-ADVANCED-DENSITY`

### Gate before implementation

- [ ] Capture summary and advanced mode at 390/1024.
- [ ] Confirm the issue is grouping/copy, not recurrence correctness.
- [ ] If no clear problem remains, mark `[~] deferred` and stop.

### Conditional tasks

- [ ] Keep compact routine summary and next 3 occurrences.
- [ ] Group existing weekday/time/duration fields under `언제`.
- [ ] Group none/until/count fields under `언제 끝`.
- [ ] Show only fields required by the chosen end mode.
- [ ] Review `시간 없음`, `종료일 없음` wording without adding explanation paragraphs.
- [ ] Preserve current recurrence projection, UID, completion/reopen behavior.

### Acceptance

- [ ] summary fully describes effective routine
- [ ] initial advanced field count `0`
- [ ] none/until/count matrix remains correct
- [ ] one occurrence completion does not mutate series
- [ ] no new workout-only execution UI

---

## P30-07 - Legacy Composition Removal Gate

**Priority:** Low maintenance  
**Dependency:** P30-03~06 merged and green

### Tasks

- [ ] Enumerate route/component consumers of legacy/hybrid branches.
- [ ] Classify each as active production, test-only, historical, or dead.
- [ ] Capture reviewed route screenshot and marker matrix before deletion.
- [ ] Remove only branches with active consumer count `0`.
- [ ] Keep projection/persistence functions shared; do not fork.
- [ ] Run five-shape/public/source-backed regression.
- [ ] Compare visual/DOM behavior; expected difference `0`.
- [ ] Put cleanup in a dedicated revertible commit.
- [ ] If any live route depends on the branch, document and defer instead of forcing removal.

### Acceptance

- [ ] dead branch removed or explicit defer decision recorded
- [ ] stable route visual/behavior regression `0`
- [ ] P29/P30 marker regression `0`
- [ ] app bundle/build remains green

---

## P30-08 - Independent Nested-State Production Closeout

**Priority:** Release gate  
**Dependency:** all implemented slices

### Capture scope

- [ ] public save-before, adjust, export preflight, saved receipt
- [ ] My Flow library/detail, overflow, whole/selected/current export and receipt
- [ ] routine summary/advanced, occurrence done/reopened
- [ ] Calendar 50+ scope, selected day, undated batch/undo, compact month cell
- [ ] 390/1024/1440 responsive matrix
- [ ] keyboard focus sequence and dialog/sheet focus return
- [ ] source/personal/run/occurrence/export identity reconciliation

### Commands

- [ ] `npm.cmd ci`
- [ ] `npm.cmd run docs:check`
- [ ] `npm.cmd test`
- [ ] `npm.cmd run build`
- [ ] targeted P30 E2E
- [ ] affected P29 regression
- [ ] full E2E
- [ ] `git diff --check`

### Production closeout

- [ ] merge SHA and deployment ID recorded
- [ ] canonical production anonymous access confirmed
- [ ] production nested-state smoke rerun independently
- [ ] fixed-primary overlap `0`
- [ ] horizontal overflow `0`
- [ ] unnamed focusable `0`
- [ ] console/page error `0`
- [ ] P29 contract regression `0`
- [ ] known gaps and rollback documented
- [ ] observed-user count `0` explicitly retained
- [ ] owner verdict recorded: `ready_for_owner_observation_decision`, `revise`, or `rollback`

### Final package candidate

```text
docs/content-audit/2026-07-XX-flowme-p30-final-review-package/
  README.md
  audit.md
  review.html
  route-evidence.json
  journey-results.json
  screenshot-manifest.json
  screenshots/
```

