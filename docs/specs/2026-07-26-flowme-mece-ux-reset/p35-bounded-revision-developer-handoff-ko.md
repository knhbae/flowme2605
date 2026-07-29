# FlowMe P35 bounded composition revision 개발 handoff

- 작성일: 2026-07-27
- 작업 위치: `D:\flowme2605\flow-p35-mece-ux-reset`
- 현재 branch: `codex/p35-mece-ux-reset`
- 기준 HEAD 및 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- P35 구현 상태: 기준 HEAD 위의 미커밋 로컬 변경
- 현재 프로그램 판정: `revise`
- 권장 방식: `bounded_composition_revision`
- 전면 구조 재개방: 하지 않음
- 데이터 migration: 권장 범위에서는 없음
- 실제 관찰 사용자 수: `0`
- 바로 다음 목표: `P35-R0`

## 1. 이 문서의 역할

이 문서는 완료된 `UXR-00`~`UXR-09`와 로컬 P35 후보 구현
`P35-01`~`P35-08` 위에서 후속 UX 수정을 진행하기 위한 개발 정본이다.

다음 내용을 하나로 고정한다.

1. 현재 완료 상태와 publish 상태
2. Claude Design과 Codex 독립 검토의 공통 결론
3. 두 검토의 우선순위 충돌에 대한 최종 해석
4. `P35-R0`~`P35-R7` 실행 순서
5. 각 slice의 범위, 비범위, 데이터 경계, rollback, 검증
6. 개발 에이전트가 바로 사용할 첫 `/goal`

이 문서는 기존 P35 방향을 폐기하는 새 UX 프로그램이 아니다. P35가 만든
화면 소유권과 데이터 경계를 유지하면서 저장 전후의 약속, 실행 단위,
항목 수정 진입, receipt 연결을 제한적으로 보완한다.

## 2. 개발자가 가장 먼저 지켜야 할 사항

### 2.1 작업 트리

반드시 다음 작업 트리에서 시작한다.

```text
D:\flowme2605\flow-p35-mece-ux-reset
```

현재 P35 앱 변경 전체가 미커밋 상태이므로 `origin/main`에서 새 clean worktree를
만들어 바로 개발하면 P35 기반이 사라진다.

- 기존 modified/untracked 경로를 P35 후보 baseline으로 취급한다.
- `git reset`, `git checkout --`, `git clean`, 임의 stash를 사용하지 않는다.
- 기존 변경을 되돌리거나 정리하지 않는다.
- 개발 전후에 이번 slice가 소유한 diff만 별도로 확인한다.
- commit, push, PR, merge, deploy는 별도 요청 없이는 하지 않는다.

### 2.2 한 번에 한 slice

한 번에 `P35-R0` 하나만 구현한다.

- R0 acceptance가 모두 통과하기 전에 R1을 시작하지 않는다.
- R0 작업 중 R1~R7 문제를 함께 고치지 않는다.
- 테스트를 통과시키기 위해 삭제된 P35 UI나 중복 command를 되살리지 않는다.
- 다음 slice 제안보다 현재 slice의 결과와 rollback 가능성을 먼저 보고한다.

### 2.3 보존할 데이터 계약

다음 계층은 합치거나 다시 작성하지 않는다.

1. source와 published Flow
2. personal overlay
3. personal structural overlay
4. execution run
5. recurrence series와 occurrence
6. whole, selected, current export identity와 receipt
7. 기존 localStorage 키와 저장 데이터

구체적으로 다음을 금지한다.

- source-backed 원본을 개인 값으로 덮어쓰기
- 완료 상태를 structural overlay에 저장
- 개인 메모와 제외 상태를 같은 필드로 표현
- 반복 회차 완료로 series 정의 변경
- 기준일 재계산으로 개인 고정 날짜와 메모 덮어쓰기
- 기존 개인 사본, 완료 기록, occurrence, export identity 삭제
- UX 단순화를 명목으로 storage schema 변경

## 3. 먼저 읽을 자료

### 3.1 저장소 규칙

1. `D:\flowme2605\flow-p35-mece-ux-reset\AGENTS.md`
2. `D:\flowme2605\flow-p35-mece-ux-reset\agent.md`

### 3.2 기존 UXR 및 P35 기준

