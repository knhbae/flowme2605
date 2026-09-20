# 빈 원문 첫 초점·모바일 작성 틀·여행 인계 대조

2026-09-13 · 여행의 작성·개인 인계·선택 공개·재진입 검증 완료. 전체 목표의 중간 묶음이다. 원래 작성 틀 명세 (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)와 [전체 실행 계약](spec.md)을 따른다. 원문·카탈로그·validator·운영 writer는 바꾸지 않는다.

## 요구와 적용

| 요구 | 변경·근거 | 상태 |
| --- | --- | --- |
| 빈 초안의 첫 초점은 원문 | 성공한 명시 새 초안 진입에 한해 1회 초점. 저장본/reload·취소·실패·IME에서는 가로채지 않음 | 부모 회귀와 실제 새 여행 초안에서 확인 |
| 모바일 한 열 작성 틀, PC 기존 배치 | 같은 mounted form을 작은 화면의 native dialog로 열고 PC에서는 inline 표시. 새 sidecar/writer 없음 | 닫기/Escape/회전·합성 composition 입력 보존 확인 |
| 닫기·회전이 입력을 버리지 않음 | typed sidecar·원문 bytes 보존. 모달 미지원일 때 inline 유지 | 대체 경로가 닫히던 실제 코드 결함을 회귀로 발견·수정 |
| 명시 적용만 기존 native 원문 명령 실행 | 모달의 배경 inert를 해제한 다음 기존 원문 편집기에 초점·단일 명령 | 같은 실패 초안에서 단일 적용·native Undo/Redo·명시 저장·reload17확인 완료 |
| 여행의 상대 준비일·현지 일정·시간대·하위 체크 | UI에서 새 자료 입력. 원문은 D-3 유지, 계산 영역은12/7. 시간대 누락 오류의 정확한 입력 복귀 | 작성/실패·7크기 검사, 실제TXT/개인 인계7확인·선택공개9확인·정확재진입11확인 |

`flow-ux-review`와 `ui-ux-pro-max`의 초점 가림/입력 보존 기준을 적용했다. Figma는 사용하지 않았다. 닫힌 폼 내용을 삭제하지 않으므로 닫기 확인창을 추가하지 않았고, 읽기 전용 예시는 원문에 자동 주입하지 않았다.

## 보존한 첫 실행과 진단

- 첫17확인 후 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-mobile-travel-2026-09-13T13-28-45-406Z.json`): 새 초안·원문 첫 초점·이전 자료 보존·닫기/Escape/회전·합성 IME 보존. Tab의 브라우저 chrome 진입을 배경 앱 초점 이탈로 간주한 assertion에서 멈춤.
- 실제 초점4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-modal-focus-2026-09-13T13-30-45-589Z.json`): 마지막 Tab→BODY/document.hasFocus=false→다음 Tab에 모달로 복귀. 배경 입력칸의 focus()도 native inert가 차단. 브라우저 UI의 키보드 접근을 막는 별도 trap은 만들지 않음.
- 같은 초안 재개22확인 후 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-mobile-travel-resume-2026-09-13T13-31-34-722Z.json`):12차례 Tab에서 앱 배경 진입0, 시간대 오류·원문0·정확한 오류 복귀. QA가 원문에도 계산 날짜12/7이 들어간다고 가정했으나 원래 계약은 상대 날짜D-3을 보존함. compiler를 바꾸지 않음.
- 적용 전11확인 후 실제 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-travel-apply-2026-09-13T13-33-05-235Z.json`): 상대/현지 시간/하위 체크·7크기의 적용 버튼 focus/hit/44px/가로 넘침 검사 통과. 모달이 배경 원문 편집기를 inert로 만들어 기존 native 명령이 실패. 원문·sidecar 보존/저장 호출0. 모달을 먼저 닫도록 제품을 수정하고 이 자료를 이어 검사한다.

위 부분 기록을 완료로 승격하거나 확인점을 서로 더해 요구 충족률로 계산하지 않는다. 첫 전체1232/1232는 모달 적용 순서 수정 **전** 소스의 근거다.

## 후속 결과

동일 여행 draft `creator-e32d4217-67a7-4cd6-8739-c808b4c3b9b2`와 개인 문서 `doc-dbeac154-d971-48ee-91d7-48209be9439d`를 이어 사용했다. 기존 이사/주간 운동 저장본과 개인 문서는 초기화하지 않았다. 실행판은 `YAHg_h7ANbAknOP0KaQhz`다.

| 실제 경로 | 결과·근거 | 완료 범위 |
| --- | --- | --- |
| 동일 실패 초안→명시 적용→Undo/Redo→저장/reload | 17확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structure-travel-apply-fixed-2026-09-13T13-38-11-323Z.json`) | 원문은 D-3, 결과는12/7. native source identity·typed sidecar 유지 |
| TXT 받기→개인 문서 인계 | 7확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-handoff-2026-09-13T13-40-29-768Z.json`) | 실제2항목/2하위 확인·시간대/장소 출력. 사본 인계 전 파일 받기는 Program쓰기0 |
| 개인50%와 메모→선택 미리보기→로컬 공개 | 9확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-private-publish-accessible-resume-2026-09-13T13-53-37-930Z.json`) | 1항목/1하위 확인·미정 일정만 새불변판본. 개인 문서/기록/원문 불변 |
| 내 활동→고정 공개 판본→파일→정확한 개인 원문→reload | 11확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-reentry-preserved-2026-09-13T13-57-32-671Z.json`) | 키보드 실제 행동, version가 붙은 정확한 Flow URL, 원문 문서ID, 파일 출력·reload 추가쓰기0 |

