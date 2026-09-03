# 작성→개인공간 일치 P0 요구 추적

- 작성일: 2026-09-03
- 상태: `AUTHORING_TO_WORKSPACE_P0_CLOSED_PRODUCT_UX_PASS_SUPERSEDES`
- 판정 기준: 기존 정본과 2026-09-03 시작 시점의 trace·화면 증거
- 최종 판정: 아래 행의 `pending`은 구현 전 판정 양식이다. 이전 P0 최종 실행은 §10을,
  현재 제품 통합 상태는 후속 제품형 UX 패스를 따른다.

## 0. 2026-09-03 정합화

이 문서의 37개 `pending` 최종 칸은 실행 전 표가 남은 것이며 증거가 0이라는 뜻이 아니다.
이전 단계에서 UI-01~07, FN-01~07, ST-01~05, DT-01·03~05, RA-01~05,
EV-01~05의 P0 또는 자동화 한정 계약이 닫혔다. DT-02는 의도적 변경, UI-08은 제품형
UX 부분, RA-06은 실제 기기 미실행, EV-06은 전체 npm 실패로 남는다.

또한 최종 HTML의 “세 결과물을 빠짐없이 연결”과 “통합 PoC 시나리오 통과”는 작성→개인공간
P0 자동 시나리오에 한정한다. D1-001~006·016~018의 공통 Plan→Item 화면과 opener는
전체 제품 연결로 아직 닫히지 않았다. 현재 요구와 48 gap 재분류는
[제품형 UX 패스 requirements](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/requirements.md)를
정본으로 사용한다.

## 1. 정본과 판정 순서

충돌할 때에는 다음 순서로 해석한다.

1. `a0-decision-record.md`의 A0-4와 A0-6
2. `stage-2-contract.md`의 구현·브라우저 계약
3. 2026-09-01 통합 blueprint
4. 2026-08-30 Unified Editor successor
5. 2026-07-28 Text Authoring v1

따라서 초기 v1의 `입력 -> 구조 -> 결과` 기본안보다 후속 확정인 `입력 -> 결과`,
필요할 때만 구조 검토를 여는 계약이 우선한다. React exact-query surface가 제품 구현
정본이며, 독립 HTML은 fixture-only 차이를 제외한 핵심 UX를 축약하거나 다르게 만들지
않는다.

판정 용어는 다음과 같다.

- `충족`: 시작 시점 trace와 현재 화면 증거가 모두 요구를 지지한다.
- `부분`: 일부 surface·상태·증거만 충족하거나 trace와 화면 증거가 충돌한다.
- `미충족`: 요구된 사용자 경로나 증거가 없다.
- `의도적 변경`: 후속 통합 결정이 앞선 원안을 명시적으로 대체했다.
- `제외`: 이번 P0에서 구현하지 않기로 이미 경계를 정했다.
- `pending`: 이번 구현 뒤 fresh 근거로 판정할 칸이다.

## 2. 화면 요구

