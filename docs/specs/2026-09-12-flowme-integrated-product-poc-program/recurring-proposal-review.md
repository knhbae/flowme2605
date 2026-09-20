# 반복 제안의 비교·판본 준비와 채택 안내

2026-09-14 · P07/P08, S08/S09/S10의 진행 기록. 전체 목표는 계속 진행 중이다. 실제 반복 일정 제안 입력과 공개부터의 연속 경로를 완료한 보고가 아니다.

## 원래 요구와 이번 변경

개발1의 공개 원본/사본 분리, 개발2의 고정 판본·항목 지정 제안, v4.1의 개인 실행·지난 기록 보존을 [전체 계약](spec.md)과 [D 연결 설계](recurring-source-update-design.md)에 따라 연결한다.

| 원래 요구 | 발견한 공백 | 이번 결과 |
| --- | --- | --- |
| 기준 원본·최신 원본·제안을 정확히 비교 | 반복 객체는 같은 값이어도 기존 비교기가 false를 반환해 충돌로 표시 | 저장 모델과 같은 구조 비교를 사용. 규칙·간격·요일·종료·시작·시간·시간대의 실제 변경은 계속 충돌 |
| 원문 일정을 손실 없이 표시 | 반복 일정도 마지막 fallback인 ‘날짜 미정’으로 표시 | 기존 typed 반복 설명기로 규칙·종료·시작·시간·시간대를 표시 |
| 선택 필드만 최신 판본에 반영 | 제안 검토의 판본 조립이 공개 제한과 결합되어 반복 후보 자체를 검증하기 어려움 | 같은 writer가 호출하는 읽기 전용 `prepareProgramProposalVersion`으로 분리. 선택 patch와 최신의 다른 필드·출처·안정 Item ID 보존 |
| 실행할 수 있는 행동과 불가 이유를 구별 | metadata 제안이어도 최신 판본에 반복 항목이 있으면 writer는 거절하지만 채택 버튼은 활성화 | 최신 전체 항목과 patch의 공개 준비 상태를 확인. 불가 이유를 버튼에 연결하고 보류·거절 유지 |

판본 준비는 새 ID·작성자·시각·영수증·저장값을 만들지 않는다. 공개 필드만 분리 복제하며 개인 문서나 Undo를 후보 입력으로 읽지 않는다. 실제 검토 거래는 현재 제안·판본을 다시 확인한 뒤 준비 함수를 호출하고, 공개 제한을 통과해야 새 불변 판본을 저장한다. 별도 후보를 외부에서 전달해 저장하는 API는 만들지 않았다.

`PROGRAM_PUBLIC_RECURRENCE_RELEASE_V1.enabled`는 여전히 false다. 이번 준비 함수나 제한 안내를 반복 공개 기능 완료로 세지 않는다. 일반 제안의 작성자 채택 경로는 기존 회귀로 유지했다.

## 자동 검사

| 실제 실행 | 결과와 범위 |
| --- | --- |
| 최초 PRP01~06 | 6실행 /2PASS /4FAIL. 같은 반복의 거짓 충돌과 설명 손실을 재현 |
| 최종 표적 | 37/37: 반복12, 기존 publication11, 검토 화면14. 서로 겹치는 중간 실행은 더하지 않음 |
| 최종 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T23-38-32-351Z.json`) | 148파일 /1,420실행 /1,420PASS /실패·skip·실행 중 소스 변경0 |
| strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T23-35-40-972Z.json`) | 337 entry files /진단0 |
| production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T23-40-13-783Z.json`) | PASS. 실행판 `5LjR9EPfICcoEIYo0-0LY` |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T23-42-20-888Z.json`) | 2,031실행 /2,030PASS /기존 출처기한1FAIL. `seed-flows.test.ts:1289`, 검토기한9건이 원인 |
| 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T23-45-00-267Z.json`) /공개 표면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T23-45-02-636Z.json`) | 각각201/201,19/19 |
| 소스·실제 저장 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/proposal-review-crosscheck-2026-09-13T23-45-53-295Z.json`) | 19대조. 검사/build/현재366소스 동일, O1dK 이후 정확5제품·검사파일 변경, 실제 store decoder로 저장본 읽기 |

중간 strict에서 반환 union 추론 오류1건을 수정했다. 첫 전체 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T23-33-42-098Z.json`)은1,420개 assertion이 통과했지만 검사 중 해당 타입 수정1파일이 있어 최종 근거에서 제외하고 전부 재실행했다. 대조 스크립트의 최초 ESM/CJS import 오류와 wire Undo를 런타임 envelope validator에 직접 넣은 오류도 제품 결함과 구별한다. 현재 대조는 실제 `loadProgramStore`로 읽는다.

PRP12는 실제 controller에서 공개 제한에 따른 채택 거절 시 set/remove/clear0, 보류1쓰기·같은 보류0쓰기·reload·거절1쓰기를 확인했다. 정확한 PoC key 밖 호출은0이고 운영 sentinel 문자열 bytes, 공개 판본과 전체 개인 공간을 보존했다. 이 모델 검사를 실제 반복 일정 제안의 사용자 제출·채택으로 설명하지 않는다.

## 같은 브라우저 자료의 전후 비교

