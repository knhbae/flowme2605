# My Flow Structural Review Framework

## 현재 P31 구조

모바일 My Flow는 현재 다음 세 층을 가진다.

```text
My Flow
├─ 지금
├─ Flow 목록
│  └─ compact Flow row
│     └─ dedicated Flow workspace
│        ├─ 실행
│        ├─ 전체 계획
│        └─ 기록
└─ 완료
```

wide는 `library rail -> plan canvas -> inspector` 역할을 가진다. P31은 이전 inline 과밀을 줄였지만, 구조가 존재한다는 사실만으로 사용자에게 쉽다는 뜻은 아니다.

## 핵심 검토 질문

1. 사용자는 `지금`과 Flow workspace의 `실행` 차이를 설명 없이 예측하는가.
2. `완료`와 workspace의 `기록`이 중복처럼 보이지 않는가.
3. Flow 목록 row에서 어떤 정보를 보고 열지 결정하는가.
4. 선택한 Flow의 제목, source, 다음 행동, 진행, 날짜 범위가 workspace 이동 후에도 지속되는가.
5. 한 Flow를 열었을 때 다른 Flow와 global controls가 시선을 뺏지 않는가.
6. 24개 Item, 반복 occurrence, 날짜 없는 Item, resource가 같은 화면에서 역할별로 구분되는가.
7. 완료 체크 후 undo 또는 나중에 다시 열기가 예상 가능한 위치에 있는가.
8. 수정, export, 보관, 삭제가 실행 흐름을 방해하지 않으면서도 찾을 수 있는가.

## 규모별 fixture

| 규모 | 검토 목적 |
| --- | --- |
| 1 Flow | 저장 직후 receipt에서 My Flow로 왔을 때 전체 결과와 첫 행동 이해 |
| 5 Flow | 이름·다음 날짜·진행 상태로 원하는 Flow 찾기 |
| 20 Flow | 검색, filter, 최근 실행, 보관 Flow 관리 |
| 60 Flow | search-first 전환, group/section 효용, rendering·navigation 안정성 |

규모 fixture가 query/demo로만 가능하면 `fixture_only`로 표시하고 실제 사용자 도달 가능성과 분리한다.

## 콘텐츠 형태별 fixture

| 형태 | 대표 route | workspace에서 보여야 할 핵심 |
| --- | --- | --- |
| 기준일 역산 timeline | `/f/moving-d30-basic` | phase/date group, 다음 날짜, 전체 범위, 고정 날짜 |
| 날짜 없는 checklist | `/f/vehicle-inspection-prep` | 남은 check, 날짜 없음, Calendar 배치 |
| 반복 routine | `/f/curated-allblanc-morning-workout` | series summary, 이번 occurrence, run history |
| artifact 선택형 | `/f/curated-wedding-naver-timeline` | 선택한 결과 형태, 전체 6개 구조, 개인화 |
| mixed travel | `/f/real-mofa-overseas-travel-prep` | 날짜·check·resource 분리 |
| personal draft | `/flows` miss/memo | add/delete/restore/reorder, 개인 제목·일정 |

## 측정할 복잡도

각 current/proposed 화면에서 같은 방식으로 기록한다.

| Metric | 설명 |
| --- | --- |
| `firstViewportDistinctCardTypeCount` | 첫 viewport에 서로 다른 card 문법 수 |
| `firstViewportHeadingCount` | 첫 viewport heading 수 |
| `firstViewportVisibleCommandCount` | primary/secondary/menu를 포함한 visible command 수 |
| `firstActionDepth` | route 진입 후 실제 Item 실행까지 interaction 수 |
| `flowOpenDepth` | My Flow 진입 후 원하는 Flow workspace까지 interaction 수 |
| `reopenDepth` | 완료 Item을 다시 열기까지 interaction 수 |
| `itemEditDepth` | 제목·날짜·메모 수정까지 interaction 수 |
| `wholeExportDepth` | 전체 Flow export 결과까지 interaction 수 |
| `archiveRestoreDepth` | 보관 후 reload, archived filter, 복구까지 interaction 수 |
| `actionableDuplicateCount` | 같은 stable Item이 동시에 실행 control을 가진 횟수 |
| `contextLossCount` | navigation 후 선택 Flow/date/filter/scroll을 잃은 횟수 |
| `horizontalOverflowPx` | viewport 가로 넘침 |
| `unnamedFocusableCount` | accessible name 없는 focusable element |
| `explanationDependencyCount` | UI 설명 문단을 읽어야 다음 행동을 찾은 횟수 |

