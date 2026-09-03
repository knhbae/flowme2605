# 작성→개인공간 일치 P0 QA

- 작성일: 2026-09-03
- 상태: `AUTHORING_TO_WORKSPACE_P0_AUTOMATION_CLOSED_WITH_BASELINE_FAILURE`
- 관찰 사용자: 0명

이 문서는 실행 전 검증 계약과 이전 단계의 최종 실행 기록을 함께 보존한다. §§3~9의
`pending`은 실행 전 표이며, 이 단계의 실제 결과는 §13이 우선한다. 이 기록을 후속 제품형
UX 변경의 fresh 결과로 재사용하지 않는다.

## 0. 2026-09-03 정합화

작성→개인공간 P0 자동화는 마감됐지만 세 결과물 전체의 제품 통합 완료는 아니다. 후속
[제품형 UX 패스 QA](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/qa.md)는 모든
실행 수를 0·미실행에서 다시 시작한다. 실제 Android/iOS·가상 키보드·screen reader·실제
200% zoom은 계속 미실행이고 관찰 사용자는 0명이다.

## 1. 증거 등급

| 등급 | 의미 |
| --- | --- |
| E0 | 구현·실행 증거 없음 |
| E1 | 정본·코드 또는 정적 구조만 확인 |
| E2 | 순수 모델·component 테스트 |
| E3 | 현재 브라우저 실행·geometry·화면 캡처 |
| E4 | 정상·실패·복구·저장 불변을 포함한 end-to-end 실행 |

`requirements.md`의 최종 판정은 필요한 등급을 충족한 fresh 실행 뒤에만 갱신한다.

## 2. 테스트 우선 결함 기준선

구현 전 다음 결함을 재현하고 실패 assertion으로 고정한다.

1. 독립 HTML이 `1 작성 / 2 구조 확인 / 3 저장`과 일반 source 확인 checkbox를 요구한다.
2. 독립 HTML의 one-editor owner 경계, 전역 `입력 예시`, 선택형 review가 React 핵심
   여정과 일치하지 않는다. React 전용 `순수 텍스트 / Flow 편집` 이름의 view toggle과
   문맥형 helper 자체는 독립 HTML P0 결함으로 잡지 않는다.
3. 독립 HTML template Undo가 browser native history가 아닌 별도 `templateEditHistory`에
   의존한다.
4. React template 화면에서 `#` 외 `##`, `- [ ]`, 지원 property의 빈 값 ghost가 실제로
   보이지 않는 상태를 재현한다.
5. 320×700에서 sticky primary와 editor 사각형이 겹치는 상태를 재현한다.

기존 화면 증거:

- `docs/content-audit/2026-09-02-flowme-integrated-poc-stage-2-runtime-assets/authoring-320x700.png`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-stage-2-runtime-assets/authoring-390x844.png`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-stage-2-runtime-assets/authoring-844x390.png`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-stage-2-runtime-assets/authoring-1024x768.png`
- `docs/content-audit/2026-09-02-flowme-integrated-poc-stage-2-runtime-assets/authoring-1440x900.png`
- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-validation-report-assets/after-authoring-390x844.png`
- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-validation-report-assets/after-authoring-844x390.png`

## 3. 순수 모델·component 검증

| ID | 시나리오 | 합격 조건 | 결과 |
| --- | --- | --- | --- |
| QA-M01 | six-template catalog parity | React·독립 HTML label·description·example·scaffold·firstBlankValue가 byte-identical | pending |
| QA-M02 | blank scaffold parse | `# `, `## `, `- [ ] `, `  - [ ] `, 빈 property가 canonical 객체·blocking issue 0 | pending |
| QA-M03 | partial parse | 일부만 채웠을 때 값 있는 형제만 같은 identity로 materialize | pending |
| QA-M04 | ghost descriptor | 모든 recognized blank value에 정확한 한 ghost descriptor, pure text에서는 0 | pending |
| QA-M05 | ghost presentation only | ghost가 source·clipboard·selection·scroll·revision·dispatch·draft·history에 영향 0 | pending |
| QA-M06 | template transaction | apply 1회, first blank caret, Undo 1회 이전 bytes, Redo 1회 scaffold bytes | pending |
| QA-M07 | template guards | browse/cancel/non-empty/stale owner·document·source·dispatch/composing/double apply mutation 0 | pending |
| QA-M08 | optional review | 정상 source는 review 없이 result/save preflight, issue source만 launcher count 증가 | pending |
| QA-M09 | stable handoff identity | 동일 source·revision retry는 동일 handoff id이고 개인 Flow 추가 0 | pending |
| QA-M10 | atomic state+draft | 성공은 state target과 draft cleanup이 함께 반영되고 late failure는 두 bytes 모두 복구 | pending |
| QA-M11 | corrupted recovery | malformed draft/state는 operating write 없이 fail-closed | pending |

