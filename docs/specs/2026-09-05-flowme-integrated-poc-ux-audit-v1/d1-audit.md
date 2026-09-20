# P3-K 개발1 요구·현재 UX 감사

D1 부모 요구 26개를 모두 현재 React와 조작용 단일 HTML에 매칭했다. 실행 상세·원문/메모 분리·staged 저장처럼 이미 구현된 내용과, 기준일·출처 입구·편집 안전장치처럼 아직 다른 내용을 구분했다. 제품 코드는 수정하지 않았다.

전체 필드와 원본/결정/현재 코드 근거는 [d1-audit.json](./d1-audit.json)에 있다. 이 문서는 부모 단위 요약이며, 59개 기존 세부조건을 이번에 모두 재실행해 합격시켰다는 보고가 아니다.

## 판정 방법과 범위

- 생성 trace의 `script#trace-data`에서 D1-001~026, 기존 subcheck 59개를 기준 목록으로 사용했다. 과거 원본 JSON의 충족 표를 현재값으로 사용하지 않았다.
- 요구, 기능, UX, UI, 증거를 분리했다. 예컨대 dirty Escape의 storage mutation 0은 안전 경계 확인이고 확인창 없이 draft를 버리는 것은 별도 UX 결함이다.
- 이 담당은 코드·문서·기존 test 정의를 읽었다. 직접 실행한 제품 테스트/브라우저 검사는 0이다. 상위 담당이 현재 수행한 K-J7-standalone-dirty의 FAIL reproduced 로그를 읽고 해당 판정을 갱신했다. 같은 실행을 추가 시험 수로 더하지 않는다.
- 현재 trace의 D1 부모는 26개 모두 충족으로 표시되지만, 전체 원자조건·모든 화면·두 runtime의 동등 UX가 완료됐다는 뜻은 아니다. 이 감사의 ‘실제 차이 포함’은 부모 전체 미구현 판정도 아니다.
- 감사 분포: 실제 차이 포함 12개, 코드 구현 확인 7개, 의도적 경계 2개, 미검사 포함 3개, 과거 사유 미갱신 2개. 이는 관찰 범주이며 새 갭 개수·제품 충족률로 계산하지 않는다.

## 원본과 후속 결정의 우선순위

| 근거 | 이번 감사에서 적용한 의미 |
|---|---|
| 현재 사용자 보호 경계와 integration blueprint | 기본 /my·운영 writer/schema를 바꾸지 않고 개인 shadow만 사용 |
| A0-2 | 개발1의 공통 편집 문법은 재사용하되 운영 저장 owner 연결은 제외 |
| A0-6 | React는 구현 정본, HTML은 fixture 검토 동반물. live/route 차이는 허용하지만 핵심 UX·receipt 의미의 축약은 허용하지 않음 |
| Stage 3 §5 | Plan-level 설명·메모·anchor owner는 추정하지 않아서 부분으로 남김. Item 3상태·staged/dirty/receipt 계약은 유지 |
| 후속 P2/P3 | 개인 stable section 제목, 4-slot 결과, P3-J 원문 기준 분리 등 해당 세부 범위만 대체 |
| P3F | 전역 ink/cobalt와 exact-query local white/gray/teal의 owner를 분리 |
| D1 원본 UI L743 | 기존 Production 캡처가 아니라 구조적 UI 제안. 그 화면의 정보·동선 요구와 현 제품을 비교 |
| D1 실제 최근 대화 | 2026-08-20 최소 완료→회고→지난 실행도 사용자가 ‘아이디어에 킵’하여 active 개발에서 제외 |

원본 시안에서 콘텐츠마다 자연스러운 결과를 우선한 흐름은 후속 Text-default 결정과 구분했다. 다시 Todo/Calendar를 강제 기본값으로 만들지 않는다. XP·레벨·페르소나·회고·지난 실행·새 운영 writer는 이번 개선 묶음에 넣지 않는다.

## 부모 요구 26개 매칭

