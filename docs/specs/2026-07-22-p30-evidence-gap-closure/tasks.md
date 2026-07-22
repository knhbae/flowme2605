# P30 Evidence Gap Closure Tasks

## Status Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete by current evidence
- `[~]` conditionally deferred with reason

## P30-00 - Feedback Reconciliation And Contract Freeze

**State:** `[x]` complete and released through PR #148 / merge `b3c8500`

### Purpose

Claude Design과 Codex의 P29 독립 검토를 evidence strength로 조정하고, P30이 P29를 재설계하지 않도록 범위와 순서를 고정한다.

### Tasks

- [x] Claude Design standalone review의 판정, finding, inaccessible 범위를 기록한다.
- [x] Codex production review의 route, viewport, DOMRect, screenshot finding을 기록한다.
- [x] `afe834a..3c7b59e` 앱 코드 차이가 없음을 확인한다.
- [x] P29 stable product/data contract를 freeze한다.
- [x] P30-01~08 dependency와 rollback을 정의한다.
- [x] Owner가 P30-01 착수를 승인한다.

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

- [x] Clean `origin/main`에서 failing routes를 다시 재현하고 rect를 저장한다.
- [x] `FlowExportPanel` open state와 public mobile save CTA visibility 관계를 inventory한다.
- [x] My Flow export panel의 마지막 action과 bottom nav clearance 계산 경로를 inventory한다.
- [x] public export open 시 save CTA를 suppress할지 safe position으로 이동할지 한 정책을 선택한다.
- [x] My Flow export surface가 bottom nav와 safe area를 포함한 실제 clearance를 갖게 한다.
- [x] export close/receipt transition 후 기존 CTA/nav와 focus가 복구되게 한다.
- [x] CSS padding만 누적하지 말고 layer ownership을 explicit state/attribute로 표현한다.
- [x] nested state geometry assertion을 P30 E2E에 추가한다.
- [x] 1024/1440에서 fixed behavior가 생기지 않았는지 확인한다.

### Acceptance

- [x] public export primary x `public-flow-mobile-save-cta` intersection `0`
- [x] My Flow export primary x `platform-mobile-tabs` intersection `0`
- [x] export primary가 추가 corrective scroll 없이 완전히 보임
- [x] close 후 invoking control로 focus 복귀
- [x] predicted count와 actual receipt count 유지
- [x] 4탭 IA, export format, persistence 변화 `0`

### Required verification

- [x] unit/component test if a shared layer helper is extracted
- [x] targeted public export E2E
- [x] targeted My Flow whole/selected/current export E2E
- [x] full E2E because shared fixed layers change
- [x] `docs:check`, unit, build, `git diff --check`
- [x] local and production 390 screenshots/geometry JSON

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

- [x] current DOM order와 CSS fixed positioning을 별도로 기록한다.
- [x] desktop nav와 mobile persistent nav의 render position을 분리한다.
- [x] main region에 안정적인 skip target과 heading relationship을 확인한다.
- [x] mobile sequential order를 header/skip -> main -> bottom nav로 맞춘다.
- [x] sheet/dialog/menu open 시 focus trap과 close/apply return을 확인한다.
- [x] bottom nav link의 aria-current, name, destination을 유지한다.
- [x] focus sequence recorder를 E2E helper로 추가한다.
- [x] rect y와 DOM index를 evidence JSON에 저장한다.

### Acceptance

- [x] `/my` 첫 main action이 bottom nav보다 먼저 focus됨
- [x] `/calendar` scope/selected-day action이 bottom nav보다 먼저 focus됨
- [x] bottom nav는 keyboard/screen reader로 계속 접근 가능
- [x] scope picker/undated sheet/export layer close 후 focus loss `0`
- [x] unnamed focusable `0`
- [x] 4탭 순서와 visible layout 변화 없음

### Required verification

