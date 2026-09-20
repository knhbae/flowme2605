# 제작 항목 병합·분할과 개인 기록 연결 점검

2026-09-13 · 진행 중. [전체 실행 계약](spec.md)의 개발2 제작 동등성과 개인 실행·선택 공개를 함께 확인한다. 이 구간의 성공을 전체 제품 완료로 확대하지 않는다.

## 현재 — ZI3 병합·분할 초점과 선택 공개, Undo 선택 결함 잔존

실행판 `ZI3xhM5rIxzbQMJKZcWmC`. 기존 자료를 지우거나 새 profile로 바꾸지 않았다. 기록·소스15대조 (로컬 전용 근거: `../../../output/integrated-product-poc/corrections-crosscheck-2026-09-13T11-25-08-721Z.json`)는 현재 코드/테스트/build의 SHA256, 실제 문서/route chunk, 동일 원문·공개 판본과 **세 번의 Undo 뒤 전체 개인 workspace가 병합 전과 동일함**을 확인했다. 이15개는 새 브라우저 실행이 아니다.

| 실제 실행 | 결과 | 남긴 실패·한계 |
| --- | --- | --- |
| 분할 초점11확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-split-focus-zi3-2026-09-13T11-14-18-791Z.json`) | 같은 항목을 추가 분할하고 Enter 성공→정확한 결과 초점,6크기 접근·원문/개인/공개 불변,1Undo 데이터 복원 | Undo 뒤 상세 편집 선택이 없어져 제목 입력을 찾지 못함. 시나리오 전체 PASS가 아님 |
| 병합18확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-merge-zi3-2026-09-13T11-15-51-752Z.json`) | 취소·quota·재시도, Enter 성공→첫 ID/초점,6크기,명시 저장·개인 수용,첫45%/별도25% 기록과참조 보존·빠진 항목 보관 | 기존 내부 스크롤 때문에 첫45% 버튼이 화면 밖이었다. 이후 실제 스크롤로 확인한 같은 revision59에서 공개를 이어감. 처음 기록을 완료로 바꾸지 않음 |
| 선택 공개·Undo·reload21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-publish-zi3-2026-09-13T11-22-42-154Z.json`) | 기존 공개문구를 명시 편집→합친1항목만 공개,미리보기 취소0/quota/재시도,불변 새판본1개,개인3Undo와reload | 실제 외부 게시·다중 사용자 검사가 아님. 자동 저장2회/공개1회/Undo3회 성공,quota 실패1회. 공개 편집 진입의 초안 생성1회는 직전 계측으로 별도 기록 |

최종 revision66. 개인 Undo는 병합 전 두 항목과45%/25%·날짜/메모/참조를 복원하지만 새 공개 판본은 유지한다. 공개 철회나 재공개 정책을 새로 정하지 않았다. 모든 실행의 보호2키 bytes 동일·허용 prefix 밖 쓰기0·page/console0이다. 각 기록의 확인점은 서로 합쳐 요구 충족률로 계산하지 않는다.

**남은 실제 결함:** 전역 Undo에서 `ProgramCreatorWorkspace.synchronizeCreatorWorking`이 원문과 inspector를 remount하고 `nativeItem`을 비운다. 데이터 복구는 정확하지만 사용자가 선택한 Item 상세와 키보드 위치가 사라진다. 다음은 같은 owner/존재하는 Item의 선택을 보존하고, 없어진 Item·다른 owner·미저장 입력에는 잘못 재진입하지 않도록 회귀와 브라우저를 함께 보완한다. 성공 직후 초점 수정만으로 Undo UX까지 해결됐다고 하지 않는다.

### 최종 자동 검사와 화면 평가

- 중단된 원래 두 파일 단독 재검사는 **9/9 PASS**다. 중단 시 가용 물리 메모리 약1.7GB였지만 종료의 원인을 확정하지 않는다.
- 전체 동일136파일 재검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T11-13-45-899Z.json`): **1206/1206 PASS·skip0·소스 변경0**. 동시 실행만1/heap512MiB로 기록했다. 원래 기본2를 유지하고 runner에 명시1/2 선택을 추가했으며 검사/fixture/단언을 줄이지 않았다.
- strict313/진단0, npm2031/2030PASS/기존 출처기한1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T11-10-09-901Z.json`), 승인201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T11-23-17-406Z.json`), 공개19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T11-23-22-671Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T11-10-49-238Z.json`). security audit는 재실행하지 않았고 이전5FAIL은 미해소 이력이다.
- 원본 파일 보호4781/동일4780/승인route1/예상밖0, D2 native26파일819423bytes/운영writer0, v11 source integrity를 재검사했다.
- 분할/병합 결과 초점과 공개 버튼 각각375×812·390×844·844×390·1024×768·1194×834·1440×900에서 가로 넘침0·44px이상·실제hit/키보드/가림없음을 확인했다. 분할375,병합1024,공개미리보기375,공개결과1440 캡처를 직접 봤다. 긴 제작 폼/정보량/모바일 줄바꿈은 여전히 부담이 있다. 화면 전체 완성도나 실기기 통과가 아니다.

선택한 병합 결과만 공개하는375px 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-merged-publish-preview-375-1789298570367.png`)

