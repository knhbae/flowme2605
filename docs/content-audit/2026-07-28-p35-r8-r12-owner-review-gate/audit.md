# P35-R8~R12 Owner Review Audit

## 판정

`owner_decision_required`

R8A~R12의 bounded 구현은 안정된 source/personal/run/occurrence/export 계약 안에서
완료됐다. publish나 전역 IA 변경으로 넘어가기 전에 A/B/C와 모바일 전체 계획
기본값을 사용자에게 확인해야 한다.

## 해결된 Blocking/High

### 1. 반복 실행 단절

- route: `/f/curated-allblanc-morning-workout` -> `/my`
- fixture: 2026-08-03 시작, 월/수/금, 계속 반복
- 이전: 첫 회차 완료 뒤 `남은 회차가 없습니다.`
- 현재: 2026-08-05 다음 회차 표시
- 보존: series ID, revision ID, occurrence ID, completion history, ICS UID
- evidenceKind: `current_source`, `current_browser_automation`

### 2. Artifact 의미 변경

- route: `/f/overseas-safety-register` -> `/my`
- 이전: public Memo, 저장 후 completion Checklist
- 현재: source의 실행 행동을 근거로 Checklist primary, Memo secondary
- public preview completion control: 0
- saved execution completion: 실행 Item에만 제공
- evidenceKind: `current_source`, `current_browser_automation`

### 3. 완료 control 중복

- route: `/my`
- 이전: 현재 실행 묶음과 전체 계획에 같은 Item checkbox 반복
- 현재: 현재 실행이 control을 소유하고 전체 계획은 `현재 위치` 요약
- 완료 후 펼쳐진 전체 계획에 같은 Item이 보이면 snackbar undo 없음
- 접힌 묶음으로 이동해 보이지 않으면 snackbar undo 제공
- Calendar에서 행이 남으면 완료 undo 없음
- evidenceKind: `current_source`, `current_browser_automation`

### 4. Shape별 화면 문법 충돌

- 다섯 shape: Calendar, Checklist, Routine, Sheet, Memo
- public preview는 실행 불가능한 neutral row
- saved executable row는 trailing completion 1개
- Memo는 completion/progress 없음
- Routine은 series와 occurrence 분리
- Sheet는 current/next와 whole table 분리
- evidenceKind: `current_source`, `current_browser_automation`

## R11 wide workspace

### 1024/1440

- library rail: Flow 선택과 lifecycle filter
- execution canvas: 현재 실행과 전체 계획
- inspector: 선택 Item/Flow 맥락과 명령

### 390

- 현재 실행
- 전체 계획
- 필요할 때 item detail sheet

별도 저장 schema와 임시 identity는 만들지 않았다.

## R12 Todo/Calendar 실험

- route: `/my?experiment=todo`
- 기본 활성화: false
- groups: today, upcoming, undated, completed
- 포함: 실행 가능한 source/user Item, routine current occurrence, Sheet current row
- 제외: Memo 기록, resource, routine series 정의
- 날짜 지정: 같은 stable Item이 Calendar에 나타남
- 날짜 제거: 같은 stable Item이 undated로 복귀
- rollback: experiment close, 저장 데이터 변경 없음

## A/B/C 비교

| 기준 | A 현재 My Flow | B 내부 Todo, 추천 | C 전역 Todo |
| --- | --- | --- | --- |
| 전역 IA 변경 | 없음 | 없음 | 필요 |
| 교차 Flow 실행 | 약함 | 강함 | 강함 |
| 전체 Flow 맥락 | 강함 | 강함 | 별도 진입 필요 |
| rollback | 즉시 | experiment 숨김 | 전역 route 복구 필요 |
| 구현 근거 | current app | current bounded experiment | static proposal |
| 현재 검증 | 완료 | 완료 | interaction 미구현 |

## 남은 위험

### High

1. A/B/C 제품 결정이 아직 없다.
2. 모바일 전체 계획 기본 접힘/펼침 정책이 아직 없다.

### Medium

1. B안의 실제 사용자 발견성과 장기 다중 Flow 사용성은 관찰하지 않았다.
2. C안은 정적 prototype이라 focus, deep link, lifecycle을 검증하지 않았다.
3. 실제 screen reader 세션은 수행하지 않았다.

### Low

1. 장기 full E2E에서 구형 selector 경합 네 건을 발견해 공통 workspace helper,
   stable row identity, accessible name 기준으로 고쳤다.
2. 기존 큰 dirty worktree이므로 publish 전 scoped ownership 감사를 다시 해야 한다.

## 데이터 안전

- localStorage migration: 없음
- source mutation: 없음
- personal overlay rewrite: 없음
- completion/run history reset: 없음
- recurrence identity regeneration: 없음
- export identity change: 없음

## 검증 상태

- P35 targeted E2E: `76 / 76`
- 전체 unit: `692 / 692`
- full E2E: `402 / 402`, single worker, `24.0m`
- docs check: 필수 문서 `14`, local link `3,457`
- production build: 통과
- `git diff --check`: 통과
- 브라우저 품질: 390 / 1024 / 1440 overflow, fixed overlap,
  console/page error `0`

자동 검증은 실제 사용자 검증이 아니며 observed-user count는 `0`이다.