| 요구 | 원래 목적 | 여정 | 이번 감사 분류 | 차이 또는 증거 제한 |
|---|---|---|---|---|
| D1-001 | 네 origin 공통 Plan-Item surface | J6 | 실제 차이 포함 | 공통 화면 존재를 모든 필드/취소/복귀까지 동일하다고 확대할 수 없음. |
| D1-002 | 모든 Item 진입의 transition 통일 | J6 | 의도적 경계 | 운영 /calendar·public route까지 PoC 연결 완료로 주장하면 범위 과장. TXT/Sheet opener 부재를 무조건 새 결함으로 세지 않음. |
| D1-003 | staged Plan 단일 저장 | J4 | 코드 구현 확인 | 현재 코드에 대한 신규 실행 증거는 없음. 과거 '모델만 있고 UI 없음' 사유는 미갱신. |
| D1-004 | dirty 취소와 focus 복귀 | J7 | 실제 차이 포함 | K-D1-01. 기존 D1-004 부모 충족은 양쪽 dirty parity 증거가 아님. |
| D1-005 | 개인 편집과 원문 읽기 경계 | J6 | 코드 구현 확인 | 부모 전체 새 재시험 아님. Flow-level 메모/설명 owner 부재는 Item 메모로 대체해서 닫을 수 없음. |
| D1-006 | 날짜 3상태와 기준일 재계산 | J6 | 실제 차이 포함 | K-D1-02/03. stage-3 계약이 Plan-level 일정 owner 부재를 명시했지만 부모 충족 표기가 이를 가림. |
| D1-007 | unsupported fail-closed | J1/J7 | 코드 구현 확인 | standalone fixture guard를 실제 운영 origin adapter 검증으로 대체하지 않음. |
| D1-008 | 운영 identity와 storage 불변 | J4/J7 | 의도적 경계 | 기존 D1 운영 writer 재사용 요구는 A0-2로 PoC shadow owner로 대체됨. 실사용 브라우저 운영 데이터 전수 검사는 아님. |
| D1-009 | Flow Map 사용자 화면 평탄화 | J1 | 미검사 포함 | live origin 차이는 허용되나 fixture만으로 choose_child/review_hold UX까지 검증 완료라고 말할 수 없음. |
| D1-010 | 로컬 휴지통 lifecycle | J7 | 과거 사유 미갱신 | 현재 경로가 있는데 재구현 필요로 읽히는 과거 사유와 현 부모 충족이 혼재. |
| D1-011 | Undo와 오류 복구 피드백 | J7 | 실제 차이 포함 | K-D1-06. standalone authoring 저장 receipt는 있으나 Plan 변경 receipt의 대체 증거가 아님. |
| D1-012 | 개인 소유 구간 제목 편집 | J6 | 실제 차이 포함 | K-D1-02. source-owned/derived 구간 비편집은 의도적 제한, 개인 stable 구간 부재는 별도. |
| D1-013 | Production 시각 문법 통일 | J1/J6 | 실제 차이 포함 | K-D1-07. PRIMARY_CLASS가 global --flowme-action을 사용하여 exact-query 로컬 행동도 cobalt. |
| D1-014 | CTA 위계와 조작 크기 | J5/J6 | 미검사 포함 | 동일 맥락에 중복 Plan 편집과 내부 설명이 남아 단일 primary 위계는 추가 비교 필요. |
| D1-015 | 반응형 workspace 구성 | J5/J6 | 미검사 포함 | 1023/1024 및1279/1280 경계, 전체 3열 정보순서, 내부 clipping은 이번 담당이 실행하지 않음. |
| D1-016 | 한 여정 한 문법 | J1/J4/J6/J7 | 실제 차이 포함 | 화면 단위 '있음'을 사용자 여정 전체 충족으로 환산할 수 없음. |
| D1-017 | 출처와 개인 사본 경계 | J1/J6 | 실제 차이 포함 | K-D1-04. description만 있는 entry preview를 P3-J 상세 동일성 PASS로 대체할 수 없음. |
| D1-018 | 변경 영향과 저장 안전장치 | J4/J6/J7 | 실제 차이 포함 | K-D1-05. 사본 충돌 차단과 사용자의 명시 충돌 선택 해결 UI도 구분 필요. |
| D1-019 | Flow 찾기 단일 입력 | J1 | 코드 구현 확인 | React 구현은 확인; offline fixture용 discovery 조작 증거는 별도 미검사. 사용자가 그대로 말한 완성 설계가 아니라 후속 승인된 구현 결정. |
| D1-020 | 단일 사본 번호 숨김 | J1/J4 | 코드 구현 확인 | 반복 회차 번호와 별도 사본 라벨의 개념을 혼합하지 않음. 이번 담당은 helper 코드 확인이며 새 브라우저 재시험은 아님. |
| D1-021 | effective Flow 문법형 Text 기본 | J3/J6 | 실제 차이 포함 | K-D1-10. 원본 시안의 콘텐츠별 자연결과 기본은 이후 Text-default로 대체됐으므로 과거 기본을 재도입하지 않음. |
| D1-022 | Todo·Calendar 전체 표시 | J3/J6 | 과거 사유 미갱신 | 과거 Calendar 미노출 사유는 현 코드와 맞지 않음. 실제 운영 /calendar는 제외. |
| D1-023 | 기준일 우선과 결과형식 분리 | J1/J6 | 실제 차이 포함 | K-D1-03. 기존 P3-J 회귀는 result/selected-date 복귀를 입증하지만 전체 anchor 요구를 새로 닫지 않음. |
| D1-024 | Map child 선택 후 결과 확인 | J1 | 코드 구현 확인 | P3-J 기존 충족 회귀를 새 갭 해결 수로 더하지 않음. offline fixture 선택 UX는 D1-009와 동일 제한. |
| D1-025 | 내부 추적정보 감춤과 중복 낭독 방지 | J1/J3/J6 | 실제 차이 포함 | K-D1-08. 정확 raw ID 미노출과 내부 전문용어 미노출은 다른 조건. 실제 보조기술 중복낭독은 미검사. |
| D1-026 | 자동 QA와 사용자 관찰 분리 | J7 | 코드 구현 확인 | 원문 세션의 과거 deploy/QA 수를 현재 PoC 실행 수에 합산하지 않음. |