## 파일과 종료 시점

- 제품 수정: [ProgramCreatorNativeContext.tsx](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.tsx). 부모 Workspace의 Undo 선택 보존은 아직 수정하지 않았다.
- 회귀와 통합 검사: [구조 UI 검사](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.test.tsx), [제작 수정·개인 실행·공개 검사](../../../components/flow/integrated-poc/ProgramCreatorCorrections.integration.test.tsx).
- 검증 도구: [전체 검사 runner](../../../scripts/personal-workspace-poc/program-verify.mjs)의 명시 동시 실행 설정, 개인 기록 재개 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-correction-private-resume.cli.js`), 분할 초점 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-correction-focus-split.cli.js`), 병합 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-correction-merge.cli.js`), 선택 공개·Undo (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-correction-publish-resume.cli.js`), 기록 대조 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-corrections-crosscheck.mjs`).
- 이 원장과 현재 판정·계획·요구 원장·상황별 종료·진행 원장, 캡처 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`)를 갱신했다. 보고서는 정적104검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T11-28-51-020Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T11-28-51-134Z.json`) PASS이며 실제 HTML 렌더는 URL 정책 차단으로 미실행이다.
- 11:29 UTC 현재 격리 branch/HEAD `6e4b44fe`, upstream 앞0/뒤0, modified189/untracked478이다. 이 숫자는 이번 소유 파일 수가 아니다. loopback3641의 기존 작업 서버를 ZI3로 교체했고 현재 PID32076을 확인했다. 외부 주소로 공개하지 않았다.

## 원래 요구와 구현 판단

- 원래 D2의 `merge`·`split` 연산을 그대로 사용한다. 합치기에서는 첫 항목 ID를 유지하고, 나누기에서는 첫 항목과 새 항목을 구분한다. 원문 자체를 다시 생성하지 않는다.
- 개인 실행에 연결된 뒤 구조를 수정해도 기존 날짜·메모·날짜별 진행·다른 문서의 참조를 잃지 않아야 한다. 새 항목에는 기존 진행을 복제하지 않으며, 빠지는 항목의 기록은 보관한다.
- 해석된 제작 구조와 원문이 달라도 명시 저장·개인 수용·선택 공개의 실제 결과가 일치해야 한다. 기존 공개 판본은 불변이며 미선택/비공개 정보는 공개하지 않는다.
- 저장 성공 뒤 사라지는 비교 버튼 대신 결과 항목에서 키보드 작업을 이어간다. 실패·취소·저장 중에는 이 성공 초점 이동을 실행하지 않는다.

## 확인한 결함과 수정

Gpl 분할 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-split-gpl-2026-09-13T10-48-45-829Z.json`)은 구조 분할→명시 저장→기존 개인 문서 수용까지 진행했다. 원문·기존 기록·공개 판본은 보존했지만 분할 직후 초점이 `BODY`로 빠졌다. 같은 화면의 분할·병합 성공을 각각 NCUI33/34로 재현했다.

[ProgramCreatorNativeContext](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.tsx)는 성공한 실제 operation에서 결과의 owner/item ID를 받는다. 저장 완료·잠금 해제·쓰기 가능한 상태가 되면 해당 항목 버튼으로 한 번만 초점을 돌린다. 다른 owner로 바뀌면 대기 중인 초점을 버린다. 기존 원문 판단→항목 변환과 상세 속성 비교의 초점 경로도 유지한다. 새 컨트롤·저장 key·운영 writer는 추가하지 않았다. Figma 사용 없음.

