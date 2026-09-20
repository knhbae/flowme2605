# 반복 작성물의 공개·개인 실행·출력 — 실제 연결 결과

2026-09-14 · 전체 목표는 진행 중. 이 기록의 실행판은 `E-1lD-yCWU8K0FMF3D-sf`다. 후속 [같은 작성물의 판본 수용·출력 수정](authored-update-loop-review.md)이 설명 중복과 B 후속 업데이트 잔여를 갱신한다. 이 문서는 이전의 ‘반복 공개 제한 유지·실제 채택 미연결’ 판정을 아래 확인 범위에서 갱신한다. 실제 기기·관찰 사용자·운영 서비스 공개를 뜻하지 않는다.

## 원래 요구와 현재 적용

| 요구와 원본 | 실제 연결 | 남은 범위 |
| --- | --- | --- |
| 개발2: 반복 작성 구조를 잃지 않는 선택 공개 | 실제 보존 주간 초안의 반복 2개 중 선택한 1개를 원래 화·목/8회/12월1일/07:00/Asia/Seoul 의미로 공개했다. 원문 블록을 메모 9개나 고정 회차로 바꾸지 않는다 | 여섯 작성 틀 전체와 다른 구조의 제작 UX 동등성 |
| 개발1: 공개 자료를 내 사본으로 사용 | 위 실제 공개 판본에서 새 개인 사본과 canonical 행을 만들었다. 공개 원본·제작 문서·기존 사본은 유지했다 | 같은 새 사본의 후속 제안·새 판본·충돌 수용까지 연속 종결 |
| v4.1·개발3 개인 문서/실행: 같은 항목의 완료·날짜·기간·Undo | 사본의 8회차 중 1회차 완료, 개인 실행일만 이동, 일·주·월에서 exact identity 확인, 날짜 Undo와 reload를 연결했다 | 개인 시작일/전체·이후 계획과 원본 변경의 충돌, 일반↔반복 전환. v11 전체 문법/모든 조작 동등성을 이 사례로 대신하지 않음 |
| 개발1: 선택 회차의 실제 파일과 재진입 | 위 사본에서 TXT·CSV·ICS 3개를 실제 받았다. 완료·원문 시간·수용 판본을 보존하고 파일 링크에서 같은 회차·같은 문서 행으로 돌아왔다 | 외부 캘린더/시트 실제 import는 미실행. 아래 설명 중복 결함은 남음 |
| 기여·개발2·개인공간: 제안→새 불변 판본→선택 수용 | 별도의 보존 사본에서 실제 반복 제안을 채택해 v4를 추가했다. 개인 사본의 일정만 명시 수용하고 Undo했다 | 이 프로필의 성공을 위 작성 프로필의 연속 업데이트 성공으로 합치지 않음 |
| 사용자에게 정확한 상태 표시 | 채택된 제안을 새 최신 판본과 비교하면서 다시 ‘채택 충돌’로 표시하던 UX 결함을 고쳤다. 채택한 변경과 실제 반영 판본으로 연결 | 긴 비교·빈 활동 영역·스크롤 부담, 전체 공통 회귀 |

## 구현과 계약

`PROGRAM_PUBLIC_RECURRENCE_RELEASE_V1`의 지원 `authoring-v1` 반복 공개를 켰다. 기존 strict validator, 소유권·동일 요청·원본 판본 확인, 공개 whitelist, 실패 시 원문/개인 기록 보존은 유지한다. 지원하지 않는 구조나 충돌을 날짜 미정·일반 항목으로 자동 낮추지 않는다. 새 운영 schema/key나 외부 writer는 만들지 않았다.

