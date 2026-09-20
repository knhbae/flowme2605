# 작성 틀의 예시·계산 근거와 원문 연결

2026-09-13 · 예시·계산 근거 보완과 아래 검증을 완료했다. 실행판 `p9ml5w2AbOskhwzQvChcU`. 전체 목표 P06/P08·S07/S09/S10의 한 작업 묶음이며 전체 완료가 아니다.

## 원래 요구와 실제 차이

원 P0 설계 (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)는 빈 구조를 기본으로 하고, `previewFixture.fieldExamples`는 예시 보기에서만 표시하며 planner 입력으로 쓰지 않는다. 계산값은 기존 `derivedValues`의 근거와 함께 적용 전에 보여 준다. 당시 개발2는 순수 코어를 구현했고 폼 UI는 미구현이었다. 이번 차이를 기존 구현 화면 삭제로 표현하지 않는다.

현재 Program의 여섯 예시 전체를 원문에 적용하는 경로와 변수 입력 폼은 서로 다른 기능이다. 변수 폼에는 읽기 전용 예시가 없고 미리보기는 생성 원문·항목 수만 보여 줬다. 폼·빈 sidecar 저장·해제 자체는 이미 구현됐다.

## 실행 계획과 완료 증거

1. 현재 빈 원문 폼을 브라우저로 확인하고 기존 revision72 프로필과 이전 structure 프로필은 보존한다. 별도 `program-structure-form-review`에서 실제 UI로 새 빈 제작 원문을 만들었다.
2. 카탈로그의 표시 전용 예시를 재사용한다. 기본 접힘, 실제 입력·원문 변경0, 틀 변경 시 다른 예시 혼동 방지, Escape/키보드와 긴 내용 줄바꿈을 확인한다. 표시 데이터를 draft/compiler로 보내지 않는다.
3. 이미 계산된 planner 값과 사용자가 입력한 정확한 scope의 필드명·값을 적용 전 표시한다. 일정이나 콘텐츠를 새로 추론하지 않는다.
4. 여섯 틀·잘못된 예시·반복 group별 근거·취소/실패/IME·원문 적용/Undo/Redo/빈 원문 reload·명시 저장/연결 해제를 검증한다. 기존 부모/모델 회귀, 전체 검사와 새 build·현재 브라우저를 구별한다.
5. 모바일·태블릿 가로·데스크톱에서 예시와 계산 근거 및 핵심 행동을 실제 확인하고 캡처·잔여를 남긴다. 저장 이력/개인 실행/선택 공개의 전체 조작별 동등성은 검증한 범위만 갱신한다.

## 설계 선택

예시는 입력 근처의 네이티브 접기/펼치기 하나로 제공한다. 폼에 예시값을 미리 채우거나 또 하나의 적용 버튼을 추가하지 않는다. 계산 근거는 적용 전 확인에 필요하므로 미리보기에서 바로 보인다. 기존 카탈로그·compiler·writer·version 계약을 변경하지 않는다.

`figma-ux-ui-design`의 코드 우선 경로, `flow-ux-review`의 필요할 때 펼치기·중복 행동 제거를 적용했다. UI/UX 검색은 두 번 모두 이 예시 분리와 직접 맞지 않아 검색 결과를 근거로 채택하지 않았으며 원래 설계와 스킬 일반 폼 지침을 따른다. Figma는 사용하지 않는다.

## 실제 시나리오 결과

| 경로 | 실제 결과와 판정 |
| --- | --- |
| 여섯 틀과 실제 입력 | 33확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-guidance-p9m-resume-2026-09-13T12-17-27-215Z.json`) 완료. 각 예시는 기본 접힘·키보드 열기·Escape 복귀·쓰기0. 실제로 입력한 겨울 이사일12/21과 D-14로12/7을 보여 주며 가상 예시는 원문에 들어가지 않음. 빈 원문 상태에서 입력 저장/reload·미리보기 취소/Escape를 확인 |
| 적용 실패→재시도→원문 Undo/Redo | 같은 실패 상태 재개10확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-materialization-p9m-resume-2026-09-13T12-21-53-364Z.json`) 완료. 저장 실패 때 저장된 빈 원문은 유지하고 로컬 적용 원문·틀 입력을 보존. 재시도 한 거래, 실제 Ctrl+Z/Redo로 빈 원문/틀/행 ID 복구, 명시 저장/reload, 연결 해제/reload |
| 실제 저장 이력과 복구 | 연결 해제 저장은 원문 판본1을 유지하면서 작성 설정만2로 올림. 실제 비교/취소/설정1복구/reload6확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-history-p9m-resume-2026-09-13T12-26-06-233Z.json`) 뒤 전체 data 동일 단언은 실패. 같은 Undo 상태의 재확인2 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-history-final-p9m-2026-09-13T12-26-50-660Z.json`)와 아래 기록 대조로 개인 공간·공개 내용의 복원, 저장 bytes/reload 쓰기0을 확인 |

