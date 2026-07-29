# FlowMe MECE UX Reset A안 개발 handoff

- 승인일: 2026-07-26
- 승인안: `A_prime`
- 상태: `UXR-08 approved`, `UXR-09 completed`, `P35-01 ready`
- 실제 관찰 사용자 수: 0명
- 이 문서에서 `A안`은 Claude Design 최신 검토의 `A′`를 뜻한다.

## 1. 개발 에이전트에 전달할 정본

작업 저장소:

```text
D:\flowme2605\flow-mvp
```

현재 저장소가 dirty이면 기존 변경을 건드리지 말고 최신 `origin/main`에서 clean worktree를 만든다.

먼저 읽을 파일:

1. `AGENTS.md`
2. `agent.md`
3. `docs/STATUS.md`
4. `docs/SERVICE_STRUCTURE.md`
5. `docs/specs/2026-07-26-flowme-mece-ux-reset/plan.md`
6. `docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md`
7. `docs/specs/2026-07-26-flowme-mece-ux-reset/simulation.md`
8. 이 문서

Codex 설계 branch:

```text
https://github.com/knhbae/flowme2605/tree/codex/flowme-mece-ux-reset-design-handoff
```

Claude Design 최신 원본:

```text
D:\flowme2605\flow-mvp\claude_work\FlowMe UXUI 전체 검토_0726_01.zip
```

검토용 압축 해제본:

```text
D:\flowme2605\flow-mvp\claude_work\_review_uxui_0726_01_20260726\2026-07-26-flowme-mece-ux-reset-claude-design-proposal
```

Claude Design 핵심 파일:

1. `README.md`
2. `review.html`
3. `ia-tree.md`
4. `screen-message-contract.json`
5. `interaction-grammar.md`
6. `implementation-handoff.md`
7. `decision-matrix.json`

Claude proposal과 Codex wireflow는 구현 전 설계 근거다. 현재 production 구현 증거나 실제 사용자 검증으로 표현하지 않는다.

## 2. 승인된 제품 결정

다음 결정은 이번 구현에서 다시 협상하지 않는다.

1. 별도 Home UI를 제거한다.
2. primary navigation은 `Flow 찾기 / Calendar / My Flow` 세 개다.
3. `/`는 저장 Flow가 있으면 `/my`, 없으면 `/flows`로 보내는 entry router다.
4. `/my`는 저장 Flow 목록, 검색, 상태 필터, lifecycle 진입만 소유한다.
5. `/my`의 `지금` 실행 mode는 제거한다.
6. My Flow 행은 제목, 개수, 읽기 전용 다음 예정 한 줄과 `Flow 열기`만 제공한다.
7. 개인 Flow workspace가 실행, 편집, 메모, 구조 조정, 가져가기, lifecycle을 소유한다.
8. Calendar는 날짜 lens다.
9. Calendar 행에는 동일한 run 상태를 읽는 `완료 / 다시 열기` primitive 하나만 남긴다.
10. Calendar의 inline 메모, 제목 수정, 날짜 이동, 날짜 없는 tray는 제거한다.
11. 제목, 날짜, 시간, 장소, 메모, 순서, 포함 여부 편집은 개인 Flow의 Item detail이 소유한다.
12. Calendar, Checklist, Routine, Sheet, Memo는 Flow의 projection 또는 renderer다. 전역 결과형 탭으로 만들지 않는다.
13. 별도 Goal 객체와 목표 dashboard는 추가하지 않는다.
14. source, published Flow, personal overlay, structural overlay, execution run, recurrence occurrence, export identity 계약은 변경하지 않는다.

완료 primitive는 예외적으로 여러 실행 행에서 렌더링할 수 있다. 단, 모든 표면에서 같은 component, 같은 상태, 같은 라벨, 같은 undo를 사용한다. 이 예외를 근거로 Calendar에 다른 편집 명령을 추가하지 않는다.

## 3. 화면별 메시지와 소유권

| Surface | 사용자 질문 | 핵심 메시지 | Primary action |
| --- | --- | --- | --- |
| Flow 찾기 | 무엇을 실행할까 | URL·메모 입력 또는 준비된 Flow 선택 | Flow 열기 |
| Public Flow | 무엇이 만들어질까 | 실제 전체 결과와 필요한 최소 입력 | `N개 결과로 시작` |
| 조정 | 무엇만 바꿀까 | 한 번에 한 종류와 변경 전후 | 변경 적용 |
| 저장 결과 | 무엇이 저장됐나 | 저장 이름, 개수, 날짜 범위 | 내 Flow 열기 |
| My Flow | 무엇을 저장했나 | 저장 목록과 다음 예정 한 줄 | Flow 열기 |
| 개인 Flow | 지금 무엇을 할까 | 다음 하나와 전체 진행 | 완료 또는 다시 열기 |
| Item detail | 이 할 일에서 무엇을 할까 | 완료 기준, 날짜, 개인 메모 | 완료 또는 다시 열기 |
| Calendar | 날짜별로 무엇이 있나 | 월 일정과 선택일 agenda | Flow 열기 |
| 가져가기 | 무엇이 나가나 | 범위·개수와 형식별 손실 | `N개 형식으로 가져가기` |
| Flow 관리 | 이 사본을 어떻게 관리할까 | lifecycle 상태와 복구 범위 | 보관 또는 복구 |

모든 화면은 핵심 메시지 최대 두 개, 경쟁하는 primary action 최대 하나를 지킨다.

## 4. KEEP / CUT / MOVE

### KEEP

