# Claude Code 테스트 프롬프트

아래 내용을 Claude Code에 그대로 붙여넣어라.

---

`D:\flowme2605\flow-mvp` 기준으로 FlowMe P24-00A 독립 사용자 여정 QA를 진행해줘.

## 역할

너는 기능 구현자가 아니라 독립 product QA + UX journey auditor다. 현재 기능이 존재하는지만 확인하지 말고, 처음 온 사용자가 설명 없이 발견하고 이해하고 수정하고 실행하고 다시 쓸 수 있는지 검증한다. 자동화 persona simulation을 실제 사용자 관찰이라고 표현하지 않는다.

## 기준선

- branch: `main`
- product baseline commit: `c14c262`
- Vercel preview: `https://flowme2605-13grv45zl-flowme.vercel.app`
- preview deployment ID: `dpl_3hhwff4iQFJrubYD7T4ivQjUXjUL`
- preview는 clean `c14c262` worktree에서 배포됐다.
- P23 local MVP lifecycle contract는 닫혔지만 production release ready는 아니다.
- 정식 관찰 사용자는 아직 0명이다.

## 먼저 읽을 파일

1. `AGENTS.md`
2. `agent.md`
3. `docs/harness/README.md`
4. `docs/content-audit/2026-07-14-flowme-p23-handoff-p24-validation-package/README.md`
5. `docs/content-audit/2026-07-14-flowme-p23-handoff-p24-validation-package/current-state.md`
6. `docs/content-audit/2026-07-14-flowme-p23-handoff-p24-validation-package/backlog.md`
7. `docs/content-audit/2026-07-13-p23-lifecycle-closure-review/README.md`
8. `docs/content-audit/2026-07-13-p23-lifecycle-closure-review/audit.md`
9. `docs/content-audit/2026-07-13-p23-lifecycle-closure-review/route-evidence.json`
10. 관련 `components/flow/AppClient.tsx`, `lib/flow/*`, `tests/e2e/*`

## 작업 경계

- 앱 코드와 UI를 수정하지 않는다.
- 기존 modified/untracked 파일을 revert, delete, stage하지 않는다.
- 현재 dirty worktree와 이번 QA 산출물을 분리한다.
- prior evidence를 이번 실행 결과처럼 복사하지 않는다.
- 테스트 fixture로 가능한 상태와 사용자가 UI로 도달 가능한 상태를 구분한다.
- preview 결과와 local test 결과를 구분한다.
- 실제 사람이 참여하지 않았으므로 결과 등급은 `automated_simulated`다.
- 계정, DB, AI API, OAuth, 4탭 IA 변경을 하지 않는다.

## 시작 절차

1. `git status --short --branch`, `git log -3 --oneline`, `git diff --stat`을 기록한다.
2. preview와 local baseline이 같은 제품 commit을 가리키는지 확인한다.
3. persona마다 독립 browser context와 localStorage fixture를 사용한다.
4. 첫 세션은 fresh state, 2·3회차는 같은 context를 재사용해 persistence를 검증한다.
5. mobile `390x844`, wide `1024x768`에서 모두 검사한다.
6. 각 행동 전후 route, visible text, state, click/tap depth, reload persistence를 기록한다.

## Persona 1: 기준일 역산형

상황: 이사 30일 전부터 준비하려는 사용자다.

세션 1:
- 홈에서 URL/메모 entry 발견
- moving Flow 찾기 또는 공개 Flow 저장
- `시작일`이 아니라 `이사일` 맥락을 이해하는지 확인
- 저장 후 My Flow와 Calendar 착지

세션 2:
- 이사일 변경
- 한 항목만 날짜 변경
- 두 수정의 차이와 override 유지 여부 확인
- 완료 → 완료 취소
- Calendar와 ICS 확인

세션 3:
- reload 후 값 유지
- 과거 실행과 회고 확인
- 새 run으로 다시 쓰기
- source 새 버전이 있다면 어떤 기대를 갖게 되는지 gap 기록

## Persona 2: 날짜 없는 체크리스트형

상황: 차량 점검처럼 순서대로 확인하되 기본 날짜는 필요 없는 사용자다.

세션 1:
- public 또는 source-backed checklist 저장
- 날짜 없는 상태와 완료 체크 발견

세션 2:
- 특정 항목에만 날짜 지정
- 날짜 변경 후 다시 날짜 없음으로 되돌리기
- 완료 → 완료 취소
- 날짜 없는 항목이 Calendar/ICS에서 빠지고 checklist/sheet/memo에는 남는지 확인

세션 3:
- reload persistence
- export 결과 재확인
- source-backed 구조 add/delete/reorder가 막혀 있는지와 사용자 기대를 기록

## Persona 3: 반복 루틴형

상황: 운동 또는 학습을 매일·매주 반복하고 일부 회차를 건너뛰거나 보류한다.

세션 1:
- 개인 draft 생성
- 날짜, 종일 또는 시간, duration 지정
- daily/weekly/monthly 반복 설정

세션 2:
- occurrence 완료 → 재개
- 다른 occurrence 건너뛰기와 보류
- series 전체 완료와 한 회차 완료를 구분하는지 확인
- Calendar ordering과 recurring ICS 확인

세션 3:
- reload 후 occurrence 상태 유지
- 반복 규칙 수정 시 과거 기록 보존 확인
- source-backed 반복 Flow의 parity gap 기록

## Persona 4: 개인 초안·구조 편집형

