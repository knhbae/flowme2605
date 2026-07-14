# P24 Execution Trust and UX Simplification Plan

## Sequence Rule

정확성 gate가 닫히기 전에 날짜 이동, Calendar tray, export 범위 UI를 열지 않는다. 한 slice는 한 상태 계약 또는 한 사용 행동만 닫고 별도 commit과 회귀 증거를 남긴다.

## Phase 0 - Evidence and Runtime Gate

### P24-00R Baseline and evidence reconciliation

**Goal:** `a9ae10e` clean tracked baseline과 현재 dependency upgrade 후보를 별도 worktree에서 재현해 두 자동 감사의 차이를 설명한다.

**Must establish:**

- Node, package manifest, lockfile, Next, Playwright, command matrix
- clean `npm ci -> docs:check -> test -> build -> test:e2e`
- upgrade-only 환경의 동일 matrix
- KST date, recurrence, memo split, effective-date summary, reuse override, `/flows` hard load, post-save hydration 재현표
- Vercel anonymous access 상태

**Exit:** 각 finding이 `confirmed_clean`, `dirty_only`, `not_reproduced`, `blocked` 중 하나이며 첫 code fix가 하나로 정해진다.

## Phase 1 - Execution Correctness

### P24-00F1 Local date boundary

- 사용자 local calendar date와 UTC serialization을 분리한다.
- KST 00:00~08:59, UTC, DST fixture를 만든다.
- Today, Calendar selected date, 새 draft 기본 날짜를 같은 helper로 검증한다.

### P24-00F2A Effective-date projection parity

- My Flow `다음/먼저 할 일` summary가 전체 목록과 동일한 effective date resolver를 사용한다.
- 항목 날짜 지정, 변경, 제거, 기준일 재계산 후 My Flow/Calendar/ICS가 일치한다.

### P24-00F2B Reuse override policy

- `내가 바꾼 날짜 유지`와 `새 기준일에 맞추기`가 실제로 다른 결과를 낸다.
- 과거 run snapshot은 보존하고 새 run으로 이관할 overlay 범위를 fixture로 고정한다.

### P24-00F3A Recurrence occurrence parity

- 저장 전 recurrence preview와 My Flow, Calendar, ICS의 occurrence 수를 맞춘다.
- 완료/reopen/skip/hold는 occurrence별 execution state로 유지한다.
- Today에는 한 occurrence당 실행 control 한 개만 둔다.

### P24-00F3B Draft Item inclusion and validation

- 메모에서 나눈 calendar/todo Item을 모두 effective list와 export에 포함한다.
- 제목 또는 원하는 결과가 비면 draft를 만들지 않는다.
- 상태 문장을 Flow/Item 제목으로 저장하지 않는다.

### P24-00F4 Entry and hydration reliability

- `/flows` hard navigation과 새로고침을 production build에서 확인한다.
- 저장 후 `/my`가 localStorage commit 뒤 같은 render cycle에서 hydrate되는지 검증한다.
- dev-only 문제와 product 문제를 분리한다.

## Phase 2 - Execution UX Simplification

### P24-00U1 Completion, undo, and Today roles

- Today에는 지금 실행할 occurrence 한 행과 completion checkbox 한 개만 둔다.
- 완료 직후 행을 잠시 유지하고 inline undo 또는 짧은 snackbar를 제공한다.
- 완료 항목은 같은 Flow 안의 접힌 완료 영역에서도 reopen 가능하게 한다.
- `다음 예정`은 필요한 경우 control 없는 보조 정보로 둔다.
- Today/All 탭은 실행/관리 역할로 유지하고 제거 여부는 사용자 관찰 뒤 결정한다.

### P24-00U2 Progressive personal editor

- 첫 화면은 제목, 날짜, 시간, 메모 중심으로 줄인다.
- 반복, duration, decision/record field는 `세부 설정` 또는 Item intent에 따라 조건부 노출한다.
- 기존 값이 있으면 접힌 상태에서 summary를 보이고 열었을 때 값을 보존한다.

## Phase 3 - Schedule Movement

### P24-00S1 Date movement contract

UI 전에 pure contract와 fixture를 만든다.

| Scope | Meaning |
| --- | --- |
| single | 한 Item을 직접 날짜 지정하고 `fixed`로 전환 |
| selected | 선택한 Item을 같은 delta 또는 목표 날짜 정책으로 이동 |
| anchor | Flow의 상대 일정만 재계산하고 fixed override는 유지 |
| occurrence | 이번 회차만 이동 |
| future series | 이번 회차부터 새 recurrence revision |
| whole series | 실행 기록 보존 조건에서 전체 반복 규칙 변경 |

필수 정책은 date removal, undo, history, completed/skipped occurrence, Calendar/ICS/list export projection, timezone/DST다.

### P24-00U3 Calendar unscheduled tray

- Calendar 안에 `날짜 없음` tray와 개수 badge를 둔다.
- 처음에는 명시적 선택과 `날짜 지정`으로 배치한다.
- drag-and-drop은 keyboard/touch 대안과 undo가 준비된 후 별도 개선으로 판단한다.
- My Flow와 tray가 같은 unscheduled effective list를 읽는다.

## Phase 4 - Export Scope

### P24-00S2 Export scope contract and UI

- 범위를 destination보다 먼저 선택한다.
- 기본값은 `전체 Flow`, 보조 범위는 `선택한 항목`, contextual 범위는 `이 항목`이다.
- 결과 Item 수, 날짜 없는 Item 처리, 완료/skipped/excluded/tombstoned 처리, filename을 destination별 fixture로 고정한다.
- Flow header의 compact `가져가기` entry를 재사용하고 item detail export는 명시적으로 `이 항목`이라고 표시한다.
- 선택 이동과 같은 multi-select toolbar를 재사용한다.

## Phase 5 - Incremental Feedback

### P24-00U4 Inline execution notes and reflection aggregation

- 항목에 선택적인 한 줄 `메모` 또는 `수정 제안` entry를 둔다.
- private personal note와 source/creator correction request를 분리한다.
- Flow 완료 시 기존 notes를 모아 보여주고 추가 회고는 선택으로 둔다.
- 외부 전송이나 공개는 명시적 submit 전까지 하지 않는다.

## Phase 6 - Operations and Human Validation

### P24-00OPS1 Public preview and controlled dependencies

- Vercel 관찰 URL을 익명 접근 가능하게 만든다.
- dependency upgrade는 별도 branch/worktree에서만 진행한다.
- critical/high advisory, build, full E2E, rollback을 함께 검증한다.

### P24-00B Observed user journey

- 5명 이상, 1인 3회, 총 15 session
- 첫 사용, 수정/실행, 재방문/재사용
- 설명 없이 행동하는 모습, 오조작, 되돌리기, 기대한 export 범위를 기록
- screen recording과 발화를 동의받아 수집하고 자동 QA와 분리

### P24-00C Keep / Change / Defer

관찰 결과로 Today/All 유지, Calendar tray, edit disclosure, export 범위, inline feedback의 keep/change/defer를 확정한다.

## Deferred Until The Gate Closes

- `P24-01A` source v2 three-way merge contract
- production arbitrary URL fetch and real LLM
- source-backed structural editing
- direct external-account integration
- account/DB/cloud sync
