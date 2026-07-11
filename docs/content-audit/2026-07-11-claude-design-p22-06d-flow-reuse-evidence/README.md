# P22-06D 완료 Flow 재사용 Evidence

완료한 Flow의 지난 실행을 덮어쓰지 않고 새 실행을 시작하는 My Flow 사용자 흐름을 검증한 package입니다.

## 확인한 사용자 흐름

1. 완료한 날짜형 Flow에서 `이 Flow 다시 쓰기`를 연다.
2. 새 이사일·시험일·시작일을 선택한다.
3. 따로 바꾼 날짜가 있으면 `새 기준일에 맞추기` 또는 `내가 바꾼 날짜 유지`를 명시적으로 고른다.
4. 새 실행은 완료 체크와 회고가 빈 상태로 시작한다.
5. 지난 실행은 별도 기록으로 남고 새 실행의 My Flow·Calendar 투영은 새 기준일을 읽는다.
6. 날짜가 없는 체크 Flow는 날짜 입력 없이 현재 항목과 개인 수정만 이어받는다.

## Screenshot

- [완료 Flow 재사용 선택 · 모바일](./screenshots/01-completed-flow-reuse-mobile.png)
- [새 실행 착지와 지난 실행 · 모바일](./screenshots/02-new-run-started-mobile.png)
- [새 실행과 지난 실행 기록 · wide](./screenshots/03-new-run-history-wide.png)
- [날짜 없는 Flow 재사용 · 모바일](./screenshots/04-date-free-reuse-mobile.png)

## Evidence

- [감사 기록](./audit.md)
- [판정 JSON](./route-evidence.json)
- [P22-06 정책](../2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md)

이 package는 자동 E2E와 저장 snapshot을 증명합니다. 실제 반복 사용자가 재사용 선택을 이해하는지는 P22-00 관찰 gate가 별도로 필요합니다.