1. [전체 계획](./plan.md)
2. [설계 패키지](./design-package.md)
3. [UXR-06~07 시뮬레이션](./simulation.md)
4. [기존 A-prime 개발 handoff](./developer-handoff-a-prime-ko.md)
5. [기존 P35 goal prompts](./p35-goal-prompts-ko.md)
6. [P35 최종 로컬 gate](../../content-audit/2026-07-26-p35-08-final-mece-gate/README.md)

### 3.3 후속 독립 검토

Codex 정본:

1. [Codex 독립 검토 README](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/README.md)
2. [Severity audit](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/audit.md)
3. [후속 구현 프로그램](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/next-program.md)
4. [결정 matrix](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/decision-matrix.json)
5. [Surface ownership](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/surface-ownership.json)
6. [완료 audit](../../content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/completion-audit.md)

Claude Design 원본:

```text
D:\flowme2605\flow-mvp\claude_work\디자인 판정 및 구현 우선순위.zip
```

ZIP 내부 주요 파일:

```text
FlowMe P35 독립 검토.dc.html
```

Claude 자료는 P35 Preview 직접 interaction이 아니라 오프라인 screenshot과 상태
JSON을 사용한 설계 검토다. Codex 검토는 로컬 P35 production build 조작과 source를
대조했다. 둘 다 실제 사용자 관찰은 아니다.

### 3.4 실행 화면

- P35 Preview: `https://flowme2605-n5o0dw81h-flowme.vercel.app`
- 현재 Production 비교: `https://flowme2605.vercel.app`

Preview가 인증으로 막히면 interaction을 완료했다고 표현하지 않는다. 로컬 build,
current source, screenshot 근거를 구분해 기록한다.

## 4. 현재 상태

### 4.1 UXR

| 범위 | 상태 | 의미 |
| --- | --- | --- |
| `UXR-00`~`UXR-05` | `completed` | 여정, 화면 메시지, 기능 소유권, route tree, 상태 계약 확정 |
| `UXR-06` | `completed` | 390px, 1024px interactive wireflow |
| `UXR-07` | `completed` | 5개 콘텐츠, 15개 multi-session cell, 80개 상태 simulation |
| `UXR-08` | `approved` | A-prime KEEP/CUT 및 화면 소유권 승인 |
| `UXR-09` | `completed` | P35-01~08 순서와 rollback 확정 |

`UXR-07` 완료는 heuristic simulation 완료를 의미한다. 실제 사용자 관찰이나
production UX 검증 완료를 의미하지 않는다.

### 4.2 P35 로컬 구현

| Slice | 목적 | 로컬 상태 |
| --- | --- | --- |
| `P35-01` | entry router와 3탭 navigation | implemented |
| `P35-02` | public result-first | implemented |
| `P35-03` | 한 번에 한 종류의 조정 | implemented |
| `P35-04` | My Flow 안전 분리와 dead view 정리 | implemented |
| `P35-05` | My Flow library와 focused workspace | implemented |
| `P35-06` | Calendar date lens | implemented |
| `P35-07` | scope-first export | implemented |
| `P35-08` | final MECE gate | local gate pass 기록 |

기존 기록:

- pretest: `74 / 74`
- unit: `590 / 590`
- P35 targeted E2E: `30 / 30`
- full E2E: `356 / 356`
- build: pass

이 수치는 기존 P35 evidence에 기록된 결과다. 후속 개발 에이전트는 이를 현재
실행 결과로 복사하지 말고 자신의 변경 후 필요한 검증을 다시 실행한다.

### 4.3 Publish 상태

| 단계 | 상태 |
| --- | --- |
| local P35 edits | 존재, 미커밋 |
| Preview deploy | 존재 |
| commit | P35 전체 변경 기준 없음 |
| push | 없음 |
| PR | 없음 |
| main merge | 없음 |
| production deploy | 없음 |
| observed-user evidence | 0명 |

## 5. 확정된 제품·화면 방향

### 5.1 유지

다음 P35 방향은 다시 열지 않는다.

