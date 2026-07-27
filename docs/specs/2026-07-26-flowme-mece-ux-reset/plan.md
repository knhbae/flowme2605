# FlowMe MECE UX Reset 실행 계획

- 작성일: 2026-07-26
- 문서 상태: A안 승인 및 개발 handoff 완료
- 현재 목표: `P35-01` entry router와 3탭 navigation
- 구현 상태: Ready
- 실제 관찰 사용자 수: 0명

## 1. 이 문서의 역할

이 문서는 FlowMe의 대대적인 UX 정리를 한 번에 구현하기 위한 명세가 아니다.
사용자 경험 기획, 기능 소유권, 와이어프레임, 구현을 순서대로 승인하며 하나씩 진행하기 위한 상위 실행 계획이다.

기존 P24~P34 산출물은 기능과 데이터 계약을 확인하는 근거로 유지한다. 다만 다음 항목은 새 방향에 맞춰 다시 판단한다.

- Home과 Flow 찾기의 역할
- `/my`가 목록·실행·편집·내보내기를 동시에 소유하는 구조
- `/calendar`가 조회와 실행을 함께 소유하는 구조
- Checklist, Calendar, Routine, Sheet, Memo를 화면 또는 탭처럼 다루는 구조
- Today, Completed, Archived를 독립 화면으로 볼지 렌즈·필터로 볼지
- 기능 존재 여부를 우선하고 한 화면에 여러 메시지와 명령을 누적한 구성

기존 데이터 계약과 저장 데이터는 기본적으로 보존한다. 화면 구조를 단순화하기 위해 source, personal overlay, execution run, recurrence occurrence, export identity를 다시 합치지 않는다.

## 2. 확정된 작업 원칙

다음 원칙은 후속 목표에서 재협상하지 않는다.

1. 진행 순서는 `사용자 여정 → 기능 문서 → UX wireflow → 개발`이다.
2. 한 화면은 하나의 사용자 질문에 답한다.
3. 한 화면의 핵심 메시지는 최대 두 개다.
4. 한 화면의 경쟁하는 primary action은 하나 이하다.
5. 화면·기능 소유권은 중복 없이 MECE하게 나눈다.
6. UI tree는 사용자의 선택에 따라 명확하게 분기되고 다시 합류해야 한다.
7. 결과 형태는 Flow의 속성이다. Calendar, Checklist, Routine, Sheet, Memo를 전역 탐색 화면으로 만들지 않는다.
8. 긴 설명, 카드 추가, 새 탭, 새 설정으로 구조 문제를 덮지 않는다.
9. 실제 콘텐츠와 실제 상태를 사용한 wireflow를 승인하기 전에는 앱 코드를 수정하지 않는다.
10. 자동화, screenshot, agent simulation을 실제 사용자 검증으로 표현하지 않는다.

## 3. 목표 사용자 경험

```text
외부 콘텐츠·URL·메모
  → Flow 찾기 또는 만들기
  → 저장될 전체 결과 확인
  → 필요한 값만 조정
  → 저장 결과 확인
  → 개인 Flow 열기
  → 실행·완료·수정·메모
  → Calendar로 날짜를 확인하거나 외부 도구로 가져가기
  → 다시 열기·재사용
```

사용자는 어느 진입점에서 시작하더라도 같은 canonical Flow와 개인 사본을 이어서 사용해야 한다.

## 4. 화면 소유권 초안

아래 구조는 구현 확정안이 아니라 `UXR-00`부터 `UXR-06`까지 검증할 기준안이다.

