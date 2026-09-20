# 작성 틀 조건별 입력 → 반복 개인 실행 대조

2026-09-13 · 실행판 `v-SEHFQ_ue8S9wnSNdTAs`. 전체 목표는 진행 중이다. 이전 [예시·계산 근거](creator-structure-guidance-review.md)를 보존하고 다른 반복 구조를 작성해 개인 실행까지 이어 확인했다.

## 원래 요구와 이번 적용

원본은 P0 작성 틀 명세 (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)와 pinned 카탈로그·validator다. 기존 코어의 필수값·일정 방식·오류 scope·원문/sidecar 분리를 변경하지 않았다. 당시 폼 UI는 미구현이었으므로 기존 화면을 삭제한 문제로 분류하지 않는다.

| 원래 요구/검토 항목 | 발견한 차이 | 적용과 확인 범위 |
| --- | --- | --- |
| 선택한 종료/날짜 방식에 맞는 입력 | 방식과 무관하게 종료일·회차·상대/직접 날짜를 모두 노출 | 카탈로그 조건8필드 대조. 선택하지 않은 **빈** 필드만 접음. 입력값0·음수·날짜와 오류가 있으면 유지. 조건 전환이 값을 삭제하거나 compiler를 바꾸지 않음 |
| 반복 group별 정확한 오류 위치 | 오류는 입력 근처에 있으나 긴 폼에서 되찾기 어려움. 요일 group은 오류 연결이 없었음 | 실패한 제출에서만 요약에 초점. group 이름/순번/field별 이동 버튼과 기존 inline 오류 연결. 두 운동 세션의 요일 오류가 각각 해당 group으로 이동함 |
| 값 있는 틀 바꾸기 확인·취소·한 번 Undo | 취소 버튼 뒤 picker 초점 복귀 누락 | 버튼 취소와 Escape 모두 picker 복귀·쓰기0. 주간 운동→빈 여행 틀→한 번 Undo로 모든 사용자 입력과 group ID 복원 |
| 명시 적용·원문 보존·복원 | 기존 기능 있음 | 서로 다른 요일의 운동2항목을 직접 입력. 화/목8회와 토8회로 원문 적용·명시 저장·reload. 예시 내용 자동 주입0 |
| 제작 결과와 개인 실행 | 기존 연결이 이 반복 구조에서 미검증 | 결과16회차→개인 문서1개→첫 회차만 완료→reload→Undo. 원본/작성 틀/다른 회차·개인 문서 내용/공개 데이터 보존 |

`ui-ux-pro-max`의 오류 요약/입력 연결 검색과 `flow-ux-review`의 불필요한 옵션 축소를 적용했다. Figma는 사용하지 않았다. 새 제품 정책·저장 schema·계산 규칙을 만들지 않았으며, 필수값 전체 사전 표시나 모바일 drawer까지 해결했다는 뜻은 아니다.

## 실제 브라우저 기록

기존 `program-structure-form-review`에서 이사 저장본을 남겨 두고 실제 UI로 새 빈 초안을 만들었다. 이번 초안은 `creator-35090962-0443-44a8-bc44-78a710112d59`, 개인 문서는 `doc-46993038-e527-4c61-844d-8e08d7d4fd9c`다. 최종 envelope revision30. 이전 이사 저장본과 다른 main QA 프로필은 초기화하지 않았다.

