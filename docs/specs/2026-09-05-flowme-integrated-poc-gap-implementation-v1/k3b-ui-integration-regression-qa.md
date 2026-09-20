# K3-B B1 — 편집 화면 연결과 기존 회귀

2026-09-05. B1의 제목·개인 메모·계획 날짜 mode를 실제 standalone 화면에 연결했다. **개인 구간·전체 순서(B2), 변경 요약·영수증(B3), K3-C까지 끝났다는 판정은 아니다.** 선정 회귀를 마치고 조작용 두 HTML을 아래 FB17 검증본으로 갱신했다. B2 모델 작업 중에도 이 사용자용 검증본은 유지한다.

## 연결한 범위

- 원문을 따른 값과 직접 입력한 제목·메모를 구분한다. 빈 메모·공백·원문 설명과 같은 개인 메모도 별도 의도로 보존한다.
- 날짜는 상속·날짜 지정·날짜 미정의 입력을 구분한다. 반복 조건상 현재 지원하지 않는 조합은 이유를 보여 주고 저장하지 않는다. 원래 실행 날짜·완료·Flow 소속을 바꾸지 않는다.
- Item 반영은 부모 Plan 초안에만 적용한다. 마지막 Plan 저장에서 기존 source-bound E2 transaction을 사용한다. 실패·재시도·닫기·Escape·Back·Undo·reload는 각 저장/복구 소유자를 유지한다.
- current/Undo P와 원문을 함께 읽을 수 없는 후보는 쓰기 전에 차단한다. 표시 결과는 편집 권한을 발급하지 않는다. 정상 원문을 확인하지 못한 no-P는 제한된 개인 실행 조회다.
- v3와 구 v2/Quick의 정당 복구·confirmed 정리를 구별한다. 복원은 끝났지만 표시할 수 없으면 입력을 읽기 보관하고 재확인/명시 버리기를 제공한다. 구 v2 초안을 v3로 자동 변환하지 않는다.

## 현재 실행 근거

| 검사 | 결과 | 범위 |
|---|---:|---|
| 모델·실제 app 함수 합동 | 612/612 PASS | 기존579+PD22+독립 app VM11, 총26개 파일. skip/cancel/todo0, 18,524.808ms. 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-ui-model-runtime-final-2026-09-05T13-14-28-958Z.json`) |
| 새 mode 브라우저 | 16/16 PASS | 15개 원래 시나리오+실제 raw-v2 복구1개. 5 viewport 포함. [상세 QA](./k3b-plan-modes-ui-qa.md) |
| 기존 C3 저장 연결 | 16/16 PASS | 현재 memory HTML에서 Quick·Plan·기본/구 저장소·명시 삭제·reset·작성 handoff·복구·경쟁 저장을 실행. 최종 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/c3-storage-ui-regression-final-2026-09-05T13-12-15-257Z.json`) |
| 기존 K1-B 닫기 회귀의 새 K3-B copy | 20/20 PASS | 첫19 PASS/1 하니스 FAIL 뒤 실제 retained retry handle로 보완하여 전체 재실행. 29context·허용API147회·금지0. [QA](./k3b-k1b-regression-qa.md) |
| 원문 비교 stale/ABA UI | 2/2 PASS | 3격리context·정상source1쓰기·stale0·관찰ABA0→명시refresh1쓰기. 실제 두 탭 경쟁은 아님. [독립 QA](./k3b-personal-plan-display-independent-qa.md) |
| 생성 HTML·모델·runtime·host unit | 151/151 PASS | 최종 FB17, skip/cancel/todo0,753.5124ms. isolated presenter 하니스의 새 의존 누락3건 보완 후 전체 재실행. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b1-final-html-model-regression-fixed-2026-09-05T13-26-03-322Z.json`) |
| npm test | 2,250/2,250 PASS | 실제15개 command그룹,25.506초. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-test-b1-ui-2026-09-05T13-24-54-500Z.json`) |
| production build | PASS | 18정적경로,45.777초, BUILD_ID `qlTYGTWpw4H7HIFB8aU92`. 배포 아님. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/production-build-b1-ui-2026-09-05T13-25-04-706Z.json`) |
| 생성 HTML host | 8/8 PASS | 실제 최종bytes/SHA, 11파일 전후exact. 격리host 도우미 검사이며 기기검사 아님. [QA](./k3b-generated-html-host-qa.md) |
| 현행 build gate·생성 HTML 시간 | 5/5 PASS | BT08/09+네origin조작·exactquery·손상fallback 선정3개. 과거 캡처 쓰는 전수 E2E 실행 아님. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b1-generated-gates-time-2026-09-05T13-32-18-581Z.json`) |
| 실제 사용자 file URL | 1/1 PASS | 실제 standalone.html을 새390×844 Chromium에서 편집→저장→reload→Undo→reload. target2+journal set4/remove2=8회. 첫 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/direct-local-file-first-20260905-01.json`) |

612는 이전601·579·개별11·177 등을 다시 합산한 수가 아니다. browser 시나리오 안의 viewport/fixture 반복과 실제 file의 같은 테스트 캡처 확인 재실행1/1도 고유 등록 테스트 수로 더하지 않는다. npm test·모델·브라우저는 서로 겹칠 수 있으므로 하나의 고유 검사 총계로 합산하지 않는다. 전체254개 부모/424개 원자 요구의 충족률 재계산도 아니다.

## C3 회귀를 바꾼 정확한 이유

현재 builder를 매번 읽는 기존 `personal-workspace-k2b-c3-storage-ui.spec.ts`의 C3UI07과 C3UI16만 새 mode를 명시 선택하게 했다. C3UI07은 raw task.memo를 직접 바꾸던 과거 기대 대신 실제 PD가 읽은 개인 메모를 검사하고, **raw flows/tasks 전체·source bytes 불변과 전용 metadata 존재**를 함께 검사한다. Quick과 구 journal의 평문 입력·복구 계약은 바꾸지 않았다.

첫 실행은15 PASS/1 FAIL이었다. C3UI16에서 과거처럼 Flow 제목 input을 바로 찾다가 timeout이 났다. 상속 mode에는 input이 없으므로 사용자와 같은 `직접 입력` 선택을 추가했다. 저장 경합/늦은 callback/운영 불변 assertion은 유지했다. 첫 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/c3-storage-ui-regression-2026-09-05T13-06-10-269Z.json`)에 실패를 남겼고, 수정 후16개를 전체 다시 실행했다.

