# Claude Design P21 단계별 실행 계획

## 목적

P21을 하나의 큰 작업으로 처리하지 않고, 각 단계가 독립적으로 구현·검증·커밋될 수 있는 작은 slice로 나눈다. 각 slice가 끝날 때 다음 단계로 넘어가도 되는지 판단하며, 기능 구현과 evidence 보강, 실제 AI 도입 판단을 섞지 않는다.

기준 피드백은 `claude_work/FlowMe UXUI 전체 검토9/FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html`이다. 최신 구현 기준은 `docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/`이다.

## 현재 상태

| 항목 | 상태 | 현재 판단 | 근거 |
| --- | --- | --- | --- |
| P21-01 URL/메모를 여러 실행 단계 초안으로 전환 | 완료 | 결정론적 3~7개 제안, 기준일 날짜 배치, My Flow 수정, Calendar/export 반영이 구현됨 | `urlFirstMissDraftSuggestedItemCount: 3`, `urlFirstMissDraftStepDatesFromAnchor: true` |
| P21-03 구조형 사용자 문구 2건 제거 | 완료 | P21-01과 함께 normal/wide 모두 0으로 닫힘 | `normalRouteStructuralDisplayHitCount: 0`, `wideViewportStructuralDisplayHitCount: 0` |
| P21-04 draft 대기 경로 상태 evidence | 다음 | 저장 실패, 중복, 빈 상태, 완료 후 0, 오프라인 상태를 아직 한 matrix로 판단할 수 없음 | Claude Design Medium |
| P21-02 실제 AI 생성 gate spec | 대기 | P21-01 모델을 기준으로 AI가 들어와도 자동 실행/자동 발행되지 않는 계약을 먼저 정해야 함 | Claude Design Low, P21-01 후속 |
| P21-05 홈/Calendar 소규모 polish | 대기 | 홈 구분자는 P21-01에서 일부 정리됨. Calendar compact label은 별도 눈검토 필요 | Claude Design Low |
| P21 final review | 대기 | P21-04/P21-02/P21-05와 사용자 눈검토 이후 진행 | P22 backlog 입력물 |

## 실행 순서

번호순이 아니라 의존성순으로 진행한다.

1. **P21-04 draft lifecycle evidence**
2. **조건부 P21-04B 최소 복구 slice**
3. **P21-02 실제 AI 생성 gate spec**
4. **P21-05 홈/Calendar polish**
5. **Vercel preview 사용자 눈검토**
6. **P21 final review package**

P21-04에서 사용자에게 복구 불가능한 상태가 확인될 때만 P21-04B를 연다. 단순히 capture fixture가 없었던 경우에는 P21-04 안에서 fixture/evidence만 보강한다.

## 단계 1: P21-04 draft lifecycle evidence

### 사용자 문제

draft가 실제 데이터 경로가 되었지만 정상 저장 화면만 증명되어 있다. 저장 실패, 같은 요청의 중복, 빈 My Flow, 모든 항목 완료, 오프라인 상태에서 사용자가 무엇을 보게 되는지 판단할 근거가 부족하다.

### 범위

- 앱 기능을 먼저 고치지 않고 현재 상태를 inventory한다.
- 아래 상태를 390px과 1024px에서 재현하거나, 재현 불가 이유를 명시한다.
  - draft 저장 실패
  - 동일 canonical URL의 중복 draft 요청
  - 저장된 Flow가 없는 My Flow/Calendar
  - draft의 모든 항목 완료 후 남은 개수 0
  - 오프라인에서 이미 열린 draft/My Flow의 로컬 동작
- capture와 E2E는 같은 fixture/state contract를 사용한다.
- 없는 상태를 성공처럼 기록하지 않는다. `captured: false`, `reason`, `nextAction`을 남긴다.

### 산출물

- `docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/`
  - `README.md`
  - `audit.md`
  - `review.html`
  - `route-evidence.json`
  - `screenshots/`

### 완료 게이트