1. 전역 탐색은 `Flow 찾기 / 캘린더 / 내 Flow` 3개다.
2. `/`는 별도 Home이 아니라 저장 상태 기반 entry router다.
3. public Flow는 설명보다 실제 결과를 먼저 보여 준다.
4. 저장 전 조정은 한 번에 한 종류만 연다.
5. My Flow는 library와 선택한 개인 Flow workspace를 분리한다.
6. Calendar는 날짜가 있는 여러 Flow를 보는 cross-Flow lens다.
7. export는 format보다 whole, selected, current 범위와 count를 먼저 보여 준다.
8. 콘텐츠마다 primary artifact 하나와 가치 있는 secondary artifact 최대 두 개만
   제안한다.
9. 모든 콘텐츠에 Calendar, Checklist, Sheet, Memo, Routine을 고정 탭으로
   노출하지 않는다.

### 5.2 수정

다음 연결만 단계적으로 수정한다.

1. 파생 날짜가 이미 지난 경우의 저장 전후 피드백
2. public preview와 실제 export artifact의 이름, 수량, 손실 정합성
3. 저장 전 contextual Item 수정
4. 저장 receipt와 개인 workspace의 연속성
5. 콘텐츠 형태별 실행 단위
6. 비어 있는 기록 UI의 조건부 노출
7. 개인 메모 제안의 긴 폼
8. 모바일 Calendar 선택일 상세 composition

### 5.3 제거 또는 숨김

- duplicate post-save receipt
- 저장 후 4개 행동이 경쟁하는 decision hub presentation
- history가 없을 때의 고정 기록 탭
- memo/guide에 합성한 `다음 행동`
- public 화면의 2단 export disclosure
- 콘텐츠 형태와 무관한 고정 artifact 선택 탭

### 5.4 하지 않을 것

- 전면 My Flow rewrite
- 새 Today route
- full pre-save editor
- 4번째 전역 탭
- full planner 또는 goal dashboard
- account, DB, cloud sync
- 실제 AI 생성, crawler
- OAuth 직접 연동
- storage schema 및 migration
- source, run, occurrence, export identity 재작성

## 6. 두 독립 검토의 통합 판정

| 주제 | Claude Design | Codex | 통합 결정 |
| --- | --- | --- | --- |
| 전체 방향 | `revise`, 구조 유지 | `revise`, 구조 유지 | `bounded_composition_revision` |
| 첫 화면 | 과거 항목이 먼저 나오는 문제를 최우선 | 형태 무관 단일 next row 문제 | `P35-R0`에서 dated first group부터 교정 |
| Artifact | routine 라벨과 occurrence 의미 부족 | preview와 export artifact/count 불일치 | `P35-R1`에서 같은 plan으로 통합 |
| 저장 전 Item 수정 | 필요하지만 관찰 뒤 깊이 결정 | title/detail/date bounded edit 필요 | `P35-R2`에서 세 필드만 구현 |
| Receipt | 전체 확인은 있으나 이후 첫 화면 문제 | duplicate receipt와 4-path hub 문제 | `P35-R3`에서 receipt 한 번으로 축소 |
| My Flow | shape별 라벨과 날짜 묶음 필요 | shape-aware execution unit 필요 | `P35-R4`에서 공통 execution adapter |
| 기록 | event가 없으면 숨기기 | optional history, memo/reflection 분리 | `P35-R4`에서 조건부 노출 |
| Memo draft | 핵심 관찰 범위 제한 | 14-input long form은 공통 문법 위반 | `P35-R5`에서 공통 result grammar 적용 |
| Calendar | 기존 date lens 유지 | 모바일 agenda가 월 grid 아래로 멀다 | `P35-R6`에서 container만 교체 |
| Migration | draft overlay 검토 필요 | 기존 overlay adapter로 가능 | migration 금지, 필요해지면 중단·보고 |

### 6.1 우선순위 충돌 해결

Claude의 첫 slice는 `지난 항목 경고 + 첫 화면 날짜 묶음`이고, Codex의 첫
slice는 `artifact preflight parity`다.

둘을 한 번에 구현하지 않는다.

1. Claude의 작은 blocker를 `P35-R0`으로 먼저 처리한다.
2. 기존 Codex 프로그램의 `P35-R1`~`P35-R7` 번호는 유지한다.
3. R0가 R4의 전체 shape-aware workspace를 미리 구현하지 않도록 dated Flow에
   한정된 adapter로 만든다.
4. R4에서 같은 adapter를 checklist, routine, sheet, memo 형태로 확장한다.

### 6.2 저장 전 편집의 관찰 전 구현 여부

