# FlowMe 통합 PoC UX 정합성 검토

- 작성일: 2026-09-02
- 검토 대상: 개인공간 v4.1 UI, 개발 1, 개발 2, 현재 React PoC, 직접 조작형 standalone HTML
- 목적: 세 결과물의 원래 화면·대화 결정을 현재 통합 PoC와 대조하고, 구현 보완과 제품 결정을 분리한다.
- 검토 방식: 원본 문서·조작형 HTML·화면 캡처·현재 코드·최신 A8/A9 자동 테스트 결과의 대조
- 이 문서에서 하지 않은 것: 실제 Android Chrome·iOS Safari, 200% 확대, screen reader, 관찰 사용자 검증

## 1. 판정 요약

현재 PoC는 세 결과물을 한 경로에서 이어 볼 수 있는 기능 골격은 갖췄다. 그러나 화면과 행동의 정본은 아직 하나로 합쳐지지 않았다.

- 개인공간 v4.1의 폴더·기간·완료·Undo와 이동 불변조건은 React에서 가장 많이 구현됐다. 오른쪽 재정렬 통로, 네 방향 순서 이동, 월간 날짜별 Quick add, pointer cancel cleanup, 844×390 내부 scroll은 닫혔고, 한 줄 shell, 평면 목록, 실제 touch와 standalone 좌측 destination parity는 부분 구현이다.
- 개발 1의 네 saved-plan origin 읽기 투영과 운영 데이터 격리는 충족도가 높다. 공통 Plan→Item 편집, Plan 단위 staged save, dirty 이탈, effective Flow Text 기본 화면은 빠져 있다.
- 개발 2의 plain-text first와 6개 작성 틀은 구현됐다. 최신 결정인 선택형 구조 검토, 편집기 전체 ghost example, native Undo/Redo, CreatorDraft owner는 구현 또는 결정이 남았다.
- React와 standalone은 같은 제품의 두 실행 형태라기보다 서로 다른 축약본에 가깝다. React는 기능이 많지만 운영 shell과 v4.1 shell이 섞였고, standalone은 v4.1 시각 문법에 가깝지만 기간 화면과 touch 이동, authoring guidance가 축약됐다.

2026-09-02 요구사항 추적 자료의 원자 요구 수와 판정은 다음과 같다. 이 표는 UX 검토에서 임의로 다시 센 수가 아니라 현재 `requirements-*.json` 스냅샷을 그대로 집계한 값이다.

| 결과물 | 전체 | 충족 | 부분 | 미충족 | 의도적 변경 | 결정 필요 | 제외 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 개인공간 v4.1 `V41` | 78 | 53 | 10 | 3 | 6 | 0 | 6 |
| 개발 1 `D1` | 26 | 5 | 17 | 4 | 0 | 0 | 0 |
| 개발 2 `D2` | 64 | 12 | 28 | 17 | 2 | 0 | 5 |

숫자만으로 완성도를 비교하면 안 된다. 개발 1과 개발 2에는 PoC에 아직 연결하지 않은 제품 lifecycle과 편집기 후보까지 포함돼 있다. 아래에서는 현재 통합 여정에 직접 필요한 항목과 제품 결정이 필요한 항목을 나눠 본다.

### 1.1 safe batch 반영

초기 UX 대조 뒤 제품 결정 없이 닫을 수 있는 공통 기반을 먼저 구현했다. 4차 A9
safe slice까지 반영한 결과 V41 열린 gap은 30개에서 13개로, 전체 primary gap은
98개에서 81개로 줄었다.

- React와 standalone 모두 350ms 길게 누르기를 전용 손잡이에서만 시작한다.
- 시작점에서 실제 거리 8px 이상 이동, pointer cancel, scroll, invalid drop은 저장하지
  않으며 후속 합성 click 한 번만 막고 다음 실제 click은 살린다.
- React workspace·authoring shell에 상하좌우 safe-area seam과 skip link를 추가했다.
- 이동 손잡이는 길게 누르기·8px 취소·키보드 대안 지침을 `aria-describedby`로
  참조한다.
- 현재 통합 state model에 고정 seed 5,000-step 시뮬레이션을 추가했다.
- Chromium trusted touch로 행 본문 scrollY를 실제로 바꾼 뒤 같은 fixture에서 mouse
  drag를 실행했다. 자동 입력 증거이며 실제 모바일 기기 검사는 아니다.
- 24/18/30/22px 강제 inset에서 React move/item/reset surface와 standalone
  dialog/toast의 외곽 경계를 측정했다.
- 오른쪽 원 목록 corridor에서 midpoint before/after 3px 선, current/outside 무저장,
  reorder·Undo와 하나의 live owner를 확인했다.
- active synthetic pointer 중 trusted mouse wheel이 실제 scrollY를 바꾸면 session을
  취소하고 첫 합성 click만 막으며 다음 click을 복원하는 연속 검사를 통과했다.
- 844×300 reduced-motion에서 처음 화면 밖인 날짜까지 panel auto-scroll한 뒤 날짜
  drop·Undo를 확인했다. 자동 입력이며 실제 touch·실기 증거는 아니다.
- React와 standalone에 맨 위·위·아래·맨 아래를 모두 제공하고 기존 reorder
  resolver·transition에 연결했다. 경계 방향은 disabled/no-write다.
- 월간 점유 날짜와 펼친 28개 빈 날짜를 세로 section으로 구성하고 모든 날짜에 48px
  QuickItem 진입을 배치했다.
- pointer cancel 뒤 ghost·강조·상태·RAF가 남지 않으며, 844×390 move dialog/panel은
  화면 안에서 독립 scroll된다. portrait·short landscape의 reload 뒤 compact Undo도
  확인했다.

