# K3-C C3 — PoC 로컬 UI 정합 설계

상태: **root 검토 후 C3 구현 범위 승인·실제 baseline 검사 착수**. §1–10은 독립 읽기 검토 당시 기록이다. C2의 최종 A59CFCCA/PK9 결과는 [C2 QA](./k3c-c2-source-practice-entry-qa.md)에 분리했다. 이번 승인은 전체 coverage 판정 변경이나 운영 테마 수정이 아니다.

## 1. 목적과 보호 범위

이미 승인된 흰 본문·회색 탐색·청록 행동을 PoC 내부의 실제 버튼·선택·초점에 연결한다. 크기가 작은 핵심 조작을 보강하고 같은 편집기를 여는 중복 진입과 내부 구현 설명을 줄인다. 새 화면 체계나 전역 브랜드를 선택하는 작업이 아니다.

- React 범위는 정확한 `/my?personalWorkspacePoc=v1` 및 승인된 `/flows/new?personalWorkspacePoc=v1` 분기다. `app/my/page.tsx:36`, `app/flows/new/page.tsx:34`의 gate는 그대로 둔다.
- `app/globals.css`, `PlatformNav`, 기본 `/my`, 공유 컴포넌트의 기본 표현·운영 writer·schema는 변경하지 않는다. 전역 cobalt와 로컬 teal은 다른 소유자다.
- standalone은 격리 HTML의 로컬 content·editor·result·entry·비교 영역만 대상으로 한다. 외부 탐색 기능, 상단 탐색의 의미·history, 저장 정책은 바꾸지 않는다.
- source / 개인 계획 / 실행의 구획, source 부재·손상·지원 불가, 실패·recovery·stale 사유, 위험 행동, 접근성 이름은 유지한다. 감산 때문에 저장 또는 복구 권한을 바꾸지 않는다.
- 기존 원문 편집 DOM·selection·native Undo, Plan→Item staging, 단일 최종 저장, 현재 receipt/Undo owner, C1 retained 방문·복귀, C2 비교 결정은 보호 대상이다.

정본: [실행 계획 §10 C3](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §7.3 S-LOCAL·§9](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md). 연결 finding은 `K-D1-07/08`, `P3K-V41-03/04`, `P3K-D2-06`이다. 기존 finding의 역사 판정을 이 문서만으로 승격하지 않는다.

## 2. 세 원본과 후속 승인 구분

아래 외부 checkout 경로는 실제 읽은 로컬 파일이다. 원본 대화 전체나 원본 앱 전체를 다시 검사했다는 뜻은 아니다. 줄 번호는 이 조사 시점 기준이며 구현 직전 함수·절 제목도 함께 확인한다.

| 요구 | 원본 근거 | 이번 적용과 해석 제한 |
| --- | --- | --- |
| v4.1 흰 본문·평면 실행 목록·회색 탐색·청록 강조 | `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md:5` | 목록·기간·폴더·완료의 실행 중심을 유지한다. 카드·큰 CTA를 추가해 해결하지 않는다. |
| 전용 손잡이와 이동 창의 모바일 48px, 비드래그 대안 | 같은 spec:9–11. 원본 HTML이 연결하는 `2026-09-01-flowme-personal-workspace-v4-1-assets/style.css:15,18,19` | 행의 스크롤 영역과 350ms/8px 취소, 오른쪽 이동 통로를 보존한다. 높이만 48px인 좁은 버튼을 48×48로 판정하지 않는다. |
| 개발1 동일 Plan/Item 편집·취소·focus | `D:/flowme2605/flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md:11,21–25,40` | 개인 계획 editor는 한 경로로 연결한다. Item `계획에 반영`과 Plan 최종 저장은 서로 다른 행동이므로 합치지 않는다. |
| 개발1 중복 수정 진입 금지 | 같은 spec:40, acceptance 7 | 보이는 편집과 관리 메뉴의 같은 편집을 반복하지 않는다. 폴더 이동·실행 완료·원문 보기는 편집과 다른 권한이므로 남긴다. |
| 개발1 조작 크기·위계 | `D:/flowme2605/flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:446,528`의 mock control 최소 높이 48px. `D:/flowme2605/flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-12-public-plan-edit-surface-unification/spec.md:137`의 48px·focus·clipping 검사 | 시나리오 HTML의 모형 크기는 현재 제품 통과 증거가 아니다. D1 모형은 시나리오별 accent가 다르므로 그 파일만으로 모든 UI가 청록이라고 주장하지 않는다. |
| 개발2 하나의 원문 편집기·선택 보존 | `D:/flowme2605/flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md:5,22,41–45,92–103` | 별도 작성 폼/새 저장 단계 없이 같은 편집기를 유지한다. 원본은 웹 최소 44px·모바일 목표 48px를 구분했다. 과거 44px 통과를 소급 실패나 48px 통과로 바꾸지 않는다. |
| 개발2 필요한 선택만 단계적으로 노출 | `D:/flowme2605/flow-text-authoring-flow-view-poc-20260824/docs/specs/2026-08-26-flowme-text-authoring-contextual-item-palette/spec.md`의 Goal/Design Decisions/Acceptance | 구조→항목 정보→네 그룹→속성→값의 현재 K3-A를 유지한다. `aria-disabled`와 사유가 있는 미지원 속성을 지우거나 활성화하지 않는다. |
| 후속 승인: 로컬 primary·focus 청록 | [제품 UX 계약](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md):17–19,38–41,52–65,145–148. [P3-F 계약](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md):16,47–53 | 전역 ink/cobalt·PlatformNav와 exact-query white/gray/teal을 분리한다. 현재 `.localMain` 주석이 전역 action/focus를 그대로 상속하게 하는 것은 이 후속 승인을 대체하지 않는다. |