- 실제 전체 Flow 결과
- 콘텐츠별 natural primary artifact
- 필요한 최소 anchor 입력
- 저장 결과 receipt
- 완료와 다시 열기
- 취소, undo, 복구
- source URL, sourceTrace, 원문과 개인 수정본 분리
- 개인 고정 날짜와 메모
- whole / selected / current export scope
- archive / restore / archived-only permanent delete
- 24개 전체판과 기존 5개 간단판의 별도 보존

### CUT

- 별도 Home hero와 활용 예시 카드
- `/my`의 `지금` 실행 mode
- 접근 불가능한 `checklist`, `routine` view branch
- Public Flow의 요약 chip 세 개
- Public Flow의 결과 형태 전환 탭
- My Flow 카드 안 `첫 할 일 / 전체 보기 / Calendar / 가져가기` 네 명령
- Calendar inline 메모, 제목 수정, 날짜 이동, 날짜 없는 tray
- Calendar cell의 잘린 제목 chip
- 형식을 먼저 고르게 하는 export UI
- 실제 근거 없는 이용자 수, 리뷰, 평점

### MOVE

- My Flow의 실행 명령 → 개인 Flow
- Calendar의 제목·날짜·메모 편집 → 개인 Flow Item detail
- 날짜 없는 Item 실행과 날짜 설정 → 개인 Flow
- Public Flow의 secondary artifact → 저장 후 가져가기
- 스튜디오와 데이터 관리 → My Flow 보조 메뉴

이동 후 같은 기능을 기존 위치에도 남기지 않는다.

## 5. 구현 프로그램

| Slice | 목표 | 선행 조건 |
| --- | --- | --- |
| `P35-01` | `/` entry router와 3탭 navigation | 없음 |
| `P35-02` | Public Flow 결과 우선 첫 viewport | `P35-01` |
| `P35-03` | 저장 전 조정을 한 번에 한 종류로 정리 | `P35-02` |
| `P35-04` | `MyFlows` 안전 분리와 dead branch 제거 | `P35-01` |
| `P35-05` | My Flow library와 개인 Flow 집중 workspace | `P35-04` |
| `P35-06` | Calendar lens와 완료 primitive | `P35-04`, `P35-05` |
| `P35-07` | scope-first export | `P35-05` |
| `P35-08` | visual, responsive, accessibility, final journey gate | `P35-02`~`P35-07` |

한 번에 한 slice만 구현하고 검증한다.

### 중요한 소스 경계

현재 `components/flow/AppClient.tsx`의 `MyFlowView`에는 `calendar`, `checklist`, `routine`이 함께 있지만 의미가 다르다.

- `checklist`, `routine`: 현재 상위 진입에서 접근할 수 없는 dead branch다.
- `calendar`: `/calendar` route가 `MyFlows(initialView="calendar", surface="calendar")`로 실제 사용한다.

따라서 `calendar`를 `checklist`, `routine`과 함께 삭제하지 않는다. `P35-04`에서 Calendar surface를 먼저 분리하고, route 동작과 저장 상태가 유지된 뒤 기존 `calendar` branch를 제거한다.

## 6. 지금 실행할 첫 목표: P35-01

이번 개발 실행에서는 `P35-01`만 수행하고 멈춘다.

### 목표

별도 Home UI와 4탭 navigation을 제거하고, 저장 상태에 맞는 시작점으로 연결한다.

### 범위

- `/` entry router
  - 저장 Flow 0개: `/flows`
  - 저장 Flow 1개 이상: `/my`
- 전역 primary navigation을 `Flow 찾기 / Calendar / My Flow` 세 개로 축소
- 기존 Home hero, 활용 예시, Home CTA 제거
- 기존 저장 데이터 getter를 사용해 read-only로 분기
- direct route `/flows`, `/calendar`, `/my`, `/f/[slug]` 유지
- 이동 후 heading과 `aria-current` 정합성 유지

### 비범위

- Public Flow composition 변경
- My Flow library 재구성
- Calendar command 제거
- `MyFlowView` type 변경
- 데이터 key 또는 schema 변경
- migration
- Goal 기능
- 새로운 dashboard, Inbox, 추천, social proof
- commit, push, PR, merge, deploy

### 구현 원칙

- 새 localStorage key를 만들지 않는다.
- 저장 Flow 판정 실패 시 `/flows`로 안전하게 이동한다.
- entry router에는 사용자 조작 UI를 만들지 않는다.
- hydration 전후에 Home이나 잘못된 목적지가 잠깐 보이지 않게 한다.
- browser back loop를 만들지 않도록 replace navigation을 사용한다.
- 제거한 Home 기능을 `/flows` 상단에 새 카드나 설명으로 옮기지 않는다.
- 새 사용자 대면 설명을 추가해 route 변화를 해명하지 않는다.

### 검증

- 저장 Flow 0개 상태에서 `/` → `/flows`
- 저장 Flow 1개 이상 상태에서 `/` → `/my`
- `/flows`, `/calendar`, `/my` 직접 접근
- mobile `390x844`
- wide `1024x768`
- 대표 `1440x900`
- nav 항목 정확히 세 개
- 현재 route의 `aria-current`
- keyboard focus 순서
- horizontal overflow `0`
- fixed overlap `0`
- console/page error `0`
- redirect loop `0`
- 기존 저장 identity와 localStorage diff `0`
- 관련 unit/E2E
- `npm.cmd run docs:check`
- `npm test`
- `npm.cmd run build`
- `git diff --check`

### acceptance marker

```text
P35-ENTRY-ROUTER-3TAB
```

필수 screenshot:

```text
p35-01-entry-empty-390.png
p35-01-entry-saved-390.png
p35-01-nav-1024.png
p35-01-nav-1440.png
```

### rollback

entry router를 고정 `/flows` 이동으로 되돌리고 기존 4탭 navigation을 복원할 수 있어야 한다. 데이터 변경이 없어야 한다.