### 1.2 A0 통합 UX 작업 결정

A9 뒤 남아 있던 여섯 선택은 세 결과물의 원래 결정을 버리지 않는 방식으로 닫았다.
이는 운영 디자인 시스템이나 저장 정책의 영구 승인과 구분한다.

- 첫 여정은 `일반 텍스트 → 명시적 확인 → Personal Flow → /my 개인공간`이다.
  CreatorDraft·공개 lane은 같은 저장처럼 보이지 않게 분리한다.
- production PlatformNav·cobalt가 global shell을 소유하고, v4.1 teal·평면 문법은
  개인공간 내부에만 쓴다. 모바일에서 shell CTA를 중복하지 않는다.
- 작성 화면은 한 editor다. 구조 검토는 선택형이며 작성 틀은 원문에 한 번만
  삽입하고 ghost 예시는 값·선택·clipboard에 들어가지 않는다.
- React가 live origin을 다루는 제품 구현 정본이다. standalone은 사용자가 직접
  조작하는 offline fixture이며 core UX parity는 필요하지만 운영 연결 증거는 아니다.
- 반복·public S3·table/source update는 이번 PoC에서 추정 구현하지 않고 보존 또는
  fail-closed한다.

이 판정 뒤 primary `결정 필요`는 0건, 열린 primary gap은 79건이다. 아래 A9 당시
`결정 필요` 표기는 변경 전 감사 이력을 설명하는 문장으로만 읽고, 현재 판정은
추적 JSON과 `a0-decision-record.md`를 따른다.

아래 상세 표에는 개선 전 문제를 재현하는 감사 기준 문장이 일부 남아 있다. 각 행의
현재 판정은 이 delta와 요구사항 추적 JSON을 우선한다. right corridor, before/after 선,
React edge auto-scroll, active handle session 중 trusted mouse-wheel 취소, 네 방향 이동,
월간 날짜별 Quick add, 자동 pointer cancel cleanup, 844×390 내부 scroll은 닫혔다.
standalone 좌우 destination parity, standalone의 정확한 화면 밖 날짜 이동, 실제 touch는
부분 또는 미실행으로 남는다.

## 2. 판정 규칙

| 판정 | 이 문서에서의 뜻 |
| --- | --- |
| `충족` | 사용자가 현재 화면에서 도달해 조작할 수 있고 위험에 맞는 코드·테스트·브라우저 증거가 있다. |
| `부분` | 핵심 골격은 있으나 화면, 행동, owner, 오류·복구, React/standalone 중 하나 또는 실행 증거가 빠졌다. |
| `미충족` | 통합 범위에 포함된 원래 요구가 현재 화면과 코드에 없다. |
| `의도적 변경` | 원안과 다르게 만든 사실과 대체 흐름이 코드에 있다. 승인 기록이 없으면 `의도적 변경(승인 필요)`로 표시한다. |
| `결정 필요` | 시각 token, 저장 owner, 운영 writer처럼 제품 결정이나 새 권한 없이는 안전하게 구현할 수 없다. |
| `제외` | 이번 PoC에서 하지 않기로 한 항목이며, 구현하지 않은 것이 결함이 아니다. |

독립 HTML이 작동한다는 사실은 live origin을 읽는 React PoC의 증거를 대신하지 않는다. 반대로 React에서만 되는 기능은 사용자가 전달받은 standalone HTML의 충족 증거가 아니다.

## 3. 근거와 현재 구현

### 3.1 세 원본

| 코드 | 결과물 | 원본 근거 | 통합에서 맡는 역할 |
| --- | --- | --- | --- |
| `V41` | 개인공간 v4.1 UX/UI | `docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`, `docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`, v4.1 assets의 CSS·JS·QA·캡처 | 폴더·오늘·주간·월간·날짜 미정·QuickItem·이동·완료·Undo의 화면과 제스처 문법 |
| `D1` | 개발 1 | `D1 baseline session`, My/Public Plan lifecycle 정본, `2026-08-12-*unification`, `2026-08-13-plan-edit-trash-structure-unification`, production visual refresh, PR #195 계열 결정 | 네 saved-plan origin, 공통 Plan→Item 상세·편집, staged save, 뒤로가기·보관·복구, effective projection owner |
| `D2` | 개발 2 | `D2 baseline session`, Text Authoring UX 정본, 2026-08-24 Flow View PoC, 2026-08-30 Unified Editor Guidance·작성 틀 정본 | plain-text 저작, 명시 문법 해석, 선택형 구조 검토, 작성 틀·ghost, 결과·저장 영수증, CreatorDraft 후보 |

통합 blueprint는 네 번째 제품 결과물이 아니다. `docs/specs/2026-09-01-flowme-integration-blueprint-v0/`는 세 결과물의 연결 순서와 PoC 저장 경계를 판정하는 교차 기준으로 사용한다.

### 3.2 현재 구현

- React workspace: `components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx`
- React authoring: `components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx`
- production navigation: `components/flow/PlatformNav.tsx`
- authoring model: `lib/flow/personal-workspace-poc-authoring.ts`
- standalone shell: `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone-shell.html`
- standalone behavior: 같은 디렉터리의 `app.js`, `style.css`
- 원자 추적 자료: `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-v41.json`, `requirements-d1.json`, `requirements-d2.json`

## 4. 최신 Text Authoring 방향과 과거안 구분

현재 기준 흐름은 다음이다.

```text
빈 문서 또는 일반 텍스트 작성
  → 필요할 때만 작성 틀 탐색
  → 작성 틀을 명시적으로 선택하면 같은 source editor에 TXT scaffold 1회 삽입
  → 같은 편집기에서 자유롭게 작성
  → 결과를 바로 확인
  → 모호한 항목이 있거나 사용자가 원할 때만 구조 검토
  → 저장 owner와 staged save 규칙에 따라 적용
```

