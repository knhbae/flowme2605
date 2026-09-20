# K1-A 원문 도움 안전성 구현 계약

근거: [실행 계획 §3](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#3-k1-a--원문-도움의-정확한-대상과-실패-복구), [개선 설계](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md). 요구 D2-039/040, finding P3K-D2-01/03/04, 재현 K-X1/K-X3. 2026-09-05 현재 두 runtime의 해당 도움 경로만 수정한다.

## 원본 → 현재 실패 → 개선

| 원본 계약 | 수정 전 확인 | 이번 동작 |
|---|---|---|
| 도움을 연 항목에만 명시 적용 | React에서 첫 항목 앞에 항목을 삽입한 뒤 적용하면 새 항목에 장소가 붙음 | open 시 문서·editor·source epoch·정확 원문·대상 ticket 고정. 변경/ABA 뒤 자동 추정 금지 |
| 실패·stale는 원문 변경 0 | React quota 주입에서 원문은 바뀌고 durable draft는 이전 bytes | native 편집 전에 정확 draft 저장/읽기 검증. 실패 시 source·native history 건드리지 않음 |
| 원문 수정 한 번, native Undo 한 번 | 실패 복구를 editor remount로 처리하면 이전 history까지 소실 가능 | helper 전용 transaction에서 중복 autosave를 억제. 성공만 native replacement 한 번 |
| 사용자가 복구 가능 | 입력값이 사라지거나 성공 문구가 오류를 덮는 경로 | 임시 값 유지, 재시도 또는 명시 대상 재선택. 복구 불확실 시 편집/추가 적용 잠금 |

수정 전 증거는 `output/poc-gap-implementation/k1a/before-stale.json`과 `before-draft-failure.json`이다. 구 production build에서 실행했으며 신규 코드 검증과 구분한다.

## 저장·native transaction

1. ticket과 현재 source/epoch/editor/document를 검사한다. stale, canceled, composing Enter, noop은 보관 호출도 하지 않는다.
2. 현재 draft bytes를 읽는다. 읽기 자체가 실패하면 기존 값을 추측하거나 삭제하지 않는다.
3. 변경 intent의 draft를 저장하고 exact readback을 확인한다. 초기 bytes CAS 불일치는 다른 intent를 덮지 않고 실패한다.
4. durable 검증 후 기존 native editor transaction 한 번을 적용한다. 그 transaction의 input autosave만 억제한다.
5. native 적용 실패는 방금 저장한 candidate bytes와 일치할 때만 직전 bytes로 복구하고 다시 확인한다. 다른 bytes가 있으면 덮지 않는다.
6. before/after write throw, readback 불일치는 마지막 성공 bytes로 복구를 시도한다. 이미 이전 bytes이면 불필요한 재쓰기를 하지 않는다. 복구 검증 실패를 성공으로 보고하지 않는다.

도움 외 일반 타이핑의 보관 정책·운영 schema는 바꾸지 않는다. 같은 transaction 결함이 있는 기존 구조 도움은 coordinator를 재사용할 수 있으나 새 구조 기능과 네 그룹 UI는 K3-A다.

## 상태와 사용자 행동

| 상태 | 원문/보관 | 사용자에게 표시 | 다음 행동 |
|---|---|---|---|
| ready | 변경 전 | 정확 대상 제목·속성명 | 입력·적용·취소 |
| stale | helper mutation 0 | 원문이 바뀌어 적용할 항목을 다시 확인해야 해요 | 값을 유지한 채 항목 다시 선택 → caret 지정 → 이 항목 선택 |
| applying | 검증된 intent 하나 | 중복 적용 잠금 | 결과 대기 |
| failed | 원문 불변, 이전 bytes 확인 | 보관하지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요 | 같은 입력 재시도·취소 |
| recovery-required | 확인되지 않은 보관 상태 | 복구 상태를 확인하지 못했어요 | source/추가 적용 잠금. 자동 reload·reset·다른 문서 저장 금지 |
| success | exact 저장 + native 적용 | 항목 정보를 원문에 반영하고 이 기기에 보관했어요 | native Undo/Redo, reload |
| noop/canceled | mutation 0 | 성공 영수증을 새로 만들지 않음 | 편집 복귀 |

## 검증과 판정 제한

두 runtime의 target stale/ABA/문서 변경, 같은 값/취소/Escape/빠른 중복, 합성 composing Enter, 오류별 exact rollback, 명시 retry, native Undo/Redo와 reload를 고정한다. 테스트 내부의 fault 주입용 write와 실제 제품 write를 구분하며 write 시도 횟수를 성공 transaction 수로 세지 않는다.

### 현재 HTML 지문 연결

첫 전체 시험에서 P3-H1 host 9개가 구 후보 927,767 bytes와 새 HTML 지문 불일치로 실패했다. [P3-J 인계의 현재 candidate 핀 계약](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/handoff.md)에 따라 현재 후보 설정 5곳의 bytes/SHA만 갱신한다. 불일치 차단을 완화하지 않는다. 과거 QA·NOT_RUN·manifest·P3-G/P3-I 지문·released history는 수정하지 않는다. 새 후보는 새 자동 검증 근거이며 실제 기기 실행 증거를 승계하지 않는다.

390×844, 375×812, 844×390, 1024×768, 1440×900에서 긴 제목/값/오류문·CTA·초점·스크롤을 확인한다. 화면 캡처를 직접 읽고 자동 overflow 결과와 별도로 평가한다. 실제 Android/iOS/IME/보조기술은 미실행이면 NOT_RUN, 관찰 사용자 0명이다. 이번 검증으로 D2 전체 UX나 세 산출물 전체 충족을 주장하지 않는다.