원본 v4.1 CSS:1은 accent `#087f73`, focus `#1268b1`이다. 따라서 **초점을 청록으로 연결하는 근거는 v4.1 원본 CSS 자체가 아니라 이후 승인된 제품 UX·C3 계약**이다. 이 차이를 명시하며 원본 색상값을 임의로 동일하게 인용하지 않는다.

## 3. 현재 소비자와 가장 작은 연결

경로 약칭: `R/`는 `components/flow/personal-workspace-poc/`, `A/`는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/`이다. 모두 현재 repo 안의 경로다.

### 3.1 색상과 초점

| 소비자·위치 | 현재 코드 근거 | 최소 연결 |
| --- | --- | --- |
| `R/PersonalWorkspacePocProductShell.module.css:36` | `.localMain`에 workspace accent/strong/soft/border·rail만 있고 action/focus는 전역 상속. 전역 `app/globals.css:17–22`는 action `#315ee7`, focus `#2145ba` | local-content에만 로컬 action/hover/strong/soft/border/focus 매핑을 둔다. `.productShell`이나 `:root`에 두지 않는다. |
| `R/PersonalWorkspacePocProductShell.tsx:411–425` | `PlatformNav`는 global-navigation 자식, `<main>`은 별도 local-content 형제 | local-content 아래 소비자만 바뀌도록 경계로 사용한다. 전역 nav 파일·클래스·computed style 불변을 별도 검사한다. |
| `R/PersonalWorkspacePocSurface.tsx:337–339` | primary·secondary 텍스트·focus가 `--flowme-action/--flowme-focus` 소비. 목록 선택은 5846,5863의 workspace teal | 새 CTA 클래스를 대량 복제하지 않고 로컬 의미표를 통해 연결한다. 회색 secondary 배경/경계와 selected 상태의 차이를 유지한다. |
| `R/PersonalWorkspacePocAuthoringSurface.tsx:257–259,3313,3619` | 작성 primary·focus는 전역 변수, 입력/결과 tab:3741–3742는 workspace 변수, 일부 chooser는 직접 teal 클래스 | 원문을 remount하거나 `key`/effects를 바꾸지 않고 style 소비만 정렬한다. sticky CTA 관찰·current frame guard는 변경하지 않는다. |
| `R/PersonalWorkspacePocEditorSurface.tsx:585,628,842,884` | 공유 `FlowEditorSurface`를 사용하며 `enforce48pxTargets`는 이미 전달 | 공유 `components/flow/flow-ui.ts`를 수정하지 않고 로컬 상속으로 연결한다. 공유 danger/disabled 변수는 덮지 않는다. |
| `R/PersonalWorkspacePocPlanResultSurface.tsx:9`, `R/PersonalWorkspacePocSourceUpdateReview.tsx:92–94,495` | 저장 결과·비교 primary/선택/focus가 전역 변수 | 결과·비교도 같은 local-content 안에 있는지 확인하고 연결한다. 기본 presenter 계약은 보존한다. |
| `R/PersonalWorkspacePocEntryPreview.tsx:9`, `R/PersonalWorkspacePocResultPresenter.tsx:681`, CreatorDraftLibrary:71 | 직접 `teal-700/900`과 slate 클래스가 섞임 | 기존 의미를 유지하며 실제 computed 색과 outline을 측정한다. 이름이 teal이라는 이유만으로 최종 팔레트 일치를 주장하지 않는다. |
| `A/style.css:10–19,529,545–548` | `--blue`는 이미 `#087f73`; primary는 청록. 마지막 `:focus-visible`은 `#1268b1` | 독립 HTML의 이름만 보고 blue를 전역 cobalt로 오인하지 않는다. 검토 대상 로컬 영역의 마지막 focus rule을 승인 청록으로 연결한다. 위험·경고 색과 본문 contrast는 따로 유지한다. |

