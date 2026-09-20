# K3-B Plan/Item mode UI — 독립 브라우저 QA

2026-09-05. 신규 브라우저 시험 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-plan-modes-ui.spec.ts`)의 최종 실행은 **16/16 PASS**다. 제품 코드·CSS·기존 시험·생성 HTML은 이 검증 담당자가 수정하지 않았다. root의 제품 수정과 시험 문구·스크롤 정정을 거친 결과이며, 첫 실행 **9 PASS / 6 FAIL** 근거도 아래에 보존했다. 이 16개가 전체 제품 완성이나 실제 사용자 검증을 뜻하지 않는다.

## 최종 판정

최종 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/modes-ui-final16-20260905-01.json`): 16 PASS, FAIL/SKIP/FLAKY 0, **66.32초**. 16개 모두 memory HTML SHA `fb17fda35e1141c50359bee3cc5b85a39dc89f9c0c10809570adb70b757d8be3`를 환경 pin으로 강제했다. app 실행 전후 SHA는 `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15`로 같다.

- U01 네 origin: 각각 제목·명시 빈 메모·같은 날짜 fixed pin, raw 불변, view, reload의 mode 복원, 단일 Undo 모두 PASS.
- U02/U03: 원문 A→B에서 명시 A는 개인 값으로 보존, 명시 B는 새 쓰기 0인 no-op. 둘 다 PASS.
- U04/U05: 빈 제목·빈 fixed 날짜 오류 유지. 반복 미정은 부모 dirty-invalid를 유지하고 구체적인 반복 조건을 안내하며 쓰지 않는다. PASS. 반복 미정의 저장 지원을 새로 허용한 것이 아니다.
- U06/U07: Quota 실패·재시도, source-only drift와 관찰 ABA의 입력 보존·쓰기 0. PASS.
- U08–U11: prepared 같은 원문 재개, 바뀐 원문의 읽기 전용 보관, confirmed cleanup, child/parent Cancel·Escape·실제 browser Back. 모두 PASS.
- U09에 확인창 X·Escape·계속 보관·native `requestClose`의 네 하위 검사를 추가했다. 확인창만 닫히고 source-reopen gate/입력/target/source가 유지되며 원래 버튼으로 초점이 돌아온다. 네 경로 모두 쓰기 0. `requestClose`는 명시적인 브라우저 API 시험이며 실제 기기 제스처로 표현하지 않는다.
- U12: 390×844, 375×812, 844×390, 1024×768, 1440×900 모두 mode·입력·오류·저장/취소 full rect 및 **9점 hit** PASS, 가로 넘침 0. viewport loop는 5개 하위 검사이며 등록 시험 수에 5를 더하지 않는다.
- U13: 기존 P overlay가 있는 raw-v2 prepared 기록을 복구할 때 source가 손상돼 있으면 보관 입력을 읽기 전용으로 유지한다. 재확인 1회도 편집기를 열거나 쓰지 않았다. source를 외부 fixture로 정상화하고 명시적으로 재열면 raw-v2 draft contract 그대로 재개된다. 복구 target set 1 + journal remove 1은 이전 바이트 복원이다. 이후 재열기까지 추가 저장 0, 사용자가 저장을 누른 뒤에만 별도 4 API와 성공 표시 1이 생겼다. raw-v2를 v3로 자동 변환하지 않았다.

최종 21개 boundary(U07 2 contexts, U12 5 contexts)의 mutation API 호출은 **58건**이다. workspace target `setItem` 16(Quota 실패·복구 호출 포함), journal `setItem` 25, journal `removeItem` 17. `clear` 및 두 고정 key 밖 호출은 0. 원문·legacy·운영 key/value는 모든 boundary에서 바이트가 일치했고 console/page error는 0이다. 이 수는 58번 저장 성공이나 사용자 행동 수가 아니다. U01 각 저장의 exact 순서는 prepared set → target set → confirmed set → journal remove다.

## 범위와 실행 환경

- 실제 standalone `build-single-file.cjs.buildText()` 결과를 메모리에서 한 번 만들고 Chromium에 route했다. 역사 HTML과 사용자가 여는 HTML을 덮어쓰지 않았다.
- 기존 production 서버 `3182`는 경로 제공에만 사용했다. 브라우저 내용은 fresh context의 fixture HTML이다. 서버 시작·종료·빌드·배포는 하지 않았다.
- Asia/Seoul, 주입 시각 `2026-09-05T09:00:00+09:00`. 실제 기기 검사가 아닌 desktop Chromium이다.
- `legacyFixture`와 `sourceUpdateFixture`의 실제 M/C 구조를 썼다. 명시 빈 메모와 상속을 구분하려고 해당 Item의 기존 개인 메모를 비어 있지 않은 합성 값으로 설정했다. 기존 unknown, null/부재, source, 실행 값은 저장 후 정확히 비교한다.
- prepared fixture는 E2 실제 writer의 target 직후 source drift fault로 만든 기록이다. confirmed fixture도 실제 E2 durable commit 결과다. 임의 journal shape나 phase 편집으로 복구 권한을 만들지 않았다.
- U13은 actual C로 기존 P overlay를 만든 뒤 raw E2의 readback mismatch + rollback-write 실패로 version 2 prepared 기록을 만든다. before/candidate/journal의 실제 일치를 확인한 다음 source 손상만 별도 주입했다. 새 저장은 explicit source-aware v3가 아닌 복구된 raw-v2 계약으로 확인했다.