## 구체 차이와 수정 설계

아래 10개는 해결 단위 제안이다. 서로 여러 부모 요구에 연결되므로 부모 수와 더해서 갭 개수로 세지 않는다. 구현은 다음 목표에서 한다.

### K-D1-01 · 단일 HTML Plan/Item 편집이 dirty 확인 없이 취소된다

- 요구: D1-001, D1-004, D1-016 / 위험도: high
- 원래 요구: clean 취소는 즉시, dirty 취소·Escape·Back은 동일 버리기 확인과 초점/스크롤 복귀.
- 현재: app.js closeItemEditor와 close-plan-editor/Escape는 조건 없이 draft=null. 상위 담당 현재 Chromium K-J7-standalone-dirty에서 개인편집→Flow제목변경→Escape가 확인창0·편집필드0으로 닫히며 mutationCount0인 것을 재현했다. UX 확인 누락이며 운영 데이터 mutation 사고로 표현하지 않는다.
- 수정 설계: 공통 close intent와 상태표를 두고 clean/dirty/submitting/recovery를 판별. 계속 편집은 draft/selection/scroll 유지, 버리기는 해당 draft 범위만 제거.
- 완료 조건: 양쪽 Plan/Item 취소·Escape·Back·계속편집·버리기 fixture 실행; 성공 저장 외0write·정확 opener복귀·중첩 부모 draft 보존.
- 주요 근거: `D:/flowme2605/flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md:25` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md:119` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1083` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:3037`

### K-D1-02 · standalone 개인 Plan 편집이 날짜 3상태·개인 구간 제목·상속/순서를 축약한다

- 요구: D1-001, D1-006, D1-012 / 위험도: high
- 원래 요구: 원본 따르기/고정/미정 의미 구분, stable 개인 구간 제목, Item 개인순서. source owner는 읽기 전용.
- 현재: React는 mode/sectionTitles/orderedItemRefs를 사용하지만 standalone draft는 title/items[{title,memo,planDate}]이며 native date 입력 하나. 구간 제목/상속 복귀/Plan 순서 컨트롤이 없음.
- 수정 설계: 기존 React의 pure personal-plan contract를 기준으로 fixture adapter의 동등 필드·transition 정의. 출처별 실제 capability 밖은 숨기고 owner를 문자열로 추정하지 않음.
- 완료 조건: 원본과 같은 fixed pin/명시 inherit reset/unscheduled, stable 개인 구간만 변경, 동일구간 전 Item 투영, 순서→저장/reload/Undo, source raw 불변을 양쪽 검증.
- 주요 근거: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx:455` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx:685` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:936` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1118`

### K-D1-03 · Calendar 월 탐색 기준을 Plan 일정 anchor 완료로 세었다

- 요구: D1-006, D1-023, D1-016 / 위험도: high
- 원래 요구: 이사일 등 기준일을 먼저 고르고 상대 일정 전체를 즉시 재계산. 보기 상태와 저장 날짜를 분리.
- 현재: React previous/next는 calendar.baseDate로 월 이동. Plan-level 일정 owner는 stage-3에서 부분으로 남겨 두었다. standalone도 M.TODAY와 month shift.
- 수정 설계: month cursor/selected day/source anchor/personal anchor를 계약표로 분리. 기존 DTO가 anchor를 보유한 경우만 no-write preview부터 설계하고, 필요한 shadow 확장은 버전 계약으로 별도 승인. 임의 날짜 추정 금지.
- 완료 조건: 월/선택일 전환0write와 원래 날짜 유지, anchor preview0write와 상대 일정 정확 재계산, fixed/unscheduled/실행일 보존을 서로 다른 시나리오로 입증.
- 주요 근거: `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:821` · `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:831` · `D:/flowme2605/flow-mvp/docs/pr-history/2026-08-13-flow-map-item-date-parity.md:25` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md:90`

