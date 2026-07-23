# FlowMe P26 전체 UX/UI 개발 프로그램

- 기준 production: `https://flowme2605.vercel.app`
- 기준 코드: `origin/main` `192a60a19909c3c9990ddb0955c7b339ac4b7ae7`
- 검토 방식: independent automated simulation + heuristic review
- 실제 관찰 사용자: `0명`
- 최종 판정: `structural_correction_required`

## 실행 원칙

1. `source -> personal overlay -> execution run -> occurrence -> export` 계약을 먼저 닫는다.
2. public, source-backed Flow Map, personal memo draft가 저장 이후에는 같은 실행 모델로 합류해야 한다.
3. 390px에서는 현재 행동 하나와 짧은 편집 sheet를 우선하고, 1024px에서는 rail-list-detail 또는 tray-calendar-agenda 구조를 사용한다.
4. AI, 계정, 외부 API 연동은 P26 범위가 아니다.
5. 각 항목은 unit, targeted E2E, 390/1024 screenshot evidence를 함께 남긴다.

## Evidence marker

| Marker | 근거 |
|---|---|
| `EV-VER-01` | clean origin/main에서 docs 2528 links, unit 526/526, build 18 pages 통과 |
| `EV-VER-02` | full E2E 285/286, washer public preview 1건 실패 후 동일 테스트 단독 재실행 1/1 통과 |
| `EV-DATE-01` | 빈 날짜 + 예시 모드에서 `anchor: 2026-07-20`이 저장된 production state |
| `EV-UNDATED-01` | 숨겨진 '다른 방법'으로 날짜 미정 저장, tray 10 -> 배치 9 -> 제거 10 확인 |
| `EV-RECEIPT-01` | moving 특수 CTA는 `/my`, 일반 public CTA는 `/my?savedFlow=...` |
| `EV-RECURRENCE-01` | public ICS 1 RRULE, My Flow Calendar export 0, Calendar에 series 정의 3 + occurrence 1 |
| `EV-MEMO-01` | 제주 메모 5개 행동이 draft 2개로 생성되고 한 항목에 결합됨 |
| `EV-WHOLE-01` | moving 전체 24개 행의 긴 mobile Flow와 반복되는 row action |
| `EV-EDITOR-01` | mobile inline basic/advanced editor와 wide detail pane 비교 |
| `EV-EXPORT-01` | Flow 전체 24, 직접 선택 2, 개인 draft checklist 3/TSV 4행/ICS 1 확인 |
| `EV-MULTI-01` | 3개 저장 Flow의 My Flow와 동일 날짜 다중 Flow Calendar |
| `EV-PUBLIC-01` | new-car 12개 artifact보다 보류 기준이 먼저 큰 면적을 차지 |
| `EV-SOURCE-01` | `getPreviewAnchor` 결과가 `saveFlowRecord(... anchor: displayAnchor)`로 저장됨 |
| `EV-SOURCE-02` | memo comma split은 모든 절이 action regex를 통과할 때만 수행됨 |
| `EV-SOURCE-03` | My Flow export는 `flow.rows`의 실제 date가 있어야 calendar eligible |
| `EV-REF-01` | Things/Structured의 undated inbox, Todoist/TickTick의 template-occurrence 구분 |
| `EV-REF-02` | TripIt import receipt, Google/Apple/Microsoft의 list-calendar 역할 구분 |

## 프로그램 순서

| 단계 | 항목 | 실행 관계 |
|---|---|---|
| Foundation/Correctness | P26-01~05 | P26-01 선행. P26-02/03/04는 이후 병렬 가능. P26-05가 foundation 통합 게이트 |
| Core Journey/IA | P26-06~09 | P26-06 -> P26-07 순차. P26-08/09는 foundation 이후 병렬 가능 |
| Editing/Execution | P26-10~13 | P26-10/11 병렬, 이후 P26-12/13 |
| Calendar/Export | P26-14~16 | P26-03/05 선행. P26-14/15 병렬, P26-16 통합 |
| Visual/Responsive | P26-17~18 | IA와 editor 구조 확정 후 P26-17 -> P26-18 |
| Integration/Final Review | P26-19~20 | 모든 구현 이후 순차 |

---

## Foundation/Correctness

### P26-01 Date intent contract