## 등록과 실행 수

| 실행 | 실제 개수 | 결과 | 근거 |
| --- | ---: | --- | --- |
| `--list` | 15 등록, 실행 0 | 등록 확인 | 신규 spec |
| U04 첫 grep | 0 | 전체 제목 anchor 불일치로 `No tests found` | `modes-ui-smoke-u04-20260905-01.json` |
| U04 smoke | 1 | 1 PASS | smoke JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/modes-ui-smoke-u04-20260905-02.json`) |
| 첫 전체 | 15 | 9 PASS / 6 FAIL | 첫 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/modes-ui-first15-20260905-01.json`) |
| 수정 후 전체 | 15 | 15 PASS | 수정본 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/modes-ui-revised15-20260905-02.json`) |
| 복구 호환 추가 후 최종 | 16 | 16 PASS | 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/modes-ui-final16-20260905-01.json`) |

smoke HTML SHA256: `d4924a94242e3842f3d6bb2f7d57577fa40eae6c293444f179ae50e13a540365`.

첫 전체 HTML SHA256: `e336528d2adb3c6ec82746c602896be0e220ac081c7d8b0e565456cbc6b4adf3`. 15개가 모두 같은 값이다. 서로 다른 두 HTML의 결과를 하나의 최종 통과로 합치지 않는다.

중간 15/15 통과는 68.68초, HTML `76629f66a08c1b3ce4f764eae711e3e7f40d8dd077006d0afef5249f357587cb`, app `C49685FE36CC885792BBF2F1423A1A08AFA624481423F2DA05AE9AA88B359B13`이었다. 당시 20개 boundary의 52 API와 현재 최종 58 API는 별도 실행 수다.

## 시나리오별 첫 판정

| ID | 확인 대상 | 첫 결과 |
| --- | --- | --- |
| U01 × 4 | 네 saved origin 각각 Plan/Item 제목, 빈 메모, 기존 날짜와 같은 fixed pin, 저장·view·reload·Undo | 4 FAIL. 저장·정확 writer 순서·원본 값 보존·개인 제목 표시는 통과. 상세 빈 메모 문구 기대 오류에서 중단되어 reload/Undo는 아직 미확인 |
| U02 | source A→B 뒤 Flow/Item에 명시 A 저장·reload | PASS |
| U03 | 현재 source B 명시 선택의 semantic no-op | PASS, 쓰기 0 |
| U04 | 빈 제목·fixed 날짜 미입력 오류와 입력 보존 | PASS, 쓰기 0 |
| U05 | 반복 Item의 미정 child 반영→부모 domain 오류 | FAIL. dirty-invalid와 쓰기 0은 확인했지만 구체적인 반복 사유가 일반 오류로 바뀜 |
| U06 | target quota→입력·before 보존→명시 재시도 | PASS |
| U07 | source-only drift / StorageEvent 관찰 ABA 두 하위 검사 | PASS, 각각 쓰기 0 |
| U08 | v3 prepared, 동일 source→명시 복구→새 세션 재개→명시 저장 | PASS |
| U09 | prepared 복구 뒤 다른 source→보관된 draft 읽기 전용, 재확인·계속 보관 | PASS |
| U10 | confirmed startup→명시 cleanup, target 불변 | PASS. journal remove 1, workspace 쓰기 0, 새 UI 성공 수 0 |
| U11 | child/parent Cancel·Escape·실제 browser Back | PASS, 쓰기 0 |
| U12 | 5 viewport의 mode·필드·오류·저장·취소 full rect + 9점 hit | FAIL. 첫 390×844 하위 검사 중단. 나머지 4개는 미실행 |

## 실패 분리