권장 매핑은 현재 workspace의 accent `#087f73`, strong `#066a61`, soft `#e5f2ef`, border `#b8dcd6`를 재사용하는 것이다. hover/focus도 이미 있는 강한 청록 역할로 연결하되 최종 소비 색은 CSS 적용 후 확인한다. 새 전역 팔레트는 만들지 않는다.

공유 primitive를 사용하는 로컬 자손에는 `.localMain` 안에서 기존 action 변수명을 **로컬 값의 alias로 제한**하는 방법이 가장 작다. 변수 이름이 전역과 같더라도 선언 범위가 local-content에만 있어야 한다. warning/danger/positive/disabled 값은 alias 대상이 아니다. 현재 `FlowBottomSheet`는 `components/flow/FlowExecutionPrimitives.tsx:515`에서 inline 자손으로 반환한다. 후속 portal 추가 시 body로 이탈하는 소비자를 별도 확인해야 하며 body 전체 재색칠로 해결하지 않는다.

### 3.2 크기와 실제 hit 영역

| 현재 위치 | 확인한 차이 | 최소 변경·주의 |
| --- | --- | --- |
| `A/style.css:35,545,548,585`, `A/personal-entry-ui.js:21` | entry/일반 버튼 44px, icon 44×44, 완료 target 44×48. 좁은 화면 완료 폭은 40 | 핵심 버튼의 실제 클릭 box에 `min-height/min-width:48px`를 적용한다. 체크의 시각 glyph는 20px로 유지 가능하다. pseudo element·빈 padding만 커지고 hit target이 그대로인 안은 불합격이다. |
| `A/style.css:1608,1624,1632,1635` | contextual Undo/Plan 결과 paging/order/entry author actions에 44px override | 공통 최소값만 바꿔도 후단 override가 되돌릴 수 있으므로 최종 cascade별 확인. 긴 label은 줄바꿈하고 클릭 면적·이웃 title 공간을 함께 검증한다. |
| `A/style.css:1389–1395,1435` | source 비교의 버튼·radio label·nav 44px, close 최소 폭44 | 비교 범위의 48px 목표를 보강한다. 첫/마지막 선택·취소/적용/error action을 실제 viewport에서 검사한다. 비교 값 자체를 줄이거나 스크롤 기능을 제거하지 않는다. |
| `R/PersonalWorkspacePocEntryPreview.tsx:9`, AuthoringSurface:3198,3414,3426 | `min-h-11`의 읽기 복귀·입구 관련 control | 실제 44px인지 새 baseline으로 측정한 뒤 로컬 control만 보강. 넓은 링크를 무조건 48px 폭으로 고정하지 않는다. |
| `R/PersonalWorkspacePocSourceUpdateReview.tsx:92,444,495,570` | action/nav/radio `min-h-11`, close `min-w-11` | practice 맥락 또는 PoC host의 좁은 selector로 높이·icon 폭을 보강한다. 컴포넌트 기본 표현을 사용하는 기존 12변형 SSR 계약을 먼저 보존한다. |
| `R/PersonalWorkspacePocSurface.tsx:6217,6312,6346` | move handle·완료·더보기는 이미 `min-h-12 min-w-12` | 누락 기능으로 다시 구현하지 않는다. CSS 상속 뒤 실제 rect·9점 hit·이동 통로·pointer/keyboard 회귀만 한다. |

48×48 목표를 적용할 첫 inventory는 C1 방문의 측정 control, 편집 저장/취소/버리기, 읽기 복귀, 이동 선택·취소, C2 비교 조작이다. 전역 nav를 확대하거나 모든 텍스트 링크를 같은 큰 버튼으로 바꾸는 정책은 포함하지 않는다. 본문 공간 부족은 버튼·글꼴을 다시 축소하는 이유가 아니다.

## 4. C1의 36건 재확인 — 역사 증거

