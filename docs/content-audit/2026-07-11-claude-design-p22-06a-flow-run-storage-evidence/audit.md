# P22-06A 실행 인스턴스·완료 기록 저장 감사

## 문제

기존 진행, 기준일, 항목 상태, 완료 회고는 Flow slug 하나에 저장됩니다. 같은 slug를 초기화해 다시 시작하면 지난 완료 기록을 잃을 수 있어 사용자-facing `다시 쓰기`를 먼저 열 수 없었습니다.

## 구현 경계

`lib/flow/storage.ts`에 `flow:run-registry:<slug>` schema version 1을 추가했습니다. registry는 active run pointer와 완료·진행 run record를 함께 보존합니다.

### Legacy migration adapter

`ensureLegacyActiveFlowRun()`은 기존 saved record, 체크, 항목 상태, 기준일, Map snapshot, workbench 같은 상태가 있을 때만 첫 active run을 만듭니다. 자동 실행하지 않으며 이미 run history가 있으면 임의의 legacy run을 다시 만들지 않습니다.

### 완료 snapshot

`completeActiveFlowRun()`은 아래 상태를 완료 run에 복제합니다.

- 완료 체크
- 건너뜀과 항목 메모
- 하위 확인 체크
- 비교표
- workbench와 반응 기록
- 완료 회고와 원본 내용 알리기 초안
- 기준일, 결과물 형식, source version, personal copy

실제 사용 순서가 완료 뒤 회고 작성이므로 `saveMyFlowCompletionFeedback()`은 active run이 없을 때 가장 최근 완료 run의 feedback snapshot도 갱신합니다.

### 새 실행

`startFlowRunFromCompleted()`은 완료 run을 삭제하지 않고 새 runId를 만듭니다. 현재 slug projection에서 실행 상태만 초기화하고 saved Flow와 Map personal copy는 유지합니다.

- 완료 체크 초기화
- 항목·하위 확인 상태 초기화
- 완료 회고·원본 알리기 미복사
- comparison/workbench/reaction의 실행 상태 초기화
- `new_anchor`는 새 기준일 없이는 시작 거부
- 다른 Flow의 하위 확인 상태는 보존

## 의도적으로 하지 않은 것

- My Flow `다시 쓰기` 버튼
- 자동 migration 실행
- 날짜 override 충돌 선택 UI
- 새 source version 비교·병합
- Studio 승격
- 계정·서버 persistence

## 남은 위험

- 현재 registry는 localStorage 한 key에 run history를 저장합니다. 장기 history와 기기 연속성은 account-backed persistence 결정이 필요합니다.
- 기존 화면은 아직 slug projection을 사용합니다. 사용자 흐름을 열기 전에 Slice B 날짜 재계산과 Slice D UI 연결이 필요합니다.
- 실제 사용자 반복 관찰 없이 `다시 쓰기`가 자주 쓰인다고 주장할 수 없습니다.

## Acceptance 판정

| 기준 | 판정 |
| --- | --- |
| legacy 상태 보존 migration adapter | 충족 |
| active/completed runId 분리 | 충족 |
| 완료 snapshot 불변 보존 | 충족 |
| 새 실행의 체크·회고 미복사 | 충족 |
| source version·personal copy 보존 | 충족 |
| 기존 projection 회귀 없음 | 자동 검증 충족 |
| 사용자-facing 재사용 | 미구현, 후속 slice |
