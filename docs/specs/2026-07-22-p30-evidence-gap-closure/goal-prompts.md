# P30 Copy-Paste Goal Prompts

## 사용 순서

1. 한 번에 한 목표만 실행한다.
2. 앞 slice의 merge/deploy/production evidence가 필요한 dependency를 지킨다.
3. 매 목표 시작 시 clean `origin/main`과 current production을 다시 확인한다.
4. 이전 evidence를 현재 실행 결과처럼 쓰지 않는다.
5. 자동화·agent simulation은 실제 사용자 검증이 아니다.

공통 정본:

- `docs/specs/2026-07-22-p30-evidence-gap-closure/README.md`
- `docs/specs/2026-07-22-p30-evidence-gap-closure/feedback-reconciliation.md`
- `docs/specs/2026-07-22-p30-evidence-gap-closure/spec.md`
- `docs/specs/2026-07-22-p30-evidence-gap-closure/plan.md`
- `docs/specs/2026-07-22-p30-evidence-gap-closure/tasks.md`
- `docs/specs/2026-07-22-p30-evidence-gap-closure/qa.md`
- `docs/content-audit/2026-07-22-flowme-p29-independent-production-review/`가 local에 없으면 source와 production에서 같은 상태를 재현하고 `inaccessible`을 기록한다.
- Claude Design review: `claude_work/FlowMe P29 독립검토 (standalone).html`

---

## P30-01

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-01 Mobile Export Fixed-Layer Correctness를 구현한다.

목표:
모바일 390x844에서 public Flow export preflight와 My Flow export panel을 열었을 때 fixed save CTA 또는 bottom navigation이 primary export action을 덮는 production 오류를 제거한다. export format, 4탭 IA, persistence, source/personal/run/occurrence/export 계약은 변경하지 않는다.

먼저 읽기:
- AGENTS.md
- agent.md
- docs/harness/README.md
- docs/specs/2026-07-22-p30-evidence-gap-closure/{README,feedback-reconciliation,spec,plan,tasks,qa}.md
- components/flow/AppClient.tsx
- components/flow/PlatformNav.tsx
- components/flow/FlowExportPanel.tsx
- app/globals.css
- tests/e2e/p29-coordinated-surface-reset.spec.ts
- 관련 public/My Flow export E2E

시작 전:
- git fetch 후 clean origin/main worktree와 SHA를 기록한다.
- current production에서 아래 두 상태를 다시 재현하고 DOMRect를 기록한다.
  1. /f/moving-d30-basic, export preflight open
  2. /my?demo=ux20&view=flows, export panel open
- 기존 dirty 파일을 revert/delete/stage 하지 않는다.

구현:
- export open state의 fixed-layer ownership을 명시한다.
- public export가 열리면 mobile save CTA를 suppress하거나 충돌 없는 위치로 전환한다.
- My Flow export 마지막 primary까지 bottom-nav + safe-area clearance가 적용되게 한다.
- panel close/receipt transition 후 CTA/nav와 invoking focus를 복구한다.
- 단순 padding 누적이 아니라 nested-state geometry contract로 고정한다.

완료 기준:
- public/My Flow fixed-primary intersection area 0
- primary가 추가 corrective scroll 없이 완전히 보임
- close 후 focus return
- predicted/actual export count 유지
- 1024/1440 layout 변화 없음
- P29 data/identity contract 변화 0

검증:
- 관련 unit
- targeted public/My Flow export E2E
- full E2E
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- git diff --check
- 390/1024 screenshots와 geometry JSON
- deploy 후 canonical production 재검증

marker:
P30-MOBILE-EXPORT-NO-FIXED-OVERLAP

최종 보고:
원인, 수정 파일, layer 정책, geometry 전후, focus 복구, 테스트, screenshot, commit/push/PR/merge/deploy, observed-user count를 구분한다.
```

---

## P30-02

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-02 Mobile Workspace Focus Order를 구현한다.

Dependency:
P30-01이 merge/deploy되고 production marker P30-MOBILE-EXPORT-NO-FIXED-OVERLAP이 green이어야 한다.

목표:
/my와 /calendar 모바일에서 keyboard focus가 header -> fixed bottom tabs -> main content로 역행하는 문제를 고친다. visible 4탭 IA와 링크 목적지는 유지한다.

먼저 읽기:
- P30 spec package 전체
- components/flow/PlatformNav.tsx
- AppClient/layout의 nav-main render order
- CalendarFlowScopePicker.tsx
- 관련 dialog/sheet/export focus E2E

구현:
- desktop navigation과 mobile persistent navigation의 DOM/render 책임을 분리한다.
- mobile sequential order를 header/skip -> current page main -> persistent tabs로 맞춘다.
- scope picker, undated sheet, export panel/menu의 focus trap/return을 유지한다.
- focus sequence recorder가 selector, accessible name, DOM index, rect를 저장하게 한다.

완료 기준:
- /my와 /calendar에서 main action이 bottom nav보다 먼저 focus됨
- bottom nav는 keyboard/screen reader 접근 가능
- dialog/sheet/menu close 후 focus loss 0
- unnamed focusable 0
- visible layout 및 4탭 순서 변화 없음

검증:
- targeted keyboard E2E
- full E2E
- docs/unit/build/git diff check
- 390 focus sequence JSON과 screenshot
- 1024/1440 regression
- deploy 후 production 재검증

marker:
P30-MOBILE-WORKSPACE-FOCUS-ORDER
```

