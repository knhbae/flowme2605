# C1-b — 단일 HTML 읽기 입구 검증

2026-09-06 KST. **최소 읽기 연결을 조작용 HTML에 반영했다. C1 전체는 진행 중이다.** 전체 K3-C·통합 PoC 완료 보고가 아니다. [실행 계약](./k3c-c1-standalone-entry-contract.md)과 [C1 설계](./k3c-c1-entry-preview-design.md)를 따랐다. React의 [이전 왕복 검증](./k3c-c1-react-return-qa.md)과 이번 standalone 증거를 분리한다.

## 세 원본과 이번 변경

| 원본 요구 | 변경 전 | 현재 후보 | 판정 범위 |
| --- | --- | --- | --- |
| 개발1 K-D1-04·10 / 사본 찾기·읽기·복귀 | standalone에는 기존 사본 검색 입구가 없었음 | 네 origin의 exact saved tuple을 읽고 제목·Item 제목을 검색. 목록→개인 결과→실행 상태 확인→복귀 | 로컬 saved-copy 읽기 연결. canonical Map·known URL 공급 동등성은 아직 아님 |
| v4.1 / 같은 사본·실행 위치 | 기존 개인공간에서만 확인 | 폴더·개인 날짜·완료를 읽기 전용으로 확인하고 네 결과의 source/row/occurrence identity 유지 | 검색 자체로 폴더·완료·날짜·순서·Undo를 쓰지 않음 |
| 개발2 / 작성 원문·선택·입력 이력 | 검색 왕복 경로 없음 | 작성 subtree를 연결된 hidden/inert 상태로 유지. 같은 textarea·selection·native Undo. 저장 실패·foreign draft는 덮지 않음 | 일반 자동화 입력·브라우저 Back. OS IME/OS Back·실기기 증거 아님 |

전체 254개 부모/424개 원자 요구를 다시 전수 판정하지 않았다. 이 연결을 전체 충족률 증가로 환산하지 않는다.

## 필드·쓰기 경계

- `personal-entry-read.js`: private WeakMap packet, 분리된 버전 계약, current와 실제 도달 가능한 Undo P의 PD gate, full tuple·membership·origin 검증. 출력은 저장 사본의 identity와 현재 개인 표시 제목이다.
- `personal-entry-query.js`: 기존 canonical resolver를 메모리 bundle로 재사용한다. 빈 canonical 모델은 입력 종류와 정규화에만 사용하며, 실제 조회는 genuine local catalog 제목·Item 제목이다. Map origin을 바꾸거나 group을 만들지 않는다.
- 로컬 seed에는 출처 URL·원문 전체·Map child 관계가 없다. URL은 명시 miss, Map은 그룹 정보 없음이다. `sourceTitle`을 외부 출처명으로 포장하지 않는다.
- 원문 기준은 보유한 원문 제목·설명·완료 기준을 읽는다. 합성 `projected-source`를 원문 전체로 표시하지 않는다. 원래 구조를 보유하지 않은 사본은 **원문 기준 네 결과 미제공**이며, 개인 결과 네 보기와 구분한다.
- 개인 결과는 기존 PD structure → M resultProjection, 날짜별 rank reader를 쓴다. 읽기 출력에 편집·완료·날짜 이동·export 제어가 없다. 기본 no-prop renderer 출력은 before와 비교한다.
- 읽기 직전과 복귀 직전에 workspace authority·source/epoch·draft/library bytes를 확인한다. 외부 A→B→A는 이전 읽기 owner를 폐기한다. 다른 draft/library가 남아 있으면 복귀 후 쓰기도 막는다.
- 기존 `/my`, 운영 key/schema/writer, P/C/E2/S/PD 저장 계약·M seed는 이번 변경 대상이 아니다. 저장은 여전히 PoC prefix에만 허용되며 clear는 금지한다.

## 실패를 먼저 남긴 기록