초점 관련 스킬의 검색 결과는 이번 성공 후 복귀 동작과 정확히 일치하지 않아 그대로 적용하지 않았다. 원래 조작의 결과 ID와 실제 실패 기록을 기준으로 설계했고, 키보드 순서·초점 가림·기존 컴포넌트 재사용 원칙을 점검했다.

## 개인 문서의 같은 자료로 이어 확인

첫 분할 스크립트는 새 항목의 진행 버튼을 기다리다 중단됐다. 이를 항목 누락으로 판정하지 않았다. 실제 textarea는 높이390/전체832px이고 스크롤 위치0이었다. 마우스로 내부 편집 영역을 스크롤하니 `전 확인 · 0%`가 나타났다.

같은 상태 재개8 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-private-resume-gpl-2026-09-13T11-03-24-869Z.json`)은 revision53에서 시작했다. 새 항목의 0%를 확인하고 2026-10-03의25%를 기록했다. 이전 모든 기록·원문·공개 판본·두 참조 binding은 보존했고, 정확히 한 Program 쓰기 뒤 revision54가 reload에서도 복원됐다. 보호2키의 bytes 동일, 허용 prefix 밖 쓰기0, page/console 오류0이다. Gpl은 초점 수정 전 실행판이며 이 기록을 수정 후 초점 통과로 세지 않는다.

직접 확인한 캡처:

분할된 새 항목의 별도25% 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/correction-split-new-record-1440-1789297416682.png`)

## 자동 검사와 오류 구분

- `ProgramCreatorCorrections.integration.test.tsx`의 CCR01~03: 실제 순수 제작 연산→명시 저장→개인 수용→선택 공개, 기록/참조/불변 판본, quota·stale·모두 유지·3Undo/reload. 독립 fixture이며 다른 test 파일을 import하지 않는다.
- 첫 CCR fixture는 UI가 전달하는 `expectedStructure`를 누락했고, 참조의 같은 ID가 바뀐 제목을 표시하는 정상 동작을 과거 제목 bytes 불변으로 잘못 기대했다. 해당 테스트 기대를 실제 계약에 맞춰 수정했다. 제품 결함으로 집계하지 않는다.
- NCUI33~35: 분할/병합 성공, 취소·quota·재시도, 저장 중·잠금·읽기 전용 동안 초점 이동0, 성공 후1회, 다른 owner로 이동 금지. 첫 테스트의 버튼명과 분할 경계 오기는 고친 뒤 실제 `0 !== 1` 초점 결함을 재현했다.
- 관련 두 파일 **38/38**, skip0 PASS. strict **313 entry / 진단0** PASS.
- 전체 첫 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T11-01-28-112Z.json`)은 **136파일/1199실행/1197PASS/2FAIL**, skip0, 실행 중 소스 변경0이다. `creator-source-to-private-journey.test.ts`와 `execution-source-reader.test.ts`의 프로세스가 종료 코드3221226505로 중단됐다. 단언 실패로 단정하지 않으며 전체 green으로 바꾸지 않는다. 원래 입력의 단독 재검사와 후속 전체 결과는 별도로 기록한다.

## 첫 확인 시점의 다음 작업 — 위 현재 결과와 구분

1. 새 build의 실제 route/chunk를 확인하고 같은 revision54에서 병합·성공 초점·명시 저장·개인 수용을 검사한다. 첫 항목45%와 새 항목25%를 합산하거나 복제하지 않고 보존/보관해야 한다.
2. 같은 자료에서 선택 공개의 실제 payload와 이전 공개 판본을 비교하고, Undo·재진입·reload를 확인한다. 성공 receipt의 중복 방지 보존과 도메인 상태 복구를 구분한다.
3. 수정 후 분할 성공 초점도 실제 브라우저로 별도 재검사한다. 병합 초점 통과를 분할 초점 검증으로 대신하지 않는다.
4. 최종 소스 자동 검사·build·운영 파일/저장소 보호·반응형 캡처를 연결한다. 다른 원문 구조·Map 새 항목/삭제/반복·전체10상황과 두 개선 루프는 전체 목표에 남는다.

보고서 HTML 렌더의 기존 정책 차단은 우회하지 않는다. 이 PNG 확인은 HTML 렌더나 실제 기기 검사 증거가 아니다. Android/iOS·OS IME·보조기술·외부계정 미실행, 관찰사용자0명. commit/push/PR/merge/Preview/Production/외부 게시 미실행.
