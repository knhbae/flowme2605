# 반복 사본의 실제 저장·시작일·문서 참조 대조

2026-09-14 · 실제 사본 저장·시작일·문서 참조·회차 실행을 빌드 `U3OrObQx2hjVrlUKKakYU`에서 확인했다. [저장 계약](public-copy-storage-design.md), [전체 범위](spec.md). 공개 계약 fixture에서 시작했으며 사용자의 반복 공개부터 시작하는 전체 경로는 아직 완료가 아니다.

## 요구와 현재 동작

| 요구 | 현재 연결 | 검증과 잔여 |
| --- | --- | --- |
| 실제 개인 사본 저장 | strict 공개 판본 fixture → 실제 import → 한 Program controller/store | 일반 항목과 반복 혼합·원본/다른 actor 불변·실제 거래 검사. fixture를 사용자의 공개 성공으로 세지 않음 |
| 시작일 미정 | 정의는 pending으로 남기고 다른 반복은 조회. 문서/기간/출력에 안내 | 임의 오늘0·명시 시작/미정 전환·기존 기록 보존 검사. 브라우저 입력/취소/Escape/실패 재시도/같은 값 저장0 확인 |
| 여러 문서 참조 | sidecar의 정확 item/document/line → 같은 회차. 참조 추가/해제 UI | 두 참조 문서와 원래 사본에서 같은 완료/날짜 확인. 중복0·선택 참조 해제·Undo/reload·원본/다른 문서 보존 |
| 기준일·개인 반복 계획 | 상대 시작 preview/commit, 실제 가져온 owner의 전체/이후 계획 거래 | 공통/고정/미정과 이전 기록 분리. 기존 별도 개인 계획의 시작/기준일 재설정은 아직 범위 선택 연결이 필요해 거절 |
| 회차 기록·출력 복귀 | 실제 완료/날짜 이동 → 선택 출력 reader → 고정판본 exact return | controller Undo/Redo/reload 검사. 브라우저 완료/재열기/날짜·일/주/월·두 Undo/reload. 실제 파일 출력/복귀는 다음 D/E |
| 실패/취소/입력 복구 | expectedSpace·중복 요청·quota/CAS·입력 잠금·외부 snapshot 보호 | 저장 전 실패는 성공 변경0. 시작일 입력 중 닫기/이동/다른 actor를 보호하며 임의 자동 저장하지 않음 |

## 재현해서 고친 문제

실제 mixed import 검사가 `limit`으로 실패했다. 이전 모델 fixture에서 반복 header를 v11의 `itemScopes`에 넣었으나 그 목록은 실제 파싱된 Item만 허용한다. 새로운 실행 owner를 만들지 않고 공개 사본의 정확 문서/Item 참조를 사용하도록 수정했다. 원 v11 validator/vendor를 완화하지 않았다. 기존 model fixture도 같은 유효한 계약으로 보정했다.

시작 미정 한 항목 때문에 사본 전체 reader가 실패하던 동작은 별도 `pendingStarts`로 바꾸었다. 다른 정의의 회차는 계속 읽고, 미정 정의 자체를 날짜 미정 할 일로 만들지 않는다.

## 검증 기록

- 보관된 원래 사본에서 새 참조를 만들던 문제와 반복 공개 제한 아래 제안 채택의 `null.id` 예외도 회귀에서 재현·수정했다. 저장 없이 거절하고 제안 보류는 유지한다. 반복 제안 기능 충족은 아니다.
- 최종 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T19-19-08-908Z.json`):144파일,1,356실행/1,356통과·실패/skip0·소스 변경0. 앞선1,354검사 중5실패는 저장 유효성과 공개 허용을 동일시하던 단언이었다. 두 조건을 각각 확인하도록 바꾸고 실제 공개 거절 검사는 유지했다.
- strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T19-18-47-351Z.json`)330/진단0·production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T19-27-28-955Z.json`)통과. npm (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T19-26-41-308Z.json`)2,031실행/2,030통과/기존 출처기한1실패(9콘텐츠), 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T19-29-12-406Z.json`)201/201·공개 표면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T19-29-24-624Z.json`)19/19통과. 보안 audit는 재실행하지 않았다.
- 기록 대조22 (로컬 전용 근거: `../../../output/integrated-product-poc/public-copy-c3-crosscheck-2026-09-13T19-41-35-884Z.json`):검사/빌드/현재359소스 동일, 아래6실행판 일치·실제 저장 decoder/validator 통과·원문/공개/다른 인물 보존. 새 브라우저 검사나 요구 충족률이 아니다.
- 실기기·OS IME·보조기술·외부 계정·관찰 사용자 검증은 미실행이다.

## 같은 자료의 브라우저 시나리오

`program-public-copy-c3-review`는 새 검증 프로필이다. 실제 모델로 만든 사본과 공개 계약 fixture를 처음 한 번만 넣고 이후 화면의 거래만 사용했다. 기존 프로필을 초기화하지 않았다. 원래 공개 writer를 통한 반복 공개는 아직 제한한다.

