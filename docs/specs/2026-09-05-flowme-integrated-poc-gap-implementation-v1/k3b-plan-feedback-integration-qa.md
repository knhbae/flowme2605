# K3-B B3 — standalone 변경 요약·저장 결과 통합 QA

2026-09-06. **standalone B3는 현재 조작 HTML에 반영됐고, 신규 브라우저 15개·기존 회귀 66개·실제 로컬 파일 1개가 통과했다.** React의 100개 초과 Plan 표시 연결은 별도 진행 중이다. 전체 B3 또는 통합 제품의 모든 갭이 해소됐다는 판정은 아니다.

이 문서는 기존 실행의 JSON·첨부·로그를 독립 대조한 QA다. 제품·기존 시험·사용자 HTML·진행 원장을 수정하거나 아래 시험을 새로 실행하지 않았다. 신규 파일은 이 문서와 읽기 전용 집계 helper (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/summarize-feedback-existing-evidence-20260906.cjs`)다.

## 1. 현재 산출물과 원본 요구 대응

| 원본 | B3가 충족한 연결 | 근거와 한계 |
| --- | --- | --- |
| v4.1 | 개인 편집 결과와 Undo를 실행 화면 안에서 확인. 같은 위치·취소·실패에서 새 성공/Undo 없음. 화면 크기별 핵심 행동 접근 유지 | B3UI02/05/06/11/13/15. 날짜·완료·반복 실행 owner 정책은 변경하지 않음 |
| 개발1 | Item 반영은 부모 draft에만 적용, child 요약은 자기 차이만 표시. Plan 최종 저장의 실제 변경과 같은 attempt 결과를 연결 | B3UI01/04/06–10, FB01/04/06/13. parent/child staged 0쓰기, 최종 한 transaction |
| 개발2 | 원문·CreatorDraft·개인 overlay의 owner 구분, 원문 갱신 뒤 기존 개인 intent 유지, 결과 표시가 source Undo를 잘못 소비하지 않음 | B3UI03/05/07/11/15, FB09/10/12, React I01–03/CI01–07. Text Authoring 편집기 전체를 다시 검사한 결과는 아님 |

구현은 [B3 계약](./k3b-plan-summary-receipt-design.md)과 [실제 연결 설계](./k3b-plan-feedback-integration-design.md)를 따른다. 요약은 저장 권한이 아니며 journal 필드·운영 schema·별도 Undo를 만들지 않는다. captured 정규화의 실제 의미 차이를 먼저 계산하고 표시값만 제한한다. 같은 날짜 fixed pin은 소유 변경으로 남고, 새 source-equal title은 기존 no-op 규칙을 유지한다.

두 현재 사용자 파일은 직접 다시 읽어 **동일 1,454,070 bytes**, SHA-256 `7D1610AACC5C3DF6F33C37BFE7C517700AC8FF56FED9793300E528E05F17E34E`임을 확인했다.

- 조작 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`)
- 단일 파일 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`)

역사 B2 파일은 `889B88F8…` / 1,428,663 bytes다. B3 첫14의 메모리 후보 `9ACFA7EB…`, 앱1192, ABA 단독 수정 앱0443을 현재 파일과 섞지 않는다. 현재 standalone 앱은 `DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7`, 스타일은 `5028D2B4…`, P는 `5F42761D…`다.

## 2. 실제 실행 수 — 중복은 더하지 않음

| 검증 단위 | 최종 실제 결과 | 근거 |
| --- | --- | --- |
| P captured 표시 신규 | 17/17 | [P QA](./k3b-plan-captured-summary-qa.md). 기존487과 묶은504는 아래780과 중복 |
| standalone 모델·실제 앱 함수 선정 | **780/780**, fail/skip0 | 41개 파일 명령·집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-core-app-final-2026-09-05T16-48-56-701Z.json`). FB13 포함 |
| 실제 app 함수 독립 VM | 13/13, fixture23 | [VM QA](./k3b-plan-feedback-app-qa.md). 780에 포함되므로 별도 더하지 않음 |
| React summary·실제 planner/handler | **109/109**, fail/skip0 | 순서 표시 포함 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-final109-guards-2026-09-05T16-44-16-206Z.json`), [QA](./k3b-plan-order-display-qa.md). 이전106 포함; React 화면 PASS가 아님 |
| 신규 standalone B3 UI | **15/15**, skipped/flaky0 | 최종 JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-final-20260906-01.json`), [15개별 QA](./k3b-plan-feedback-browser-qa.md) |
| 기존 UI 선정 회귀 | **66/66**, skipped/flaky0 | 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-existing-ui-final-20260906-01.json`): C3 16 + B1 mode16 + K1B20 + source CAS2 + B2 structure12 |
| 실제 생성된 `file://` 조작 | **1/1**, skipped/flaky0 | LF01 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-generated-file-final-20260906-01.json`). 임시 HTML/HTTP route 아님 |
| 생성 파일·runtime 선정 | **151/151** | 17:04:30Z 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-final-html-model-2026-09-05T17-04-30-192Z.json`) |
| 기기 연결용 고정 해시·계약 검사 | **56/56**(27+29) | 17:01:16Z 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-current-device-pins-2026-09-05T17-01-16-861Z.json`). 실기기 검사 아님 |
| 기기 접속용 로컬 host 브라우저 | **8/8** | 17:01:18Z 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-generated-host-final-2026-09-05T17-01-18-957Z.json`). Android 실행 아님 |
| 현재 production build의 제한 회귀 | **5/5** | 17:20:48Z 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-current-build-gates-2026-09-05T17-20-48-099Z.json`). exact query, malformed journal, v4.1 저장 경계, source-time 읽기 |

