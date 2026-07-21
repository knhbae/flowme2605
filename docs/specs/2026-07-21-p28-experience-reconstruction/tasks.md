# P28 Detailed Backlog

## 2026-07-22 실행 상태

| Slice | 상태 | 현재 근거 |
| --- | --- | --- |
| P28-01 | Complete | Hybrid 선택, hard fail 0, architecture package |
| P28-02 | Complete | shared projection/item-role contract와 fixtures |
| P28-03 | Complete | save-before whole outline, actual result, contextual title/date/memo edit |
| P28-04 | Complete | shared routine definition, workout-only completion control 0 |
| P28-05 | Complete | mobile drill-in, wide rail/detail, 27-Flow fixture |
| P28-06 | Complete | 6+ searchable Calendar scope picker, persisted multi-select |
| P28-07 | Complete | five actual-data representative shapes |
| P28-08 | Released | PR #144, merge `9a839d02`, Vercel READY; unit 584/584, P28 E2E 7/7, full E2E 346/346, build 18/18, observed users 0 |

최종 근거는 [P28 final review package](../../content-audit/2026-07-22-p28-final-review-package/README.md)에 있다. 아래 체크리스트는 원래 실행 계약을 보존하며, unchecked 항목을 새 active backlog로 해석하지 않는다.

## 공통 시작 체크

- [ ] `AGENTS.md`, `agent.md`, `docs/harness/README.md`를 읽는다.
- [ ] `git status`, staged/unstaged diff, HEAD, `origin/main`을 기록한다.
- [ ] 기존 dirty 파일을 기능별로 분류하고 revert/delete/stage하지 않는다.
- [ ] current production과 current source의 차이를 기록한다.
- [ ] 이전 evidence를 현재 실행 결과처럼 표현하지 않는다.
- [ ] observed-user count를 명시한다.

## P28-01 비교 시뮬레이션과 아키텍처 결정 gate

**Severity:** Blocking design gate

**목표:** 앱 UI를 수정하지 않고 저장 전, routine, My Flow, Calendar가 공유할 화면 문법을 결정한다.

**입력:**

- 최신 사용자 피드백
- Codex P28 implementation alignment package
- Claude Design P28-00 board
- current production/source
- prior five-case usage preview
- [reference patterns](./reference-patterns.md)

**작업:**

- [ ] current 390/1024/1440 screenshot inventory를 만든다.
- [ ] moving, vehicle, workout, course, contract/trip fixture를 고정한다.
- [ ] saved Flow 1/5/20/50 fixture를 만든다.
- [ ] Calendar Flow scope 2/8/25 fixture를 만든다.
- [ ] Outline-first, Artifact-first, Hybrid 대안을 actual data로 작성한다.
- [ ] save-before, routine occurrence, My Flow, Calendar를 같은 anatomy로 prototype한다.
- [ ] owner feedback 6개 task를 keyboard/mouse로 heuristic simulation한다.
- [ ] action depth, visible control count, duplicate completion count, text block count를 기록한다.
- [ ] decision matrix와 rejected rationale를 작성한다.
- [ ] 선택안이 hard fail이면 수정 후 simulation을 다시 실행한다.

**비범위:** app code, persistence, migration, seed, AI, deploy.

**필수 acceptance:**

- [ ] one shared item row가 ordinary/routine occurrence를 표현한다.
- [ ] workout-only completion selector가 proposed 화면에 없다.
- [ ] actual-data artifact preview가 있다.
- [ ] 1024px 주요 pane은 최대 2개다.
- [ ] Calendar 25 Flow selector가 horizontal chip strip이 아니다.
- [ ] My Flow 20개 fixture에서 browse와 search 역할이 구분된다.
- [ ] mobile primary action은 1개다.
- [ ] owner decision field와 다음 implementation gate가 명확하다.

**Evidence:**

`docs/content-audit/2026-07-21-p28-01-cross-surface-architecture-gate/`

- `README.md`
- `audit.md`
- `review.html`
- `decision-matrix.json`
- `state-fixtures.json`
- `simulation-results.json`
- `screenshots/`

**완료 기준:** 선택 대안 평균 4.0 이상, consistency/cognitive load 각각 4 이상, hard fail 0. 기준 미달이면 implementation으로 가지 않고 P28-01을 반복한다.