| 실행 | 실제 결과 | 처리 |
| --- | --- | --- |
| 기존 B01/B02 baseline02 | 정상 부팅·작성 저장 이후 입구 부재 2 RED | 같은 spec을 유지해 후보에서 2/2 PASS |
| 신규 R01/R02 frozen HTML baseline | 정상 부팅·작성 저장 이후 입구 부재 2 RED | 별도 신규 시나리오의 시작 근거 |
| reader 최초 | 신규 API 부재 20/20 RED | full identity·typed title·validator shape까지 보강, 신규22 PASS |
| query 최초 | 신규 API 부재 17/17 RED | canonical 입력 판정·local query17 PASS |
| 후보13 이전 중단 실행 | R01/R02의 searchbox/textbox 하니스 불일치, R03 중단 | label selector로 수정. 최종 JSON 없는 부분 실행을 완주로 세지 않음 |
| R11 multiline | LF 입력이 공백으로 변함, 1 RED | 하나의 textarea로 변경. 자동 작성 없이 exact LF 유지 |
| R12 외부 draft | 외부 B를 복귀 후 A+입력으로 덮음, 1 RED / draft set1 | 복귀 fresh read·full bytes drift latch. 집중 검사에서 추가 쓰기0 |
| EPR 결과 최초 | 6개 중3 PASS/3 RED: 표 회차·시간, occurrence ID, row manifest 누락 | 8열과 exact identity를 복원. 신규6 PASS |
| 모델 합동 최초 | 185개 중181 PASS/4 FAIL | actual function VM에 신규 personalEntry 변수가 없는 하니스. 기존 assertion 유지, inactive entry stub만 보충 |
| 기존 feedback 최초 | 13개 중9 PASS/4 FAIL | 같은 VM 주입 누락. before backup 후 inactive entry stub만 보충 |
| HTML 생성 후 전체 npm 첫 재실행 | 942개 중933 PASS/9 FAIL | 제공 도구가 이전7D의 크기·해시를 고정해 새 HTML을 거부. 현재 후보 pin5곳만 exact 치환 후 관련56·host8 PASS. 기존9실패를 seed 기한 실패와 혼동하지 않음 |

구문 검사, 등록 목록, assertion 반복은 등록 테스트 수와 구분한다. 최초 module missing의 뒤쪽 기대는 도달하지 않았다.

## 자동 검사 — 확인된 결과

| 검사 | 실제 실행 수 | 결과·증거 |
| --- | --- | --- |
| standalone 순수 모델·실제 함수 렌더·기존 회귀 합동 | 204 | 204/204 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/standalone-entry-models-combined-final-2026-09-06T00-56-00-585Z.json`), 14파일. 실행 전후27파일 exact |
| 기존 entry baseline 시나리오 | 2 | 2/2 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-host-candidate-20260906-01.json`). 새 입구·같은 textarea·native Undo |
| multiline·foreign draft·실제 Back 집중 | 3 | 3/3 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-read-owner-history-focused-20260906-01.json`). 전체 신규 시나리오와 중복 합산하지 않음 |
| 신규 실제 앱 읽기 시나리오 | 13 | 13/13 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-read-candidate-20260906-02.json`), retry/skip0. 아래 R01~13 |
| 실제 생성 HTML 직접 file URL | 10 | 10/10 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-read-direct-file-20260906-01.json`). 위13개 중10개 재실행, 고유23으로 합산하지 않음 |
| 기존 작성·Plan 브라우저 회귀 | 87 | 87/87 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-related-regression-20260906-01.json`), 기존 spec4개 assertion 변경0. K1-A38/K3-A22/B3피드백15/B2구조12, React30/standalone57 |
| 제공 도구 pin 회귀 | 56 + 8 | 기존 모델56/56 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-candidate-pin-model-20260906-01.log`), 호스트8/8 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-candidate-pin-host-20260906-01.json`). 실제 기기 아님 |
| 최종 pin 반영 후 npm test | 2,030 | 2,029 PASS / 1 FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-final-pinned-npm-2026-09-06T01-12-09-630Z.json`). 아래 기존 seed review 기한 실패 |
| npm 중단 뒤 approved/public 별도 실행 | 201 + 19 | 201/201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-approved-regression-01-2026-09-06T01-01-17-954Z.json`), 19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-public-regression-01-2026-09-06T01-01-20-208Z.json`) PASS. final pin 이전 실행이며 관련 제품 변경 없음 |
| 한국어 보고서 실제 file | 5 | 최종5/5 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-report-final-20260906-02.json`), 다섯 viewport. 새 카드390/1440을 root가 직접 읽음. 이전01의5개와 중복 합산하지 않음 |
| 실제 HTML 생성·기본 모델 회귀 | 119 | 119/119 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-standalone-generated-regression-2026-09-06T01-16-21-660Z.json`), 기존 standalone.test.cjs 변경0 |
| 최종 production build | 등록 테스트 수 아님 | PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-final-pinned-build-2026-09-06T01-13-09-153Z.json`), 현재 pin 이후 타입·18정적경로, BUILD_ID `bc6jLYIGWQ0HmQzisX3Yk`. 배포 아님 |
| 현재 build gate·기존 원문시간 | 5 | 5/5 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-final-gates-time-20260906-01.json`), exact query·malformed recovery `/my` fail-closed, four origins·shadow move/완료/Undo/reload, 원문09:30 |
| 문서·스킬 sync | 테스트 수 아님 | PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-docs-final-2026-09-06T01-21-36-098Z.json`), 필수16문서·로컬 링크6,376개. scoped diff check PASS |

