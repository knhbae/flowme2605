# 개발2 속성 추가의 통합 차이 보완

2026-09-13 · 전체 목표의 중간 작업. 기존 제작기 전체 동등성이나 전체 10상황·두 개선 루프 완료를 뜻하지 않는다.

## 원래 요구 → 발견한 차이 → 수정

기존 개발2의 원래 편집 연산 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/operations.ts`)은 `sync_item_to_working_text`로 지원하는 루트 Markdown 체크 항목에 일반 속성을 추가할 수 있다. 표·불명확한 원문 연결·중복 속성·별도 편집 상태와 자료/출처/안내/주의의 제한은 원래 연산에 있다. 원본을 수정하거나 원래 저장 writer를 가져오지 않았다.

통합 화면의 `nativeInspectorUnsafeReason`은 모든 변경 속성이 이미 한 번 선언되어야 한다고 요구했다. 원래 연산이 허용하는 추가까지 화면에서 거절하는 **통합 기능 축소**였다. 먼저 추가 회귀 13개를 실행해 원래 연산의 성공과 통합 검사 12실패/1통과를 구분했다. 이후 일반 속성의 빈 값 추가만 허용하고 원래 연산 전체 검증과 근거 필드 제한을 유지했다.

| 원래 속성 | 통합 사전 검사 수정 | 현재 근거 |
| --- | --- | --- |
| 설명·완료 기준·날짜·상대 날짜·시간·시간대·장소·소요 시간·반복·반복 종료·실행 조건 | 원문에 없는 속성도 추가 비교 가능. 중복 선언은 거절 | 각 11개의 원래 연산 성공·통합 허용·Item ID·다른 항목·native Undo 회귀 |
| 제목 | 기존 제목 수정 규칙 유지 | 기존 검사 유지 |
| 자료·출처·안내·주의 | 원래 연산의 기존 선언·링크 제한 유지 | 없는 필드 추가 거절을 원래 연산과 대조 |
| CRLF·하위 체크·다른 항목 | 원래 문서 편집 연산을 그대로 사용 | 복합 추가 후 원문 줄바꿈·하위 체크·다른 블록·정확 Undo 회귀 |
| 비교·취소·저장 실패·재시도·같은 값 | 같은 Program transaction 경로 | 새 NCUI31: 입력 보존, 실패0성공변경, 같은 요청 재시도1성공, 같은 값0 |

새 화면이나 버튼을 추가하지 않았다. 기존 접힌 속성 편집 안내를 실제 지원 범위에 맞췄다. UX 검토에서는 오류 뒤 입력과 복구 경로를 유지하는 것을 우선했다. Figma는 사용하지 않았으며 기존 코드 화면을 보완했다.

## 현재 자동 검사

- 관련 3파일 52/52 통과. 기존 2개 테스트에서 일반 속성 추가까지 금지하던 기대를 수정했으며 중복·잘못된 날짜·여러 링크 거절은 유지했다.
- 전체 통합 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T09-50-28-747Z.json`): 135파일, 1,198/1,198, 제외0, 검사 중 소스 변경0.
- 타입 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T09-56-44-469Z.json`): 312진입, 진단0.
- npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T09-57-11-230Z.json`): 2,031실행/2,030통과/기존 출처 검토기한1실패. 원래9source의 날짜나 기대값을 수정하지 않았다.
- 승인 회귀201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T09-58-09-528Z.json`)·공개 회귀19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T09-58-12-320Z.json`) 통과. 겹치는 검사 수를 요구 충족률로 합산하지 않는다.
- 기존 파일 보호4,781개 중4,780동일/승인 route1/예상 밖0, D2 원본26모듈819,423bytes 불변·writer0을 재확인했다.

## 기존 브라우저의 실패 재현

기존 여행 자료의 거절 재현 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-before-po7-2026-09-13T09-52-38-468Z.json`)은 5확인이다. 이름의 `po7`은 기록 당시 디스크 빌드 표식이며 **실제로 열린 문서는 Mgb**였다. 기록의 `documentBuildId`와 `runtimeMatchesBuild:false`를 그대로 보존하며 pO7 재실행 성공으로 세지 않는다. 원래 자료의 장소가 빈 상태에서 입력→거절→입력 보존→기록 뒤 명시 버리기까지 저장 bytes는 같았다. 해당 375px 입력 캡처를 직접 확인했다.

Ovj 실행판의 첫 통합 시도 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-addition-ovj-2026-09-13T10-00-58-001Z.json`)는 14확인 후 저장 성공 문구 대기에서 중단됐다. 저장 실패1회 뒤 정확한 재시도1회가 성공했고 보호2키/개인 입력을 보존했다. 하지만 부모가 원문 편집기와 속성 편집 화면을 함께 다시 생성하여 선택·펼침·초점을 잃었다. 새 속성 추가 성공과 이 실제 UX 결함을 구분한다. QA의 문구 대기 실패를 전체 통과로 바꾸지 않았다.