여기서 `명시적 materialization`은 별도 template editor를 만들거나 모든 칸의 완성을 강제한다는 뜻이 아니다. picker 열기·닫기·취소는 source write 0이고, template 선택 자체가 사용자의 명시적 1회 scaffold 삽입이다. 이후 source는 보통 텍스트처럼 계속 편집한다.

| 과거 또는 중간안 | 현재 결정 | 현재 PoC 판정 |
| --- | --- | --- |
| `작성 → 구조 → 결과` 3단계를 항상 통과 | 정상 문서는 `작성 → 결과`; 구조 검토는 drawer/bottom sheet로 선택 | React가 아직 필수 3단계이므로 `D2-022 미충족` |
| template용 두 번째 editor/form과 완성 gate | 기존 Flow editor 하나에 미완성 scaffold 삽입 | 별도 editor가 없어 `D2-047 충족` |
| picker를 보거나 고르는 동안 source와 별개 draft만 관리 | browse/cancel은 no-op, 선택이 명시 insertion | `D2-049 충족`; 이 successor가 이전 P0.2 계약보다 우선 |
| 선택 template 아래 별도 sample card | 모든 Flow 편집에서 인식 가능한 빈 문법 줄에 line-level ghost | React·standalone 모두 `D2-053/054 부분` |
| 결과를 곧바로 개인 Flow에 저장 | D2 원안은 CreatorDraft/검토 준비, 통합 blueprint는 Personal Flow를 선택 | owner 충돌이므로 `D2-005 결정 필요` |

plain-text first는 template first가 아니다. 작성 틀은 빈 문서를 시작하기 어려울 때 쓰는 선택 지원이며, AI가 source에 없는 제목·할 일·메모를 만들지 않는다. Text Authoring의 latest direction을 구현할 때 필수 3-step wizard를 다시 제품 기준으로 삼으면 안 된다.

## 5. 개인공간 v4.1 UI 대조

### 5.1 화면·IA

| 추적 ID | 원래 화면·결정 | 현재 React | 현재 standalone | 판정 | 보완 |
| --- | --- | --- | --- | --- | --- |
| `V41-001`, `V41-060` | 흰 본문, 회색 탐색, 청록 강조, 카드가 아닌 평면 목록, `폴더 → 날짜 → 완료` | production `PlatformNav`, PoC header, 상태 띠, view tab이 겹친다. 폴더의 Flow는 2열 카드다. | 흰색·회색·청록과 평면 행은 원안에 더 가깝다. | `부분` | exact-query 안에 공통 `PersonalWorkspacePocChrome`을 두고 React·standalone의 shell과 flat row를 맞춘다. |
| `V41-029`, `V41-035`, `V41-036`, `V41-053` | 모바일은 `탐색 / FlowMe / 검토` 한 줄, 검토 header는 숨김 | `FLOW`+menu, PoC title/action, 상태 띠가 여러 줄이다. | 한 줄에 가깝지만 `탐색`이 현재 workspace로 다시 이동해 결과가 없다. 우측 `새 Flow 만들기`와 본문 CTA가 중복된다. | `의도적 변경(승인 필요)` | `탐색`은 개인공간 drawer, `검토`는 PoC 관리로 연결한다. authoring CTA는 본문 primary 하나만 둔다. |
| `V41-002`, `V41-021`~`V41-028` | 폴더·오늘·주간·월간·날짜 미정, QuickItem, 시간순, 월간 빈 날짜, 날짜별 추가 | 점유 날짜와 펼친 빈 날짜가 세로 section을 이루고 각 날짜의 48px `+`가 해당 날짜를 Quick form에 넣는다. 폴더 카드 문법 차이는 남는다. | 같은 날짜 section과 날짜별 Quick add를 제공하며 2026-09 fixture에서 빈 날짜 28개를 확인했다. | `V41-028 충족`; 나머지 혼합 | grouped period 동작은 닫았다. heading-owned date의 행 중복과 폴더 평면 문법은 별도 추적한다. |
| `V41-024`, `V41-025` | 날짜 heading과 행 날짜를 중복하지 않고 원본 경로·구조화된 시간을 보존 | React 기간 목록은 대체로 충족한다. | `오늘 · 2026-09-02`처럼 heading과 행에 날짜가 중복될 수 있다. | `부분` | `renderTask`에 heading-owned date 표시 규칙을 전달한다. |

### 5.2 이동·제스처