실제 raw 제작기와 전체 native 제작기의 producer→controller→공개→사본→회차 완료→제안→채택→명시 수용→Undo/reload 테스트 2개와 채택 상태 회귀 1개를 추가했다. 기존 지원 공개 차단 기대값은 실제 새 불변 판본과 개인 기록 불변 검증으로 갱신했다. 52개 소스·저장 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/recurring-release-crosscheck-2026-09-14T01-28-31-092Z.json`)에 정확한 변경 10파일과 370개 현재 소스 해시를 남겼다.

- 구현: [versioned release](../../../lib/flow/integrated-poc/program-data.ts), [제안 안내](../../../components/flow/integrated-poc/ProgramCopyProposal.tsx), [채택 결과](../../../components/flow/integrated-poc/ProgramProposalReview.tsx).
- 회귀: [실제 두 제작 경로](../../../components/flow/integrated-poc/ProgramPublisherSeries.test.tsx), [채택 표시](../../../components/flow/integrated-poc/ProgramProposalReview.test.tsx), [제안/채택](../../../lib/flow/integrated-poc/proposal-recurrence.test.ts), [사본 저장](../../../lib/flow/integrated-poc/public-copy-storage.test.ts), [개인 계획](../../../lib/flow/integrated-poc/program-public-recurrence-plan.test.ts), [사본 회차](../../../lib/flow/integrated-poc/public-copy-recurrence.test.ts), [공개 계약](../../../lib/flow/integrated-poc/public-recurrence-contract.test.ts).
- 검사 도구: `program-recurring-{accept,adopt,current,publish,authored-copy,authored-execution,authored-finish,authored-output}.cli.js`와 기록 대조기 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-recurring-release-crosscheck.mjs`). 재개 스크립트는 성공 거래를 되풀이하거나 자료를 초기화하지 않는다.

## 실제 브라우저 시나리오 — 프로필을 구분해서 읽기

| 경로 | 실행 근거 | 판정 |
| --- | --- | --- |
| A: 보존 제안 채택 | 16확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-accept-2026-09-14T00-46-14-901Z.json`), revision36→37 | quota 실패0변경→키보드 재시도1판본. 기존 v1/v2/v3와 다른 제안·개인 기록 보존 |
| A: 개인 일정 수용·Undo | 17확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-adopt-2026-09-14T00-53-49-110Z.json`), revision37→40 | 인물 전환 후 비교·유지 취소·quota·일정만 수용·Undo·reload. 옛 개인 기록 불변 |
| A: 최종 빌드 채택 상태·복귀 | 10확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-current-2026-09-14T01-03-46-705Z.json`), revision40 유지 | 올바른 채택 표시·정확 v4/항목·Back/reload. 쓰기0 |
| B: 실제 주간 초안 선택 공개 | 21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-publish-2026-09-14T01-01-20-132Z.json`), revision54→55 | 원래 2반복 중 1개. Escape0·quota0·키보드 재시도1. 공개에 private 원본 포인터·미선택/개인 실행값 없음 |
| B: 같은 공개 판본→개인 사본 | 부분13확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-copy-2026-09-14T01-15-59-657Z.json`), revision55→56 | quota0→키보드 가져오기1. 저장은 성공했으나 QA가 `baseVersionId/itemLines`를 다른 필드로 가정해 중단. actual 저장 계약을 재대조해 검증 |
| B: 같은 사본→완료·날짜·기간 | 부분8확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-execution-2026-09-14T01-18-14-959Z.json`), revision56→58 | reload0·완료1·날짜 취소0/이동1·일/주/월 identity 통과. 기간 보기에서 문서 선택 후 문서 보기까지 바뀐다고 가정한 QA locator 중단 |
| B: 명시 문서 보기→Undo·reload | 11확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-finish-2026-09-14T01-19-28-363Z.json`), revision58→59 | 기존 화면의 ‘문서’ 버튼으로 복귀. 5크기·한 번의 날짜Undo·reload. 완료 기록은 유지 |
| B: 같은 회차→실제 파일→정확 복귀 | 18확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-output-resume-2026-09-14T01-22-41-258Z.json`), revision59 유지 | TXT/CSV/ICS 3개 SHA/바이트와 현재 producer 결과가 완전히 동일. 출력·파일 링크·문서 행·reload 쓰기0 |

