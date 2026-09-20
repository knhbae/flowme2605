# K2B-C3 저장 UI smoke 검증

2026-09-05. 신규 C3 UI 시험 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-c3-storage-ui.spec.ts`)의 최종 **16/16 PASS**를 확인했다. HTTP 격리 context는 45개이며, 45개 고유 테스트나 45명 사용자 검증을 뜻하지 않는다. 기간 정렬·5개 해상도·실기기는 별도 검증 범위다.

## 1. 실행 이력과 소스

| 실행 | 실행한 등록 테스트 | PASS / FAIL | context | 시간 | 원본 결과 |
| --- | ---: | --- | ---: | ---: | --- |
| 최초 | 16 | 8 / 8 | 33 | 175.522초 | initial JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-initial-2026-09-05.json`) |
| 하니스 정정 | 16 | 14 / 2 | 43 | 61.254초 | corrected JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-harness-corrected-2026-09-05.json`) |
| 최종 | 16 | 16 / 0 | 45 | 41.805초 | final JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-final-2026-09-05.json`) |

고유 등록 16개, 실제 등록 테스트 실행 48회다. 세 실행의 context 반복 합계 121개는 별도다. 모두 skipped 0, flaky 0이다. 세 실행 모두 제품 파일이 같은 상태였고, 하니스 정정 과정의 제품 수정은 0건이다.

- 메모리 생성 HTML: 1,135,778 bytes / SHA-256 `CF20F0F53B0DB46BDBF0137882CFF1FB5AC8B778ED310C017D16C3212ABE0483`
- app.js: `727015358E8428E819146D684C44E099870840499B41710706807EAB879F4C6F`
- model.js: `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`
- workspace-permanent-delete.js: `8005B2AA8F85E249F26533D77CF3AEED7520D117AE5D6874C80C3A40C18087A1`
- workspace-storage.js: `668EF7980ACFD4D3F6D36CB4D6C7B8DD1452002B61A0AB92995F83259E6A7866`

나머지 모듈 해시는 각 JSON의 `c3-boundary-*.json` 첨부 `sources`에 있다. `buildText()`를 메모리에서 만든 뒤 실제 앱 UI를 조작했다. 사용자에게 전달하는 디스크 HTML을 이번 검사 작업에서 생성·수정하지 않았다.

## 2. 최종 시나리오별 결과

| ID | 실제 검사한 행동 | context | 결과 |
| --- | --- | ---: | --- |
| C3UI01 | seed/legacy/checkpoint 부팅 0쓰기와 기존 Flow·권위 보존 | 3 | PASS |
| C3UI02 | Storage 객체 접근 불가만 임시 모드 사용, 실제 저장본 복사 0 | 1 | PASS |
| C3UI03 | core 4 key별 읽기 오류 gate·읽기 재확인·명시 read-only 열기 | 4 | PASS |
| C3UI04 | 새 payload 손상/미지원 버전, legacy bytes drift, dual/foreign journal 차단 | 5 | PASS |
| C3UI05 | draft/creator/source별 읽기 오류·손상에 해당 기능만 잠금, 정상 Quick 저장 | 6 | PASS |
| C3UI06 | Quick 추가·완료·날짜/폴더/메모 편집·Flow 변환·휴지통·복원·Undo·reload | 1 | PASS |
| C3UI07 | child 반영 0쓰기, dirty Escape 확인과 입력 보존, Plan root 저장 1회 | 1 | PASS |
| C3UI08 | E2 prepared/confirmed 복구 UI, 입력 보존·확정 후보 rollback 0 | 2 | PASS |
| C3UI09 | E0 prepared/confirmed 명시 복구, 이후 저장은 NEW/JOURNAL만 | 2 | PASS |
| C3UI10 | 실제 Quick 저장·cleanup 실패 → action gate → reload → 명시 복구 | 2 | PASS |
| C3UI11 | handoff NEW/DRAFT/cleanup 실패, 미확정 receipt 0, draft 복원·확정 Flow 보존 | 3 | PASS |
| C3UI12 | known handoff active/trash/source mismatch에서 draft 보존·0쓰기·잘못된 사본 열기 0 | 3 | PASS |
| C3UI13 | 초기화 취소·5 target별 중간 실패·confirmed cleanup·reload | 7 | PASS |
| C3UI14 | 영구 삭제 cleanup 완료 후에만 성공 1; 실패/새로고침 복구 0; 별도 명시 재작성·새 저장 | 2 | PASS |
| C3UI15 | action gate 중 draft/creator/source/template/Undo 및 stale dispatcher 쓰기 차단 | 1 | PASS |
| C3UI16 | 열린 form·지연 editor callback이 외부 checkpoint를 덮지 않음 | 2 | PASS |

UI15의 숨긴 probe 버튼·input 이벤트는 dispatcher 안전성 주입이며, 보이는 UI 행동을 사용자가 수행했다는 뜻이 아니다. UI14의 완전 삭제 후 원문을 새로 입력하고 명시 저장한 단계는 중복 no-op과 다르다. 삭제 tombstone을 추가하지 않았으며 UI12는 **이미 알려진 handoff 사본**만 검사한다.