- **문제:** public date input이 비어 있어도 preview용 날짜가 실제 저장 anchor가 된다.
- **사용자 영향:** 검사일을 정하지 않은 사용자가 10개 일정을 특정 날짜에 저장하고 Calendar/ICS까지 오염시킬 수 있다.
- **Route:** `/f/vehicle-inspection-prep`, `/f/moving-d30-basic`, 반복·timeline public routes, `/my`, `/calendar`.
- **UX/UI 방향:** 날짜 설정을 `날짜 정하기`, `날짜 없이 저장`, `예시만 보기` 3상태 segmented control로 기본 노출한다. 예시 상태의 primary CTA는 `예시로 둘러보기`이며 저장하려면 의도를 다시 고르게 한다.
- **데이터 영향:** persisted anchor에 `mode: custom|undated`만 허용한다. `example`은 transient preview state로만 유지한다. 기존 example 저장본 migration 규칙과 export eligibility를 정의한다.
- **구현 범위:** public anchor component, save record adapter, existing localStorage migration, copy, tests.
- **비범위:** 외부 Calendar API, 자연어 날짜 인식, 서버 migration.
- **선행 의존성:** 없음. P26 전체의 첫 순차 항목.
- **390/1024 검증:** 390에서 3상태와 primary CTA가 첫 viewport 안에 보이고 sticky CTA 문구가 상태에 맞는다. 1024에서 입력/상태/preview가 한 setup 영역에 정렬된다.
- **접근성:** radiogroup 또는 segmented buttons에 name/pressed state 제공. 날짜 input과 상태 변경 feedback을 live region으로 연결.
- **Unit/E2E:** example state가 저장 anchor를 만들지 않는 unit; blank/custom/undated 3경로; refresh persistence; Calendar/ICS counts.
- **Evidence marker:** `EV-DATE-01`, `EV-UNDATED-01`, `EV-SOURCE-01`, `EV-REF-01`.
- **완료 기준:** 사용자가 명시적으로 날짜를 고르지 않으면 saved run의 dated item과 ICS event가 0이고, 예시 preview와 저장 데이터가 분리된다.

### P26-02 Canonical save receipt and route parity

- **문제:** moving 전용 CTA는 `/my`로 이동해 저장 직후 receipt를 우회하고, 일반 public CTA는 query를 포함한다.
- **사용자 영향:** 같은 제품에서 저장 성공 확신과 다음 행동이 route마다 다르다.
- **Route:** `/f/*`, `/flow-maps/*`, `/my?savedFlow=`, `/my?savedMap=`.
- **UX/UI 방향:** 모든 저장 성공은 canonical receipt로 이동한다. receipt는 저장 이름, 포함 항목 수, dated/undated 수, 첫/마지막 날짜, 반복 여부, `바로 시작`, `전체 Flow`, `Calendar`, `가져가기`를 같은 순서로 제공한다.
- **데이터 영향:** receipt query는 일회성 UI pointer이며 saved identity를 바꾸지 않는다. source-backed map과 public bundle 모두 동일 receipt view model을 사용한다.
- **구현 범위:** duplicate save CTA 제거, canonical handoff helper, receipt model, held-content variant.
- **비범위:** toast-only success, server activity log.
- **선행 의존성:** P26-01.
- **390/1024 검증:** 390 receipt에서 전체 항목을 스크롤 없이 모두 보여줄 필요는 없지만 count와 phase summary는 첫 viewport에 표시. 1024는 receipt와 compact outline을 나란히 배치.
- **접근성:** 저장 후 focus를 receipt heading으로 이동. route change와 saved count를 status로 알림.
- **Unit/E2E:** 모든 indexable public slug가 canonical query를 생성하는 contract test; moving/vehicle/source-backed/held E2E.
- **Evidence marker:** `EV-RECEIPT-01`, `EV-PUBLIC-01`.
- **완료 기준:** 어느 저장 CTA를 사용해도 동일한 receipt가 나타나며 저장된 전체 수와 실제 My Flow rows가 일치한다.

### P26-03 Recurrence series and occurrence contract

- **문제:** public routine ICS는 RRULE 1개를 만들지만 saved My Flow export는 Calendar 0개이며 series 정의가 undated tray에 섞인다.
- **사용자 영향:** 사용자는 반복 루틴이 저장·Calendar·ICS 중 어디에서 몇 개로 존재하는지 예측할 수 없다.
- **Route:** `/f/washer-tub-clean-monthly`, routine `/f/*`, `/my`, `/calendar`, ICS export.
- **UX/UI 방향:** definition은 `반복 설정`, occurrence는 `이번 회차`로 라벨링한다. Calendar와 Today에는 occurrence만 노출하고 definition은 Flow settings에 둔다. export preview는 `반복 일정 1개, 표시 회차 N개`로 구분한다.
- **데이터 영향:** stable seriesId/revisionId/occurrenceId 유지. definition을 undated row로 투영하지 않는다. source routine과 personal recurrence가 같은 export adapter를 사용한다.
- **구현 범위:** projection adapters, My Flow calendar eligibility, series export, completion/reopen semantics, labels.
- **비범위:** 알림 발송, 복잡한 cron UI, infinite future materialization.
- **선행 의존성:** P26-01. P26-02/04와 병렬 가능.
- **390/1024 검증:** mobile Flow card에는 다음 회차와 반복 규칙만, wide detail에는 definition editor와 occurrence history를 분리한다.
- **접근성:** `이번 회차 완료`, `다시 열기`, `반복 전체 수정`의 accessible name에 scope 포함.
- **Unit/E2E:** public/My Flow ICS parity; RRULE/EXDATE/RECURRENCE-ID; one occurrence complete/reopen; tray exclusion.
- **Evidence marker:** `EV-RECURRENCE-01`, `EV-SOURCE-03`, `EV-REF-01`.
- **완료 기준:** public와 My Flow의 같은 routine은 동일한 series UID/RRULE을 내보내고 Calendar에 definition 중복이 없다.

