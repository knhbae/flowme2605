# 공개 반복 사본 — 순서 식별자와 출력 후 정확한 복귀

2026-09-14 · P02/P03/P04/P07/P08 · S04/S05/S08/S09/S10의 선행 연결이다. 실제 반복 공개·사본 저장을 완료한 보고가 아니다.

## 발견한 문제와 이번 변경

사본 가져오기·문서 참조를 조사하면서 공개 회차의 숫자형 회차 번호를 공통 순서 validator가 거절하는 것을 확인했다. 기존 구현의 실제 회차로 만든 표적 검사 1개가 `false !== true`로 실패했다. 기존 순서 키를 문자열로 바꾸거나 옛 origin으로 재명명하지 않고 공개 사본 전용 typed tuple을 검사하도록 수정했다.

출력 복귀에도 별도 문제가 있었다. 원래 복귀 reader는 legacy/creator/native/private-plan만 찾았고, 공개 사본 tuple의 마지막 날짜와 숫자 번호를 해석하지 않았다. 더구나 순서용 회차 key만 링크에 넣으면 같은 규칙의 새 일정 판본을 수용했을 때 출력 당시와 현재를 구별할 수 없다.

| 요구 | 이번 연결 | 완료로 세지 않는 범위 |
| --- | --- | --- |
| 같은 회차의 기간 순서 | 숫자 번호·원래 시작일·원래 날짜·authoring-v1 규칙을 보존한 key 검증 | 실제 공개 사본의 순서 저장 UI |
| 출력한 정확한 회차로 복귀 | 별도 복귀 key에 당시 수용한 일정 판본과 공개 whitelist 일정 snapshot을 고정 | 공개 저장 gate가 열린 실제 다운로드·브라우저 복귀 |
| 먼 회차 찾기 | 유한 회차는 실제 ordinal로 조회, 종료 미정은 허용된 마지막 519주까지의 창 사용 | 조회 상한 밖의 임의 회차 지원 |
| 날짜 변경·날짜 미정·완료 보존 | 개인 실행 날짜 대신 원래 회차를 찾고 그 회차의 현재 개인 기록을 표시 | 실제 사본 계획 변경 UI 전체 |
| 업데이트와 복구 | 미수용 최신판은 무시. 일정 판본을 수용했으면 옛 링크의 자동 실행을 막고 정확한 원문 행의 명시 복귀 위치 제공 | 원본 갱신·두 Undo의 전체 브라우저 왕복 |

## 교체 가능한 Program v1 연결 계약

- `public-copy-occurrence/1`은 기존 순서/실행 identity이며 변경하지 않는다. 숫자를 문자열로 정규화하지 않는다.
- 출력 복귀의 `public-copy-return/1`에는 사본·Flow·Item·원래 시작일·규칙·숫자 회차·원래 날짜와 `scheduleVersionId`/공개 일정 snapshot만 담는다. 개인 메모·완료·원본 raw/행 포인터를 snapshot에 넣지 않는다.
- 출력 복귀 key는 순서 저장값으로 허용하지 않는다. 실제 실행 key와 복귀 시 확인할 판본 근거는 서로 다른 역할이다.
- 새 reader는 현재 actor의 실제 사본, 필드별로 수용한 고정 판본, 진짜 authoring expander의 정확한 key를 대조한다. 제목·첫 회차·가까운 날짜·repository 최신판으로 대신 찾지 않는다.
- 이 reader는 전체 envelope 검사 아래의 읽기 전용 consumer다. 준비용 계약 fixture로 직접 검사할 수 있지만 저장·화면 진입 권한을 부여하지 않는다. 기존 `validateProgramData`/공개 일정 저장 gate는 그대로다.
- 현재 공통 출력 projection과 복귀 route consumer에 연결했다. 시작 미정의 개인 명시 설정, 실제 사본 index/header/하위 확인/다중 문서 참조, 공개 정의 자체의 출력·제안·일정 수용은 여전히 C/D 잔여다.

## 현재 실행한 검사

새 검사 11개를 포함한 공개 사본 계약 28/28, 기존 순서·출력·복귀를 함께 실행한 표적 50/50을 확인했다. 타입 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T18-11-15-423Z.json`)는 329개 입력 파일·진단 0이다.

새 검사는 숫자/구분자 identity, 잘못된 tuple, 출력 판본 고정, 실제 source 속성과 URL 왕복, 장기 월말/마지막 무기한 창, 완료한 회차의 이동/날짜 미정, 최신판 미수용과 명시 수용, 가짜 회차/일정 snapshot, 다른 actor·제외·보류·보관·입력 불변을 다룬다. 잘못된 tuple의 여러 입력을 독립 실행 테스트 수로 부풀리지 않는다.

최종 전체 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T18-11-21-978Z.json`)는 143파일·1,341/1,341·skip0·검사 중 소스 변경0이다. npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T18-19-06-729Z.json`)는 2,031실행·2,030통과·기존 출처 검토기한1실패이며, 검토기한이 지난9개 자료를 임의 갱신하지 않았다. build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T18-20-18-470Z.json`) `o_r8ubxyEMCsWD5CRp_vw`는 통과·소스 변경0이다. 승인 회귀201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T18-22-16-076Z.json`)과 공개 표면19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T18-22-33-715Z.json`)도 통과했다. 전체 검사·빌드·현재358개 소스 파일 hash 불일치0을 확인했다.