## 3. 저장 경계와 구 key 쓰기 이유

최종 boundary 첨부 45개 모두 운영 sentinel key 1개의 전후 key/value와 SHA-256이 같다. 실사용자 profile이 아닌 자동화 context의 fixture다. 허용 fixed key 밖 `setItem/removeItem`, `clear`, console error, page error는 각각 0건이다. 외부 탭 변경을 모사한 native fixture 조작 2회는 제품 호출과 분리했다.

| key 역할 | 제품 API 시도 |
| --- | ---: |
| 새 workspace | 41 |
| 구 workspace | 9 |
| 작성 중 draft | 29 |
| creator library | 4 |
| source candidates | 2 |
| 새 journal | 101 |
| 구 journal | 2 |
| 합계 | 188 |

188은 실패·복구·정리 시도도 포함한 API 호출 수이며 성공한 사용자 변경 수가 아니다. 구 workspace 9회는 다음과 같다.

| 시나리오·중단 지점 | 구 key 호출 | 정확한 이유 |
| --- | --- | --- |
| UI09 E0 prepared | set 1 | 사용자가 명시한 구 편집 복구가 original before bytes를 복원 |
| UI13 OLD 제거 실패 | remove 1 | 승인된 5-target 초기화의 구 key 제거 시도. fault가 막아 값은 그대로 |
| UI13 DRAFT 제거 실패 | remove 1 + set 1 | 구 key 제거 후 뒤 target에서 중단. 명시 prepared 복구로 before bytes 재설정 |
| UI13 CREATOR 제거 실패 | remove 1 + set 1 | 같은 초기화·명시 복구 계약 |
| UI13 SOURCE 제거 실패 | remove 1 + set 1 | 같은 초기화·명시 복구 계약 |
| UI13 confirmed cleanup 실패 | remove 1 | 5 target 제거는 확정. reload 뒤 journal만 명시 정리하며 구 target rollback 0 |

구 journal 2회는 UI09 prepared/confirmed 각각의 명시 정리 `removeItem`이다. 일반 변경의 legacy raw/archive exact 보존과 E0 복구 후 NEW/JOURNAL만 쓰는 것은 별도 assertion으로 확인했다. UI14 fixture의 삭제 대상은 새 workspace에만 있어 구 key 변경은 0이었다. 삭제 대상이 구 snapshot에도 있는 경우의 구 key scrub은 삭제 adapter 8개 결과 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/delete-browser-final-2026-09-05.json`)에 따로 있다.

## 4. 초기 실패와 화면 캡처의 의미

최초 FAIL 8개는 하니스 문제였다: 빈 진단 span 대신 실제 임시 모드 안내를 검사해야 하는 경우 1개, 닫힌 native dialog가 form DOM을 제거한다고 가정한 경우 2개, E0 fixture의 필수 `validateEnvelope` 누락 1개, 데스크톱에서 숨겨진 모바일 결과 버튼을 기다린 경우 4개다.

둘째 실행의 FAIL 2개는 textarea CRLF→LF 처리와 기대값의 차이였다. 보관 draft의 exact bytes 비교는 유지했고, 미변경 화면은 전후 `inputValue`, 새 명시 입력은 실제 입력→draft→Flow의 동일 문자열로 정정했다.

아래 PNG는 **실패 조사 당시 화면**이며 최종 시각 품질 PASS 증거가 아니다.

- 중복 active 사본 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-harness-corrected-2026-09-05/personal-workspace-k2b-c3--f922b-d-existing-copy-never-opens/c3-failure-active.png`)
- 휴지통 사본 저장 거절·입력 보존 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-harness-corrected-2026-09-05/personal-workspace-k2b-c3--f922b-d-existing-copy-never-opens/c3-failure-trash.png`)
- 완전 삭제 후 새 명시 저장 화면 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-harness-corrected-2026-09-05/personal-workspace-k2b-c3--ea9af-s-not-a-duplicate-tombstone/c3-failure-normal.png`)

최종 실행은 실패 시 캡처 설정이어서 새 PNG가 없다. 최종 각 context의 내용·dialog·상태·성공 수는 boundary 첨부 `visibleState`로 남겼다. DOM 텍스트를 전체 화면 시각 검사로 대체하지 않는다.

## 5. 미포함 범위

이 smoke는 C3 설계 모든 원자 조건의 완료가 아니다. 저장 중 실제 Back·빠른 연속 클릭 전체 조합, 자정/long-press·기간 reorder, 5개 viewport, 두 생성 HTML 직접 열기와 전체 시각 검사는 별도다. 실제 Android Chrome/iOS Safari·실제 IME·보조기기 검사는 NOT_RUN, 관찰 사용자 0명이다. 전체 npm/build·기존 회귀의 결과는 root 원장에서 별도 판정한다. commit·push·PR·Preview·Production은 실행하지 않았다.
