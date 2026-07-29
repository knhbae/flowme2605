# Implementation handoff — vertical slice 7개

원칙: **안정된 데이터 계약을 UI reset 때문에 다시 쓰지 않는다.** 7개 slice 모두 `data contract dependency` 없음.
migration이 필요한 항목은 하나도 없으며, 필요해지면 별도 gate로 분리하고 UI 구현과 섞지 않는다.

## 순서

```text
순차:  S1  →  S2  →  S4
병렬:  S3 · S5 · S6 · S7   (S1 이후 언제든)
data gate: 없음
```

`S1`(진입)이 먼저 확정되어야 `S4`(/my 목록화)의 acceptance를 재방문 경로로 측정할 수 있다.
`S2`(공개 Flow)는 `S3`(조정)와 같은 표면을 공유하므로 S2 → S3 순서가 효율적이지만, 독립 rollback은 가능하다.

---

## S1 · `/` entry router + 4탭 → 3탭

- **Problem**: 홈이 자기 부제가 약속한 job(저장 Flow 잇기)을 소유하지 않고 `/flows`의 부분집합을 반복한다. 재방문 사용자가 발견 화면에 떨어진다.
- **Routes**: `/`, `/flows`, 전역 navigation
- **UX direction**: 홈 route와 활용 예시 섹션 제거. primary navigation은 `Flow 찾기 / Calendar / My Flow`. `/`는 UI가 없는 entry router — 저장 Flow가 1개 이상이면 `/my`로, 없으면 `/flows`로 `replace` 이동.
- **Keep**: `/flows`의 발견·검색·카테고리·URL/메모 입력, 예시로 쓰던 콘텐츠(카드 목록 안에 그대로 존재)
- **Cut**: 홈 hero, 활용 예시 3카드, 홈 CTA, nav의 `홈` 탭
- **Non-goals**: 새 dashboard·Inbox·Goal 화면 금지, 저장 데이터 읽기 외 어떤 쓰기도 없음
- **Classification**: `route/IA`
- **Likely affected components**: `app/page.tsx`, `components/flow/PlatformNav.tsx`, `app/flows/page.tsx`
- **Data/migration impact**: 없음(localStorage 읽기 전용 판정)
- **Dependencies**: 없음
- **390 acceptance**: 저장 0개 → `/`가 Flow 찾기로, 저장 1개 이상 → `/`가 목록으로. 두 경우 캡처.
- **1024 / 1440 acceptance**: 동일 규칙, nav 항목 3개
- **Accessibility acceptance**: router 화면에 focusable 없음, 이동 후 첫 heading으로 focus, `aria-current` 정확
- **Screenshot marker**: `p35-s1-entry-empty-390` / `p35-s1-entry-saved-390` / `p35-s1-nav-1440`
- **Unit/E2E marker**: `P35-ENTRY-ROUTER-3TAB`
- **Rollback**: flag 하나로 고정 `/flows` 리다이렉트. 새 surface를 만들지 않았으므로 되돌릴 화면이 없다.
- **Done**: 두 진입 경로 캡처 + nav 3탭 + 홈 route 404/redirect 확인

## S2 · 공개 Flow 첫 viewport 재구성

- **Problem**: 결정 표면 5개, visible command 13개. 최소 입력이 primary action 아래에 있다.
- **Routes**: `/f/[slug]` (5개 콘텐츠 전부)
- **UX direction**: 결과(전체 목록) → 최소 입력 → 시작. 입력과 시작을 같은 고정 영역(390) 또는 같은 inspector(1024+)에 둔다.
- **Keep**: 저장 전 전체 결과 노출, 예시 날짜 미리보기, 출처와 주의(접힘), 항목별 제외
- **Cut**: 요약 chip 3개(내 조건·저장 결과·전체), 결과 형태 토글(캘린더 일정 N개 / 체크리스트 N개), 별도 `전체 Flow 구조` 블록
- **Non-goals**: primary artifact 결정 로직 변경 금지, secondary artifact는 삭제가 아니라 `가져가기`로 이동
- **Classification**: `component composition`
- **Likely affected components**: `components/flow/AppClient.tsx`(`PublicFlow`), `ArtifactWorkbench.tsx`
- **Data/migration impact**: 없음
- **Dependencies**: S1 이후 권장(진입 문구 일관)
- **390 acceptance**: `saveDecisionSurfaceCount==2`, `visibleCommandCount<=4`, 입력과 CTA가 같은 영역, 하단 고정 영역과 본문 겹침 없음
- **1024 acceptance**: canvas + 340 inspector, 모바일 카드를 늘이지 않음
- **1440 acceptance**: canvas 최대 폭 760, 메시지·command 순서 동일
- **Accessibility acceptance**: 입력 label 연결, CTA가 입력 뒤 tab 순서, 200% zoom에서 고정 영역이 결과를 가리지 않음
- **Screenshot marker**: `p35-s2-public-{moving,vehicle,workout,study}-390/1024/1440`
- **Unit/E2E marker**: `P35-PUBLIC-RESULT-FIRST`
- **Rollback**: composition prop 토글로 현재 배치 복원
- **Done**: 4개 shape에서 같은 command grammar, 저장 payload 무변경 회귀 테스트 통과