- 변경 전 시험 백업 SHA: `DF3DE309A2185E931AAA9BFA5A66A6734660027F879EA83A7B3B275BB7EC3AF7`. exact 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-c3-regression-update/personal-workspace-k2b-c3-storage-ui.spec.ts`).
- 변경 후 시험 SHA: `30642691C8ED2B1BA1C623FD8F0CDED5930FBC2BF449D1401C79F7FBE0A29999`.
- 최종 app SHA: `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15`.
- 최종 memory HTML SHA: `fb17fda35e1141c50359bee3cc5b85a39dc89f9c0c10809570adb70b757d8be3`.

C3 최종16개의 afterEach는 각 격리 저장소의 운영 sentinel exact, 허용 key 밖 호출0, clear0, console/page error0을 검증한다. root 실행은 line reporter와 전체 로그를 보존했으며 **C3 전체 API 호출 합계를 별도로 집계하지 않았다**. 새 mode16의 별도 JSON 집계와 혼동하지 않는다. 실제 사용자 profile이나 서버 운영 데이터를 읽고 대조한 증거도 아니다.

## 독립 검토에서 잡은 실제 연결 결함

원문 검토의 오래된 working store가 최신 표시 cache의 raw를 CAS 기준으로 삼는 오류를 재현해 고쳤다. opening raw/관찰 epoch를 끝까지 확인하고, 관찰된 ABA 뒤에는 명시 새 비교만 허용한다. 정상 원문 비교 저장은 PoC source key에 쓰는 기존 승인 경로이며 개인 Plan 편집의 source0쓰기와 구분한다.

구 v2 복구 뒤 active editor만 남고 source 표시 gate의 재확인이 막히는 오류, v3 전용 review 필드를 공통 복구 화면이 읽는 오류, 성공 재개 뒤 예전 read-error cache가 남는 오류를 순서대로 RED 확인했다. 복구 token을 표시 준비 전 소비하지 않고 실제 source 조회를 표시 cache에도 반영해 해결했다. 모델/VM 성공과 실제 raw-v2 browser U13을 별도로 기록한다. 과거 RED를 지우거나 처음부터 통과한 것으로 기록하지 않는다.

## 화면 평가와 한계

390×844·375×812·844×390·1024×768·1440×900의 Plan/Item 오류 화면을 자동 geometry·9점 hit로 검사했다. root가 각 크기의 full-page 캡처1장씩 총5장을 직접 읽었다. 원문/개인/실행 구획, 오류와 관련 입력, 하단 반영/전체 저장 버튼이 구별된다. 작은 화면의 긴 양식은 스크롤을 전제로 한다. full-page 캡처가 모든 버튼의 동시 viewport 노출을 뜻하지 않는다.

실제 file의 full-page PNG에서 검은 skip-link가 제목 부근에 찍힌 현상은 별도 조사했다. 전후 scrollY724에서 실제 fixed rect는top-60/bottom-17.5로viewport밖이고, full-page 위치664는724-60이었다. viewport PNG에는 없었다. 제목을 실제 화면중앙으로 옮긴 뒤에도 입력9점 모두 hit PASS로 확인했다. 첫 캡처를 보존하고 제품/CSS는 바꾸지 않았다. 같은1개 geometry 재실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/direct-local-file-geometry-20260905-02.json`)은3.03초 PASS이며 저장호출8회도 동일하다. 처음 제목이 화면밖인 상태만 보고 가림0이라고 추정하지 않았다.