| 순서·근거 | 실제 확인 | 판정 |
| --- | --- | --- |
| 시작일9 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-storage-interactions-2026-09-13T19-30-32-772Z.json`) | 고정8회차·미정 안내·입력/취소/Escape·닫기 보호·quota 실패/재시도·동일 값0 | 해당 행동 통과, 이후 참조 selector 오류 |
| 참조7 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-reference-resume-2026-09-13T19-32-43-803Z.json`) | 추가1·중복0·선택 해제1·기존 메모/참조 보존 | 해당 행동 통과, native 날짜 입력 내부 Tab 구간에 대한 검사 가정 오류 |
| 화면·복구25 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-finish-2026-09-13T19-34-33-003Z.json`) | 같은 미저장 입력·5크기/3컨트롤/실제Tab·Escape0·참조Undo/reload | 완료 |
| 실행3 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-execution-2026-09-13T19-37-00-609Z.json`) | 원래 사본의 완료1·첫 참조의 같은 완료 | 해당 행동 통과, 숨긴 다른 문서 DOM까지 세는 검사 오류 |
| 같은 실행11 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-execution-resume-2026-09-13T19-38-14-496Z.json`) | 두 번째 참조의8회차·재열기·날짜 취소/이동·조회일 단일target·주간4/월간16·문서 복귀 | 해당 행동 통과, 크기 전환 직후 교체된 요소로 스크롤하는 자동화 중단 |
| 실행 복구7 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-execution-finish-2026-09-13T19-39-45-334Z.json`) | 같은 완료/이동→완료Undo→날짜Undo→reload·원문/공개/다른 인물 불변 | 완료 |

중간9/7/3/11과 완료25/7은 겹치는 확인점이며 요구 충족률로 합산하지 않는다. 중단된 입력과 자료를 유지해 최종 revision10, 원래 날짜의 열린 회차1개·문서 참조3개를 남겼다. 여섯 기록 모두 console/page error0·허용 prefix 밖 저장 호출0이다. 브라우저 운영 보호키는0개이며 운영 값이 채워진 모델 저장 검사와 구분한다.

## 화면 평가

375×812·390×844·844×390·1024×768·1440×900의 시작일 입력/저장/취소15측정에서 가로 넘침0·viewport 이탈0·hit-test 실패0이다. native date 내부 구간을 실제 Tab으로 통과했다. 375 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-finish-input-375-1789328074417.png`), 844 가로 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-finish-input-844-1789328074863.png`), 1024 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-finish-input-1024-1789328075091.png`), 같은 회차 완료/날짜 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-execution-final-reference-1024-1789328386557.png`)를 직접 보았다.

낮은 평가: 인지 부담3/5(설정·참조가 길고 처음 화면 밖 행동이 있음), 외부 도구 연결2/5(이 반복 사본의 실제 파일/복귀 미검증). 핵심 입력은 조작 가능하지만 전체 긴 화면·이중 스크롤·모든 메뉴의 검증은 아니다. 기존 디자인 계열을 사용했고 Figma는 사용하지 않았다. 사용자 선호·완료 시간을 추정하지 않는다.

## 다음 연결과 완료 경계

공개 상세의 반복 표시/개인화, 원본 필드 비교/선택 수용, 반복 제안, 공개 TXT/CSV/ICS consumer와 실제 공개→사본→실행→출력→원본 수용→Undo/reload가 남는다. 일반 항목용 `currentField`/하위 체크 writer를 반복 metadata에 그대로 적용하지 않는다. 기존 개인 계획 이후 시작일/기준일 재설정은 범위 선택 연결 전까지 거절한다. 제안 채택의 안전한 거절은 반복 제안 기능 충족이 아니다.

## 변경 파일과 보호

C3 제품 파일: `contract.ts`, `program-data.ts`, `private-space.ts`, `public-copy-recurrence.ts`, `recurrence-bridge.ts`, `recurrence-state.ts`, `recurrence-target.ts`, `private-output-occurrences.ts`, `publication.ts`; 화면 `ProgramApp`, `ProgramCopyInspector`/CSS, `ProgramPublisher`, `ProgramRecurrence`, `ProgramSpace`. 신규 `public-copy-storage.test.ts`와 기존 공개 계약/계획/설정/공개 UI 검사를 함께 검증했다. 이번 후속 실행에서는 fixture·브라우저/기록 대조 스크립트와 원장·현재 판정·보고서를 수정했고 전체 검사 이후 제품359소스는 동일하다.

보호4,781파일 중4,779동일, 기존 route/PoC 상태 문서2접점 외 예상 밖0이다. 운영 STATUS 본문은 원래 SHA256과 동일하게 보존하고 PoC 안내만 갱신한다. commit·push·PR·merge·Preview·Production·외부 게시 미실행, 관찰 사용자0명이다.

전체10상황·두 전체 개선 루프는 진행 중이다. 보고서 HTML의 URL 정책 차단을 다른 URL/브라우저/미러로 우회하지 않는다. 이 작업은 운영 데이터·기존 `/my`·운영 저장 key/schema/writer를 바꾸지 않으며 commit/push/PR/merge/Preview/Production·외부 게시를 하지 않는다.
