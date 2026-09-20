# 전체2 B — 주간 제작에서 개인 실행으로, 기존 Map의 개인 계획

2026-09-20. [전체2 계획](whole-loop-two-plan.md)의 B를 이어 검사했다. 주간 원문의 속성 추가·저장·개인 인계·한 회차 완료·이후 계획·기간 보기·reload는 아래 범위에서 확인했다. **B 전체나 두 번째 전체 개선 루프를 마친 것은 아니다.** 실행판은 `pIfd2DvMfHy2BICAkWF9L`이다.

## 요구와 결과의 대응

| 기존 산출물·요구 | 실제로 이어 본 행동 | 판정과 남은 차이 |
| --- | --- | --- |
| 개발2: 작성 틀 뒤에도 원문 속성을 편집하고 명시 저장 | 같은 주간 초안의 월/목 항목에 각각 Asia/Tokyo·하위 확인을 넣고 recordRevision 2로 저장. 원문 366자와 두 항목의 ID·날짜·시간·각 3회를 대조 | 지정 경로 충족. 틀 자체에 새 시간대 입력을 추가한 것은 아님. raw-only 원문 편집과 nativeDocument 전체 편집을 구분 |
| 개발2→개인공간: 명시 저장본을 실행에 연결 | 저장한 같은 초안에서 개인 문서 하나 생성. 월요일 3회·목요일 3회가 표시되고 제작 원문·이력은 유지 | 지정 경로 충족. 다른 초안이나 공개 사본을 대체하지 않음 |
| v4.1·개발1 실행: 개별 완료와 원본 분리 | 10/5 첫 월요일만 완료. 다른 5회는 미완료이며 reload 뒤에도 동일 | 지정 경로 충족. 원문 체크나 다른 항목 완료로 전파되지 않음 |
| 개발1 개인 계획→제작 반복 연결: 이후 계획과 과거 기록 보존 | 10/12 회차에서 비교·Escape 취소 후 다시 열어 10/13으로 명시 적용. 기존 10/5 완료와 목요일 3회 유지 | 기존 횟수 계약에 부합. 새 개인 계획은 10/13·20·27의 3회. **총횟수를 보존한다는 테스트 가정은 잘못됐음** |
| v4.1: 문서·기간의 같은 실행 대상 | 새 10/13 회차를 Enter로 열고 기간 보기로 이동한 뒤 같은 문서로 복귀 | 지정 비드래그 경로 충족. 실제 Tab 순회·보조기술·모든 보기의 전수 검사가 아님 |
| 개발1: 원래 Map을 개인 일정으로 활용 | 기존 OPIc 한 달 자료의 공통 기준일을 10/12로 정하고 1~4주 포함·5주 제외. 별도 2주 자료의 제외와 과거 기록 유지 | 이 계획 변경 경로 충족. 5개 고정 주차 항목이며 typed 반복으로 세지 않음. 새 진행/참조 및 이후 원본 변경 연결은 남음 |
| 저장·복구·경계 | 주간/Map 실제 reload, 전체 저장 payload 검증, 과거 실행·제작 원문·다른 인물·공개물 불변 대조 | 아래 프로필별 증거 범위에서 충족. 완전 백업·기기 이동·cloud 복구는 아님 |
| 개발2: 원래 편집·복구 기능 전체 | 이번에는 원문 속성 메뉴와 저장본의 실행 연결을 검사 | native 미반영 입력 복구, 저장 이력 복원과 구조 이동·날짜순 정렬, CRLF 입력 경로는 이번 미실행. [복구 요구 원장](creator-recovery-fidelity-review.md) 유지 |

## 실행 기록 — 실패도 원래 결과로 보존

숫자는 각 runner가 실제 수행한 확인점이다. 같은 경계 검사가 반복되므로 합계를 요구사항 수나 자동 테스트 수로 쓰지 않는다.