시각적 세부 완성도나 관찰 사용자 사용성이 확정된 것은 아니다. 실제 Android Chrome/iOS Safari·OS Back/IME·보조기술은 NOT_RUN, 관찰 사용자0이다. commit/push/PR/Preview/Production은 모두 미실행이다.

## 생성물과 변경 파일

- 직접 조작할 HTML (로컬 전용 근거: `../../../docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`), 동일 Android 전달용 파일 (로컬 전용 근거: `../../../docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`): 각각 **1,380,751bytes**, SHA256 **FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3**. Android라는 파일명이 기기 검사를 뜻하지 않는다. 이전B14A 두파일은 `output/poc-gap-implementation/k3b/before-b1-user-html/`에 exact보존했다.
- B1 공유 모델/연결: standalone assets의 `personal-plan-context.js`, `workspace-checkpoint.js`, `plan-item-session.js`, `workspace-storage.js`, `workspace-permanent-delete.js`, 새 `personal-plan-editor-controls.js`, `personal-plan-display.js`. 각 단계 QA와 백업/테스트에 변경근거를 연결했다.
- 화면: 같은 assets의 `app.js`, `style.css`, `build-single-file.cjs`. 최종 app `595CD60B…`, style `7E025F55…`, builder `CD9FFBEA…`. 원본 앱의 globalnav/default /my/theme를 편집하지 않았다.
- 검증: 새 mode UI16·K3B 닫기copy20·sourceCAS2·directfile1 spec, PD순수22/실제함수11. 기존 C3UI07/16만 explicit mode로 보완했다. 기존 시간 presenter6개는 실제C/PD 의존을 공급하도록 수정하고 원래 기대를 유지했다. 실제 제품 실패와 하니스 기대/의존 실패를 각각 기록했다.
- 기기 후보pin5곳: `scripts/personal-workspace-poc/serve-p3h1-android-device.mjs`와 `.test.mjs`, `lib/flow/personal-workspace-poc-p3h1-android-evidence.ts`, P3H1 runner assets의 `model.js`, host spec. 현재후보만 FB17/1,380,751에 맞췄고 과거 기기 증거는 바꾸지 않았다.
- 보고: 이QA·독립QA·mode/회귀/host QA·진행원장·report-data와 생성 한국어 보고서. pre-existing dirty 전체를 소유한 것으로 취급하지 않았다.

## 다음 gate

B2는 stable section 소유와 global full-ref 순열의 버전 계약을 먼저 구현한다. implicit/seed/source-owned 구간을 새 편집권한으로 승격하지 않는다. 순열은 raw Step 소속·실행일·완료·TimelineOrder를 바꾸지 않아야 한다. 이어 B3의 변경 요약·영수증, K3-C를 진행한다. 반복 미정 조합·추가source membership/chain은 현재 미지원이다. 이 제한을 새 영구 정책으로 확정하지 않는다.
