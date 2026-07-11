# P22-06C 새 버전 검토 감사

작성일: 2026-07-11

## 원인

기존 My Flow 업데이트는 저장 snapshot의 버전, Flow 수, 항목 수, 출처 확인일만 비교했습니다. `새 기준으로 표시`를 누르면 현재 저장본과 persistence record를 최신 seed로 즉시 다시 만들었습니다.

이 방식에는 세 문제가 있었습니다.

- 진행 중이거나 완료한 실행의 원문 기준이 사용자 선택 없이 바뀔 수 있었습니다.
- 같은 안정 ID의 제목·설명·일정 변화와 개인 alias·메모·날짜가 겹치는지 판정하지 못했습니다.
- 원문에서 빠진 항목을 개인 할 일로 유지할 저장 모델이 없었습니다.

## 구조 변경

### 저장 당시 발행본 고정

- My Flow는 현재 seed를 바로 투영하지 않고 저장된 persistence record를 실행 기준으로 읽습니다.
- 개인 제목·날짜·메모 수정과 새 기준일 저장은 persistence record의 원문 버전을 갱신하지 않습니다.
- 새 버전을 명시적으로 선택한 뒤 새 실행을 만들 때만 최신 persistence record로 교체합니다.

### 항목 단위 diff

`lib/flow/flow-version-review.ts`에 순수 비교 계약을 추가했습니다.

- 안정 항목 ID 기준 `changed`, `added`, `removed`
- 제목, 설명, 일정, 결과물 목적지, 출처 변화 분리
- 개인 제목 alias, 사용자 메모, 고정 날짜 충돌 분리
- 의료·금융 민감 콘텐츠는 항목 차이가 작아도 명시적 확인

사용자 화면에는 내부 상태값 대신 `내용 바뀜`, `새 할 일`, `빠진 할 일`, `내 수정과 겹침`으로 표시합니다.

### 이전 원문 항목 보존

개인 사본에 `retainedStepsByFlow`를 추가했습니다. 사용자가 `현재 내용 유지` 또는 `내 할 일로 유지`를 고르면 저장 당시 제목·설명·일정·출처를 개인 사본에 보존합니다. My Flow, Calendar, export가 같은 보존 항목을 읽습니다.

### 새 실행 경계

- 진행 중 Flow의 업데이트 행동은 `완료 후 검토`로 비활성화됩니다.
- 완료 Flow에서만 새 버전 선택을 열 수 있습니다.
- 지난 run은 이전 `sourceVersion`과 개인 사본 snapshot을 유지합니다.
- 새 run은 `reuseMode: reviewed_version`과 최신 `sourceVersion`을 가집니다.
- 새 기준일과 개인 고정 날짜 유지·재계산 정책은 Slice B와 동일하게 적용됩니다.
- 새 실행 상태를 초기화한 뒤 개인 사본의 제외 목록을 다시 투영합니다. 따라서 최신 원문 전체 항목 수가 진행 분모로 돌아오지 않고, 완료 행동도 포함한 항목에만 적용됩니다.

## 시각 판단

- 모바일은 충돌 항목을 먼저 보여주고 선택 설명을 한 열로 유지합니다.
- wide는 단일 Flow 검토 시 3열 inventory card에 가두지 않고 전체 작업 폭을 사용합니다.
- wide 선택지는 최대 3열로 배치해 긴 세로 스크롤과 빈 오른쪽 공간을 줄였습니다.
- 완료 회고와 원본 내용 알리기는 계속 재사용/버전 검토보다 먼저 보입니다.

## UX 판정

- User need fit: 4/5. 완료한 개인 사본을 잃지 않고 최신 원문을 선택할 수 있습니다.
- Execution clarity: 4/5. 현재 실행 유지와 다음 실행 반영 경계가 행동 전에 보입니다.
- Portability: 4/5. 선택한 제목·일정·메모가 My Flow·Calendar·export의 같은 투영을 사용합니다.
- Cognitive load: 4/5. 업데이트가 있을 때만 검토가 나타나고 wide는 전체 작업 폭을 씁니다.
- Copy specificity: 4/5. 사용자가 고르는 결과를 직접 설명합니다.
- Accessibility/operability: 4/5. native date input, radio group, 민감 일정 확인 checkbox, 상태 메시지를 사용합니다.

## 남은 리스크

- 실제 제작 발행 파이프라인이 연속 버전 persistence fixture를 만드는 종단 경로는 아직 없습니다.
- 전체 Flow가 원문에서 제거되는 경우는 항목 보존보다 상위의 Flow 보존 정책이 추가로 필요합니다.
- 과거 실행 상세 viewer는 완료일·기준일·완료 수 요약 수준입니다.
- localStorage 기반이므로 계정·기기 간 버전 기록 복구를 보장하지 않습니다.
- 실제 반복 사용자가 세 선택의 차이를 이해하는지는 P22-00 관찰 전에는 확정할 수 없습니다.

## 검증

- full unit: 388/388
- version review/source-backed/storage focused unit: 67/67
- connected reuse regression E2E: 12/12
- user-surface/public-share/source-density guardrail E2E: 36/36
- completed version review E2E: 1/1
- reviewed run executable denominator: 1 selected / 1 total
- 모바일 screenshot: 3장
- wide screenshot: 1장
- TypeScript `tsconfig.next.json`: 통과
- production build: 통과
- docs check: 14 required files, 1846 local links
- evidence JSON parse: 통과