원문 편집기 갱신용 세대를 분리하고, 성공 뒤 기존 비교 버튼으로 초점을 돌렸다. 전체 저장본/Undo의 기존 화면 초기화 경계는 유지한다. 새 부모·자식 회귀를 포함한 관련68검사를 통과했다. React 검토에서도 원문 갱신과 편집 화면 재생성 범위를 분리했으며 새 저장 상태나 이벤트 구독은 만들지 않았다.

같은 성공 상태의 Undo 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-resume-undo-ovj-2026-09-13T10-06-00-185Z.json`)는6확인이다. 실제 revision25에서 UI Undo1회→26→reload로 돌아갔고 개인 기록/참조/공개와 보호2키는 같았다. 초기화하거나 성공한 쓰기를 없었던 것으로 처리하지 않았다. 새 빌드 왕복은 아래에 이어 기록한다.

최종 소스의 135파일1,200검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T10-05-49-335Z.json`)는 모두 통과·제외0·검사 중 소스 변경0이다. 이전1,198/Ovj 기록은 두 번째 UX 수정 전의 근거다.

## 최종 통합 왕복 — Gpl 실행판

2026-09-13 10:30 UTC의 최종 40확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-addition-gpl-final-2026-09-13T10-30-18-304Z.json`)은 실제 `GplRf_-FfFtruMlDDGvMn` 문서·route chunk와 일치한다. 기존 `program-source-private-full-mgb-final`의 여행 원문·개인 날짜/메모/45% 진행·참조 문서 두 개·고정 공개 판본을 유지했다. 운영 데이터를 대신하는 격리 fixture이며 관찰 사용자 자료로 세지 않는다.

| 상황 | 실제 결과 |
| --- | --- |
| 없는 장소 입력 → 비교 → 취소 | 입력 보존, 저장 호출0 |
| 동일 비교 → quota 실패 → 재시도 | 실패 전후 전체 저장 bytes 동일, 입력/비교 유지. 재시도 성공1회, 같은 값 호출0 |
| 성공 뒤 편집 계속 | 선택한 Item·펼친 상세·비교 버튼 초점 유지. Item ID와 원래 source JSON 불변 |
| 명시 저장 → 같은 개인 문서에 내용만 수용 | 장소1회 반영, 개인10/2·메모·45%·모든 진행/소속/binding·두 참조·미선택 항목 보존. 공개 판본 자동 변경0 |
| 새로고침 → 전역 Undo3회 → 새로고침 | 새로고침에서 직전 성공 저장 bytes 유지. Undo는 작업 owner/원문·개인 내용/기록을 복원하고 공개/다른 인물을 보존. revision44→50, 성공 쓰기6회는 추가/저장/수용/Undo3회 |
| 중복 요청 보호 | 명시 저장과 개인 수용의 요청 receipt2개를 유지. 개인 Undo가 처리 이력까지 지우는 계약으로 변경하지 않음 |
| 저장 경계 | 보호2키 byte-identical, 허용 prefix 밖 쓰기0, page/console error0. 주입한 실패1회는 성공 쓰기에 포함하지 않음 |

최종 실행 이전의 32확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-addition-final-2026-09-13T10-13-46-793Z.json`)은 수용 후 캡처 대상의 일시적인 DOM 교체로 중단됐다. 같은 상태의 Undo 재개11확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-finish-gpl-2026-09-13T10-23-32-835Z.json`)은 실제 `recordRevision` 대신 없는 `revision`을 검사한 QA 오류였다. 이어 34확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-addition-gpl-recheck-2026-09-13T10-26-02-113Z.json`)의 비교는 개인 상태와 요청 이력을 혼동했고, 35확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/inspector-addition-gpl-verified-2026-09-13T10-28-17-341Z.json`)은 receipt1개라는 잘못된 기대를 포함했다. 원래 구현은 `creator-action`과 `native-creator-handoff`를 각각 남긴다. 개인·공개·다른 인물 bytes 대조는 유지하고 정확한 두 receipt와 이전 receipt 보존을 별도 확인했다. reload 전에 호출을 수집해 새 문서의 계측 초기화로 저장2회가 빠지던 QA 문제도 수정했다. 이전 기록은 수정하지 않았으며 이 반복을 서로 다른 두 개선 루프로 합산하지 않는다.

### 자동 검사와 현재 소스 연결

- 통합135파일1,200/1,200 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T10-05-49-335Z.json`), 타입312진입/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T10-10-35-600Z.json`).
- npm test2,031실행/2,030통과/기존 기한1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T10-10-52-658Z.json`), 승인201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T10-11-32-393Z.json`), 공개19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T10-11-38-771Z.json`), production build 통과 (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T10-11-41-643Z.json`).
- 10:31 현재 소스/기록10대조 (로컬 전용 근거: `../../../output/integrated-product-poc/inspector-crosscheck-2026-09-13T10-31-44-010Z.json`)에서 최종 테스트·빌드 입력과 현재 제품/테스트 파일의 SHA256을 대조했다. 이10개는 새 브라우저 실행이 아니다. 대조기의 첫 파일명 검사에서 ISO시각의 대문자 T/Z를 빠뜨린 오류를 수정한 뒤 실행했다.
- 10:31 원본 보호4,781중4,780동일/승인 route1/예상 밖0, D2 원본26파일819,423bytes·writer0, v11 source integrity 통과. 의존성 audit는 이번에 재실행하지 않았으며 이전5실패가 해소됐다고 주장하지 않는다.

### 화면별 평가

375×812·390×844·844×390·1024×768·1194×834·1440×900의 비교 적용 버튼에서 가로 넘침0·키보드 초점·실제 hit·44px 이상·화면 안 노출을 확인했다. 이6측정을 앱 전체 화면 평가로 확대하지 않는다. 최종375/1024 비교,375 재열기,1024 개인 수용 캡처를 직접 확인했다.1024에서는 장소와45% 및 참조 문서 목록을 함께 읽을 수 있다.375에서는 긴 속성 폼과 본문 줄바꿈·스크롤 부담이 남는다. 반응형 기술 기준 통과와 읽기 편한 UX를 구분한다.

제품 변경은 `creator-native-context-model.ts`와 그 테스트, `creator-native-inspector-parity.test.ts`, `ProgramCreatorNativeContext.tsx`와 그 테스트, `ProgramCreatorWorkspace.tsx`와 `ProgramCreatorWorkspace.native.test.tsx`다. 이번 재개에서는 제품을 더 바꾸지 않고 브라우저 시나리오/대조기와 원장·보고서를 정리했다. QA 스크립트는 `program-inspector-before`, `program-inspector-addition`, `program-inspector-resume-undo`, `program-inspector-finish`, `program-inspector-crosscheck`이며 최초 실패 시점의 실행 소스는 출력 기록에 보존된다.

보고서의 첫 정적 검사는 중간 결과임을 밝히는 명시 문구 누락1건을 검출했다. 본문에 보이는 완료 범위를 복원한 뒤 최종 정적95검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T10-37-48-874Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T10-37-48-986Z.json`)를 통과했다. 실제 보고서 HTML 렌더는 여전히 정책 차단으로 미실행이다.10:38 scoped closeout은 HEAD `6e4b44fe`·upstream과0/0, loopback3641의 실제 PID6816을 확인했다. QA3스크립트 구문과 scoped diff 검사도 통과했으며 현재 입력10재대조 (로컬 전용 근거: `../../../output/integrated-product-poc/inspector-crosscheck-2026-09-13T10-38-20-254Z.json`)를 기록했다. 이 추가 대조를 새 기능 검사 수에 합산하지 않는다.

## 경계와 다음 대조

일반 속성 추가 보완은 기존 동작의 복원이며 운영 schema·영구 정책 변경이 아니다. `/my?personalWorkspacePoc=v1`과 `flow:poc:personal-workspace:v1:program:*`를 유지한다. 운영 writer/key, vendor 원본, 다른 worktree는 변경하지 않았다.

남은 대조: 병합·분할 후 개인 인계와 공개의 의미, 모든 속성의 지원 원문 형태/원문 수정 경로, 제한된 연산을 같은 값으로 안내하는 경우, 기존 제작기 전체 화면 연결. Map 새 항목/삭제·다른 반복 조합과 전체10상황의 두 개선 루프도 남아 있다.

실제 Android/iOS·OS IME·보조기술·외부 계정 검사는 미실행, 관찰 사용자0명. commit/push/PR/merge/Preview/Production 미실행. 보고서 HTML 렌더의 기존 URL 정책 차단은 우회하지 않는다.
