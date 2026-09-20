# B2 C 연결 — 전체 checkpoint에 결합된 구조 편집

2026-09-05. [B2 계약](./k3b-section-order-contract-diff.md), [구간·순서 설계](./k3b-plan-section-order-design.md), [P2-C 정본](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md)과 현행 C 전체를 main이 읽고 작성했다. P의 독립 구조 API가 검증된 뒤 이 작은 연결을 구현한다. 사용자 HTML은 B1 FB17 검증본을 유지한다.

## 변경할 것과 유지할 것

- C version2/contract/key/envelope·기존 B1 API·기존 source editor registry는 유지한다. 새 `inspectSourceBoundPersonalPlanStructureContext(checkpoint, observation, options?)`와 `commit-source-bound-personal-plan-structure-context`만 추가한다.
- 새 dependency gate는 기존 P VERSION1/CONTRACTv1 ABI에 더해 STRUCTURE_DRAFT_VERSION2/METADATA_VERSION2/STRUCTURE_CONTRACTv2와 네 구조 API의 존재를 확인한다. v2 entry의 실제 검증은 P dual decoder가 수행한다. C가 임의로 새 metadata를 채우거나 삭제하지 않는다.
- 새 inspector는 exact data observation(Flow full ref, 실제 sourceRead, 관찰 epoch)과 현재/Undo/legacy provenance를 검증한다. 실제 P source reader→구조 inspector를 호출하고, genuine P 구조 token을 별도 WeakMap에 전체 checkpoint signature로 등록한다. token을 wrapper로 바꾸지 않으므로 E2의 captured draft 진단은 P API로 가능하지만 진단만으로 C 저장을 허용하지 않는다.
- 구조 action은 새 WeakMap 등록과 현재 전체 checkpoint signature가 일치할 때만 P 구조 planner로 전달한다. raw P token·B1 token·source read token·clone·다른사본 token은 권한이 아니다. C의 JSON-value binding과 E2의 exact stored bytes/epoch binding은 별개다.
- P candidate의 revision+1/정확한 전체 before Undo/timeline metadata 불변을 기존 finish 경로로 검증한다. legacyBaseRaw는 그대로 감싼다. current와 Undo v1/v2가 모두 유효해야 한다. 실패·같은값은 입력 checkpoint identity 그대로이며 쓰기0이다.
- raw flows/tasks/Step membership·실행일·완료·수동 timeline records·unknown fields는 유지한다. 개인순서는 별도 metadata의 complete full-ref 순열이다. C projectGroups를 새순서로 섞지 않는다. 실제 읽기 소비자는 후속 PD/UI gate에서 검토한다.

## 검증 gate

새 C 검사는 실제 M.makeHandoff→M.apply→C.fromLegacy fixture와 실제 P context를 사용한다. 정상 구간/순열 후보, no-op/reset, 소유 token 분리, stale current/Undo/legacy, source bytes/epoch/read-error, action/observation getter0, current/Undo 손상, v1→v2 명시 저장/Undo, 다른사본과 B1 호환을 각각 등록한다. 제품 API가 없으면 실패를 기록하고 skip이나 예상 예외 PASS로 바꾸지 않는다. E2 v4·S분류·D삭제·PD표시·브라우저는 이 C 검사에 포함되지 않는다.

이 연결은 저장 I/O·실제 사용자의 자료·운영 key/schema를 변경하지 않는다. 과거 source 순서 변경·새 membership·chain은 기존 gate를 유지하며 새 영구 정책을 정하지 않는다.