### 완료 보고

다음을 분리해서 보고한다.

1. 변경 파일
2. 제거된 Home surface와 navigation 항목
3. 저장 0개와 저장 있음 route 결과
4. 접근성·overflow·browser error 결과
5. unit, targeted E2E, docs, build 결과
6. 미검증 gap
7. app code 변경 여부
8. commit / push / PR / merge / deploy 상태
9. observed-user count `0`

`P35-01` 완료 후 다음 slice를 임의로 시작하지 않는다.

## 7. 개발 에이전트 복붙용 요청

```text
D:\flowme2605\flow-mvp 또는 최신 origin/main의 clean worktree에서 FlowMe MECE UX Reset A안의 첫 구현 slice인 P35-01을 수행해줘.

먼저 아래 정본을 처음부터 끝까지 읽어라.

1. AGENTS.md
2. agent.md
3. docs/STATUS.md
4. docs/SERVICE_STRUCTURE.md
5. docs/specs/2026-07-26-flowme-mece-ux-reset/plan.md
6. docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md
7. docs/specs/2026-07-26-flowme-mece-ux-reset/simulation.md
8. docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md

승인안은 A_prime이다. 제품 결정을 다시 열지 않는다.

이번 목표:
- 별도 Home UI 제거
- /는 저장 Flow가 있으면 /my, 없으면 /flows로 replace 이동
- primary navigation을 Flow 찾기 / Calendar / My Flow 3개로 축소
- direct route와 저장 데이터 계약 유지

이번에는 P35-01만 구현하고 멈춰라.

중요:
- checklist와 routine dead branch 삭제는 P35-04 준비 항목이며 이번 범위가 아니다.
- calendar는 /calendar가 실제 사용하는 live branch다. 삭제하지 마라.
- localStorage key, schema, source/personal/run/occurrence/export identity를 변경하지 마라.
- 제거한 Home 내용을 /flows의 새 설명, 카드, 메뉴로 옮기지 마라.
- 새 dashboard, Inbox, Goal, social proof를 만들지 마라.
- dirty worktree의 기존 사용자 변경을 보존하라.
- commit, push, PR, merge, deploy는 하지 마라.

저장 0개와 저장 있음 상태를 390x844, 1024x768, 1440x900에서 검증하고 P35-ENTRY-ROUTER-3TAB evidence를 남겨라.

검증:
- npm.cmd run docs:check
- npm test
- npm.cmd run build
- 관련 targeted Playwright
- git diff --check

자동화와 screenshot은 실제 사용자 검증이 아니다. observed-user count는 0이다.

완료 후 변경 파일, 제거 범위, route 결과, 테스트, 미검증 gap, publish 상태를 분리해 보고하고 다음 slice를 시작하지 마라.
```

## 8. P35 전체 순차 실행 계약

P35는 아래 순서로만 진행한다.

```text
P35-01
  → P35-02
  → P35-03
  → P35-04
  → P35-05
  → P35-06
  → P35-07
  → P35-08
```

기술적으로 일부 slice를 병렬로 시작할 수 있어도 같은 worktree에서 병렬 구현하지 않는다. 앞 단계의 사용자 대면 계약과 evidence marker가 확정된 뒤 다음 단계를 시작한다.

각 slice의 공통 실행 순서:

1. 최신 `origin/main`과 이전 slice의 실제 반영 SHA를 기록한다.
2. dirty worktree이면 기존 변경을 보존하고 clean worktree를 만든다.
3. 이 문서에서 해당 slice의 선행 조건과 비범위를 읽는다.
4. 현재 production, current source, 이전 slice evidence가 충돌하면 current source와 실제 브라우저 동작을 우선한다.
5. 해당 slice만 구현한다.
6. 삭제한 UI를 다른 카드, 메뉴, 설명, 탭으로 옮기지 않는다.
7. 관련 unit, targeted E2E, viewport screenshot을 먼저 검증한다.
8. blast radius가 넓으면 full test와 full E2E를 추가한다.
9. acceptance marker와 rollback 가능 여부를 기록한다.
10. 다음 slice를 자동으로 시작하지 않고 멈춘다.

공통 금지:

- 새 데이터 계층이나 migration 추가
- source, personal, structural, run, occurrence, export identity 통합
- account, DB, cloud sync, crawler, 실제 AI, OAuth 구현
- 별도 Goal 객체나 목표 dashboard 추가
- 가상의 사용자 수, 리뷰, 평점 노출
- 삭제한 기능을 새 이름으로 다시 추가
- 설명문으로 소유권이나 계층 문제를 해명
- 기존 dirty 변경 되돌리기
- 별도 요청 없는 commit, push, PR, merge, deploy

공통 사용자 대면 기준:

- 화면별 핵심 메시지 최대 두 개
- 경쟁하는 primary action 최대 하나
- 한 기능의 주 소유 surface 하나
- 모바일에서 primary action 전후에 중복 CTA 없음
- 취소, undo, 다시 열기, 복구는 삭제하지 않음
- 실제 관찰 사용자 수는 계속 `0`

## 9. P35-02: Public Flow 결과 우선 첫 viewport

### 사용자 문제

현재 public Flow는 사용자가 저장될 전체 결과를 읽기 전에 설명, 요약 chip, 결과 형태 선택, 설정을 먼저 해석하게 만든다. 사용자는 “무엇이 만들어지는가”보다 “어떤 옵션을 고를 것인가”를 먼저 마주한다.

### 적용 route

- `/f/[slug]`
- `/flow-maps/[map]` 중 동일한 public save-before frame을 사용하는 route
- 회귀 사례:
  - `/f/moving-d30-basic`
  - `/f/vehicle-inspection-prep`
  - `/f/curated-allblanc-morning-workout`
  - `/f/source-backed-middle-school-math-1`