| Key | 관련 요구 | 원자 요구 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| UI-01 | A0-4, D2-029~032 | exact `rawText` 하나와 editable editor 하나를 유지하고 `순수 텍스트 / Flow 편집`이 있는 surface에서는 같은 source의 표현으로만 전환한다. | 부분 — React는 충족, 독립 HTML의 source/result owner 경계는 재검증 필요 | 두 surface 모두 편집 owner는 1개다. React view 전환은 bytes·selection·scroll·history를 보존하고, 독립 HTML은 같은 이름의 view toggle 없이도 source editor와 파생 result를 분리할 수 있다. | pending |
| UI-02 | A0-4, D2-022 | 정상 문서는 `입력 -> 결과`로 진행하고 구조 검토는 사용자 요청 또는 issue가 있을 때만 연다. | 부분 — React는 충족, 독립 HTML은 강제 `1 작성 / 2 구조 확인 / 3 저장` | 독립 HTML의 강제 3단계와 일반 source 확인 checkbox 제거, 선택형 review로 통일 | pending |
| UI-03 | D2-045 | 구조명 중심 여섯 작성 틀과 용도·짧은 예시를 picker에 직접 보여 준다. | 충족 | React·독립 HTML의 label·description·example·scaffold를 한 versioned 계약으로 고정 | pending |
| UI-04 | D2-053,054 | 직접 작성·문맥형 helper·template·복원 문서에서 같은 `입력 예시` toggle과 전체 빈칸 ghost를 쓴다. | 부분 — trace는 React 충족이나 기존 캡처에서 첫 `#` 외 빈칸 예시가 보이지 않음, 독립 HTML은 ghost 없음 | 모든 인식 가능한 빈 값에 해당 줄 예시가 보이고 pure text에서는 숨김 | pending |
| UI-05 | D2-033,034,037,040,044,055 | safe owner 줄의 문맥형 `+`가 `다음 할 일 -> 하위 확인/항목 정보 -> 새 단계` 관계와 실제 문법을 보여 준다. | 부분 — React 충족, 독립 HTML 미구현 | React의 menu 순서·관계·one-level guide와 IME·stale·cancel write 0 회귀를 유지한다. 독립 HTML의 문맥형 helper parity는 P1에서 다룬다. | pending |
| UI-06 | D2-003,019,020,021 | 편집 결과는 실제 실행 항목 수와 날짜 노출을 즉시 보여 주고 source와 개인 결과를 구분한다. | 부분 | 이번 P0의 Todo·날짜 preview와 source fingerprint를 양쪽에서 일치시킴. Sheet·복사용 TXT 전체화는 제외 표에 유지 | pending |
| UI-07 | D2-005, D1-016 | 저장 영수증의 주 행동은 `개인공간에서 열기` 하나이며 저장된 Flow 상세로 바로 이어진다. | 부분 | React·독립 HTML에서 같은 CTA·receipt 의미·대상 identity 사용 | pending |
| UI-08 | D2-043, V41-001,029 | 흰 본문·평면 목록·회색 탐색·청록 강조를 유지하고 입력보다 설명·QA chrome이 앞서지 않게 한다. | 부분 — React는 감산됐으나 독립 HTML 3단계 chrome이 남고 운영 shell 선택은 미승인 | PoC 안에서 compact header, local primary 1개, 변화가 있을 때만 상태 표시 | pending |

## 3. 기능 요구

| Key | 관련 요구 | 원자 요구 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| FN-01 | D2-001,011,014 | 일반 문장은 원문에 그대로 남고 명시한 checklist만 실행 항목이 된다. AI나 추정으로 Todo를 만들지 않는다. | 충족 | 기존 deterministic parse와 invalid/blank 구분 회귀 유지 | pending |
| FN-02 | D2-046,048,051 | 빈 문서에서 고른 scaffold를 같은 editor에 정확히 한 번 넣고, 필요한 줄만 채우거나 삭제하며 값 있는 형제만 해석한다. | 부분 — React 충족, 독립 HTML의 transaction·caret parity 부족 | 여섯 틀 exact bytes, first blank caret, 부분 해석을 양쪽에서 확인 | pending |
| FN-03 | D2-052 | template 전체를 native Undo 한 번으로 제거하고 Redo 한 번으로 byte-identical 복구한다. | 부분 — React 충족, 독립 HTML은 별도 수동 template history | 독립 HTML의 수동 history를 제거하고 browser-owned transaction 의미로 일치 | pending |
| FN-04 | D2-049,050 | picker browse/cancel은 source write 0이고 non-empty·stale editor/document/source·dispatch 변화·IME composing·중복 적용은 fail-closed한다. | 부분 — React 충족, 독립 HTML은 일부 guard만 존재 | 모든 guard에서 source·draft·workspace target mutation 0 | pending |
| FN-05 | D2-022,040,058 | issue가 있으면 보존 가능한 결과와 exact source line을 보여 주고 같은 editor/caret으로 돌아가 수정한다. | 부분 | 선택형 review, stale locator 무적용, Escape focus return, 수정 후 count 갱신 | pending |
| FN-06 | D2-005,058, D1-016 | 명시 저장 한 번이 source lineage·canonical result·personal projection·folder·draft cleanup을 한 복구 가능한 handoff로 만든다. | 부분 | 작성→저장→receipt→개인공간 상세→개인 편집→기간 보기→reload 연결 | pending |
| FN-07 | D1-019,024 | query·HTTP(S) URL·일반 memo가 단일 입력에서 결정적으로 분기하고 Map child 변경은 결과·detail·focus를 함께 초기화한다. | 충족 | 기존 진입·Map 회귀를 유지하고 authoring parity 변경으로 깨지지 않게 함 | pending |