### P26-04 Deterministic memo segmentation and review contract

- **문제:** 한 clause가 action regex에 없으면 comma list 전체가 한 item으로 남는다.
- **사용자 영향:** 사용자가 쓴 5개 실행 의도가 하나의 긴 할 일이 되어 Flow 전환 가치가 사라진다.
- **Route:** `/flows` memo intake, draft preview, `/my` personal draft.
- **UX/UI 방향:** newline, checkbox, ordinal, comma/그리고를 clause 후보로 분리하되 원문 조각을 항상 보여준다. 불확실한 분리는 묶어서 표시하고 `나누기/합치기`로 수정한다. 저장 전 item count와 결과 제목을 즉시 확인한다.
- **데이터 영향:** source fragment ID, source text span, deterministic suggestion ID를 보존한다. parser가 내용을 생성하지 않고 경계만 제안한다.
- **구현 범위:** parser vocabulary, partial-list algorithm, source-to-item mapping, draft review controls, fixtures.
- **비범위:** AI generation, semantic rewriting, URL crawling.
- **선행 의존성:** P26-01 이후 병렬 가능.
- **390/1024 검증:** 390에서 원문과 결과를 한 행에 억지로 병치하지 않고 source disclosure를 사용. 1024는 source/result 2열 review.
- **접근성:** split/merge control이 대상 clause를 이름에 포함. reorder는 버튼과 keyboard 모두 제공.
- **Unit/E2E:** 제주 예문이 최소 5 action items로 분리; `여권, 지갑, 우산 챙기기`는 하나로 유지; stable IDs on edit/reload.
- **Evidence marker:** `EV-MEMO-01`, `EV-SOURCE-02`.
- **완료 기준:** 사용자 예문의 5개 행동이 별도 후보로 보이고 저장 전 합치기/제외가 가능하다.

### P26-05 Projection identity and migration gate

- **문제:** date, overlay, occurrence, export projection이 각 기능별로 성장해 route parity를 자동으로 보장하지 못한다.
- **사용자 영향:** 수정은 저장됐지만 Calendar/ICS/Today 중 하나에 반영되지 않는 회귀가 생길 수 있다.
- **Route:** all save, edit, Calendar, export paths.
- **UX/UI 방향:** 사용자 화면 추가보다 계약 검증에 집중한다. debug evidence에는 source ID, personal stable ID, run ID, series/occurrence ID를 구분한다.
- **데이터 영향:** canonical projection matrix와 localStorage migration version을 추가한다. 기존 user-created item, source item, date override, tombstone, completion을 보존한다.
- **구현 범위:** projection adapters, migration, golden fixtures, invariant tests, developer evidence only.
- **비범위:** 사용자에게 내부 ID 노출, server persistence.
- **선행 의존성:** P26-01, P26-03, P26-04.
- **390/1024 검증:** UI 변화가 없더라도 six-journey state snapshot을 두 viewport에서 비교한다.
- **접근성:** state migration 후 focus/labels가 기존 item identity와 연결되는지 회귀 검증.
- **Unit/E2E:** add/delete/restore/reorder/date move/remove/complete/reopen/export matrix; malformed legacy storage fallback.
- **Evidence marker:** `EV-VER-02`, `EV-EXPORT-01`, `EV-MULTI-01`.
- **완료 기준:** 모든 projection이 한 effective item set과 stable identity를 사용하고 migration 후 데이터 손실이 없다.

---

## Core Journey/Information Architecture

### P26-06 Unified save-before artifact frame