1. **시험 기대 문구 4건.** 명시 빈 개인 메모는 새 UI에서 `(빈 메모)`로 표시한다. 준비 당시 구 코드의 `메모 없음`을 기대해서 실패했다. 명시 빈 값과 부재를 구분하는 현재 문구를 유지하고 기대값만 정정했다. 제품 결함으로 세지 않는다.
2. **반복 오류 안내 1건.** E2 `beginSourceBoundPersonalPlanSave`가 invalid draft를 `invalid-editor-draft`로 먼저 거절한다. 당시 UI는 `invalid-effective-plan`에만 반복 안내를 매핑해 실제 원인을 보여주지 못했다. 실제 C/E2/P 순수 진단에서도 session `dirty-invalid`, E2 `invalid-editor-draft`, captured validator `invalid-effective-plan`, 쓰기 0을 확인했다. captured 진단은 현재 source 허가를 대신하지 않는다. 저장 guard를 풀지 않고 안내만 구체화하는 수정으로 최종 통과했다.
3. **scroll 측정 1건.** `scrollIntoViewIfNeeded` 뒤 오류 문단의 bottom이 `844.171875`, viewport가 `844`였다. 9개 hit point는 모두 통과했다. 화면 전체 접근 불능으로 단정하지 않는다. 실제 문서를 요소 중앙으로 스크롤한 뒤 **오차 허용 없이 같은 full rect·9점 hit**를 검사하도록 하니스를 정정했고 최종 5개 화면 모두 통과했다.

root가 반복 실패의 captured 진단 사유만 구체화했고 저장 권한/guard를 완화하지 않았다. source-reopen discard 확인창의 두 click allowlist와 Escape 차단도 정확한 확인창에 한정해 보완했다. 해당 제품 수정은 root 소유이며 이 시험 담당자가 변경하지 않았다.

## 저장 경계 근거

첫 전체 실행의 16개 boundary(15개 시험 중 U07이 두 fresh context)의 product mutation API 호출은 합계 **36건**이다. 모두 다음 두 key에만 해당한다.

- `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`

네 origin U01 각 4, U02 4, U06 7, U08 6, U09 2, U10 1건이며 나머지는 0이다. 실패한 target API 호출과 journal prepare/confirm/remove를 성공 저장 수로 합산하지 않는다. 원문 변경 fault는 초기화 때 캡처한 native setter로 별도 주입했고 product writer 호출에서 분리했다.

16개 boundary 모두 기존 legacy raw, 마지막 외부 fixture source raw, 운영 sentinel byte-for-byte 동일이다. 허용 pair 밖 set/remove/clear **0건**, console/page error **0건**. 운영 데이터 전체에 대한 일반 증명이 아니라 이 실행의 모든 비-PoC key/value를 실제 전후 비교한 증거다. 초기 seed는 product 호출 수에서 제외하지만 부팅 뒤 product 호출은 기록한다.

## 직접 본 화면

smoke Item 오류 화면 (로컬 전용 근거: `../../../output/playwright/k3b-modes-smoke-u04-20260905-02/personal-workspace-k3b-pla-74618-rve-input-and-write-nothing/invalid-local-fields.png`)을 직접 열어 확인했다. 원본 정보와 개인 입력이 구분되어 있으며, 제목·날짜 오류 문구와 취소/Plan 반영 버튼이 남아 있다. 전체 페이지 캡처만으로 가상 키보드·실제 터치 접근성을 판정하지 않았다.

최종 Item 오류 캡처 5개를 직접 열어 비교했다. 좁은 화면은 위아래로 쌓인 입력·오류와 세로 버튼, 넓은 화면은 sidebar와 읽기 폭을 제한한 편집 영역을 유지한다. 844×390은 세로 스크롤이 필요하지만 모든 필드와 마지막 버튼을 실제 스크롤로 접근했다. mode 아래 입력과 오류의 짝이 끊기거나 원본 정보에 겹치지 않았다. 긴 문서의 세로 길이, 실제 가상 키보드, 사용자가 모드를 이해하는지는 이 측정으로 판정하지 않았다.

| viewport | 직접 확인한 Item 캡처 | Plan 캡처 | 결과 |
| --- | --- | --- | --- |
| 390×844 | Item (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-390x844.png`) | Plan (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-390x844.png`) | strict geometry/overflow PASS |
| 375×812 | Item (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-375x812.png`) | Plan (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-375x812.png`) | strict geometry/overflow PASS |
| 844×390 | Item (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-844x390.png`) | Plan (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-844x390.png`) | strict geometry/overflow PASS |
| 1024×768 | Item (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-1024x768.png`) | Plan (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-1024x768.png`) | strict geometry/overflow PASS |
| 1440×900 | Item (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-1440x900.png`) | Plan (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-1440x900.png`) | strict geometry/overflow PASS |

