# FlowMe MECE UX Reset - Claude Design 독립 설계 프롬프트

## 0. 역할과 작업 경계

FlowMe의 UX를 단순히 시각적으로 정리하는 것이 아니라, 사용자 여정과 화면
소유권을 MECE하게 재구성한 interactive wireflow를 독립적으로 제안해줘.

- `REVIEWER_ROLE: claude_design`
- 작업 유형: UX/UI 독립 검토, 대안 비교, interactive prototype, 개발 handoff
- 앱 코드 수정: 금지
- 실제 저장 데이터 변경: 금지
- dependency와 lockfile 변경: 금지
- 문서 상태 및 release 상태 변경: 금지
- commit, push, PR, merge, deploy: 금지
- 실제 관찰 사용자 수: 0명

Codex의 1차 설계는 비교 대상이지 정답이 아니다. 현재 production과 source를
먼저 확인하고, Codex 제안을 승인하거나 반박하거나 좁혀라.

자동화, screenshot, fixture, agent simulation, heuristic review는 실제 사용자
관찰이 아니다. `observed-user count: 0`을 모든 결론에서 유지한다.

## 1. 환경과 정본 자료

### 서비스

- Production: <https://flowme2605.vercel.app>
- GitHub: <https://github.com/knhbae/flowme2605>
- Local worktree: `D:\flowme2605\flow-current-main`
- Local branch: `main`
- Local baseline: `98ede0f848f8cd854c6a79e3a92f847012844704`
- 당시 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`

Local baseline과 origin/main이 다르므로 검토 시작 시 실제 SHA를 다시 기록한다.
현재 handoff와 Codex 1차 설계는 아직 uncommitted local artifact일 수 있다.
Production이나 GitHub main을 이 local 제안의 구현 증거로 표현하지 않는다.

### 먼저 읽을 순서

1. `D:\flowme2605\flow-current-main\AGENTS.md`
2. `D:\flowme2605\flow-current-main\agent.md`
3. `D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\README.md`
4. `D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\evidence-manifest.json`
5. `D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset\README.md`
6. `D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset\review.html`
7. `D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset\journey-scorecard.json`
8. `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\design-package.md`
9. `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\simulation.md`
10. `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\plan.md`
11. `D:\flowme2605\flow-current-main\docs\SERVICE_STRUCTURE.md`
12. `D:\flowme2605\flow-current-main\docs\PRODUCT_PRINCIPLES.md`
13. `D:\flowme2605\flow-current-main\docs\flow-rules\quality-rubric.md`
14. `D:\flowme2605\flow-current-main\docs\flow-rules\quality-gate.md`
15. `D:\flowme2605\flow-current-main\docs\flow-rules\ux-copy.md`
16. current production을 브라우저에서 직접 조작
17. 필요한 current source 확인

로컬 자료 일부에 접근할 수 없어도 멈추거나 질문하지 않는다. 접근 가능한
production과 GitHub current source로 계속하고 확인하지 못한 항목만
`evidenceKind: inaccessible`로 표시한다.

## 2. Evidence 규칙

모든 주요 판단에 아래 evidenceKind 중 하나 이상을 붙인다.

- `current_production_interaction`
- `current_source`
- `current_package_screenshot`
- `codex_proposed_artifact`
- `claude_proposed_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `inaccessible`

충돌할 때 우선순위:

1. current production interaction
2. current production screenshot
3. current source
4. current structured evidence
5. Codex proposed artifact
6. reference pattern
7. heuristic simulation

현재 사실, 설계 제안, 외부 패턴, 검증되지 않은 가정을 섞지 않는다.

## 3. 제품 방향

FlowMe는 Notion, Todoist, Google Calendar를 대체하는 무거운 planner가 아니다.

핵심 제품 loop:

```text
원문·URL·메모
→ 바로 쓸 수 있는 전체 Flow
→ 필요한 값만 개인화
→ 저장 결과 확인
→ 개인 Flow에서 실행
→ Calendar에서 날짜 확인 또는 자기 도구로 가져가기
→ 완료·수정·복구·재사용
```

유지할 데이터 계약:

- source/content
- published canonical Flow
- personal overlay
- personal structural overlay
- execution run
- recurrence series와 occurrence
- export identity와 receipt

화면 단순화를 이유로 위 계약을 합치거나 다시 설계하지 않는다.

