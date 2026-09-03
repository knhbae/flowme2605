# FlowMe 통합 PoC 제품형 UX 패스 v1 Requirements

- 작성일: 2026-09-03
- 상태: `P0_REQUIREMENTS_RECONCILED_AND_AUTOMATED_PASS`
- 판정 대상: React exact-query PoC와 조작형 단일 HTML
- 이전 parity 자동 근거: 기준선으로만 사용

## 1. 정본 추적

| 코드 | 결과물 | 정본 | 이번 단계에서 반드시 보존할 것 |
| --- | --- | --- | --- |
| V41 | 개인공간 v4.1 UI | `2026-09-01-personal-workspace-v4-1-prototype/spec.md`, v4.1 UI HTML | 흰 본문·평면 목록·회색 탐색·청록 강조, 폴더·기간·QuickItem·이동·완료·Undo |
| D1 | 개발 1 saved-plan 편집 | 개발 1 대화 결정, My Plan edit/lifecycle 계약, D1 trace | 네 saved-plan origin, 공통 Plan→Item 필드 순서, source read-only, staged 단일 저장 |
| D2 | 개발 2 Text Authoring | Text Authoring v1, Unified Editor successor, D2 trace | rawText 하나, 작성 틀·입력 예시, 선택형 검토, deterministic parse, 명시 저장 |
| BP | 통합 blueprint | `2026-09-01-flowme-integration-blueprint-v0` | origin adapter, stable identity, personal/execution owner, PoC-only storage, fail-closed |

개발 1과 개발 2의 명칭은 세션 순서를 가리킨다. 실제 기능 역할은 각각 saved-plan 편집과
Text Authoring이며, 서로 바꾸어 기록하지 않는다.

## 2. 화면·기능 연결 추적

| 화면·기능 | V41에서 가져올 것 | D1에서 가져올 것 | D2에서 가져올 것 | 시작 판정 | 이번 합격 조건 |
| --- | --- | --- | --- | --- | --- |
| 진입·shell | 개인공간 탐색과 compact header | 기존 Flow opener | 새 Flow 진입 | 부분 | 제품 탐색과 화면 header가 한 층이며 내부 구현 용어가 없다. |
| 새 Flow 작성 | 개인공간으로 넘길 목적지 | 개인 Flow owner | rawText 하나, 작성 틀, ghost, 선택형 검토 | 구현·UX 보완 | 첫 행동은 원문 입력, primary는 `결과 보기` 하나다. |
| 결과·저장 영수증 | 저장 뒤 개인공간 상세 | 단일 저장과 destination | canonical result와 source lineage | 구현·UX 보완 | primary는 `개인공간에서 열기` 하나이고 내부 identity는 숨긴다. |
| 개인공간 목록 | 폴더·오늘·주간·월간·날짜 미정 | 네 origin Flow | authoring handoff Flow | 구현 | 다섯 origin이 같은 행 문법으로 나타나고 중복이 없다. |
| Flow 상세 | Flow와 Item의 실행 맥락 | Plan 공통 편집 | 보존된 원문 | 부분 | source와 개인 필드를 구분하고 같은 field order를 쓴다. |
| Item 상세·편집 | 완료·실행 날짜·부모 폴더 상속 | staged Item edit | source Item identity | 부분 | source를 바꾸지 않고 개인 제목·메모·실행 날짜만 편집한다. |
| 계획 날짜 | 기간 projection | inherit/fixed/unscheduled | 원문 날짜 | 부분 | `원래 날짜 따르기 / 날짜 지정 / 날짜 미정`과 실행 날짜 이동을 구분한다. |
| 폴더·날짜·순서 이동 | drag·길게 누르기·더보기·keyboard | 동일 intent·transition | 해당 없음 | 구현 | 모든 입력이 같은 transition을 쓰고 no-op/cancel은 mutation 0이다. |
| 완료·다시 열기 | 기간·Flow 보기의 같은 상태 | 개인 execution owner | 같은 Item ref | 구현 | 상세와 기간 projection이 즉시 같아지고 source는 불변이다. |
| 저장 상태·Undo·reload | 저장 중·성공·실패·되돌리기 | staged change summary | draft 복구 | 기능 구현·표현 보완 | 사용자 결과 문구, retry, focus 복귀와 이전 exact state 복원을 확인한다. |

## 3. 이번 단계의 원자 요구

