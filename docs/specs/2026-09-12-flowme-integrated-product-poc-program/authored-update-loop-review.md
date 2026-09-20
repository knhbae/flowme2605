# 같은 작성물의 후속 판본 수용과 출력 설명 수정

2026-09-14 · 전체 목표 진행 중. 현재 실행판 `kG-cT130_hMBTNyw4pavm`. [직전 실제 작성·공개·소비 기록](recurring-publication-release-review.md)의 같은 사본을 이어 사용했다. 자료를 초기화하거나 다른 예시로 바꾸지 않았다.

## 원래 요구와 이번 결과

| 요구 | 실제 결과 | 남은 범위 |
| --- | --- | --- |
| 개발2 작성 → 개발1 공개/개인화 → 개인공간 실행 → 기여/업데이트 | 실제 주간 작성물의 사본에서 일정 제안 → 작성자 채택 → 불변 2판 → 일정만 개인 수용 → Undo/reload를 연결했다 | 일반↔반복, 개인 시작일·전체/이후 계획과 원본 변경의 충돌 조합 |
| 원문과 개인 기록 보존 | 원래 1판·작성 문서·지난 완료·다른 개인 자료를 유지했다. 일정 수용 때 옛 완료는 원래 판본의 보존 기록이고, Undo 뒤 원래 회차에서 다시 보인다 | 다른 반복 구조와 실제 Map 상위 판본 삭제 |
| 외부 도구에 충실한 내용 전달 | 같은 완료 회차의 TXT/CSV/ICS를 실제 받았다. 원문 설명과 소요 시간이 각 한 번만 나온다. 원래 시간·완료·판본·정확 복귀 링크는 유지했다 | 외부 캘린더/시트 실제 import는 미실행 |
| 키보드·취소·실패·복구 | 같은 일정의 제출 불가, Escape, 그대로 유지는 쓰기0. 제안·채택·수용 각각 quota 실패0변경 → 키보드 재시도1변경. Undo/reload까지 확인했다 | 전체 화면/상태 조합·실기기·보조기술은 별도 |

## 수정과 회귀

공개 사본 reader는 이미 수용한 설명을 `row.memo`로 전달한다. 출력이 같은 설명을 출처 정보에도 추가해 두 번 표시했다. 출처 정보의 추가 한 곳만 제거했다. 작성자가 의도적으로 반복한 문장을 문장 집합으로 중복 제거하지 않는다. 별도 개인 메모는 원문 TXT에 그대로 남으며, 새 회차별 메모 기능이나 저장 schema를 만든 것이 아니다.

- [출력 투영](../../../lib/flow/integrated-poc/private-output-occurrences.ts): 중복 설명 추가 제거, 판본·규칙·출처·완료 기준 유지.
- [회귀 검사](../../../lib/flow/integrated-poc/public-copy-storage.test.ts): 원래 일정/전체 개인 계획/이후 개인 계획 × 원문 문장 1회/의도적 2회, 총6개. 수정 전6실패(2≠1 또는4≠2), 수정 후통과. 각 검사에서 실제 가져오기·3형식·개인 원문·공개 객체 불변을 확인한다.
- 브라우저 도구: 프로필 재개 확인 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-authored-resume-probe.cli.js`), 실제 파일 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-recurring-authored-output.cli.js`), 같은 작성물 업데이트 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-authored-update-loop.cli.js`), 저장 기록 대조 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-authored-loop-crosscheck.mjs`).

## 같은 자료의 실제 상태 흐름

`기존 작성/공개/사본/완료/날짜 Undo 59 → 제안60 → 검토 의견 초안61 → 새 2판62 → 일정만 수용63 → 수용 Undo64 → reload64`

| 실행 | 실제 확인 |
| --- | --- |
| 프로필 재개1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-resume-probe-2026-09-14T01-49-59-332Z.json`) | 브라우저가 빈 탭을 선택하고 있어 기존 주소를 다시 열었다. 저장59·정확 사본·이전 bytes가 남아 있었다. 복구 파일 주입·재시드 없음. E1에서 읽기만 확인 |
| 수정 출력21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-authored-output-dedup-2026-09-14T01-52-39-817Z.json`) | 새 kG 판에서 실제3파일·5크기·원래 회차/문서 행·reload, 저장59→59·쓰기0 |
| 후속 업데이트27확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-update-loop-2026-09-14T01-54-57-487Z.json`) | 같은 자료59→64. 성공 쓰기5, 실패한 쓰기 시도3. 허용 범위 밖 호출0, page/console 오류0. 로컬 작성자와 사용자가 같은 인물인 사례이며 실제 다중 사용자 협업이 아님 |
| 현재 소스·저장 기록33대조 (로컬 전용 근거: `../../../output/integrated-product-poc/authored-loop-crosscheck-2026-09-14T01-58-03-161Z.json`) | 실제 wire Undo 해석·domain 검증, 이전59부터 상태 연속성, 불변 판본/개인 기록, 수용 시 옛 완료의 보존 근거, Undo 원상복구, 다운로드 bytes/SHA/현재 producer 대조 |

실제 새 판본은 `version-1bd6dc80-81ea-4ce0-bd54-883f4a4a64a0`, 제안은 `proposal-ad231640-9be2-492a-93dd-d416b5a45bda`다. 사본 `copy-34f5d6f4-012b-4e63-927f-a9109d45c365`와 원래 canonical 행을 유지했다. 기존 E1 작성→파일 경로와 이번 kG 업데이트 경로의 상태는 이어지지만, 전체를 한 빌드에서 새로 실행했다고 쓰지 않는다. 중복이 있던 이전 파일도 수정하지 않고 증거로 보존했다.

실제 새 파일: TXT (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789350761090.txt`) · CSV (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789350761090.csv`) · ICS (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-output-1789350761090.ics`). 파일 생성 성공과 외부 도구에서 실제로 사용한 증거는 구별한다.