## 4. React 브라우저 시나리오

| ID | 조작 | 합격 조건 | 결과 |
| --- | --- | --- | --- |
| QA-R01 | 빈 원문에서 여섯 틀을 각각 열고 선택 | 각 picker에 구조명·용도·example 표시, 같은 editor exact scaffold, first blank focus | pending |
| QA-R02 | template 뒤 `입력 예시` 켜기 | 모든 빈 heading·Item·subcheck·property 예시가 보이고 source copy에는 없음 | pending |
| QA-R03 | `순수 텍스트 -> Flow 편집 -> 순수 텍스트` | raw bytes·selection direction·scroll·native history·result identity 동일 | pending |
| QA-R04 | 정상 일반 메모 작성 | 구조 review·checkbox 없이 `결과 보기 · N개`와 save preflight 도달 | pending |
| QA-R05 | invalid date/timezone 작성 | 보존 가능한 결과, issue count, exact source value 선택, 저장 0 | pending |
| QA-R06 | helper와 review keyboard 조작 | Enter/Space open, Tab 순서, Escape close, opener/source line focus return | pending |
| QA-R07 | IME·stale·double apply | composing Enter와 stale/double action의 source·draft·workspace mutation 0 | pending |
| QA-R08 | 명시 저장 | personal Flow 1개·lineage·folder·receipt를 만들고 `개인공간에서 열기` 제공 | pending |
| QA-R09 | 저장 후 연결 | 상세→개인 편집→기간 보기→reload에서 같은 Flow·Item ref와 마지막 성공 상태 | pending |
| QA-R10 | Undo·failure | 성공 Undo가 이전 workspace와 exact draft를 복구하고 저장 실패는 성공 표시 0 | pending |

## 5. 독립 HTML 브라우저 시나리오

| ID | 조작 | 합격 조건 | 결과 |
| --- | --- | --- | --- |
| QA-S01 | 작성 첫 화면 열기 | compact에서 `입력 / 결과` 두 상태만 있고 강제 3단계·일반 확인 checkbox 0 | pending |
| QA-S02 | desktop 작성 화면 열기 | 원문·실제 결과 2-pane, 빈 세 번째 열·상시 structure pane 0 | pending |
| QA-S03 | six-template·ghost | React와 byte-identical catalog, 전체 빈칸 ghost, 같은 toggle label | pending |
| QA-S04 | native Undo/Redo | template 1 transaction, Undo/Redo exact bytes, 별도 manual history owner 0 | pending |
| QA-S05 | 선택형 review | 정상 source는 바로 결과, issue source만 non-modal panel, close 뒤 focus return | pending |
| QA-S06 | stable save retry | 첫 저장 Flow 1개, 동일 retry 추가 0, 같은 receipt identity | pending |
| QA-S07 | late failure·reload | state+draft exact rollback, draft recovery, malformed payload fail-closed | pending |
| QA-S08 | 개인공간 인계 | `개인공간에서 열기` 뒤 상세·편집·기간·reload가 같은 Item ref를 사용 | pending |
| QA-S09 | 단일 파일 parity | 일반 HTML과 Android 단일 HTML의 embedded module/style·hash가 동일 | pending |

## 6. React·독립 HTML parity 판정

각 행은 양쪽 E2E의 구조화 결과를 직접 비교한다.

