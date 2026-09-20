# B2 연결 뒤 기존 UI 회귀 검증

2026-09-06 KST. 기존 B1 모드·K1-B 편집 복구·C3 저장 경계·원문 비교 CAS를 현재 B2 소스 조합에서 다시 검사한다. 새 구간/순서 12개나 앞선 모델 검사를 더해 실행 수를 부풀리지 않는다. 이 문서는 해당 54개 회귀만 다룬다.

최종 **54/54 PASS**다. 첫 원형 실행은 40 PASS/14 FAIL이었고, 실패 14개는 두 종류의 과거 하니스 기대값 불일치였다. 실제 RED를 보존한 뒤 승인된 기대값 두 줄만 현행화했다. 제품 수정은 0이다. 최종 98개 경계 기록·제품 API 395건에서 범위 밖 호출·console/page error·운영 sentinel 불일치0을 확인했다.

## 1. 검사 대상과 보호 범위

| 항목 | 정확한 대상 |
| --- | --- |
| 실행 앱 | `build-single-file.cjs.buildText()`의 메모리 HTML. SHA `889b88f811039413b15347359b5490d5d5d66cefabc3b4b1da91e4b516733098`, 1,428,663 bytes |
| app / CSS | app `6EABC405CA394FC7E03052DE9EDBCAF14C8144CD838B2B3EBF2FC91A6623346B`, CSS `3FA5482D68354B3D5EC8ACEC44C41BC9EA0A88985606CDFCE8E963C57072DFA8` |
| 사용자 HTML 2개 | B1 SHA `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3`, 각각 1,380,751 bytes. 읽어 실행하거나 덮어쓰지 않음 |
| 브라우저 방식 | 격리된 Chromium context, 3182 기존 서버의 loopback URL을 route fulfill. workers 1, retries 0 |
| file 검사 예외 | K1B B07만 같은 메모리 HTML을 이번 `testInfo.outputPath` 아래 임시 HTML로 생성하여 실제 `file://` Back도 확인. 사용자 HTML 대상 검사 아님 |
| 저장 범위 | 각 spec의 원래 PoC prefix/정확 key 감시와 운영 sentinel 비교 유지. fixture 입력·외부 변경 주입은 제품 호출과 구분 |
| 제외 | 실제 Android/iOS·OS IME·보조기술·관찰 사용자 검증, React 제품 검사, 운영 데이터 migration, commit/push/PR/배포 |

실행 전 전체 모듈·테스트·HTML 해시 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-before-2026-09-05T15-33-42-330Z.log`)와 명령 메타데이터 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-before-2026-09-05T15-33-42-330Z.json`)를 보존했다. 이 log에는 fixture 원문이나 source snapshot 전문이 아니라 파일 이름·크기·SHA만 담겼다.

## 2. 등록 범위

| 기존 검사 파일 | 등록 수 | 확인하는 흐름 |
| --- | ---: | --- |
| k3b-plan-modes-ui (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-plan-modes-ui.spec.ts`) | 16 | 4 origin별 모드, source A→B→명시 A, 동값, invalid/반복, 실패·재시도, source drift/ABA, v3·raw-v2 prepared/confirmed, 취소/Back, 5 viewport |
| k3b-regression-k1b (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-regression-k1b.spec.ts`) | 20 | 5 origin 열기, 부모/자식/Quick 초안, 입력·선택·초점 보존, HTTP/file Back, writer 실패, 지연/중복/foreign journal, prepared/confirmed, 같은 ms ID 충돌 |
| k2b-c3-storage-ui (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-c3-storage-ui.spec.ts`) | 16 | seed/legacy/checkpoint, 저장 API/키 오류, ancillary 오류, Quick·완료·이동·전환·휴지통·Undo, child 저장, 구/new journal, handoff, reset/영구삭제의 실패·복구, 늦은 callback |
| k3b-source-review-cas-ui (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-source-review-cas-ui.spec.ts`) | 2 | 정상 source 저장 positive, A→B 이전 비교의 무변경, 관찰 A→B→A 무효화와 명시 새 비교 |
| 합계 | **54** | viewport·origin·fault loop의 내부 반복을 별도 등록 검사로 더하지 않음 |