| 구간·근거 | 확인점·저장 | 결과 |
| --- | --- | --- |
| 9/15 속성 입력 첫 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-properties-2026-09-14T16-00-47-804Z.json`) | 19확인 뒤 중단·0쓰기 | select의 접근 이름을 잘못 찾은 QA 오류. role selector로 수정 |
| 같은 입력의 속성/저장 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-properties-2026-09-14T16-01-31-267Z.json`) | 111확인 뒤 중단·398→403, 5쓰기 | 라이브러리 저장이 바꾸는 updatedAt/Undo까지 불변으로 요구한 QA 오류. 성공한 저장을 반복하지 않음 |
| 속성/명시 저장의 모델 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-b-weekly-properties-crosscheck-2026-09-20T00-39-23-739Z.json`) | 26/26·브라우저 쓰기 없음 | 실제 속성 planner와 저장 action을 메모리에서 재생. 전체 데이터와 Undo까지 일치. 원래 실패 runner의 결과를 PASS로 바꾸지 않음 |
| 9/15 결과 화면·reload 후속 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-properties-tail-2026-09-14T16-04-05-709Z.json`) | 28확인·0쓰기 | 같은 403에서 Calendar 6회차·원문·reload 확인 |
| 9/20 같은 프로필 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/september20-resume-2026-09-20T00-41-23-597Z.json`) | 9확인·0쓰기 | 기존 디스크의 403/hash 일치. 닫힌 브라우저의 관측 버퍼는 이어졌다고 주장하지 않음 |
| 개인 인계·완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-execute-2026-09-20T00-44-34-831Z.json`) | 48확인·403→405, 2쓰기 | 개인 문서 생성 1회와 10/5 완료 1회. 실제 reload |
| 이후 계획 적용 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-2026-09-20T00-46-48-621Z.json`) | 37확인 뒤 중단·405→406, 1쓰기 | 비교/Escape는 0쓰기. 적용 뒤 “전체 6회차”라는 QA 가정에서 실패. 실제는 과거 1+목요일 3+새 개인 3=7 |
| 같은 406의 읽기 후속 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-52-062Z.json`) | 79확인·0쓰기 | 정확한 7회차·완료 보존·reload·5크기·키보드 상세/기간/문서 복귀. 계획을 다시 적용하거나 Undo로 실패를 지우지 않음 |
| 9/15 Map 개인 계획 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-map-plan-2026-09-14T16-06-33-547Z.json`) | 126확인·7→8, 1쓰기 | 기존 날짜 행 5개만 변경, 1~4주 실행·5주 제외·reload. 9/20 새 브라우저 검사로 세지 않음 |
| 주간·Map 저장 모델 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-b-state-crosscheck-2026-09-20T00-54-52-103Z.json`) | 19/19·브라우저 쓰기 없음 | 두 프로필의 전체 payload/Undo 유효. 주간 거래의 전체 결과가 실제 transition 재생과 일치. 동결한 제품 소스 406개도 동일 |

Map 재개 당시 관측 25확인은 실제로 수행됐으나 결과 수집기가 빈 inline-script 주소를 URL로 처리해 종료했다. 원래 로그 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-map-observer-2026-09-14T16-04-40-208Z.log`)를 보존하고 읽기 전용 추출 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-map-observer-recovered-2026-09-14T16-06-08-475Z.json`)로 복구했다. 이후 수집기는 비어 있거나 잘못된 URL을 거절하도록 고쳤다. 9/20에 실행한 수집기 자동 테스트는 **6/6, skip 0**이다. 전체 npm/build의 실행 시점은 [체크포인트](current-checkpoint.md)를 따른다.

## 반복 횟수의 판정과 UX 개선 후보

[기존 개인 계획 계약](public-copy-plan-review.md)의 “새 revision의 COUNT 유지”와 `date-movement.ts`의 규칙 이동/새 revision 생성이 일치한다. 따라서 3회 중 두 번째를 옮겨도 새 계획에는 3회가 생성된다. 제작 원문과 과거 완료는 별도로 유지된다. 이번에는 규칙이나 저장된 계획을 바꾸지 않았다.

실제 비교 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-2026-09-20T00-46-49-634Z-comparison.png`)에는 새 날짜 3개가 표시됐다. 최초 검사는 10/13·20의 존재만 검사하고 10/27을 빠뜨렸다. QA 준비 결함이다. 다만 “이 회차부터”라는 선택과 “전체 반복 횟수가 아닌 이 기간” 안내만으로는 **남은 횟수를 이동하는 것인지, 원래 횟수의 새 계획인지 구분하기 어렵다.**

이 항목은 미수정 UX 갭으로 남긴다. 다음 계획 변경 UX 개선 시 실제 새 revision의 종료 조건과 보존하는 과거 회차를 비교 화면에 표시하는 안을 검토한다. 원래 총횟수에서 차감하는 방식으로 바꾸려면 기존 저장 journal 재생·과거 기록·공개 사본까지 영향을 검토하고 사용자 결정을 받아야 한다. 관찰 사용자 혼란이나 영구 정책 확정으로 기록하지 않는다.

## 화면 평가

아래 캡처 5개와 앞선 비교·완료 전후·Map 캡처를 직접 확인했다. 각 크기는 스크롤 후 선택한 새 회차 버튼 하나의 화면 내 노출·중앙 hit·높이 44px·가로 넘침 0을 측정했다. 모든 핵심 행동의 가림 0으로 확대하지 않는다.

| 화면 | 확인 | 남은 부담 |
| --- | --- | --- |
| 390×844 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-55-448Z-390.png`) | 새 회차 3개의 날짜와 완료/상세 버튼 표시 | 원본 회차와 새 계획이 묶음별로 이어져 날짜 전체 정렬처럼 읽히지 않음 |
| 375×812 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-55-626Z-375.png`) | 버튼이 줄바꿈돼도 대상 가림·가로 넘침 없음 | 완료와 상세가 두 줄이 되어 목록이 길어짐 |
| 844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-55-848Z-844.png`) | 선택 회차의 상세 버튼 노출 | 왼쪽 목록과 낮은 높이로 한 번에 볼 수 있는 회차가 적음 |
| 1024×768 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-56-056Z-1024.png`) | 새 3회와 기간 조회 행동 확인 | 원문·기존 회차·개인 회차 사이 세로 이동 필요 |
| 1440×900 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-56-290Z-1440.png`) | 과거 완료 1·목요일 3·개인 계획 3을 함께 확인 | 원문 편집 영역은 이 캡처 밖. 한 화면 완결성 증거 아님 |