204개 = catalog22 + query17 + 기존 PD/C138 + canonical8 + feedback13 + 새 결과6. 이전160/47/6 집중 실행을 별도 고유 검사로 합산하지 않는다. 결과6 안의 기본12출력 비교와 네 보기 반복도 부검사다.

`npm test`는 기존 `normal user routes fail the standard suite when source review is due`에서 실패했다. banana-peanut-recipe-video, monstera-care-routine, water-purifier-filter-cycle, plank-30-day-challenge의 review_due=2026-06-07이다. seed·날짜·assertion을 바꿔 통과시키지 않았다. npm에서 뒤쪽 approved/public 명령은 도달하지 않았으므로 위 별도 실행과 구분한다. pure adapter의 no-I/O는 시험의 ambient/injected 함수 범위이며 모든 host 의존성이나 악의적 Proxy 실행까지 증명했다는 뜻은 아니다.

## 신규 시뮬레이션별 결과

| ID | 실제 조작·기대 | HTTP | 실제 file |
| --- | --- | --- | --- |
| R01 | 네 origin exact 사본4·검색·miss·입력 지우기·조회0쓰기 | PASS | PASS |
| R02 | 작성→찾기→Escape, 연결된 같은 textarea/inert·native Undo | PASS | PASS |
| R03 | 변경 없는 seed의 원문 전체·URL·Map·완료 기준 미보유 표시 | PASS | PASS |
| R04 | 명시 합성 fixture의 source/개인 필드·네 개인 결과·exact Item 상세 | PASS | PASS |
| R05 | 미리보기→실행 상태 요약→복귀, query·사본·보기 유지 | PASS | PASS |
| R06 | 같은 사본은 보기 유지, 다른 사본은 Text로 초기화 | PASS | PASS |
| R07 | 실제 별도 HTTP 문서의 source A→B→A, 이전 owner 폐기·작성 DOM 보존 | PASS | 미선택: HTTP 전용 |
| R08 | 실제 별도 HTTP 문서의 workspace A→B→A, 이전 선택 폐기 | PASS | 미선택: HTTP 전용 |
| R09 | unsafe·미보유 URL은 일치 사본/외부 이동/초안 생성0 | PASS | PASS |
| R10 | 다섯 viewport의 긴 필드·선정 행동 rect/9점·키보드·넘침 | PASS | PASS |
| R11 | 검색 LF·공백 exact, 제출·작성 복귀·native Undo | PASS | PASS |
| R12 | 외부 정상 draft B 뒤 A로 복귀·입력 시도: B 덮어쓰기0 | PASS | 미선택: HTTP 전용 |
| R13 | 실제 브라우저 Back, 같은 URL·textarea·선택·opener·native Undo | PASS | PASS |

R05는 **입구 내부 읽기 요약**이다. 기존 실행 상세를 열어 완료·이동한 뒤 돌아오는 경로까지 충족한 것은 아니다. R03의 미보유 상태 PASS도 원문 네 결과 전체 동등성 PASS가 아니다. R04/R10의 설명·기준은 fixture가 명시적으로 공급한 값이며 외부 실제 사실을 수집한 결과가 아니다.