## S3 · 조정 = 한 번에 한 종류

- **Problem**: 이름·기준일·포함·개별 날짜가 같은 흐름에 이어지고 변경 전/후가 항상 보이지 않는다.
- **Routes**: `/f/[slug]` 조정 state
- **UX direction**: 종류 탭(이름 / 기준일 / 포함 / 반복) 중 하나만 열고, 상단에 `변경 전 → 변경 후 개수·날짜 범위`를 항상 표시. `변경 적용` / `취소` 2버튼.
- **Keep**: 조정 가능한 모든 필드, 취소 시 원복
- **Cut**: 동시 노출, 설명 문단
- **Non-goals**: save payload·dateIntent·projection 계약 불변, 저장 후 구조 편집은 개인 Flow로
- **Classification**: `interaction state`
- **Likely affected components**: `AppClient.tsx` 조정 패널
- **Data/migration impact**: 없음
- **390/1024/1440 acceptance**: 동시에 열리는 조정 종류 1개, 전후 대비 항상 노출, 중앙 720
- **Accessibility acceptance**: 탭은 `aria-pressed`, 탭 전환 시 패널로 focus 이동, Escape는 취소와 동일
- **Screenshot marker**: `p35-s3-adjust-{name,anchor,include,series}-390`
- **Unit/E2E marker**: `P35-ADJUST-ONE-KIND`
- **Rollback**: 단일 패널로 복귀
- **Done**: 4종류 캡처 + 취소 시 값 원복 확인

## S4 · `/my` 목록 전용화

- **Problem**: 한 카드에 primary 4개, 목록과 실행이 같은 스크롤에 있다.
- **Routes**: `/my`
- **UX direction**: 행 = 제목 + 개수 + 읽기 전용 다음 예정 1줄, 목적지 1개. 상단은 검색 + 진행/완료/보관 필터.
- **Keep**: 모든 lifecycle 접근(필터로), 스튜디오·데이터 관리(보조 메뉴로 이동), 검색
- **Cut**: 카드 안 4버튼, `지금`(Today) 실행 mode, 목록 위 스튜디오·데이터 관리 노출
- **Non-goals**: 저장 데이터·정렬 규칙 변경 금지, 완료/보관 Flow의 접근 경로 삭제 금지
- **Classification**: `route/IA` + `component composition`
- **Likely affected components**: `app/my/page.tsx`, `AppClient.tsx`(`MyFlows`), `MyFlowDataManager.tsx`
- **Data/migration impact**: 없음
- **390 acceptance**: `competingPrimaryCount==1`, 저장 1 / 5 / 20개 캡처, 20개에서 첫 viewport에 행 4개 이상
- **1024 / 1440 acceptance**: master-detail, 오른쪽은 선택 미리보기(편집 없음)
- **Accessibility acceptance**: 행이 하나의 버튼(중첩 인터랙티브 없음), 검색 label, 필터 `aria-pressed`
- **Screenshot marker**: `p35-s4-my-{1,5,20}-390` / `p35-s4-my-1440`
- **Unit/E2E marker**: `P35-MY-LIBRARY-ONLY`
- **Rollback**: 카드 composition 복원(데이터 무관)
- **Done**: 1/5/20 캡처 + 보관·완료 Flow 접근 경로 유지 확인

## S5 · 개인 Flow workspace 초점

- **Problem**: 다음 하나가 승격되지 않고 카드 종류 3개가 동시에 경쟁한다. 완료까지 2~3탭.
- **Routes**: `/my?savedFlow=…`(개인 Flow workspace state)
- **UX direction**: 다음 하나 카드(완료 + 열기) → 전체 구조 섹션 요약 → 보조(구조 조정·가져가기·관리). 자료(영상 URL 등)는 `자료 · 완료 대상 아님`으로 분리.
- **Keep**: 완료·다시 열기, Item 편집, 메모, 구조 조정, export, lifecycle 전부
- **Cut**: 실행/구조/가져가기 카드가 나란히 경쟁하는 세로 스택, 아코디언 안에만 있던 완료 컨트롤
- **Non-goals**: run·structural overlay 계약 불변, 정보 삭제 금지(접기와 승격만)
- **Classification**: `component composition`
- **Likely affected components**: `AppClient.tsx`(`MyFlows` focused workspace), `FlowExecutionPrimitives.tsx`
- **Data/migration impact**: 없음
- **390 acceptance**: 첫 viewport 강조 카드 1개, 완료 1탭, 동시 노출 카드 종류 ≤ 2
- **1024 / 1440 acceptance**: canvas + Item inspector, sheet 미사용
- **Accessibility acceptance**: 완료 토글 `aria-pressed` + accessible name에 항목 제목 포함, 완료 후 focus 유지
- **Screenshot marker**: `p35-s5-personal-{moving,workout,study,memo}-390/1440`
- **Unit/E2E marker**: `P35-PERSONAL-SINGLE-FOCUS`
- **Rollback**: 접힘 기본값과 카드 순서만 원복
- **Done**: 4개 shape에서 같은 순서·같은 command, 완료 1탭 캡처