상황: 준비된 Flow가 없는 URL 또는 메모를 자기 실행 초안으로 만든다.

세션 1:
- `/flows` miss 진입
- live AI로 과장되지 않는 초안 흐름 확인
- 초안 저장 후 My Flow 착지

세션 2:
- 항목 추가
- 제목·메모·날짜·시간 수정
- 삭제 → 즉시 undo
- 삭제 → reload → 지속 복구
- 위/아래 순서 변경
- 완료 → 완료 취소
- Calendar/ICS/checklist/sheet/memo 일관성 확인

세션 3:
- reload persistence
- 과거 run과 회고
- 새 run으로 다시 쓰기
- Studio 초안 선반이 보조 표면으로만 동작하는지 확인

## Persona 5: 공개 공유·기록·재사용형

상황: 공개 Flow를 받아 저장하고 실행한 뒤 결과를 기록하고 다시 쓰려는 사용자다.

세션 1:
- 대표 `/f/[slug]` 진입
- 저장 전 checkbox가 preview이고 완료가 아님을 이해하는지 확인
- Flow 단위 저장이 first action인지 확인
- Flow 단위 export가 secondary인지 확인

세션 2:
- 저장 후 My Flow에서 실제 완료 checkbox 활성화 확인
- 열기·수정·완료의 역할 분리 확인
- memo/checklist/sheet/ICS export

세션 3:
- 완료 run의 회고와 export
- 새 run으로 다시 쓰기
- 공개 원본 업데이트 기대와 현재 gap 기록

## 공통 상태 전이

가능한 persona에서 아래를 순서대로 검증한다.

`발견 → 저장 → 제목/기준일/메모 수정 → 날짜 지정 → 날짜 변경 → 날짜 제거 → 종일/시간 전환 → 반복 설정 → 일부 완료 → 완료 취소 → 건너뜀/보류 → 항목 추가 → 삭제 → undo/복구 → 순서 변경 → Calendar → ICS/checklist/sheet/memo → 전체 완료 → 회고 → 다시 쓰기`

각 단계는 아래로 분류한다.

- `supported`: UI로 도달하고 reload·projection까지 일관됨
- `hidden`: 기능은 있으나 설명 없이 찾기 어려움
- `partial`: 일부 화면·destination·Flow 유형에만 반영됨
- `missing`: 기능 또는 사용자 경로 없음
- `blocked`: 데이터·제품 정책 선행 필요

## 반드시 확인할 항목

- 완료와 완료 취소가 같은 checkbox pattern인지
- 완료, 삭제, 제외, skip, hold가 서로 다른 상태인지
- `열기`, `수정`, `완료`의 accessible name과 역할
- source, personal overlay, execution run의 소유권 혼합 여부
- stable item ID, Calendar identity, ICS UID 유지
- Calendar와 모든 export의 effective state 일치
- reload 후 persistence
- mobile/wide horizontal overflow와 fixed/sticky overlap
- keyboard focus, Enter/Space 조작, native input label
- console error, duplicate row/event, 내부어 노출
- action depth 3 이상인 수정 entry

## 알려진 현재 위험

- account/DB/cross-device restore 없음
- source-backed add/delete/reorder는 source v2 merge 정책 때문에 차단
- source-backed recurring skip/hold parity는 partial
- 일부 mobile edit path는 3~4 tap
- full Playwright suite는 P23 마감에서 실행하지 않음
- formal observed user 0명
- Next 의존 경로의 PostCSS moderate advisory 2건

이 위험을 재발견한 것처럼 과장하지 말고, 실제 테스트에서 어떤 영향을 주는지 확인한다.

## 산출물

`docs/content-audit/2026-07-14-claude-code-p24-observation-audit/`

- `README.md`
- `audit.md`
- `workboard.html`
- `journey-scorecard.json`
- `state-transition-results.json`
- `route-evidence.json`
- `backlog-recommendation.md`
- `screenshots/`
- `downloads/`

각 screenshot 파일명에는 persona, session, viewport, state를 포함한다.

## 결과 작성 규칙

1. Findings를 먼저 쓰고 Blocking, High, Medium, Low 순으로 정렬한다.
2. 각 finding에는 persona, session, route, viewport, 재현 절차, expected, actual, evidence 파일을 연결한다.
3. 자동화가 증명한 동작과 screenshot으로 추정한 UX를 구분한다.
4. 실제 사용자에게만 답할 수 있는 질문을 별도 목록으로 둔다.
5. 바로 수정할 것, 관찰 후 수정할 것, 보류할 것을 분리한다.
6. P24-01A source v2 merge contract를 시작해도 되는지 명시한다.
7. 테스트 중 앱 코드를 변경하지 않는다.

## 검증 명령

- 필요한 targeted unit test
- 필요한 targeted Playwright E2E
- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`
- `git diff --check`

full Playwright suite를 실행하지 못하면 그 사실과 이유를 명시한다. 실행 결과를 이전 artifact로 대체하지 않는다.

## 최종 응답

- 가장 심각한 findings
- persona/session별 성공·실패
- supported/hidden/partial/missing/blocked 수치
- mobile/wide 결과
- projection/export 결과
- 자동 검증 범위와 실제 사용자 관찰 필요 항목
- 생성 파일
- 검증 결과
- Git 변경 여부
- P24-00B 실제 관찰 준비도
- P24-01A 착수 판단

을 간결하게 요약해줘.

---