### K-D1-04 · 출처를 보고 고르는 입구가 개인공간 상세 보강에서 빠졌다

- 요구: D1-017, D1-016, D1-019 / 위험도: high
- 원래 요구: 선택 전 출처명·원문 링크, 선택 후 공유 원문/개인 사본 상태, 원문 실행 기준·완료 기준.
- 현재: React entry 카드에는 제목/child수만 있으며 Item preview는 description만 렌더한다. 원문 source URL은 editor DTO에 존재하는 경로가 있으나 입구에 전달되지 않는다. standalone 카드도 originLabel로 그침.
- 수정 설계: 기존 safe source metadata를 discovery 카드→선택 요약→읽기 상세로 전달하고 P3-J criteria renderer/empty 규칙을 재사용. 출처 없는 경우 사실대로 표시하며 추정 링크 생성 금지.
- 완료 조건: source 있는/없는 4origin+authored fixture에서 선택 전 safe link, no-write lookup/선택, 선택 후 source/개인경계와 criteria exact value/창작0 검사.
- 주요 근거: `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:809` · `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:829` · `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:876` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx:2120`

### K-D1-05 · 변경 영향 요약에 포함/제외 선택·확인·복원 의미가 없다

- 요구: D1-018, D1-016 / 위험도: high
- 원래 요구: 선택n/전체n·제외 확인과 복원·저장 영향 확인.
- 현재: React includedCount는 전체 orderedItemRefs 길이, excludedCount는0고정. validate는 guard의 모든 Item 보존을 요구. standalone도 action.items.length가 전체와 같아야 한다.
- 수정 설계: timeline 숨김·원문 삭제를 Plan 제외로 재사용하지 않는다. 기존 원본 capability와 personal membership owner의 상태표를 먼저 설계하고 승인 후 versioned shadow에만 연결. 그 전에는 현재 전체반영 요약으로 정직하게 표시.
- 완료 조건: include/exclude/restore의 대상·개수·날짜·criteria 보존, staged apply0write, 최종1write/Undo, 다른사본/원문불변. collision은 자동합치기 없이 차단.
- 주요 근거: `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:856` · `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:898` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:4072` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/lib/flow/personal-workspace-poc-plan-editor.ts:796`

### K-D1-06 · 단일 HTML의 Plan 저장 피드백이 구조화 receipt와 다르다

- 요구: D1-003, D1-011, D1-018 / 위험도: medium
- 원래 요구: 한 번 저장한 범위·전후 값·결과 개수·Undo/실패 복구가 이해돼야 함. A0-6은 같은 intent의 receipt 의미를 요구.
- 현재: React ReceiptSurface는 owner별 before/after/affectedCount. standalone은 toast text와 누적 성공 수, Plan lastReceipt는 flowId/title/itemCount만 기록. authoring 완료 화면은 별도이므로 대체 근거가 아님.
- 수정 설계: 공통 receipt DTO/view 의미를 재사용해 정확 변경 수·전후 값·취소 범위·same intent retry를 연결. 발표 live region은 하나의 owner로 조정.
- 완료 조건: 같은2필드 변경/0변경/취소/강제실패/재시도/Undo에서 양쪽 receipt 의미 동일; 성공 전 오류 상태·prefix불변, actual screen-reader는 별도 NOT_RUN.
- 주요 근거: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md:135` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md:301` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocReceiptSurface.tsx:39` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:343`

### K-D1-07 · PoC 내부 주 행동도 전역 cobalt token을 사용한다

- 요구: D1-013, D1-014 / 위험도: medium
- 원래 요구: P3F는 전역 FlowMe ink/cobalt와 exact-query local white/gray/teal owner를 분리.
- 현재: Surface PRIMARY_CLASS가 --flowme-action을 직접 사용하고 localMain은 workspace-accent만 선언. 상위 담당 current Chromium에서 Quick/계획편집 rgb(49,94,231) 관측.
- 수정 설계: 전역token/PlatformNav를 손대지 말고 local action·selection·focus 의미표를 확정한 후 PoC presenter에만 명시 local token 적용. 기존 CSS 주석과 계약도 같은 owner 의미로 정리.
- 완료 조건: global shell과 local 주행동을 다른 test target으로 측정; 5폭에서 focus/disabled/danger 포함 색상·contrast·원본대비 확인.
- 주요 근거: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md:16` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md:47` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocProductShell.module.css:37` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx:269`

### K-D1-08 · 검토용 기술 설명과 중복 편집 entry가 제품 흐름에 남아 있다

- 요구: D1-014, D1-025, D1-016 / 위험도: medium
- 원래 요구: 원문/개인경계는 보존하면서 내부 trace를 숨기고 한 맥락의 주행동/편집 entry를 명확히 함.
- 현재: standalone 결과 기본 제목에 원본 Item·회차 식별자, summary WorkingSource, 본문 shadow가 노출. Flow header 개인편집과 아래 결과 Plan 편집이 같은 editor를 연다.
- 수정 설계: 기본 화면은 '원문/내 계획/다른 방식으로 보기/계획 편집'처럼 목적 중심으로 정리. 기술설명은 검증 도구로 이동하고 source/privacy/recovery 문구는 유지.
- 완료 조건: 같은 editor 중복 entry를 정리한 뒤 클릭 수/복귀 동일; 화면 기본낭독에서 내부어휘/추적값0, 핵심 source보호 안내 유지.
- 주요 근거: `D:/flowme2605/flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md:40` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1026` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1197` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1236`