반드시 지킬 UX 원칙:

1. 한 화면은 한 가지 사용자 질문에 답한다.
2. 한 화면의 핵심 메시지는 최대 두 개다.
3. 경쟁하는 primary action은 최대 하나다.
4. 모든 행동은 주 소유 surface가 하나다.
5. UI tree는 선택에 따라 명확히 분기되고 결과에서 다시 합류한다.
6. 설명보다 실제 전체 결과와 사용자가 바꿀 값이 먼저다.
7. 원문에서 확보한 값을 다시 입력시키지 않는다.
8. 콘텐츠별 primary artifact 하나를 우선한다.
9. 실제 가치가 있는 secondary artifact만 최대 두 개 제안한다.
10. 지원되지 않거나 의미 없는 결과 형태를 tab으로 노출하지 않는다.
11. Calendar, Checklist, Routine, Sheet, Memo는 콘텐츠별 renderer 또는
    projection이지 반드시 전역 navigation surface는 아니다.
12. 긴 설명, 중첩 카드, 새 설정, 새 탭으로 구조 문제를 덮지 않는다.
13. 가짜 이용자 수, 리뷰, 평점, 검증 수를 만들지 않는다.
14. internal taxonomy, projection, overlay, run identity, RRULE 같은 내부
    구조어를 사용자 화면에 노출하지 않는다.
15. current/proposed 설명 annotation은 제품 화면 바깥의 review layer에 둔다.

## 4. 독립적으로 다시 결정할 세 가지

Codex는 아래를 제안했다.

1. 별도 Home 제거, `/`를 `/flows`로 연결
2. `/my`는 저장 Flow library와 lifecycle만 소유
3. `/calendar`는 날짜 기반 cross-Flow lens이며 실행은 개인 Flow에서 소유

이 결론을 그대로 꾸미지 말고 아래 세 대안을 같은 조건으로 비교한다.

### A. Subtractive ownership

- Home 제거
- My Flow library-only
- Calendar lens-only
- 개인 Flow가 실행·수정·완료·메모·export를 유일하게 소유

### B. Current model tightened

- Home의 비중복 역할을 하나만 유지
- My Flow에 최소 Today 실행을 유지
- Calendar에서 최소한의 inline action을 유지
- 중복은 줄이되 현재 4-tab과 주요 surface를 최대한 보존

### C. Claude independent alternative

- A와 B 어느 쪽도 충분하지 않다면 독립 구조를 제안
- 단, 새 전역 tab, 새 planner dashboard, 별도 Goal 제품, 설명 카드 누적은
  강한 근거 없이는 금지

비교 기준:

- 처음 온 사용자의 첫 행동
- 저장 전 전체 결과 이해
- 저장 후 실행까지의 연속성
- 한 행동의 주 소유 surface 수
- 모바일 첫 viewport의 인지 부담
- visible command 수
- competing primary action 수
- 설명 block 및 card 수
- click/tap/scroll depth
- 데이터 계약 회귀 위험
- 20개 이상 Flow에서의 확장성
- 현재 코드에서의 단계적 구현 가능성
- 실제 사용자에게 나중에 검증해야 할 가정

최종 권장안은 A/B/C 중 하나이거나 명시적인 조합이어야 한다. 조합이면 각
surface마다 어느 대안을 사용했는지 적는다.

## 5. 직접 확인할 route와 viewport

### Route

- `/`
- `/flows`
- `/f/moving-d30-basic`
- `/f/vehicle-inspection-prep`
- `/f/curated-allblanc-morning-workout`
- `/f/source-backed-middle-school-math-1`
- `/my`
- `/calendar`

필요하면 current fixture 또는 demo query를 사용하되 실제 사용자가 도달하는
상태와 `fixture_only` 성격을 혼동하지 않는다.

### Viewport

- 모바일: `390x844`
- 중간 wide: `1024x768`
- 데스크톱: `1440x900`

1440px은 모바일 화면을 단순 확대한 composition으로 만들지 않는다. rail,
canvas, inspector가 필요한 화면에서만 역할을 나눈다.

## 6. 다섯 실제 콘텐츠와 15개 session

각 사례는 독립 persona 상태로 시작하고 같은 persona의 Session A 결과가
Session B와 C로 이어지게 한다.

### J1. 이사 D-30

- route: `/f/moving-d30-basic`
- 저장 단위: 24개 Item
- primary artifact: Calendar
- 최소 입력: 이사일

