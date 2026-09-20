# Undo 후 제작 항목 선택 복원

2026-09-13 · 실행판 `Z4JvHRO-XeTvmur7bO_ME`. 전체 제품 목표의 P06/P08·S07/S09/S10 중 제작 작업 복귀를 보완했다. 다른 원문·Map 조합이나 전체 두 개선 루프를 이 결과로 대신하지 않는다.

## 원래 요구와 수정

[이전 실제 결함](creator-corrections-review.md)은 Undo로 원문·구조·개인 기록은 복구되지만 항목 상세와 키보드 위치가 없어지는 것이었다. 부모가 외부 snapshot을 받으며 편집기를 다시 만드는 과정에서 선택을 비웠고, 자식의 직접 선택을 부모가 알지 못했다.

선택은 저장값이 아니라 화면 상태로 연결했다. 같은 actor·제작 문서·원본 owner이고 해당 Item ID가 복구 결과에 남아 있을 때만 다시 선택한다. Undo로 새 항목이 사라졌으면 상세 선택을 해제하며 첫 항목을 대신 열지 않는다. 미저장 원문·구조 입력, 조합 입력, 거래 잠금과 비교 선택 보호는 그대로다. 원문 편집기의 전체 snapshot 복구와 일반 속성 변경 시 상세 편집기를 유지하는 기존 동작도 보존한다.

## 같은 자료의 실제 결과

| 실행 | 결과와 한계 |
| --- | --- |
| 분할·Undo 19확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-undo-selection-z4j-2026-09-13T11-44-49-665Z.json`) | 기존 revision66에서 취소·quota·재시도·성공 초점·Undo 상세 복원, 선택한 새 항목이 사라지는 경우, 명시 재선택·reload를 완료. 성공 변경4회·실패1회. 최종70 |
| 키보드 병합 5확인 후 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-undo-keyboard-z4j-2026-09-13T11-47-46-863Z.json`) | Enter 병합 성공과 Undo quota 거절 뒤 검사가 `status`를 기다렸으나 실제 오류는 `alert`였다. 원래 실패 기록을 보존. 성공1회·실패1회, revision71의 병합과 입력 유지 |
| 같은 실패 상태 재개 8확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-undo-keyboard-resume-z4j-2026-09-13T11-49-51-318Z.json`) | 실제 오류 안내와 병합 상태를 확인하고 Enter로 Undo 재시도. 원래 Item·제목·초점·분리된 둘째 항목 복원과 reload 완료. 성공1회, 최종72 |

각 기록의 보호2키는 byte-for-byte 동일하고 허용 prefix 밖 쓰기·page error·console error는0이다. 선택만 바꾸거나 새로고침할 때 저장하지 않는다. 기존 45%/25% 기록과 개인 날짜·메모·참조, 두 로컬 공개 판본은 유지한다. 확인점 수는 요구 충족률이나 전체 개선 루프 횟수가 아니다.

## 화면 평가

분할 Undo 뒤375×812·390×844·844×390·1024×768·1194×834·1440×900에서 정확한 항목 초점, 실제 hit target, 화면 안 위치,44px 이상 크기, 가로 넘침0을 확인했다. 키보드 병합 Undo도375/1024에서 확인했다. 아래 캡처와 분할375/1024를 직접 열었다.

키보드 Undo 후 원래 항목과 상세가 복구된 태블릿 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-undo-keyboard-1024-1789300195004.png`)