## 4. 상태·전환 요구

| Key | 관련 요구 | 원자 요구 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| ST-01 | A0-4, D2-049 | picker·helper·review 열기, 둘러보기, 닫기와 view·ghost toggle은 source·저장 mutation 0이다. | 부분 | 두 surface의 picker·review·ghost와 React의 view·helper에 zero-write transition 표와 E2E를 적용한다. | pending |
| ST-02 | D2-050,058 | stale·double·composing·invalid apply와 저장 실패는 성공 상태를 만들지 않고 이전 exact bytes를 보존한다. | 부분 | late failure rollback과 재시도 가능한 실패 receipt를 양쪽에서 확인 | pending |
| ST-03 | D2-052,058 | template Undo와 성공 handoff Undo를 구분한다. handoff Undo는 이전 workspace state와 작성 draft를 함께 복구한다. | 부분 | native editor history와 PoC state snapshot이 서로 침범하지 않음 | pending |
| ST-04 | D2-057,058 | 작성 중 draft reload와 성공 저장의 durable state를 분리하고 손상 draft/state는 fail-closed한다. | 충족에 가까운 부분 | 양쪽 reload·malformed payload·commit cleanup·Undo recovery를 같은 시나리오로 검증 | pending |
| ST-05 | D2-022 | review open/close 자체를 source 확인이나 loss acceptance로 사용하지 않는다. | 부분 — React 충족, 독립 HTML checkbox가 위반 | 확인 checkbox는 실제 material loss가 있을 때만 나타나며 일반 문서에는 0개 | pending |

## 5. 데이터·저장 경계

| Key | 관련 요구 | 원자 요구 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| DT-01 | A0-4, D2-029,054 | `rawText` exact bytes가 source owner이며 preview·ghost·template 이름·질문·placeholder는 source가 아니다. | 부분 | CRLF·tab·emoji·trailing newline을 포함한 byte parity와 ghost copy 제외 | pending |
| DT-02 | A0-1, D2-005 | handoff 전 authoring draft, handoff 후 PoC personal Flow shadow가 owner다. Creator/public/execution을 같은 저장소에 합치지 않는다. | 의도적 변경 | 개인 Flow handoff만 유지하고 CreatorDraft/public CTA·writer 0 | pending |
| DT-03 | D2-058 | 같은 source 재시도는 같은 handoff identity를 사용하고 중복 개인 Flow를 만들지 않는다. | 부분 — React 근거는 있으나 독립 HTML stable identity 부족 | 동일 source·동일 revision retry에서 target write·Flow 추가 0 | pending |
| DT-04 | BP 저장 경계, D2-006,058 | 모든 쓰기는 `flow:poc:personal-workspace:v1:*`에만 허용하고 기존 `flow:*`와 운영 writer를 건드리지 않는다. | 충족 | 전체 시나리오 전후 operating key/value byte 동일, prefix 밖 set/remove/clear 0 | pending |
| DT-05 | D2-054 | ghost toggle/render는 source·clipboard·selection·scroll·revision·dispatch·draft write·Undo를 바꾸지 않는다. | 부분 — React E4 주장, 화면 가시성과 standalone parity는 미완 | DOM과 사용자 시나리오 양쪽에서 무영향 계측 | pending |

## 6. 반응형·접근성 요구