## S6 · Calendar lens + 완료 primitive

- **Problem**: Calendar가 편집까지 소유하고, cell이 잘린 제목으로 채워지며, grid 키보드 이동이 길다.
- **Routes**: `/calendar`
- **UX direction**: 월 grid = Flow 색 dot + 개수. 선택일 agenda = Flow별 그룹(그룹 헤더에 `Flow 열기`) + 행마다 완료 토글 1개. 그 외 편집 없음.
- **Keep**: 날짜 조회, 선택일 agenda, Flow scope 필터, 완료/다시 열기
- **Cut**: inline 메모, 날짜 옮기기, 제목 수정, 날짜 없는 tray, cell의 잘린 제목 chip
- **Non-goals**: occurrence·날짜 계약 불변, 날짜 없는 항목의 접근 경로를 없애지 않음(개인 Flow가 전량 소유)
- **Classification**: `interaction state` + `component composition`
- **Likely affected components**: `app/calendar/page.tsx`, `AppClient.tsx`(calendar branch)
- **Data/migration impact**: 없음
- **390 acceptance**: 행당 command 1개, cell truncated-title 의존 0, agenda에 `날짜 없는 할 일은 각 Flow 안에 있습니다` 한 줄
- **1024 / 1440 acceptance**: grid + 오른쪽 agenda pane, 한 화면에 grid와 agenda 동시 노출
- **Accessibility acceptance**: `role=grid` + roving tabindex로 agenda까지 focus stop ≤ 12, 모든 cell에 `날짜 + 일정 N개` accessible name, 화살표 키 이동
- **Screenshot marker**: `p35-s6-calendar-390` / `p35-s6-calendar-1024` / `p35-s6-focus-trace-390`
- **Unit/E2E marker**: `P35-CALENDAR-LENS-ONE-TOGGLE`
- **Rollback**: 완료 토글만 숨기면 순수 lens(A)로, inline command 복원하면 현재로. 2단계 rollback.
- **Done**: focus trace 캡처 + 편집 진입이 개인 Flow로만 연결됨 확인

## S7 · 가져가기 scope-first

- **Problem**: 형식이 먼저 보이고 범위·개수가 나중이다.
- **Routes**: 개인 Flow 가져가기, 공개 Flow의 저장 전 가져가기(secondary)
- **UX direction**: 범위(전체 / 선택 / 현재)와 각 개수를 먼저, 형식은 그 다음, 형식별로 빠지는 정보를 한 줄로. 불가능한 형식은 비활성 + 이유 표기.
- **Keep**: whole/selected/current export identity와 receipt 계약, 4개 형식 전부
- **Cut**: 형식 우선 배치, 의미 없는 형식의 활성 상태
- **Non-goals**: export identity·count 계산 규칙 변경 금지(effective included rows 유지)
- **Classification**: `component composition`
- **Likely affected components**: `ArtifactWorkbench.tsx`, export preflight 컴포넌트
- **Data/migration impact**: 없음
- **390 / 1024 / 1440 acceptance**: 범위 3개와 개수가 첫 화면, 형식 비활성 시 이유 노출, receipt에 개수와 다음 위치
- **Accessibility acceptance**: 범위는 radio group semantics, 비활성 버튼의 이유가 스크린리더로 읽힘, export 실패 시 `role=alert`
- **Screenshot marker**: `p35-s7-export-{whole,selected,current}-390`
- **Unit/E2E marker**: `P35-EXPORT-SCOPE-FIRST`
- **Rollback**: 형식 우선 bar로 복귀
- **Done**: 3개 범위 캡처 + count가 effective included rows와 일치하는 단위 테스트

---

## 승인 전에 소유자가 확정할 것

1. `/`의 목적지를 상태로 고를 것인가(S1) — 아니면 고정 `/flows`인가.
2. Calendar에 완료 토글 1개를 남길 것인가(S6) — 아니면 순수 lens인가.
3. My Flow 행의 `다음 예정 한 줄`을 읽기 전용으로 유지할 것인가(S4).

세 결정 모두 rollback 비용이 낮고 서로 독립이다. 승인 전에는 앱 코드를 수정하지 않는다.