저장 전 Item 수정 필요성은 이미 제품 오너가 명시한 요구다. 따라서 기능의 존재
자체를 다시 관찰로 결정하지 않는다.

다만 편집 깊이는 제한한다.

- 구현: 제목, 상세 내용, 개별 날짜
- 보류: 추가, 삭제, 순서 변경, 고급 반복, 시간, 장소, section 편집

한 Item을 한 번에 수정하는 contextual sheet/inspector만 허용한다.

## 7. 최종 실행 순서

```text
P35-R0 temporal first-group correction
  -> P35-R1 artifact preflight parity
       -> P35-R2 contextual pre-save Item personalization
       -> P35-R3 receipt and workspace continuity
            -> P35-R4 shape-aware execution and optional history
            -> P35-R6 mobile Calendar selected-day composition
       -> P35-R5 memo proposal grammar
P35-R0~R6
  -> P35-R7 final independent gate
```

직렬 기본 순서:

```text
R0 -> R1 -> R2 -> R3 -> R4 -> R5 -> R6 -> R7
```

R6는 R3 이후 R4와 병렬 가능하지만, 현재 미커밋 대형 worktree에서는 충돌 위험을
줄이기 위해 직렬 진행을 기본으로 한다.

## 8. P35-R0 상세 목표

### 8.1 목표

기준일 역산 Flow에서 이미 지난 파생 항목이 있을 때 저장 전에 그 사실을 알리고,
저장 후에는 사용자가 실제로 다음에 실행할 같은 날짜의 미완료 항목 묶음을 먼저
보게 한다.

### 8.2 사용자 문제

이사일을 입력한 뒤 저장했을 때 첫 My Flow 화면이 `지난 할 일 1건`으로 시작하면,
사용자는 방금 저장한 24개 계획이 이미 실패한 것처럼 받아들인다.

같은 날짜에 미완료 항목이 여러 개 있어도 한 항목씩만 보이면 오늘 처리해야 할
전체 작업량을 예측할 수 없다.

### 8.3 적용 route

- `/f/moving-d30-basic`
- 저장 직후 receipt에서 여는 개인 Flow
- `/my`
- `/calendar`와의 count/identity 비교

### 8.4 적용 콘텐츠

우선 기준은 dated relative-anchor Flow다.

- 대표: 이사 D-30
- 회귀 확인: 날짜 없는 차량 점검
- 회귀 확인: 반복 홈트
- 회귀 확인: 학습 Sheet
- 회귀 확인: Memo/Guide

R0에서는 dated Flow 외 형태의 실행 단위를 새로 설계하지 않는다.

### 8.5 동작 규칙

#### 저장 전

기준일이나 anchor가 입력되면 effective 개인 날짜를 기준으로 미완료 항목을 나눈다.

- `past`: 오늘보다 이전
- `today`: 오늘
- `future`: 오늘보다 이후
- `undated`: 날짜 없음

past 항목이 하나 이상이면 결과/조정 영역에 한 줄짜리 compact warning을 표시한다.

필수 정보:

- 지난 항목 수
- 가장 이른 지난 날짜 또는 범위
- 저장 후에도 삭제되지 않는다는 사실

긴 설명 카드나 새 설정 폼은 추가하지 않는다.

#### 저장 후 첫 실행 묶음

dated Flow의 첫 실행 단위 선택 우선순위:

1. 오늘의 미완료 항목 묶음
2. 가장 가까운 미래 날짜의 미완료 항목 묶음
3. 미래 항목이 없으면 가장 가까운 과거 날짜의 미완료 항목 묶음
4. 미완료 dated 항목이 없으면 기존 완료/전체 계획 상태

같은 effective date의 미완료 Item은 하나의 묶음으로 표시한다.

묶음에는 다음만 기본 노출한다.

- 날짜
- 남은 항목 수
- Item 제목
- 기존 완료/다시 열기 primitive

지난 미완료 항목 전체 목록은 별도 접힌 묶음으로 유지한다. 삭제하거나 완료 처리하지
않는다.

#### 날짜 precedence

그룹 계산은 기존 effective date precedence를 그대로 사용한다.

```text
개인 고정 날짜
> 개인 기준일에서 재계산한 날짜
> source/published 날짜
> 날짜 없음
```

새 날짜 precedence를 만들지 않는다.

#### Calendar parity