| Key | 관련 요구 | 원자 요구 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| RA-01 | D2-042,061 | 320×700, 375×812, 390×844에서 editor와 local primary가 겹치지 않고 input은 16px, 주 target은 48px다. | 부분 — 320 캡처에서 sticky CTA와 editor가 겹침 | editor/CTA 실제 rect 교차 0, 마지막 입력 줄 scroll 접근, document overflow 0 | pending |
| RA-02 | D2-038,042,061, V41-032 | 844×390은 compact 2-state와 panel 내부 scroll을 쓰고 마지막 menu row·닫기·primary에 도달한다. | 부분 | active panel 내부 scroll과 safe-area·sticky 경계를 geometry로 확인 | pending |
| RA-03 | D2-042,061 | 1024×768은 input/result 2-pane, 1440×900은 40~44/56~60% 2-pane이며 빈 세 번째 열과 nested modal이 없다. | 충족에 가까운 부분 | 두 pane 독립 scroll, result 첫 control·review drawer·CTA 가림 0 | pending |
| RA-04 | D2-061 | 200% 등가 reflow에서 line guide·wrapped text·ghost·menu·sticky CTA가 겹치거나 수평 overflow를 만들지 않는다. | 부분 | 자동 reflow proxy를 별도 기록. 실제 browser text zoom은 미실행 표에 유지 | pending |
| RA-05 | D2-054,061 | visible label, `aria-pressed/expanded/controls`, non-modal menu, 정상 Tab/Shift+Tab, Escape와 opener focus return, reduced motion을 제공한다. | 부분 | keyboard-only 과업, duplicate source 낭독 0, ghost/guide 접근성 tree 제외를 자동 검사 | pending |
| RA-06 | D2-038,042,061 | 모바일 visual viewport에서 caret과 활성 menu 항목이 가상 키보드에 가려지지 않는다. | 미충족 — 실제 기기 키보드 증거 없음 | 자동 visualViewport 시뮬레이션까지만 실행하고 실제 Android/iOS 결과로 표현하지 않음 | pending |

## 7. 증거 요구

| Key | 관련 요구 | 필요한 fresh 증거 | 시작 전 판정 | 이번 구현 기대 | 최종 판정 |
| --- | --- | --- | --- | --- | --- |
| EV-01 | D2-045~055 | catalog·blank parse·ghost·transaction·identity 순수 모델과 component test | 부분 | 실행 개수·통과·실패를 suite별 기록 | pending |
| EV-02 | A0-4, A0-6 | React와 독립 HTML에서 같은 intent가 같은 next-state·receipt를 만드는 브라우저 시나리오 | 미충족 | 강제 3단계·일반 checkbox 0, six-template·review·save parity 확인 | pending |
| EV-03 | D2-042,061, V41-052 | 여섯 viewport와 200% 등가 reflow의 overflow·console·page error·핵심 행동 가림 계측 및 캡처 | 부분 | viewport별 결과와 화면 자산 경로 기록 | pending |
| EV-04 | D2-058, BP 저장 경계 | 정상·취소·stale·IME·중복·저장 오류·Undo·reload 전후 storage call과 byte snapshot | 부분 | 허용 prefix 밖 mutation 0, operating bytes 동일 | pending |
| EV-05 | D1-016, D2-005 | 작성→개인 Flow 저장→개인공간 상세→개인 편집→기간 보기→reload end-to-end | 부분 | React와 standalone 각각 성공, identity·lineage·상태 일치 | pending |
| EV-06 | 전체 회귀 | 관련 회귀, `npm test`, production build, docs check, diff check | pending | 기존 콘텐츠 신선도 실패는 PoC 실패와 분리하고 green으로 표현하지 않음 | pending |

## 8. 이번 P0에서 의도적으로 남길 요구

| 요구 | 상태 | 이번에 열지 않는 이유 |
| --- | --- | --- |
| D2-003,019,020 전체 Sheet·복사용 TXT authoring 결과 | P1 제외 | 이번 P0는 현재 Todo·날짜 preview와 개인공간 인계 parity가 목표다. 기존 요구를 완료로 올리지는 않는다. |
| D2-035 전체 property catalog | P1 제외 | 현재 parser가 lossless하게 지원하는 항목만 노출하고 나머지는 보존·차단한다. |
| D2-036 inline/native picker 전체 | P1 제외 | 날짜·시간·복합 recurrence 편집 surface 확장은 별도 범위다. |
| D2-039 rendered property 재진입 | P1 제외 | exact value selection을 별도 editor slice로 남긴다. |
| D2-041 near-miss 문법 자동 제안 | P1 제외 | 명시적 복구 transaction 설계가 별도로 필요하다. |
| D2-056 recursive StructureDraft/compiler | P1 제외 | versioned PoC catalog만 사용하며 새 canonical compiler를 승인하지 않는다. |
| D2-033,034,037,040,044,055 독립 HTML 문맥형 helper parity | P1 제외 | A0-6의 이번 동일 의무는 one-editor·template·ghost·handoff다. 문맥형 `+`는 React 회귀만 유지한다. |
| D2-057 CreatorDraft 검색·복제·보관·재진입 | A11 결정 보류 | personal handoff와 creator/publish owner를 섞지 않는다. |
| D2-021 결과 Item 수정의 source reverse edit | 제외 | 이번 PoC는 source를 역편집하지 않고 personal overlay만 원자 적용한다. |
| recurrence occurrence, table/source update, public candidate, AI, cloud·외부 동기화 | 제외 | A0에서 가짜 지원 대신 raw 보존·fail-closed로 고정했다. |