실제 `--list` 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-list-2026-09-05T15-33-09-329Z.log`)는 `54 tests in 4 files`를 반환했다. 등록 확인은 브라우저 PASS가 아니다.

## 3. 실행 이력

첫 실행은 과거 기대값까지 원형 그대로 보존했다. 이어서 같은 제품 후보로 전체 54개를 다시 실행했다.

| 실행 | 시간(UTC) | 결과 | 근거 |
| --- | --- | --- | --- |
| 원형 | 2026-09-05 15:34:58~15:38:06 | 40 PASS / 14 FAIL, skipped·flaky0 | Playwright JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-original-20260906-01.json`), line 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-original-2026-09-05T15-34-57-865Z.log`), 실행 명령 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-original-2026-09-05T15-34-57-865Z.json`) |
| 기대값 현행화 뒤 | 2026-09-05 15:40:19~15:42:39 | **54 PASS / 0 FAIL**, skipped·flaky0 | Playwright JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-corrected-20260906-01.json`), line 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-corrected-2026-09-05T15-40-19-505Z.log`), 실행 명령 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-corrected-2026-09-05T15-40-19-505Z.json`) |

첫 실행의 C3는 16/16, K1B는 20/20, modes는 4/16, sourceCAS는 0/2였다. modes 실패 12개는 전부 `openPlan` 206행의 v1 기대/실제 v2 불일치다. sourceCAS 실패 2개는 54행의 B1 SHA 기대에서 발생해 해당 source UI를 열기 전 중단됐다. 두 종류 모두 승인된 B2 계약/현재 후보 핀과 과거 기대값의 차이이며 제품 실패로 세지 않는다. 이 두 원인 외의 원형 실패는 없었다.

- modes의 `openPlan`은 B1의 `flowme-standalone-source-bound-personal-plan-draft-v1`을 정확히 기대한다. 현재 B2의 명시 계약은 `…-v2`이므로 최초 실패를 먼저 남기고 새 열기 계약 기대값 1곳만 현행화한다. 역사 v3 복구 fixture와 raw-v2 복구의 별도 v1 계약은 바꾸지 않는다.
- sourceCAS는 B1 app SHA `595CD60B…`를 검사 시작·끝에 고정한다. 현재 app `6EABC405…`에 대한 후보 핀 갱신은 저장/CAS assertion을 바꾸는 작업이 아니다. 첫 실행에서 실제 pin mismatch를 먼저 기록한다.
- 수정 전 두 파일 exact backup: modes (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-structure-existing-ui-expectations-20260906-01/personal-workspace-k3b-plan-modes-ui.spec.ts`), sourceCAS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-structure-existing-ui-expectations-20260906-01/personal-workspace-k3b-source-review-cas-ui.spec.ts`). 각각 SHA `1A3E0F6E803AE962FEFE61DBD3AC47049A82162DEFC11A4514346C4631E06ADA`, `CC71FACA767A03E5C2C0291DF666A71D56B0C6A1D28B918B8D96E80DAD924C33`.

실제로 수정한 곳은 modes 206행의 `…draft-v1 → …draft-v2`, sourceCAS 20행의 `EXPECTED_APP` 한 곳이다. 각각 새 SHA는 `9D2BC333BF31C7B8BE776490D9CE3E955FE636B0AB37279F279F209B0CD2EC53`, `5168B8A98CCC07B589FD237FF449420A9367FF89EB05980619EF511A79339923`다. exact backup과의 diff에서 두 줄 외 변경이 없음을 확인했다.

등록 수, 동작 assertion, fault injection, 저장 비교, timeout은 유지했다. v3 역사 복구 fixture·raw-v2 복구의 별도 v1 계약·C3/K1B 파일은 그대로다. 과거 JSON/PNG를 덮어쓰지 않았고 재실행을 더해 고유 108개 검사라고 부르지 않는다.

## 4. 증거 해석의 한계

기존 modes/K1B의 PNG는 `fullPage:true`이므로 파일 이름에 viewport가 들어가도 실제 이미지 픽셀 크기가 그 viewport라는 뜻은 아니다. full rect/ancestor clipping/9점 hit는 modes의 실제 요소별 검사이며, K1B는 ratio 1과 중심 hit를 검사한다. 한 화면의 모든 행동이 동시에 보인다고 주장하지 않는다. C3는 1024×768이 기본이고 자체 5 viewport 검사가 아니다.

sourceCAS의 외부 변경은 같은 격리 context에서 native setter와 명시 `StorageEvent`로 주입한다. 실제 두 탭 동시성이나 실제 기기 검사가 아니다. 정상 source-review가 source key에 쓰는 것과 Plan 편집이 workspace/journal pair에만 쓰는 계약을 혼동하지 않는다.

저장 API 수는 실제 attachment를 집계하며, 실패한 API 호출도 포함한다. 성공 변경 건수·고유 테스트 수·브라우저 context 수는 서로 다른 값이다. 초기화 fixture 쓰기는 제품 쓰기로 세지 않는다. 별도 실행·재실행의 같은 시나리오를 누적 고유 시나리오로 더하지 않는다.

## 5. 실제 저장 경계 집계

최종 attachment 집계 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-corrected-analysis-2026-09-05T15-44-15-711Z.log`)에 파일별 key/method 호출과 원본 JSON 경로를 담았다. 아래 수는 최종 실행 한 번의 값이다. 98은 유효 경계 attachment 수이며 Playwright가 만든 전체 context나 고유 요구사항 수가 아니다.

