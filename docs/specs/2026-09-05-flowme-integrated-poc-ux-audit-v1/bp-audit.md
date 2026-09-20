# P3-K 통합 blueprint·화면 연결 요구·현재 구현 대조

- 작성일: 2026-09-05
- 상세 원장: [bp-audit.json](./bp-audit.json)
- 역사 원장: [coverage-inventory.json](./coverage-inventory.json)
- 전체 부모 매칭: 86/86. 하위 조건 155개의 ID는 보존했지만 전부 독립 재판정한 것은 아니다.
- 제품 코드 수정 없음. 원본·trace·global 설정 수정 없음. commit·push·PR·Preview·Production 없음.

## 이번 판단의 범위

이 문서는 요구 목록을 빼먹지 않고 현재 코드·승인 후속·새 진단에 연결하는 source 감사다. 코드 경로를 읽은 것, 메모리 모델에서 차이를 재현한 것, root가 브라우저에서 조작한 것은 서로 다른 증거다. 모든 부모를 PASS로 바꾸지 않았고, 이 표의 분류 수를 제품 완료율로 사용하지 않는다.

이 shard가 직접 실행한 새 제품 브라우저 검사는 0건이다. 기간·정렬 진단은 v4.1 shard의 동일 실행을 참조한다. 이 문서에 복사됐다고 실행 개수를 더하지 않는다. root의 K-X4 및 모바일 Undo·첫 저장 관찰은 별도 실행자와 산출물 경로를 명시했다.

| 이번 분류 | 부모 수 | 해석 |
| --- | ---: | --- |
| 해당 코드 경로 확인 | 42 | 지목한 구현 경로의 존재·의미만 확인. 전체 브라우저 합격 아님 |
| 갭 연결 | 18 | 하나의 원인에 여러 요구가 연결될 수 있음. 부모 수가 결함 수는 아님 |
| D2/root 근거 결합 필요 | 11 | 현재 판정 범위를 JSON에 별도 기록 |
| 운영 통합 범위 밖 | 2 | 현재 판정 범위를 JSON에 별도 기록 |
| 승인된 shadow 적용 | 3 | 현재 판정 범위를 JSON에 별도 기록 |
| 과거 제외 · 후속 재개 | 1 | 현재 판정 범위를 JSON에 별도 기록 |
| 제외 | 2 | 현재 판정 범위를 JSON에 별도 기록 |
| 과거 복합 QA · 현재 근거 결합 | 6 | 현재 판정 범위를 JSON에 별도 기록 |
| 현재 완료 의존성 밖 | 1 | 현재 판정 범위를 JSON에 별도 기록 |

## 우선 확인된 차이

### P3K-V41-01 · standalone 오늘·주간의 포함 범위가 원본과 React와 다름

