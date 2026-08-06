# 구현 계획과 현재 상태

순서는 결과 계약을 먼저 고정하고 그 결과를 편집·저장·실행 화면이 사용하게
하는 방식이다. 2026-08-01 현재 P0-01~P0-08의 로컬 구현과 내부 자동 검증을
완료했다.

## Phase A: 결과의 일치

### P0-01 Effective snapshot — 구현 완료, Map 합성 예외 유지

- [x] 공개, 저장, 실행, 영수증, 내 Flow, export, Map 입력을 조사했다.
- [x] source/personal/execution layer를 분리한 read model을 구현했다.
- [x] calendar, checklist, sheet, memo, routine/meal 경로의 parity 테스트를 추가했다.
- [x] 공개 결과와 내 Flow의 결과 이름·개수·날짜·행을 resolver로 연결했다.
- [x] 항목 상세와 저장한 Flow export가 committed snapshot 행을 사용한다.

범위 경계: Flow Map은 행동·복구 adapter 적용까지 완료했다. 여러 하위 Flow
결과의 단일 `EffectiveFlowSnapshot` 전환은 이번 P0 완료 조건이 아닌 별도
후속 과제다.

Flow 단위 소비자는 원본 bundle을 다시 해석하지 않는다. Map은 공통 행동·복구
계약을 사용하지만 결과 합성은 기존 Map controller가 소유한다.

### P0-02 날짜와 저장 결과 연속성 — 구현 완료

- [x] `provisional`, `custom`, `undated`를 resolver와 저장 레코드에 보존했다.
- [x] 캘린더/이사 Flow의 행동 문구를 실제 저장 결과와 맞췄다.
- [x] 저장 결과와 내 Flow가 선택한 결과 유형과 날짜를 재생한다.
- [x] 빈 날짜, 명시적 날짜, 명시적 무기한 경로를 단위/E2E로 확인했다.

### P0-03 공개 수정과 export 일치 — 구현 완료

- [x] 적용된 Flow/Item 초안을 저장 입력으로 전달했다.
- [x] 같은 committed result를 text/XLSX/ICS에 전달했다.
- [x] 포함 여부와 지원하는 순서를 결정적으로 보존했다.
- [x] 형식이 표현하지 못하는 routine 필드를 내보내기 화면에 알렸다.
- [x] payload와 round-trip assertion을 추가했다.

## Phase B: 편집과 인계 화면

### P0-04 원자적 편집 — 구현 완료

- [x] Flow와 Item 초안을 한 transaction owner 아래로 모았다.
- [x] Item drill-down은 Apply 전까지 부모 초안만 바꾼다.
- [x] Apply는 한 번 저장하고 Cancel은 전체 초안을 복원한다.
- [x] 편집 종류를 바꿔도 다른 초안 변경이 사라지지 않는다.
- [x] Back, Escape, 닫기, focus return을 E2E로 확인했다.

### P0-05 공개 shell과 저장 결과 — 구현 완료

- [x] 저장을 유일한 기본 행동으로 두었다.
- [x] 편집과 내보내기를 각각 전체 높이 한 단계 화면으로 분리했다.
- [x] 저장 전 내보내기 하나만 유지하고 저장 결과에서는 제거했다.
- [x] 저장 결과를 실제 결과와 `내 Flow에서 이어하기` 중심으로 줄였다.
- [x] `/f`에서 `Flow 찾기`로 나가는 경로를 유지했다.

## Phase C: 저장한 Flow 실행과 호환성

### P0-06 내 Flow와 완료 — 구현 완료

- [x] `할 일`과 `저장한 Flow` 두 작업을 분리했다.
- [x] 실행 가능한 결과형의 첫 진입에는 진행률과 다음 1~3개 항목을 먼저 보여준다.
- [x] 전체 계획은 기본으로 접는다.
- [x] 항목 상세만 완료 행동을 소유하고 행 상태와 동기화한다.
- [x] 메모 결과형은 `memo` mode를 유지하고 가짜 실행·진행률을 만들지 않는다.

### P0-07 메모 facade — 구현 완료

- [x] 항목 상세에 보이는 메모 진입점을 하나로 줄였다.
- [x] 새 기본 입력은 Item memo에 쓴다.
- [x] legacy/private note, 완료 회고, 과거 실행 note를 구분해 읽는다.
- [x] backup, upgrade, read, export, restore 호환 fixture를 통과했다.

### P0-08 Map/원문/복구 어댑터 — 구현 완료

- [x] 기존 Map 저장, 선택, 여러 Flow 저장, hold 로직을 유지했다.
- [x] 편집 가능한 Map은 원자적 전체 높이 편집기를 사용한다.
- [x] 하위 Flow 선택형·보류형 Map에는 편집 행동을 노출하지 않는다.
- [x] 원문은 항상 identity 영역에서 열 수 있다.
- [x] 민감 위험 안내는 필요한 경우에만 관련 행동 옆에 표시한다.
- [x] 복구는 실제 conflict 또는 `needs_choice` 상태에서만 표시한다.

## 최종 내부 게이트

- [x] P35 P0 목표 계약 테스트
- [x] 전체 단위/계약 테스트
- [x] 프로덕션 빌드
- [x] 영향 범위 P35·회귀 E2E
- [x] 390x844 overflow, console error, page error 확인
- [x] 전체 E2E 57개 spec, 413/413 통과
- [x] 최종 scoped diff와 호환성 감사 완료

이 게이트는 내부 QA다. 실제 사용자 관찰이나 사용성 검증으로 부르지 않는다.