Session A:

```text
발견 → 24개 전체 범위 확인 → 이사일 입력 → 날짜 결과 확인
→ 일부 포함 제외 또는 날짜 고정 → 저장 → receipt
```

Session B:

```text
My Flow에서 찾기 → 개인 Flow 열기 → 현재 Item 완료·다시 열기
→ 제목·날짜·메모 수정 → Calendar에서 같은 결과 확인
```

Session C:

```text
whole/selected/current 가져가기 → 새 이사일로 다시 쓰기
→ 기존 run과 개인 고정 날짜 보존 확인
```

### J2. 날짜 없는 차량 점검

- route: `/f/vehicle-inspection-prep`
- 저장 단위: 날짜 없는 10개 Item
- primary artifact: Checklist
- 최소 입력: 없음

Session A:

```text
10개 전체 목록 확인 → 날짜 없이 저장 → receipt → 개인 Flow 열기
```

Session B:

```text
Item 완료·다시 열기 → 필요한 Item 하나에만 날짜 추가
→ Calendar에서 확인 → 같은 개인 Flow로 복귀
```

Session C:

```text
날짜 제거 → Calendar에서 사라지고 개인 Flow에는 유지
→ Checklist whole/selected/current 가져가기
```

### J3. 반복 홈트

- route: `/f/curated-allblanc-morning-workout`
- source Item: 1개
- example execution range: 다음 8회
- primary artifact: 반복 실행
- resource: 영상 URL

Session A:

```text
주기·시간·소요 시간·종료 조건 compact summary 확인
→ 필요한 값만 조정 → 다음 회차 확인 → 저장
```

Session B:

```text
이번 occurrence 완료·다시 열기 → series와 이번 회차의 차이 확인
→ resource를 실행 Item과 구분해 열기
```

Session C:

```text
Calendar 예정 회차 확인 → ICS 결과와 count 확인
→ 과거 occurrence 기록을 보존한 채 반복 종료 또는 재사용
```

### J4. 장기 학습·진도

- route: `/f/source-backed-middle-school-math-1`
- 저장 단위: 8개 순서형 단원
- primary artifact: Sheet 또는 progress list
- 최소 입력: 없음

Session A:

```text
8개 단원과 순서 확인 → 날짜 입력 없이 저장 → receipt
```

Session B:

```text
현재 단원 찾기 → 하위 progress 및 메모 기록 → 다음 단원 이동
```

Session C:

```text
8행 Sheet 또는 Checklist 가져가기 → reload 후 마지막 위치 유지
```

### J5. 개인 메모 초안

입력 원문:

```text
8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약,
준비물 체크, 출발 전날 온라인 체크인
```

예상 Item:

1. 항공권 확인
2. 숙소 예약번호 정리
3. 렌터카 예약
4. 준비물 체크
5. 출발 전날 온라인 체크인

Session A:

```text
메모 입력 → 감지된 5개 Item 확인 → 이름·포함·순서 최소 조정 → 저장
```

Session B:

```text
개인 Flow에서 Item 추가·삭제·복구·재정렬
→ 날짜·메모 수정 → 완료·다시 열기
```

Session C:

```text
Calendar subset 또는 Checklist 가져가기
→ reload 후 개인 draft와 실행 기록 유지
```

각 15개 cell에 기록:

- personaId와 sessionId
- user goal
- starting state
- route와 viewport
- first message와 first action
- visible primary/secondary action
- click/tap/scroll depth
- expected mental model
- actual 또는 proposed feedback
- reload/revisit continuity
- title/count/date/stable identity parity
- failure recovery
- evidenceKind
- current 상태: `supported / hidden / partial / missing / blocked`
- proposed 상태: `pass / revise / fail`
- 실제 사용자에게만 확인 가능한 가정

## 7. Interactive wireflow 필수 범위

한국어 단일 HTML을 단순 보고서가 아니라 실제 조작 가능한 prototype으로 만든다.

필수 stage:

1. Flow 찾기 또는 입력
2. Public Flow의 저장 전 전체 결과
3. 한 종류씩 여는 최소 조정
4. 저장 결과 receipt
5. My Flow library
6. 개인 Flow 실행 workspace
7. Calendar 날짜 lens
8. whole/selected/current 가져가기

필수 조작:

