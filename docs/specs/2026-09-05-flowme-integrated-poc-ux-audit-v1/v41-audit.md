# P3-K v4.1 개인공간 요구·현재 구현 대조

- 작성일: 2026-09-05
- 상세 원장: [v41-audit.json](./v41-audit.json)
- 역사 원장: [coverage-inventory.json](./coverage-inventory.json)
- 전체 부모 매칭: 78/78. 하위 조건 89개의 ID는 보존했지만 전부 독립 재판정한 것은 아니다.
- 제품 코드 수정 없음. 원본·trace·global 설정 수정 없음. commit·push·PR·Preview·Production 없음.

## 이번 판단의 범위

이 문서는 요구 목록을 빼먹지 않고 현재 코드·승인 후속·새 진단에 연결하는 source 감사다. 코드 경로를 읽은 것, 메모리 모델에서 차이를 재현한 것, root가 브라우저에서 조작한 것은 서로 다른 증거다. 모든 부모를 PASS로 바꾸지 않았고, 이 표의 분류 수를 제품 완료율로 사용하지 않는다.

이 shard가 직접 실행한 새 제품 브라우저 검사는 0건이다. 저장을 하지 않는 메모리 진단은 기간 3개와 정렬 1개, 총 4개다. 이 결과는 차이를 찾은 비교 결과이며 자동 테스트 4/4 PASS가 아니다. root의 K-X4 및 모바일 Undo·첫 저장 관찰은 별도 실행자와 산출물 경로를 명시했다.

| 이번 분류 | 부모 수 | 해석 |
| --- | ---: | --- |
| 갭 연결 | 9 | 하나의 원인에 여러 요구가 연결될 수 있음. 부모 수가 결함 수는 아님 |
| 해당 코드 경로 확인 | 43 | 지목한 구현 경로의 존재·의미만 확인. 전체 브라우저 합격 아님 |
| 승인 범위 변경 | 6 | 현재 판정 범위를 JSON에 별도 기록 |
| 과거 QA · 현재 갱신 필요 | 9 | 현재 판정 범위를 JSON에 별도 기록 |
| 증거 경계 유지 | 1 | 현재 판정 범위를 JSON에 별도 기록 |
| 현재 완료 의존성 밖 | 4 | 현재 판정 범위를 JSON에 별도 기록 |
| 제외 | 5 | 현재 판정 범위를 JSON에 별도 기록 |
| 후속 범위와 대조 | 1 | 현재 판정 범위를 JSON에 별도 기록 |

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

### P3K-V41-03 · standalone Today 날짜 반복과 설명·집계가 목록을 밀어냄