신규15 브라우저는 runner6회, attempt34회였으며 고유 등록은15개다. 120 Item과 13페이지, 5개 화면 크기는 하위 검사다. 이 표의 모델·브라우저·pin 수를 하나의 “사용자 시나리오 수”로 합산하지 않는다.

## 3. 발견한 RED와 실제 수정

| 발견 | 실패가 의미한 것 | 수정/최종 증거 |
| --- | --- | --- |
| React 최초8 중6 RED | 실제 저장 의미와 축약 표시 비교의 불일치: no-op 제목, 같은 길이 긴 메모/순서, 긴/제어문자 label. 일부는 저장 뒤 receipt 구성 실패 | 실제 정규화 비교 뒤 bounded 표시. 원래8+보강6 유지, 최종109에 포함 |
| React 후속3 중2 RED | source가 기존 개인 title과 같아진 뒤 무수정/다른 필드 저장에서 개인 intent 제거 | 검증된 열린 overlay의 같은 필드 intent만 유지. 명시 inherit와 새 동값 no-op은 그대로 |
| P emoji label 추가1 RED | 160자 절단에서 surrogate pair 분리 | 표시 절단만 보완, 신규17·기존 회귀 PASS |
| B3UI15 실제 workspace ABA RED | A→B→A 관측 뒤 옛 결과가 살아 있고 과거 Undo DOM이 실제4 API로 저장 | storage listener에 Plan 결과 owner 무효화. 최종15에서 결과0·replay0쓰기 |
| FB12 실제 VM RED | durable 저장·정리 뒤 상세 결과를 만들 수 없는데 fallback 일반 Undo가 source Undo를 호출할 수 있음 | source-bound Plan fallback은 저장 사실만 안내, 일반 Undo 없음. Quick/구 raw 경로 유지. 최종FB13 PASS |

기존 B2 앱에서 새 요약 API 부재로12개 VM이 모두 실패한 것은 기능 미구현 기준선이지 결함12종이 아니다. 첫 VM의2개 기대 오류와 FB13 prepared fault 미성립은 [VM QA](./k3b-plan-feedback-app-qa.md)에 보존했고 제품 결함으로 세지 않았다.