---

## P30-03

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-03 Save-Before Decision And Long-Flow Adjustment를 구현한다.

Dependency:
P30-02 production green.

목표:
/f/moving-d30-basic의 artifact-first preview는 유지하면서 anchor/date intent/조정/save가 경쟁하는 decision surface를 정리하고, 24개 항목 조정에서 제목·메모와 날짜 수정이 full item list보다 먼저 도달되게 한다.

핵심 규칙:
- initial primary action 최대 1개
- initial row-level 수정 0개
- 한 번에 하나의 adjustment purpose만 open
- item selection을 명시적으로 선택했을 때만 24개 전체 표시
- P29 projection/save payload/personal overlay/order identity 재사용

구현:
- 현재 선택값을 요약한 조정 목적 chooser를 만든다.
- 제목·메모, 날짜, 항목 선택, 순서의 진입을 구분한다.
- 제목·날짜는 item list traversal 없이 접근한다.
- 24개 item은 group/disclosure로 모두 keyboard reachable하게 유지한다.
- primary save와 receipt vocabulary를 일치시킨다.
- cancel/apply/focus return과 unsaved state를 정의한다.

비범위:
full planner/editor, schema, source content, AI edit.

완료 기준:
- title/date adjustment가 full item list와 독립
- selection 24개 keyboard reachable
- result count/source/date range 변화 0
- save payload/identity 변화 0
- 390/1024 overflow/overlap 0

검증:
관련 unit, moving targeted E2E, P29 regression, docs/unit/build, 390/1024 current-proposed screenshots.

markers:
P30-SAVE-BEFORE-SINGLE-DECISION
P30-LONG-FLOW-CONTEXTUAL-ADJUST
```

---

## P30-04

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-04 My Flow Next-Action Command Hierarchy를 구현한다.

Dependency:
P30-02 production green. P30-03과 병렬 가능하되 같은 shared action primitive를 수정하면 먼저 통합 계획을 세운다.

목표:
My Flow detail에서 실행 행동과 source/archive/export 관리 행동이 같은 무게로 보이는 문제를 정리한다. next action 또는 reopen을 유일한 primary로 두고, low-frequency action을 accessible overflow로 이동한다.

구현:
- 1/20/50 Flow fixture의 visible command inventory
- next action primary 1개
- contextual adjust/export 중 visible secondary 최대 2개
- source/archive/restore를 accessible overflow로 이동
- overflow aria-haspopup/expanded, Escape/outside/selection focus return
- existing handlers와 stable identities 재사용
- saved receipt와 regular detail command grammar 통일

비범위:
새 tab, server search, permanent delete, migration.

완료 기준:
- visible primary 1, secondary <=2
- source/archive reachable
- completion/reopen pattern 변화 0
- whole/selected/current export 변화 0
- 20~50 Flow search/open/detail journey 유지
- 390/1024 hierarchy screenshot green

marker:
P30-MY-FLOW-COMMAND-HIERARCHY
```

---

## P30-05

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-05 Calendar Scale, Undated Evidence, And Compact Identity를 구현한다.

Dependency:
P30-02 production green. P30-03/P30-04와 병렬 가능.

목표:
Calendar에서 날짜 없는 항목 배치가 production-equivalent fixture로 재현되고, 50+ Flow scope가 길게 펼쳐지지 않으며, 1024 month cell은 compact identity를 보이고 selected-day agenda는 full identity를 보존하게 한다.

P30-05A:
- query-gated demo 또는 deterministic E2E fixture로 10개 undated item 준비
- 2개 선택 -> 날짜 배치 -> agenda 반영 -> undo
- stable IDs/count/page scroll/focus return 검증

