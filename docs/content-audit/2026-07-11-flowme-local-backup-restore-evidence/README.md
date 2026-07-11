# FlowMe 로컬 백업·복원 Evidence

P22-00의 계정·기기 연속성 Blocking을 실제 계정 시스템으로 대체하지 않으면서, private beta 사용자가 현재 브라우저 기록을 직접 보관하고 빈 브라우저에 복원할 수 있는 최소 안전장치를 검증한 package입니다.

## 확인한 흐름

1. 저장 기록이 없어도 `/my`에서 `데이터 관리`를 연다.
2. 저장한 Flow, 개인 수정, 완료 실행, 회고, URL 요청을 v1 JSON 파일로 받는다.
3. 데모 인증과 내부 검토 상태는 파일에 포함하지 않는다.
4. 빈 브라우저에서 백업 날짜와 기록 수를 확인한 뒤 명시적으로 복원한다.
5. 복원 실패 시 기존 실행 기록을 가능한 범위에서 rollback한다.
6. 복원 뒤 My Flow와 완료 실행이 다시 나타난다.

## Screenshot

- [빈 My Flow 데이터 관리 · 모바일](./screenshots/01-empty-my-flow-data-manager-mobile.png)
- [복원 전 백업 확인 · 모바일](./screenshots/02-import-preview-mobile.png)
- [복원된 My Flow · 모바일](./screenshots/03-restored-my-flow-mobile.png)
- [저장된 My Flow 데이터 관리 · wide](./screenshots/04-saved-my-flow-data-manager-wide.png)

## Evidence

- [감사 기록](./audit.md)
- [판정 JSON](./route-evidence.json)
- [P22 현재 재평가](../2026-07-11-claude-design-p22-current-reassessment-ko.md)

이 package는 로컬 파일 생성·복원과 자동 회귀 QA를 증명합니다. 실제 계정 저장, 자동 동기화, 실제 다른 기기에서의 사용자 이해 또는 성공을 증명하지 않습니다.