| 추적 ID | 원래 행동·결정 | 현재 React | 현재 standalone | 판정 | 보완 |
| --- | --- | --- | --- | --- | --- |
| `V41-003`~`V41-010` | 48px 손잡이, 350ms long-press, 8px 이동 전 스크롤 구분, 합성 click 차단, 손잡이 tap·`…`·no-move release가 같은 비모달 이동 창 사용 | 전용 손잡이에서 350ms 뒤 pointer session을 열고 8px 취소·click suppression·다음 click 복원을 검증했다. 내부 순서 target은 click·키보드 대안이고 drag는 오른쪽 원 목록만 쓴다. | 전용 손잡이와 350ms·8px 규칙은 맞췄지만 목적지는 중앙 dialog다. | `충족/부분 혼합` | `V41-008`은 standalone 좌측 destination 역할을 A0에서 정할 때까지 부분으로 유지한다. |
| `V41-008`, `V41-019`, `V41-043`, `V41-058` | 날짜·폴더 목적지는 왼쪽, 원 목록 재정렬은 오른쪽 통로. 행 이름 일부와 48px 손잡이를 남기고 앞·뒤 삽입선과 live text를 표시 | 원 행이 실제 오른쪽 drop target이고 midpoint에 따라 3px before/after 선과 하나의 live owner 문구가 바뀐다. current/outside는 무저장, reorder·Undo는 각 1회 저장을 확인했다. | 오른쪽 같은 목록 corridor·삽입선은 동작하지만 날짜·폴더 목적지는 중앙 dialog다. | `V41-019,043 충족`; `V41-008,058 부분` | standalone을 좌측 destination product surface로 맞출지 fixture-only로 둘지 A0에서 결정하고 선택 범위의 비교 화면을 남긴다. |
| `V41-018`, `V41-020`, `V41-046`, `V41-051` | 같은 위치·대상 밖·Escape·pointer cancel·blur·resize는 mutation 0. 후속 합성 click도 mutation 0 | active synthetic pointer 중 trusted wheel로 실제 scrollY를 바꿔 취소·첫 click 억제·다음 click 복원·write 0을 한 흐름으로 확인했다. 다른 종료 원인도 raw bytes를 유지한다. | 동일한 무저장·cleanup 계약을 자동 시나리오로 확인했다. | `V41-020 충족` | 실제 기기 gesture로 표현하지 않고 자동 Chromium 증거로 유지한다. |
| `V41-065` | 맨 위·위·아래·맨 아래, 날짜 입력·오늘·내일·날짜 지우기, 폴더, 시간순 복귀 | 네 순서 제어가 같은 position resolver와 `reorder` transition을 사용한다. 경계 방향은 disabled/no-write다. | 같은 네 순서 제어와 transition 결과를 제공한다. | `충족` | 실제 기기 증거와 분리해 자동 브라우저·모델 근거로 유지한다. |
| `V41-066`~`V41-068` | 보이는 날짜로 touch drop, 화면 가장자리 auto-scroll, 행의 세로 touch scroll과 desktop drag 공존 | 36~72px zone·RAF·매 frame 재판정이 동작한다. 844×300 화면 밖 날짜 drop·Undo와 pointer cancel의 ghost·강조·상태·RAF cleanup을 확인했다. | actual mouse edge-scroll 뒤 화면 밖 task reorder·Undo와 pointer cancel cleanup은 통과했지만 정확한 화면 밖 날짜와 좌측 destination parity는 없다. | `V41-067,068 충족`; `V41-066 부분` | 자동 cleanup은 닫았다. synthetic pointer를 실제 touch로 표현하지 말고 실제 Android/iOS를 별도 검사한다. |

### 5.3 반응형·접근성

| 추적 ID | 원래 결정 | 현재 차이 | 판정 | 보완 |
| --- | --- | --- | --- | --- |
| `V41-030`~`V41-033`, `V41-070` | 48px 조작, 세로 날짜 target 한 열, 844×390 모바일 IA, 짧은 가로 panel 내부 scroll, 네 방향 safe area | React와 standalone의 844×390 move surface가 viewport 안에서 내부 scroll되고 날짜 section·주 행동에 도달한다. 강제 네 방향 inset도 유지된다. shell breakpoint 차이는 별도다. | `V41-070 충족`; shell 혼합은 부분 | 200% 확대와 실제 기기 회전은 별도로 실행하고, shell owner는 A0에서 결정한다. |
| `V41-034`, `V41-037`~`V41-043` | skip link, landmark, focusable main, handle 설명, 비모달 panel aria, dialog name, live result | handle 지침, 비모달 panel, before/after·same·outside 문구와 활성 live owner 하나를 확인했다. | `V41-043 충족`; `V41-037 부분` | standalone 중앙 dialog가 좌측 destination 구조와 다른 점을 A0 전까지 부분으로 유지하고 screen reader를 별도 실행한다. |
| `V41-049`, `V41-061`~`V41-064` | 강제 safe-area, 실제 Android/iOS, 보조기술·확대 검증 | 강제 inset의 shell·panel·item/reset sheet 경계는 통과했다. 실제 기기, 200%·screen reader 증거는 없다. | `충족/미충족 혼합` | standalone dialog/toast도 강제 inset을 통과했다. 실제 기기·보조기술은 별도 실행 결과로 남긴다. |

## 6. 개발 1 대조