### K-D1-09 · 부모 충족·오래된 세부 사유·실제 capability 제한을 한 숫자로 읽으면 안 된다

- 요구: D1-003, D1-004, D1-006, D1-010, D1-018, D1-022, D1-023, D1-026 / 위험도: medium
- 원래 요구: 원래 요구·후속 대체 결정·현재 적용 여부를 하나하나 연결해 보고해야 함.
- 현재: 생성 trace의 D1 부모26은 충족이지만 일부 subcheck는 UI없음 등 과거 문구. 현재 UI가 있는 경우와 anchor/포함 owner 부재, offline parity 차이가 섞여 있다. Aug13 trash spec 직접 경로는 main/현재 worktree 양쪽에 없음.
- 수정 설계: 역사 trace를 덮지 말고 이번 audit를 별도 층으로 둔다. 코드확인/실제차이/의도변경/과거미갱신/미검사를 분리하고 원본 primary 부재를 표시.
- 완료 조건: D1 26부모·59기존 세부조건 ID를 보존하며 현재 조회 범위와 새 실행범위를 구분; unavailable source/전체 UX 미검사를 명시.
- 주요 근거: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html#trace-data` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md:90` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-d1-history.json` · `D:/flowme2605/flow-mvp/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md (Test-Path/읽기 실패: 없음)`