| 검사 | PASS | 경계 기록 | 제품 API 호출 | 범위 밖 / 오류 / 운영 불일치 |
| --- | ---: | ---: | ---: | --- |
| C3 저장 | 16 | 45 | 188 | 0 / 0 / 0 |
| B1 모드 | 16 | 21 | 58 | 0 / 0 / 0 |
| K1B 편집·복구 | 20 | 29 | 147 | 0 / 0 / 0 |
| source CAS | 2 | 3 | 2 | 0 / 0 / 0 |
| 합계 | **54** | **98** | **395** | **0 / 0 / 0** |

- 모드58 + K1B147 호출은 새 workspace-v2와 editor journal-v2 pair에서만 관측됐다. 모드의 legacy/source exact 비교도 모두 유지됐다.
- source CAS의 정상 적용 2건은 정확 source key의 `setItem` 2건이며 target/journal 쓰기0, 보호 key bytes 동일이다. 이전 비교·관찰 ABA의 적용 시도는 쓰기0이다.
- C3는 기존 PoC legacy journal 복구, 명시 reset/영구 삭제, 작성 handoff도 포함한다. 따라서 old PoC key/remove가 실제로 발생하며, 이를 ‘모든 PoC key가 전후 불변’이라고 표현하지 않는다. 운영 prefix 밖 자료는 sentinel로 byte-for-byte 비교했다.
- C3의 기록된 외부 fixture 호출2건은 제품188건에서 제외했다. 이는 모든 검사 초기 seed/외부 주입을 합친 개수가 아니다. 다른 spec의 native fixture 주입도 제품 probe 밖에서 실행되어 별도 notes로 기록된다.
- `clear` 호출0. 콘솔/page error0은 각 spec의 실제 listener 결과다. Node의 NO_COLOR/FORCE_COLOR 환경 경고는 브라우저 오류가 아니다.

