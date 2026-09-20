# P3-C 실행 계획

## 1. 기준선·요구 확정

- P3-B 168개 primary 요구와 gap 14를 재확인한다.
- D2-023·D2-056을 각각 6개 E4 판정 단위로 분해하고 독립 실패 조건을 둔다.
- v4.1·개발1·개발2 정본과 clean StructureDraft P0.2 기준선을 대조한다.

## 2. versioned core

- P0.2 types/catalog/draft/validator/compiler/materialization/sidecar와 snapshot을 PoC-local로 가져온다.
- sidecar를 exact PoC prefix에 고정하고 corrupt/stale/write failure를 fail-closed한다.
- 6 positive·20 negative·19-rule·manifest hash 회귀를 연결한다.

## 3. 예시 registry·transition

- 기존 31-case corpus와 6 compiled StructureDraft fixture를 한 read-only registry로 만든다.
- 검색·필터·선택은 순수 projection으로, 적용은 blank-only 단일 editor transaction으로 만든다.
- same/nonblank/cancel/Escape/corrupt/unsupported/stale/failure를 mutation 0으로 검증한다.

## 4. React·독립 HTML UX

- 기존 작성 틀과 분리된 보조 `검증 예시` 탐색기를 연결한다.
- 모바일 목록→상세, 넓은 화면 split view, 검색 focus, keyboard selection, exact focus return을 구현한다.
- standalone은 동일 registry의 생성 snapshot을 single file에 포함하고 같은 transition/copy를 사용한다.

## 5. 검증·판정·보고

- focused tests, 개인공간 전체 suite, standalone suite, 관련 회귀, production build, `npm test`를 실행한다.
- 5 viewport에서 검색→preview→적용→결과→Undo/reload 및 zero-write 경계를 실제 조작한다.
- operating `flow:*` snapshot byte parity와 prefix allowlist를 확인한다.
- fresh E4 뒤에만 traceability와 집계를 승격하고 검증 보고서·handoff를 갱신한다.
