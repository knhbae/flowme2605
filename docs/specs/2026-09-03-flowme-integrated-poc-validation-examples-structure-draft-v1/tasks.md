# P3-C 작업표

## 요구·설계

- [x] P3-B 기준선과 두 부모 요구 재확인
- [x] D2-023·D2-056 원자 E4 판정과 독립 실패 조건 정의
- [x] 세 결과물 보존 범위와 blank-only UX 결정
- [x] 검증 예시 registry와 StructureDraft sidecar/version 계약 고정

## 구현

- [x] P0.2 StructureDraft core·snapshot PoC-local 포트
- [x] PoC-prefix sidecar와 fail-closed storage adapter
- [x] 31+6 read-only registry와 blank-only transaction
- [x] React 검증 예시 탐색·preview·적용·Undo/reload
- [x] standalone 동등 UX와 deterministic single-file 생성

## 검증·보고

- [x] positive 6·negative 20·rule 19·manifest hash 테스트 — P3-C core assets 78/78
- [x] D2-023/056 focused unit/component/cross-surface 테스트 — surface 22/22, ProductUx 6/6, parity 18/18
- [x] React·standalone 브라우저 시나리오와 5 viewport — production browser 62/62(기존 48 + P3-C 14), standalone 82/82
- [x] no-op·cancel·Escape·corrupt·stale·failure mutation 0
- [x] 운영 `flow:*` byte 불변과 prefix allowlist — prefix 밖 write/remove/clear 0, non-PoC `flow:*` bytes 동일
- [x] 개인공간 PoC suite, 기존 회귀, `npm test`, production build — build 18/18, `npm test` 1809/1810 및 중단 뒤 tail 220/220; 실패 1건은 아래 기록한 기존 날짜 의존 fixture
- [x] traceability·보고서·QA·handoff와 목표 집계 갱신 — `133 충족 / 8 부분 / 4 미충족 / 11 의도적 변경 / 12 제외`, primary gap 12

## 범위 밖

- [ ] 실제 Android Chrome — 미실행
- [ ] 실제 iOS Safari — 미실행
- [ ] screen reader·실제 200% 확대 — 미실행
- [ ] 관찰 사용자 검증 — 미실행, 0명
- [ ] commit·push·PR·Preview·Production — 미진행

## 알려진 전체 회귀 결과

- `npm test`: 1809/1810 통과
- 유일한 실패: `dog-adoption-first-week:review_due:2026-06-04`
- 원인: 서울 날짜 2026-09-04 기준 `source_checked_at=2026-06-04`가 92일 전이 되어 기존 90일 freshness gate에서 `current`가 아니라 `review_due`로 바뀜
- P3-C 코드·fixture와의 인과: 없음
- 중단 뒤 별도 실행한 tail: 220/220 통과