- 같은 stable Item identity가 My Flow와 Calendar에서 같은 날짜를 읽어야 한다.
- My Flow 같은 날짜 묶음의 count와 Calendar selected-day agenda의 미완료 count가
  일치해야 한다.
- R0에서 Calendar 완료·재개 command를 늘리지 않는다.

### 8.6 예상 영향 파일

실제 ownership을 다시 확인한 뒤 최소 범위만 수정한다.

- `components/flow/AppClient.tsx`
  - `getSavedFlowNextRow`
  - My Flow next/execution presentation
  - `지난 할 일` 분기
- `lib/flow/whole-flow-reading.ts`
  - 기존 날짜/section group 계산 재사용 또는 작은 pure adapter
- `lib/flow/my-flow-local-ia.ts`
  - presentation contract가 필요할 때만
- `components/flow/PublicFlowAdjustmentPanel.tsx`
  - 저장 전 compact warning 진입
- 관련 unit test
- 새 targeted E2E:
  - `tests/e2e/p35-r0-temporal-first-group.spec.ts`

가능하면 `AppClient.tsx` 안에 새 대형 inline 분기를 추가하지 않는다. dated next
group 계산은 pure function으로 두고 R4에서 확장 가능하게 한다.

### 8.7 비범위

- public Item title/detail/date editor
- artifact eligibility와 export format
- receipt command 정리
- checklist/routine/sheet/memo 실행 단위
- 기록 event UI
- Calendar bottom sheet
- 날짜 자동 이동
- 과거 항목 자동 제외 또는 자동 완료
- schema, localStorage key, migration

### 8.8 데이터 영향

| 계층 | 변경 |
| --- | --- |
| source | 없음 |
| published Flow | 없음 |
| personal overlay | 기존 값을 읽기만 함 |
| structural overlay | 없음 |
| execution run | 기존 완료 상태를 읽기만 함 |
| recurrence | 없음 |
| export identity | 없음 |
| localStorage | key/schema/write 변화 없음 |

새 persistence write가 필요해지면 구현을 중단하고 이유를 보고한다.

### 8.9 Rollback

- dated next group 계산을 별도 adapter로 둔다.
- 기존 `getSavedFlowNextRow`를 R0에서 삭제하지 않는다.
- 새 adapter 호출을 제거하면 기존 single-row presentation으로 돌아갈 수 있어야 한다.
- storage rollback이나 migration rollback이 필요하면 R0 범위를 넘은 것이다.

### 8.10 접근성

- warning은 focus를 강제로 이동시키지 않는다.
- 날짜 묶음 heading과 Item count를 스크린리더가 읽을 수 있어야 한다.
- 완료 후 행이 사라지면 기존 snackbar undo를 유지한다.
- 행이 남으면 기존 체크 해제로 다시 연다.
- 접힘 영역은 native `details/summary` 또는 동등한 accessible disclosure를 사용한다.
- 390px에서 bottom navigation이나 fixed command가 묶음 내용을 가리지 않는다.

### 8.11 Acceptance

기능:

- 일부 과거, 일부 미래 Item이 있는 이사 Flow에서 저장 전 past count가 정확하다.
- 저장 직후 첫 실행 단위는 가장 가까운 실행 가능한 날짜 묶음이다.
- 같은 날짜의 미완료 Item이 모두 한 묶음에 보인다.
- 지난 Item은 보존되고 접힌 묶음에서 접근 가능하다.
- 완료 후 next group이 안정적으로 갱신된다.
- 다시 열기 후 원래 날짜 묶음에 복귀한다.
- reload 후 같은 개인 날짜와 완료 상태가 유지된다.
- 날짜 없는 차량 점검의 기존 첫 실행 동작은 변하지 않는다.
- routine series/occurrence projection은 변하지 않는다.

정합성:

- My Flow와 Calendar의 title, date, count, stable identity가 일치한다.
- whole/selected/current export 결과는 R0 전후 동일하다.
- source/personal/run/occurrence/export 경계 변화가 없다.

Responsive:

- 390x844 horizontal overflow 0
- 390x844 fixed overlap 0
- 1024x768 semantic 내용 parity
- 1440x900 wide workspace 회귀 0

Screenshot marker:

- `P35-R0-PAST-DATE-WARNING-390`
- `P35-R0-NEXT-DATE-GROUP-390`
- `P35-R0-NEXT-DATE-GROUP-1024`

