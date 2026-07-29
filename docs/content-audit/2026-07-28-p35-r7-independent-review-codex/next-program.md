# P35-R7 이후 bounded revision program

## 실행 원칙

- 현재 verdict는 `block_publish`다.
- P35 구조는 폐기하지 않는다.
- source, personal overlay, execution run, recurrence occurrence, export identity는
  변경하지 않는다.
- 한 slice가 acceptance를 통과하기 전 다음 slice를 시작하지 않는다.
- 앱 코드 변경은 이 문서 작성 범위에 포함되지 않는다.

## BR-01 Routine execution continuity

### 문제

현재 occurrence execution projection이 오늘+7일에서 끝난다. 경계 다음 날에 실제
회차가 있으면 첫 회차 완료 뒤 `남은 회차가 없습니다.`가 표시된다.

### 목표

반복 정의가 계속 유효한 동안 다음 open occurrence 하나를 안정적으로 찾아
개인 workspace에 표시한다.

### 범위

- next open occurrence projection
- series 종료 조건 판정
- 첫 회차 완료·다시 열기
- receipt의 series-aware summary
- routine whole/selected/current export count copy

### 비범위

- recurrence schema 변경
- occurrence ID 변경
- Calendar grid 재설계
- 새로운 운동 기록 기능
- 다른 shape artifact recommendation

### 영향 파일

- `components/flow/AppClient.tsx`
- recurrence projection helper
- `components/flow/SavedFlowReceiptFrame.tsx`
- `components/flow/FlowExportPanel.tsx`
- routine unit tests
- `tests/e2e/p35-r4-shape-aware-workspace.spec.ts`
- `tests/e2e/p35-r7-bounded-revision-final-gate.spec.ts`

### Rollback

새 next-occurrence selector와 shape-aware receipt formatter를 독립 함수로 둔다.
저장 데이터와 기존 projection builder는 변경하지 않아 함수 사용만 되돌릴 수 있어야
한다.

### Acceptance

- 시작일 `2026-08-03`, 월·수·금, 계속 반복
- `2026-08-03` 완료 후 `2026-08-05`가 즉시 보임
- 완료 취소 후 같은 occurrence ID와 날짜가 복구됨
- finite count와 end date 종료 조건에서만 종료 문구가 보임
- public, receipt, workspace, Calendar, ICS의 series/occurrence count를 구분 가능
- 390x844, 1024x768 screenshot
- unit, targeted E2E, build 통과

## BR-02 Artifact semantic continuity

### 문제

Memo primary Flow가 receipt와 개인 workspace에서 일반 Todo와 완료율로 바뀐다.

### 목표

대표 Memo/Guide 콘텐츠의 natural artifact를 다시 판정하고 public, receipt,
workspace, export가 같은 문법을 사용하게 한다.

### 범위

- `overseas-safety-register`의 primary/secondary 결정
- receipt noun/count
- Memo mode whole-content grammar 또는 Checklist primary
- artifact parity unit/E2E

### 비범위

- 새 artifact type
- memo completion schema
- source content 재작성
- 모든 Guide 일괄 변경

### Acceptance

- public primary와 saved workspace의 주요 command가 의미상 일치
- Memo mode면 완료율과 checkbox 없음
- Checklist mode면 public부터 실행 항목으로 보임
- secondary export의 손실과 count 확인 가능

## BR-03 Single execution owner

### 문제

날짜형 current group과 whole-plan 첫 그룹에 같은 Item과 checkbox가 중복된다.

### 목표

현재 실행 묶음 하나만 completion을 소유하고 whole plan은 구조·맥락을 소유한다.

### 범위

- current group duplicate suppression
- whole-plan current-group summary
- stable Item ID parity assertion
- completion/reopen/undo regression

### 비범위

- whole Flow renderer 재작성
- 새 Today route
- date grouping contract 변경

### Acceptance

- 첫 viewport에서 stable Item 하나당 visible completion control 하나
- whole plan에서 전체 날짜 구조와 current-group count 확인 가능
- 완료 후 undo 정책 유지

## BR-04 Visual and command cleanup

### 범위

- public checklist neutral marker
- Item detail visible close 하나
- 60 Flow 상태 filter에서 `루틴` 제거
- screenshot/accessibility regression

### 비범위

- 새 filter axis
- virtualization
- visual redesign

## Final gate

1. 다섯 shape x 세 session 재현
2. 390x844, 1024x768, 1440x900
3. overflow, fixed overlap, focus trap, focus return, accessible name
4. docs check, unit, build
5. P35 R0~R8 targeted E2E
6. full E2E
7. app diff와 review docs를 분리해 보고
8. observed-user count 0 명시

## 첫 bounded slice `/goal`

```text
FlowMe P35-R8의 첫 bounded slice로 Routine execution continuity만 수정해줘.

작업 위치:
D:\flowme2605\flow-p35-mece-ux-reset

먼저 읽을 자료:
1. AGENTS.md
2. agent.md
3. docs/content-audit/2026-07-28-p35-r7-independent-review-codex/README.md
4. docs/content-audit/2026-07-28-p35-r7-independent-review-codex/next-program.md
5. docs/content-audit/2026-07-27-p35-r7-bounded-revision-final-gate/README.md
6. components/flow/AppClient.tsx의 occurrence projection과 shape-aware routine execution
7. recurrence projection 관련 unit test
8. tests/e2e/p35-r4-shape-aware-workspace.spec.ts
9. tests/e2e/p35-r7-bounded-revision-final-gate.spec.ts

확인된 blocker:
- occurrence execution projection이 오늘+7일에서 끝난다.
- 월·수·금 계속 반복 Flow를 2026-08-03에 시작하고 첫 회차를 완료하면,
  실제 다음 회차 2026-08-05가 있는데도 `남은 회차가 없습니다.`가 표시된다.

목표:
- series가 유효한 동안 다음 open occurrence 하나를 안정적으로 표시한다.
- finite count/end date에 실제로 도달했을 때만 종료 문구를 표시한다.
- receipt와 export에서 series 1개와 projected occurrence 수를 구분한다.

범위:
- next open occurrence selector
- 종료 조건 판정
- 첫 occurrence 완료와 다시 열기
- routine receipt/export count presentation
- unit/E2E/screenshot

비범위:
- storage 또는 recurrence schema migration
- occurrence identity 변경
- Calendar IA 변경
- 다른 artifact recommendation 변경
- 운동 기록 기능
- commit, push, PR, merge, deploy

데이터 원칙:
- source, personal overlay, execution run, recurrence series/occurrence,
  export identity를 유지한다.
- 기존 완료 기록과 날짜 override를 다시 쓰지 않는다.

Acceptance:
1. 월·수·금, 시작 2026-08-03, 계속 반복에서 첫 회차 완료 후 2026-08-05 표시
2. 완료 취소 시 동일 occurrence ID 복구
3. finite count/end date 종료 전에는 종료 문구 없음
4. receipt는 반복 계획 1개와 다음 회차를 설명
5. export preflight는 series와 파일에 포함할 occurrence count를 구분
6. 390x844과 1024x768 screenshot
7. 관련 unit, P35 targeted E2E, build 통과
8. app code 외 기존 dirty 변경 보존

완료 후 변경 파일, 테스트 결과, 미검증 gap, publish 상태를 보고하고 멈춰라.
```