기존 모델 묶음 첫 실행767 중3실패는 AST VM 하니스에 실제 `renderPlanSaveResult`와 `planSaveResult:null`가 빠진 ReferenceError였다. 기대를 낮추지 않고 실제 함수 extraction을 추가한 뒤767, 이어 FB13 포함780이 통과했다. 기존 UI 첫66 중2실패도 제품 시나리오 전 source CAS 시험의 옛 앱 SHA pin(6EABC405) 불일치였다. 첫 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-existing-ui-before-pin-20260906-01.json`)을 보존하고 현재 DF4E pin으로 전체66을 다시 통과했다.

## 4. 저장 API와 운영 데이터 불변 증거

### 4.1 기존66 — 실제 첨부 재집계

최종 report JSON SHA는 `758BFB1A9B161F0CFDC94F174A649AD2C55409A02B27DBB981C4B806D6089801`이다. JSON의 **최종 boundary 첨부121개**만 읽었다. 같은 내용의 디스크 사본·스크린샷 진단·중간 카운터는 다시 더하지 않았다. 집계 helper는 read-only이며 테스트 자체를 재실행하지 않는다.

| 묶음 | 등록 | boundary 첨부 | 제품 저장 API | console/page 오류 | 허용 밖·clear | 운영 exact 불일치 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| C3 boot/writer/recovery | 16 | 45 | 188 | 0 | 0 | 0 |
| B1 Plan/Item modes | 16 | 21 | 58 | 0 | 0 | 0 |
| K1B dirty/실패/복구 | 20 | 29 | 147 | 0 | 0 | 0 |
| source CAS | 2 | 3 | 2 | 0 | 0 | 0 |
| B2 구간/전체 순서 | 12 | 23 | 66 | 0 | 0 | 0 |
| 합계 | **66** | **121** | **461** | **0** | **0** | **0** |

C3의 `fixture:true` 외부 변경2회는 제품 수에서 제외했다. 다른 시험의 원래 Storage method를 통한 seed·외부 source/target 주입도 제품 logger 밖이다. 이 “제외2회”는 모든 suite의 외부 fixture 총수가 아니라 C3 첨부 안에서 명시 표시된2회만 뜻한다.

461의 키별 실제 합계는 workspace-v2 **131**(set125/remove6), journal-v2 **282**(set174/remove108), legacy PoC workspace **9**(set4/remove5), legacy journal **2**(remove2), 작성 draft **29**(set18/remove11), creator-drafts **4**(set1/remove3), source-candidates **4**(set2/remove2)다. C3의 승인된 복구·초기화·handoff·영구 삭제와 source CAS의 명시 적용을 포함한다. 따라서 이 묶음을 “source/legacy PoC 쓰기0”이라고 보고할 수 없다. 모두 정확한 PoC prefix 안이며 운영 `flow:*` key는 쓰지 않았다.

121개 경계에서 운영 sentinel 전후 exact 대조가 있었다. B1+B2의44개 boundary는 legacy exact 및 마지막 외부 fixture를 반영한 source exact도 명시 boolean으로 확인한다. 나머지는 각각 기존 시험의 복구/초기화/보호 key별 기대를 따른다. 실제 사용자의 전체 운영 저장소를 조사한 결과가 아니라, fresh context에 넣은 지정 sentinel·PoC fixture의 보호 증거다.

### 4.2 신규15·VM·실제 파일은 별도 집계

- 신규15: 23 contexts, **128 API = target34 + journal94**, prefix 밖/clear/console/pageerror0. 운영·legacy·source 불일치0. source/target 외부 변화 fixture 제외. 첫14의124와 합산하지 않는다.
- VM13: 23 fixture, **102 API = target25 + journal77**, 허용쌍 밖/clear0, 제품 source 쓰기0. 실제 앱/모델 본문을 실행했지만 DOM/history/시간 일부는 stub이다. native localStorage CAS 증거가 아니다.
- React109에 포함된 앞선 신규 경계85 API와 순서 표시 신규20 API는 각각 별도 메모리 fixture 범위다. 109 전체 저장 API를 모두 센 값이 아니다.
- LF01 실제 파일: Plan 저장1 + Undo1, **8 API = target set2 + journal set4/remove2**. child 반영/clean close/reload는0. 원본 raw Flow/tasks·source·legacy exact 유지, 운영 sentinel SHA 전후 `82df80f6…` 동일. 운영 sentinel seed1회는 제품 수에서 제외, PoC seed0.

저장 API 수에는 실패 시도·rollback·정리·Undo가 포함된다. 성공 사용자 작업 수와 다르다. confirmed durable 사실과 상세 UI 결과 발행도 다르며, reload 후 저널 정리가 새 성공 횟수나 영수증을 제조하지 않는다는 기대를 별도 검증했다.

## 5. 실제 조작 HTML과 다섯 화면 평가

LF01은 실제 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`을 `file://`로 열었다. route interception·임시 HTML 사본·실사용 profile은 모두 false다. 390×844에서 Flow 열기→개인 제목/빈 메모·고정 날짜 편집→자식 반영→Plan 저장→reload→Undo→reload를 실행했다. console/page 오류0, 가로 넘침0이다. 이는 Android 기기 검사가 아니다.

LF01의 fullPage 캡처에 보일 수 있는 검은 “본문으로 이동” 링크는 viewport 전후 geometry로 구분했다. before/after에서 fixed top=-60px, bottom=-17.5px로 화면 밖이고, 제목을 중앙에 둔9점 모두 링크 가림이 없었다. 제품 CSS를 고치지 않았다. 최신 실제 파일 캡처 폴더 (로컬 전용 근거: `../../../output/playwright/k3b-feedback-generated-file-final-20260906-01/personal-workspace-k3b-dir-89d09-oad-preserve-exact-raw-data/`)의 viewport/제목/saved Flow PNG와 JSON이 근거다.

