# P33 Cross-entry Canonical Alignment Tasks

## P33-01 Contract

- [x] P31/P32와 독립 P33 검토 자료를 대조한다.
- [x] AJD 24개/5개의 source/job 관계와 자동 병합 위험을 기록한다.
- [x] canonical identity와 alias registry를 구현한다.
- [x] unresolved candidate invariant와 write gate를 단위 테스트로 고정한다.
- [x] spec index와 tracking 문서에 active P33 gate를 반영한다.

## P33-02 Canonical Detail

- [x] AJD 24개 snapshot을 신규 canonical public snapshot으로 고정한다.
- [x] legacy map/public aliases를 canonical detail로 연결한다.
- [x] URL lookup 결과를 canonical public detail과 저장 경로로 연결한다.
- [x] Home/Find에서 같은 canonical card identity와 detail을 사용한다.

## P33-03 Artifact And Promise

- [x] moving/vehicle의 artifact 선택 false affordance를 제거한다.
- [x] Home promise, detail primary artifact, Find inventory를 맞춘다.
- [x] 선택한 artifact와 저장 receipt가 일치하는지 검증한다.

## P33-04 Storage

- [x] additive canonical storage metadata와 shadow-read adapter를 구현한다.
- [x] 기존 exact keys를 보존한 채 신규 canonical single-write를 활성화한다.
- [x] backup과 rollback fixture를 검증한다.

## P33-05 Reconciliation

- [x] legacy duplicate detector를 구현한다.
- [x] 자동 병합 없이 active copy 선택 UI를 제공한다.
- [x] 비활성 사본은 보관하고 복구 가능하게 유지한다.
- [x] 개인 값, run, occurrence, export identity 손실 0을 검증한다.

## P33-06 Downstream Parity

- [x] receipt, My Flow, Calendar, export에서 canonical title/count/identity를 검증한다.
- [x] raw RRULE을 사용자 문구로 변환한다.
- [x] catalog에서 legacy duplicate entry를 제거한다.

## P33-07 Final Gate

- [x] cross-entry invariant를 route, artifact, reconciliation, downstream parity 시나리오로 재실행한다.
- [x] 390/1024/1440 screenshot과 접근성 evidence를 생성한다.
- [x] docs, unit, build, targeted/full E2E를 통과한다.
- [x] STATUS, ROADMAP, DECISIONS, SERVICE_STRUCTURE와 evidence package를 갱신한다.
- [x] 실제 관찰 사용자 수 0을 명시한다.
- [x] commit/push/PR/merge/deploy는 별도 승인 상태로 보고한다.