| Surface | 답할 사용자 질문 | 기본 메시지 | Primary action | 소유하지 않는 기능 |
| --- | --- | --- | --- | --- |
| Flow 찾기 | 어떤 Flow를 쓸까? | 찾은 콘텐츠와 출처 | Flow 열기 | 실행, 완료, 개인 기록 |
| Public Flow | 무엇이 만들어지며 내게 맞는가? | 전체 결과와 필요한 최소 입력 | 이 Flow 시작 | 저장 후 실행 관리 |
| 저장 결과 | 무엇이 저장됐고 다음은 무엇인가? | 이름, 항목 수, 날짜 범위 | 내 Flow 열기 | 장기 실행·편집 |
| My Flow | 내가 저장한 Flow는 무엇인가? | 저장한 Flow 목록과 상태 | Flow 열기 | Item 실행, Calendar 실행 |
| 개인 Flow | 지금 이 Flow에서 무엇을 할까? | 다음 행동과 전체 구조 | 현재 Item 실행 | 다른 Flow 탐색 |
| Calendar | 날짜별로 무엇이 예정됐나? | 여러 Flow의 날짜 일정 | 해당 Flow 열기 | Item 편집·완료의 주 소유권 |

### 보조 상태

- 조정: 저장 전 최소 개인화
- Item 편집: 열린 개인 Flow 안에서만 제공
- 가져가기: whole / selected / current 범위와 결과 개수를 먼저 확인
- 관리: 보관, 복구, 영구 삭제
- 반복: series 요약과 occurrence 실행을 구분
- Today / Completed / Archived: 별도 제품 영역이 아니라 필요한 화면 안의 렌즈 또는 필터 후보

## 5. 목표 UI tree 초안

```text
Flow 찾기
├─ 검색·카테고리·URL
└─ Public Flow
   ├─ 전체 결과
   ├─ 최소 조정
   └─ 저장 결과
      └─ 개인 Flow
         ├─ 실행
         ├─ 전체 계획
         ├─ 수정·메모
         ├─ 가져가기
         └─ 관리

My Flow
└─ 개인 Flow 열기

Calendar
└─ 날짜 일정 선택
   └─ 개인 Flow 열기
```

`Home`은 독립 역할이 입증되기 전까지 기본 tree에서 제외한다. 실제 사용 후기, 이용량, 리뷰 데이터가 없는 현재 단계에서는 가상의 사회적 증거를 만들지 않는다. 유지가 필요하면 `UXR-04`에서 Flow 찾기와 겹치지 않는 한 가지 역할을 증명해야 한다.

## 6. 대표 사용자 여정

모든 기능 문서와 wireflow는 다음 다섯 여정을 같은 화면 문법으로 설명해야 한다.

1. **이사 D-30**
   - 24개 전체 일정 확인
   - 이사일 입력
   - 일부 날짜와 포함 여부 조정
   - Calendar 중심으로 저장·실행·재사용

2. **날짜 없는 차량 점검**
   - 10개 점검 항목 확인
   - 날짜 없이 저장
   - 개인 Flow에서 실행
   - 필요한 항목만 날짜를 넣어 Calendar에서 확인

3. **반복 홈트**
   - 주 N회, 시간, 예상 시간, 종료 조건 확인
   - series와 현재 occurrence 구분
   - 영상 resource와 실행 Item 구분
   - 한 회차 완료·다시 열기

4. **장기 학습·진도**
   - 긴 전체 범위와 현재 위치 확인
   - 순서·진도 중심으로 실행
   - 날짜는 필요한 경우에만 보조로 사용

5. **개인 메모 초안**
   - 메모를 Item으로 나눈 결과 확인
   - 추가·삭제·복구·재정렬
   - 개인 Flow로 저장
   - 외부 도구 또는 My Flow에서 실행

추가 회귀 사례로 같은 이사 원문의 `24개 전체판`과 `기존 5개 간단판`을 사용한다. 두 편집본은 자동 병합하거나 삭제하지 않고 사용자가 구분·선택·복구할 수 있어야 한다.

## 7. 목표 목록과 진행 상태

상태 값은 `locked`, `pending`, `in_progress`, `approved`, `completed`, `blocked`만 사용한다.
동시에 `in_progress`인 목표는 하나만 허용한다.

### A. 사용자 경험 및 구조 확정