- [x] targeted `/my`, `/calendar` keyboard E2E
- [x] dialog/sheet/menu focus trap and return E2E
- [x] full E2E because global navigation composition changes
- [x] 390 focus sequence JSON and screenshots
- [x] 1024/1440 desktop navigation regression

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

- [x] current frame의 visible action/input count를 390/1024에서 inventory한다.
- [x] anchor-required Flow와 optional-date Flow의 decision grammar를 분리하되 같은 component contract를 쓴다.
- [x] primary save action과 receipt vocabulary를 일치시킨다.
- [x] secondary date intent는 contextual adjustment 안에서 선택하게 한다.
- [x] adjust entry를 누르면 먼저 `제목·메모`, `날짜`, `항목 선택`, `순서` 목적과 current summary를 보여준다.
- [x] `제목·메모`와 `날짜`는 24-item list를 렌더/탐색하기 전에 접근 가능하게 한다.
- [x] `항목 선택`을 명시적으로 열었을 때만 24개 목록을 group/disclosure로 보여준다.
- [x] selection count, current order, save payload는 기존 projection/overlay에서 derive한다.
- [x] active adjustment mode는 한 번에 하나만 유지한다.
- [x] close/cancel/apply focus return과 unsaved draft behavior를 정의한다.

### Acceptance

- [x] initial save-before row-level edit control `0`
- [x] first viewport primary action `<= 1`
- [x] title/date adjustment click depth가 item selection traversal과 독립
- [x] 24개 include/exclude는 모두 keyboard reachable
- [x] save result count/source/date range가 P29와 동일
- [x] personal overlay, order ID, save payload 변화 `0`
- [x] 390 horizontal overflow/fixed overlap `0`

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

- [x] mobile 1/20/50 Flow fixture에서 visible command inventory를 만든다.
- [x] next action 또는 reopen을 유일한 visible primary로 유지한다.
- [x] 현재 context에서 자주 쓰는 adjust/export 중 최대 2개만 secondary로 둔다.
- [x] source, archive/restore, low-frequency management를 accessible overflow menu로 이동한다.
- [x] overflow trigger에 label, `aria-haspopup`, expanded state를 준다.
- [x] Escape/outside click/selection 후 focus를 trigger로 복귀한다.
- [x] command handler를 새로 만들지 않고 existing action을 호출한다.
- [x] saved receipt와 일반 detail이 같은 command grammar를 사용하게 한다.
- [x] completed/reopened state에서 primary가 중복되지 않게 한다.

### Acceptance

- [x] mobile detail visible primary `1`
- [x] mobile detail visible secondary `<= 2`
- [x] source/archive commands accessible but not peer primary
- [x] completion/reopen control pattern unchanged
- [x] export whole/selected/current scope unchanged
- [x] 20~50 Flow library search/open/detail journey unchanged
- [x] overflow keyboard/focus return pass

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

- [x] Decide a query-gated demo or deterministic E2E fixture; never use real user data.
- [x] Fixture has at least 10 undated items across multiple Flow identities.
- [x] Reproduce select 2 -> choose date -> preview -> apply -> undo.
- [x] Record before/after counts and stable item IDs.
- [x] Verify sheet internal scroll separately from page scroll.
- [x] Label fixture evidence as automated, not observed user.

Acceptance:

- [x] 10 -> 8 undated count after placing 2
- [x] target date agenda gains exactly 2
- [x] undo returns counts and IDs
- [x] page scroll/calendar position unchanged on sheet open/close

### P30-05B scalable Flow scope

- [x] Test 12, 20, and 50+ Flow options.
- [x] Keep selected and current-month groups visible.
- [x] Collapse `다른 Flow` when query is empty.
- [x] Automatically expose matching `다른 Flow` rows during search.
- [x] Preserve draft selection while query/group state changes.
- [x] Apply and close with focus return.

Acceptance:

- [x] closed state scope command `1`
- [x] find and select 2 of 50 in `<= 5` meaningful interactions after opening
- [x] no horizontal chip strip
- [x] selected/month/other counts are projection-derived