## P28-02 Projection, item role, artifact policy contract

**Severity:** Blocking data/view contract

**Dependency:** P28-01 selected anatomy

**목표:** whole Flow, item role, completion eligibility, 다섯 destination을 한 read-only projection으로 제공한다.

**작업:**

- [ ] current `artifact-plan.ts`, execution model, export eligibility inventory를 작성한다.
- [ ] additive item role과 legacy fallback을 정의한다.
- [ ] primary/secondary/blocked/not-applicable policy를 정의한다.
- [ ] whole outline와 다섯 shape row를 같은 effective item identity에서 만든다.
- [ ] destination count/loss note를 pure resolver로 만든다.
- [ ] resource/warning/reference의 completion eligibility를 false로 고정한다.
- [ ] slug-specific policy를 fixture/resolver로 옮길 경계를 정한다.
- [ ] malformed/unknown role이 source item을 삭제하지 않게 한다.

**데이터 영향:** additive type/adapter만 허용. source/personal/run/occurrence/export identity 변경 금지. migration 필요 시 P28-02A contract와 P28-02B migration으로 분리한다.

**비범위:** save-before UI, new source content, AI classification.

**필수 fixtures:**

- [ ] moving Calendar primary
- [ ] vehicle Checklist/Todo primary
- [ ] workout routine Calendar/Flow execution
- [ ] K-MOOC Sheet primary
- [ ] heat action + warning/reference
- [ ] contract Sheet/Memo
- [ ] trip sequence -> scheduled Calendar subset

**필수 tests:**

- [ ] item role x completion truth table
- [ ] item role x destination truth table
- [ ] primary exactly 1 where executable
- [ ] secondary <= 2
- [ ] blocked/not-applicable focusable control 0
- [ ] preview/saved/export count resolver parity
- [ ] malformed role item loss 0
- [ ] source mutation 0

**완료 기준:** consumer가 slug-specific visual policy 없이 projection을 읽을 수 있고, 다섯 shape의 eligibility와 count가 fixtures에 고정된다.

## P28-03 Save-before whole-Flow adjustment workspace

**Severity:** High

**Dependency:** P28-01, P28-02

**목표:** Flow를 찾은 사용자가 저장될 전체 내용과 primary actual-data preview를 보면서 자연스럽게 수정한다.

**Route:** `/f/[slug]`, `/flow-maps/[slug]`, `/flows` existing/proposal.

**작업:**

- [ ] `previewRows.slice(0, 5)`를 whole outline disclosure로 교체한다.
- [ ] 5/14/24/38 item outline count를 지원한다.
- [ ] primary actual-data preview를 연결한다.
- [ ] secondary artifact는 eligible한 경우 최대 2개만 제공한다.
- [ ] title, include/exclude, date, order, memo를 shared editor로 연결한다.
- [ ] date-free item에 날짜를 지정하고 다시 제거할 수 있게 한다.
- [ ] 변경 summary와 save result count를 같은 projection에서 계산한다.
- [ ] cancel writes 0, save atomic commit을 검증한다.
- [ ] receipt와 returning My Flow가 같은 outline grammar를 사용하게 한다.

**우선 vertical:** moving, vehicle, personal memo/URL draft.

**비범위:** routine frequency/end UI(P28-04), source-backed arbitrary authoring, rich text.

**390 acceptance:**

- [ ] header -> outline -> primary preview -> required value -> action 순서
- [ ] title/date edit depth <= 2 from visible outline
- [ ] full outline expansion one action
- [ ] primary action one
- [ ] fixed overlap/horizontal overflow 0

**1024 acceptance:**

- [ ] two-pane max
- [ ] outline과 preview 또는 preview와 editor를 동시에 비교
- [ ] title truncation이 detail 진입을 막지 않음

**E2E:**

- [ ] moving anchor + one fixed item date
- [ ] vehicle undated -> date -> undated
- [ ] personal draft add/reorder/edit
- [ ] save -> receipt -> My Flow count/identity parity
- [ ] keyboard edit/save/cancel/focus return

