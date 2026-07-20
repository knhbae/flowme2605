# P26-17 실행 UI 컴포넌트·카피 시스템

## 판정

`complete_as_internal_baseline`

저장 전 요약, 저장 후 결과, 전체 Flow 그룹, 실행 행, 편집 셸, 가져가기 계획·결과를 하나의 실행 UI 계약으로 연결했다. 저장·완료·개인 수정·export 데이터 계약은 변경하지 않았다.

이번 결과는 자동화와 내부 시각 검토다. 실제 사용자 관찰은 `0`건이며 검증 완료로 표현하지 않는다.

## 핵심 변경

- `ArtifactSummary`: 콘텐츠 이름과 원문을 먼저 식별한다.
- `ScheduleIntent`: 내 조건, 저장 결과, 전체 항목 수를 한 줄 구조로 비교한다.
- `FlowOutlineRow`: 중첩 카드 대신 열린 단계 행으로 전체 Flow를 읽는다.
- `ExecutionRow`: 완료 체크, 제목·메타, 열기를 같은 행 문법으로 표시한다.
- `Receipt`: 저장 성공, 확인 필요, export 성공·실패를 semantic tone으로 구분한다.
- `EditorShell`: 모바일 전체 화면과 wide detail pane이 같은 편집 계약을 쓴다.
- `ExportPlan`: 범위, 예상 결과, 형식, 완료를 같은 순서로 표시한다.
- action/copy budget과 semantic color token을 코드와 테스트로 고정했다.

## 참고 화면 반영

`2026-07-19-flow-content-usage-preview-ko.html`은 `prior_design_artifact`로만 사용했다. source rail을 앱에 그대로 이식하지 않고, 다음 패턴만 current product에 맞게 적용했다.

- 전체 실행 목록 우선
- 얇은 구분선 기반 compact row
- source/trust, action, warning의 semantic color 분리
- destination별 예상 결과와 receipt

상세 비교는 [reference-patterns.md](./reference-patterns.md)에 기록했다.

## 검증 요약

- execution UI contract/pretest: `10 / 10`
- dedicated Playwright: `3 / 3`
- 기존 P26 affected regression + dedicated suite: `17 / 17`
- full unit: `564 / 564` (`pretest 10 / 10` 별도)
- docs check: `14` required files, `2,665` local links
- production build: `18 / 18 routes`
- mobile 390 / wide 1024 horizontal overflow: `0`
- browser console/page error: `0`
- observed-user session: `0`

## 파일

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [component-inventory.json](./component-inventory.json)
- [copy-prune-map.json](./copy-prune-map.json)
- [reference-patterns.md](./reference-patterns.md)
- [screenshots](./screenshots/)

## 다음

P26-18에서 390 모바일 drill-in/sheet와 1024 task-focused pane composition, fixed navigation clearance, comprehensive target/focus/error/loading 상태를 닫는다.