## 자동 검사

| 검사 | 실제 결과 |
| --- | --- |
| 관련 5파일 | 94실행/94통과/실패0/skip0. 신규 전체와 중복이므로 더하지 않음 |
| 신규 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T01-49-15-406Z.json`) | 150파일, 1,443실행/1,443통과/실패0/skip0 |
| strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T01-52-27-424Z.json`) / production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T01-50-21-157Z.json`) | 341진입/진단0, build PASS. 검사와 빌드의370소스 해시 일치·소스 변경0 |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T01-50-58-866Z.json`) | 2,031실행/2,030통과/기존 출처 검토기한1실패/skip0. review_due9개를0개로 기대하는 기존 실패를 숨기지 않음 |
| 기존 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T01-55-41-998Z.json`) / 공개 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T01-55-44-649Z.json`) | 각각201/201,19/19 |

## 화면 평가

1024px 채택 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-loop-1789350900441-accepted-1024.png`)와 375px 수용 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program/authored-loop-1789350901658-adopted-375.png`)를 직접 열어 확인했다. 원래 판본/새 판본/제안의 차이와 수용 후 같은 상태가 보인다. 375×812·390×844·844×390·1024×768·1440×900에서 파일 받기와 선택 수용 버튼의 높이44px 이상·중앙 클릭 가능·가로 넘침0을 검사했다. 이는 모든 화면의 접근성 통과가 아니다.

남은 UX는 긴 개인 설정의 내부/외부 이중 스크롤, 채택 후 검토 의견을 본문과 입력칸에 반복 표시하는 점, 긴 제목·비교·활동 목록이다. `flow-ux-review`에서 이번에 제거한 것은 자동 중복 설명뿐이며 원문·출처·완료·판본·복귀 안내는 유지했다. 내용 보존/출력4, 인지 부담/조작성3의 내부 판단을 유지한다. 사용자 평가 점수로 쓰지 않는다.

## 보호와 실행 경계

- 파일 보호 재검사:4,781개 중4,779개 byte 동일, 기존 승인 연결2개 외 예상 밖 변경0. D2 원본26파일/819,423bytes 동일·운영 writer 모듈0, v11 vendor 무변경 통과. 이번 작업은 기존 운영 파일/STATUS 연결을 추가 수정하지 않았다.
- 실제 브라우저의 운영 보호키 목록은0개다. 모든 Program bytes 보존·prefix 밖 setItem/removeItem/clear0과 채워진 운영 데이터 보호 검사를 혼동하지 않는다. sentinel이 있는 controller 자동 회귀는 별도 근거다.
- 실제 Android Chrome/iOS Safari·OS IME·보조기술·외부 계정 import/동기화·관찰 사용자 검증은 미실행, 관찰 사용자0명. 보고서 HTML 실제 렌더는 기존 URL 정책 차단으로 미실행이며 다른 주소/도구로 우회하지 않는다.
- commit·push·PR·merge·Preview·Production: 모두 미실행. 실행 가능한 로컬 앱과 PoC 안의 판본만 변경했다.

보고서의 정적 검사201개 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-14T02-03-40-527Z.json`)는 링크·이미지4개·스크립트와 검증 한계 표시를 확인했다. 첫 정적 검사는 상단의 ‘전체 완료 보고가 아닙니다’ 문구를 빠뜨려 실패했고, 해당 한계를 다시 명시한 뒤 통과했다. 실제 보고서 렌더 성공으로 해석하지 않는다. closeout의5개 경로는 미추적 디렉터리 단위 집계이며 이번 수정 파일 수가 아니다. 현재 소스 변경 범위는 위33개 대조의2파일과 명시한 검사/보고서 파일로 확인한다.

## 다음 순서

1. 이번 같은 작성물의 일반↔반복 전환·개인 시작일/전체·이후 계획과 원본 변경 충돌을 원래 기능에 맞춰 처리한다. 보존64상태를 초기화하지 않는다.
2. 실제 Map 상위 판본 삭제와 다른 구조, 여섯 작성 틀 전체의 제작→실행→공개 동등성을 종결한다. 이미 확인한 여행·주간 경로를 다시 미구현으로 세지 않는다.
3. 긴 화면·누적 응답성을 함께 개선하고 최종 같은 빌드의 S01~S10 및 두 전체 평가→개선 루프를 마친다. 이번 한 경로의 성공을 전체 완료로 계산하지 않는다.
4. 새 실행·전체 백업/기기 이동·재공개/신고 정책은 미승인 검토 후보로 유지한다.