**완료 기준:** 저장 전 수정 결과가 저장 후 같은 item identity와 값으로 보이고, 설명문 없이 무엇이 저장되는지 예측할 수 있다.

## P28-04 Routine interaction unification

**Severity:** High

**Dependency:** P28-02, P28-03 shared workspace

**목표:** 홈트와 다른 반복 Flow가 같은 schedule, occurrence, completion, resource 문법을 사용한다.

**작업:**

- [ ] `미리보기 범위`와 `series 종료` field/label을 분리한다.
- [ ] 시작일, 주 N회/요일, 시간, 종료 없음/until/count를 shared editor에 연결한다.
- [ ] source-defined duration provenance를 유지한다.
- [ ] `완료/강도 낮춤/휴식으로 변경` special selector를 공통 occurrence actions로 map한다.
- [ ] `강도 낮춤`을 completion state가 아닌 note/adjustment로 다룬다.
- [ ] 영상/공식 안내를 common resource/safety block으로 옮긴다.
- [ ] save-before, My Flow, Today, Calendar가 같은 occurrence row를 사용한다.
- [ ] series definition에는 completion control을 노출하지 않는다.
- [ ] 완료/reopen/skip/hold와 note persistence를 검증한다.

**비범위:** workout coaching, exercise set/reps editor, health outcome scoring, new recurrence engine.

**필수 tests:**

- [ ] open-ended + 4-week preview
- [ ] source-defined 4-week program
- [ ] user until date
- [ ] user occurrence count
- [ ] weekdays/time edit and reload
- [ ] done -> reopened
- [ ] skipped != deleted, held != skipped
- [ ] resource completion control 0
- [ ] same occurrence identity across surfaces
- [ ] source-backed behavior regression

**완료 기준:** workout-only execution control count 0, preview/end confusion marker 0, same occurrence/control across Find Flow/My Flow/Calendar.

## P28-05 My Flow information architecture reconstruction

**Severity:** High

**Dependency:** P28-01 shared anatomy, P28-03 whole outline, P28-04 occurrence row

**목표:** 저장한 Flow를 훑고 찾고 열고 조정하는 장기 사용 화면을 production-grade hierarchy로 만든다.

**작업:**

- [ ] 1/5/20/50 Flow current inventory를 캡처한다.
- [ ] mobile list -> detail, wide library rail -> selected workspace를 prototype한다.
- [ ] duplicate selected-Flow dropdown/list control을 제거한다.
- [ ] browse first, search/filter utility policy를 적용한다.
- [ ] card에 title, content shape, next action, date range/undated, progress만 남긴다.
- [ ] same-date item grouping을 whole outline에 적용한다.
- [ ] selected Flow detail은 save-before와 같은 header/outline/item/resource anatomy를 사용한다.
- [ ] receipt는 temporary band로만 추가한다.
- [ ] adjustment/export/archive를 contextual secondary commands로 정리한다.
- [ ] archive/undo/restore와 completed/reopen을 유지한다.

**비범위:** dashboard analytics, social proof, permanent delete primary UI, cross-device search.

**390 acceptance:**

- [ ] 3 action 이하로 임의 Flow detail 도달
- [ ] back 후 library scroll/selection 복구
- [ ] bottom nav와 sticky action overlap 0
- [ ] card 안 text/control overlap 0

**1024 acceptance:**

- [ ] selected Flow와 library context 동시 유지
- [ ] stretched mobile cards/duplicate select 0
- [ ] detail pane에서 whole outline와 item detail 전환 가능

**완료 기준:** owner feedback에서 “무엇을 보여주려는지 모르겠다”를 만든 중복/불명확 section이 제거되고, 1/5/20/50 fixture가 같은 library grammar를 쓴다.

## P28-06 Calendar multi-Flow scale and shared event UI

**Severity:** High

**Dependency:** P28-02 projection, P28-04 occurrence, P28-05 common row

**목표:** 다수 Flow scope 선택이 확장되고 ordinary/routine event가 같은 agenda 문법을 쓴다.

**작업:**

