# 개인 계획을 보존하는 원본 일정 수용

2026-09-14 · 이 단계의 검증 실행판은 `lwhtQQM0kKk8KxPR1b5FG`다. [직전 같은 작성물](authored-update-loop-review.md)의 64번 저장 상태를 초기화하지 않고 이어 사용했다. 이후 시작 미정·상대 시작의 실제 결함과 수정은 [후속 검증](copy-start-followup-review.md)을 따른다. 전체 목표는 진행 중이다.

## 요구와 적용 범위

| 기존 요구 | 이번 적용 | 아직 남은 것 |
| --- | --- | --- |
| 개발1 개인화 + 개발2 판본 변경 + 개인공간 기록 보존 | 개인 시작일·전체/이후 반복 계획이 있을 때 새 일정의 결과를 읽기 전용으로 비교하고 확인 후 일정만 수용 | 시작 미정/상대 일정의 실제 브라우저 조합, 일반↔반복 전환 |
| 개인 기록을 원본 변경으로 덮지 않기 | 실제 개인 계획·완료 이벤트·기존 원본 완료를 그대로 보관. 새 회차에 완료를 복제하지 않음 | 실제 Map 삭제·다른 구조의 전체 조합 |
| 오류·취소·복귀 | 확인 기본 해제, Escape/취소/같은 요청/실패의 성공 변경0, 실패 후 동일 요청 재시도, 정확한 이전 판본 링크, Undo/reload | 전체 S01~S10의 최종 공통 회귀 |
| 수용 직전 무엇이 바뀌는지 알기 | 첫 캡처의 같은 시작일 화살표를 제거하고 받을 실제 요일·횟수·시작·시간·시간대를 확인 단계에 표시 | 긴 설정창의 이중 스크롤·누적 사용 응답 |

[설계 계약](copy-schedule-resolution-design.md)의 `retainedChoices.version:1`은 PoC 전용이다. 공개 규칙이나 개인 계획 객체를 복제하지 않고 실제 판본·항목·이전 시작 선택·계획 ID를 보관한다. 기존 payload는 읽기만으로 이전하거나 저장하지 않는다. 자원 상한에서는 이전 선택을 삭제하지 않고 새 수용을 거절한다. 정확한 옛 판본·시작으로 돌아가 기존 계획이 다시 활성화되는 경우도 확인 화면에 명시한다. 영구 제품 정책으로 확정하지 않는다.

## 같은 자료의 실제 브라우저 흐름

| 단계 | 저장 상태 | 확인 |
| --- | --- | --- |
| 기존 작성·공개·사본·완료·새2판 유지 | 64 | 직전 실행 결과와 같은 자료 |
| 두 번째 원문 회차부터 개인 계획을 12/4로 변경 | 65 | 준비5확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-prepare-2026-09-14T02-30-58-176Z.json`), 공개 판본·원본 완료·개인 원문 동일 |
| 개인 12/4 회차 완료 | 66 | 원본 12/1 완료와 별도 이벤트 |
| 새 일정 수용 → 보존 기록 → Undo/reload | 67 → 68 | 본 시나리오22확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-core-2026-09-14T02-33-23-554Z.json`). Escape·취소·합성 pointer cancel·quota·키보드·판본 복귀 포함 |
| 확인 화면 개선 후 같은 상태에서 수용 → Undo/reload | 69 → 70 | 최종13확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-followup-2026-09-14T02-40-50-608Z.json`). 새 규칙 표시·실패 후 확인 유지·키보드 재시도·두 완료 복원 |

준비/본 시나리오는 `5XbUo5kOShjZJCwtDBGEq`, 최종 화면 재검사는 `lwhtQQM0kKk8KxPR1b5FG`다. 5·22·13은 서로 다른 검증점 묶음이며 요구 충족률이나 두 차례 전체 개선 루프 수가 아니다. 본 시나리오 성공 쓰기3/실패 시도1, 최종 재검사 성공 쓰기2/실패 시도1을 구별한다. 최종70의 개인 공간·공개 데이터는 수용 전68과 같다. 개인 계획과 두 완료 기록은 다음 검사에서도 보존한다.

## 화면 평가

- 수정 전375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-1789353208058-review-375.png`): 새 요일을 보려면 앞의 비교로 돌아가야 했다.
- 최종375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-final-1789353656900-375.png`), 최종1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-final-1789353657262-1024.png`): 수용 결정 옆에 실제 받을 규칙과 개인 계획 보관 결과를 표시한다.
- 이전 선택 이력375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-1789353209753-history-375.png`), 기록 보존1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-resolution-1789353210413-recovery-1024.png`): 이전 판본·원래 완료·개인 완료를 구별한다.