| ID | 목표 | 핵심 산출물 | 상태 |
| --- | --- | --- | --- |
| `UXR-00` | 기존 산출물과 새 단순화 방향 정합성 확정 | 유지·재검토·폐기 matrix | `completed` |
| `UXR-01` | 다섯 canonical 사용자 여정 확정 | session별 journey map | `completed` |
| `UXR-02` | 화면별 1~2개 메시지 계약 확정 | screen message contract | `completed` |
| `UXR-03` | 기능 소유권을 MECE하게 확정 | ownership matrix | `completed` |
| `UXR-04` | route와 UI tree 확정 | canonical IA tree | `completed` |
| `UXR-05` | 상태 전환과 데이터 보존 규칙 확정 | state transition contract | `completed` |
| `UXR-06` | current/proposed interactive wireflow 제작 | 390px·1024px HTML wireflow | `completed` |
| `UXR-07` | 대표 콘텐츠로 multi-session simulation | journey scorecard | `completed` |
| `UXR-08` | 화면별 KEEP / CUT 승인 | 승인된 subtraction manifest | `approved` |
| `UXR-09` | 구현 순서와 rollback 경계 확정 | staged implementation plan | `completed` |

### B. 구조 구현

| ID | 목표 | 선행 조건 | 상태 |
| --- | --- | --- | --- |
| `UXD-01` | 접근 불가능한 Checklist·Routine view branch 제거 | `UXR-08` | `locked` |
| `UXD-02` | 거대한 `MyFlows`에서 Calendar surface 분리 | `UXD-01` | `locked` |
| `UXD-03` | 개인 Flow를 유일한 실행 workspace로 정리 | `UXD-02` | `locked` |
| `UXD-04` | My Flow를 저장 Flow library·관리 화면으로 정리 | `UXD-03` | `locked` |
| `UXD-05` | Calendar를 날짜 기반 cross-Flow lens로 정리 | `UXD-02` | `locked` |
| `UXD-06` | Home 역할 제거 또는 Flow 찾기와 비중복 역할 확정 | `UXR-04` | `locked` |
| `UXD-07` | Public Flow를 전체 결과·최소 조정·단일 시작 행동으로 정리 | `UXR-06` | `locked` |
| `UXD-08` | 저장 전과 구분되는 saved receipt 정리 | `UXD-07` | `locked` |
| `UXD-09` | 제목·날짜·메모·순서·포함 여부 overlay 정합성 확인 | `UXD-03` | `locked` |

### C. 시각 시스템과 검증

| ID | 목표 | 선행 조건 | 상태 |
| --- | --- | --- | --- |
| `UXV-01` | 공통 visual grammar와 command anatomy 적용 | `UXD-03`~`UXD-08` | `locked` |
| `UXV-02` | 390px 모바일 composition 정리 | `UXV-01` | `locked` |
| `UXV-03` | 1024px·1440px rail/canvas/inspector 정리 | `UXV-01` | `locked` |
| `UXQ-01` | 기능·identity·persistence 회귀 검증 | 각 구현 slice | `locked` |
| `UXQ-02` | 접근성·overflow·focus 검증 | `UXV-02`, `UXV-03` | `locked` |
| `UXQ-03` | 최종 journey simulation과 출시 gate | 전체 구현 완료 | `locked` |

### D. 승인된 P35 구현 프로그램

P35는 A′를 실제 앱에 적용하는 유일한 구현 순서다. 위 `UXD`, `UXV`, `UXQ` 목록은 설계 추적용으로 유지하고, 개발 에이전트는 아래 P35 slice를 실행 단위로 사용한다.

| ID | 목표 | 선행 조건 | 상태 | Acceptance marker |
| --- | --- | --- | --- | --- |
| `P35-01` | `/` entry router와 3탭 navigation | 없음 | `ready` | `P35-ENTRY-ROUTER-3TAB` |
| `P35-02` | Public Flow 결과 우선 첫 viewport | `P35-01` | `locked` | `P35-PUBLIC-RESULT-FIRST` |
| `P35-03` | 저장 전 조정을 한 번에 한 종류로 정리 | `P35-02` | `locked` | `P35-ADJUST-ONE-KIND` |
| `P35-04` | `MyFlows` 안전 분리와 dead branch 제거 | `P35-01` | `locked` | `P35-MYFLOW-SAFE-SPLIT`, `P35-DEAD-VIEW-REMOVAL` |
| `P35-05` | My Flow library와 개인 Flow 집중 workspace | `P35-04` | `locked` | `P35-MY-LIBRARY-ONLY`, `P35-PERSONAL-SINGLE-FOCUS` |
| `P35-06` | Calendar lens와 공유 완료 primitive | `P35-04`, `P35-05` | `locked` | `P35-CALENDAR-LENS-ONE-TOGGLE` |
| `P35-07` | scope-first export | `P35-05` | `locked` | `P35-EXPORT-SCOPE-FIRST`, `P35-EXPORT-COUNT-PARITY` |
| `P35-08` | visual·responsive·accessibility·final journey gate | `P35-02`~`P35-07` | `locked` | `P35-FINAL-MECE-GATE` |