### 범위

- 첫 viewport의 순서를 `제목·출처 → 실제 전체 결과 → 필요한 최소 입력 → 단일 시작 행동`으로 재구성
- 콘텐츠별 natural primary artifact를 실제 데이터로 먼저 렌더링
- 현재 저장될 Item 수, 날짜 범위 또는 날짜 없음, 반복 요약을 결과 가까이에 표시
- 결과가 긴 경우 전체 개수와 대표 행을 먼저 보여주고 같은 영역에서 전체 범위를 펼침
- source 링크와 원문 추적은 보존하되 primary action과 경쟁하지 않게 배치
- 저장 전 결과와 저장 후 receipt가 서로 다른 frame으로 유지되도록 상태 경계 확인
- CTA는 실제 결과 개수를 포함한 `N개 결과로 시작` 계열 하나로 통일

### CUT

- 설명만 반복하는 요약 chip 세 개
- 실제 projection을 바꾸지 않는 결과 형태 전환 tab
- primary artifact와 같은 내용을 다시 보여주는 중복 전체 Flow 카드
- 저장 CTA와 동일한 결과를 만드는 중복 CTA
- 모든 콘텐츠에 Calendar, Checklist, Sheet, Memo를 강제로 나열하는 UI

### KEEP

- source URL과 sourceTrace
- 콘텐츠별 primary artifact 정책
- 날짜·반복·안전·권리 상태
- 저장 전 전체 Flow projection
- blocked 또는 review-before-apply 상태와 다음 행동

### 예상 영향 파일

- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `components/flow/AppClient.tsx`
- `lib/flow/flow-experience-projection.ts`
- public Flow 관련 unit/E2E helper와 spec

실제 영향 파일은 current source를 기준으로 좁힌다. projection 계약이 충분하면 새 projection을 만들지 않는다.

### 데이터 영향

- 저장 schema 변경 없음
- primary/secondary eligibility 계약 변경 없음
- 기존 source/personal identity 변경 없음
- migration 없음

### 완료 기준

- 390px 첫 viewport에서 실제 결과와 최소 입력, primary action의 관계를 이해할 수 있음
- 사용자 대면 결과 선택 surface는 최대 두 개
- first useful preview 전 필수 입력은 콘텐츠 계약상 필요한 `0~2개`
- 이사, 날짜 없음, 반복, 장기 학습 네 shape가 같은 frame grammar를 사용
- blocked content는 가짜 결과나 live AI 생성처럼 보이지 않음
- 저장 전과 저장 후 상태의 heading, CTA, route가 구분됨
- horizontal overflow, fixed overlap, console/page error가 없음

### acceptance marker

```text
P35-PUBLIC-RESULT-FIRST
```

필수 screenshot:

```text
p35-02-moving-save-before-390.png
p35-02-undated-save-before-390.png
p35-02-routine-save-before-1024.png
p35-02-learning-save-before-1440.png
```

### rollback

기존 `FlowSaveBeforeFrame` composition으로 되돌릴 수 있어야 한다. 저장 payload와 source identity가 바뀌지 않아야 한다.

## 10. P35-03: 저장 전 조정을 한 번에 한 종류로 정리

### 사용자 문제

저장 전 조정이 여러 필드와 명령을 한 번에 펼치면 사용자는 전체 Flow보다 설정 폼을 먼저 관리하게 된다. 어떤 변경이 결과의 제목, 날짜, 포함 Item, 반복 회차에 영향을 주는지도 예측하기 어렵다.

### 적용 route

- P35-02의 public save-before frame
- public Flow의 `조정하고 시작` 또는 이에 대응하는 기존 action

### 범위

- 조정 종류를 `이름 / 기준일·날짜 / 포함 항목 / 반복`으로 구분
- 한 번에 한 조정 panel만 열림
- Flow shape에 필요 없는 조정 종류는 숨김
- 각 panel에 변경 전과 변경 후 결과를 같은 맥락에서 표시
- `변경 적용`과 `취소`를 같은 위치에 제공
- 적용 후 public result preview의 개수, 날짜 범위, 반복 요약을 즉시 갱신
- Item 제목, 날짜, 포함 여부, 순서 편집은 기존 personal overlay와 structural overlay 계약을 재사용
- 고급 Item detail 전체 편집기는 저장 후 개인 Flow가 소유

### progressive disclosure 규칙

| 입력 | 나타나는 조건 | 첫 결과 전 필수 여부 | 사용 위치 |
| --- | --- | --- | --- |
| 저장 이름 | 사용자가 개인 이름을 바꾸려 할 때 | 선택 | receipt, My Flow, export |
| 기준일 | 상대 날짜 계산에 필요할 때 | 해당 Flow만 필수 | dated projection |
| Item 포함 여부 | 일부만 시작하려 할 때 | 선택 | personal structural overlay |
| 반복 요일·시간·종료 | 반복 Flow일 때 | 계약상 필요한 최소값만 필수 | occurrence projection |
| 개별 날짜·메모 | 고급 조정 진입 시 | 선택 | personal Flow Item detail |

### CUT

- 모든 지원 필드의 동시 노출
- 닫힌 panel의 미리보기와 본문 중복
- 적용 결과를 알 수 없는 일반 `저장` 라벨
- 같은 값을 public frame과 별도 modal에서 두 번 입력하는 흐름

### 예상 영향 파일

- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `components/flow/RoutineScheduleEditor.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- public date intent, routine projection, structural overlay 관련 모듈과 tests

### 데이터 영향

- existing date intent와 personal overlay 재사용
- 새 설정 object, localStorage key, migration 없음
- 적용 전 취소 시 저장 데이터 변경 없음

### 완료 기준

- 동시에 열린 조정 panel은 최대 하나
- 적용 전후 Item 수와 날짜 범위를 계산 없이 비교 가능
- 취소 후 preview와 저장 payload가 원상 복구
- 제외 Item은 active preview와 export count에서 빠지고 원본에는 남음
- 반복 Flow에서 series 설정과 예시 occurrence가 구분됨
- keyboard로 panel 선택, 입력, 적용, 취소, focus return 가능

### acceptance marker

```text
P35-ADJUST-ONE-KIND
```

필수 screenshot:

```text
p35-03-adjust-name-390.png
p35-03-adjust-anchor-390.png
p35-03-adjust-items-1024.png
p35-03-adjust-routine-1440.png
```

### rollback

새 panel composition만 되돌린다. overlay payload와 저장 계약은 그대로 유지해야 한다.

## 11. P35-04: MyFlows 안전 분리와 dead branch 제거

### 목적

사용자 대면 redesign 전에 `MyFlows`가 동시에 소유한 My Flow와 Calendar 렌더링을 안전하게 분리한다. 이 slice는 구조 정리와 dead UI 제거이며 새로운 사용자 기능을 만들지 않는다.

### 핵심 소스 사실

- `checklist`, `routine`은 현재 상위 진입에서 접근할 수 없는 dead view다.
- `calendar`는 `/calendar`가 실제 사용하는 live view다.
- Calendar 분리 전에 `calendar` branch를 삭제하면 `/calendar`가 깨진다.

### 범위

1. current source에서 `MyFlowView`, `MyFlowLocalView`, `MyFlowWorkspaceView`의 실제 호출 관계를 기록
2. Calendar surface를 독립 component 경계로 추출하되 동작은 먼저 동일하게 유지
3. `/calendar`가 추출된 surface를 직접 렌더링하도록 연결
4. route, query fixture, 저장 상태, completion handler, export identity parity 확인
5. 접근 불가능한 `checklist`, `routine` type·branch·라벨·테스트 assertion 제거
6. Calendar 추출 후 사용되지 않는 기존 `calendar` branch와 변환 table만 제거
7. giant component 내부의 공유 handler는 계약이 안정된 범위에서만 props 또는 hook으로 전달

### CUT

- dead `checklist`, `routine` branch와 전용 사용자 라벨
- dead branch만 검증하던 assertion
- Calendar 추출 후 남는 중복 conditional rendering

### KEEP

- `/my` 현재 동작은 P35-05 전까지 유지
- `/calendar` 현재 동작은 P35-06 전까지 유지
- completion, archive, export, recurrence, demo fixture 동작
- localStorage key와 migration path
- 저장된 legacy copy 접근 경로

### 예상 영향 파일

- `components/flow/AppClient.tsx`
- 새 Calendar surface component 또는 기존 Calendar 관련 component
- `components/flow/CalendarFlowScopePicker.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `lib/flow/my-flow-local-ia.ts`
- My Flow·Calendar 관련 unit/E2E

새 component 이름은 current component graph에 맞춰 정하되 사용자 대면 새 개념을 만들지 않는다.

### 데이터 영향

- 없음
- migration 없음
- serialization/deserialization diff 없음
- fixture stable identity 유지

### 구조 지표

시작과 종료 시 다음을 같은 방식으로 측정한다.

- `MyFlows` 내부 `<button>` 수
- 고유 사용자 대면 한글 라벨 수
- 삼항 및 `&&` 렌더 분기 수
- `MyFlows` 함수 줄 수
- 제거한 dead assertion 수

추출 때문에 파일 전체 줄 수가 일시적으로 늘 수 있지만 `MyFlows`의 책임, dead branch, 조건 수는 감소해야 한다. 새로운 사용자 대면 라벨 순증은 `0`이어야 한다.

### 완료 기준

- `/calendar` route interaction parity
- `/my` route interaction parity
- `checklist`, `routine` dead view가 source와 테스트에서 제거됨
- Calendar route가 더 이상 `initialView="calendar"`로 giant `MyFlows`를 호출하지 않음
- 저장·완료·복구·export identity의 before/after structured diff가 없음
- 390/1024 fixture에서 overflow, focus, console error 회귀 없음

### acceptance markers

```text
P35-MYFLOW-SAFE-SPLIT
P35-DEAD-VIEW-REMOVAL
```

필수 evidence:

```text
p35-04-complexity-before-after.json
p35-04-route-parity.json
p35-04-my-390.png
p35-04-calendar-1024.png
```

### rollback

추출된 Calendar component 연결만 되돌리면 기존 route가 복원돼야 한다. 데이터와 저장 schema를 건드리지 않으므로 별도 data rollback이 없어야 한다.

## 12. P35-05: My Flow library와 개인 Flow 집중 workspace

### 사용자 문제

현재 `/my`는 목록, 오늘 실행, 완료, 전체 구조, 편집, export, lifecycle을 한 화면에 누적해 사용자가 “무엇을 저장했는가”와 “지금 이 Flow에서 무엇을 할까”를 동시에 해석하게 한다.

### 적용 route

- `/my`
- 기존 개인 Flow 선택·상세 진입 경로
- `/my?demo=ux20&view=flows` 및 1·5·20·60개 fixture

### 범위: My Flow library

- `/my`는 저장한 Flow를 찾고 여는 library로 한정
- `지금`과 `완료`는 독립 상위 화면으로 두지 않고 실행·완료 상태를 library 필터와 개인 Flow 안에서 읽음
- 목록 행 기본 정보:
  - 개인 저장 이름
  - active Item 수 또는 전체 진행 수
  - 읽기 전용 다음 예정 한 줄
  - `Flow 열기`