375px 실제 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-undo-keyboard-375-1789300194915.png`)에서는 원문 아래 항목에 초점 테두리가 보인다. 상세 편집 폼은 더 아래에 있어 스크롤이 필요하다. 이 결과는 해당 대상의 조작성 확인이며 전체 화면 사용성 통과가 아니다.

별도 UX 검토의 낮은 항목은 정보량·스크롤 부담3/5다. 이번 수정에는 새 버튼이나 설명을 추가하지 않았다. 기존 비교·취소·저장 오류·공개 경계 안내는 선택과 복구에 필요해 유지했다. 정확한 Undo 선택 복원을 다루는 스킬 검색 결과는 없었으므로 기존 요구·실제 결함·owner 계약을 기준으로 설계하고 일반 초점 가시성 규칙을 보조 기준으로 썼다. Figma는 사용하지 않았다.

## 자동 검사와 변경 파일

관련61/61 PASS. 전체 첫 실행은1212개 중1209PASS/3FAIL이며, 기존 snapshot 함수 추출 테스트에 새 `nativeSelection` 참조가 빠져 발생했다. 해당 참조만 연결했고 기존5개의 단언은 유지했다. 최종136파일1212/1212 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T11-50-30-604Z.json`)·skip0·소스 변경0이다. 타입313진입/진단0, production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T11-42-07-107Z.json`) PASS. 빌드 후 변경은 snapshot 테스트의 도구 연결이며 제품 실행 코드는 동일하다.

npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T11-54-03-961Z.json`)는2031개 중2030PASS/기존 출처기한1FAIL·skip0이다. 승인 경로201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T11-54-22-633Z.json`), 공개 경로19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T11-54-25-009Z.json`)도 통과했다. 이 수들을 합쳐 요구 충족률로 계산하지 않는다.

12개 기록·현재 소스 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/creator-selection-crosscheck-2026-09-13T11-56-02-364Z.json`)는 최종72의 전체 데이터가 분할 검사 전66 및 병합 전70과 같고, 실제 브라우저 세 기록의 Z4J 실행판과 현재 제품 파일 bytes가 일치함을 확인했다. 빌드 이후 유일한 차이인 snapshot 테스트 연결도 명시했다. 이는 새로운 브라우저 시나리오가 아니다.

캡처 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`)는 정적109검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T11-57-54-109Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T11-57-54-466Z.json`)를 통과했다. HTML 렌더는 미실행이며, 실제 앱 PNG 확인과 구별한다. 종료 reporter는 untracked 디렉터리를 한 경로로 집계하므로 출력의2경로를 이번 변경 파일 수로 사용하지 않았다. 위 다섯 코드/테스트 파일과 QA 스크립트, 문서·보고서의 실제 수정 내용을 별도로 확인했다.

- [부모 선택 연결](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.tsx), [상세 선택·복원](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.tsx)
- [부모 회귀](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.native.test.tsx), [자식 회귀](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.test.tsx), [기존 snapshot 검사 연결](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.snapshot.test.tsx)
- `scripts/personal-workspace-poc/program-correction-undo-selection.cli.js`, `program-correction-undo-keyboard.cli.js`, `program-correction-undo-keyboard-resume.cli.js`, `program-creator-selection-crosscheck.mjs`

11:48경 원본 보호4781개 중4780동일/승인 route1/예상 밖0, D2 vendor26파일819423bytes·운영writer0, v11 source integrity를 재확인했다. 의존성 audit는 재실행하지 않았으며 이전5FAIL은 미해소다.

## 남은 범위와 경계

같은 문서 안의 Undo 선택 유실은 위 범위에서 해결했다. 새로고침 시 모든 상세 선택을 영구 보존하는 기능을 추가한 것은 아니다. 오류 후 전역 버튼의 초점까지 자동 복원하는 공통 UX는 이번 검사의 완료 주장에 포함하지 않는다. 다른 지원 원문·작성 틀·저장 이력의 원래 조작별 동등성, 실제 Map의 새 항목 추가/삭제와 다른 반복·과거 기록 조합, 전체10상황과 두 개선 루프가 남는다.

보고서 HTML 렌더는 기존 URL 정책 차단으로 미실행이며 다른 주소로 우회하지 않는다. 실제 Android/iOS·OS 입력기·보조기술·외부계정 미실행, 관찰 사용자0명. commit·push·PR·merge·Preview·Production·외부 게시 미실행. 운영 저장소와 원래 dirty 작업 공간은 변경하지 않았다.