- 사례 전환
- viewport 전환 또는 responsive preview
- stage 이동과 뒤로 가기
- 이사일 변경과 24개 날짜 재계산
- 저장 이름 변경
- Item 포함·제외와 count 갱신
- 저장 receipt의 count와 날짜 범위 갱신
- 개인 Flow의 Item 선택
- 제목, 날짜, 메모 수정
- 완료와 같은 위치의 다시 열기
- Calendar 날짜 선택과 agenda 갱신
- Calendar event에서 같은 개인 Flow 열기
- 반복 summary와 이번 occurrence 구분
- export scope `whole / selected / current`
- scope별 실제 count와 destination 결과 예측
- 취소, undo 또는 복구 가능한 상태의 feedback

정적 버튼이나 의미 없는 tab을 두지 않는다. prototype 안에 보이는 control은
작동하거나 명시적인 비활성 이유가 있어야 한다.

현재 화면과 제안 화면은 나란히 비교하되, current/proposed 설명은 실제 제품
surface 안이 아니라 review chrome에 둔다.

## 8. 화면별 설계 요구

아래 모든 화면에 대해 current와 proposed를 비교한다.

### Flow 찾기

- URL·메모 입력과 준비된 Flow 발견의 관계
- Home을 제거하거나 유지하는 근거
- 카드에 남길 title, source, result preview, trust 정보
- 카드 전체 열기 또는 명확한 하나의 action
- 실제 데이터 없는 이용자 수·review 금지

### Public Flow

- 첫 viewport에서 실제 전체 결과, 최소 입력, 시작 action의 순서
- 이사 24개, 차량 10개, 학습 8개, 반복 8회의 전체 범위 읽기
- content shape가 달라도 동일한 command grammar
- primary artifact를 기본으로 보여주고 secondary는 접힘

### 조정

- 이름, 기준일, 포함 여부, Item 날짜, 순서 중 현재 필요한 한 종류만 노출
- 빠른 조정과 고급 구조 조정 분리
- 변경 전/후와 count/date range를 즉시 반영
- 원문에서 확보한 값을 다시 묻지 않음

### Receipt

- 저장 전 화면과 다른 완료 frame
- 저장 이름, count, 날짜 범위 또는 날짜 없음, source
- primary: 개인 Flow 열기
- export 또는 다른 조정이 저장 성공 확인을 방해하지 않음

### My Flow

- library-only, Today 유지, 다른 대안을 비교
- 1개, 5개, 20개 Flow에서의 탐색
- row/card의 기본 action은 하나
- 완료·보관·검색은 별도 화면이 아니라 적절한 filter/menu인지 검토
- lifecycle은 데이터 접근 경로를 잃지 않게 보존

### 개인 Flow

- 다음 행동과 전체 구조 두 가지 메시지
- execution, 완료·다시 열기, Item 편집, 메모, export의 주 소유권
- 콘텐츠 shape별 renderer는 다르지만 command grammar는 동일
- source resource와 완료 Item 구분
- archive/restore/permanent delete는 관리 영역에서만

### Calendar

- 날짜별 cross-Flow lens
- same Flow identity
- compact grid와 selected-day agenda의 역할
- 날짜 없는 Item을 Calendar에서 다룰지 개인 Flow에 둘지 대안 비교
- inline 완료·메모·날짜 이동을 유지/삭제할 명시적 근거
- event detail은 page bottom의 긴 card보다 sheet, popover, inspector 패턴 검토

### 가져가기

- format보다 scope와 count를 먼저
- whole, selected, current의 명확한 차이
- Calendar, Checklist, Sheet, Memo별 빠지는 정보
- 실제 개인 수정본 기준
- 완료 후 count와 next location이 있는 compact receipt

## 9. 추가로 반드시 설계할 것

### 9.1 IA와 UI tree

- 모든 surface의 사용자 질문
- 핵심 메시지 최대 두 개
- primary action 최대 하나
- 주 소유 기능
- 다른 surface로 보내는 entry action
- 소유하지 않는 기능
- 분기와 합류가 보이는 tree

### 9.2 Screen message contract

Flow 찾기, Public Flow, 조정, receipt, My Flow, 개인 Flow, Item detail,
Calendar, export, 관리에 대해 다음을 정의한다.

- 사용자의 질문
- 메시지 1
- 메시지 2
- primary action
- secondary action
- 기본 노출
- 접힘 정보
- 제거할 설명
- 다음 상태