## 운영 데이터 불변과 다음 실행값

ordinary는 채워진 운영 보호키 **0개**다. 관측 중 모든 쓰기는 정확한 Program key의 성공한 setItem이며 범위 밖 setItem/removeItem/clear는 0건, session bytes도 동일했다. Map은 서로 다른 프로필이며 `flow:map:saved:curated-opic-mock-course`, `flow:map:persistence:curated-opic-mock-course`, `flow:membership-private-sentinel`의 **3개 key/value가 전후 byte-for-byte 동일**했다. QA 복제 프로필의 증거이지 사용자 실데이터가 있는 운영 브라우저 검사라고 주장하지 않는다.

ordinary의 마지막 revision은 **406**, SHA-256은 `76e3648ee48eadd5e37d18ff509f5c57bd5f01a8820420c30b6bbfac9fa3180b`다. CLI `program-ordinary-source-recovered`, 프로필 `program-ordinary-source-recovered-20260914`, 관측 `__september20Resume`의 generation `1789865692624.8`, offset `0`에서 문서 `doc-5cb97a5a-a856-4a1a-9b54-3841907c5bc3`로 돌아왔다. 모니터를 초기화하거나 소비한 runner를 다시 실행하지 않는다. reload 직전 마지막 관측~unload의 호출은 수집하지 못할 수 있어 전체 저장 bytes 비교와 함께 한계를 남긴다.

Map의 마지막 저장 근거는 별도 revision **8**, SHA-256 `3ecb6ece5c33b0b9e88283b8efbe90374a3c52708b4019e2b6c00ccb43859fbb`다. 9/20에는 프로필을 다시 열지 않았으므로 다음 작업 전 새 관측과 디스크 값을 확인해야 한다. 원래 Map을 재주입하지 않는다.

다음은 B의 남은 제작 복구/구조 조작 및 Map 진행·참조, C의 선택 공개·질문·반복 출력, D의 복합 개인 충돌/CAS다. 세 원래 산출물의 미충족 요구는 [전체2 계획](whole-loop-two-plan.md)과 [복구 대조](creator-recovery-fidelity-review.md)에서 계속 추적한다. GitHub Pages 개인 실사용을 위한 전체 백업·복원·버전 호환은 아직 별도 설계가 필요하며 현재 새 서비스 가입은 필요하지 않다.

## 변경 파일과 검사 범위

| 파일 | 변경 목적 |
| --- | --- |
| [브라우저 결과 수집기](../../../scripts/personal-workspace-poc/program-browser-record.mjs)·[테스트](../../../scripts/personal-workspace-poc/program-browser-record.test.mjs) | 빈 URL 안전 처리와 검토한 설치본 CLI 지정. 패키지 설치/업데이트 없음 |
| 9/20 재개 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-september20-resume.cli.js`)·개인 인계/완료 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-b-weekly-execute.cli.js`)·이후 계획 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-b-weekly-future.cli.js`)·읽기 후속 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-b-weekly-future-tail.cli.js`) | 기존 프로필의 정확한 저장값/실행판을 대조한 뒤 승인한 UI 경로만 조작. 소비한 runner 재실행 금지 |
| 주간·Map 저장 대조 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-b-state-crosscheck.mjs`)·속성 저장 대조 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-b-weekly-properties-crosscheck.mjs`) | 실제 남은 증거와 제품 validator/transition/Undo를 메모리에서 대조 |
| 이 원장·[체크포인트](current-checkpoint.md)·[전체2 원장](whole-loop-two-review.md)·[계획](whole-loop-two-plan.md)·[현재 판정](current-validation.md)·HTML 요약 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`) | 오래된 398/Map7을 다음 시작값으로 사용하지 않도록 현재 결과·실패·잔여를 구분 |

9/20의 `npm test`는 **2031실행/2030통과/1실패/skip0**다. 실패는 검토 기한이 지난 기존 콘텐츠9개를 잡는 원래 출처 검사다. 승인 실행 **201/201**, 공개 화면 **19/19**를 별도로 실행했다. 수집기 **6/6**, 저장 대조 **19/19**와는 다른 검사다. 전체 Program **1661/1661**, strict **375/진단0**, production build는 **9/15 결과**를 유지하며 이번 재실행으로 쓰지 않는다. 제품 소스406개의 hash는 그 빌드와 동일했다. 자세한 실행 파일은 [체크포인트](current-checkpoint.md)에 연결했다.

제품 runtime 수정: 이번 구간 없음. QA 수집기/실행 스크립트와 보고 문서만 변경했다. commit: 미실행. push: 미실행. PR: 미실행. Preview: 미실행. Production: 미실행. 실제 Android Chrome/iOS Safari: 미실행. 외부 도구 import: 미실행. 관찰 사용자: 0명. HTML 보고서의 기존 URL 정책 차단은 우회하지 않으며 정적 검사와 실제 앱 화면 검사를 분리한다.