- **문제:** public/source-backed routes가 저장 전 artifact, setup, safety, source 설명을 서로 다른 순서로 보여준다.
- **사용자 영향:** 저장 단위와 조정 시점을 route마다 다시 배워야 한다.
- **Route:** `/f/*`, `/flow-maps/*`.
- **UX/UI 방향:** `무엇이 저장되는가 -> 언제 실행되는가 -> primary action` 순서의 공통 frame. 첫 viewport에는 title, source, item/phase count, 3~5 row preview, schedule intent, save action만 둔다.
- **데이터 영향:** 없음. 공통 view model이 source/public variants를 소비한다.
- **구현 범위:** shared frame/component, content slots, preview summary, CTA hierarchy.
- **비범위:** content seed rewrite, creator page redesign.
- **선행 의존성:** P26-01, P26-02, P26-04.
- **390/1024 검증:** 390 first viewport에 artifact + action이 함께 보임. 1024는 artifact와 setup 2열이되 동일 reading order 유지.
- **접근성:** DOM order는 mobile/wide 동일. collapsed details summary가 keyboard reachable.
- **Unit/E2E:** moving/vehicle/routine/new-car snapshot and semantic count tests.
- **Evidence marker:** `EV-WHOLE-01`, `EV-PUBLIC-01`.
- **완료 기준:** 설명을 열지 않아도 item count, save unit, date intent, primary/secondary action을 말할 수 있다.

### P26-07 Post-save decision hub

- **문제:** 저장 receipt가 있는 route도 다음 행동의 우선순위가 고정되지 않고 export는 다시 Flow를 찾아야 한다.
- **사용자 영향:** 저장 성공 후 바로 실행할지 전체를 볼지 가져갈지 흐름이 끊긴다.
- **Route:** `/my?savedFlow=`, `/my?savedMap=`.
- **UX/UI 방향:** receipt를 one-time decision hub로 정의한다. primary는 `첫 할 일 시작`, secondary는 `전체 Flow`, tertiary는 `Calendar`와 `가져가기`.
- **데이터 영향:** transient receipt state only. saved run은 기존 record 유지.
- **구현 범위:** receipt CTA model, schedule summary, held state, dismiss/back behavior.
- **비범위:** onboarding carousel, notification prompt.
- **선행 의존성:** P26-02, P26-06.
- **390/1024 검증:** mobile은 CTA 2개 + overflow menu, wide는 summary/outline/actions 3영역.
- **접근성:** focus management, success status, dismiss returns to predictable tab.
- **Unit/E2E:** six content types; browser back/reload; no duplicate run creation.
- **Evidence marker:** `EV-RECEIPT-01`, `EV-REF-02`.
- **완료 기준:** 저장 직후 사용자가 전체 저장 수를 확인하고 한 번의 action으로 실행·전체 보기·export 중 하나로 이동한다.

### P26-08 My Flow role and navigation IA

- **문제:** page title과 subtab이 모두 `내 Flow`이고 지금/전체/완료의 역할이 설명 없이 겹친다.
- **사용자 영향:** 재방문 사용자가 현재 할 일과 저장한 계획 전체를 오가며 현재 위치를 재해석해야 한다.
- **Route:** `/my`.
- **UX/UI 방향:** page는 `My Flow`, tabs는 `지금 / Flow 목록 / 완료`. 지금은 cross-flow execution queue, Flow 목록은 project inventory, 완료는 reopen/history로 역할을 고정한다.
- **데이터 영향:** 없음. filter state와 URL query optional.
- **구현 범위:** labels, default tab rules, cross-flow counters, empty states, wide rail behavior.
- **비범위:** team assignment, server search.
- **선행 의존성:** P26-05, P26-07. P26-09와 병렬 가능.
- **390/1024 검증:** 390 bottom nav와 subtab을 혼동하지 않음. 1024 rail 선택 시 본문에 선택 Flow workspace를 열고 all state에서는 overview 유지.
- **접근성:** tabs role/selected state, heading hierarchy, focus return from detail.
- **Unit/E2E:** 0/1/3/20 Flow states, held exclusion, completed/reopen path.
- **Evidence marker:** `EV-MULTI-01`.
- **완료 기준:** 지금, 저장한 전체 계획, 완료 항목의 차이가 각 화면의 첫 heading과 content로 드러난다.

### P26-09 Whole Flow reading model

- **문제:** 전체 Flow가 모든 row control을 반복하는 긴 목록이라 plan, checklist, timeline을 한눈에 읽기 어렵다.
- **사용자 영향:** 24개 이사 Flow에서 phase와 날짜 흐름보다 `열기/메모` 버튼이 더 반복된다.
- **Route:** `/my` Flow 목록, post-save outline.
- **UX/UI 방향:** 기본은 phase-grouped outline. row는 checkbox, title, date/status, open icon만 노출한다. phase summary와 progress를 고정하고 optional `타임라인 보기`는 날짜형 Flow에만 제공한다.
- **데이터 영향:** 없음. existing rows grouped by effective section/date.
- **구현 범위:** outline rows, phase headers, compact progress, show-more, optional view mode.
- **비범위:** kanban, Gantt, arbitrary custom views.
- **선행 의존성:** P26-05, P26-08.
- **390/1024 검증:** 390에서 24개 Flow를 phase 단위로 접고 펼칠 수 있음. 1024에서 list + detail pane, phase index 활용.
- **접근성:** disclosure names include phase/count; row action order predictable; no nested interactive controls inside button.
- **Unit/E2E:** 3/10/24 item flows, excluded/tombstoned/recurring variants.
- **Evidence marker:** `EV-WHOLE-01`, `EV-EDITOR-01`.
- **완료 기준:** 24개 Flow의 phase, date range, next action, completion progress를 상세 설명 없이 스캔할 수 있다.