## 9. 사람 결정과 외부 증거

다음은 이번 구현 완료 조건과 분리한다.

- v4 원안의 `탐색 / FlowMe / 검토`와 현 제품 navigation 중 운영 shell 선택
- teal/cobalt 운영 token과 production design system 반영
- CreatorDraft A11을 다시 여는 계정·revision·publish owner 승인
- 운영 route/store/schema, migration, writer adapter 승인
- 실제 Android Chrome과 iOS Safari 가상 키보드 검사
- 실제 browser 200% text zoom과 screen reader 실기
- 관찰 사용자 과업과 성공 기준
- commit, push, PR, Preview, Production

자동화와 Chromium 화면 캡처는 위 실제 기기·보조기술·관찰 사용자 증거를 대체하지
않는다.

## 10. 2026-09-03 자동 검증 마감 판정

구현은 React와 독립 HTML 양쪽에 반영됐다. 기존 168개 primary requirement의 verdict
합계는 바꾸지 않았다. 이번 P0가 닫은 세부 계약은 이미 `충족`인 D2-022, D2-043,
D2-045, D2-046, D2-053, D2-054의 최신 근거로 보강했고, D2-007·D2-058·D2-061·
D2-063은 운영 디자인 결정·source reverse edit·실제 기기/보조기술·최종 전체 실행이
남아 `부분`을 유지한다.

| 근거 | 현재 결과 | 판정 범위 |
| --- | --- | --- |
| React 신규 계약 테스트 | `23/23` | picker example, all-blank ghost, compact geometry |
| personal-workspace model/component | `256/256` | 기존 저장·transition 회귀 포함 |
| React Stage 2 Chromium | `11/11` | 6 viewport, editor/CTA, template·ghost·review |
| standalone node | `39/39` | template catalog, ghost hints, stable identity, state+draft rollback |
| standalone 전체 Chromium | `21/21` | 6 viewport, 2-state, picker example, review, 10 ghost, native Undo, save·retry |
| cross-surface parity | `2/2` | React와 standalone 핵심 계약 비교 |
| 통합 end-to-end | `3/3` | 작성→개인공간 상세·편집·기간·reload |
| 최종 product browser 합계 | `37/37` | cross-surface 2 + standalone 21 + integration 3 + React Stage 2 11 |
| production build | `18/18` | 최종 React·standalone bytes 반영 |
| 요구 추적 HTML Chromium | `2/2` | 필터·수치·저장 0, 필수 viewport overflow·console·page error 0 |
| 단일 파일 | 각 `201,783` bytes, SHA-256 `361B97E037B106EAF307FCA92D92826ECA9C4F07E261D40D4DC9284766A7FCB6` | 두 파일 byte-identical |

위 표의 행별 `pending` 칸은 구현 전 판정 양식이며, 이번 자동화 마감 상태는 이 §10을
우선한다. docs check `4,588/4,588`과 diff check는 통과했다. 전체 `npm test`는 `1520/1521`에서 기존
`dog-adoption-first-week:review_due:2026-06-04` freshness 1건으로 실패·중단됐다. 현재 build `18/18`은
최종 React·standalone bytes를 반영해 통과했다.

## 11. 근거

- `docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md` A0-1, A0-4, A0-6
- `docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md`
- `docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/spec.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/interaction-spec.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/state-model.md`
- `<workspace>/flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-v41.json`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-d1.json`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-d2.json`
