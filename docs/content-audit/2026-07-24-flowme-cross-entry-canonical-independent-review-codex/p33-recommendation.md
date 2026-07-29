# P33 recommendation

## 결정

**B. canonical registry + role-specific shell, one save identity**

Home은 사용 예시, Find는 탐색, URL lookup은 source 해석이라는 역할을 유지한다. 역할은 달라도 같은 source/job/variant는 같은 `canonicalFlowId`, content snapshot, save identity로 이어져야 한다. P32 focused My Flow, Calendar, run/occurrence/export 계약은 다시 쓰지 않는다.

## 실행 순서

### P33-01 Canonical registry와 invariant gate

- 문제: 같은 source/job을 가리키는 route와 save identity를 판정할 공통 계약이 없다.
- current evidence: H1, H2, cross-entry-invariant-matrix.json
- dependency: 없음
- 범위: canonicalFlowId schema; source+job+variant registry; alias resolver; read-only invariant tests
- 비범위: legacy record migration; Home/Find IA 변경; UI redesign
- data impact: additive metadata only; current writes unchanged
- migration: none in this slice
- rollback: remove resolver feature flag; legacy resolution remains
- acceptance screenshot: AJD alias diagnostic report; no production visual change required
- test marker: `P33-CANONICAL-REGISTRY`, `P33-CROSS-ENTRY-INVARIANT`

### P33-02 AJD moving canonical vertical slice

- 문제: 24개와 5개 중 어떤 content snapshot이 canonical인지 제품이 정하지 않았다.
- current evidence: H1, P1-S3, P3-S3
- dependency: P33-01
- 범위: editorial 24-vs-5 decision; canonical detail projection; Home/Find/URL/alias resolution; intentional variant label if both retained
- 비범위: 모든 source 일괄 migration; P32 My Flow rewrite
- data impact: alias metadata; content snapshot/version selection
- migration: no destructive write; legacy IDs remain aliases
- rollback: route resolver feature flag restores old routes
- acceptance screenshot: 390 Home->detail; 390 Find->same detail; 390 URL hit->same detail; 1024 canonical detail
- test marker: `P33-AJD-ONE-FLOW`, `P33-AJD-COUNT-PARITY`

### P33-03 Artifact control과 entry promise correctness

- 문제: moving/vehicle의 visible result control이 동작하지 않고 vehicle promise가 target과 다르다.
- current evidence: H4, H5, H6
- dependency: P33-01
- 범위: eligibility-driven artifact handler; unsupported control 숨김; Home vehicle copy/target 정합; Find canonical inventory inclusion
- 비범위: 새 artifact 종류; 가짜 사용량/리뷰; Calendar IA 변경
- data impact: selected artifact field only; no migration
- migration: none
- rollback: restore prior eligible shape list
- acceptance screenshot: 390 moving Checklist selected; 390 vehicle promise/detail parity; 390 Find vehicle search
- test marker: `P33-ARTIFACT-CONTROL`, `P33-ENTRY-PROMISE-PARITY`

### P33-04 Canonical save identity dual-read/single-write

- 문제: slug별 저장이 같은 user Flow를 여러 object로 만든다.
- current evidence: H2, alias-storage-impact.json
- dependency: P33-01, P33-02
- 범위: canonical saved record; legacyOriginIds; dual-read; feature-gated canonical write; backup
- 비범위: duplicate auto-merge; legacy key delete; account/DB
- data impact: new canonical key and alias index; old keys retained
- migration: single unambiguous record만 backup 후 adopt
- rollback: read legacy keys using feature flag and backup
- acceptance screenshot: same saved signal on Home/Find/URL; one My Flow row for new saves
- test marker: `P33-CANONICAL-SAVE-ID`, `P33-LEGACY-DUAL-READ`

### P33-05 Legacy duplicate reconciliation

- 문제: 이미 존재하는 24개/5개 기록을 안전하게 자동 병합할 수 없다.
- current evidence: P4-S1, P4-S2, P4-S3
- dependency: P33-04
- 범위: duplicate detection; active copy selection; difference summary; other copy archive; personal/run/export preservation
- 비범위: title similarity auto-merge; history deletion; cross-device sync
- data impact: reconciliation decision record and archived legacy reference
- migration: explicit user choice for cardinality mismatch
- rollback: restore archived legacy records and prior active pointer
- acceptance screenshot: 390 duplicate decision sheet; 1024 side-by-side count/state summary; restored legacy copy
- test marker: `P33-DUPLICATE-RECONCILE`, `P33-NO-AUTO-MERGE`

### P33-06 Receipt, My Flow, Calendar, export parity

- 문제: upstream receipt grammar와 downstream identity가 entry별로 다르고 raw recurrence가 노출된다.
- current evidence: H3, H7, P6-S2
- dependency: P33-04
- 범위: shared receipt anatomy; canonical count/title parity; Calendar scope identity; export identity; human-readable recurrence adapter
- 비범위: P32 focused workspace rewrite; new export formats
- data impact: display projection and canonical reference; run/occurrence IDs preserved
- migration: none beyond P33-04 alias reference
- rollback: legacy receipt adapter remains behind feature flag
- acceptance screenshot: 390 public/map receipt parity; 1024 My Flow/Calendar same title/count; human-readable routine summary
- test marker: `P33-RECEIPT-PARITY`, `P33-DOWNSTREAM-IDENTITY`, `P33-RRULE-DISPLAY`

### P33-07 Regression and final independent gate

- 문제: 기존 tests가 각 route를 독립 검증해 cross-entry invariant를 놓쳤다.
- current evidence: current targeted E2E 15/15, absence of same-source invariant test
- dependency: P33-02, P33-03, P33-04, P33-05, P33-06
- 범위: 24-cell rerun; 390/1024/1440 screenshots; cross-entry golden tests; storage migration rollback test; accessibility scan
- 비범위: observed-user validation claim; new feature scope
- data impact: test fixtures only
- migration: backup/rollback rehearsal
- rollback: release gate blocks canonical write flag
- acceptance screenshot: Home/Find/URL same Flow; one new-save My Flow object; legacy duplicate preserved/reconciled; Calendar/export parity
- test marker: `P33-FINAL-CROSS-ENTRY-GATE`, `P33-24-CELL`, `P33-ROLLBACK-REHEARSAL`


## 구현 경계

1. P33-01은 read-only registry와 invariant test부터 시작한다.
2. P33-02에서 AJD 24개/5개 중 canonical content를 editorially 결정한다.
3. 새 save identity는 P33-04 이전에 쓰지 않는다.
4. 기존 24개/5개 record는 자동 병합하지 않는다.
5. reconciliation은 active copy 선택과 archived legacy 보존을 기본으로 한다.
6. source, personal overlay, run, occurrence, export identity는 각각 보존한다.
7. feature flag와 backup으로 legacy read path로 되돌릴 수 있어야 한다.

## 실제 사용자에게만 확인할 질문

1. 같은 AJD 원문에서 24개 전체판과 5개 핵심판을 서로 다른 Flow로 인식하는가?
2. 중복 후보가 발견되면 대표본 선택, 둘 다 유지, 하나 숨기기 중 무엇을 기대하는가?
3. Home의 사용 예시와 Find의 catalog가 각각 어떤 역할이라고 이해되는가?
4. Calendar/Checklist result control을 destination 선택으로 이해하는가?
5. 날짜 예시와 날짜 없이 시작을 동시에 볼 때 실제 저장 결과를 올바르게 예측하는가?

이 질문은 자동화로 답하지 않는다. 현재 observed-user count는 0이다.