13개 기록·현재 소스 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/structure-guidance-crosscheck-2026-09-13T12-29-01-748Z.json`)는 실제 최종 revision18과 복구 전16의 모든 개인 공간·공개 데이터가 동일함을 확인한다. 유일한 차이는 `creator-action`과 `creator-history-restore` 요청 영수증2개다. `program-store.ts`의 `planProgramUndo`와 기존 store 회귀는 actor의 private space만 되돌리고 요청 영수증을 유지한다. 원문 판본/작성 설정 판본/저장 envelope revision은 서로 다른 값이다. 검사를 위해 원래 모델이나 복구 범위를 바꾸지 않았다.

처음 실행의 멈춤은 보존한다: 틀별 제목 필드명 가정1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-guidance-p9m-2026-09-13T12-16-12-118Z.json`), 원문 aria-label을 가정한 적용 실패 후 대기1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-materialization-p9m-2026-09-13T12-20-22-383Z.json`), 원문 판본2를 기다린 이력 검사1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-history-p9m-2026-09-13T12-24-29-993Z.json`). 마지막6확인도 부분 기록으로 유지하며 성공 기록으로 덮어쓰지 않는다. 새 프로필을 만들거나 자료를 초기화해 실패를 피하지 않았다.

## 화면 평가

375×812·390×844·844×390·1024×768·1194×834·1440×900의 예시 트리거는 초점·화면 내 위치·실제 hit·44px·가로 넘침0을 확인했다. 375/1024의 계산 미리보기 적용도 화면 안에 보였다. 아래4PNG를 직접 확인했으며 실제 기기 검사는 아니다.

- 375px 예시 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-example-375-1789301858482.png`), 1024px 예시 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-example-1024-1789301858819.png`)
- 375px 계산 근거 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-calculation-375-1789301859580.png`), 1024px 계산 근거 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-calculation-1024-1789301859956.png`)

필요한 예시와 입력값의 구분·명시 적용·복귀는 해당 범위에서 양호하다. 예시를 펼치면 입력 폼이 아래로 밀리고 기존 제작 화면의 스크롤 부담은 남는다(정보량3/5). 계산 결과는 입력값 근거와 함께 읽을 수 있고 원문에 예시를 주입하지 않는다(이번 내용 충실도4/5). 전체 폼의 필수/조건부 필드 노출, 원문의 첫 초점·모바일 키보드 공간까지 통과한 평가가 아니다.

## 자동 검사·소스 경계

- 관련21/21. 처음20/21의 예시 테스트는 상위 details를 선택한 harness 오류였고 정확한 예시 영역으로 수정했다. 원문 불변 단언은 유지했다.
- 전체137파일1222/1222 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T12-15-32-805Z.json`), skip0·검사 중 소스 변경0. 타입315진입/진단0. production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T12-12-49-529Z.json`) PASS. 기록 대조에서 현재 파일이 build와 full suite의 hash와 같음을 확인했다.
- npm test2031실행/2030PASS/기존1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T12-24-19-142Z.json`), 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T12-25-04-770Z.json`), 공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T12-25-12-765Z.json`). npm은 기존 출처기한 실패이며 전체green이 아니다.
- 브라우저 예시/적용/이력 기록의 허용 prefix 밖 호출0·clear/remove0·page/console 오류0. 새 QA 프로필에는 보호 운영 키가0개이므로 byte-identical을 기존 운영 데이터의 실증으로 과장하지 않는다. 기존 다른 프로필은 초기화하지 않았다.
- 12:25경 원본 보호4781개 중4780동일/승인 route1/예상 밖0, D2 vendor26파일819423bytes/원본 bytes 불변·운영 writer0, v11 source integrity PASS. 의존성 audit는 재실행하지 않았고 이전5FAIL은 남는다.
- 캡처 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`)의 정적119검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T12-33-43-868Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T12-33-43-985Z.json`) PASS. 보고서 HTML 렌더는 미실행이다.

제품 변경: `ProgramCreatorStructureForm.tsx`와 CSS, `creator-structure-presentation.ts`. 검사 변경: 해당 폼 test와 presentation test. 부모 writer·운영 route·카탈로그 snapshot·compiler·저장 계약은 변경하지 않았다. QA 스크립트5개와 이 원장/진행 문서·보고서를 추가/갱신했다. 파일 수와 worktree 전체 dirty 수를 혼합하지 않는다.

## 다음 확인과 외부 경계

원래 여섯 틀의 모든 입력·조건부 필드·폼 전환/한 번 되돌리기·필수값 안내를 다른 반복/여행/시험 구조와 대조하고, 작성에서 개인 실행·선택 공개까지 연결한다. 이번 한 실제 이사 입력과 여섯 읽기 전용 예시가 그 모든 제작 동등성의 증거는 아니다. Map 새 항목/삭제·다른 기록 조합, 긴 화면·응답성과 전체10상황·두 개선 루프는 계속 진행한다.

실기기·OS 입력기·보조기술·외부 계정 미실행, 관찰 사용자0명. commit/push/PR/merge/Preview/Production/외부 게시 미실행. 보고서 HTML 렌더는 기존 URL 보안 정책 차단으로 미실행이며 우회하지 않는다. 실제 앱 PNG와 보고서 정적 검사는 별도다.