- 상태 matrix 5종이 JSON에서 구분된다.
- failure/duplicate/empty/completed/offline 각각 `captured`, `userRecoveryVisible`, `internalHitCount`를 판정할 수 있다.
- 완료 후 남은 개수 0과 완료 목록/되돌리기 경로가 모순되지 않는다.
- 중복 draft가 같은 저장물을 무한히 늘리지 않는지 확인한다.
- 오프라인 상태를 live server 오류와 혼동하지 않는다.
- normal route guardrail, visible Markdown, live AI implied 기준이 모두 유지된다.

### 중단 조건

저장 실패 또는 중복 상태에서 사용자가 빠져나갈 방법이 전혀 없으면 P21-02로 넘어가지 않는다. 문제를 P21-04B 최소 복구 slice로 분리한다.

## 단계 2: 조건부 P21-04B 최소 복구 slice

P21-04에서 실제 사용자 dead end가 발견될 때만 실행한다.

### 허용 범위

- 짧은 오류/중복 안내와 기존 행동으로 돌아가는 recovery action
- 기존 draft 저장·편집 구조를 재사용하는 최소 수정
- 실패 원인별 세부 진단 UI, 재시도 queue, background sync는 만들지 않는다.

### 완료 게이트

- 실패 상태에서 입력 내용이 사라지지 않는다.
- 중복 상태에서 기존 draft로 이동하거나 현재 요청을 명확히 취소할 수 있다.
- 오프라인 상태에서 지원하지 않는 행동을 성공처럼 표시하지 않는다.
- E2E와 evidence가 recovery action을 실제로 실행한다.

## 단계 3: P21-02 실제 AI 생성 gate spec

### 사용자 문제

결정론적 파싱은 구조가 약한 URL이나 짧은 메모에서 품질 한계가 있다. 그러나 실제 AI를 바로 붙이면 source/AI/user 경계, 민감 콘텐츠, 자동 실행 오해, 비용과 실패 정책이 정리되지 않은 채 제품에 들어온다.

### 범위

- 실제 API, 모델 SDK, 비밀키, 자동 생성 버튼은 추가하지 않는다.
- provider-neutral한 생성 계약을 정의한다.
- 입력: URL에서 확인 가능한 텍스트, 사용자 제목/메모, 기준일, 카테고리/위험 수준.
- 출력: 3~7개 제안 항목, 제목, 상대 날짜, 메모, 포함 여부, 근거 연결 정보.
- 사용자 확인 전 My Flow/Calendar/export에 자동 반영하지 않는다.
- 민감 카테고리의 source/risk separation과 생성 중단 조건을 정의한다.
- timeout, 빈 응답, 부분 응답, 중복, 비용 제한, 로그/개인정보 처리 기준을 정의한다.

### 산출물

- `docs/specs/2026-07-11-url-first-ai-draft-gate/README.md`
- 필요하면 `docs/content-audit/2026-07-11-claude-design-p21-02-ai-gate-audit-ko.md`

### 완료 게이트

- AI 생성물은 항상 `제안 초안`이며 자동 발행/자동 완료가 아님이 명시된다.
- source-backed 원본, AI 제안, 사용자 overlay의 소유권과 우선순위가 구분된다.
- P21-01 fallback을 유지할 조건과 AI slice의 개방 조건이 명확하다.
- 실제 API 구현용 다음 `/goal`을 작성할 수 있지만 이번 단계에서는 실행하지 않는다.

## 단계 4: P21-05 홈/Calendar 소규모 polish

### 사용자 문제

홈 URL entry의 문구 구분과 Calendar 월간 grid의 compact label이 작은 마찰을 만든다. 기능 모델을 바꿀 문제는 아니다.

### 범위

- 먼저 홈 separator가 P21-01에서 이미 닫혔는지 390/1024px에서 확인한다.
- 이미 닫혔다면 홈은 no-op으로 evidence만 남긴다.
- Calendar는 기존 `주요 2개 + 외 N개` 정책을 유지한다.
- 날짜 셀의 두 Flow가 서로 구분되도록 색/마커/짧은 제목 위계를 조정한다.
- 새 short-label 필드나 slug별 하드코딩은 만들지 않는다.
- 전체 제목은 agenda와 accessible name에서 보존한다.