- 조건·오류 첫5확인, 부분 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-conditions-2026-09-13T12-50-53-072Z.json`): 빈 필드 접힘·입력 보존·오류 요약 초점·쓰기0 확인 뒤 QA가 요일 오류를 먼저 기대해 멈춤. 실제 코어는 종료 조건 오류부터 반환한다. 빌드 임시 배열이 소비돼 식별은 미확인으로 남았으며 새 route chunk는 일치했다.
- 같은 상태 재개5확인, 부분 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-conditions-resume-2026-09-13T12-53-37-592Z.json`): 종료 방식→첫 요일 오류 복귀 확인. 두 번째 세션 입력 직후 비동기 저장을 기다리는 QA predicate가 아직 없는 배열 원소를 읽어 TypeError를 냈다. 이 기록의 page error1은 해당 QA 함수의 예외이며 감추지 않는다.
- 같은 두 번째 세션에서 재개17확인, 완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-conditions-second-resume-2026-09-13T12-54-34-249Z.json`): 두 번째 요일 오류, 전환 취소/Escape/명시 전환/Undo, 빈 원문+틀 reload, 원문 적용·명시 저장/reload,6크기 적용 조작을 확인했다.
- 개인 인계2확인, 부분 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-recurring-handoff-2026-09-13T12-56-23-984Z.json`): 원문2항목/결과16회차에서 실제 인계 성공. QA가 개인 문서 투영문을 원본과 동일하게 단언해 멈춤. 원본은 `executionSources.revisions.raw`에 보존되고 개인 문서의 반복 Item 표시는 `반복 규칙:`으로 구분하는 기존 계약이다.
- 같은 개인 문서에서 재개11확인, 완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-recurring-execution-resume-2026-09-13T12-59-05-023Z.json`): 원본·안정 행 ID·반복 owner2개와 개인 문서의 구분, 첫 회차만 완료/reload,375/1024 조작, Undo 뒤 모든 개인 공간과 공개 내용의 정확한 복원을 확인했다. 인계를 다시 실행하거나 문서를 복제하지 않았다.

17/11은 완료된 검사 수다. 앞선5/5/2 부분 기록을 완료로 합산하지 않는다. 기록기는 현재 문서에 남아 있는 Flight JSON을 추가로 읽어 빌드를 확인하도록 수정했다. 임시 배열과 문서의 값이 충돌하면 여전히 fail-closed하며, 원본 실패 기록을 덮어쓰지 않았다.

## 화면 평가와 남은 차이

- 변경 전1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-modes-before-p9m-1024.png`): 종료 방식 미선택에도 종료일·총 회차가 함께 노출됐다.
- 적용 미리보기: 375 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-conditions-375-1789304079234.png`) / 1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-conditions-1024-1789304079506.png`). 375×812·390×844·844×390·1024×768·1194×834·1440×900에서 적용 버튼의 초점·hit·44px 이상·화면 내 위치·가로 넘침0을 확인했다.
- 개인 실행: 375 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-private-375-1789304347429.png`) / 1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-private-1024-1789304347535.png`). 첫 회차 완료와 나머지 미완료를 구분하며 해당 항목으로 키보드 접근했다. 캡처4개를 직접 확인했다.

정보 부담은 여전히3/5다. 긴 폼과 원문/미리보기 내부 스크롤, 모바일 개인 문서의 좁은 줄바꿈은 남는다. 이 결과를 전체 화면의 접근성·가림0 판정으로 확대하지 않는다. 실제 빈 초안 진입 snapshot에서는 원문 입력에 첫 초점이 없었다. 원문 첫 초점, 전체 필수값 안내, 모바일 drawer/가상 키보드 공간, 여행·시험의 완전한 입력·선택 공개는 다음 작업이다. 두 전체 개선 루프를 이 단일 반복 경로로 대체하지 않는다.

## 자동 검사·경계

- 관련25/25. 최초13개 중1실패는 모든 setup 필드가 항상 보인다는 이전 UI 단언이었다. 새 숨김/복원 조건을 명시해 검사했다. 이후25개 중1실패는 원 fixture가 횟수형인데 날짜형으로 가정한 테스트 준비 오류였고, 날짜형 입력을 명시해 재검사했다. 원문 불변 단언은 유지했다.
- 전체137파일1226/1226 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T12-50-24-604Z.json`), skip0, 소스 변경0. 타입315/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T12-46-44-237Z.json`), build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T12-47-28-063Z.json`). 현재344개 소스/검사 파일 hash가 build와 전체 suite 기록에 일치했다.
- npm2031실행/2030PASS/기존1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T12-57-04-276Z.json`). `seed-flows.test.ts:1289`의 출처 점검 기한9건 대0 단언 실패. 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T12-57-51-166Z.json`), 공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T12-57-58-423Z.json`).
- 완료 브라우저 기록의 허용 prefix 밖 호출0·clear/remove0·새 console/page error0. 앞의 QA predicate page error1은 별도 보존. 이 프로필에는 운영 보호 키가0개이므로 byte-identical을 운영 데이터 실증으로 확대하지 않는다.
- 별도 원본 보호4781개:4780동일·승인 route1·예상 밖0. 원 제작기 vendor26파일819423bytes 불변·운영 writer0, v11 integrity PASS. 의존성 audit는 재실행하지 않았고 이전 실패는 남는다.
- 기록기 별도4/4: 살아 있는 Flight 배열, 소비 후 문서 JSON, 서로 다른 build 충돌, 잘못된/실행형 문자열 거부를 확인했다. 보고서 정적126검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T13-04-21-423Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T13-04-21-533Z.json`) PASS. 최초 정적 검사에서는 전체 완료 아님을 밝히는 필수 문구가 빠져1건 실패했고, 명시 문구를 복구했다. HTML 렌더 검사는 아니다.

제품 변경3파일: `ProgramCreatorStructureForm.tsx`, 해당 CSS, `creator-structure-presentation.ts`. 관련 test2개, 브라우저 시나리오2개와 기록기/기록기 검사, 본 원장과 진행 문서/보고서를 갱신했다. 원래 catalog·compiler·validator·운영 route/writer는 변경하지 않았다.

실제 Android/iOS·OS 입력기·보조기술·외부 계정 미실행, 관찰 사용자0명. commit·push·PR·merge·Preview·Production·외부 게시 미실행. HTML 보고서 렌더는 기존 URL 정책 차단으로 미실행이며 우회하지 않는다. 제품 캡처와 보고서 정적 검사는 별도다.
