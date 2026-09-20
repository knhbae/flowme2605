# K3-B B1-D — 개인 계획 metadata의 명시 삭제 연결

2026-09-05. root의 순수 구현 범위다. [기존 명시 삭제 계약](./k2b-permanent-delete-design.md), [B1-G 계약](./k3b-plan-context-contract.md), [checkpoint 연결 설계](./k3b-checkpoint-plan-connection-design.md)를 모두 읽고 현재 D 전체와 기존34개 시험을 대조했다. 실제 UI나 writer는 이 단계에서 바꾸지 않는다.

## 요구와 소유 범위

선택 사본을 휴지통에서 명시 영구 삭제하면 그 사본의 개인 제목·메모·계획 날짜와 기준 capture도 남지 않아야 한다. 같은 문자열을 가진 이웃 사본은 보존한다. 이는 기존 개발1 삭제의 소유 범위를 새 PoC metadata에 연결하는 작업이며, 보관 기간·자동 삭제·운영 migration 정책을 새로 만들지 않는다.

현재 D는 새 최상위 `personalPlanContextV1`을 알 수 없는 소유자로 보아 삭제를 안전 차단한다. 이 차단을 단순 allowlist 추가만으로 해제하지 않는다. C의 current/Undo/legacy provenance 검사 뒤, metadata가 있는 state는 실제 P의 strict raw projection 성공도 확인하고 반환 view는 버린다. P가 없거나 버전·계약·필수 API가 다르면 해당 삭제만 차단한다. metadata 없는 옛 삭제는 P를 로드하지 않는 lazy 호환을 유지한다.

## 최소 변경

1. D에 lazy P 의존성을 추가하고 알려진 metadata를 실제 P validator로 검사한다. 운영·DOM·storage·clock 의존성을 추가하지 않는다.
2. 정확한 target Flow ref·savedCopyId·sourceFlowId·localFlowId를 current/Undo 각각의 binding과 대조한다. P가 이미 검증한 Item 전체 membership을 임의 제목·배열 index로 다시 추정하지 않는다.
3. 선택 Flow의 entry 전체(binding, presence-aware capture, overlay)를 제거한다. 마지막 entry라면 metadata 루트도 제거한다. 이웃 entry JSON 값과 순서는 유지한다. Quick 삭제는 독립 Flow의 entry를 제거하지 않는다.
4. legacy raw/각 timeline archive에는 새 metadata가 존재할 수 없다는 C의 reserved collision 차단을 유지한다. 이를 새 계약으로 승격하거나 조용히 지우지 않는다. 그 밖의 unknown 최상위 값도 기존대로 삭제만 차단한다.
5. 기존 삭제 예외대로 전체 active Undo는 null, revision은 한 번 증가한다. legacy/source owner 제거·archive 재결합·현재 C 재검증·writer의 다중 key CAS/복구 계약은 변경하지 않는다.
6. footprint는 metadata가 있던 snapshot에 한해 제거한 Plan entry 수를 추가한다. 이는 실제 write 수가 아니다. UI에서 내부 capture나 raw text를 새로 출력하지 않는다.

## 검증 계획과 동결

신규 순수 시험에서 current/Undo의 선택 private sentinel 제거, 이웃 동일문자 보존, 마지막 entry 제거, Quick/독립 Flow 보존, nullable·빈/공백/CRLF capture, stale/foreign/corrupt·reserved collision·unknown owner 차단, cancel/stale0candidate, serialize/reload 및 후속 Undo 부활0, 실제 UMD의 lazy P 부재/복구·DOM/storage0을 확인한다. 기존 D34·C·P·삭제 storage 회귀를 함께 확인한다. 등록 수와 실행 결과는 후속 QA에서 구분한다.

기존 D exact backup: `output/poc-gap-implementation/k3b/before-plan-delete/workspace-permanent-delete.js`. 제품 소유 파일은 D와 신규 `plan-context-permanent-delete.test.cjs`뿐이다. C/P/E2/app/builder/사용자 HTML은 root가 이 하위 작업에서 바꾸지 않는다. 사용자 HTML은 B14A 동결본을 유지한다.

실제 영구 삭제 UI, 실제 저장 fault·브라우저·기기·관찰 사용자는 이번 순수 범위 밖이다. 실제 사용자 데이터를 삭제하지 않는다. commit/push/PR/Preview/Production 없음.