first4 최종 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c2-standalone-detail-first4-final-20260906-01.json`)의 DV04 attachments 중 `detail-visit-boundary-{viewport}` body를 읽어 `points[].geometry`에서 heading만 제외하고 재집계했다. 새 브라우저 실행이 아니다.

| viewport | 조작 측정 수 | 48×48 미달 | 통과한 표본 |
| --- | ---: | ---: | --- |
| 390×844 | 8 | 6 | menu·cancel 각48×48 |
| 375×812 | 8 | 6 | menu·cancel 각48×48 |
| 844×390 | 8 | 8 | 없음 |
| 1024×768 | 8 | 8 | 없음 |
| 1440×900 | 8 | 8 | 없음 |
| 합계 | 40 | 36 | 4건 |

표본 라벨은 `return / Plan edit / complete / menu / cancel / Undo / return-after-Undo / read-gate-close` 여덟 개다. `return`과 `return-after-Undo`는 같은 종류 버튼의 다른 상태 측정이다. **36개 고유 control, 36개 신규 실패 시험, 모든 화면의 버튼 전수조사라고 표현하지 않는다.** heading5건은 조작 count에서 제외했다.

- return·Plan edit·Undo·read-gate-close 높이는 다섯 화면 모두44px였다.
- 완료 target은 390/375에서40×48, 나머지에서44×48이었다. 높이48만으로는 목표 미충족이다.
- menu는 844에서44×48, 1024/1440에서44×44였다. cancel은 844/1024/1440에서44×44였다.
- 40건 모두 당시 full rect·9/9 hit와 기존 **높이44px** floor를 통과했다. 그 시험은 width≥44를 요구하지 않았다. 현재 `personal-workspace-k3c-standalone-detail-visit.spec.ts:143–160`의 geometry도 확인했다.
- 당시 app `A3D7AE408A645F4DA01C1B4A5DE14631D17988612F498B0CF48F96D0607A71CE`, style `010CB37033C5C3C2D2AE97C3D0FCAE649039E7A4C59333C6AF28751010E862CE`, memory HTML `3AE6C53EE6128605547471C9DF3708C3642673FB025190A1512ADE7AB4105BC2` /1,905,234 bytes다. 사용자 HTML은 `CD6FC427…`으로 보존한 당시 검사다. 현재 C2 후보에 이 값을 덮어 쓰지 않는다.
- 최초375 실패는 document root를 일반 ancestor로 중복 clip한 하니스 오류였다. root 중복만 제외한 focused→first4 재실행 기록은 [기존 QA](k3c-c1-detail-visit-qa.md)에 남아 있다. 이 보정과 48px 미달은 다른 사안이다.

이번에 직접 다시 본 PNG는 두 개다.

1. 390×844 Undo (로컬 전용 근거: `../../../output/playwright/c1c2-standalone-detail-first4-final-20260906-01/personal-workspace-k3c-sta-6f6e0-ol의-full-rect와-9점·키보드를-확인한다/attachments/dv04-390x844-Undo-e7d3febd21ee19cf730df64aa316e7024499dee5.png`): contextual Undo는 보이고 title과 분리되어 있다. 상단 가로 탐색의 끝은 좁고, 전역/로컬 탐색과 방문 복귀가 여러 줄을 차지한다. 이것만으로 nav 기능 삭제를 승인하지 않는다.
2. 844×390 이동 취소 뒤 (로컬 전용 근거: `../../../output/playwright/c1c2-standalone-detail-first4-final-20260906-01/personal-workspace-k3c-sta-6f6e0-ol의-full-rect와-9점·키보드를-확인한다/attachments/dv04-844x390-detail-cancel-bd85e2621a514938124896a8ab52743195005c7d.png`): 실행 행·취소 후 더보기 focus가 보이고 아래 결과의 기술 제목·Plan 편집 진입이 이어진다. 파란 focus는 당시 실제 시각 증거다. 스크롤 위치의 한 화면이지 모든 조작 동시 노출 증거가 아니다.

실제 Android/iOS·화면 키보드·보조기술·사용자 관찰은 이 자료로 검증하지 않았다.

## 5. 같은 editor 진입과 기술 문구 감산

### 5.1 상세의 확정 중복

`A/app.js:3399`의 상세 toolbar `개인 편집`과 `:3099`의 결과 header `Plan 편집`은 모두 `data-action="open-plan-editor"`와 같은 `flow.id`를 보낸다. `:5762`는 둘 다 `openPlanEditor(flowById(control.dataset.id), control)`로 처리한다. 서로 다른 owner나 편집 내용이 아니다.

최소안은 상세 toolbar의 개인 편집을 남기고 결과 header의 같은 CTA만 제거하는 것이다. 결과는 제목·탭·원문 disclosure를 유지한다. 최종 저장/취소/Undo focus는 살아 있는 해당 Flow의 편집 opener로 돌아가야 하며, 하단 CTA의 인덱스에 묶인 selector를 그대로 두지 않는다. C1 읽기 전용 preview의 writer0 계약에 새 편집 CTA를 넣지 않는다.

React `Surface.tsx:5481`은 `MyPlanExecutionSurface`의 `my-plan-edit` 하나를 연결하고 관리 renderer:5490은 폴더 이동이다. `components/flow/my-flow/MyPlanExecutionSurface.tsx:152`의 수정과 Item 상세/결과 Item 열기는 같은 action이 아니다. React에 standalone과 같은 중복이 있다고 단정해 shared 메뉴를 삭제하지 않는다.

### 5.2 내용은 보존하고 표현만 정리

`A/app.js:3099` 기본 제목 `원본 Item과 실행 회차, 네 결과`, `회차 식별자`, disclosure `WorkingSource 확인`과 본문 `개인 shadow`는 사용자의 다음 선택보다 구현 구조를 먼저 드러낸다.

- 제안: 기본 제목은 `다른 방식으로 보기`, 원문 disclosure는 `원문 보기`처럼 목적을 표현한다. 원문과 개인 수정의 차이는 `개인 편집은 원문을 바꾸지 않아요.`처럼 짧게 남긴다. 최종 copy는 C3 구현 diff에서 다시 검토한다.
- 내부 row/ref/hash·manifest는 data attribute·모델·시험에서 보존한다. 기술 용어를 감춘다는 이유로 occurrence identity, Sheet의 회차/시간 열, export bytes를 제거하지 않는다.
- `A/app.js:3390`의 실행 정렬과 전체 Plan 순서 차이는 실제 기능 차이다. 긴 구현 설명은 줄일 수 있지만 `실행 목록`과 Plan 전체순서의 의미를 하나로 합치거나 global order를 Step별 실행 writer에 몰래 연결하지 않는다.
- Plan 변경 field 수·Flow/Item 영향 수, 날짜·시간·경로, 완료 상태는 서로 다른 사실이다. 숫자가 두 번 보인다는 이유만으로 삭제하지 않는다.
- 위/아래 취소, skip-to-actions, dirty confirmation의 계속 편집은 접근 위치·손실 범위가 다르다. 같은 문구라는 이유만으로 없애지 않는다.

## 6. C2 첫 실행과 비교 기록의 중복 평가

[C2 설계 §4–5](k3c-c2-source-practice-entry-design.md)를 기준으로 현재 코드를 읽었다. 이 절은 새 C2 브라우저 PASS를 주장하지 않는다.

| 상태 | 현재 소비자와 판정 | C3 최소안·보호 |
| --- | --- | --- |
| 새 Flow·기존 비교 없음 | React `Surface.tsx:5400`은 candidates가 있을 때만 목록, `:5425`는 선택 envelope가 있을 때만 presenter. standalone `renderSourceUpdateBanner:3316`은 기존 조회로 기록을 구성하고 없으면 빈 표시 | 자동 생성 제거는 C2 기능이다. C3에서 새 시작 배너를 보충하지 않는다. 첫 화면의 제목·진행·실행 Item을 유지한다. |
| 사용 안내 | React 설정 details:5744, standalone `openGuide:5225`의 명시 시작. standalone CSS:1640–1644는 topbar 안내가 숨는 크기에서만 local 관리 진입 제공 | 명시 시작과 기존 기록 이어가기는 다른 일이다. 화면에서 동시에 같은 안내 opener가 보이는지 검증하되 모바일 유일 진입을 삭제하지 않는다. |
| 기존 여러 기록 | React:5401–5422는 exact candidate ID별 행과 실제 source Undo. standalone:3326–3329는 unapplied record별 `비교 N 이어가기` | 후보 수·ID를 유지한다. 자동 최신 선택·기록 합치기·삭제·defer durable 저장을 만들지 않는다. 선택되지 않은 후보로 현재 owner를 바꾸지 않는다. |
| 선택한 기록을 닫음 | React 목록의 candidate 버튼과 `SourceUpdateReview.tsx:348–396`의 `보관된 로컬 비교 · 결정 N/M` + `변경 확인`이 같은 review를 여는 중복이다. 목록 안내와 `sourceLabel/detectedAtLabel`도 로컬/비동기화 사실을 반복 | practice에서 선택 행 하나를 이어가기 진입으로 남기고 일반 닫힌 banner의 같은 CTA·반복 meta만 줄이는 안을 우선한다. presenter를 조건부 unmount해 opener/결정을 잃지 않는다. 필요하면 practice 한정 banner 표현 옵션을 사용하고 기본 presenter는 유지한다. |
| stale·실패·recovery | 현재 review/banner가 구체 사유와 재비교·재시도를 보유 | 정상 banner를 줄이더라도 실패 사유·보존된 선택·현재 원문 재비교 action·잠금은 항상 도달 가능하게 남긴다. 단일 announcement owner를 유지한다. 닫기/재열기로 stale가 풀리지 않는다. |
| applied | React의 목록은 applied 기록도 보여 주고 source Undo는 별도 exact owner 한 곳. standalone은 applied 상태와 unapplied 목록을 구분 | 적용 사실과 미검토 기록은 다른 정보다. 비교 횟수·결정 수를 하나의 모호한 숫자로 합치지 않는다. Plan/Quick/contextual Undo와 source Undo를 합치지 않는다. |

비교 창 안의 `변경 1/N`과 미결정 개수는 위치와 적용 가능성을 각각 설명하므로 단순 중복으로 지우지 않는다. 로컬 연습이라는 사실은 진입 설명과 비교 제목에 남기되 동일한 비동기화 설명을 badge·meta·문단마다 되풀이하지 않는 방향이다. Base/현재 원문/예시 원문 값과 개인 보정의 구분은 유지한다.

## 7. 오류·위험·비활성 예외

| 상태 | 표현 규칙 | 금지 |
| --- | --- | --- |
| primary/selected/focus | 로컬 청록, 선택은 border·pressed/current 등 비색상 신호도 유지 | 색만으로 선택/성공/지원 여부 전달 |
| neutral secondary/no-op | 회색·흰 바탕의 보조 행동. 같은 값/취소는 기존 중립 피드백 | 크기를 키운 뒤 모두 primary로 승격, 새 성공/Undo 발급 |
| disabled·미지원 | 기존 native disabled 또는 설명 가능한 aria-disabled와 이유 유지. 터치 영역은 줄이지 않음 | opacity만 보고 활성 판단, CSS pointer-events로 실제 guard 대체 |
| danger·버리기·휴지통 | 기존 red/danger·손실 설명·확인 단계 유지 | 일괄 teal override로 위험 의미 소실, 접근성 이름 삭제 |
| failed/stale/recovery | 실패·현재 저장 사실·보존 초안·재시도/명시 재확인 구별, live owner 한 곳 | 안내를 technical disclosure 안으로 숨기기, 실패 후 현재 bytes 미확인인데 복구 완료라고 표시 |
| success/Undo | 기존 genuine attempt·receipt·source owner와 durable 사실 유지 | 보기 정리를 이유로 owner 갱신, 늦은 RAF 성공을 새 화면에 게시 |

## 8. 실행 순서와 검증 계획

아래 C3-L01–L08은 **계획 ID**다. 새 테스트 파일·등록·실행은 아직0이며 기존 C1/C2 시험과 합산하지 않는다.

1. C2 제품·runtime·사용자 HTML·React build를 먼저 동결한다. 다음 변경의 before backup과 source/build/userHTML 해시를 별도로 고정한다.
2. C3-a: local-content token 소비 연결. CSS 또는 scoped presentation만 변경하고 실제 computed/global 불변을 검증한다.
3. C3-b: 핵심 control inventory의 48px 보강. pointer·keyboard·scroll·native drag 범위를 함께 확인한다.
4. C3-c: standalone 동일 Plan CTA와 기술 문구, React practice의 닫힌 중복 banner만 감산한다. owner·실패·복귀 회귀 후 전체 기능 회귀를 수행한다.

| 계획 ID | 검사와 합격 경계 |
| --- | --- |
| L01 전역/로컬 분리 | default `/my`와 잘못된 query, 정확 PoC의 PlatformNav는 DOM·computed color·원본 파일 bytes 동일. local primary/hover/selected/focus는 승인 mapping과 일치. 변수 선언 존재나 클래스 이름만으로 PASS 금지. |
| L02 상태별 색·가독성 | normal/hover/focus/selected/disabled/danger/warning/failed를 각 실제 소비자에서 확인. foreground/background·outline 또는 ring의 computed 값과 대비 수치·글자 크기를 기록. 주관 가독성·자동 수치·보조기술 결과는 별개다. |
| L03 48px | 5뷰포트 390×844,375×812,844×390,1024×768,1440×900. width≥48 AND height≥48의 실제 clickable rect, viewport+실제 ancestor clipping,9점 hit 검사. 과거 높이44 floor는 보존하고 신규48 gate로 비교한다. 날짜 셀/손잡이와 이웃 행의 겹침도 확인. |
| L04 편집 진입 | 실제 동일 full Flow ref의 Plan opener가 한 군데 남고 같은 draft를 연다. child는 부모만 stage, dirty Back/Escape/버리기/저장실패 draft 보존, close·save·Undo 뒤 정확 살아 있는 opener/안정 fallback에 복귀. |
| L05 C1·작성 회귀 | 검색·preview·무변경 상세 왕복·취소0write, changed/ABA 뒤 옛 ticket 재활성0. 같은 textarea/selection/native Undo, helper success/failure와 explicit 새 작성/library drift 보호 유지. React route 복귀에 native Undo 새 보장 없음. |
| L06 C2 감산 | 기록없음·1개·복수·deferred·applied·stale·failed·recovery를 실제 모델로 생성. 명시 start 외 generator/stage0, 닫기/열기 결정 보존, record ID별 선택, source Undo1 owner, resolved/미해결 count exact, late events/ABA0권한·0쓰기. 기본 presenter 출력 보호와 practice 추가 표현을 분리. |
| L07 손실·원문·표시 | 기술 copy가 기본 낭독에서 빠져도 source absence/provenance/error는 남음. title/time/criteria/personal memo/occurrenceID/order·TXT/Todo/Calendar/Sheet/manifest/CSV unchanged. C1 readonly 결과에는 writer DOM0. |
| L08 실행·시각 evidence | 기존 native drag fresh→Undo-visible 재drag, 메뉴/longpress/AltArrow, 취소/동일위치/실패/Undo 및 readonly feedback slot 회귀. 각5뷰포트 fullPage:false PNG의 전후 owner/source/scroll 상태를 확인하고 직접 평가. 전체 npm/build·HTML생성·file·HTTP·실제기기는 별도 결과. |

브라우저는 fresh context, fixture/API/실제 byte mutation phase 분리, 운영 sentinel exact, prefix 외 쓰기·clear·console/page error0을 검사한다. 5뷰포트 반복 수와 고유 등록 수를 나눈다. 키보드 확대·safe-area 주입은 실제 모바일 기기나 실제 보조기술 검사로 표현하지 않는다. 기존 반환 DOM·sticky/scroll observer·C2 source lock을 테스트 편의상 꺼서 PASS시키지 않는다.

## 9. 현재 결정으로 진행 가능한 것과 K4

청록의 로컬 소유, 중복 Plan entry 정리, 핵심 48px 보강은 기존 승인으로 진행 가능한 기술·UI 범위다. 전역 테마를 다시 물을 필요는 없다. 구현 전 root 검토가 필요한 좁은 선택은 token alias의 정확 소비 목록, standalone에 남길 단일 Plan opener, practice 정상 banner를 줄이되 오류·opener를 보존하는 표현 경계다. 이는 새 저장 정책 결정이 아니다.

상단 local 탐색의 좁은 표시와 상세 복귀 여백은 관측된 감산 후보지만 이번에 navigation 의미를 삭제·이동하는 정책으로 확정하지 않는다. 클릭 가능한 다음 동작과 위치 정보가 유지되는지 별도 화면 검토 후 범위를 정한다. global navigation/CSS 수정이 필요하면 C3 제한 안에서 할 수 없음을 보고한다.

K4로 남길 것은 Plan 개인 기준일/원문 기준일/월 cursor/선택일 관계, 포함·제외·복원 membership, WorkingSource 날짜순 재배열 및 원본 완료 provenance처럼 owner·field·version의 의미가 필요한 작업이다. C3에서 `0개 제외` 표시, 새 날짜 default, source 순서 writer를 만들지 않는다. 이미 구현된 C1/C2·B2/B3 기능을 과거 제외 문구로 삭제하지도 않는다.

## 10. 조사 스냅샷·인계

이번에 확인한 현재 소스는 아래와 같다. 이 목록은 browser build 안의 hash 증거가 아니며 C2 병렬 작업의 최종 freeze를 대신하지 않는다.

| 파일 | SHA-256 |
| --- | --- |
| React Surface | `F45A09EDAF52B10C3A90F238238C54E5DC00DD3157308B3F2451B8A78603E963` |
| React SourceUpdateReview | `8B81E2416673BE9AC4F8D1DF92C7EED68FC34BC32149CBCCB3ABF9AE6A1FF390` |
| ProductShell.module.css | `D8B773F8B4B138F35C1617BFE9FD2364FD56B8F0D091549393FE3B2C9AC4F6F6` |
| standalone app.js | `EA4FD1CE5D771960AF992CA743721ACA03A2D5489A0D8C6A43306272DA70AC11` |
| standalone style.css | `891E9119DA841F2A8DEAED588BC3068592A2429F90E23BC8BA81FD772212D3B8` |

독립 검토 결론은 (1) 로컬 변수 존재만으로 action/focus 적합성이 충족되지 않음, (2) 역사 36건의 크기 미달은 실제 rect로 확인됨, (3) standalone 동일 Plan 진입과 React 선택된 비교의 닫힌 진입 중복을 좁게 줄일 수 있다는 것이다. source·안전·실패·보존 초안을 감추는 안은 채택하지 않는다.

`figma-ux-ui-design`을 저장소 근거 설계 방식으로 적용했고 `flow-ux-review`의 감산·한 맥락 한 주 행동·안전 안내 보존 원칙으로 범위를 좁혔다. Figma **NOT_USED**. 새 문서 한 파일 외 제품·기존 시험·기존 보고서·HTML 변경0, 새 test/browser/build/실기 실행0, commit/push/PR/deploy0, 관찰 사용자0이다.

## 11. root 구현 범위 승인 — 2026-09-06

root는 이 설계 전문, v4.1 원본 상호작용, 후속 제품 UX 계약의 청록 primary/focus, 현재 CSS·실제 비교 화면5장을 대조했다. 정한 C2 검사를 마친 후보를 exact before로 고정하고 C3-a→b→c를 진행한다. baseline과 이후 판정은 새 C3 QA에 기록하며 과거40측정/36미달을 덮지 않는다.

- React는 `.localMain`에만 action/hover/strong/soft/border/focus를 기존 workspace 값으로 연결한다. global-navigation은 형제이며 전역 파일·전역 스타일·기본 `/my`를 바꾸지 않는다. 기존 shell test의 ‘로컬에서도 action/focus 재선언 금지’는 후속 승인과 충돌하므로 그 assertion만 새 경계로 바꾸고 exact before를 보존한다.
- 실제 소비자 확인 뒤 `surface-selected`와 `focus-outline`도 같은 로컬 경계에 연결했다. 전역에서 계산된 outline 값을 그대로 상속하면 focus 색 alias만 바꿔도 파란 outline이 남을 수 있다. 전역 선언 자체는 수정하지 않는다.
- 48×48은 실제 local 핵심 control inventory에 적용한다. 전역 nav·모든 텍스트 링크·달력의 날짜 칸을 일괄 확대하는 광역 selector는 쓰지 않는다. 날짜 그리드나 편집기 DOM/selection을 크기 검사 편의상 바꾸지 않는다. radio는 작은 원 대신 실제 label 클릭 영역을 측정한다.
- standalone 상세 toolbar의 `개인 편집`을 남기고 동일 flow.id·동일 editor를 여는 결과 header의 `Plan 편집`만 제거한다. React에는 그 동일 중복이 없으므로 공유 상세 수정 메뉴를 지우지 않는다.
- React practice의 정상 닫힌 banner는 기존 기록 목록과 중복인 범위만 감춘다. presenter는 mounted로 유지하고 기본 no-practice 출력은 보존한다. failed/stale/recovery와 applying/undoing은 숨기지 않는다. 기록이 없는 화면에 새 자동 banner를 추가하지 않는다.
- 기술 기본 문구는 목적 중심으로 줄이되 원문/개인 소유·실패 이유·occurrence identity·필드·export 결과를 보존한다. 모델·writer·schema·source order 변경은 C3에 포함하지 않는다.

담당은 root의 React CSS/presentation, 독립 담당의 standalone CSS/presentation, 별도 검증 담당의 실제 browser baseline/회귀로 분리한다. K4는 독립 read-only 설계·characterization만 병행한다. C3 마감 전 신규 제품 요구나 영구 정책으로 확대하지 않는다.