A의 실제 채택은 `kygSqC2DymUi39afxBFYs`, 수용은 `mY4OJcy5RbcTVgEU-KknX`에서 실행했다. 마지막 E1 빌드에서 채택 상태를 다시 읽었다. kyg와 최종 runtime 차이는 채택 표시 수정 1파일이며 mY4 runtime은 최종과 같다. 이를 실제 채택·수용을 E1에서 다시 실행한 것으로 쓰지 않는다. B의 공개부터 파일 복귀까지는 E1이다.

앞선 A 중단 8/8확인은 빈 검토 저장을 거래로 가정한 대기 오류와 run-code의 `structuredClone` 사용 오류였다. B 출력의 첫 부분3확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-output-2026-09-14T01-21-26-553Z.json`)은 CSV의 CRLF를 textarea DOM의 LF와 그대로 비교한 QA 오류다. 실제 BOM은 양쪽에 있었고 제거하지 않았다. 최종 대조는 다운로드 원래 bytes를 보존한 채 현재 producer와도 byte-for-byte 비교한다. 부분 실행·재개·정적 대조 개수를 합산해 요구 충족률로 바꾸지 않는다.

## 자동 검사 — 실제 실행 수

| 실행 | 결과 |
| --- | --- |
| 최종 신규 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T00-57-16-445Z.json`) | 150파일, 1,437실행/1,437통과/실패0/skip0, 검사 중 소스 변경0 |
| 관련 5파일 표적 | 77/77. 위 전체 검사와 중복이므로 더하지 않음 |
| strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T01-05-22-992Z.json`) | 341진입·진단0 |
| production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T00-57-06-352Z.json`) | PASS·소스 변경0, E1 빌드 |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T01-02-12-645Z.json`) | 2,031실행/2,030통과/기존 출처 검토 기한 1실패/skip0 |
| 기존 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T01-00-23-718Z.json`) / 공개 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T01-00-31-012Z.json`) | 각각 201/201, 19/19 |
| 소스·저장·다운로드 교차 확인 | 52/52. 실제 wire Undo decoder와 domain validator, 상태 연결, 원본/개인 불변, 370소스·10변경, 파일 3개 bytes/SHA와 producer 일치 |

최초 gate 차단/출력 조회 계약을 잘못 준 테스트 실패, 한 기존 gate 기대값의 누락, 새 SSR 테스트 타입 진단3, 검사 중 테스트 소스가 바뀐 중간 실행은 보존했다. 위 마지막 소스 변경0 결과만 최종 기준으로 쓴다. 기존 npm의 review_due 9개를 0개로 기대하는 실패와 이전 의존성 audit 5건은 해결하지 않았다. 소스 변경 없이 이어진 B 브라우저 검사 때문에 전체 테스트를 중복 실행하지 않았으며 현재 해시를 대조했다.

## 화면 평가와 새로 남긴 결함

가상 상황은 ‘작성한 주간 운동 중 스트레칭만 가져가서 첫 회차를 완료하고 파일로 보관하는 사람’이다. 운동 효과나 콘텐츠 안전성을 검증한 상황이 아니다.

| 크기 | 실제 확인 | 남은 UX |
| --- | --- | --- |
| 375×812 / 390×844 | 공개·가져오기·완료·파일 받기 주요 버튼의 44px 이상, 중앙 hit, 가로 넘침0. 375 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-finish-1789348770432-375.png`), 375 복귀 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789348962669-return-375.png`) 직접 확인 | 작성/반복 영역의 이중 스크롤, 긴 문서명, 열린 문서 작업 메뉴가 하단 편집 영역을 덮는 부담 |
| 844×390 | 위 주요 동작 스크롤 후 접근, 넘침0 | 낮은 높이의 전체 작업 효율·모든 메뉴 조합 완료로 확대하지 않음 |
| 1024×768 | 완료·개인 날짜 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-finish-1789348770651-1024.png`), 파일 복귀 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789348962669-return-1024.png`), 채택 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-current-1789347834505-1024.png`) 직접 확인 | 긴 목록/비교와 빈 활동 구역이 차지하는 세로 공간 |
| 1440×900 | 주요 버튼 접근·넘침0, 동일 실행·공개 데이터 | 큰 화면의 모든 조합을 새로 평가한 증거는 아님 |