## 비교할 최소 3개 대안

### A. P31 Keep And Tighten

- `지금 / Flow 목록 / 완료`와 `실행 / 전체 계획 / 기록` 유지
- copy, density, row anatomy, disclosure만 정리
- 가장 낮은 구현 위험

### B. Library To Focused Workspace

- My Flow 첫 화면을 compact library와 `이어할 Flow` 중심으로 구성
- Flow를 열면 global view를 숨기고 한 workspace에 집중
- workspace 안에서 `다음 행동 -> 계획 -> 기록` 순서로 progressive disclosure
- 모바일 back은 filter/scroll을 복구

### C. Run-First Workspace

- My Flow 첫 화면은 현재 실행 run과 이어할 Flow를 먼저 보여줌
- reusable Flow library와 completed history는 secondary destination
- Flow definition과 current run의 차이를 명시
- routine과 long timeline에서 강하지만 단순 checklist에서 과해질 위험이 있음

reviewer는 필요하면 D안을 추가할 수 있으나 A/B/C를 생략하면 안 된다.

## 전면 재구성 판정 기준

다음 중 둘 이상이 current production에서 반복 재현되면 `my_flow_structural_reopen`을 우선 검토한다.

1. 2개 이상 persona가 `지금`과 workspace `실행`의 차이를 잘못 예측한다.
2. 같은 stable Item이 두 곳 이상에서 primary completion control을 가진다.
3. 20 Flow fixture에서 원하는 Flow를 열기까지 4 interactions를 초과한다.
4. 전체 Flow 구조를 이해하기 전에 Item 실행을 요구하거나, 반대로 실행까지 3개 이상의 설명/card layer를 통과한다.
5. 완료 취소, 수정, 전체 export, 보관·복구 중 2개 이상이 5 interactions를 초과하거나 hidden이다.
6. timeline/checklist/routine 중 하나가 공통 workspace에서 의미를 잃고 content-specific 예외 UI를 요구한다.
7. 첫 viewport card type이 4개 이상이고 primary action이 둘 이상 경쟁한다.
8. current structure를 유지하는 A안이 B/C보다 복잡도 지표를 20% 이상 줄이지 못한다.

`cross_tab_ia_reopen`은 My Flow B/C안으로도 Home·Find·Calendar 중복이 남고, 동일 객체의 primary action이 탭 사이에서 경쟁한다는 증거가 있을 때만 선택한다.

## 데이터 계약 영향

UI 전면 재구성은 허용하지만 아래는 별도 근거 없이 변경하지 않는다.

- source definition과 source version
- personal title/date/memo/structure overlay
- execution run과 completion/reopen
- recurrence series/revision/occurrence
- export stable identity와 receipt

새 UI model은 기존 effective projection을 소비해야 한다. 다른 count, 임시 Item ID, 별도 completion state를 만들면 제안에서 탈락한다.

## 제안서 필수 내용

1. current anatomy와 문제
2. A/B/C 390px wireframe
3. A/B/C 1024px wireframe
4. 6개 콘텐츠 형태가 각 대안에서 어떻게 보이는지
5. 1/5/20/60 Flow scale 결과
6. 24-cell completion과 복잡도 비교
7. 선택안과 탈락안 이유
8. component/source 영향
9. migration 필요 여부
10. 단계별 rollout, rollback, acceptance marker
