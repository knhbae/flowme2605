# P22-06D 완료 Flow 재사용 감사

작성일: 2026-07-11

## 원인

기존 My Flow는 완료 후 회고까지 가능했지만 같은 Flow를 다시 쓰려면 현재 slug 상태를 초기화해야 했습니다. 이 방식은 지난 완료 체크·회고·개인 수정본을 덮어쓸 위험이 있어 사용자 화면에 재사용 진입을 열 수 없었습니다.

Slice A·B에서 run registry와 새 기준일 충돌 정책을 만들었지만, 화면 연결 과정에서 추가 저장 결함 두 가지가 확인됐습니다.

- URL 초안·일반 Flow의 제목·메모·날짜 수정은 전역 로컬 키에 있어 완료 실행 snapshot에 고정되지 않았습니다.
- source-backed saved snapshot은 새 기준일을 읽어도 persistence record가 이전 값을 유지할 수 있었습니다.

## 구현 판단

### 완료 화면

- 회고와 원본 알리기를 먼저 유지했습니다.
- `이 Flow 다시 쓰기`는 별도 보조 행동으로 배치했습니다.
- 새 실행을 시작하기 전까지 현재 완료 상태를 바꾸지 않습니다.

### 날짜형 Flow

- 과거 기준일을 조용히 재사용하지 않습니다.
- `새 이사일`, `새 시험일`, `새 시작일`처럼 Flow 맥락 라벨을 사용합니다.
- 개인 고정 날짜가 하나라도 있으면 유지 또는 새 기준 맞춤을 선택해야 합니다.
- 성공 후 `새 이사일 10월 20일로 시작했어요`처럼 실제 선택 결과를 다시 보여줍니다.

### 날짜 없는 Flow

- 날짜 입력을 만들지 않습니다.
- 현재 항목과 제목·사용자 메모를 유지하고 완료 체크만 비웁니다.

### 개인 수정 snapshot

- source-backed 개인 사본과 별도로 URL 초안·일반 Flow의 실행별 개인 상태를 보존합니다.
- 지난 실행에는 당시 제목·메모·날짜와 일회성 실행 상태를 모두 snapshot으로 남깁니다.
- 새 실행에는 재사용 가능한 제목·사용자 메모만 안정 항목 키로 옮깁니다.
- 지난 실행의 로그 값·결정 상태 같은 일회성 입력은 새 실행에 복사하지 않습니다.
- 날짜 override는 사용자가 고른 충돌 정책에 따라 유지하거나 제거합니다.

### 완료 시각

- `다시 쓰기` 클릭 시각을 완료일로 쓰지 않습니다.
- 마지막 할 일을 완료한 시각을 별도 기록하고, 다시 미완료로 바꾸면 해당 시각을 지웁니다.
- 새 실행을 만들 때 기록된 완료 시각을 지난 실행에 고정합니다.

### 투영 일관성

- source-backed saved snapshot과 persistence record를 함께 갱신합니다.
- 현재 My Flow·Calendar·export는 새 실행의 기준일과 개인 수정본을 읽습니다.
- 지난 실행 snapshot은 새 실행 수정으로 변하지 않습니다.

## UX 판정

- User need fit: 4/5. 완료한 준비를 실제 반복 사용으로 이어갈 수 있습니다.
- Execution clarity: 4/5. 새 기준일과 날짜 충돌 선택이 행동 전에 명시됩니다.
- Portability: 4/5. 현재 Calendar/export 투영이 새 실행 값을 읽습니다.
- Cognitive load: 4/5. 재사용은 완료 회고보다 강하지 않고 필요할 때만 펼쳐집니다.
- Copy specificity: 4/5. `새 이사일`, `내가 바꾼 날짜 유지`, `새 실행 시작`으로 결과가 분명합니다.
- Accessibility/operability: 4/5. native date input, radio group, 상태 메시지, 모바일 overflow 0을 확인했습니다.

## 남은 리스크

- 지난 실행 목록은 완료일·기준일·완료 수 요약만 보여주며 전체 과거 항목 상세 viewer는 아닙니다.
- 원본 새 버전 비교와 개인 수정 충돌 해결인 Slice C는 아직 별도입니다.
- localStorage 기반이므로 계정·기기 간 복구를 보장하지 않습니다.
- 실제 반복 사용자의 선택 이해도는 자동화로 검증할 수 없습니다.

## 검증

- 저장 계약 focused unit: 11/11
- 재사용·개인 사본·Calendar·완료 컨트롤 targeted E2E: 6/6
- URL-first/public share/workbench regression E2E: 36/36
- 전체 unit: 384/384
- 날짜형 재사용 mobile/wide screenshot: 3장
- 날짜 없는 재사용 mobile screenshot: 1장
- TypeScript `tsconfig.next.json`: 통과
- production build: 통과
- docs check: 1,833 local links 통과