`flow-ux-review` 내부 평가: 목적 적합성4, 실행 명확성4, 구조 보존4, 파일 이식성4(외부 import 제외), 인지 부담3, 문구 중복3, 소유/공개 경계4, 조작성3(실기기/보조기술 제외). 제품 평균·실사용자 평가 점수로 쓰지 않는다. 새 컨트롤은 추가하지 않았고, 원문/개인 날짜 차이·취소·실패·복귀 안내는 유지했다. 채택 뒤 거짓 충돌 표시는 제거했다.

**Medium · 출력 설명 중복:** 실제 최종 TXT (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789348962669.txt`)에서 ‘동작 사이에 잠깐 쉰다.’와 ‘소요 시간: 20분’이 각각 두 번 나온다. 파일 생성/복귀의 성공과 별개다. 개인 메모와 원문 설명의 소유를 먼저 대조하고, 명시 개인 메모를 임의 삭제하지 않는 회귀를 추가해 고친다. 같은 59번 저장 상태를 다음 검사의 기준으로 보존한다.

## 보호·실행·발행 경계

2026-09-14 01:36 UTC 원본 파일 보호 검사를 재실행했다. 4,781개 중 4,779개 동일, 승인한 route 연결/PoC 상태 메모 2개 외 예상 밖 변경0이다. STATUS 본문 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T01-35-22-941Z.json`)는 추가 메모 4줄을 제외한 기존 본문의 SHA256이 원래 `027ff9ad…c106d8`과 같음을 확인한다. D2 원본 26파일/819,423bytes·운영 writer 모듈0과 v11 vendor 무변경 검사도 통과했다. 이 파일 보호는 아래 브라우저 storage 보호와 다른 증거다. 문서 검사와 HTML 문법·링크·이미지4개 정적 검사를 실행했으며 실제 보고서 렌더를 대신하지 않는다.

- A/B의 실제 브라우저 운영 보호키 목록은 각각 0개다. 전체 Program bytes 비교·허용 prefix 밖 setItem/removeItem/clear 0과, 채워진 운영 데이터 보호 증거를 혼동하지 않는다. 신규 PRL controller 검사는 운영 sentinel을 채운 별도 자동 검사다.
- 실제 쓰기는 `flow:poc:personal-workspace:v1:program:*`에만 있다. exact-query·기본 `/my`·운영 저장 key/schema/writer는 변경하지 않는다. 원문·기존 판본·개인 기록은 사례별 전체 객체/bytes로 대조했다. 초기화·재시드·상태 덮어쓰기 없이 같은 프로필을 이어 사용했다.
- 보고서 HTML은 기존 URL 정책 차단으로 실제 렌더 미실행이다. 다른 URL/서버/브라우저로 우회하지 않는다. 앱 캡처 검사와 HTML 정적 검사를 분리한다.
- 실제 Android Chrome, iOS Safari, OS IME, 보조기술, 외부 계정 import·동기화, 관찰 사용자 검증: 미실행. 관찰 사용자 0명. Figma 작업 미실행.
- commit: 미실행 / push: 미실행 / PR: 미실행 / merge: 미실행 / Preview: 미실행 / Production: 미실행. 로컬 PoC 내부 공개만 수행했다.

## 다음 순서

1. 위 설명 중복을 개인 메모 보존 조건으로 재현·수정한다. 같은 B 사본/지난 완료를 유지한 후 제안→새 판본→명시 수용→Undo/reload까지 이어 E의 후반을 종결한다.
2. 일반↔반복·개인 시작일/전체·이후 계획 충돌, 실제 Map 상위 판본 삭제, 여섯 틀 전체 동등성을 각 원본 기능과 매칭한다.
3. 긴 화면·누적 응답성을 보완하고 최종 같은 빌드의 S01~S10 및 최소 두 전체 개선 루프를 요구별로 종결한다. 이번 부분 성공은 전체 루프 완료가 아니다.
4. 새 실행·전체 백업·기기 이동·재공개/신고 정책은 검토 후보로 유지한다. 기존 요구의 미충족과 합산하거나 임의로 구현 범위를 확대하지 않는다.