---

## Editing/Execution

### P26-10 Quick edit and advanced editor separation

- **문제:** title/date/memo와 time/duration/repeat가 한 inline editor에 누적된다.
- **사용자 영향:** 작은 수정도 긴 form과 주변 Flow controls 사이에서 수행해야 한다.
- **Route:** `/my` item detail, Calendar agenda item detail.
- **UX/UI 방향:** quick edit는 title, date/undated, memo만. `시간·반복 더보기`에서 advanced sheet/pane을 연다. mobile은 bottom sheet/full-screen editor, wide는 persistent detail pane.
- **데이터 영향:** existing draft and structural schedule fields 유지. commit boundary를 quick/advanced로 분리하되 atomic save.
- **구현 범위:** editor shell, field prioritization, save/cancel, dirty-state guard, responsive variants.
- **비범위:** natural language scheduler, timezone conversion UI redesign.
- **선행 의존성:** P26-05, P26-09. P26-11과 병렬 가능.
- **390/1024 검증:** 390 editor가 Flow card 높이를 늘리지 않고 safe-area 위에 표시. 1024 side pane width와 sticky actions 안정.
- **접근성:** dialog semantics, focus trap/return, escape cancel, labels/error association.
- **Unit/E2E:** quick edit only, advanced edit, cancel, reload persistence, date/time/recurrence projection.
- **Evidence marker:** `EV-EDITOR-01`.
- **완료 기준:** title/date/memo 변경은 2 taps 이내, advanced fields는 명시적 disclosure 이후에만 보인다.

### P26-11 Structural edit and batch mode

- **문제:** add/delete/restore/reorder와 batch selection이 서로 다른 위치와 row controls에 흩어져 있다.
- **사용자 영향:** 개인 draft를 정리할 때 실행과 편집 모드가 혼재해 실수 위험이 크다.
- **Route:** `/my` personal draft whole Flow.
- **UX/UI 방향:** `구성 편집` 모드에서만 reorder handle, delete, restore, batch actions를 노출한다. normal mode는 execution controls만 유지한다.
- **데이터 영향:** source-owned item overlay와 user-created item ownership, tombstone, order rank 유지.
- **구현 범위:** mode switch, multi-select toolbar, undo receipt, recovery section, keyboard reorder.
- **비범위:** source-backed 원본 구조 수정, version tree.
- **선행 의존성:** P26-04, P26-05, P26-09.
- **390/1024 검증:** 390 fixed batch toolbar가 bottom nav와 겹치지 않음. 1024 list multi-select와 detail pane selection이 충돌하지 않음.
- **접근성:** select all, selection count live region, move up/down accessible names, delete confirmation.
- **Unit/E2E:** source/user item add-delete-restore-reorder, reload, export order, stable identity.
- **Evidence marker:** `EV-MEMO-01`, `EV-EXPORT-01`.
- **완료 기준:** normal mode에는 구조 편집 control이 없고, 편집 모드에서는 선택/순서/복구 결과를 저장 전 예측할 수 있다.

### P26-12 Completion, reopen, and immediate undo

- **문제:** 완료 후 item 위치가 바뀌며 reopen은 완료 tab에서 찾아야 하고 automation locator도 이동 중 불안정했다.
- **사용자 영향:** 실수 완료를 되돌리는 경로가 순간 toast와 별도 tab 사이로 나뉜다.
- **Route:** `/my` now/Flow list/completed, `/calendar` agenda.
- **UX/UI 방향:** 완료 직후 stable undo bar를 제공하고, 완료 tab에는 동일 checkbox/reopen label을 사용한다. recurring occurrence는 `이번 회차 완료/다시 열기`로 구분한다.
- **데이터 영향:** completion event identity와 occurrence execution record 유지. undo는 새 record 삭제가 아니라 prior state 복원.
- **구현 범위:** action labels, optimistic transition, undo duration, completed view row.
- **비범위:** audit log UI, streak/gamification.
- **선행 의존성:** P26-03, P26-05, P26-10.
- **390/1024 검증:** undo bar가 mobile nav를 가리지 않음. wide에서는 active row/detail focus가 유지됨.
- **접근성:** state change live announcement, checkbox name includes title and occurrence date.
- **Unit/E2E:** item/occurrence complete, undo, later reopen, reload, export status.
- **Evidence marker:** `EV-VER-02`, `EV-RECURRENCE-01`, `EV-MULTI-01`.
- **완료 기준:** 완료와 취소가 같은 item identity에서 reversible하며 사용자가 이동한 위치와 복원 결과를 이해한다.