E2E marker:

- `p35-r0-temporal-first-group.spec.ts`

### 8.12 검증

최소:

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/p35-r0-temporal-first-group.spec.ts
```

관련 회귀:

```powershell
npm.cmd run test:e2e -- tests/e2e/p35-my-flow-library-workspace.spec.ts
npm.cmd run test:e2e -- tests/e2e/p35-calendar-lens.spec.ts
npm.cmd run test:e2e -- tests/e2e/p35-final-mece-gate.spec.ts
```

공유 next-row/date projection을 넓게 수정했다면 full E2E를 실행한다.

```powershell
npm.cmd run test:e2e
```

마지막:

```powershell
git diff --check
```

## 9. P35-R1~R7 요약

## P35-R1. Primary artifact preflight parity

목적:

- public preview와 외부 가져가기가 같은 artifact plan을 읽게 한다.
- 반복 Flow의 provisional schedule과 committed 개인 schedule을 구분한다.

범위:

- primary 1개, eligible secondary 최대 2개
- artifact 이름, count, destination, 빠지는 정보 정합성
- moving 24, vehicle 10, workout series/occurrence, study 8, guide 4 고정 검증

비범위:

- selected/current public export
- 새 artifact 종류
- export identity 변경

핵심 acceptance:

- preview, preflight, receipt, My Flow, export count parity
- 시작일 미확정 routine은 확정 Calendar event처럼 보이지 않음
- `P35-R1-PUBLIC-PREFLIGHT-MOVING-390`
- `P35-R1-PUBLIC-PREFLIGHT-SHAPES-1024`

## P35-R2. Contextual pre-save Item personalization

목적:

- 저장 전에 한 Item의 제목, 상세, 날짜를 고칠 수 있게 한다.

범위:

- public preview/포함 항목 row에서 contextual sheet 또는 wide inspector
- 한 번에 하나의 Item
- title, detail, date
- 저장 후 기존 personal overlay로 승격

비범위:

- add/delete/reorder
- time/location/advanced recurrence
- full editor
- source mutation

핵심 acceptance:

- 2 tap 이하 진입
- 열린 editor 1개
- 저장 전후 title/detail/date parity
- Escape, cancel, focus return
- `P35-R2-CONTEXTUAL-ITEM-EDIT-390`
- `P35-R2-ITEM-INSPECTOR-1024`

## P35-R3. Saved receipt와 personal workspace continuity

목적:

- 저장 확인을 한 번만 하고 같은 개인 Flow workspace로 이어 간다.

범위:

- receipt: 저장 이름, count, date range, source
- primary action: `저장한 전체 Flow 보기`
- duplicate receipt와 4-path hub presentation 제거
- Calendar/export는 workspace secondary command

비범위:

- 저장 schema
- library IA
- execution projection

핵심 acceptance:

- receipt primary 1개
- My Flow duplicate receipt 0
- 같은 selected Flow로 직접 진입
- reload 후 선택 유지

## P35-R4. Shape-aware execution unit와 optional history

목적:

- 고정 `다음 행동 / 전체 계획 / 기록` 탭을 콘텐츠 형태에 맞는 실행 구조로 바꾼다.

형태별 실행 단위:

- dated: 가장 가까운 날짜의 미완료 group
- checklist: next 1~3과 전체 목록
- routine: current occurrence와 series summary
- sheet: current row와 next row
- memo/guide: 관련 section, synthetic next 없음

기록:

- event가 있을 때만 표시
- Item memo와 run reflection을 분리
- 기존 execution data를 읽고 새 schema를 만들지 않음

핵심 acceptance:

- mobile/wide semantic order parity
- memo fixed record tab 0
- same-date group과 Calendar identity parity
- routine occurrence와 series 구분

## P35-R5. Memo proposal 공통 result grammar

목적:

- 개인 메모 초안의 14-input 긴 폼을 실제 결과 우선 구조로 바꾼다.

범위:

- 파싱 결과 artifact preview 우선
- 전체 title과 optional first date만 compact quick value
- Item row는 R2 editor 재사용
- R1 preflight, R3 receipt/workspace 재사용

비범위:

- AI 생성
- crawler
- parser 재작성

핵심 acceptance:

- useful preview 전 필수 입력 1개
- 첫 frame text/date input 2개 이하
- 5개 count parity
- public/memo command grammar parity

## P35-R6. Mobile Calendar selected-day composition

목적:

- 모바일에서 선택일 agenda를 월간 grid 아래 긴 페이지가 아니라 바로 조작 가능한
  상세 surface로 보여 준다.

범위:

- 390px: date tap -> bottom sheet agenda
- 1024px: side agenda 유지
- 완료 primitive 유지
- Flow open -> 개인 workspace
- Escape와 focus return

비범위:

- undated queue
- Calendar full editor
- Calendar IA 변경

핵심 acceptance:

- date tap 후 한 viewport 안에서 첫 agenda row 확인
- focus trap/return
- bottom nav overlap 0
- wide regression 0

## P35-R7. Final independent gate

범위:

- 5개 shape x 3개 session
- 390x844, 1024x768, 핵심 1440x900
- source/personal/run/occurrence/export parity
- overflow, fixed overlap, accessible name, keyboard focus
- 접근 가능한 Preview direct interaction
- docs, unit, build, targeted/full E2E

완료 조건:

- R0~R6 acceptance 전부 통과
- 남은 High finding 0
- 자동화와 observed-user evidence 분리
- 실제 관찰 사용자 수 0으로 명시

## 10. Slice 공통 구현 규칙

### 10.1 화면 규칙

- 한 화면의 primary action은 최대 1개다.
- 화면마다 핵심 메시지는 1~2개다.
- 긴 설명문으로 hierarchy 문제를 덮지 않는다.
- 중첩 카드를 추가하지 않는다.
- 상세 설정은 progressive disclosure로 연다.
- mobile과 wide에서 명칭과 의미는 같게 유지한다.
- wide는 mobile을 늘리지 말고 rail, canvas, inspector 역할을 사용한다.

### 10.2 Command 규칙

- 완료와 다시 열기는 같은 위치의 반대 상태다.
- 완료, 제외, 삭제, 보관, 날짜 이동은 서로 다른 command다.
- 삭제·보관·제외를 같은 undo 문법으로 뭉개지 않는다.
- export는 scope, count, format, result 순서다.
- Calendar command는 완료/다시 열기와 Flow 열기에 한정한다.
- Item 상세 수정은 개인 Flow 또는 저장 전 contextual editor가 소유한다.

### 10.3 Evidence 규칙

다음 상태를 분리해 보고한다.

1. local edit
2. current command 결과
3. browser/E2E 결과
4. screenshot
5. commit
6. push
7. PR
8. merge
9. Preview deploy
10. Production deploy
11. observed-user evidence

자동화, screenshot, fixture, heuristic simulation을 실제 사용자 검증이라고
표현하지 않는다.

## 11. 각 slice 완료 보고 형식

```text
목표:
- P35-R?