| 추적 ID | 원래 대화·결정 | 현재 React | 현재 standalone | 판정 | 보완 |
| --- | --- | --- | --- | --- | --- |
| `D1-001`, `D1-007`, `D1-008` | `D1 baseline session`: 일반 Flow, Flow Map, 개인 메모·URL 초안, 이전 저장본을 같은 Plan→Item surface로 보고 origin 차이는 adapter에만 둔다. unsupported는 fail-closed, 운영 identity·storage는 불변이다. | 네 origin read model과 공통 목록·상세, fail-closed, PoC namespace가 있다. 기존 Flow는 `editAvailable=false`다. | fixture 기반이라 네 live origin 증거는 대신하지 못한다. | `부분`; 안전 경계는 `충족` | 공통 shadow title·memo 편집을 Plan→Item surface에 추가하되 운영 writer는 계속 호출하지 않는다. |
| `D1-002`, `D1-005`, `D1-012` | 실행 상세·Calendar·QuickItem 등 모든 Item opener가 같은 transition을 쓰고, 개인 제목·날짜·메모만 편집하며 원문 설명·완료 기준·출처는 읽기 전용이다. | 날짜·폴더·순서는 공통 transition이다. 기존 Flow의 개인 title·memo edit가 없고 source/personal 구획도 일관되지 않다. | task menu 중심이며 공통 Plan→Item editor가 없다. | `부분` | source read-only block과 personal shadow fields를 한 editor 계약으로 만든다. |
| `D1-003` | Item의 `계획에 반영`은 부모 draft만 바꾸고, Plan의 `변경 적용/내 계획에 저장` 한 번으로 최종 저장한다. | 각 shadow transition이 즉시 durable PoC state에 저장된다. Plan draft와 final apply가 없다. | 조작마다 곧바로 local state를 저장한다. | `미충족` | `working Plan draft → impact review → atomic apply`를 분리하고 최종 write도 PoC namespace 한 transaction으로 제한한다. |
| `D1-004`, `D1-011`, `D1-018` | 취소·Escape·Back은 같은 dirty discard 규칙, opener focus·scroll 복귀, 저장 성공·실패·Undo·중복 조작 방지와 영향 요약 | move panel과 item sheet의 Escape/focus, one-snapshot Undo, pending guard가 있다. Plan editor·dirty Back·included/excluded 영향·copy collision은 없다. | 제한된 Undo와 상태 표시는 있으나 Plan lifecycle은 없다. | `부분` | 공통 dirty guard, focus/scroll restoration, impact summary, staged save 실패 rollback을 묶어 구현한다. |
| `D1-009`, `D1-024` | single-child Flow Map은 일반 Flow로 평탄화, multi-child만 `choose_child`; 내부 map/review_hold는 사용자에게 숨김 | child가 일반 Flow처럼 보이지만 multi-child grouping/choose-child 없이 각각 노출되고 기술적 origin label이 남는다. | fixture 목록으로 더 축약된다. | `부분/미충족` | savedCopy/Map owner별로 묶고 multi-child 선택 뒤 결과 확인으로 연결한다. |
| `D1-013` | production은 미색·흰 카드·잉크·코발트 공통 token을 사용 | v4.1 teal과 production black/cobalt navigation이 한 화면에 섞인다. | v4.1 teal 중심이다. | `결정 필요` | v4.1 teal과 production cobalt 중 영구 token owner를 제품 결정으로 고른다. 결정 전 exact-query PoC 안에서는 v4.1 문법을 일관되게 유지한다. |
| `D1-014`, `D1-015` | 한 화면 한 primary, 48px primary·44px secondary, 844 landscape compact, 1024 list+execution, 1280 3-pane | 모바일에 header CTA와 본문 CTA가 경쟁한다. 844×390에서 desktop shell이 나타난다. root 전체 max-width 때문에 1440에서 베이지 slab처럼 보인다. | target 크기는 나아졌지만 header/body CTA가 중복된다. | `부분` | 화면별 primary 하나, short-landscape compact, full-width canvas와 content-only max-width로 정리한다. |
| `D1-016`~`D1-018` | 찾기→결과·기준일→조정→staged save→실행·이동→복구를 한 문법으로 연결하고 출처·원문·완료 기준·개인 메모를 구분 | authoring→개인 Flow 저장→workspace 실행은 이어지나 기존 Flow 탐색·staged edit·trash 복구가 끊긴다. | 샘플 데이터 안에서는 이동되지만 실제 origin·source 경계가 없다. | `부분` | 통합 journey에서 기존 Flow와 새 authoring Flow가 같은 Plan→Item surface로 합류하도록 한다. |
| `D1-019`, `D1-021`~`D1-025` | 단일 입력으로 catalog query·URL·memo를 분기하고, Flow 선택/변경 뒤 effective Flow 문법형 Text를 기본으로 보며 Todo·Calendar 전체 projection을 선택한다. 내부 trace는 숨긴다. | Flow 찾기 단일 입력과 effective Text 기본 view가 없다. 기간 Todo는 전체 표시하지만 Calendar/result-format 선택은 없다. 기술 origin label이 남는다. | 이 개발 1 여정은 구현하지 않았다. | `미충족/부분` | 이번 gap closure의 포함 범위를 명시한다. 포함하면 read model+shadow에서 effective Text를 생성하고 Todo·Calendar projection을 같은 Item identity에 연결한다. |
| `D1-010`, `D1-026` | 로컬 휴지통 lifecycle은 storage owner 결정이 필요하고 자동 QA와 관찰 사용자는 구분한다. | 운영 보관 writer를 호출하지 않으며 관찰 사용자 0명을 분리 표기한다. | 동일 | `결정 필요` / 증거 경계 `충족` | 휴지통을 임의 구현하지 말고 shadow-only 범위 또는 후속 owner를 결정한다. |

## 7. 개발 2 대조