## 다섯 화면 평가

| 크기 | 관측 | 판정·남은 점 |
| --- | --- | --- |
| 390×844 | 제목 감김, 원문 설명·기준·내 메모 구획, 가로 넘침0 | 선정 행동 접근 PASS. 긴 제목이 첫 화면을 크게 차지하고 상세는 세로 스크롤 |
| 375×812 | 공백 없는 긴 source/메모가 폭 안에서 감김 | 선정 행동 접근 PASS. 모든 CTA의 첫 화면 동시 노출을 주장하지 않음 |
| 844×390 | owner/결과가 같은 본문 흐름, 좁은 높이에서 스크롤 | 선정 행동 접근 PASS. 상단 정보 밀도·왕복 거리 개선 잔여 |
| 1024×768 | 두 원본 owner와 네 보기 접근, 문서 폭 유지 | 가로 넘침0. 긴 제목·구간 반복은 C3 잔여 |
| 1440×900 | 가운데 읽기 영역·owner 구분·상세 필드 분리 | 가로 넘침0. 원본 결과 전수 사용성 판정은 아님 |

HTTP/actual-file 각각 preview5+detail5 PNG를 만들었다. 담당 검토자는20장을 직접 읽었고 root는 HTTP의 preview5·detail390/844 및 보고서390/1440을 직접 읽었다. R10의 full rect·44px·9점 hit 검사는 **검색 입력·개인 owner·목록 복귀**로 한정한다. 그 밖의 클릭 통과를 모든 핵심 행동의 geometry 전수 검사로 확대하지 않는다. HTTP 390 미리보기 (로컬 전용 근거: `../../../output/playwright/c1b-read-candidate-20260906-02/personal-workspace-k3c-sta-a87f7-ag-actions-without-overflow/preview-390x844.png`) · 상세 (로컬 전용 근거: `../../../output/playwright/c1b-read-candidate-20260906-02/personal-workspace-k3c-sta-a87f7-ag-actions-without-overflow/detail-390x844.png`).

## 저장·파일 불변 증거

HTTP13 context의 제품 API33회와 actual-file10 context의18회는 모두 작성·native Undo 구간이다. 읽기 구간 set/remove/clear0, R12 복귀 후 차단된 입력 저장0, 허용 prefix 밖·clear·운영 key/value 불일치·console/pageerror0을 첨부에서 root가 다시 집계했다. HTTP의 실제 외부 fixture 쓰기5회(source2/workspace2/draft1)는 제품과 분리했다.

조회 종료 직전 `unchanged()`로 전체 예상 key/value를 비교했다. native Undo 후에는 초안이 정당하게 바뀌므로 첨부의 `readExactAtEnd`는 null이며 false가 아니다. 외부 B 시나리오는 시험에서 명시한 B만 예상값에 반영한다. 사용자 프로필의 모든 운영 데이터를 직접 검사한 것이 아니라 격리 context의 exact 운영 fixture와 호출 경계를 검사했다.

최초551 보호 원장은 재캡처하지 않았다. 2026-09-06T01:13:54.343Z 보호 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/protected-latest.json`)는 허용 변경31/예상 밖0 PASS다. 원본 `D:\flowme2605\flow-mvp`와 미소유 내용은 수정·삭제·stage하지 않았다.

## 변경 파일과 소유

모두 현재 격리 worktree 안이다. `D:\flowme2605\flow-mvp`는 미소유 상태를 보존한다.

closeout (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1b-closeout-2026-09-06T01-20-16-512Z.json`)는 소유 scope의 권장 검사만 출력했다. 실제 검사 결과는 위 표이며, broad dirty 경로79개를 이번 변경 파일 수로 세지 않는다. app/style/builder와 두 VM 시험의 before 대비 diff, 현재 pin5곳의 byte 치환을 별도로 검토했다.