- [ ] current horizontal scope strip를 2/8/25 Flow에서 측정한다.
- [ ] Flow count adaptive picker를 구현한다.
- [ ] 6+ Flow에서는 single trigger + searchable sheet/popover를 사용한다.
- [ ] selected count, current month count, recent Flow, clear/reset을 제공한다.
- [ ] scope를 grid/agenda/count/undated/date move/export에 동일 적용한다.
- [ ] routine event special panel을 common agenda detail로 흡수한다.
- [ ] same-date group와 compact grid summary를 유지한다.
- [ ] undated placement queue를 유지한다.

**비범위:** calendar sync, drag-and-drop planner, new month engine.

**필수 tests:**

- [ ] 1 Flow filter hidden
- [ ] 2~5 compact scope
- [ ] 8/25 searchable picker
- [ ] select 2, reset all, reload state
- [ ] grid/agenda/count/tray parity
- [ ] workout ordinary occurrence row
- [ ] keyboard picker, focus return
- [ ] 390/1024 horizontal overflow 0

**완료 기준:** 25 Flow fixture에서 visible Flow controls가 bounded되고, 모든 calendar consumer가 동일 scope와 item identity를 사용한다.

## P28-07 Five-shape representative content and export gate

**Severity:** High integration

**Dependency:** P28-02~06

**목표:** 다섯 결과 형태를 actual data로 보여주고 대표 콘텐츠와 export까지 같은 projection을 사용한다.

**작업:**

- [ ] Flow execution, Calendar, Checklist/Todo, Sheet, Memo renderer를 연결한다.
- [ ] primary와 secondary actual-data preview를 제공한다.
- [ ] expected item/row/event count와 loss note를 제공한다.
- [ ] moving, vehicle, workout, course, heat/contract/trip representative fixtures를 실행한다.
- [ ] sourceTrace, rights, safety, hold/source_import_required를 감사한다.
- [ ] source 없는 case에 fake item 0을 확인한다.
- [ ] whole/selected/item export scope parity를 재검증한다.
- [ ] user adjustment가 각 destination에 일관되게 반영되는지 확인한다.

**비범위:** 5개의 고정 tabs, 모든 콘텐츠 backfill, AI/crawler.

**완료 기준:** 다섯 shape 각각 actual-data screenshot이 있고, 의미 없는 destination UI 0, preview/generated/receipt count mismatch 0, fake source item 0.

## P28-08 Integrated regression and independent review

**Severity:** Release gate

**Dependency:** release scope의 P28-01~07 완료

**목표:** P28이 P27 correctness를 되돌리지 않았고 owner feedback을 실제 current 화면에서 해결했는지 독립적으로 재검토한다.

**작업:**

- [ ] clean `origin/main` 또는 release branch에서 current SHA를 기록한다.
- [ ] docs/unit/build/targeted/full E2E를 실행한다.
- [ ] 390/1024/1440 screenshot matrix를 생성한다.
- [ ] current/proposed/implemented 차이를 한 review package에 정리한다.
- [ ] owner feedback 6개를 journey simulation으로 다시 실행한다.
- [ ] Codex independent correctness review를 실행한다.
- [ ] Claude Design independent hierarchy review를 실행한다.
- [ ] Blocking/High를 reconciliation한다.
- [ ] STATUS/ROADMAP/DECISIONS/HISTORY를 실제 결과에 맞게 갱신한다.
- [ ] commit/push/PR/merge/deploy 상태를 분리해 기록한다.

**필수 결과:**

- [ ] preview/save/receipt/My Flow/Calendar/export count mismatch 0
- [ ] workout-only completion control 0
- [ ] Calendar scope horizontal overflow 0
- [ ] unnamed visible focusable 0
- [ ] keyboard trap/focus loss 0
- [ ] source mutation 0
- [ ] observed-user count 정확히 표기

**완료 기준:** automated/browser Blocking/High 0, independent review의 공통 Blocking/High 0, owner가 다음 단계 진행 가능으로 판단. owner가 아직 관찰 수준이 아니라고 판단하면 P28을 기능 완료로 과장하지 않고 replan한다.

## 다음 실행 목표

`P28-01 비교 시뮬레이션과 아키텍처 결정 gate`를 먼저 수행한다. 이 목표는 앱 코드를 수정하지 않으며, current/proposed prototype과 decision matrix로 P28-02 이후의 구현 방향을 고정한다.