### P26-13 Reuse with a new anchor

- **문제:** legacy public saved Flow는 item date override는 가능하지만 Flow 전체 기준일을 다시 설정할 수 없다.
- **사용자 영향:** 반복 가능한 이사/여행 계획을 새 날짜로 재사용하려면 다시 public page를 찾아 저장해야 한다.
- **Route:** `/my` saved timeline, source-backed personal copy, public saved bundle.
- **UX/UI 방향:** Flow menu에 `새 기준일로 다시 쓰기`. 기존 run을 덮지 않고 new execution run을 만들며 fixed item overrides의 유지/초기화를 선택한다.
- **데이터 영향:** source identity 유지, new run ID 생성, personal overlay clone policy, completion reset, occurrence history 분리.
- **구현 범위:** reuse preview, anchor calculation diff, copy name, confirmation receipt.
- **비범위:** version history browser, shared templates marketplace.
- **선행 의존성:** P26-01, P26-02, P26-05, P26-12.
- **390/1024 검증:** 390에서 date + override policy만 보이는 compact sheet. 1024에서 old/new date comparison.
- **접근성:** destructive overwrite가 아님을 copy와 accessible description으로 명시.
- **Unit/E2E:** legacy/source-backed/routine variants; old completion retained; new run export dates.
- **Evidence marker:** `EV-RECEIPT-01`, `EV-WHOLE-01`.
- **완료 기준:** moving saved Flow에서 새 이사일로 독립 run을 만들고 기존 run과 fixed override 정책이 명확하다.

---

## Calendar/Export

### P26-14 Undated inbox and batch scheduling

- **문제:** 날짜 미정 기능은 유용하지만 public에서 숨겨져 있고 Calendar tray의 의미가 설명 없이 `날짜 정하기`로만 보인다.
- **사용자 영향:** 사용자는 언제 undated로 저장해야 하는지, Calendar에 왜 없는지 이해하기 어렵다.
- **Route:** public setup, `/my`, `/calendar`.
- **UX/UI 방향:** 이름을 `날짜 없는 할 일`로 유지하되 subtitle을 `아직 일정에 놓지 않은 실행 항목`으로 고정한다. tray에서 multi-select -> target date preview -> commit. date 제거는 같은 tray로 돌아옴을 미리 표시.
- **데이터 영향:** unscheduled state 명시, series definition 제외, date override removal reversible.
- **구현 범위:** public state visibility, tray copy, batch preview, undo, empty state.
- **비범위:** automatic scheduling AI, capacity optimization.
- **선행 의존성:** P26-01, P26-03, P26-05.
- **390/1024 검증:** mobile tray는 bottom sheet/collapsed count, wide tray는 fixed rail. 10개 선택 시 controls가 밀리지 않음.
- **접근성:** selected count/status, date picker label, batch commit summary.
- **Unit/E2E:** 10 -> 9 -> 10 tray counts, one/multiple schedule, remove, reload, ICS count.
- **Evidence marker:** `EV-UNDATED-01`, `EV-REF-01`.
- **완료 기준:** undated 저장 이유와 Calendar 배치 결과를 primary path에서 설명 없이 이해하고 되돌릴 수 있다.

### P26-15 Calendar grouping and Flow differentiation

- **문제:** 같은 날짜 여러 Flow가 grid cell에서 잘리고 color initials에 의존한다.
- **사용자 영향:** 월간 밀도를 비교하거나 특정 Flow의 일정을 찾기 어렵다.
- **Route:** `/calendar`.
- **UX/UI 방향:** grid는 count + concise chips만, selected-day agenda는 Flow별 group with color/initial/title. filter는 all/Flow/routine이며 selected Flow rail과 동기화한다.
- **데이터 영향:** effective date and occurrence rows only; grouping metadata 추가.
- **구현 범위:** month cell density, day agenda grouping, Flow filter, selected state.
- **비범위:** week/day time-grid, external calendar sync.
- **선행 의존성:** P26-03, P26-05, P26-08. P26-14와 병렬 가능.
- **390/1024 검증:** 390 selected date agenda가 calendar 아래 자연스럽게 이어짐. 1024 3열에서 title truncation은 rail이 아닌 agenda에서 해소.
- **접근성:** calendar grid keyboard navigation, selected date announcement, chip accessible name includes Flow.
- **Unit/E2E:** same date 2+ flows, occurrence + ordinary items, filtering, selected-day persistence.
- **Evidence marker:** `EV-MULTI-01`, `EV-RECURRENCE-01`.
- **완료 기준:** 같은 날짜의 서로 다른 Flow와 반복 occurrence를 색만 보지 않고 이름과 group으로 구분한다.

