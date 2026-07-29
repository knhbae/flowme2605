# Tasks

## Design completion

- [x] Phase 0 handoff와 evidence snapshot 준비
- [x] 최종 UX 대안 선택
- [x] authoring grammar와 unsupported 경계 정의
- [x] surface ownership과 state model 정의
- [x] 여덟 사례 mapping 계약 작성
- [x] A/B/C wireflow HTML 제작 및 브라우저 검증
- [x] interactive prototype HTML 제작 및 브라우저 검증
- [x] 독립 UX, 콘텐츠 fidelity, 접근성 검토 통합
- [x] docs check, JSON parse, diff check
- [x] requirement-by-requirement completion audit

## Implementation backlog

### TA-01 Deterministic authoring contract

문제:
현재 입력 UX에는 자유 텍스트와 canonical 구조 사이의 저장 가능한 중간 계약이 없다.

범위:

- `TextAuthoringDocument`, block, mapping, issue, revision 계약
- 제주 메모와 이사 Markdown deterministic parser adapter
- 원문 fragment lineage
- split/merge/reorder의 stable ID와 undo

비범위:

- AI/provider
- app navigation 변경
- server persistence

완료:

- 같은 원문은 같은 fixture version에서 같은 mapping을 만든다.
- parser가 모르는 문장은 원문과 issue에 남는다.
- canonical source는 수정되지 않는다.

### TA-02 Responsive hybrid shell

범위:

- mobile Input/Structure/Result 단계
- 1024 two-pane + drawer
- 1440 source/outline/artifact 3-pane
- draft recovery banner와 focus restoration

완료:

- 390px horizontal overflow 0
- 첫 preview 전 competing primary action 1개 이하
- keyboard로 세 단계 이동 가능

### TA-03 Mapping correction and contextual inspector

범위:

- merge, split, indent/outdent, reorder
- Item/resource/guide 역할
- title/detail/completion
- progressive property inspector

완료:

- correction마다 undo 가능
- source fragment가 사라지지 않음
- mobile에서 full editor를 강제하지 않음

### TA-04 Artifact eligibility and loss preflight

범위:

- primary 1개, secondary 최대 2개
- Calendar/Todo/Sheet/Memo eligibility
- projection count와 loss 설명
- date-less Item의 Calendar 제외

완료:

- 의미 없는 artifact가 노출되지 않음
- K-MOOC 14행과 LibriVox 38장이 유지됨
- export 전 포함/누락 정보가 예측 가능

### TA-05 Ownership, save/export, recovery

범위:

- personal draft와 creator draft 분기
- correction suggestion
- save/export receipt
- source updated와 unsaved draft recovery
- Markdown round-trip

완료:

- 저장 대상과 소유자가 명확함
- reload 후 draft 복구 가능
- 공개 원본이 개인 수정으로 덮어써지지 않음

### TA-06 Final gate

범위:

- 여덟 사례 unit fixture
- 390/1024/1440 E2E
- keyboard, accessible name, focus, errors
- projection parity와 round-trip regression

완료:

- 자동 QA와 관찰 사용자 증거가 분리됨
- 실제 사용자 관찰 전에 correctness blocker 0
- rollback marker와 screenshot set 준비