| 추적 ID | 원래 대화·결정 | 현재 React | 현재 standalone | 판정 | 보완 |
| --- | --- | --- | --- | --- | --- |
| `D2-001`, `D2-011`~`D2-015` | AI 없이 일반 TXT·Markdown·문장을 먼저 보존하고 명시 문법만 해석한다. 표식 없는 문장은 Todo로 만들지 않는다. invalid date/URL과 빈 값을 구분한다. | AI 경로가 없고 raw source와 명시 문법 parser가 있다. 저장 후 상세에서 일반 문장·원문에 다시 접근하는 경로는 약하다. | 기본 parser는 있으나 결과 상세·원문 round-trip이 더 제한적이다. | `충족/부분` | source를 개인 shadow와 섞지 말고 저장 Flow 상세에 읽기 전용 원문/TXT 접근을 유지한다. |
| `D2-002`~`D2-005`, `D2-057` | Source, WorkingSource, canonical, CreatorDraft, PublishedVersion, PersonalOverlay, ExecutionRun, ExportSnapshot을 분리한다. D2 원안의 저장은 CreatorDraft/검토 준비다. | source와 personal execution shadow는 분리됐다. authoring draft reload는 되지만 성공 결과는 Personal Flow이고 CreatorDraft library/search/clone/archive는 없다. | local draft와 personal task를 저장하지만 creator lifecycle은 없다. | `부분`; owner는 `결정 필요` | 개인 저작 lane과 creator 저작 lane을 분리하거나 이번 PoC 저장 owner를 명시적으로 하나 선택한다. 결정 전 CreatorDraft 완성으로 표현하지 않는다. |
| `D2-003`, `D2-017`~`D2-021` | Calendar·Todo·Sheet·TXT는 같은 Item의 projection이며 WorkingSource와 배포용 TXT는 다르다. source 편집과 결과 Item 수정은 한 transaction과 Undo로 왕복한다. | source→preview는 즉시 반영된다. 결과→source Item edit, 실제 월간 Calendar, copyable TXT, Sheet가 없다. | 결과 projection이 더 축약됐다. | `부분/미충족` | 이번 통합이 필요한 projection을 Text·Todo·Calendar로 우선 고정하고 같은 identity와 source-line mapping을 검증한다. |
| `D2-022` | 정상 문서는 입력→결과로 가며 구조 검토는 사용자가 원하거나 모호할 때만 drawer/bottom sheet로 연다. | `01 작성 → 02 구조 → 03 결과`와 구조 확인 checkbox가 필수다. | 단계형 authoring을 축약해 보여 주며 선택형 구조 drawer 계약이 없다. | `미충족` | 기본 2영역으로 단순화하고 ambiguity만 review 진입을 제안한다. |
| `D2-029`~`D2-044` | 같은 source를 순수 텍스트/Flow 편집으로 보고, 문서형 흐름·현재 줄 raw·나머지 rendered·문맥형 작은 `+`·모바일 keyboard 대응을 검토·확정 | native textarea와 별도 preview만 있다. live editor, line helper, 실제 keyboard 위 anchor는 없다. | native textarea 중심이다. | `부분/미충족` | 이 묶음은 제품 범위를 정한 뒤 단계화한다. ghost와 optional review는 우선 구현하되 live editor 전체 도입을 몰래 확정하지 않는다. |
| `D2-045`~`D2-051` | 구조명 중심 6개 작성 틀을 직접 보여 주고, 같은 editor에 scaffold를 정확히 한 번 넣어 첫 `# ` 위치에 caret을 둔다. browse/cancel write 0, 선택이 명시 insertion이다. | 6개 contract와 같은 textarea 삽입, no-op browse/cancel이 있다. caret browser 증거와 stale/fingerprint guard가 충분하지 않다. | 6개 선택은 있으나 예시와 insertion transaction 검증이 축약됐다. | `충족/부분` | scaffold bytes·selectionStart·focus·stale write 0를 두 실행 형태에서 동일하게 검증한다. |
| `D2-052` | 삽입 전체를 native Undo 한 번으로 제거하고 Redo 한 번으로 byte-identical 복구. picker/ghost toggle은 history 무영향 | 수동 history keydown 처리라 native browser transaction이라고 보기 어렵다. | `setRangeText`를 쓰지만 Chromium Ctrl+Z/Ctrl+Y 회귀 증거가 없다. | `부분` | 실제 editor transaction을 사용하고 Ctrl+Z/Ctrl+Y·모바일 undo 입력까지 별도 검증한다. |
| `D2-053`, `D2-054` | 직접 입력·`+`·template·기존 문서가 편집기 전체 `입력 예시 보기`를 공유. 인식된 빈 줄마다 ghost를 표시하고 source·clipboard·selection·scroll·revision·dispatch·Undo에 영향 0 | 선택 template 위 별도 sample block이다. template 적용 후 textarea focus로 모바일에서 sample이 viewport 밖으로 밀릴 수 있다. line-level ghost가 아니다. | “예: 이사 준비” 같은 카드 label뿐이며 scaffold 각 줄의 입력 예시는 없다. | `부분` | editor 안의 line overlay로 통합하고 `aria-hidden`, `pointer-events:none`, `user-select:none` 및 무영향 테스트를 추가한다. |
| `D2-058`, `D2-061` | cancel/Escape/blank/stale/invalid/storage failure write 0, 성공 atomic, Undo 1, 320/390/landscape/200%와 keyboard에서 CTA·caret 접근 | 많은 무변경·rollback·viewport 경로가 있으나 source fingerprint stale, visualViewport keyboard, 200%, 전역 nonmodal helper 증거가 없다. mobile textarea가 14px이라 iOS 확대 가능성도 있다. | safe-area는 낫지만 동일 오류·keyboard 계약 증거는 없다. | `부분` | 모바일 form 16px, visualViewport 대응, stale fingerprint, 200%와 forced inset 검증을 추가한다. |
| `D2-059`, `D2-060`, `D2-062`, `D2-064` | 격리 PoC와 main-stack 계보를 분리하며 실제 기기·관찰 사용자·AI·cloud·발행·외부 동기화는 현재 범위가 아니다. | 격리 query와 PoC namespace를 유지한다. | 로컬 전용이다. | `의도적 변경/제외 충족` | 자동화 결과를 실제 기기나 관찰 사용자로 표현하지 않는다. |

## 8. 세 결과물의 연결 흐름