- 영향: P1. 근거 상태: reproduced-in-memory
- 연결 요구: V41-002, BP-035, BP-055, BP-069, BP-072, BP-079
- 원래 기대: 오늘은 지난 미완료를 별도 구획으로 함께 보여 주고, 이번 주는 월요일부터 일요일까지 같은 날짜별 projection을 사용한다.
- 현재: 원본과 React는 전날 미완료를 Today에 포함하고 월~일 주간을 사용한다. standalone은 Today에 오늘 날짜만 포함하고 주간을 오늘부터 7일로 계산한다. TODAY=2026-09-02인 메모리 fixture에서 React Today는 past/today, standalone은 today; React week는 9/1·9/2, standalone은 9/7·9/2다.
- 수정 설계: 개인공간 기간 selector를 원본 월~일과 overdue/date/undated context 계약에 맞춘다. standalone도 같은 기준일 주입·그룹 구성·포함 기준을 사용한다. 오늘부터7일을 새 정책으로 채택하지 않는다.
- 완료 조건: 화/일/월·월말·연말 기준일에서 전날 미완료/완료, 이번 주 시작/끝, 다음 주 시작, 날짜 미정의 ref 집합이 두 runtime과 원본 계약에 일치한다. fixture 날짜 차이는 허용하되 범위 계산은 같아야 한다.
- 근거:

  - `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-assets/app.js:129-146`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/lib/flow/personal-workspace-poc-view-model.ts:55-59,143-160`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js:776-784`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:913-926`

### P3K-V41-02 · standalone 직접 정렬이 날짜 대신 today/week/month에 저장됨

- 영향: P1. 근거 상태: reproduced-in-memory
- 연결 요구: V41-022, V41-023, BP-023, BP-024, BP-025, BP-078
- 원래 기대: TimelineOrder는 date/undated/overdue의 context+contextKey를 소유한다. 특정 날짜의 직접 순서는 같은 날짜를 보여 주는 다른 기간 화면에서도 같은 의미를 가져야 한다.
- 현재: standalone은 orders[action.context]에 today/week/month 문자열을 저장한다. Today 순서를 뒤집은 후 같은 날짜를 Week/Month로 열면 이전 순서다. 실제 month 화면은 날짜를 따로 정렬하므로 여기서 month 전체 날짜 표시가 역순이라고 주장하지 않는다.
- 수정 설계: standalone의 정렬 key를 날짜/미정/지난미완료 단위로 정규화한다. 메뉴·drag·keyboard와 시간순 복귀가 같은 list-context를 사용하게 한다. 기존 PoC payload의 오래된 view-order는 별도 버전 호환 처리 설계 후 안전하게 보존/재표현한다.
- 완료 조건: 같은 날짜에서 today→week→month→today와 reload를 왕복해 순서가 같고, 다른 날짜·Flow 내부 순서·시각·완료·메모는 바뀌지 않는다. 시간순 복귀는 해당 context만 제거한다. 기존 PoC payload에 대해 손실 없는 호환 또는 명시적 fail-closed를 검증한다.
- 근거:

  - `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md §5.4`
  - `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-assets/model.js:93-109`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/lib/flow/personal-workspace-poc-state.ts:1412-1446`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js:804-808,2071-2077`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:874-889`

### P3K-V41-05 · 모바일에서 행이 사라진 직후 Undo가 설정 안에 숨어 있음

- 영향: P1. 근거 상태: code-confirmed-discoverability-gap; root browser observation
- 연결 요구: V41-042, BP-060, BP-063, BP-076
- 원래 기대: 변경 알림은 결과와 되돌리기 경로를 함께 제공한다. 이동 후 화면 밖으로 사라진 항목도 즉시 복구할 수 있어야 한다.
- 현재: React 전역 Undo는 hidden sm:inline-flex이고 640 미만의 Undo는 설정 details 내부 personal-workspace-undo-mobile에 있다. 일반 이동 성공 status는 문구만 있고 즉시 Undo action은 없다. root의 390px 브라우저에서 Today→내일 이동 후 보이는 Undo를 찾지 못했고 desktop resize 후 상단 Undo가 보였다. Undo 기능 자체는 구현되어 있다.
- 수정 설계: 일반 날짜/폴더/순서 이동 성공 feedback에 마지막 성공 변경을 되돌리는 Undo를 함께 노출한다. 기존 설정 경로를 없애거나 항상 떠 있는 중복 CTA를 추가하지 않는다. receipt owner가 이미 Undo를 갖는 경우 중복 announcer/행동을 만들지 않는다.
- 완료 조건: 390/375/844가로에서 오늘 행을 내일로 옮긴 직후 설정을 열지 않고 Undo를 발견·키보드로 실행해 동일 ref/날짜/순서를 복구한다. 실패/no-op/cancel에는 잘못된 Undo가 생기지 않는다.
- 근거:

  - `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html:18`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md §8`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:4833-4870,4873-4891`
  - `root P3-K browser J5 observation; exact capture/log joined separately`

### P3K-BP-01 · 새 개인 Flow 첫 실행에 합성 원문 업데이트 알림이 끼어듦

