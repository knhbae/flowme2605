# P22-06C 새 버전 검토 Evidence

완료한 Flow의 저장 당시 내용을 바꾸지 않고, 최신 원문과 항목 단위로 비교한 뒤 선택 결과를 새 실행에만 반영하는 흐름을 검증한 package입니다.

## 확인한 사용자 흐름

1. 진행 중 실행에는 업데이트를 즉시 반영하지 않는다.
2. 완료한 Flow에서 `이 Flow 다시 쓰기`를 연다.
3. `현재 내용` 또는 `새 내용 검토`를 고른다.
4. 안정 항목 ID 기준으로 `내용 바뀜`, `새 할 일`, `빠진 할 일`, `내 수정과 겹침`을 확인한다.
5. 충돌 항목은 `새 내용에 내 수정 유지`, `새 내용만 사용`, `현재 내용 유지` 중 하나를 고른다.
6. 새 기준일과 개인 고정 날짜 처리도 같은 화면에서 확정한다.
7. 선택 결과는 새 run에만 반영되고 지난 완료 run은 저장 당시 원문 버전과 개인 사본을 유지한다.
8. 새 실행의 진행 분모와 완료 대상은 사용자가 포함한 항목만 읽고, 제외한 항목은 다시 실행 대상으로 돌아오지 않는다.

## Screenshot

- [업데이트 알림과 현재 실행 보존 · 모바일](./screenshots/01-update-notice-mobile.png)
- [항목별 새 내용 선택 · 모바일](./screenshots/02-version-review-mobile.png)
- [항목별 새 내용 선택 · wide](./screenshots/03-version-review-wide.png)
- [새 버전 실행 착지 · 모바일](./screenshots/04-reviewed-run-mobile.png)

## Evidence

- [감사 기록](./audit.md)
- [판정 JSON](./route-evidence.json)
- [P22-06 재사용·버전 정책](../2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md)

이 package는 fixture 기반 발행 버전 차이와 자동 E2E를 증명합니다. 실제 제작자가 발행한 연속 버전과 반복 사용자의 선택 이해도는 P22-00 관찰 gate가 별도로 필요합니다.