### P30-05C compact month identity

- [x] Inventory 1024 truncation examples and marker/color/count availability.
- [x] Prefer marker/color/short count in month cell; avoid storing a new alias.
- [x] Preserve full Flow/item title in selected-day agenda, `title`, and accessible name.
- [x] Keep same-date multi-Flow grouping and personal order tie-break.
- [x] Verify 3~5 same-date Flow compact summary.

Acceptance:

- [x] month cell remains compact at 1024
- [x] selected-day agenda shows full identity and all events
- [x] color-only identification is not required
- [x] event stable identity/occurrence unchanged
- [x] Calendar/ICS projection behavior unchanged

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

- [x] Capture summary and advanced mode at 390/1024.
- [x] Confirm the issue is grouping/copy, not recurrence correctness.
- [x] If no clear problem remains, mark `[~] deferred` and stop.

### Conditional tasks

- [x] Keep compact routine summary and next 3 occurrences.
- [x] Group existing weekday/time/duration fields under `언제`.
- [x] Group none/until/count fields under `언제 끝`.
- [x] Show only fields required by the chosen end mode.
- [x] Review `시간 없음`, `종료일 없음` wording without adding explanation paragraphs.
- [x] Preserve current recurrence projection, UID, completion/reopen behavior.

### Acceptance

- [x] summary fully describes effective routine
- [x] initial advanced field count `0`
- [x] none/until/count matrix remains correct
- [x] one occurrence completion does not mutate series
- [x] no new workout-only execution UI

---

## P30-07 - Legacy Composition Removal Gate

**Priority:** Low maintenance
**Dependency:** P30-03~06 merged and green

### Tasks

- [x] Enumerate route/component consumers of legacy/hybrid branches.
- [x] Classify each as active production, test-only, historical, or dead.
- [x] Capture reviewed route screenshot and marker matrix before deletion.
- [x] Remove only branches with active consumer count `0`.
- [x] Keep projection/persistence functions shared; do not fork.
- [x] Run five-shape/public/source-backed regression.
- [x] Compare visual/DOM behavior; expected difference `0`.
- [x] Put cleanup in a dedicated revertible commit.
- [x] If any live route depends on the branch, document and defer instead of forcing removal.

### Acceptance

- [x] dead branch removed or explicit defer decision recorded
- [x] stable route visual/behavior regression `0`
- [x] P29/P30 marker regression `0`
- [x] app bundle/build remains green

---

## P30-08 - Independent Nested-State Production Closeout

**Priority:** Release gate
**Dependency:** all implemented slices

### Capture scope

- [x] public save-before, adjust, export preflight, saved receipt
- [x] My Flow library/detail, overflow, whole/selected/current export and receipt
- [x] routine summary/advanced, occurrence done/reopened
- [x] Calendar 50+ scope, selected day, undated batch/undo, compact month cell
- [x] 390/1024/1440 responsive matrix
- [x] keyboard focus sequence and dialog/sheet focus return
- [x] source/personal/run/occurrence/export identity reconciliation

### Commands

- [x] `npm.cmd ci`
- [x] `npm.cmd run docs:check`
- [x] `npm.cmd test`
- [x] `npm.cmd run build`
- [x] targeted P30 E2E
- [x] affected P29 regression
- [x] full E2E
- [x] `git diff --check`

### Production closeout

- [x] merge SHA and deployment ID recorded
- [x] canonical production anonymous access confirmed
- [x] production nested-state smoke rerun independently
- [x] fixed-primary overlap `0`
- [x] horizontal overflow `0`
- [x] unnamed focusable `0`
- [x] console/page error `0`
- [x] P29 contract regression `0`
- [x] known gaps and rollback documented
- [x] observed-user count `0` explicitly retained
- [x] owner verdict recorded: `ready_for_owner_observation_decision`, `revise`, or `rollback`

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