| 여정 단계 | 주 owner | 원래 결정 | 현재 상태 | gap closure 기준 |
| --- | --- | --- | --- | --- |
| 기존 Flow 찾기·선택 | 개발 1 | 네 origin과 단일 discovery input, Map 평탄화 | origin read model은 있으나 discovery input·choose-child가 없음 | 기존 Flow 선택이 같은 Plan→Item surface로 들어오게 한다. |
| 새 Flow 원문 작성 | 개발 2 | plain-text first, AI 없음 | 충족 | 유지한다. |
| 작성 틀 도움 | 개발 2 | 선택형 6개 틀, 명시 insertion, same editor | 골격 충족, caret·Undo·ghost 부분 | 별도 template editor를 만들지 않는다. |
| 결과 확인 | 개발 2 + 개발 1 | 기본은 입력→결과, effective Text와 Todo·Calendar projection | 필수 구조 단계, effective Text·Calendar 누락 | 구조 검토를 선택으로 낮추고 필요한 projection 범위를 정한다. |
| 개인 조정 | 개발 1 | 공통 Item editor, source read-only + personal shadow edit | 날짜·폴더·순서만 공통 | title·memo와 source/personal 구획을 연결한다. |
| staged save | 개발 1 + 개발 2 | Plan 단위 draft/apply; creator 저장 owner는 별도 결정 | transition마다 즉시 PoC 저장, 결과는 Personal Flow | owner 결정 뒤 working draft와 durable apply를 분리한다. |
| 폴더·기간 실행 | v4.1 | flat list, QuickItem, today/week/month/undated | React 핵심 구현, standalone 기간 축약 | 같은 view model·visual grammar를 공유한다. |
| 이동·완료·복구 | v4.1 + 개발 1 | drag/menu/keyboard 동일 transition, Undo·dirty recovery | 모델 transition은 강함, touch surface·staged dirty 약함 | pointer surface와 staged lifecycle을 같은 transition 위에 얹는다. |

## 9. 제품 결정 대상

다음 표의 항목은 구현자가 임의로 확정하면 안 된다.

| 결정 | 충돌하거나 비어 있는 근거 | 결정 전 기본값 | 결정되면 바뀌는 범위 |
| --- | --- | --- | --- |
| 통합 shell/token owner | v4.1의 gray+teal 한 줄 shell 대 개발 1 production warm+cobalt token | exact-query PoC 안에서는 승인된 v4.1 shell을 일관되게 사용하고 운영 `PlatformNav`는 바꾸지 않는다. | 공통 navigation, color token, desktop canvas, standalone parity |
| Text Authoring 저장 owner | D2의 CreatorDraft/검토 준비 대 통합 blueprint의 Personal Flow 저장 | 두 lane을 같은 것으로 표현하지 않는다. PoC personal save는 실험 선택이라고 명시한다. | 저장 CTA, receipt, library 진입점, identity, reopen·archive |
| staged save 단위 | 개발 1의 Item draft→Plan apply 대 현재 transition별 durable PoC 저장 | 운영 writer는 금지하고 current shadow persistence를 제품 저장 완료로 표현하지 않는다. | dirty guard, impact summary, one-transaction apply, Undo scope |
| effective Text·Todo·Calendar 범위 | 개발 1은 Text 기본+전체 Todo·Calendar, 현재는 authoring preview+기간 Todo | Text와 authoring raw source를 동일시하지 않는다. | 상세 첫 탭, projection selector, Calendar, source-line mapping |
| Unified Live Editor 채택 범위 | D2 PoC의 현재 줄 raw·나머지 rendered·문맥형 `+` 대 현재 native textarea | ghost와 optional review만 먼저 복원하고 live editor 전체 채택은 보류한다. | editor architecture, IME, caret, keyboard menu, accessibility |
| multi-child Flow Map UX | 개발 1의 `choose_child` 대 현재 child 개별 노출 | 내부 map label을 제품 용어로 노출하지 않는다. | discovery grouping, result confirmation, back behavior |
| v4.1 이동 원안 변경 허용 | 오른쪽 corridor·맨 위/아래·날짜별 `+` 누락은 A9에서 복원됨. 좌측 destination과 shell 차이는 남음 | 복원된 조작은 유지하고 남은 좌측 destination·시각 문법만 A0에서 결정한다. | move panel geometry, pointer drop targets, standalone 역할 |
| standalone의 제품 동등성 | 현재는 조작 검증용 HTML이지만 사용자는 이를 실제 검증 surface로 사용 | React와 같은 핵심 여정·문구·상태를 제공한다고 가정하고 gap을 숨기지 않는다. | 공유 view model, authoring guidance, period UI, E2E·screenshots |

## 10. 구현 우선순위

### P0. 기준 고정

1. shell/token owner, authoring save owner, staged save 단위를 제품 결정으로 남긴다.
2. 최신 authoring 계약을 `plain-text first → optional template → explicit insertion → result → optional structure review`로 고정한다.
3. React와 standalone의 canonical 화면 상태와 screenshot 이름을 정한다.

### P1. 첫 화면과 작성 가능성

1. 공통 PoC chrome, 작동하는 `탐색`, 중복 CTA 제거, flat row, full-width desktop canvas를 적용한다.
2. 844×390 short-landscape와 네 방향 safe-area, 모바일 16px form control을 적용한다.
3. 필수 구조 단계를 제거하고 선택형 review drawer/bottom sheet로 바꾼다.
4. editor-wide line ghost와 예시 toggle을 React·standalone에 같이 구현한다.

### P2. 저장과 편집 lifecycle

1. 네 origin이 같은 source read-only/personal shadow editor로 들어오게 한다.
2. working Plan draft, 영향 확인, atomic PoC apply, discard/Back/focus return을 구현한다.
3. template insertion과 Plan apply의 Undo 범위를 각각 한 transaction으로 검증한다.

### P3. 실제 모바일 이동

1. 350ms/8px/pointerId/click suppression state machine과 trusted wheel 취소를 자동 검증했다.
2. React의 왼쪽 목적지 panel, 오른쪽 원 목록 corridor, before/after line, live result를 연결했다.
3. React edge auto-scroll·화면 밖 날짜·Undo와 fast scroll, outside drop, Escape, pointer cancel, blur, resize cleanup을 검증했다.
4. drag, long-press, `…`, keyboard는 같은 transition을 유지한다. 실제 touch와 standalone 좌측 destination parity는 남았다.