원형 실행의 별도 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-original-analysis-2026-09-05T15-41-39-833Z.log`)는 90개 경계/350건 API였다. 이는 중도 실패한 시나리오가 포함된 과거 실행이며 최종98/395에 더하지 않는다. 원형 sourceCAS의 경계0은 검증 성공이 아니라 app 핀 선행 실패를 뜻한다.

## 6. 캡처 직접 검토와 다섯 크기의 판정

modes U12에서 Plan/Item 각 필드와 오류·저장/취소를 스크롤하여 full rect, ancestor clipping, 9점 hit를 검사했다. 다섯 크기 모두 해당 검사 PASS, 문서 가로 넘침0, 이 시나리오 쓰기0이다. K1B B10/B14/B17의 모달·실패·prepared/confirmed 제어도 기존 ratio 1/중심 hit 검사로 통과했다.

아래 Item 오류 PNG 5개를 실제로 열어 읽었다. 모두 `fullPage:true`이므로 이미지 높이를 그대로 적었다. 이 캡처만으로 viewport 안 동시 가림0을 주장하지 않고 위 요소별 geometry 결과와 구분한다.

| 실행 viewport | 직접 읽은 파일·실제 픽셀 | 직접 평가 |
| --- | --- | --- |
| 390×844 | Item 오류 PNG (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-390x844.png`), 실제 390×1,824 | 한 열에서 제목·메모·날짜와 지역 오류를 읽을 수 있다. 취소/반영 버튼은 세로로 분리된다. |
| 375×812 | Item 오류 PNG (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-375x812.png`), 실제 375×1,824 | 긴 안내가 줄바꿈되고 입력/오류가 카드 밖으로 나가지 않는다. 원문 정보부터 버튼까지의 세로 이동은 길다. |
| 844×390 | Item 오류 PNG (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-844x390.png`), 실제 844×1,706 | 가로 화면에서도 한 문서 흐름을 유지한다. 하단 버튼 텍스트가 가로로 읽힌다. |
| 1024×768 | Item 오류 PNG (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-1024x768.png`), 실제 1024×1,715 | 왼쪽 탐색과 편집 본문이 분리되며 오류·원문·입력 영역이 겹치지 않는다. |
| 1440×900 | Item 오류 PNG (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/item-error-1440x900.png`), 실제 1440×1,715 | 편집 본문 최대 너비와 좌우 여백이 유지되고 오른쪽 하단 취소/반영이 분리된다. |

추가로 375px Plan 오류 화면 (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-pla-d5470-eachable-at-nine-hit-points/plan-error-375x812.png`)을 읽었다. 새 순서 버튼과 원문 정보는 잘리지 않지만 전체 페이지는 2,205px로 길다. 이는 기존 원문 정보를 유지한 현재 표시의 관찰이며 짧은 스크롤·정보 밀도까지 최적화됐다는 뜻은 아니다. 임의로 정보를 접거나 삭제하지 않았다.

source CAS의 A→B 이전 비교 (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-sou-f1d01-cannot-overwrite-observed-B/stale-a-b.png`)와 명시 새 비교 후 성공 (로컬 전용 근거: `../../../output/playwright/k3b-structure-existing-corrected-20260906-01/personal-workspace-k3b-sou-adf55-resh-and-choices-write-once/observed-a-b-a-explicit-refresh.png`) 390×844 캡처도 실제로 읽었다. 이전 비교에는 변경 안내와 재비교 버튼, 비활성 적용 버튼이 남는다. 성공 화면은 별도 적용 결과와 실행 목록을 표시한다. 해당 sourceCAS 캡처는 `fullPage:false`이고 각 캡처 전후 storage/dialog/content 동일 assertion을 실행했다. 이 기록을 modes/K1B 전체 페이지 캡처에도 적용됐다고 주장하지 않는다.

## 7. 동결 확인과 완료 범위

실행 후 비교 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-after-2026-09-05T15-42-56-809Z.log`)는 제품 JS/CSS 12개, builder, 사용자 HTML 두 파일의 SHA/크기가 실행 전과 같음을 확인했다. 메모리 HTML도 889B88F8/1,428,663 bytes로 동일하다. 달라진 파일은 승인된 테스트 기대값 두 파일뿐이다. 이는 이번 회귀 전후의 확인이며 이후 root의 사용자 HTML 재생성 시점까지 고정한다는 뜻은 아니다.

이 54개 범위에서 남은 제품 실패는 발견하지 못했다. B2 신규 구간·순서 전체 요건의 완료, npm 전체 검사, production build, 사용자 HTML 재생성·host 검사는 별도 상위 검증으로 남긴다. 실제 기기/OS IME/보조기술 NOT_RUN, 관찰 사용자0. 이번 하위 작업은 commit·push·PR·Preview·Production을 진행하지 않았다.
