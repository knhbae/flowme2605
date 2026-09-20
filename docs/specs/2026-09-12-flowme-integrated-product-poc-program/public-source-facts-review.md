# 반복 기록의 원본 판본 비교 — 연결·검증

2026-09-14. [D 원본 수용](recurring-source-update-review.md) 다음 작업이며 전체 목표의 중간 결과다. 최종 실행판은 `49M7OnMaYy3JeXPUKpV5h`다.

## 원래 요구와 적용

| 요구 | 발견한 누락 | 현재 적용과 판정 |
| --- | --- | --- |
| 개발1 공개 판본·개발2 반복 의미·v4.1 지난 실행 기록 구별 | 복구 reader는 legacy token만 읽어 공개 사본의 제목·시간 등 근거가 비었다 | exact copy/Flow/Item·일정 판본·token·실제 불변 공개 item을 대조해 읽는다. 해당 연결 충족 |
| 일정 변경 뒤 옛 기록과 새 원문 비교 | 규칙이 달라 같은 회차가 없으면 현재 원문도 표시되지 않았다 | 현재 수용한 item의 근거를 회차 재연결 대상과 분리했다. 원문 두 판본은 보이지만 다른 회차의 완료로 연결하지 않는다 |
| 원문 날짜와 개인 실행 위치 분리 | 공개 시작 미정일 때 개인 시작일을 원문 날짜로 오해할 수 있었다 | 공개의 시작 미정·상대 기준일·고정 날짜를 그대로 표시한다. 개인 날짜·완료는 별도 유지 |
| 원본 없음·변조·중복을 명시 | 빈 값이 미지정처럼 보일 수 있었다 | 원본 확인 불가를 표시하며 다른 Flow/Item/최신 판본을 대신하지 않는다. 읽기에서 저장·migration 없음 |

UI는 기존 비교표·접힌 원문 상세를 재사용했다. 일정 기준 공개 판본과 개인 문서 수정 내용의 차이를 한 문장으로 설명한다. Figma/새 CSS/새 writer/schema는 추가하지 않았다. React 검토에서는 현재 원문 비교를 행마다 다시 계산하던 경로를 한 번 계산해 재사용하고, 기존 훅·입력 보호·재연결 guard를 유지했다.

## 실제 브라우저와 상태 연속성

앞선 오류 안내16확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-feedback-2026-09-13T22-12-56-228Z.json`)의 revision19부터 같은 자료로 이어갔다. 첫2확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-facts-2026-09-13T22-29-07-151Z.json`)은 첫 회차 완료를 실제 저장한 뒤 자동화가 `원문 일정`을 `일정`으로 찾다가 멈췄다. 제품 실패가 아니라 선택자 오류이며 성공 저장1회를 보존했다.

새 snapshot의 실제 label을 사용해 revision20에서 후속22확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-facts-resume-2026-09-13T22-30-56-200Z.json`)을 완료했다. 일정만 v3로 수용→옛v1/현재수용v3 원문 비교→재연결 불가→상세 열기/닫기→5크기 보관/취소→Escape→명시 보관 유지→일정Undo→완료Undo→reload다. 후속 성공 쓰기3회, 비교/보관 유지/취소/새로고침 쓰기0이다. 원래 완료 시각·개인 날짜·공개 payload를 보존하고 마지막에는 revision19의 모든 개인 공간이 exact 복원됐다.

375×812·390×844·844×390·1024×768·1440×900의 보관/취소10컨트롤은44px 이상·hit-test PASS·가로 넘침0이다. console/page error·범위밖쓰기0이며 운영 보호키는0개다. 이것을 채워진 운영 데이터의 byte 불변 검사로 확대하지 않는다. 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/source-facts-1789338659018-comparison-375.png`)·1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/source-facts-1789338659319-comparison-1024.png`)를 직접 보았고, 모바일 세로 비교 길이와 넓은 화면의 빈 옆 공간은 여전히 불편하다. 실제 기기·관찰 사용자 검증은 아니다.

## 자동 검사와 실제 변경

- 새 모델5개는 수정 전5FAIL, 후속 UI2개를 포함한 관련27개는27PASS다. 기존3개 원본 재연결 모델/저장 검사를 함께 실행했다.
- 전체146파일1397/1397 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T22-25-33-598Z.json`), skip/실패/소스 변경0. strict333/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T22-24-29-666Z.json`), build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T22-25-23-388Z.json`). build만1024/4MiB 프로세스 옵션을 사용했으며 검사를 생략하지 않았다.
- npm2031중2030PASS/1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T22-32-35-890Z.json`): 기존 source review_due9건. 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T22-32-53-811Z.json`)·공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T22-32-56-098Z.json`) PASS. 앞선 의존성5건FAIL은 변경/해결하지 않았다.
- 기록·소스21대조 (로컬 전용 근거: `../../../output/integrated-product-poc/source-facts-crosscheck-2026-09-13T22-32-46-521Z.json`): 실제 store decoder, 두 브라우저 기록의 연속성, 원문/개인 공간, 현재362소스와 test/build hash를 확인했다. 새 브라우저 실행이나 요구 충족률이 아니다.

1W_T 이후 제품/테스트 변경은 정확히6파일이다: `public-copy-recurrence.ts`, `recurrence-recovery.ts`, `public-copy-source-update.test.ts`, `ProgramRecurrence.tsx`, 그 테스트, `ProgramRecurrencePlanRecovery.tsx`. 실행/대조 스크립트와 관련 spec/보고서 갱신은 별도다. 이전 `ProgramCopyInspector` 오류 안내 코드는 이번에 바꾸지 않고 새 빌드에서 확인했다.

## 남은 기능과 경계

반복 제안/채택, 일반↔반복·개인 시작일/개인 계획 충돌의 실제 해결, 실제 작성→공개→사본의 전체 연속 검증은 남는다. 별도 개인 계획 보존 패널은 공개 owner의 문서/행 재진입까지 추가 대조해야 한다. 현재 `ProgramRecurrencePlanRecovery`의 문서 범위 연결은 creator/saved binding 중심이므로 공개 계획의 원문 제목 표시 보완만으로 그 패널 전체 연결을 완료로 세지 않는다.

여섯 틀·Map 삭제/다른 구조·긴 화면/누적 응답·전체10상황과 두 전체 개선 루프도 미완료다. 실제Android/iOS/OS입력기/보조기술/외부계정은 미실행, 관찰 사용자0명이다. commit/push/PR/merge/Preview/Production/외부 게시·운영 migration은 하지 않았다. 기존 보고서 HTML 렌더 차단을 우회하지 않는다.