| 비교 항목 | 합격 조건 | 결과 |
| --- | --- | --- |
| visible stages | compact `입력 / 결과` 두 상태 | pending |
| primary copy | `결과 보기 · N개`, `개인 Flow로 저장`, `개인공간에서 열기` 의미 일치 | pending |
| optional review | 정상 0회, issue 또는 명시 요청 때만 1개 panel | pending |
| template | six scaffold/example/first caret exact parity | pending |
| ghost | recognized blank set·text·visibility·toggle parity | pending |
| no-op | browse/cancel/Escape/non-empty/stale/composing/double apply mutation 0 | pending |
| receipt | Flow/item count, source fingerprint, destination ref, Undo 의미 일치 | pending |
| fixture boundary | 독립 HTML은 fixture-only임을 표시하고 live origin 증거로 표현하지 않음 | pending |

## 7. viewport·geometry·오류 검사

| viewport/환경 | 필수 검사 | 결과 |
| --- | --- | --- |
| 320×700 | editor와 sticky CTA rect 교차 0, 마지막 입력 줄 접근, 16px input, 48px target, overflow 0 | pending |
| 375×812 | compact 2-state, picker·review 독립 scroll, 첫 과업과 local primary 가림 0 | pending |
| 390×844 | template 전체 ghost, 양쪽 review와 React helper focus return, safe-area와 CTA 가림 0 | pending |
| 844×390 | 한 줄 header, active panel 내부 scroll, 마지막 menu·닫기·primary 접근 | pending |
| 1024×768 | input/result 2-pane, independent scroll, right review drawer, nested modal 0 | pending |
| 1440×900 | 40~44/56~60% 2-pane, 빈 세 번째 열 0, result/preflight 우선순위 | pending |
| 200% 등가 reflow | line guide·wrapped text·ghost·menu·CTA 겹침 및 수평 overflow 0 | pending |
| reduced motion | 의미 없는 전환 제거, 상태와 focus 결과 동일 | pending |

각 browser run에서 다음 값을 별도로 기록한다.

- document-level horizontal overflow
- console error와 warning
- page error
- failed internal request
- replacement character
- editor/CTA와 overlay/action의 rect 교차
- 가려진 핵심 행동 수

## 8. 저장 불변 시나리오

테스트 시작 전에 운영 `flow:*` key/value를 byte snapshot으로 저장하고 각 정상·실패·복구
시나리오 뒤 비교한다.

| 시나리오 | PoC target mutation | 운영 mutation | 결과 |
| --- | ---: | ---: | --- |
| input·parse·preview·view/ghost toggle | draft 최대 1 또는 0 | 0 | pending |
| picker/review browse·cancel·Escape와 React helper browse·cancel·Escape | 0 | 0 | pending |
| non-empty·stale·IME·double·invalid apply | 0 | 0 | pending |
| personal Flow 성공 | state target 1 + draft cleanup 1 transaction | 0 | pending |
| 동일 handoff retry | 0 | 0 | pending |
| late storage failure | 성공 mutation 0, 이전 bytes 복구 | 0 | pending |
| Undo | 이전 state+draft snapshot 1회 복구 | 0 | pending |
| malformed recovery payload | 0, fail-closed | 0 | pending |

합격 기준:

- 허용 prefix 밖 `setItem` 0
- 허용 prefix 밖 `removeItem` 0
- `localStorage.clear()` 0
- 기존 운영 `flow:*` key/value 전후 byte-for-byte 동일
- 기존 completion·memo·date·archive·export writer 호출 0

## 9. 회귀·빌드·문서 검사 기록

| 실행 | 실제 실행 수 | 통과 | 실패 | 상태·비고 |
| --- | ---: | ---: | ---: | --- |
| focused model/component | pending | pending | pending | pending |
| standalone node | pending | pending | pending | pending |
| React authoring E2E | pending | pending | pending | pending |
| standalone authoring E2E | pending | pending | pending | pending |
| integrated end-to-end | pending | pending | pending | pending |
| 전체 `npm test` | pending | pending | pending | 기존 `seed-flows` review_due 실패를 별도 기록 |
| production build | pending | pending | pending | 생성 route 수 기록 |
| docs check | pending | pending | pending | required file·local link 수 기록 |
| `git diff --check` | pending | pending | pending | whitespace 오류 수 기록 |

전체 테스트가 기존 콘텐츠 신선도 1건 때문에 실패하면 `PASS`로 표현하지 않는다. 관련 PoC
검증 결과와 기준선 실패의 owner·범위를 분리한다.

## 10. 자동화와 분리할 미실행 증거