구현:
- 변경한 사용자 행동
- 변경한 component/projection

보존:
- source/personal/run/occurrence/export
- localStorage/schema/migration

검증:
- docs:check
- unit
- build
- targeted E2E
- related/full E2E
- 390/1024/1440 browser
- overflow/focus/accessible name
- git diff --check

Acceptance marker:
- screenshot
- E2E

Rollback:
- 되돌릴 component/adapter 경계

Publish:
- local edit
- commit
- push
- PR
- merge
- Preview
- Production

Observed user:
- 0

남은 범위:
- 현재 slice 밖의 항목만 기록
```

## 12. 개발 에이전트 복붙용 첫 `/goal`

```text
/goal

D:\flowme2605\flow-p35-mece-ux-reset에서 P35-R0
"저장 전후 시간 정합성과 첫 실행 묶음 교정"을 끝까지 구현해줘.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/specs/2026-07-26-flowme-mece-ux-reset/p35-bounded-revision-developer-handoff-ko.md
4. docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/README.md
5. docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/audit.md
6. docs/content-audit/2026-07-26-p35-08-final-mece-gate/README.md
7. components/flow/AppClient.tsx
8. lib/flow/whole-flow-reading.ts
9. lib/flow/my-flow-local-ia.ts
10. components/flow/PublicFlowAdjustmentPanel.tsx