## 기존 초안 브라우저 회귀와 보호 경계

같은 보존 초안15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/public-copy-target-draft-regression-2026-09-13T18-22-35-016Z.json`)은 위 새 빌드와 document build/route chunk가 일치한다. 재열기·미리보기·같은 원본 확인·Escape·reload와 원문/개인/공개 data 동일을 확인했다. 쓰기0·허용 prefix 밖0·console/page error0이며 전후 계측의 setItem/removeItem/clear 감시가 실제 설치된 상태임을 별도 읽기로 확인했다. 이 프로필의 보호 운영 키는0개이므로 채워진 운영 데이터 불변의 증거로 확대하지 않는다.

375×812,390×844,844×390,1024×768,1440×900에서 스크롤해 위치시킨 반복 입력란의 초점·클릭 적중·화면 포함, 페이지 가로 넘침 없음과 dialog 넘침0을 확인했다. 화면의 모든 행동이나 실제 OS 키보드 검사가 아니다. 375 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-375-1789323758231.png`), 844 가로 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-844-1789323758406.png`), 1024 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-preview-1024-1789323758892.png`)를 직접 열어 확인했다. 모바일/가로 폼의 이중 스크롤과 멀리 떨어진 행동은 잔여 UX다. 공개 버튼의 제한 안내는 여전히 표시된다.

실제 공개 사본 브라우저 조작은 수행하지 않았으며 envelope gate가 계속 거절하는 것을 계약 검사에서 확인했다. 위15확인을 새 복귀 기능이나 전체 개선 루프의 증거로 사용하지 않는다.

보호 파일 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/baseline-verification.json`)는 4,781개 중4,779개 동일·기존의 정확한2접점·예상 밖0이다. STATUS 운영 본문 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T18-16-28-624Z.json`)은 원래 hash와 동일하다. native 제작 원본26파일819,423bytes·운영 writer 모듈0과 v11 vendor integrity도 확인했다. 이 검사는 파일 경계이며 브라우저 운영 데이터 검사와 다르다.

문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T18-26-26-939Z.json`)와 보고서 정적 검사178개·이미지4개 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T18-26-28-695Z.json`)는 통과했다. HTML 렌더는 기존 URL 정책 차단으로 미실행이며 정적 검사를 반응형 렌더 검사로 세지 않는다. 이번에 의존성·네트워크 요청 경로를 추가하지 않았으며 보안 audit는 재실행하지 않았다.

## 변경 파일

- `lib/flow/integrated-poc/public-copy-execution-target.ts`: typed 순서/출력 복귀 key와 판본 근거.
- `lib/flow/integrated-poc/public-copy-output-return.ts`: 실제 수용 원본과 회차의 읽기 전용 복귀.
- `lib/flow/integrated-poc/recurrence-order-contract.ts`: 공통 key 지원, 출력 key의 순서 저장 금지.
- `lib/flow/integrated-poc/private-output-occurrences.ts`: 실제 공개 회차 출력의 고정 복귀 key.
- `lib/flow/integrated-poc/output-return-target.ts`: 전체 envelope gate 아래의 공개 사본 복귀 연결.
- `lib/flow/integrated-poc/public-copy-recurrence.test.ts`: 재현 실패와 새 11검사.

문서는 이 대조 원장과 `plan.md`, `current-validation.md`, `coverage-ledger.md`, `recurring-publication-design.md`, `progress.md`, `journey-closeout.md`, 캡처 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`)를 갱신했다. 운영 STATUS 본문·기존 앱/저장소·다른 worktree는 수정하지 않았다.

## 다음 순서와 미실행

사본 저장을 열기 전에 원래 가져오기의 `- [ ]`/`linkTask` 경로를 반복 header·회차·참조에 맞춰 연결한다. 시작 미정을 임의 오늘로 정하거나 Item 날짜 이동을 시리즈 전체 이동으로 바꾸지 않는다. C3 실제 저장·문서 참조와 나머지 D 표시/출력/제안을 준비한 뒤, 보존된 주간 원문으로 공개→사본→완료/계획→출력→원본 수용→Undo/reload를 실제로 확인한다.

전체10상황·두 전체 개선 루프는 계속 진행 중이다. 새 실행·전체 백업·재공개 정책을 확정하지 않았다. 실기기·OS IME·보조기술·외부 계정·관찰 사용자·commit/push/PR/merge/Preview/Production은 이번 미실행이다. 보고서 HTML 렌더의 기존 차단을 우회하지 않는다.