- 영향: P1. 근거 상태: code-confirmed-integration-friction; root browser observation
- 연결 요구: BP-003, BP-040, BP-053, BP-054, BP-073
- 원래 기대: 작성→명시 개인 저장→개인공간에서 찾기→실행이 첫 성공 경로다. source update는 로컬 후보 비교의 별도 목적과 provenance를 가지며 외부 원문 동기화로 표현하지 않는다.
- 현재: Surface는 quick-conversion이 아닌 selected authored Flow마다 새 제목·첫 Item 변경·새 할 일을 합성해 local-update-v1 후보를 만든다. root의 새 작성 Flow 저장/개인공간 열기/reload에서 '새 원문에서 3곳 달라짐' 알림이 자동 노출됐다. P3-D는 로컬 후보 기능을 승인했으므로 기능 자체를 미승인 또는 외부 fetch로 판정하지 않는다. 첫 실행 기본 노출의 통합 UX가 문제다.
- 수정 설계: P3-D 비교 기능은 보존하되 synthetic fixture 생성·노출은 명시적 연습/검증 진입 뒤에만 활성화하는 구조로 분리한다. 실제 provenance를 가진 후보와 로컬 연습 후보를 구별하고, 새 개인 작성 Flow는 저장 결과와 실행을 먼저 보여 준다.
- 완료 조건: 새 blank/일반/틀 Flow 저장→열기→reload 기본 경로에 합성 업데이트 배너가 없고, 사용 안내의 명시적 로컬 후보 비교 경로에서는 기존 resolve/apply/Undo/reload/PoC-only 계약이 전부 유지된다. 운영 source fetch/writer는 추가하지 않는다.
- 근거:

  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md A0-1`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md §1-2,4`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-source-update-ownership-v1/spec.md 목적·후보 envelope·정보 구조와 UX`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:280-288,4219-4241`
  - `root P3-K browser new authored Flow observation; exact capture/log joined separately`

### P3K-BP-02 · 과거 운영 연결·제외 판정과 후속 PoC 범위가 섞임