`program-source-update-d-review`의 기존 자료를 초기화하지 않았다. 공개 fixture3판본·개인 사본·두 참조·기록을 유지하고, **설명 필드 제안**을 실제 UI로 하나 제출했다. 반복 일정 필드의 제출 검사는 아니다.

1. 준비5확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-prepare-2026-09-13T23-37-35-313Z.json`): O1dK, revision30→31. 정확한 v3/c3-fixed에 설명 patch만 추가. 공개 판본과 전체 개인 공간 그대로.
2. 로컬 예시 인물을 작성자인 민지로 명시 전환해 revision32. 이는 계정 인증 검사가 아니다.
3. 수정 전4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-before-2026-09-13T23-39-55-678Z.json`): 같은 제안에서 반복 일정의 ‘날짜 미정’ 표시와 채택 버튼 활성화를 재현. 이 기록의 complete는 결함 재현 완료이며 제품 통과가 아니다. 저장값 변경0.
4. 수정 후16확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-after-2026-09-13T23-42-45-490Z.json`): 실제5LjR. 같은 제안·revision32에서 반복 사실 표시, 채택 제한과 접근 가능한 이유, 보류·거절/Tab,5크기·reload를 확인. 제품 쓰기0, 전체 raw 동일, console/page error0.

다섯 크기는375×812,390×844,844×390,1024×768,1440×900이다. 보류·거절은 모두44px 이상이며 hit-test 통과·가로 넘침0. Tab은 비활성 채택을 건너뛴다. 이번 비교의 운영 보호 key는0개이므로 ‘채워진 실제 운영 데이터 불변’ 증거로 확대하지 않는다. 위 모델의 sentinel 검사와 저장소/파일 보호 검사는 별개다.

수정 전1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-before-1789342797405.png`), 수정 후375 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-after-1789342968239-375.png`), 수정 후1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/proposal-review-after-1789342968629-1024.png`)를 직접 열어 확인했다. 후속 두 캡처는 결정 버튼 부근이다. 전체 비교와 원문을 한 화면에 모두 표시했다는 근거가 아니다.

## UX 평가와 다음 구현

기존 세 값 비교·접힘·검토 의견·복구 동작을 재사용했다. 새 카드나 모달은 만들지 않았고 기존 채택 설명 한 곳을 실제 불가 이유로 바꿨다. Figma는 사용하지 않은 Code-only 작업이다. 실행 명확성은 이 결정 맥락에서 개선됐지만 비교부터 결정까지의 긴 스크롤, 내 활동의 빈 영역과 반복되는 복구 버튼은 남은 부담이다.

다음은 `ProgramCopyInspector`의 반복 제안 입력을 기존 `ProgramPublicationRecurrence`의 typed draft/parser에 연결하는 일이다. 정확한 기준 판본·항목과 요청 identity를 입력 시작 때 고정하고, 항목/판본 변경·이동·실패 때 미제출 입력이 조용히 바뀌거나 사라지지 않도록 해야 한다. 같은 요청의 재시도·취소·원본/개인 날짜 분리도 함께 확인한다. 그 뒤 작성자 채택과 실제 새 불변 판본, 사본 명시 수용을 연속 검증한 후 공개 제한을 해제한다. 준비용 fixture·비교 UI 통과로 이 경로를 완료 처리하지 않는다.

일반↔반복 전환·개인 시작/계획 충돌 해결, 여섯 작성 틀의 전체 동등성, 실제 새 Map 원본의 삭제·다른 구조, 누적 사용 성능·긴 화면, 전체10상황과 두 전체 개선 루프는 그대로 남는다. 실제 Android/iOS·OS 입력기·보조기술·외부 계정 왕복은 미실행, 관찰 사용자0명. 기존 의존성5건은 이번에 재검사하거나 해결하지 않았다. commit/push/PR/merge/Preview/Production/외부 게시 모두 미실행. 보고서 HTML의 URL 정책 차단은 우회하지 않는다.

## 변경 파일

제품·자동 검사5개: `proposal-comparison.ts`, `publication.ts`, `proposal-recurrence.test.ts`, `ProgramProposalReview.tsx`, `ProgramProposalReview.test.tsx`.

검증 스크립트4개: `program-proposal-review-prepare.cli.js`, `program-proposal-review-before.cli.js`, `program-proposal-review-after.cli.js`, `program-proposal-review-crosscheck.mjs`. 이 문서와 상위 원장·기존 HTML 보고서의 최신 안내를 갱신했다. 기존 운영 route/저장 schema/key/writer는 수정하지 않았다.

## 보호·보고서 확인

현재 원본 보호 검사4,781개 중4,779개 bytes 동일, 기존 허용 접점2개, 예상 밖 변경0이다. STATUS 운영 본문 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T23-49-37-970Z.json`)는 PoC 안내4줄을 제외한 기존 본문의 정확한 해시가 같음을 확인한다. native creator26파일819,423bytes·운영 writer module0과 v11 vendor 원본 무결성도 다시 통과했다.

보고서 정적 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T23-49-39-421Z.json`)는196확인·이미지4개·실패0이다. 실제 HTML 렌더는 URL 정책 차단으로 미실행이며, 이 정적 검사를 화면 검증으로 대체하지 않는다. docs 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T23-49-39-800Z.json`)는 PASS다. 원격 CI·배포나 실제 운영 브라우저 저장소를 새로 검증한 결과는 아니다.