### K-D1-10 · 찾은 Flow 미리보기와 저장 Flow 결과가 다른 표현·data owner를 사용한다

- 요구: D1-021, D1-022, D1-023, D1-024 / 위험도: medium
- 원래 요구: 후속 Text-default 결정과 개인 적용값을 반영한 전체 결과, child 선택 후 결과 확인.
- 현재: workspace는 effective ResultPresenter와4슬롯을 사용. entry의 Text/Todo/날짜는 selectedFlow 원본 item title/section/sourceDate 목록을 공유하며 description만 펼친다.
- 수정 설계: 공유 원문 preview와 내 사본 effective preview를 명시적으로 구분하고 동일 목적에는 기존 presenter를 재사용. 기본Text를 과거 콘텐츠별추천결과로 되돌리지 않음.
- 완료 조건: 개인 제목/순서/날짜 수정 뒤 재검색·child변경·preview·개인공간왕복에서 expected owner와 결과fullrefs를 비교; source역쓰기/추정값0.
- 주요 근거: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx:2400` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx:2448` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx:300` · `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js:1008`

## 다음 구현 묶음 제안

### 묶음 A · 같은 편집을 안전하게 끝내기

우선순위가 가장 높다. K-D1-01·02·06을 묶되, 원문/실행 상세 P3-J 구현은 보존한다.

1. 기획: React/HTML의 Plan→Item 상태표를 나란히 적고 clean/dirty/staged/submitting/failure/recovery의 이탈·저장 의미를 고정한다. 이미 승인된 개인 3상태/구간 owner만 사용한다.
2. UX: Item ‘계획에 반영’과 Plan ‘변경 저장’을 구분하고, dirty 확인의 ‘계속 편집/변경 버리기’·실패 retry·성공 receipt·원래 위치 복귀를 같은 문구로 설계한다.
3. 개발 설계: versioned 개인 draft와 pure transition을 공통 규칙으로 삼고 fixture adapter/React presenter만 분리한다. source 문자열이나 동일 날짜를 이용해 owner를 추정하지 않는다.
4. 개발: standalone의 무확인 취소, 날짜 mode, 개인 구간/순서, Plan receipt를 연결한다. 전역 Undo와 중첩 draft 간 guard를 먼저 붙인다.
5. 검증: 네 origin+authored, clean/dirty 모든 종료 경로, 상속/같은날짜 pin/미정, 2개 변경 receipt, 실패/재시도/Undo/reload, source bytes와 prefix audit. 기존 React 회귀를 그대로 유지한다.

종료 기준: 같은 intent가 두 표면에서 같은 draft/성공 상태·receipt 의미를 만들고, 취소/실패가 원본이나 마지막 성공 상태를 바꾸지 않아야 한다. 현재 HTML dirty Escape 재현은 이 묶음의 첫 회귀 시험으로 고정한다.

### 묶음 B · 출처를 보고 고르고, 같은 Flow로 다시 찾기

K-D1-04·10을 중심으로 K-D1-08의 해당 입구 문구만 함께 정리한다.

1. 기획: J1 발견 카드→선택 미리보기→개인공간 상세의 source/개인 owner를 필드별로 매핑한다. 원본 URL 없는 경우의 표시도 정의한다.
2. UX: 선택 전에 출처명·안전한 링크를 확인하고, 선택 후 원문 기준/개인 사본 상태를 구분한다. 기존 사본을 찾은 결과와 새 원문 만들기의 주행동은 중복시키지 않는다.
3. 설계·개발: 기존 discovery DTO·safe URL·P3-J readonly details를 재사용한다. 같은 의미의 preview에는 기존 result presenter를 쓰고 full refs/선택 상태를 보존한다.
4. 검증: query/URL hit·miss·invalid/memo, source 정보 유무, four origins, single/multi child exact preselection, 개인 제목/날짜 변경 후 재검색, source/criteria·메모 보존과 write 0.

종료 기준: 사용자가 편집 화면을 먼저 열지 않아도 출처를 확인하고, 선택/저장/다시 찾기 전후 같은 사본과 같은 데이터 owner를 이해할 수 있어야 한다.

### 묶음 C · 기준일·포함 범위의 빠진 owner부터 설계하기

K-D1-03·05는 바로 UI 버튼만 추가할 작업이 아니다. 현재 read model에 없는 Plan-level 의미를 보완하는 설계가 선행돼야 한다.

1. 원본 일정/개인 Plan anchor/실행 위치/Calendar 탐색일, 그리고 원문 Item/개인 포함집합/기간 숨김을 따로 정의한다.
2. 네 origin의 기존 anchor/membership capability를 확인하고 가능한 데이터만 no-write projection으로 미리 보인다.
3. 기존 승인으로 해결할 수 없는 owner 선택은 의사결정 항목으로 올린다. 영구 정책이나 운영 schema를 이번 PoC에서 확정하지 않는다.
4. 합의한 versioned shadow contract의 순수 모델·negative matrix부터 만든 후 기준일 preview/포함·제외·복원/저장 영향 UI를 연결한다.
5. fixed pin·미정·완료·메모·source criteria·다른 사본 보존, stage write0/commit1/Undo, corrupt/fail-closed를 검증한다.

종료 기준: Calendar 월 탐색을 anchor 완료로 세지 않고, excluded 0 요약을 제외/복원 완료로 세지 않으며, 실제 지원된 동작만 충족 처리한다.

색상/위계 K-D1-07·08은 핵심 기능/안전 묶음과 충돌하지 않는 로컬 presenter 범위에서 처리한다. 전역 디자인 재선택이나 별도 리브랜딩은 하지 않는다.

## 증거의 한계와 재사용할 회귀

- React Stage 2: 단일 입력 분기, exact multi-child hit/preselection. 기존 `personal-workspace-stage-2-runtime.spec.ts:388,456`.
- React Stage 3: 네 origin Plan/Item, parent apply/commit, no-op/dirty Cancel/Escape/Back, exactrollback·retry·Undo·reload. 기존 `personal-workspace-stage-3-runtime.spec.ts:674,728,976,1049,1156`.
- 개인 구간: 기존 `personal-workspace-integration-poc.spec.ts:373`. 현재 HTML에 같은 개인 구간 조작이 있다고 이 테스트로 대신 주장하지 않는다.
- standalone: 기존 `personal-workspace-integrated-standalone.spec.ts:488`의 고정 결과·휴지통 lifecycle. live origin/운영 bytes 실프로필 증거는 아니다.
- P3-J: 두 execution-detail suite는 원문/완료 기준/개인 메모·result 연결·긴 텍스트의 이전 시험이다. discovery preview나 Plan anchor 전수 검증으로 확대하지 않는다.
- 이번 대표 브라우저/viewport 결과와 실행 수는 주 담당의 P3-K QA를 합친다. 실 Android/iOS·실 보조기술 검사는 NOT_RUN, 관찰 사용자 0명이다.

## 남은 원본 회수 문제

개발1 작업은 실제 최근 2턴만 다시 읽었다. 나머지는 생성 trace의 D1-conversation 앵커와 원본/후속 명세를 교차 확인했다. 모든 대화를 직접 전수 재열람했다고 표현하지 않는다.

과거 trace의 `2026-08-13-plan-edit-trash-structure-unification/spec.md`와 `qa.md`는 main/현재 worktree 예상 경로에 없다. 원 요구는 Aug12 공통 명세·Aug19 UI·회수 trace로 대조했지만 해당 원본 문서 복원은 남아 있다. PR #195 원격 증거를 새로 조회하지 않았으며, 관련 후속 결정은 회수 trace 근거로 표시했다.

## 작업 소유와 게시 상태

이번 담당이 만든 파일은 `d1-audit.json`, `d1-audit.md` 두 신규 문서뿐이다. 기존 제품·단일 HTML·테스트·trace·운영 key/schema는 변경하지 않았다. JSON 구문/ID 수를 확인하며 제품 테스트 재실행은 없다. commit·push·PR·Preview·Production은 수행하지 않았다.