현재 branch와 기준:
- branch: codex/p35-mece-ux-reset
- HEAD/origin/main: 2c951633d13adb0aab3ddd9d3cdddf506d9e97cd
- P35-01~08 앱 변경은 이 HEAD 위에 미커밋 상태로 존재한다.
- 기존 dirty 경로를 되돌리거나 정리하지 않는다.
- origin/main clean worktree에서 새로 시작하지 않는다.

목표:
- 기준일 역산 Flow에서 이미 지난 파생 항목 수를 저장 전에 compact하게 표시한다.
- 저장 후 첫 실행 단위는 오늘 또는 가장 가까운 미래 날짜의 미완료 Item 묶음으로
  보여 준다.
- 같은 effective date의 미완료 Item을 모두 한 묶음에 표시한다.
- 지난 Item은 삭제하거나 자동 완료하지 않고 접힌 묶음에서 접근 가능하게 유지한다.
- 모든 미래 항목이 없을 때는 가장 가까운 과거 미완료 묶음을 사실대로 보여 준다.
- My Flow와 Calendar가 같은 title, date, count, stable identity를 읽는다.

범위:
- /f/moving-d30-basic
- 저장 직후 개인 Flow
- /my
- Calendar parity 확인
- dated relative-anchor Flow만

비범위:
- 저장 전 Item title/detail/date editor
- artifact/export parity 변경
- receipt command 정리
- checklist/routine/sheet/memo 실행 단위 변경
- 기록 UI
- Calendar bottom sheet
- schema/localStorage key/migration

구현 원칙:
- 기존 effective date precedence를 유지한다.
- 기존 getSavedFlowNextRow를 즉시 삭제하지 않는다.
- dated next-group 계산은 pure adapter로 만들고 R4에서 확장 가능하게 한다.
- AppClient.tsx에 새 대형 inline 분기를 추가하지 않는다.
- 긴 설명 카드나 새 설정 폼을 추가하지 않는다.
- source, personal overlay, execution run, occurrence, export identity를 변경하지 않는다.

필수 edge case:
1. 과거와 미래 Item이 함께 있음
2. 오늘 Item이 있음
3. 미래 Item만 있음
4. 모든 미완료 Item이 과거
5. 모든 dated Item이 완료
6. 날짜 없는 Flow 회귀 없음
7. 개인 고정 날짜가 source 계산 날짜보다 우선

Acceptance:
- 저장 전 past count 정확
- 저장 직후 첫 card가 가장 가까운 실행 가능한 날짜 묶음
- 같은 날짜 미완료 Item 전부 표시
- 지난 Item 접근 및 상태 보존
- 완료/다시 열기 뒤 묶음과 count 갱신
- reload persistence
- My Flow/Calendar parity
- whole/selected/current export 회귀 0
- 390/1024 overflow 0
- focus와 accessible name 회귀 0

Screenshot marker:
- P35-R0-PAST-DATE-WARNING-390
- P35-R0-NEXT-DATE-GROUP-390
- P35-R0-NEXT-DATE-GROUP-1024

Test marker:
- tests/e2e/p35-r0-temporal-first-group.spec.ts

검증:
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- npm.cmd run test:e2e -- tests/e2e/p35-r0-temporal-first-group.spec.ts
- npm.cmd run test:e2e -- tests/e2e/p35-my-flow-library-workspace.spec.ts
- npm.cmd run test:e2e -- tests/e2e/p35-calendar-lens.spec.ts
- npm.cmd run test:e2e -- tests/e2e/p35-final-mece-gate.spec.ts
- blast radius가 넓으면 npm.cmd run test:e2e
- git diff --check

작업 중 R1~R7을 구현하지 않는다.
commit, push, PR, merge, deploy를 하지 않는다.
자동화와 screenshot을 실제 사용자 검증이라고 표현하지 않는다.
마지막에는 이번 slice의 diff, 검증, rollback, publish 상태를 분리해 보고한다.
```

## 13. 다음 checkpoint

`P35-R0`의 다음 세 항목을 사람이 확인한 뒤에만 `P35-R1`을 시작한다.

1. 저장 전 과거 항목 warning이 불필요하게 긴 설명이 아닌가
2. 저장 직후 같은 날짜 묶음이 한 화면에서 읽히는가
3. 지난 항목이 숨겨지거나 삭제된 것으로 오해되지 않는가

이 확인은 내부 owner review다. 실제 사용자 검증으로 표현하지 않는다.