| ID | 원천 요구 | 요구 | 시작 판정 | 필요한 fresh 근거 |
| --- | --- | --- | --- | --- |
| PUX-01 | V41-053, D1-014·025 | 모바일 header를 한 층으로 줄이고 화면별 primary action을 하나로 제한한다. | 부분 | 6 viewport geometry와 primary count |
| PUX-02 | D1-014·025, D2-007 | 기본 사용자 화면에서 PoC·저장 구현·내부 identity 용어와 QA chrome을 제거한다. | 미충족 | visible text scan 0건과 전후 화면 |
| PUX-03 | D1-001·016 | 새 작성 Flow와 네 saved-plan origin이 같은 Plan→Item 상세 schema를 쓴다. | 부분 | origin별 schema·field order model/browser 비교 |
| PUX-04 | D1-002 | 목록·검색·Flow·Item의 모든 opener가 같은 edit intent와 transition으로 수렴한다. | 부분 | opener별 destination·focus·state E2E |
| PUX-05 | D1-005·017 | source 정보와 개인 제목·메모·계획 값을 읽기·편집 가능 영역으로 구분한다. | 부분 | 다섯 origin 화면과 write target 검사 |
| PUX-06 | D1-003·004 | Item 적용은 Plan draft만 바꾸고 최종 저장 한 번 전까지 durable write를 만들지 않는다. | 부분 | draft/apply/cancel/Escape storage call count |
| PUX-07 | D1-006, D2-018 | 계획 날짜 3상태와 개인 실행 날짜를 다른 owner·문구·transition으로 다룬다. | 부분 | source/date/folder invariant 모델·브라우저 |
| PUX-08 | D1-018 | 저장 전 변경 요약에 포함·제외 영향과 대상 Flow·Item을 사용자 문장으로 표시한다. | 부분 | preflight UI, collision/failure write 0 |
| PUX-09 | D1-011, D2-058 | 저장·실패·retry·Undo·reload가 한 snapshot/transaction 계약을 쓴다. | 기능 충족·표현 부분 | success/failure/undo exact bytes E2E |
| PUX-10 | D1-022, D2-017 | 같은 Item이 상세과 오늘·주간·월간·날짜 미정에서 같은 날짜·완료 상태를 보인다. | 부분 | projection별 ref·상태 비교 |
| PUX-11 | D2-021 | 결과에서 바꾸는 값은 personal overlay이며 raw source를 역편집하지 않는다. | 부분 | source bytes 불변과 personal target 변경 |
| PUX-12 | D1-015 | editor, 첫 Item, local primary가 지정 viewport에서 가려지지 않는다. | 부분 | rect 교차·overflow·hit-test 0 |
| PUX-13 | V41·D1·D2 공통 | 같은 행동명과 상태 의미를 React와 단일 HTML에서 공유한다. | 부분 | 구조화 cross-surface comparison |
| PUX-14 | BP 저장 경계 | PoC prefix 밖 set/remove/clear 0, 운영 sentinel bytes 차이 0을 유지한다. | 충족·회귀 필요 | fault injection과 browser storage ledger |
| PUX-15 | 접근성 계약 | keyboard·Escape·opener focus 복귀·비드래그 이동을 제공한다. | 부분 | keyboard-only browser 시나리오 |
| PUX-16 | 증거 경계 | 자동화, 실제 기기, 관찰 사용자, 게시와 운영 결정을 분리한다. | 충족·회귀 필요 | QA·보고서의 분리 표와 과장 문구 0 |

## 4. 기존 48 gap의 실행 재분류

이 표는 이전 trace의 `부분` 또는 `미충족` 48개를 빠짐없이 한 주 경로에 배치한다.
상위 요구가 여러 기능을 묶은 경우 이번에 다룰 하위 계약만 범위 설명에 한정한다.