- Flow 수가 많을 때만 검색과 상태 필터를 점진적으로 노출
- lifecycle 보조 진입은 선택한 Flow 또는 보조 메뉴 한 곳에만 제공
- archived Flow는 별도 상태 필터에서 찾고 복구 가능
- 저장 직후 receipt에서 `내 Flow 열기`로 같은 개인 사본 workspace에 진입

### 범위: 개인 Flow workspace

- 첫 메시지: 다음 실행 Item 하나와 완료/다시 열기
- 두 번째 메시지: 전체 구조와 진행
- Item을 열면 제목, 날짜, 시간, 장소, 메모, 포함 여부 편집
- 추가, 삭제, 복구, 재정렬은 구조 조정 mode 한 곳에서 제공
- 가져가기와 lifecycle은 secondary command 영역에 배치
- 같은 occurrence를 여러 영역에서 중복 렌더링하거나 각각 완료시키지 않음
- 날짜 없음은 개인 Flow에서 유효한 실행 상태로 유지

### CUT

- `/my`의 `지금` 실행 mode
- `/my`의 독립 `완료` 상위 view
- 목록 카드 안 `첫 할 일 / 전체 보기 / Calendar / 가져가기` 네 명령
- 목록 행에서 Item 완료, 메모, 날짜 수정
- 같은 다음 Item의 중복 카드
- 결과 형태별 `checklist`, `routine` 탐색

### KEEP

- 완료와 다시 열기
- Item add/delete/restore/reorder
- title/date/time/location/memo overlay
- source-backed 제외와 개인 draft 삭제의 구분
- archive/restore/archived-only permanent delete
- legacy 24개·5개 copy 선택과 보존

### 예상 영향 파일

- `components/flow/AppClient.tsx`
- `components/flow/MyFlowDataManager.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `lib/flow/my-flow-local-ia.ts`
- `lib/flow/my-flow-focused-workspace.ts`
- `lib/flow/my-flow-workspace-presentation.ts`
- personal state, structural overlay, lifecycle 관련 modules/tests
- My Flow E2E helper와 P26~P34 관련 assertions

### 데이터 영향

- existing personal overlay, run, lifecycle 저장 계약 재사용
- Today/Completed view removal 때문에 데이터는 삭제하지 않음
- 완료 기록, memo, archived state, legacy copy 유지
- migration 없음

### 완료 기준

- `/my` 첫 viewport는 library 메시지 하나와 목록 열기 action만 전달
- Flow 1개와 60개 모두 같은 행 grammar 사용
- 목록 행의 primary action은 하나
- 개인 Flow workspace에서 다음 Item과 전체 진행이 중복되지 않음
- 제목·날짜·메모 편집까지 최대 3 interaction depth
- 완료와 다시 열기가 같은 위치와 component에서 동작
- 보관 직후 undo, 새로고침 후 복구, archived-only permanent delete 가능
- 390px에서 여러 종류의 카드가 동시에 첫 viewport를 점유하지 않음
- 1024/1440은 library rail과 focused canvas 역할이 명확함

### acceptance markers

```text
P35-MY-LIBRARY-ONLY
P35-PERSONAL-SINGLE-FOCUS
```

필수 screenshot:

```text
p35-05-my-library-1-390.png
p35-05-my-library-20-390.png
p35-05-personal-flow-390.png
p35-05-my-library-workspace-1024.png
p35-05-my-library-60-1440.png
```

### rollback

새 library와 workspace composition을 feature boundary 단위로 되돌릴 수 있어야 한다. 저장 데이터가 그대로이므로 기존 My Flow UI가 같은 개인 사본을 다시 읽을 수 있어야 한다.

## 13. P35-06: Calendar lens와 공유 완료 primitive

### 사용자 문제

Calendar가 날짜 조회와 Flow 선택 외에 메모, 제목, 날짜 이동, 날짜 없는 일 관리, 완료를 함께 소유하면 개인 Flow와 조작 문법이 중복된다. 반대로 실행 상태를 전혀 바꾸지 못하면 날짜 agenda에서 기본적인 완료 흐름이 끊어진다.

### 승인된 경계

- Calendar의 주 역할은 여러 Flow를 날짜로 보는 lens다.
- Calendar는 예외적으로 공유 `완료 / 다시 열기` primitive 하나를 렌더링한다.
- 그 외 편집은 해당 개인 Flow의 Item detail로 이동한다.
- 날짜 없는 Item은 Calendar의 별도 tray가 아니라 개인 Flow에서 실행·날짜 설정한다.

### 범위

- month cell은 점, 개수, 짧은 Flow 구분만 사용
- 선택일 agenda에서 Flow별로 Item을 묶어 표시
- agenda 행 선택 또는 Flow heading으로 같은 개인 Flow를 열기
- 같은 `FlowExecutionPrimitives`와 run identity로 완료·다시 열기
- 완료 직후 동일 위치에서 undo 또는 다시 열기 가능
- Flow 검색·scope 선택은 많은 Flow에서만 점진적으로 노출
- selected day, selected Flow, scroll/focus 상태를 안정된 identity로 유지
- 반복 Item은 occurrence를 표시하고 series 정의 편집은 개인 Flow로 이동

### CUT

- Calendar inline 메모
- Calendar inline 제목 편집
- Calendar inline 날짜 이동과 batch date placement
- 날짜 없는 Item tray와 Calendar 내 날짜 배치
- cell의 긴 제목 chip
- raw recurrence rule
- Calendar 전용 완료 상태나 별도 undo 문법

### 예상 영향 파일

- P35-04에서 분리한 Calendar surface
- `components/flow/CalendarFlowScopePicker.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `lib/flow/calendar-flow-scope.ts`
- `lib/flow/calendar-keyboard-navigation.ts`
- 기존 unscheduled tray와 date move modules의 UI 연결
- Calendar unit/E2E