- 영향: P2. 근거 상태: code-divergence; visual impact awaiting joined browser evidence
- 연결 요구: V41-024, V41-053, V41-054, V41-056
- 원래 기대: 날짜 heading이 있는 행에는 날짜를 반복하지 않고 제목·경로·시간을 유지한다. 기본 화면에는 같은 기능을 반복 설명하는 문단과 검증용 장식을 넣지 않는다.
- 현재: Today는 renderTaskList(ids,view)에 hideDate를 전달하지 않아 각 행에 같은 날짜를 표시한다. page-head 설명, summary-strip, '오늘 목록'은 세로/desktop에서 보이고 짧은 가로 media에서만 일부 숨긴다. drag 장문 설명은 visually-hidden이며 진짜 mutation diagnostics는 hidden이므로 시각 삭제 대상이 아니다.
- 수정 설계: Today를 날짜 heading+행 구조로 맞추고 같은 날짜 반복만 제거한다. 주간도 날짜별 grouping 후 날짜 중복을 제거하되 실제 날짜 정보는 남긴다. 반복 설명·중복 집계는 정보 효용을 확인해 정리하고 출처/에러/Undo/접근성 설명은 보존한다.
- 완료 조건: 390/375/844가로/1024/1440에서 Today 날짜 1회, 시간·경로 유지, 첫 실행행과 주 행동 접근을 확인한다. 스크린리더 설명·source·오류·복구는 삭제하지 않는다.
- 근거:

  - `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md 표시 계약`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:848-926`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/style.css:114,166-182,643,725-727`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:5392`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone-shell.html:31-38`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md §2`

### P3K-V41-04 · React 로컬 주 행동·초점은 cobalt를 사용

- 영향: P2. 근거 상태: code-contract-mismatch; computed style evidence owned by root
- 연결 요구: V41-001, V41-001.1, V41-001.3
- 원래 기대: A0-3와 P3-F는 전역 PlatformNav ink/cobalt와 개인공간 내부 white/gray/teal owner를 구분한다. product-ux design 계약은 청록 primary·focus를 명시한다.
- 현재: Surface의 PRIMARY_CLASS가 --flowme-action을 사용하고 전역 값은 #315ee7이다. ProductShell.module.css는 workspace accent만 #087f73로 두며 global action/focus는 유지한다는 구현 주석이 있다. 이 주석은 청록 primary/focus를 대체한 사용자 승인 근거가 아니다. standalone --blue는 #087f73이다.
- 수정 설계: 전역을 재도색하지 않고 exact-query 로컬 primary/focus 소비자를 workspace token으로 정렬한다. 공통 D1 내부 중 전역 owner와 로컬 owner를 component별로 분리한 토큰 매핑을 먼저 확정한다.
- 완료 조건: global PlatformNav/default /my의 computed color와 파일 bytes는 전후 동일. exact-query 로컬 primary/focus는 승인 token과 일치. 다섯 화면·키보드 상태 및 React/standalone 비교에서 범위 밖 색 변경 0.
- 근거:

  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md A0-3`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md Visual owner`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md §2`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:269-270`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocProductShell.module.css:34-42`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/app/globals.css:17-21`
  - `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/style.css:10-14`

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

## 모든 부모 요구의 현재 연결

각 행의 원본 기대 행동, 원본/결정/React/standalone 근거, 기능·UX·UI의 별도 상태, 제안과 완료 조건은 JSON에 있다. 다음 표는 누락 확인용 인덱스다.

| ID | 원본 요구 | 여정 | 이번 source 감사 | 연결 차이 |
| --- | --- | --- | --- | --- |
| V41-001 | v4 시각 문법과 실행 구조 유지 | cross-journey | 갭 연결 | P3K-V41-04 |
| V41-002 | 빠른 할 일과 Flow Item의 정리·실행 | J5 | 갭 연결 | P3K-V41-01 |
| V41-003 | 모바일 전용 48px 이동 손잡이 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-004 | 350ms 길게 누르기 시작 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-005 | 8px 이동 취소와 합성 클릭 차단 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-006 | 행 본문 세로 스크롤 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-007 | 길게 누르기 뒤 비모달 이동 패널 자동 열기 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-008 | 왼쪽 목적지와 오른쪽 재정렬 통로 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-009 | 움직임 없는 드래그 놓기의 이동 창 전환 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-010 | 손잡이 짧은 누르기와 더보기의 동일 이동 창 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-011 | 드래그 외 이동 수단과 48px 패널 조작 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-012 | 순서·날짜·폴더 구획 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-013 | 날짜 이동의 폴더·Flow 소속 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-014 | 순서 이동의 날짜·시간 보존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-015 | Flow Item의 독립 폴더 소속 금지 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-016 | Flow Item 이동 패널의 폴더 보호 안내 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-017 | Flow 전체에만 폴더 이동 적용 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-018 | 현재 위치의 중립 표시와 무변경 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-019 | 드래그 대상·가능 여부·결과의 글과 선 피드백 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-020 | 대상 밖·Escape·pointer cancel·창 변화 취소 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-021 | 날짜 목록 기본 시간순 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-022 | 직접 정렬의 목록별 격리 | J5 | 갭 연결 | P3K-V41-02 |
| V41-023 | 시간순 복귀 | J5 | 갭 연결 | P3K-V41-02 |
| V41-024 | 행 날짜 중복 제거 | J5 | 갭 연결 | P3K-V41-03 |
| V41-025 | 원본 경로와 구조화된 시간 유지 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-026 | 월간의 할 일 있는 날짜 우선 노출 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-027 | 월간 빈 날짜 일괄 펼침·접기 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-028 | 월간 세로 타임라인과 날짜별 추가 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-029 | 모바일 한 줄 탐색 헤더 | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-030 | 모바일 행 터치 여백 유지 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-031 | 세로 화면 날짜 대상 한 열 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-032 | 짧은 가로 화면의 패널 내부 스크롤 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-033 | 상하좌우 safe area | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-034 | 본문 건너뛰기 링크 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-035 | 데스크톱 검토 header와 Undo | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-036 | 모바일 탐색·검토 버튼의 접근 가능한 이름 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-037 | 스크린리더용 드래그 설명 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-038 | 탐색 landmark와 focusable main | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-039 | 비모달 이동 패널의 aria 상태 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-040 | 새로고침 초기화 안내 | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-041 | 이동·편집 dialog의 제목과 닫기 이름 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-042 | 변경 알림·Undo·닫기의 live status | J5/J7 | 갭 연결 | P3K-V41-05 |
| V41-043 | 드래그 힌트의 live status | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-044 | 순수 모델의 시간순·직접 정렬·복귀 검증 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-045 | 이동 불변조건 모델 검증 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-046 | 무효 동작 무변경과 Undo snapshot 검증 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-047 | 장기 무작위 연속 조작 시뮬레이션 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-048 | 데스크톱 마우스와 모바일 터치 브라우저 검사 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-049 | 강제 safe-area 브라우저 검사 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-050 | 메뉴·초점·키보드 대안 브라우저 검사 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-051 | 빠른 이동·Escape 뒤 합성 클릭 회귀 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-052 | 가로 넘침·콘솔·page error 0 | J5/J7 | 과거 QA · 현재 갱신 필요 | 독립 현재 근거 범위는 JSON 참조 |
| V41-053 | 모바일 상단 높이 시각 비교 | J5/J7 | 갭 연결 | P3K-V41-03 |
| V41-054 | 첫 할 일의 첫 화면 노출 | J5/J7 | 갭 연결 | P3K-V41-03 |
| V41-055 | 시간순 시각 비교 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-056 | 날짜 정보 중복 시각 비교 | J5 | 갭 연결 | P3K-V41-03 |
| V41-057 | 이동 손잡이 가시성 시각 비교 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-058 | 드래그 중 숨은 목적지 접근 시각 비교 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-059 | 월간 빈 구간 축약 시각 비교 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-060 | 평면 목록 유지 시각 비교 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-061 | 자동 터치와 실제 기기 증거 분리 | cross-journey | 증거 경계 유지 | 독립 현재 근거 범위는 JSON 참조 |
| V41-062 | 수정본 Android Chrome 재검증 | J5/J7 | 현재 완료 의존성 밖 | 독립 현재 근거 범위는 JSON 참조 |
| V41-063 | 수정본 iOS Safari 검증 | J5/J7 | 현재 완료 의존성 밖 | 독립 현재 근거 범위는 JSON 참조 |
| V41-064 | 보조기술·글자 확대·브라우저 확대 검사 | J5/J7 | 현재 완료 의존성 밖 | 독립 현재 근거 범위는 JSON 참조 |
| V41-065 | 이동 창 전체 조작 집합 | J5/J7 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-066 | 보이는 다른 날짜로 터치 이동과 cleanup | J5/J7 | 현재 완료 의존성 밖 | 독립 현재 근거 범위는 JSON 참조 |
| V41-067 | 화면 가장자리 자동 스크롤 이동 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-068 | 행 터치 스크롤과 데스크톱 drag 공존 | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-069 | 따라보기 종료 뒤 작업 상태 복원 | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-070 | 844×390 모바일 IA와 월간 28일 toggle | J5 | 해당 코드 경로 확인 | 독립 현재 근거 범위는 JSON 참조 |
| V41-071 | dark mode 제외 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| V41-072 | 실서비스 route 제외의 후속 변경 | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-073 | 저장 계약 제외의 후속 변경 | cross-journey | 승인 범위 변경 | 독립 현재 근거 범위는 JSON 참조 |
| V41-074 | 동기화 제외 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| V41-075 | 공개 기능 제외 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| V41-076 | 외부 도구 연동 제외 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |
| V41-077 | 반복 일정 제외 | J3/J5/J6 | 후속 범위와 대조 | P3K-BP-02 |
| V41-078 | 배포 제외 | cross-journey | 제외 | 독립 현재 근거 범위는 JSON 참조 |

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