신규15의 화면별 직접 평가는 [브라우저 QA §다섯 화면](./k3b-plan-feedback-browser-qa.md)을 대조했다. 이 통합 문서 작성 중 같은 제품 PNG를 다시 촬영한 것은 아니다.

| 화면 | 검증된 범위·남은 제약 |
| --- | --- |
| 390×844 | 실패/retry·전후 값·결과 Undo/닫기 접근. 하단 중심 캡처에서 상단 제목은 스크롤 밖일 수 있음 |
| 375×812 | CTA 글자 세로 감김·가림 없음. 긴 결과는 문서 스크롤 필요 |
| 844×390 | 한 화면에 일부만 보임. 각 행동으로 스크롤한 full rect/9점 hit 통과. sticky 가림·가로 넘침0 |
| 1024×768 | before/after 두 열과 메모·행동, sidebar/본문 구분 유지 |
| 1440×900 | 결과/두 행동과 키보드 복귀 확인. 긴 구간 반복 정보 밀도는 전체 UX 잔여 |

개별 행동마다 검사한 것이지 모든 정보가 동시에 보인다는 뜻은 아니다. live owner1개는 DOM 검사이며 실제 스크린리더 청취 결과가 아니다.

## 6. 빌드·전체 시험·보호 원장

현재 B3 후보의 production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/react-large-plan-build-first-2026-09-05T17-16-28-913Z.json`)는 exit0이며 build ID는 `kRHgiytNCXX5ItPRDSDUe`다. 로그의 정적 페이지 생성18개와 route 표를 확인했다. 이는 배포가 아니다. 그 빌드의 제한5개 회귀는 위 표와 같다. 이후 React 대형 Plan 연결이 더 바뀌면 그 코드로 다시 검증해야 한다.

**전체 `npm test`는 아직 GREEN이 아니다.** 현재 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-test-b3-feedback-2026-09-05T17-16-39-815Z.json`)은 실제2,030개 중2,029 PASS/1 FAIL이다. 실패명은 `normal user routes fail the standard suite when source review is due`이며 기존 seed4개의 `review_due:2026-06-07`을 보고한다. 원본 내용·검토 일자·시험 날짜를 바꿔 우회하지 않았다. 뒤 실행되지 않은 묶음을 별도로 실행해 approved201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-b3-remainder-approved-2026-09-05T17-19-14-535Z.json`)과 public19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-b3-remainder-public-2026-09-05T17-19-17-993Z.json`)는 PASS다. 이220을 더해 npm 전체 PASS라고 바꾸지 않는다.

보호 원장의 현재 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/protected-latest.json`)은 2026-09-05T17:03:37.083Z 기준 **551개, 허용 변경28, unexpected0, passed=true**다. 기존 baseline을 다시 캡처하지 않았다. 이 기록은 파일 소유 경계이고 브라우저 운영 데이터 보호와 다른 증거다. 이후 동시 React/보고 변경의 최종 보호 검사는 root 마감 범위다.

## 7. 남은 작업과 게시 상태

- React 100개 초과 Plan의 기존 receipt cap과 전체 표시 연결은 별도 제한 작업 중이다. baseline 브라우저에서100개 저장1 PASS,101개 저장/취소2 FAIL이 확인됐으며 이 standalone 결과로 해결됐다고 쓰지 않는다.
- K3-C C1/C2의 입구·원문 미리보기와 명시 원문 연습 진입은 설계 단계다. 세 원본의 모든 요구 충족률을 이 B3 검사만으로 갱신하지 않는다.
- 보고 HTML의 최신5화면·링크 QA는 별도 후속이며 이 문서 작성만으로 PASS를 표시하지 않는다.
- 실제 Android Chrome/iOS Safari·가상 키보드·보조기술: **NOT_RUN**. 관찰 사용자: **0명**.
- commit 없음 / push 없음 / PR 없음 / Preview 없음 / Production 없음.

보고 스킬에 따라 실제 실행·역사 결과·남은 작업·게시 상태를 분리했다. 별도 Figma나 새 제품 화면을 만들지 않았다. 재집계 명령은 저장소에서 `node output/poc-gap-implementation/k3b/summarize-feedback-existing-evidence-20260906.cjs`다.