새 raw-v2 복구 입력 보관 화면 (로컬 전용 근거: `../../../output/playwright/k3b-modes-final16-20260905-01/personal-workspace-k3b-pla-d5bd9-il-explicit-reopen-and-save/raw-v2-recovered-input-source-blocked.png`)도 직접 확인했다. 편집기를 정상 화면처럼 열지 않고, 보관 입력과 원문 재확인·명시 버리기 행동을 한 영역에 둔다. 보관 입력의 JSON 표시가 사용자에게 충분히 이해되는지는 관찰하지 않았다.

초기 실패 캡처는 첫 실행 디렉터리 (로컬 전용 근거: `../../../output/playwright/k3b-modes-first15-20260905-01`)에 보존했다. 이전 K1-B 회귀를 새 모드에 연결한 별도 시험은 이 16개와 분리해서 집계한다.

## 실제 사용자 HTML과 fullPage 캡처 확인 — 추가 근거

새 실제 파일 시험 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-direct-local-file.spec.ts`)은 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`을 **file://로 직접** 열었다. memory route·임시 HTML 복사·사용자 브라우저 profile은 쓰지 않았다. fresh Chromium 390×844에 운영 sentinel만 초기화했고 PoC seed 쓰기는 0이다. 파일 SHA는 FB17 전체 해시와 같고 크기는 1,380,751 bytes다.

Plan 제목·Item 메모·계획 날짜 변경 → child 반영 0쓰기 → 최종 저장 4 API → reload exact/모드 복원 → clean close 0쓰기 → Undo 4 API → reload exact을 확인했다. raw Flow/Item·원문·legacy·운영 key 불변, console/page error·가로 넘침 0이다. 첫 직접 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/direct-local-file-first-20260905-01.json`)은 1/1 PASS(2.92초), 아래 측정을 추가한 최종 직접 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/direct-local-file-geometry-20260905-02.json`)도 1/1 PASS(3.03초)다. **고유 시나리오는 LF01 한 개**이며 재실행을 두 개의 기능 검증으로 더하지 않는다. 최종 product API 8건은 저장/Undo 각 4건(target set 2, journal set 4, journal remove 2)이다.

첫 Plan 전체 페이지 PNG에 검은 `본문으로 이동` 링크가 제목 위에 나타나 별도 조사했다. 실제 화면 가림을 추정하지 않고 같은 상태에서 viewport PNG·DOM 좌표·초점·hit 대상을 측정했다.

| 측정 | fullPage 직전/직후 | 제목을 실제 화면 중앙으로 스크롤한 뒤 |
| --- | --- | --- |
| scrollY | 모두 724 | 245 |
| skip-link rect | x12, y−60, 115×42.5, bottom−17.5 | 동일 |
| computed CSS | position fixed, top −60px | 동일 |
| 화면 교차 | false | false |
| activeElement | `open-plan-item-editor` 버튼, skip-link 아님 | 동일 |
| 제목 rect | y−79~−35: 화면 밖. 이때의 hit 없음으로 비가림을 증명하지 않음 | y400~444, 9/9 지점이 실제 INPUT |

두 viewport PNG와 재생성 fullPage PNG를 직접 열어 비교했다. viewport에는 검은 링크가 없고, fullPage에서는 `scrollY724 + top(−60) = 문서 y664` 위치에 링크가 나타났다. 직전/직후 DOM 좌표와 초점은 변하지 않았다. 따라서 **이 상태의 검은 링크는 fullPage 캡처 artifact**로 판정한다. 실제 화면 overlay를 고치는 제품/CSS 수정은 하지 않았고 원래 PNG도 보존했다. 가상 키보드나 실제 기기에서 같은 현상까지 판정한 것은 아니다.

- fullPage 직전 실제 viewport (로컬 전용 근거: `../../../output/playwright/k3b-direct-local-file-geometry-20260905-02/personal-workspace-k3b-dir-89d09-oad-preserve-exact-raw-data/actual-local-file-plan-viewport-before-fullpage.png`)
- 제목 입력의 실제 viewport·9점 hit (로컬 전용 근거: `../../../output/playwright/k3b-direct-local-file-geometry-20260905-02/personal-workspace-k3b-dir-89d09-oad-preserve-exact-raw-data/actual-local-file-plan-title-viewport.png`)
- 같은 상태의 fullPage 비교 PNG (로컬 전용 근거: `../../../output/playwright/k3b-direct-local-file-geometry-20260905-02/personal-workspace-k3b-dir-89d09-oad-preserve-exact-raw-data/actual-local-file-plan-before-save.png`)

## 분리된 상태

- 실제 Android Chrome: **NOT_RUN**
- 실제 iOS Safari: **NOT_RUN**
- 관찰 사용자: **0명**
- 전체 `npm test` / production build: 이 담당자의 실행 범위 밖, root가 별도 보고
- commit / push / PR / Preview / Production: **진행하지 않음**
