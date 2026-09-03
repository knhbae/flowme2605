# 단계 5 계약 — 고급 fidelity의 보존·보류 경계

- 상태: `BOUNDARY_CLOSED_FEATURES_DEFERRED`
- 작성일: 2026-09-02
- 대상: `A10`
- 근거 결정: `a0-decision-record.md`의 A0-5

## 1. 단계 결론

단계 5는 recurrence runtime, 공개 후보·S3 version, table/source 양방향 update를 이번
통합 PoC에 구현하는 단계가 아니다. 세 기능은 identity, 충돌, 권한, rollback 정책이
승인되지 않았고 최초 범위에서도 제외됐다. 따라서 안전한 완료 기준은 기능을 추정해
붙이는 것이 아니라 원문과 lineage를 보존하고, 손실 가능 payload를 commit 전에
fail-closed하며, 미구현을 사용자와 보고서에 드러내는 것이다.

## 2. 항목별 판정

| 후보 | 이번 단계 판정 | 현재 보장 | 다시 여는 조건 |
| --- | --- | --- | --- |
| recurrence·occurrence 이동 | 후속 보류 | recurrence/time/timezone 원문 보존, materialization 차단, 가짜 occurrence ID 0 | canonical occurrence identity와 개별 완료 owner 승인 |
| 공개 후보·immutable version·S3 | 제외 | public writer·후보 UI·버전 update 0 | immutable public version, 개인 사본, 역류 금지, 권한 owner 승인 |
| table/source 양방향 update | 후속 보류 | Markdown/TSV/보수적 CSV의 exact block 인식과 원문 보존, source row mutation 0 | row identity, conflict, add/delete, rollback 정책 승인 |
| QuickItem→Flow 변환 | 후속 보류 | QuickItem kind와 ref를 그대로 보존 | 새 Flow identity, 원 QuickItem 존치, receipt·Undo 계약 승인 |
| 장기 CreatorDraft 관리 | 후속 보류 | 작성 중 draft와 명시 handoff만 PoC namespace에 존재 | 목록·검색·복제·보관·재진입 제품 범위 승인 |
| narrow near-miss correction | 제한 지원 | 지원 가능한 root checkbox만 명시 correction 후보, 자동 수정 0 | 현재 P0 helper 범위를 넘기는 grammar는 별도 승인 |

## 3. 현재 허용·금지

허용한다.

- exact `rawText`, line byte range, source lineage, fidelity manifest 보존
- unsupported material category와 loss field 표시
- 지원 가능한 좁은 near-miss에 대한 명시적 사용자 action
- 손실 없는 TXT/raw fallback과 날짜 미정 선택
- stale/tampered manifest, unknown field, unsupported grammar의 무저장 차단

금지한다.

- 반복 정보를 단일 일정으로 평탄화하고 완료로 표현
- occurrence identity 추정
- 공개 writer, 공개 후보, version update 또는 권한 기능 노출
- source row/table cell mutation과 결과 화면에서 source로의 역편집
- QuickItem을 암묵적으로 Flow로 승격
- unknown·nested·time/timezone·table material을 조용히 버리고 저장

## 4. 검증 증거

최신 focused suite는 다음 경계를 직접 검사한다.

- recurrence, recurrence end, time, time zone은 preserved-but-blocked다.
- Markdown, TSV, conservative CSV block shape는 exact source 범위로 인식된다.
- single-comma prose와 property value는 table로 오인하지 않는다.
- unknown property, nested checklist, fenced code, unsupported material은 silent drop 없이
  차단된다.
- fidelity manifest의 stale source와 altered decision은 실패한다.
- public editor role은 writer를 호출하지 않는다.
- blocked, unconfirmed, unaccepted-loss, stale, collision 경로는 state mutation 0이다.

이 증거는 31개 후보 fixture 전체를 제품 기능으로 채택·재생했다는 뜻이 아니다. 채택되지
않은 P1 후보는 `미구현 결함`이 아니라 `승인 전 보류`로, 원 요구의 충족 판정은 부분 또는
제외로 유지한다.

## 5. 단계 Exit gate

- [x] A0-5의 제외·보류 결정과 다시 여는 조건을 항목별로 기록했다.
- [x] unsupported material은 exact source/lineage를 보존하거나 commit 전에 차단한다.
- [x] recurrence/public/table/source 기능을 지원하는 것처럼 노출하지 않는다.
- [x] operating writer와 source mutation을 추가하지 않았다.
- [x] 채택하지 않은 31-fixture/P1 전체 replay를 완료 증거로 표현하지 않는다.
- [ ] 향후 제품 결정이 열리면 각 slice를 독립 목표·adapter·검증으로 다시 계획한다.