공개 Flow는 `flow-555086b3-0faf-4108-99cc-de014d6a13d2`, 새 판본은 `version-cdb05d2d-8a38-472c-aa32-f16f6caf7716`이다. 네트워크 공개가 아닌 로컬 PoC 상태 전이다. 공개 item의 `publication-line-…`은 기존 행 기반 공개 identity다. 첫 공개 검사의 확인점 이름에 ‘private source IDs 제외’가 있었으나 실제 단언은 개인 값 보존이었다. 뒤의11확인에서 공개 필드 allowlist·문서 경로/개인 값 비포함과 행 기반 ID를 명시적으로 구분했으며 ‘모든 개인 ID를 제거했다’고 주장하지 않는다.

앞선 공개2확인 후 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-private-publish-2026-09-13T13-43-11-189Z.json`)과 같은 초안 재개2확인 후 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-private-publish-resume-2026-09-13T13-52-13-672Z.json`)은 각각 중첩 locator 범위와 재열린 textarea label 선택 오류다. 공개 초안을 다시 만들거나 개인 메모를 중복 추가하지 않고 같은 입력으로 재개했다. 재진입 검사도 version query를 빠뜨린 URL 단언, CLI의 URL 생성자 부재, 숨겨진 개인 문서와 공개 상세를 함께 찾은 locator, 이미 열린 disclosure를 다시 닫은 검사 가정을 바로잡았다. 부분 기록은 시간별 JSON에 보존하며 최종 성공으로 덮지 않는다.

## 화면 평가와 실제 남은 불편

작성 적용 버튼은375×812·390×844·844×390·1024×768·1194×834·1440×900·390×360에서 초점·hit·44px 이상·가로 넘침 없음으로 확인했다. 공개 미리보기와 재진입은375/1024를 확인했다. 캡처를 직접 보고 다음을 구분했다.

- 375px 작성 틀 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-drawer-375-812-1789306696925.png`), 1024px 작성 틀 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-drawer-1024-768-1789306697266.png`), 작은 높이 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-drawer-390-360-1789306697683.png`): 적용·취소와 닫기에 접근 가능. 예시/원문 내부 스크롤 부담은 남는다.
- 375px 선택 공개 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-selected-public-375-1789307622987.png`), 1024px 선택 공개 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-selected-public-1024-1789307623345.png`): 공개 범위는 명확하다. 모바일 제목 끝 글자의 어색한 줄바꿈과 여러 복구 행동이 차지하는 높이는 개선 대상이다.
- 375px 개인 재진입 (로컬 전용 근거: `../../../output/playwright/integrated-program/travel-private-reentry-375-1789307854300.png`): 정확한 문서에 돌아왔지만 상단 메뉴·작업 도구 아래 편집 영역이 좁고 원문 속성 줄바꿈이 길다. 가로 넘침0을 사용성 완료로 바꾸지 않는다.

agent 평가상 데이터/소유 구별은 해당 시나리오에서 충족, 입력/복귀 조작성은 부분 충족, 인지 부담·긴 화면은 개선 필요다. 이번 후속에서는 UI를 더 추가하거나 복구·출처 안내를 제거하지 않았다. 실제 사용자 평가는 아니다.

## 자동 검사와 변경 파일

모달·첫 초점 관련21/21, build PASS, npm2031중2030PASS/기존 출처기한1FAIL, 승인201/공개19 PASS다. [Map 목록 변경 모델](map-catalog-change-review.md)2개를 포함한 최종 138파일1234/1234 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T14-05-01-314Z.json`)·skip0·검사 중 소스 변경0, strict316/진단0을 확인했다. 14개 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/travel-crosscheck-2026-09-13T14-12-34-390Z.json`)에서 현재 runtime/build와 전체검사 입력, 같은 여행 자료와 두 실제TXT 파일403/225바이트·SHA256을 확인했다. 이것은 새 브라우저 실행이나 새 사용자 시나리오가 아니다.

제품 변경은 `ProgramCreatorWorkspace.tsx`, `ProgramCreatorStructureForm.tsx`와 CSS, 두 관련 test 파일이다. 후속 증거는 `program-travel-private-publish.cli.js`, `program-travel-reentry.cli.js`, `program-travel-crosscheck.mjs`, 앞선 작성·인계 CLI와 시간별 기록, 이 원장·현재 판정·진행/요구/상황 원장·캡처 보고서에 남긴다. 기존 `/my`와 운영 writer 변경은 없다.

## 남은 범위와 증거 경계

여섯 틀 전체 동등성, 시험 등 다른 구조·Map 새 항목/삭제/반복/과거 기록 조합·응답성·전체10상황/두 전체 개선 루프는 계속 남는다. 첫 모바일 panel 수정이나 같은 초안의 재검사를 전체 개선 루프 완료로 세지 않는다.

실제 Android/iOS·OS 입력기·보조기술·외부 계정은 미실행, 관찰 사용자0명이다.390×360은 작은 viewport이며 실제 소프트키보드 검사가 아니다. 현재 브라우저 프로필의 운영 보호키0개와 허용 밖 쓰기0을 운영 실데이터 불변 증거로 확대하지 않는다. 별도의 원본 소스 보호와 운영 키가 들어 있는 기존 검증은 각각 구분한다.

commit·push·PR·merge·Preview·Production·외부 게시 미실행. `flow-report-artifact`의 렌더 확인은 기존 보고서 URL 보안 정책 차단 때문에 수행할 수 없으며 우회하지 않는다. 허용된 제품의 실제 PNG 검사와 보고서 정적/문서 검사는 별도다.