권장 실행 순서는 `P35-01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`이다. 한 단계의 검증이 끝나기 전에 다음 단계를 시작하지 않는다. 상세 범위와 복붙용 요청은 [A′ 개발 handoff](./developer-handoff-a-prime-ko.md)와 [P35 goal prompts](./p35-goal-prompts-ko.md)를 정본으로 사용한다.

## 8. 목표별 승인 gate

### Gate 1: 여정

`UXR-01`이 끝나기 전에는 기능 소유권을 확정하지 않는다.

승인 기준:

- 각 여정의 시작, 첫 결과, 개인화, 저장, 실행, 복구, 재사용이 이어진다.
- 화면 이름이 아니라 사용자의 목적과 결정으로 작성돼 있다.
- 다섯 콘텐츠 shape가 같은 기본 문법을 사용한다.

### Gate 2: 기능 소유권

`UXR-02`~`UXR-05`가 끝나기 전에는 wireframe을 확정하지 않는다.

승인 기준:

- 모든 기능에 주 소유 surface가 하나만 있다.
- 다른 surface에서는 상세 실행 대신 소유 surface로 이동한다.
- 화면마다 핵심 메시지 최대 두 개와 primary action 최대 한 개가 정의돼 있다.
- source, personal, run, occurrence, export 상태의 저장 위치가 분리돼 있다.

### Gate 3: Wireflow

`UXR-06`과 `UXR-07`이 승인되기 전에는 앱 코드를 수정하지 않는다.

승인 기준:

- 실제 콘텐츠와 실제 항목 수를 사용한다.
- 모바일 390×844를 먼저 설계한다.
- 와이드 1024×768은 모바일을 늘인 화면이 아니다.
- 주요 행동의 이전 상태, 사용자 조작, 다음 상태가 화면으로 연결된다.
- 긴 설명 없이도 다음 행동을 찾을 수 있다.

### Gate 4: 삭제와 구현

`UXR-08`에서 KEEP / CUT 목록을 승인한 뒤 `UXR-09`의 순서대로 하나의 vertical slice씩 구현한다.

승인 기준:

- 삭제한 기능을 다른 메뉴나 카드로 옮기지 않는다.
- undo, 취소, 복구, 데이터 접근 경로는 보존한다.
- 각 slice에 rollback 경계와 screenshot/E2E marker가 있다.
- 수치와 사용자 대면 복잡도가 감소한다.

## 9. 현재 소스에 대한 선결 사실

첫 구현 목표를 정할 때 다음 사실을 혼동하지 않는다.

- 현재 `/my`의 사용자 대면 상위 view는 이미 `지금 / Flow 목록 / 완료` 세 개다.
- `checklist`와 `routine`은 `MyFlowView` 타입과 렌더 branch에 남아 있지만 현재 상위 진입에서 접근할 수 없는 dead branch다.
- `calendar`는 `/my`의 중복 탭으로 노출되지는 않지만 `/calendar` route가 현재 `MyFlows`를 `initialView="calendar"`로 호출한다.
- 따라서 첫 삭제 slice에서 `checklist`와 `routine` dead branch는 제거 후보지만, `calendar` branch는 Calendar surface를 먼저 분리하기 전까지 유지해야 한다.
- 기존 테스트가 삭제한 UI를 전제로 한다면 assertion도 함께 줄이되, 저장·복구·identity 계약 검증은 유지한다.