| 분류 | 수 | 요구 ID | 이번 처리 |
| --- | ---: | --- | --- |
| 현재 UX | 17 | V41-053; D1-001, D1-002, D1-003, D1-004, D1-005, D1-006, D1-011, D1-014, D1-015, D1-016, D1-017, D1-018, D1-022, D1-025; D2-017, D2-021 | 공통 shell·Plan→Item·staged 편집·날짜·상태·projection을 설계하고 구현한다. |
| 실기 | 7 | V41-062, V41-063, V41-064, V41-066; D2-038, D2-042, D2-061 | 자동화와 분리한다. 실제 Android/iOS·키보드·screen reader·200% zoom 전까지 미실행이다. |
| 운영 결정 | 8 | V41-001, V41-036; D1-012; D2-002, D2-004, D2-007, D2-056, D2-057 | production shell/token, canonical adapter, section/creator owner를 PoC가 확정하지 않는다. |
| 후속 기능 | 12 | D1-010; D2-003, D2-019, D2-020, D2-023, D2-024, D2-025, D2-026, D2-035, D2-036, D2-039, D2-041 | trash, Sheet/TXT, 표·장문, source candidate, 전체 property UI, near-miss를 현재 P0에서 제외한다. |
| 회귀 | 4 | D2-018, D2-040, D2-058, D2-063 | 이미 닫힌 owner 분리, React helper no-op, atomic recovery, evidence separation을 새 변경 뒤 재검증한다. |

합계: `17 + 7 + 8 + 12 + 4 = 48`.

### 범위가 갈리는 상위 요구

- D1-011은 사용자용 저장·오류·Undo 문구만 현재 UX다. trash count는 후속이다.
- D1-022와 D2-017은 기존 개인공간 날짜 projection 연결만 현재 UX다. recurrence occurrence와
  D2 전체 Calendar authoring surface는 후속이다.
- D2-021은 personal overlay 편집만 현재 UX다. source reverse edit는 제외다.
- D2-040은 React helper의 IME·stale·cancel write 0 근거가 이미 있다. 단일 HTML helper
  전체 parity는 현재 P0가 아니다.
- D2-058은 atomicity·stable identity·rollback 하위 계약이 구현됐다. 부모가 묶은 source
  reverse edit 때문에 전체 요구를 충족으로 올리지 않는다.
- D2-063은 기존 freshness 실패와 자동화 분리를 닫았다는 뜻이다. 전체 `npm test`는 green이 아니다.

## 5. 이전 근거와 이번 근거의 분리

| 증거 | 이전 parity 기준선 | 이번 제품형 UX fresh 상태 |
| --- | --- | --- |
| model/component | 256/256 | PASS, 269/269 |
| standalone node | 39/39 | PASS, 43/43 |
| product browser | 37/37 | PASS, runtime 57/57 + report 2/2 |
| production build | PASS, 정적 페이지 18개 | PASS, route 18개 |
| 전체 `npm test` | FAIL, 1,520/1,521 | FAIL, 1,533/1,534 · 같은 기존 freshness 1건 |
| docs/diff | PASS | closeout에서 final 실행 |
| 실제 Android/iOS | 미실행 | 미실행 |
| 관찰 사용자 | 0명 | 0명 |
| commit·push·PR·Preview·Production | 미진행 | 미진행 |

이전 37/37을 복사하지 않았으며 이번 변경 뒤 모두 다시 실행했다. suite별 실제 결과와
외부 미실행 범위는 [qa.md](./qa.md)와 최종 보고서에 분리해 기록한다.

## 6. PUX 최종 판정

| 요구 묶음 | 최종 판정 | fresh 근거 |
| --- | --- | --- |
| PUX-01~02 shell·주행동·내부 문구 | 통과 | component 구조 검사, React·standalone 6 viewport 화면 |
| PUX-03~05 다섯 origin·공통 Plan→Item·owner | 통과 | model 269/269, Stage 3·integration·parity 브라우저 |
| PUX-06~09 staged 저장·날짜·요약·복구 | 통과 | failure/retry/Undo/reload와 exact bytes 시나리오 |
| PUX-10~13 projection·overlay·반응형·surface parity | 통과 | 4-view 동일 ref/date/completion, 6 viewport, cross-surface |
| PUX-14 저장 경계 | 통과 | 허용 prefix 밖 set/remove/clear 0, 운영 sentinel bytes 동일 |
| PUX-15 keyboard·focus·비드래그 | 통과 | Enter/Space/Escape, opener focus, menu·keyboard 이동 |
| PUX-16 증거 분리 | 통과 | 자동화·실기·관찰 사용자·게시 상태를 별도 기록 |

`현재 UX 17개`는 이번 P0 자동화 범위에서 닫혔다. 실제 기기 7개, 운영 결정 8개,
후속 기능 12개는 범위 누락이 아니라 별도 owner와 증거가 필요한 항목이다. 회귀 4개는
새 변경 뒤 다시 통과했다.