### 9.3 Command grammar

다음 action의 용어, icon, 위치, feedback, destructive hierarchy를 통일한다.

- 열기
- 저장
- 조정
- 완료 / 다시 열기
- 포함 / 제외
- 날짜 지정 / 날짜 제거
- 추가 / 삭제 / 복구 / 순서 변경
- 보관 / 복구 / 이 기기에서 영구 삭제
- 새 기준일로 다시 쓰기
- 전체 / 선택 / 현재 가져가기

완료, 제외, 삭제, 보관을 같은 의미처럼 보이게 만들지 않는다.

### 9.4 콘텐츠별 renderer

공통 shell 안에서 아래 shape를 어떻게 다르게 렌더링할지 정한다.

- 기준일 역산형 Calendar
- 날짜 없는 Checklist
- 반복 series와 occurrence
- 순서·진도형 Sheet/list
- 개인 draft

공통과 변형을 명시한다.

- 공통 header와 source
- 공통 count와 result summary
- 공통 완료·다시 열기
- 공통 Item detail
- shape별 전체 구조 renderer
- shape별 최소 입력
- shape별 primary artifact
- 제공하지 않을 artifact

### 9.5 Progressive disclosure

필드마다 다음을 명시한다.

- 왜 필요한가
- source 값인가 personal 값인가
- 언제 보이는가
- 첫 useful result 전에 필요한가
- 선택값인가
- 어디에 반영되는가
- 원문과 충돌하면 무엇이 우선하는가

최소 대상:

- 저장 이름
- 기준일
- 개별 날짜
- 시간
- 장소
- 예상 시간
- 반복 주기
- 반복 종료
- 현재 진도
- Item 메모
- 포함 여부
- 순서

### 9.6 Responsive composition

390px:

- 입력, 전체 결과, action 순서
- sticky command와 bottom nav 충돌 방지
- detail은 bottom sheet 또는 full-screen editor 중 명시적 선택
- 가로 overflow 없음

1024px:

- rail, canvas, inspector 중 필요한 역할만 사용
- mobile card를 가로로 늘이지 않음
- Calendar grid와 agenda의 균형

1440px:

- 불필요한 빈 공간 없이 readable density
- 목록과 선택 workspace의 master-detail 검토
- 동일한 메시지와 command order 유지

### 9.7 Accessibility와 recovery

- keyboard-only path
- 논리적 focus order
- dialog/sheet focus trap
- Escape close
- close/save/complete 후 focus return
- 모든 icon button accessible name
- 200% zoom과 긴 title
- loading, success, failure feedback
- 취소와 undo
- 작성 중 이탈 복구
- export 실패와 retry
- source 변경 시 personal 값 보존

### 9.8 Visual system

단순 색상 교체가 아니라 아래를 정의한다.

- type scale와 밀도
- spacing rhythm
- canvas/surface/border/elevation 역할
- selected, completed, excluded, archived, disabled 상태
- source, personal, execution 정보의 시각 구분
- button hierarchy
- compact row와 detail anatomy
- sheet/dialog/inspector anatomy
- mobile/wide 공통 token과 변형

중첩 card 안에 card를 만들지 않는다. 전체 section을 떠 있는 card처럼 만들지
않는다. compact work surface에 hero scale type을 쓰지 않는다.

### 9.9 Reference pattern

현재 공식 제품 자료를 기준으로 최소 8개를 비교한다.

- Google Calendar
- Apple Reminders
- Todoist
- Things
- TickTick
- Notion
- Structured
- Wanderlog
- Fitbod 또는 Nike Training Club

기능이나 외형을 복사하지 말고 아래 연결 패턴만 비교한다.

- import/save 후 result confirmation
- list/project 전체 보기
- quick edit와 detailed edit
- undated/inbox 처리
- completion과 reopen
- series와 occurrence
- batch select
- detail sheet
- export scope
- mobile/wide hierarchy

각 패턴을 `적용 / 변형 필요 / 적용 금지`로 판정한다.

### 9.10 Red-team

첫 제안이 나온 뒤 스스로 반박한다.