사용하지 않게 된 helper는 다른 실제 호출자가 없는지 확인한 뒤 제거한다. 저장 데이터 호환을 위해 기존 date 값 자체를 삭제하지 않는다.

### 데이터 영향

- run과 occurrence state 계약 유지
- Calendar 전용 새 completion state 금지
- undated Item 데이터 유지
- date move 저장 contract는 개인 Flow가 계속 사용할 수 있으면 유지
- migration 없음

### 완료 기준

- 같은 Item의 title, date, completion, stable identity가 개인 Flow와 Calendar에서 일치
- Calendar에서 완료 후 개인 Flow에 즉시 반영되고 다시 열기도 양쪽에 반영
- agenda 행의 편집 진입은 개인 Flow Item detail 한 곳
- 20·60 Flow에서 scope picker가 가로로 긴 chip 행이 되지 않음
- month cell은 390px에서 잘린 긴 제목 없이 일정 밀도를 전달
- keyboard로 날짜 이동, agenda 진입, 완료, 다시 열기, Flow 열기 가능
- sheet/dialog 사용 시 focus trap, Escape, focus return이 정상
- ghost row, stale completion, fixed overlap, overflow 없음

### acceptance marker

```text
P35-CALENDAR-LENS-ONE-TOGGLE
```

필수 screenshot:

```text
p35-06-calendar-month-390.png
p35-06-calendar-agenda-390.png
p35-06-calendar-multi-flow-1024.png
p35-06-calendar-60-flow-1440.png
```

### rollback

P35-04에서 분리한 기존 Calendar surface로 되돌릴 수 있어야 한다. run/occurrence 데이터는 동일하므로 상태 변환이나 data rollback이 없어야 한다.

## 14. P35-07: 범위를 먼저 고르는 export

### 사용자 문제

형식을 먼저 고르면 사용자는 실제로 전체 Flow, 선택 Item, 현재 Item 중 무엇이 나가는지와 몇 개 결과가 생성되는지 예측하기 어렵다.

### 적용 surface

- 개인 Flow workspace의 가져가기
- Item detail의 현재 항목 가져가기
- 선택 mode의 선택 항목 가져가기
- 저장 receipt에서 허용된 빠른 export 진입

### 범위

1. 범위를 먼저 선택:
   - 전체 `whole`
   - 선택 `selected`
   - 현재 `current`
2. 각 범위 옆에 실제 포함 개수 표시
3. 범위 확정 후 해당 콘텐츠에 유효한 형식만 제시
4. 형식별 포함·제외 정보와 손실을 실행 전에 표시
5. 개인 수정본의 제목, 날짜, 메모, 포함 여부를 모든 projection이 동일하게 읽음
6. export 후 receipt에 scope, count, format, stable identity, 다음 행동 표시
7. 날짜 없는 Item의 ICS가 불가능하면 비활성 이유를 구체적으로 표시

### CUT

- 형식부터 나열하는 다섯 tab
- 지원되지 않는 형식의 빈 preview
- 범위와 개수를 숨긴 일반 `내보내기`
- 같은 형식의 중복 copy/download CTA
- source 원본과 personal result를 혼동시키는 문구

### KEEP

- Calendar/ICS, checklist, sheet/TSV, memo/Markdown projection
- whole/selected/current 계약
- loss warning
- source provenance
- export identity와 receipt

### 예상 영향 파일

- `components/flow/ArtifactWorkbench.tsx`
- 개인 Flow export UI를 소유한 component
- `lib/flow/export.ts`
- `lib/flow/export-scope.ts`
- `lib/flow/export-labels.ts`
- `lib/flow/my-flow-step-export.ts`
- personal structural list export 관련 modules/tests
- unified export E2E

### 데이터 영향

- export projection과 receipt schema는 가능하면 그대로 사용
- scope enum이나 identity 변경 금지
- 형식 eligibility를 새 저장 상태로 만들지 않음
- migration 없음

### 완료 기준

- 실행 전 scope와 actual count를 예측 가능
- whole/selected/current가 각각 실제 count와 일치
- 제외 Item은 export에서 빠지고 원본에는 유지
- date·title·memo가 My Flow, Calendar, export에서 일치
- ICS event 수, checklist 행 수, TSV 행 수가 receipt count와 일치
- 현재 Item과 선택 Item이 없을 때 disabled reason과 recovery action이 있음
- keyboard로 scope, format, preview, export, close, focus return 가능

### acceptance markers

```text
P35-EXPORT-SCOPE-FIRST
P35-EXPORT-COUNT-PARITY
```

필수 screenshot:

```text
p35-07-export-whole-390.png
p35-07-export-selected-390.png
p35-07-export-current-1024.png
p35-07-export-receipt-1440.png
```

### rollback

기존 export UI composition으로 되돌려도 같은 projection과 receipt를 읽어야 한다. export data migration은 없어야 한다.

## 15. P35-08: 시각·반응형·접근성·최종 여정 gate

### 목적

P35-01~07에서 확정한 화면 소유권과 interaction grammar를 하나의 상용 앱 수준 visual system으로 마감한다. 이 slice는 새로운 기능을 추가하는 단계가 아니다.

### 범위

- shared visual grammar:
  - page header
  - library row
  - focused Flow header
  - execution row
  - Item detail
  - selected-day agenda
  - adjustment panel
  - export scope row
  - receipt
  - lifecycle menu
- command hierarchy:
  - primary
  - secondary
  - overflow
  - destructive
  - undo
- 모바일 390px:
  - 한 column
  - bottom navigation과 content 간격
  - sheet/dialog focus와 safe area