### P26-16 Unified export scope and result contract

- **문제:** Flow/selected는 whole panel에, current item은 detail에 있고 routine calendar count가 public와 불일치한다.
- **사용자 영향:** 누르기 전에 rows/events와 반복 방식, 제외 항목 처리를 완전히 예측할 수 없다.
- **Route:** public artifact workbench, `/my` whole Flow/item detail, `/calendar`.
- **UX/UI 방향:** 공통 export sheet에서 scope `Flow 전체 / 선택 항목 / 현재 항목`, format, result count, date eligibility, recurrence summary 순서. 실행 후 receipt에 filename/count/omissions 표시.
- **데이터 영향:** one export plan contract; effective items and canonical recurrence adapter 사용; stable UID and source reference 유지.
- **구현 범위:** shared panel, scope adapter, preview, result receipt, output golden tests.
- **비범위:** direct API integrations, XLSX redesign beyond current rows.
- **선행 의존성:** P26-03, P26-04, P26-05, P26-14, P26-15.
- **390/1024 검증:** 390 sheet에서 scope/format/result를 한 viewport 단위로 단계화. 1024 side panel with preview table.
- **접근성:** scope radiogroup, disabled reason in text, download status live region.
- **Unit/E2E:** whole/selected/item; undated ICS 0; one scheduled ICS 1; routine RRULE 1; checklist/TSV/memo order/count.
- **Evidence marker:** `EV-EXPORT-01`, `EV-RECURRENCE-01`, `EV-SOURCE-03`.
- **완료 기준:** 모든 surface에서 같은 scope 용어와 count를 사용하고 실제 output rows/events가 preview와 일치한다.

---

## Visual System/Responsive

### P26-17 Execution component and copy system

- **문제:** route별 card, CTA label, badge, explanation style가 누적되어 같은 행동이 다른 모양과 문구를 가진다.
- **사용자 영향:** 화면마다 새로운 hierarchy를 학습하고 중요한 safety copy와 일반 설명의 강도가 구분되지 않는다.
- **Route:** public, My Flow, Calendar, editor, export.
- **UX/UI 방향:** tokens와 components를 `ArtifactSummary`, `ScheduleIntent`, `FlowOutlineRow`, `ExecutionRow`, `Receipt`, `EditorShell`, `ExportPlan`으로 정리. primary/secondary/icon action 규칙과 copy length budget 설정.
- **데이터 영향:** 없음.
- **구현 범위:** visual tokens, component consolidation, icon/tooltips, copy prune map, focus/error states.
- **비범위:** brand redesign, illustration/marketing landing page.
- **선행 의존성:** P26-06~16의 interaction contract 확정.
- **390/1024 검증:** 동일 component가 density variant만 바꾸고 DOM/meaning은 유지. color alone 금지.
- **접근성:** WCAG contrast, 44px touch targets, visible focus, icon labels/tooltips.
- **Unit/E2E:** component states and visual regression; long Korean title fixtures.
- **Evidence marker:** `EV-PUBLIC-01`, `EV-EDITOR-01`, `EV-MULTI-01`.
- **완료 기준:** 같은 행동은 같은 label/component를 사용하고 primary action은 화면당 하나로 읽힌다.

### P26-18 Responsive workspace composition

- **문제:** wide는 일부 3-pane을 사용하지만 My Flow는 큰 summary와 card stack이 남고 mobile은 inline editor가 긴 document를 만든다.
- **사용자 영향:** desktop 효율과 mobile 집중성이 모두 제한된다.
- **Route:** `/my`, `/calendar`, public save-before, editor/export sheets.
- **UX/UI 방향:** mobile은 single-column execution + modal sheets. wide My Flow는 rail/outline/detail, Calendar는 tray/grid/agenda. min/max widths와 sticky regions를 공통 shell에 고정한다.
- **데이터 영향:** 없음.
- **구현 범위:** responsive layout, safe-area, sticky boundaries, pane selection, overflow controls.
- **비범위:** tablet-specific third breakpoint beyond necessary constraints.
- **선행 의존성:** P26-17 and all structural screens.
- **390/1024 검증:** 390x844 and 1024x768 exact screenshot matrix; no horizontal overflow, content occlusion, fixed nav collision, or layout shift.
- **접근성:** DOM order logical when panes rearrange; focus not lost on breakpoint change.
- **Unit/E2E:** resize tests, long title/content, keyboard pane navigation, viewport screenshot diffs.
- **Evidence marker:** `EV-EDITOR-01`, `EV-MULTI-01`, `EV-WHOLE-01`.
- **완료 기준:** mobile/wide가 같은 hierarchy를 공유하면서 각 viewport의 interaction model이 다르게 최적화된다.