| 파일 | 이번 역할 |
| --- | --- |
| assets/personal-entry-read.js / .test.cjs | 새 genuine read catalog와22검사 |
| assets/personal-entry-query.js / .test.cjs / -runtime.cjs | canonical 입력 분류·local query와17검사 |
| assets/personal-entry-ui.js | retained host·검색·owner·목록/실행 상태/Back·현재 읽기 경계 |
| assets/personal-entry-result.test.cjs | default exact 및 읽기 결과6검사 |
| assets/app.js | 기존 작성/결과와 새 host 연결, read-only 표시, 복귀 draft/library 보호 |
| assets/style.css / build-single-file.cjs | 기존 token을 쓰는 scoped layout·새 runtime 동봉 |
| standalone-ko.html / android-single-file-ko.html | 최종 builder의 exact 사용자 파일 두 개 |
| assets/personal-plan-display-review.test.cjs / k3b-plan-feedback-app.test.cjs | 기존 assertion 유지, inactive entry VM 주입만 추가 |
| tests/e2e/personal-workspace-k3c-standalone-entry.spec.ts | 최초2 baseline, 제품 수정 뒤 동일 기대 재실행 |
| tests/e2e/personal-workspace-k3c-standalone-entry-read.spec.ts | 신규 상세·ABA·화면·입력·Back 시나리오 |
| 이 QA·계약·progress·한국어 보고서 | 요구·전후·실행 수·부분/미실행 구분 |
| P3-H1 제공·증거·runner·host 검사5곳 | 현재 후보의 bytes/SHA 정적 pin만 변경. 과거 실행 기록·기기 상태 변경0 |

`assets/`는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/`다. 기존 app/style/builder와 두 VM spec, 이전7D 사용자 HTML은 before 폴더 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/before-standalone-entry-20260906-01/`)에 exact 사본을 먼저 남겼다. 보고서4개는 report before (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/before-standalone-entry-report-20260906-01/`), 후보pin5개는 pin before (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/before-c1b-candidate-pin-20260906-01/`)에 보존했다. pin5개의 승인된 문자열 치환 외 byte 변경0을 비교했다.

두 사용자 HTML은 각 **1,866,335bytes / SHA `9183FC516A636A7FD1B21C36EE64CCE529646C565A37A4CF5F14187CBA825044`**다. 실제 file URL로 열기 전 매번 원본 bytes=buildText exact, 실행 전후 사용자 파일·builder 입력 해시 exact를 확인했다. app은 `141055AFE57B5999F36D6F39CF3AECF45C75DFF8F322DA6F00AF1E9FF4A0737C`, controller는 `3B201CFA81228536E552F3F190FDC549E6A08A7617787CA68ECD2506EFC2AA85`다. 생성된 파일의 HTTP 검사와 실제 file 검사를 구분한다.

## 남은 범위와 공개 상태

[C1-c1 설계](./k3c-c1-explicit-authoring-design.md)는 현재 검색 입력의 명시 새 작성과 초안 복귀 안전 조합, C1-c2는 실제 개인공간 상세 방문·복귀를 우선한다. 제출 뒤 수정한 입력을 오래된 resolution으로 넘기지 않고, 기존 draft를 먼저 지우는 일반 new-authoring을 그대로 연쇄 호출하지 않는다. 외부 library 충돌·helper 완료 뒤 입구는 아직 실제 조합 미검사다. 반복 열기/닫기 뒤 history 중복, guard로 막힌 입구의 안내도 확인해야 한다.

canonical known-URL·multi-child와 local seed의 공급 차이, 실제 source/개인 비교 범위는 계속 구분한다. C2 연습 진입 → C3 로컬 UI → K4 소유·버전·호환 설계 순서를 유지한다. 안전한 source 미보유 상태를 전체 기능 동등성으로 판정하지 않는다. 이번 UX 스킬은 기존 원문·개인 owner 구분과 작성기 유지, report 스킬은 세 원본의 전후 비교·실제 file QA 구분에 영향을 주었다. Figma NOT_USED.

| 항목 | 상태 |
| --- | --- |
| Android Chrome / iOS Safari 실제 기기 | NOT_RUN |
| 실제 OS IME / OS Back / 보조기술 | NOT_RUN |
| 관찰 사용자 | 0명 |
| commit | 미실행 |
| push | 미실행 |
| PR | 미실행 |
| Preview | 미실행 |
| Production | 미실행 |