### 산출물

- `docs/content-audit/2026-07-11-claude-design-p21-05-entry-calendar-polish-evidence/`

### 완료 게이트

- 홈 entry label이 붙어 읽히지 않는다.
- Calendar grid visible Flow labels 2, overflow summary visible 기준을 유지한다.
- 두 compact label이 같은 날짜 안에서 식별 가능하다.
- horizontal overflow 0, agenda full detail 유지, 완료 체크박스 기준 유지.

## 단계 5: Vercel preview 사용자 눈검토

P21-05까지 push한 뒤 preview 또는 production URL을 사용자에게 제공한다. 아래 순서로만 확인해 판단 범위를 제한한다.

1. `/`에서 URL/메모 시작점이 자연스럽게 읽히는가.
2. `/flows` miss에서 3~7개 제안이 실제 준비 단계처럼 보이는가.
3. 저장 후 `/my`에서 제안을 고칠 위치가 보이는가.
4. `/calendar`에서 같은 날짜의 Flow 2개와 `외 N개`가 구분되는가.
5. 실패/중복/완료/오프라인 상태 안내가 과장되거나 막히지 않는가.

사용자 확인 전에는 P21 final review를 만들지 않는다. 피드백이 기능 방향을 바꾸면 final package보다 먼저 작은 correction slice를 연다.

## 단계 6: P21 final review package

### 산출물

- `docs/content-audit/2026-07-11-claude-design-p21-final-review-package/`
  - `README.md`
  - `audit.md`
  - `review.html`
  - `route-evidence.json`
  - `prompt-ko.md`
  - `screenshots/`

### 필수 시나리오

1. 처음 온 사용자: `/` → `/flows`
2. URL hit/custom-start 사용자
3. URL miss → 여러 항목 draft 사용자
4. draft 저장 후 My Flow 수정 사용자
5. draft lifecycle: failure/duplicate/empty/completed/offline
6. Calendar-heavy 사용자: 같은 날짜 2개/3개 이상 Flow
7. public `/f` 저장 전/후 사용자
8. Studio 보조 선반 사용자
9. `/restart` release-preview와 `/flow-lab` internal-console

### 완료 게이트

- P21-01~P21-05 상태가 완료/조건부 보류로 명시된다.
- 390px/1024px screenshot과 route-evidence가 같은 scenario id를 쓴다.
- Claude Design이 JSON과 screenshot만으로 P22를 Blocking/High/Medium/Low로 작성할 수 있다.
- 앱에 실제 AI가 없는 상태를 package와 prompt가 정확히 설명한다.

## 공통 기준선

모든 단계에서 다음을 유지한다.

- 4탭 IA: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- public `/f/[slug]` 공유 shell과 save/setup-first CTA
- Studio는 5번째 탭이 아닌 보조 표면
- source-backed 원본과 개인 overlay 분리
- 저장/실행/export 스키마 유지
- My Flow/Calendar 완료 체크박스 1종
- Calendar `주요 2개 + 외 N개`, selected-day agenda full detail
- `urlFirstMissDraftImpliesLiveAi: false`
- normal route internal/structural hit 0
- URL-first visible `Markdown` 0
- candidate user-copy internal hit 0
- horizontal overflow 0

## 커밋 단위

각 단계는 별도 커밋과 push로 닫는다.

1. `Add P21 draft lifecycle evidence`
2. 조건부 `Add P21 draft recovery states`
3. `Document P21 AI draft gate`
4. `Polish P21 home and calendar labels`
5. `Add P21 final review package`

각 커밋 전 최소 `npm.cmd run docs:check`와 `git diff --check`를 실행한다. 앱·capture·E2E가 바뀌는 단계는 `npm.cmd test`, targeted Playwright, `npm.cmd run build`까지 실행한다.

## 바로 실행할 다음 단계

다음 목표는 **P21-04 draft lifecycle evidence**다. 상세 복붙용 목표는 `2026-07-11-claude-design-p21-goals-ko.md`의 첫 번째 `/goal`을 사용한다.