- 영향: P2. 근거 상태: decision-reconciled; no feature promotion
- 연결 요구: BP-002, BP-006, BP-007, BP-019, BP-038, BP-049, BP-054, BP-056, BP-080, V41-077
- 원래 기대: A0는 D1 문법을 재사용하되 운영 writer는 금지했다. 후속 P2-B/P3-B/P3-D는 occurrence·creator drafts·local source update를 한정 승인했다.
- 현재: 역사 parent BP-049는 실제 /calendar 미충족으로 남고, BP-019 occurrence는 제외로 남아 있다. 그러나 현재 범위에서는 전자는 운영 경계 밖 연결이고 후자는 P2-B 한정 구현이 있다. 개인 memo owner도 기존 운영 key를 직접 쓰라는 뜻으로 해석하면 안 된다.
- 수정 설계: 현재 감사 계층에서 운영 후속·현재 PoC 구현·원본에서 대체된 범위를 나눈다. stale parent 또는 제외 문구를 근거로 새 운영 writer나 중복 구현을 계획하지 않는다.
- 완료 조건: 각 행에 A0/P2/P3 supersedes 범위를 연결하고 PoC projection과 실제 /calendar/public writer를 따로 표시한다. 구현 묶음에는 허용 PoC gap만 넣고 운영 확대는 별도 승인 항목으로 남긴다.
- 근거:

  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md A0-2,A0-5`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1/spec.md 버전 계약`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-creator-draft-library-v1/spec.md 목적·범위`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-source-update-ownership-v1/spec.md 목적·보호 경계`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md 금지되는 확대 해석`

### P3K-BP-03 · standalone은 원문의 체크를 개인 실행 완료로 자동 반영함

- 영향: P0. 근거 상태: root-browser-reproduced
- 연결 요구: BP-039
- 원래 기대: Authoring sourceChecked와 개인 실행 completed는 별도 상태다. 원문에서 확인한 표식만으로 사용자가 개인 실행을 완료한 것으로 만들지 않는다.
- 현재: root K-X4-source-checked가 같은 '# 원문 체크 검사\n## 준비\n- [x] 원문에서만 체크한 할 일'을 두 runtime에 명시 저장했다. 완료 조작 없이 standalone은 1개 중1개완료·다시열기[pressed]·TXT☑, React는0/1완료·미완료였다. standalone commit-handoff가 parsedItem.checkedInSource를 task.done에 직접 넣는 코드와 일치한다.
- 수정 설계: handoff에서 sourceChecked는 source snapshot/원문 표시 owner에만 보존한다. 새 개인 실행은 별도 미완료 상태로 시작하고 명시적 완료 transition만 완료 상태를 만든다. 기존 PoC payload에 이미 섞인 완료를 임의로 일괄 지우지 말고 provenance 확인/버전 호환 방안을 설계한다.
- 완료 조건: [x]/[ ] 원문으로 저장한 새 개인 Flow의 초기 실행완료는 두 runtime 모두 미완료이며 source 원문/표식은 exact 보존한다. 사용자 완료→다시열기→Undo→reload는 sourceChecked를 바꾸지 않는다. 기존 payload의 사용자 완료를 손상시키는 자동 정리는0.
- 근거:

  - `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md §6`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js:643 checkedInSource;2131 commit-handoff done assignment`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/output/p3k/browser-audit.json K-X4-source-checked`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/output/playwright/p3k/standalone-source-checked-390x844.png`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/output/playwright/p3k/react-source-checked-390x844.png`

## 모든 부모 요구의 현재 연결

각 행의 원본 기대 행동, 원본/결정/React/standalone 근거, 기능·UX·UI의 별도 상태, 제안과 완료 조건은 JSON에 있다. 다음 표는 누락 확인용 인덱스다.

| ID | 원본 요구 | 여정 | 이번 source 감사 | 연결 차이 |
| --- | --- | --- | --- | --- |
| BP-001 | 기존 /my 위의 개인 정리·실행 surface | J1/J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-002 | 개발1 runtime·persistence owner 재사용 | J6/J7 | 해당 코드 경로 확인 | P3K-BP-02 |
| BP-003 | Text Authoring 별도 입구 | J2/J4 | 갭 연결 | P3K-BP-01 |
| BP-004 | Authoring·public·personal·overlay·execution owner 분리 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-005 | 개인공간 저장 계약 선검증 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-006 | 기능·화면별 owner 배치 | J6/J7 | 해당 코드 경로 확인 | P3K-BP-02 |
| BP-007 | /my month와 /calendar의 동일 effective Item | J6 | 운영 통합 범위 밖 | P3K-BP-02 |
| BP-008 | overlay와 실행 데이터 owner 경계 | J6/J7 | 승인된 shadow 적용 | 독립 현재 근거 범위는 JSON 참조 |
| BP-009 | 한 멤버 한 폴더 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-010 | Flow Item 부모 폴더 상속 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-011 | 폴더 이동의 실행 데이터 불변 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-012 | 미분류 가상 위치 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-013 | 폴더 삭제 시 내용 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-014 | QuickItem 개인 일회성 identity | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-015 | QuickItem date와 folder owner 분리 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-016 | PersonalStructuralUserItem 재사용 금지 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-017 | QuickItem을 Flow로 정리하는 전환 영수증 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-018 | savedCopyId 포함 Flow Item ref | J1/J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-019 | occurrence identity와 개별 이동 | J3/J5/J6 | 과거 제외 · 후속 재개 | P3K-BP-02 |
| BP-020 | ExecutionPlacement 필드 계약 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-021 | 개인 실행일 overlay와 source timing 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-022 | 기존 date override 비파괴 읽기 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-023 | TimelineOrder context 계약 | J5 | 갭 연결 | P3K-V41-02 |
| BP-024 | Flow 내부·폴더 목록 order owner 보존 | J5 | 갭 연결 | P3K-V41-02 |
| BP-025 | 시간순 복귀 시 TimelineOrder 제거 | J5 | 갭 연결 | P3K-V41-02 |
| BP-026 | 날짜 이동의 비순서 상태 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-027 | AuthoringHandoff 전체 상태 계약 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-028 | 사용자 확인 전 저장 금지 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-029 | blocking issue와 silent loss 저장 차단 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-030 | handoffId 멱등성 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-031 | Authoring commit 전부 성공 또는 rollback | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-032 | 원문·lineage·미해결 문제 보존 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-033 | 실행 중요 fidelity gate | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-034 | 공개·원본 Flow 불변 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-035 | folder/date 독립과 projection 비복제 | J5 | 갭 연결 | P3K-V41-01 |
| BP-036 | Flow Item 완료 owner | J6/J7 | 승인된 shadow 적용 | 독립 현재 근거 범위는 JSON 참조 |
| BP-037 | QuickItem 완료 owner | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-038 | Flow memo와 Quick memo owner | J6/J7 | 승인된 shadow 적용 | P3K-BP-02 |
| BP-039 | sourceChecked와 completed 분리 | J2/J3/J4 | 갭 연결 | P3K-BP-03 |
| BP-040 | 원자 이동·저장과 단일 handoff action | J4/J5/J6/J7 | 갭 연결 | P3K-BP-01 |
| BP-041 | 운영 key와 schema 유지 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-042 | savedCopyId 호환 투영 | J1/J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-043 | 기존 Flow 최초 unfiled | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-044 | structural Item의 Quick 변환 금지 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-045 | structural order 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-046 | Authoring namespace와 saved transaction 연결 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-047 | 네 origin과 exact-query gate | J1/J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-048 | Flow open의 기존 실행 surface 사용 | J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-049 | Calendar와 완료·날짜 동일성 | J6 | 운영 통합 범위 밖 | P3K-BP-02 |
| BP-050 | PoC state contracts와 원자 복구 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-051 | PoC 전용 storage prefix | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-052 | 운영 writer 금지와 shadow UX | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-053 | P1 Text Authoring 선별 통합 | J2/J3/J4 | 갭 연결 | P3K-BP-01 |
| BP-054 | P2 공개·업데이트 제외 | J4/J6 | 갭 연결 | P3K-BP-01, P3K-BP-02 |
| BP-055 | 1차 포함 범위의 개인공간 기능 | J5 | 갭 연결 | P3K-V41-01 |
| BP-056 | 상세·편집·보관·완료·Calendar 포함 충돌 | J6/J7 | 해당 코드 경로 확인 | P3K-BP-02 |
| BP-057 | 명시적 PoC 제외 범위 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| BP-058 | 처음 열기 상태 | J1/J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-059 | 저장 중 상태 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-060 | 저장 성공 상태 | J4/J5/J6/J7 | 갭 연결 | P3K-V41-05 |
| BP-061 | 같은 위치 상태 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-062 | 저장 실패·충돌 상태 | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-063 | Undo 상태와 복구 값 표시 | J4/J5/J6/J7 | 갭 연결 | P3K-V41-05 |
| BP-064 | reload 복구와 손상 payload fail-closed | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-065 | PoC 임시 기본값 묶음 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-066 | operating bytes와 exact reset | J4/J5/J6/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-067 | unsupported·duplicate·corrupt fail-closed | J1/J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-068 | drag·menu·keyboard transition 동등성 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-069 | 개인공간 완료 기준 묶음 | cross-journey | 갭 연결 | P3K-V41-01 |
| BP-070 | 5 viewport와 test/build/browser 완료 기준 | cross-journey | 과거 복합 QA · 현재 근거 결합 | 독립 현재 근거 범위는 JSON 참조 |
| BP-071 | 실기·게시·관찰 상태 분리 | cross-journey | 과거 복합 QA · 현재 근거 결합 | 독립 현재 근거 범위는 JSON 참조 |
| BP-072 | 기능형 PoC 8개 핵심 시나리오 | J5/J7 | 갭 연결 | P3K-V41-01 |
| BP-073 | S1 메모에서 개인 Flow 저장 | J2/J3/J4 | 갭 연결 | P3K-BP-01 |
| BP-074 | S2 불완전 원문의 부분 해석·수정·복구 | J2/J3/J4 | D2/root 근거 결합 필요 | 독립 현재 근거 범위는 JSON 참조 |
| BP-075 | S3 공개 Flow 저장과 개인 이름·폴더 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| BP-076 | S4 Quick 생성·date/folder·Undo | J5/J7 | 갭 연결 | P3K-V41-05 |
| BP-077 | S5 Flow folder와 Item 실행일 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-078 | S6 모바일 이동·정렬·시간순 복귀 | J5/J7 | 갭 연결 | P3K-V41-02 |
| BP-079 | S7 완료·상세·Calendar·다시 열기 | cross-journey | 갭 연결 | P3K-V41-01 |
| BP-080 | S8 개인 수정·preview·export | cross-journey | 과거 복합 QA · 현재 근거 결합 | P3K-BP-02 |
| BP-081 | 통합 합격 기준 | cross-journey | 과거 복합 QA · 현재 근거 결합 | 독립 현재 근거 범위는 JSON 참조 |
| BP-082 | 증거 층별 주장 제한 | cross-journey | 과거 복합 QA · 현재 근거 결합 | 독립 현재 근거 범위는 JSON 참조 |
| BP-083 | 관찰 사용자 3개 과업 | cross-journey | 현재 완료 의존성 밖 | 독립 현재 근거 범위는 JSON 참조 |
| BP-084 | PoC temporary owner defaults | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-085 | 임시값의 교체 가능성 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| BP-086 | 격리 worktree와 개발 경계 | cross-journey | 과거 복합 QA · 현재 근거 결합 | 독립 현재 근거 범위는 JSON 참조 |

## 원본에서 후속 계약으로 바뀐 범위

- 정적 v4.1의 검토 헤더·새로고침 초기화는 A0/blueprint의 제품 shell·PoC reload 복구와 같지 않다. 원안 문구를 그대로 복원하는 작업이 아니다.
- 전역 PlatformNav의 cobalt와 로컬 개인공간의 teal은 서로 다른 owner다. 제품 전체 색상 정책을 다시 고르지 않는다.
- D1 surface/controller를 재사용한다는 계약은 PoC에서 운영 memo/completion/date/archive/export writer를 호출하라는 뜻이 아니다.
- 실제 `/calendar` 연결과 PoC Calendar 결과 projection은 분리한다. 운영 연결 미충족을 현재 격리 PoC에서 writer 추가로 채우지 않는다.
- occurrence 제외는 P2-B의 제한된 회차 지원으로 부분 대체됐다. 반복 규칙 편집·이번 이후 일괄 변경·외부 동기화는 여전히 제외다.
- CreatorDraft는 P3-B가 로컬 보관함으로 재개했고 source update는 P3-D의 로컬 후보 비교로 재개했다. public publish나 외부 원문 동기화가 구현된 것은 아니다.

## 감산 검토에서 남겨야 할 것

standalone의 긴 드래그 설명은 `visually-hidden`이고 실제 mutation counter는 hidden diagnostics 안에 있다. 이것을 보이는 장문·debug 배너로 오인해 삭제하지 않는다. 접근 가능한 이름, source provenance, 오류, 복구, Undo, 영구 삭제 결과 안내는 보존한다. 세로 화면의 반복 설명·집계, 같은 날짜 반복은 실제 사용자 정보를 줄이지 않는 범위에서만 정리한다.

## 아직 확인하지 않은 것

- 원본 v4.1 spec/HTML과 관련 app/model 구간, blueprint, A0, product UX, P2-B/P3-B/P3-D/P3-F 범위 문서를 읽었다. 원본 전체 CSS·모든 QA 문서·모든 대화를 재열람했다고 주장하지 않는다.
- 원본 화면 픽셀 비교와 실제 computed style·키보드·반응형 화면은 root의 별도 브라우저 증거와 결합한다. 코드 selector 존재만으로 UI 적합성을 통과 처리하지 않는다.
- 개별 부모 안의 모든 하위 조건은 독립 재판정하지 않았다. coverage-inventory.json의 원자 조건/과거 판정을 유지하며 현재 브라우저로 확인한 범위만 승격 가능하다.
- 일곱 여정의 Authoring 상세는 d2-audit, D1 opener/staged edit/result는 d1-audit와 함께 읽는다. 이 shard의 cross-shard-review-required는 검토 누락을 숨기기 위한 PASS가 아니다.
- 운영 /calendar·public writer·계정/cloud·실제 기기·보조기술·관찰 사용자 검증은 이번 목표의 완료 조건 밖이다. 실제 기기 NOT_RUN, 관찰 사용자0명.
- 실제 사용자의 브라우저 프로필·운영 backend·운영 계정 데이터를 검사하지 않았다. 메모리 probe는 별도 JS 객체만 조작하며 저장 호출0이었다.
- 제품/trace/원본/global 설정을 수정하지 않았다. 새 감사 문서만 만들었다. commit/push/PR/Preview/Production 없음.

전체 자동 회귀, production build, 관련 운영 경계 검사는 과거 QA와 새 root 검사 범위를 구분해 최종 리포트에 합친다. 실제 Android Chrome/iOS Safari·보조기술은 NOT_RUN, 관찰 사용자 0명이다.