| 증거 | 현재 상태 | 완료 주장에 사용하는가 |
| --- | --- | --- |
| Android Chrome 실제 기기 | 미실행 | 아니오 |
| iOS Safari 실제 기기 | 미실행 | 아니오 |
| 실제 모바일 가상 키보드 | 미실행 | 아니오 |
| screen reader 실기 | 미실행 | 아니오 |
| 실제 browser 200% text zoom | 미실행 | 아니오 |
| 관찰 사용자 | 0명 | 아니오 |
| commit·push·PR | 미진행 | 아니오 |
| Preview·Production | 미진행 | 아니오 |

Playwright touch emulation, visualViewport proxy, CDP DPR, 화면 캡처는 실제 기기·실제 text
zoom·보조기술·관찰 사용자 검증으로 표현하지 않는다.

## 11. P1·제품 결정 제외

다음이 미완이어도 이번 P0를 완료할 수 있지만 해당 상위 요구를 `충족`으로 올리지 않는다.

- Sheet·복사용 TXT 전체 authoring projection
- full property catalog와 inline/native picker
- rendered property 재진입과 near-miss 문법 복구
- recursive StructureDraft/compiler
- CreatorDraft library/search/clone/archive
- source reverse edit
- 독립 HTML 문맥형 `+` helper와 React menu parity
- recurrence occurrence, table/source update, public candidate, AI, cloud·외부 동기화
- 운영 navigation/token, route/store/schema, migration, writer owner 확정

## 12. 최종 Exit gate

- [ ] `requirements.md`의 P0 행에 fresh evidence가 연결되고 최종 판정이 갱신됐다.
- [x] React와 독립 HTML의 one-editor·2-state·optional review·template·ghost·handoff가 같다.
      React 전용 view toggle과 문맥형 helper parity는 이 gate에 포함하지 않는다.
- [x] 모든 recognized blank ghost가 보이며 source·clipboard·selection·history에는 들어가지 않는다.
- [x] 작성→저장→개인공간 상세→개인 편집→기간→reload가 양쪽에서 통과한다.
- [x] 취소·stale·IME·중복·오류의 성공 mutation은 0이다.
- [x] 여섯 viewport와 자동 200% 등가 reflow의 overflow·error·핵심 행동 가림이 0이다.
      실제 browser 200% text zoom은 미실행이다.
- [x] 운영 storage와 writer 불변 증거가 있다.
- [x] 자동화·실제 기기·보조기술·관찰 사용자·게시 상태가 분리됐다.
- [x] P1·제품 결정 제외 항목을 완료로 과장하지 않았다.

## 13. 최종 자동 실행 기록

| 실행 | 실제 실행 수 | 통과 | 실패 | 현재 해석 |
| --- | ---: | ---: | ---: | --- |
| React 신규 계약 테스트 | 23 | 23 | 0 | 구현 전 3개 실패를 고정한 뒤 모두 통과 |
| personal-workspace model/component | 256 | 256 | 0 | 현재 React 변경과 기존 PoC 회귀 |
| React Stage 2 Chromium | 11 | 11 | 0 | 320×700 포함 여섯 viewport |
| standalone node | 39 | 39 | 0 | catalog·ghost hints·identity·rollback 포함 |
| standalone 전체 Chromium | 21 | 21 | 0 | 여섯 viewport, 10 ghost, native Undo, atomic save·retry 포함 |
| cross-surface parity | 2 | 2 | 0 | 양쪽 핵심 authoring contract 직접 비교 |
| 통합 end-to-end | 3 | 3 | 0 | 작성→개인공간 상세·편집·기간·reload |
| 최종 product browser 합계 | 37 | 37 | 0 | 2 + 21 + 3 + 11 |
| production build | 18 routes | 18 | 0 | 최종 React·standalone 변경 반영 |
| 요구 추적 HTML Chromium | 2 | 2 | 0 | 데이터·필터·저장 0과 필수 viewport 검증 |

제품 자동 검증은 위 수치로 마감했다. 아래 closeout 상태만 root가 최종 기록한다.

- 전체 `npm test`: `1520/1521`; 기존 `dog-adoption-first-week:review_due:2026-06-04` freshness 1건으로 실패·중단, 뒤 단계 미실행
- docs check: `PASS - 16 required files, 4,588/4,588 local links`
- diff check: `PASS`