- 1024px:
  - library rail / canvas
  - Calendar grid / agenda
- 1440px:
  - rail / canvas / optional inspector
  - 과도한 빈 공간과 늘어진 모바일 card 방지
- 색상, typography, spacing, border, focus token 정합성
- 사용자 대면 label, icon, accessible name, status feedback 통일

### 비범위

- 새 route, tab, object, planner 기능
- 데이터 계약 변경
- Home 재도입
- Calendar 편집 기능 재도입
- My Flow Today mode 재도입
- 설명 블록 추가
- account, sync, OAuth

### 최종 canonical journey gate

다음 다섯 shape를 독립 browser state와 연속 session으로 검증한다.

1. 이사 D-30: 발견 → 기준일 → 조정 → 저장 → 개인 Flow → Calendar → whole export → 재사용
2. 날짜 없는 차량 점검: 저장 → 개인 Flow 실행 → 날짜 설정 → Calendar 확인 → 날짜 제거 → export
3. 반복 홈트: 반복 summary → 저장 → occurrence 완료·다시 열기 → resource → Calendar/ICS
4. 장기 학습: 긴 전체 범위 → 현재 위치 → 완료 → 다시 열기 → selected export
5. 개인 메모 초안: 분할 → add/delete/restore/reorder → 저장 → 수정 → export

추가 회귀:

- 이사 24개 전체판과 기존 5개 간단판 보존
- Flow 1·5·20·60개 library와 Calendar
- archived restore와 permanent delete
- reload 후 personal/run/occurrence/export parity

### 복잡도 gate

P35 시작 전 baseline과 종료 후를 같은 방식으로 비교한다.

- primary navigation 수
- surface별 competing primary action 수
- 첫 viewport 설명 블록 수
- My Flow 목록 행 command 수
- Calendar agenda 행 command 수
- `MyFlows` 내부 button, 사용자 라벨, conditional branch, 줄 수
- 대표 journey의 click/tap depth

다음은 증가하면 실패다.

- primary navigation 수
- My Flow 목록 행 command 수
- Calendar agenda 편집 command 수
- 첫 viewport 설명 블록 수
- 새로운 사용자 대면 개념 수

### 검증

- `npm.cmd run docs:check`
- `npm test`
- `npm.cmd run build`
- P35 targeted E2E
- 관련 P26~P34 regression E2E
- blast radius가 넓으면 full E2E
- `git diff --check`
- 390x844, 1024x768, 1440x900 browser screenshot
- keyboard-only journey
- accessible name, heading, landmark, focus order
- horizontal overflow `0`
- fixed overlap `0`
- console/page error `0`

production interaction은 별도 배포가 실제로 완료된 경우에만 검증한다. 로컬 screenshot이나 preview 자동화는 실제 사용자 검증이 아니다.

### acceptance marker

```text
P35-FINAL-MECE-GATE
```

필수 산출:

```text
README.md
audit.md
journey-results.json
complexity-before-after.json
route-evidence.json
screenshots/
```

### rollback

P35-01~07의 기능 slice를 독립적으로 되돌릴 수 있어야 한다. visual token과 composition rollback이 데이터 rollback을 요구하면 실패다.

## 16. P35 공통 테스트와 evidence 규칙

각 slice는 아래 evidenceKind를 구분한다.

- `current_source`
- `current_local_interaction`
- `current_browser_automation`
- `current_command`
- `current_screenshot`
- `prior_design_artifact`
- `heuristic_simulation`
- `inaccessible`
- `observed_user`

`observed_user`는 이번 P35에서 사용하지 않는다. 실제 관찰 사용자 수는 `0`이다.

검증 깊이는 변경 범위에 맞춘다.

| 변경 유형 | 최소 검증 |
| --- | --- |
| route/nav | route unit, targeted E2E, 3 viewports, build |
| public composition | projection unit, save-before/receipt E2E, 4 shapes |
| adjustment | overlay unit, cancel/apply E2E, keyboard |
| component extraction | parity test, My Flow/Calendar related E2E, full unit |
| execution workspace | personal/run/lifecycle tests, 1·5·20·60 fixtures |
| Calendar | scope/keyboard/occurrence tests, selected-day E2E |
| export | scope/count/projection unit, unified export E2E |
| final gate | docs, unit, build, targeted plus full E2E if feasible |

삭제된 UI를 전제로 한 assertion은 삭제하거나 새 소유 surface의 계약 assertion으로 바꾼다. 저장·identity·복구 계약 assertion은 삭제하지 않는다.

## 17. Slice 완료 보고 형식

각 slice 완료 시 다음을 분리해 보고한다.

1. 기준 branch와 SHA
2. 실제 변경 파일
3. 삭제한 UI와 남긴 안전장치
4. 사용자 대면 before/after
5. data/schema/migration 영향
6. acceptance marker와 screenshot 경로
7. unit, targeted E2E, related/full E2E, docs, build 결과
8. complexity before/after
9. 미검증 gap과 inaccessible evidence
10. rollback 방법
11. app code 변경 여부
12. commit / push / PR / merge / deploy 상태
13. observed-user count `0`
14. 다음 slice 시작 여부: `not_started`

## 18. Slice별 복붙용 개발 요청

P35-01부터 P35-08까지 한 번에 하나씩 전달할 요청은 [p35-goal-prompts-ko.md](./p35-goal-prompts-ko.md)에 있다.

운영 원칙:

- 현재 slice prompt 하나만 복사한다.
- 완료 보고와 acceptance evidence를 확인한다.
- 문제가 있으면 같은 slice에서 bounded fix를 끝낸다.
- 다음 prompt는 사용자가 명시적으로 승인한 뒤 전달한다.