### P4. 기간 화면과 standalone 동등성

1. 주간·월간 날짜 grouping, 월간 정확한 빈 날짜 toggle과 날짜별 add는 구현했다.
2. React와 standalone의 상태·오류·Undo 문구와 storage mutation count를 같은 시나리오로 계속 대조한다.

### P5. 검증 증거 재생성

1. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 overflow·error·가림 0을 다시 확인했다.
2. `빈 편집기`, `picker open`, `template selected+ghost`, `valid result`, `optional review`, `save receipt`, `move panel`, `right corridor`, `month empty dates`를 분리한다.
3. forced safe-area, 200% zoom, exact pointer sequences, keyboard/non-drag 경로를 자동 검사한다.
4. 실제 Android Chrome, iOS Safari, 보조기술, 관찰 사용자는 실행 전까지 `미실행`과 `0명`으로 유지한다.

## 11. 구체 구현 표적

| 영역 | React 표적 | standalone 표적 |
| --- | --- | --- |
| shell·IA | `PersonalWorkspacePocSurface.tsx`의 root/header/tab, `PersonalWorkspacePocAuthoringSurface.tsx` header, `PlatformNav.tsx`와의 경계 | `standalone-shell.html` header, `app.js`의 `go-workspace`, duplicate authoring CTA |
| folder flat row·period | `PersonalWorkspacePocSurface.tsx`의 folder Flow cards와 timeline renderer | `app.js`의 `renderTask`, `renderPeriodView` |
| touch move | `WorkspaceTaskRow`, move panel resolver, pointer lifecycle | `app.js` dragover/drop/long-press block |
| right corridor·feedback | move panel open class/state, underlying row before/after target, live region | `.task-row` open-state layout, `.drop-before/.drop-after`, live status |
| authoring journey | `PersonalWorkspacePocAuthoringSurface.tsx`의 mobile stage·desktop 3-column·structure checkbox | authoring route/render state |
| template ghost·Undo | authoring textarea transaction, `personal-workspace-poc-authoring.ts` template contract | template selection, editor overlay, native history handling |
| responsive·safe area | workspace/authoring scoped shell, dialogs, sticky CTA, toast | mobile/short-landscape media query와 safe-area 변수 |

## 12. 검증에서 특히 잡아야 할 회귀

- template 선택 직후 390px 화면에서 각 빈 문법 줄의 예시가 실제 editor viewport에 보인다.
- ghost toggle 전후 source bytes, clipboard, selection, scrollTop, revision, dispatch count, Undo stack이 변하지 않는다.
- template 전체 삽입은 Undo 한 번으로 제거되고 Redo 한 번으로 byte-identical 복구된다.
- 8px 미만 long-press, 8px 이상 scroll gesture, synthetic click, 다음 정상 click을 연속 실행해 잘못 열린 panel과 누락된 click이 모두 0이다.
- right corridor에 행 이름 일부와 48px handle이 남고 pointer midpoint에 따라 앞/뒤 선이 바뀐다.
- 화면 밖 날짜로 edge auto-scroll해 놓은 뒤 Undo하면 원래 날짜·폴더·순서가 복원된다.
- 같은 위치, 취소, Escape, pointer cancel, blur, resize, 저장 오류의 PoC mutation과 storage write는 0건이다.
- 844×390에서 desktop shell이 나타나지 않고 panel 내부 scroll로 모든 목적지와 CTA에 도달한다.
- 월간 28개 빈 날짜와 점유 날짜 모두에서 QuickItem을 만들면 선택한 날짜가 저장되고
  취소·오류는 write 0이다.
- forced top/right/bottom/left inset 환경에서 navigation, main, panel, dialog, toast가 모두 안전 영역 안에 남는다.
- React와 standalone에서 같은 fixture를 생성·이동·완료·다시 열기·reload했을 때 사용자에게 보이는 결과가 같다.
- 기존 `flow:*` 운영 key/value는 시나리오 전후 byte-for-byte 동일하다.

## 13. UX 평가

`flow-ux-review`의 8개 축으로 현재 상태를 정성 평가했다. 이는 관찰 사용자 결과가 아니라 문서·코드·자동 증거 기반 전문가 검토다.

| 축 | 5점 만점 | 판단 |
| --- | ---: | --- |
| User Need Fit | 4 | 만들기→개인공간→실행 골격은 있으나 기존 Flow 편집과 staged save가 끊긴다. |
| Execution Clarity | 3 | 기능 이름은 비교적 명확하지만 중복 shell·CTA와 필수 3단계가 흐름을 무겁게 한다. |
| Content Fidelity | 3 | source 보존은 강하지만 React/standalone, v4.1/D1/D2의 화면 문법이 다르다. |
| Portability | 3 | 같은 Item projection 방향은 있으나 Calendar·TXT·Sheet와 source round-trip이 덜 연결됐다. |
| Cognitive Load | 2.5 | mobile chrome, 구조 확인, 이동 panel의 축약·중복이 판단 비용을 높인다. |
| Copy Specificity | 4 | 저장·Undo·오류 문구는 구체적이나 `탐색`처럼 결과와 맞지 않는 action이 남는다. |
| Source/Safety | 5 | PoC namespace, fail-closed, 운영 데이터 read-only 경계가 명확하다. |
| Accessibility/Operability | 3.5 | 48px·네 방향 키보드 이동·safe-area·live before/after·844×390 내부 scroll은 보강됐지만 실제 touch, 200% 확대, screen reader, standalone 좌측 destination 증거가 부족하다. |

현재 실제 기기 검사: Android Chrome 미실행, iOS Safari 미실행. 관찰 사용자 수: 0명.