375×812, 390×844, 844×390, 1024×768, 1440×900에서 수용 버튼 중앙 클릭 가능·높이44px 이상·가로 넘침0을 검사했다. 새 콘솔 오류/page error/허용 밖 쓰기0이다. 모든 화면의 접근성 통과나 실제 터치 기기 검사라는 뜻은 아니다. 수정 전375·최종375·기록 보존1024 캡처를 직접 확인했다.

`figma-ux-ui-design`은 Code-only로 기존 컴포넌트를 재사용했다. Figma 파일·이미지 생성은 하지 않았다. `flow-ux-review`에서 의미 없는 같은 날짜 화살표를 뺐고, 원본 일정·보관 결과·오류/복구·키보드 경로는 유지했다. 인지 부담/조작성은 내부 평가3: 이중 스크롤과 비활성 이전 버튼의 부담은 남는다. 기록 보존/판본 구별4. 사용자 관찰 점수가 아니다.

## 자동 검사와 보존 증거

- 첫 표적37개 중35통과/2실패. 보존된 개인 완료까지 새 회차로 간주한 검사 기대를 수정해 새 회차8개 미완료와 이전 개인 완료의 읽기 전용 보존을 각각 확인했다. 이후 표적39/39에 시작 미정·상대 시작2개를 추가했다.
- 첫 전체 150파일1,454/1,454 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T02-26-39-086Z.json`)에 이어 마지막 화면 문구 보완 후 최종1,454/1,454 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T02-36-21-437Z.json`)도 통과했다. 실패/skip/실행 중 소스 변경0이다. 코드·저장 기록29대조 (로컬 전용 근거: `../../../output/integrated-product-poc/copy-resolution-crosscheck-2026-09-14T02-52-37-446Z.json`)에서 당시370개 코드의 검사/build/현재 hash, 실제64→70 연속성, 여섯 캡처와 기록 보존을 확인했다. 새 브라우저 실행 수는 아니다.
- 최종 production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T02-36-11-410Z.json`) PASS·소스 변경0, strict341개/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T02-39-05-560Z.json`).
- npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T02-30-34-155Z.json`): 2,031실행/2,030통과/1실패/skip0. 기존 `seed-flows.test.ts`의 출처 검토기한 경과9건이다. 날짜만 바꿔 없애지 않았다. 승인 회귀201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T02-34-36-241Z.json`), 공개 표면19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T02-34-38-607Z.json`). 이 세 검사는 마지막 표시 문구 보완 전이며 기능 모델은 동일하다.
- 보호 파일4,781중4,779 bytes 동일·기존 승인 연결2개 외 예상 밖 변경0. 운영 STATUS 본문 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T02-39-12-847Z.json`)도 원래 hash와 동일. D2 원본26파일/819,423bytes, 운영 writer 모듈0, v11 vendor 무변경을 재확인했다.
- 브라우저 운영 key 목록은0개다. 범위 밖 setItem/removeItem/clear0을 채워진 운영 데이터 전체 보호의 증거로 확대하지 않는다. 실제 운영 sentinel을 가진 controller 검사와 파일 보호 증거는 별도다.
- 처음 strict 검사1진단, 다음 검사2진단은 타입 축소 문제였으며 수정 후0이다. 보안 audit는 이번에 재실행하지 않았고 이전5건의 실패를 해결했다고 주장하지 않는다.

## 변경 파일

기능/회귀6개: `contract.ts`, `private-space.ts`, `public-copy-recurrence.ts`, `public-copy-source-update.test.ts`, `ProgramCopyInspector.tsx`, `ProgramCopyInspector.test.tsx`. 모두 기존 Program 전용 영역이다.

검사4개: `program-copy-resolution-prepare.cli.js`, `program-copy-resolution-core.cli.js`, `program-copy-resolution-followup.cli.js`, `program-copy-resolution-crosscheck.mjs`. 설계/이 보고서와 현재 원장·통합 HTML의 링크 및 요약을 갱신한다. 기존 다른 작업의 dirty 파일은 정리·stage하지 않는다.

## 남은 범위와 실행 상태

다음은 개인 시작 미정/상대 조건의 실제 UI 조합, 일반↔반복 종류 전환, 재추가 하위 확인의 개인 수정 충돌이다. 실제 Map 삭제·여섯 작성 틀 전체·긴 화면/누적 응답·최종 같은 빌드 S01~S10·두 전체 평가→개선 루프는 계속 남는다. 새 실행/전체 백업·기기 이동/재공개·신고 정책은 미승인 후보로 유지한다.

실제 Android Chrome/iOS Safari·OS IME·보조기술·외부 계정 import/동기화: 미실행. 관찰 사용자:0명. 보고서 HTML 렌더: 기존 URL 정책 차단으로 미실행이며 주소나 도구를 바꿔 우회하지 않는다. 앱 브라우저 캡처와 구별한다.

commit: 미실행. push: 미실행. PR: 미실행. merge: 미실행. Preview: 미실행. Production: 미실행. 전체 목표는 완료하지 않았다.