---

## Integration/Final Review

### P26-19 Six-journey evidence harness

- **문제:** 현재 full E2E는 한 번에 285/286이었고 isolated retry는 통과해 stability와 UX evidence를 분리해 보아야 한다.
- **사용자 영향:** 자동화 flake를 제품 실패로 오인하거나 실제 계약 회귀를 놓칠 수 있다.
- **Route:** A~F journeys at production-like local build and production smoke.
- **UX/UI 방향:** 사용자 화면 변경이 아니라 evidence harness. action, tap depth, item/date/status/identity/export count, console/page error, overflow, keyboard/accessibility snapshot을 구조화한다.
- **데이터 영향:** test fixtures only; production state schema assertions.
- **구현 범위:** deterministic reset, bounded journey specs, screenshot naming, evidence JSON, flake retry record.
- **비범위:** 실제 사용자 validation, performance lab, visual AI grading.
- **선행 의존성:** P26-01~18.
- **390/1024 검증:** six journeys × two viewports, fresh and returning localStorage isolation.
- **접근성:** keyboard-only path, accessible names, focus return, reduced-motion where relevant.
- **Unit/E2E:** docs/unit/build; targeted journey suite; full suite; production smoke after deploy.
- **Evidence marker:** `EV-VER-01`, `EV-VER-02`.
- **완료 기준:** one command produces pass/fail JSON and screenshots with explicit automation limitations; isolated-only pass is not reported as clean full pass.

### P26-20 Production final review and P27 handoff

- **문제:** 구현 완료 기록만으로 production UX completion을 판단하면 route-specific contradictions가 남을 수 있다.
- **사용자 영향:** P26 완료가 문서상 완료와 실제 production 경험으로 분리될 수 있다.
- **Route:** production A~F journeys and all changed routes.
- **UX/UI 방향:** independent closeout board with current screenshots, contract matrix, findings, no observed-user claims. Blocking/High 0을 요구한다.
- **데이터 영향:** migration audit, source/personal/run/occurrence/export contract sign-off.
- **구현 범위:** deploy evidence, clean-origin verification, production simulation, closeout docs, P27 defer list.
- **비범위:** 실제 사용자 모집·인터뷰, P27 feature implementation.
- **선행 의존성:** P26-19, deployment complete.
- **390/1024 검증:** exact viewports plus no-overflow/focus/console matrix.
- **접근성:** keyboard journey and accessible-name evidence included in closeout.
- **Unit/E2E:** docs, unit, build, targeted/full E2E, production smoke with SHA match.
- **Evidence marker:** all markers.
- **완료 기준:** production에서 P26 acceptance가 재현되고 Blocking/High 0, full suite clean or explicitly approved known-flake policy, P27 handoff가 확정된다.

## P26 final review 조건

1. 예시 날짜는 저장 데이터와 export에 절대 들어가지 않는다.
2. 모든 public save는 같은 receipt와 whole-Flow confirmation을 제공한다.
3. routine public/My Flow/Calendar/ICS가 같은 series/occurrence 계약을 사용한다.
4. 제주 메모 예문이 5개 행동 후보로 분리되고 저장 전 review할 수 있다.
5. moving 24개 Flow가 phase outline으로 읽히고 기준일 재사용이 가능하다.
6. mobile editor는 contained surface, wide editor는 detail pane으로 동작한다.
7. undated item은 explicit inbox이며 series definition이 섞이지 않는다.
8. export scope/count/result가 실제 output과 일치한다.
9. 390/1024 overflow, fixed overlap, console/page errors, keyboard/focus blocker가 없다.
10. clean origin/main docs/unit/build/targeted/full E2E와 deployed production smoke가 기록된다.

## P27로 넘길 항목

- Google Calendar, Apple Calendar, Notion, Obsidian, todo API 직접 연동.
- 계정, 서버 저장, 동기화, 협업, 공유 권한.
- AI URL/memo generation과 provider 운영 gate.
- 알림, 추천 scheduling, habit streak, analytics.
- 전체 version history와 source update merge UI.

## 사용자 관찰 전에 닫을 항목

- P26-01~05 correctness contracts.
- P26-02/07 저장 receipt 일관성.
- P26-03/14/16 recurrence-undated-export contradiction.
- P26-04 memo segmentation baseline.
- P26-10 mobile editor containment.
- P26-19 deterministic evidence harness.

이 항목들은 전문가 시뮬레이션으로 확인 가능한 기본 계약 문제다. 실제 관찰 사용자를 투입하기 전에 제품 내부에서 먼저 닫아야 한다.