## 10. `UXR-00` 상세 목표

### 목적

P24~P34의 기능·데이터 근거와 새 MECE 단순화 방향을 대조해 이후 문서가 서로 충돌하지 않게 한다.

### 입력

- 현재 production 및 current source
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/SERVICE_STRUCTURE.md`
- P24~P34의 최신 관련 spec과 evidence
- 사용자 피드백 통합본
- Claude Code의 subtraction 제안
- 현재 문서의 화면 소유권 초안

### 산출

각 기존 결정과 기능을 다음 중 하나로 분류한 matrix:

- `retain_contract`: 데이터·안전 계약으로 유지
- `retain_capability_relocate_ui`: 기능은 유지하되 새 주 소유 surface에서만 노출
- `reopen_ux`: 사용자 대면 구조를 다시 결정
- `cut_ui`: 접근 불가능하거나 중복된 UI 제거
- `defer`: 이번 reset에 필요하지 않음
- `inaccessible`: 현재 확인 불가

### 완료 기준

- Home, Flow 찾기, Public Flow, receipt, My Flow, 개인 Flow, Calendar의 역할 충돌이 모두 목록화돼 있다.
- 기존 P34 spec에서 유지할 데이터 계약과 재검토할 UI 구조가 분리돼 있다.
- 현재 production과 source에서 확인한 사실과 설계 가설이 구분돼 있다.
- `UXR-01`에서 사용할 다섯 여정과 시작 상태가 확정돼 있다.
- 앱 코드, 저장 스키마, dependency는 변경하지 않는다.

## 11. 비범위

- 새 기능 추가
- account, DB, cloud sync
- crawler 또는 실제 AI 생성
- 외부 Calendar·Todo·Notion OAuth
- 데이터 migration
- 가상의 사용자 수·평점·리뷰
- wireflow 승인 전 앱 코드 수정
- 자동 검증을 실제 사용자 검증으로 표현

## 12. 진행 기록

| 날짜 | 목표 | 상태 | 기록 |
| --- | --- | --- | --- |
| 2026-07-26 | `UXR-00` | `completed` | 현재 production/source와 P24~P34 계약을 대조해 retain/reopen/cut/defer matrix를 확정. |
| 2026-07-26 | `UXR-01`~`UXR-05` | `completed` | 다섯 여정, 화면 메시지, 기능 소유권, route/UI tree, 상태·데이터 보존 계약을 하나의 설계 패키지로 확정. |
| 2026-07-26 | `UXR-06` | `completed` | 실제 콘텐츠 5개와 8단계를 전환할 수 있는 390px·1024px interactive wireflow 제작. |
| 2026-07-26 | `UXR-07` | `completed` | 15개 multi-session cell과 80개 화면 상태를 시뮬레이션하고 접근성·overflow·primary action을 검증. |
| 2026-07-26 | `UXR-08` | `approved` | `A_prime` 승인: Home 제거와 상태 기반 entry router, My Flow library 한정, Calendar 날짜 lens와 완료 primitive 하나. |
| 2026-07-26 | `UXR-09` | `completed` | [개발 handoff](./developer-handoff-a-prime-ko.md)에 P35-01~08 순서, rollback, 첫 구현 slice를 확정. |

## 13. 바로 다음 행동

`UXR-08`과 `UXR-09`는 완료됐다. P35 전체 범위와 단계별 acceptance는 [A안 개발 handoff](./developer-handoff-a-prime-ko.md)에 확정됐고, 각 단계에 그대로 전달할 요청은 [P35 goal prompts](./p35-goal-prompts-ko.md)에 있다. 다음 개발 에이전트는 우선 `P35-01`만 구현한다.

승인된 결정:

1. 별도 Home을 제거하고 `/`를 저장 상태 기반 entry router로 사용한다.
2. My Flow에서 `지금` 실행 mode를 제거하고 저장 Flow library로 한정한다.
3. Calendar는 날짜 lens로 한정하되 동일 run 상태의 `완료 / 다시 열기` primitive 하나만 남긴다.

`P35-01`이 검증되기 전에는 다음 slice를 시작하지 않는다.