- 삭제가 아니라 기능을 숨기기만 한 것은 아닌가
- 다른 메뉴로 옮겨 복잡도를 보존한 것은 아닌가
- 화면별 primary action이 실제로 하나인가
- 콘텐츠 shape 차이를 공통 shell로 억지로 평준화했는가
- 날짜 없는 Item의 접근 경로가 사라졌는가
- archive/restore, personal Item recovery가 사라졌는가
- Calendar lens-only가 실제 실행 맥락을 과도하게 분리하는가
- My Flow library-only가 재방문 사용자의 오늘 행동을 약하게 만드는가
- Home 제거가 discovery와 trust를 약하게 만드는가
- 390px에서 긴 설명과 카드가 다시 쌓였는가
- 1024px이 늘어진 mobile인가
- visual polish가 정보 구조 문제를 가렸는가

반박 결과를 반영해 2~3회 수정하고 revision log를 남긴다.

## 10. 구현 가능성 handoff

앱을 구현하지 않지만 개발자가 곧바로 판단할 수 있게 제안을 분류한다.

- `CSS/token only`
- `component composition`
- `interaction state`
- `route/IA`
- `data contract dependency`

각 구현 slice에 포함:

- 사용자 문제
- 적용 route
- current owner
- proposed owner
- 유지할 capability
- CUT할 UI
- 새로 만들지 않을 것
- 영향 component 후보
- data/migration 영향
- dependency
- 390/1024/1440 acceptance screenshot
- keyboard/accessibility acceptance
- unit/E2E marker
- rollback 경계

stable data contract를 UI reset 때문에 다시 쓰지 않는다. migration이 필요하다고
판단하면 별도 gate로 분리하고, UI 구현과 섞지 않는다.

## 11. 필수 결과물

아래 경로에 한국어 산출물을 만든다.

```text
D:\flowme2605\flow-current-main\docs\content-audit\
  2026-07-26-flowme-mece-ux-reset-claude-design-proposal\
```

필수 파일:

```text
README.md
audit.md
review.html
decision-matrix.json
journey-scorecard.json
screen-message-contract.json
interaction-grammar.md
visual-system.md
implementation-handoff.md
screenshots/
```

권장 추가 파일:

```text
ia-tree.md
content-renderer-rules.md
progressive-disclosure-matrix.json
accessibility-recovery-audit.md
reference-pattern-matrix.md
revision-log.md
```

`review.html`은 10분 안에 판단할 수 있는 interactive design review board여야 한다.
첫 화면부터 A/B/C 판정과 실제 이사 콘텐츠 current/proposed를 보여준다.

## 12. Browser QA

prototype을 직접 조작하고 다음을 확인한다.

- 390x844 horizontal overflow 없음
- 1024x768 fixed overlap 없음
- 1440x900 readable density
- text overlap 없음
- 모든 visible control 작동
- 이름 없는 focusable control 없음
- logical keyboard order
- sheet/dialog Escape와 focus return
- primary action이 한 화면에 둘 이상 경쟁하지 않음
- 15개 journey cell의 title/count/date continuity
- console/page error 없음

검증한 상태와 미검증 gap을 분리해서 기록한다. 이 QA를 실제 사용자 검증이라고
표현하지 않는다.

## 13. 결과 형식

`response-template-ko.md`를 그대로 따른다.

Overall verdict는 다음 중 하나:

- `codex_structure_keep`
- `bounded_revision`
- `alternative_structure_required`

최종 결론은 아래 세 가지 결정에 각각 답해야 한다.

1. Home을 제거하고 Flow 찾기와 합칠 것인가
2. My Flow를 library-only로 제한할 것인가
3. Calendar를 lens-only로 제한할 것인가

단순 찬반이 아니라 선택한 구조, 감수할 대가, 복구 경로, 구현 순서를 함께
제시한다.

## 14. 하지 않을 것

- 앱 코드 수정
- 저장 schema 또는 migration 구현
- account, DB, cloud sync
- crawler 또는 실제 AI API
- OAuth 직접 연동
- creator marketplace와 결제
- 가짜 social proof
- 새로운 전역 tab
- 모든 외부 planner 기능 재구현
- 새 기능 목록으로 UX 문제 덮기
- prior artifact를 current production으로 표현
- 자동 검증을 observed-user validation으로 표현

결과는 “무엇을 더 넣을까”가 아니라 “각 화면이 어떤 한 가지 일을 소유하고,
어떤 UI를 남기고 지우며, 사용자가 같은 Flow를 어떻게 끝까지 이어 쓰는가”로
끝낸다.
