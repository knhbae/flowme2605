# Plan

## 실행 원칙

- 앱 runtime은 수정하지 않는다.
- 기존 handoff snapshot을 Phase 0 evidence로 사용한다.
- 화면보다 먼저 authoring contract와 소유권을 고정한다.
- 각 phase gate를 통과한 증거를 `qa.md`와 completion audit에 남긴다.

## Phase 0. Evidence freeze

작업:

- 기준 branch, baseline, evidenceKind를 기록한다.
- 여덟 사례의 실제 fixture/source 경로를 고정한다.
- runtime 24 Item과 corpus 27 Item 같은 version 차이를 명시한다.
- Claude Design이 로컬 경로 없이 읽을 handoff를 유지한다.

Gate:

- 여덟 사례 모두 evidence path가 있다.
- current contract, snapshot, prior artifact가 구분된다.
- invented content가 없다.

## Phase 1. Authoring contract

작업:

- 입력 문법, 구조 감지, 역할 보정, unsupported 경계를 정의한다.
- creator/personal/suggestion write path를 분리한다.
- state, interaction, data handoff를 정의한다.
- A/B/C 비교 지표를 구조화한다.

Gate:

- plain text, Markdown, table, URL mixed input이 설명된다.
- Item/detail/resource/guide 경계가 모호하지 않다.
- authoring이 canonical source를 덮어쓰지 않는다.

## Phase 2. Alternative wireflows

작업:

- A Markdown-first, B block/outline, C hybrid를 같은 화면 계약으로 비교한다.
- 390, 1024, 핵심 1440 화면을 작성한다.
- input에서 receipt와 recovery까지 연결한다.

Gate:

- 각 화면 primary action이 하나 이하다.
- 오류, 취소, undo, recovery가 있다.
- 최소 다섯 사례를 각 대안에 적용한다.

## Phase 3. Interactive prototype

작업:

- 여덟 사례 전환
- 직접 입력과 deterministic parsing
- mapping correction, Item editor, artifact preview
- personal/creator save, export, receipt
- round-trip, blocked, retry, recovery

Gate:

- 390x844, 1024x768, 1440x900에 가로 overflow가 없다.
- keyboard와 accessible name으로 핵심 여정을 완료할 수 있다.
- fixture simulation이 명시된다.

## Phase 4. Independent review

작업:

- 독립 UX 검토: 인지 부담, 모바일, A/B/C 비교
- 콘텐츠 fidelity 검토: 여덟 사례, source lineage, projection loss
- 접근성 검토: focus, role, name, error feedback
- Codex 기술 검토: 데이터 계약, migration, rollback

Gate:

- current fact, proposal, heuristic inference가 분리된다.
- 선택 근거가 취향이 아니라 여덟 사례의 행동 지표로 작성된다.

## Phase 5. Decision and handoff

작업:

- 최종 대안을 확정한다.
- 4~7개 구현 slice와 dependency를 작성한다.
- 첫 slice의 rollback, screenshot, unit/E2E marker를 지정한다.
- 실제 사용자 관찰 전에 닫을 correctness와 접근성 항목을 분리한다.

Gate:

- 사용자 약속이 한 문장으로 설명된다.
- migration 필요 여부가 결정된다.
- 개발 agent가 추가 해석 없이 첫 slice를 시작할 수 있다.

## 권장 실행 순서

```text
TA-01 deterministic authoring contract
-> TA-02 responsive hybrid shell
-> TA-03 mapping correction and contextual inspector
-> TA-04 artifact eligibility and loss preflight
-> TA-05 ownership, save/export, recovery
-> TA-06 regression and observed-user readiness gate
```

TA-01과 corpus fixture 정리는 순차 작업이다. TA-02의 visual shell과 TA-04의
projection eligibility 연구는 TA-01 계약 확정 후 병렬 진행할 수 있다.