P30-05B:
- selected/current-month group visible
- monthCount 0 `다른 Flow`는 query가 없으면 collapsed
- search 중 matching other rows 자동 노출
- 12/20/50+ option fixture와 draft selection 보존

P30-05C:
- month cell은 existing marker/color/count-first compact identity
- selected-day agenda/title/aria는 full Flow/item identity
- persisted alias/custom color는 추가하지 않음

완료 기준:
- 10 -> 8 undated, target date +2, undo 원복
- sheet internal scroll과 page scroll 분리
- 50개 중 2개 검색/선택 5 interactions 이내
- horizontal chip strip 0
- month cell compact, agenda full detail
- event/occurrence/ICS identity 변화 0

markers:
P30-CALENDAR-UNDATED-EVIDENCE
P30-CALENDAR-SCOPE-SCALE
P30-CALENDAR-COMPACT-IDENTITY

검증:
scope/label unit, targeted Calendar E2E, P29 Calendar regression, docs/unit/build, 390/1024 screenshots, production smoke.
```

---

## P30-06

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-06 Routine Advanced Setting Density gate를 수행한다.

Dependency:
P30-03~05 evidence available.

첫 단계:
앱을 수정하기 전에 summary/advanced mode를 390/1024에서 직접 조작하고, 문제가 recurrence correctness가 아니라 grouping/copy인지 판정한다. 명확한 문제가 없으면 구현하지 말고 deferred evidence를 남긴다.

구현이 필요한 경우만:
- compact summary와 next 3 occurrences 유지
- weekday/time/duration을 `언제`로 묶기
- none/until/count를 `언제 끝`으로 묶기
- 선택한 mode에 필요한 field만 표시
- `시간 없음`, `종료일 없음` 문구를 짧고 사용자 중심으로 조정
- recurrence engine, series/occurrence identity, completion/reopen 변경 금지

완료 기준:
- initial advanced fields 0
- effective schedule summary loss 0
- none/until/count matrix pass
- occurrence completion does not mutate series
- workout-only execution UI 신설 0

marker:
P30-ROUTINE-ADVANCED-DENSITY
```

---

## P30-07

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-07 Legacy Composition Removal Gate를 수행한다.

Dependency:
P30-03~06 merged, deployed, and green.

목표:
FlowSaveBeforeFrame/AppClient/SourceBackedFlowMapPage의 legacy/hybrid composition consumer를 조사하고, 실제 사용되지 않는 branch만 제거한다. live route가 하나라도 의존하면 삭제하지 않고 보류한다.

절차:
1. 모든 consumer를 active production/test-only/historical/dead로 분류
2. before route/marker/screenshot matrix 캡처
3. active consumer count 0 branch만 제거
4. projection/persistence helper fork 금지
5. five-shape/public/source-backed visual and behavior diff 0 확인
6. cleanup을 독립 revert 가능한 commit으로 유지

완료 기준:
- dead branch 제거 또는 explicit defer
- stable route UI diff 0
- P29/P30 marker regression 0
- full E2E/build green

주의:
코드 줄 수 감소를 위해 route behavior를 바꾸지 않는다.
```

---

## P30-08

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30-08 Independent Nested-State Production Closeout을 수행한다.

Dependency:
구현된 P30 slice가 모두 merge/deploy됨.

목표:
implementation evidence와 분리된 clean environment에서 P30과 P29 계약을 현재 production 기준으로 재검토하고 final review package를 만든다. 앱 기능은 먼저 수정하지 않는다.

필수 상태:
- public save-before/adjust/export/receipt
- My Flow library/detail/overflow/whole-selected-current export/receipt
- routine summary/advanced/occurrence done-reopened
- Calendar 50+ scope/selected day/undated 10->2->undo/month identity
- 390/1024/1440
- keyboard focus and focus return

필수 검증:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- targeted P30 E2E
- affected P29 regression
- full E2E
- git diff --check
- canonical production browser smoke

목표 수치:
- fixed-primary overlap 0
- horizontal overflow 0
- unnamed focusable 0
- console/page error 0
- count/identity regression 0
- P29 contract regression 0
- observed-user count 0 명시

산출물:
docs/content-audit/2026-07-XX-flowme-p30-final-review-package/
- README.md
- audit.md
- review.html
- route-evidence.json
- journey-results.json
- screenshot-manifest.json
- screenshots/

최종 판정:
ready_for_owner_observation_decision / revise / rollback 중 하나를 evidence로 선택한다. 자동 QA를 사용자 검증으로 표현하지 않는다.

marker:
P30-NESTED-STATE-GATE
```
