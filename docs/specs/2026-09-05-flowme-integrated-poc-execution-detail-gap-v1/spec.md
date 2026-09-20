# P3-J — 실행 상세의 원문 정보 전달과 연결 검증

- 작성일: 2026-09-05
- 상태: `VERIFIED` — 제품·리포트 검증과 문서·소유 범위 종료 감사 완료
- 작업 공간: `D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901`
- 승인 근거: 현재 통합 PoC 작업의 P3-J 목표. 기획, UX, 설계, 구현, 검증, 요구 추적과 보고를 포함한다.
- 완료 판정: [qa.md](./qa.md)의 현재 실행 증거를 채운 뒤 판단한다. 기획 문서만으로 충족 수를 올리지 않는다.

## 1. 사용자 과업과 이번에 고치는 공백

사용자는 오늘이나 Flow 목록에서 같은 Item을 열어 원문 설명, 완료 기준, 자신의 메모를 구분해서 확인해야 한다. 제작자가 작성한 완료 기준도 개인 Flow에 저장한 뒤 같은 상세에서 확인할 수 있어야 한다. 원문이 가진 정보를 읽는 과정에서 사라지는 공백을 메우며, 완료 기준이 없는 항목에 새 기준을 만들지 않는다.

시작 시점 코드에서 확인한 공백은 두 가지다.

1. 기존 `FlowBundle.itemDetails[].completion_criteria`는 저장돼 있어도 PoC `toProjectableItems`가 읽지 않았다. Item editor에 `completionCriterion` 표시 행이 있지만 호출자가 값을 전달하지 않았다. 작성 Flow의 `parsedItems[].completionCriteria`도 lineage에 보존돼 있으나 개인공간 상세까지 전달되지 않았다.
2. 개인공간 상세는 `task.description ?? task.memo`를 `상세` 하나로 표시했다. 개인 메모가 effective description이 되는 경로에서는 원문 설명과 메모를 한 정보처럼 읽을 수 있었다.

`D1-023`은 항목 위치 이동 요구가 아니라 **기준일 우선과 결과 형식 분리**다. `D1-024`는 일반적인 미리 선택이 아니라 **Map child 선택 후 전체 결과 확인**이다. 두 요구는 이미 E4 충족 기록이 있어 현재 회귀만 재확인한다. 새 갭 해결 건수로 세지 않는다.

## 2. 세 산출물의 근거와 현재 적용 매핑

| 원본 | 요구·대화 결정 | 원본 화면·계약 | 시작 시점 적용과 차이 | 이번 적용 및 증거 |
| --- | --- | --- | --- | --- |
| v4.1 | 날짜·폴더·Flow 소속·메모·완료의 독립성, 기간 보기는 같은 Item을 재사용 | v4.1 명세 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`), 원본 UI (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`), 통합 blueprint §4·6·S7 | 오늘·Flow가 같은 ref로 열리지만 상세 정보가 effective description에 합쳐짐 | 같은 read-only 상세 projection을 Today/Flow/result opener에 공급. 제목·완료·개인 날짜·메모·복귀 위치 회귀 |
| 개발1 | `D1-005.5`, `D1-017.3~6`: 원문 설명·완료 기준은 읽기 전용, 개인 메모는 별도 편집 값 | 원본 시나리오 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`) L876–881의 `원문 기준·완료 기준`과 `내 메모`; 정본 trace의 D1-conversation-002·013 | 원문 상세 필드는 존재하지만 실제 source metadata 전달이 빠지고 일반 상세가 메모와 혼합됨 | source `itemDetails` exact join, UI source/criteria/memo 분리, 개인 편집·완료·reload 뒤 원본 내용 유지 |
| 개발1 | `D1-023`: 기준일은 결과 목록 위에 두고 Text/Todo/Calendar 보기와 저장 날짜 의미를 분리 | 정본 trace D1-conversation-016, [단계 3 결과 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md) §8 | E4 충족. 기준일과 view state가 이미 분리돼 있음 | 결과 형식·선택 날짜·같은 ref/date/completion·복귀와 write 0 회귀. anchor/baseDate 변경은 금회 재시험하지 않음 |
| 개발1 | `D1-024`: child 선택을 결과 위에 두고 변경 시 Text 초기화·열린 Item 닫기·결과 focus 복귀 | 정본 trace D1-conversation-017, [단계 2 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md) | E4 충족. single-child 평탄화와 multi-child 선택 구현 | 같은 child·stale·foreign child 무변경과 유효 child 전환 회귀. 신규 기능처럼 재집계하지 않음 |
| 개발2 | `D2-035`: 완료 기준은 Item 정보. `D2-003`: 결과는 같은 Item projection | Item 맥락 팔레트 (로컬 전용 근거: `../../../../flow-text-authoring-flow-view-poc-20260824/docs/specs/2026-08-26-flowme-text-authoring-contextual-item-palette/spec.md`); 현재 parser·handoff의 parsed snapshot | 작성 parser는 완료 기준을 읽고 source snapshot에 보존함. 개인공간 Item 상세로 연결되는 읽기 경로가 빠짐 | source line map과 `savedCopyId + flowId + itemId` 일치로 snapshot 기준을 읽어 같은 상세에 공급. rawText·revision·fingerprint 불변 |

관련 세션은 `(개발1) 컨텐츠 활용 ux ui 고민(260812~)` (`019ff3f6-dd52-7061-a5e2-a97c5500f2a9`)와 `(개발2) Flow 콘텐츠 제작 관리 모듈(260729~)` (`019fab7b-e562-71a1-a6bf-9de5c8837e75`)이다. 이번 읽기에서 개발1 마지막 결정인 `이건 아이디어에 킵하자`를 확인했으며, 회고·XP·Experience Passport를 이 목표에 끼워 넣지 않는다. 개발2 `01a052b2-22e5-7da0-bd2f-032108fac1ee` 턴은 완료 기준을 좁은 상위 메뉴명으로 쓰지 않고 `항목 정보` 아래의 정보로 두며, 작성 틀을 기존 Flow 편집기에 흡수하라는 결정이다. P3-J는 이 작성 문법을 유지한다.

개발1의 앞선 원문·완료 기준 대화는 정본 추적표의 D1-conversation 식별자와 해당 원본 시나리오를 근거로 삼는다. 과거 턴 직접 페이지 조회에 실패한 부분을 이번에 대화 원문 전체를 재열람한 것으로 표현하지 않는다.

## 3. 기존 판정 충돌과 집계 원칙

[정본 추적표 데이터](../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-subchecks.json)에는 `D1-005.5`와 `D1-017.5/.6`이 부분으로 남아 있다. 한편 후속 parent 집계는 `D1 26/26 충족`을 이어받고 단계 3 설명은 완료 기준을 표시했다고 기록한다. 실제 caller에 완료 기준 prop이 없는 점과 일치하지 않는 집계다.

- 시작 판정은 `부모 충족 기록에 대한 구현 누락 재확인`으로 기록한다.
- 부모를 새 요구로 추가하거나 기존 26개 분모를 늘리지 않는다.
- `D1-005.5`와 `D1-017.5`는 같은 원문 완료 기준 누락을 두 요구가 참조한다. 결함은 한 원인으로 묶고 요구별 적용 여부만 따로 표시한다.
- `D1-017.3`의 원문 설명과 `.6`의 개인 메모는 실제 UI 분리와 소유권 검증을 연결한다.
- `D1-017.4`의 바로 할 일 및 `D1-023`, `D1-024`는 기존 동작 회귀다. 새 갭 해결 수에 중복 산입하지 않는다.
- `.1/.2/.7` 등 이번 전용 시나리오로 확인하지 않은 세부 조건까지 함께 승격하지 않는다.
- 최종 trace의 판정 설명은 실제 실행 증거를 연결한 뒤 수정한다. 과거 증거는 삭제하거나 현재 실행인 것처럼 덮어쓰지 않는다.

## 4. UX와 개발 설계

기존 개인공간과 공통 Plan→Item 화면 문법을 유지한다. Item의 원문 정보는 `원문 설명`, `완료 기준`, `원문 일정`으로 표시하고 `내 메모`는 분리한다. 완료 기준은 값이 있을 때만 읽기 전용으로 노출하며, 입력칸이나 자동 완료 정책을 추가하지 않는다. 출처 URL은 실제 보유한 안전한 값만 사용한다.

읽기 흐름은 다음과 같다.

```text
기존 bundle.itemDetails(item_id exact join) ─┐
                                         ├─ Item 상세 읽기 helper ─ 원문 설명 / 완료 기준
작성 source snapshot(exact tuple + line) ─┘
기존 personal baseline + PoC overlay ──────── 내 메모
동일 Item ref + 실행 state ───────────────── 완료·개인 실행일
```

- 새 helper `personal-workspace-poc-item-details.ts`가 Flow와 Item을 받아 source description, personal memo, completionCriterion을 돌려준다.
- 기존 saved Flow는 source bundle의 정확한 `item_id`로 완료 기준을 읽는다. 제목, 배열 위치, 다른 saved copy의 값으로 대체하지 않는다.
- 작성 Flow는 이미 보존된 parsed snapshot과 source line identity map을 정확한 tuple로 확인한다. 다른 Flow/Item, stale mapping, 기준 없음에서는 기준을 만들어 내지 않는다.
- read model·view model·컴포넌트 사이에 필요한 읽기 값만 전달한다. completion state를 완료 기준 텍스트로 추정하지 않는다.
- 개인 메모 우선순위는 기존 owner·overlay 계약을 따른다. 원문 설명을 메모 값으로 표시하거나 메모를 원문 설명으로 바꾸지 않는다.
- 상세 열기/닫기와 결과 탐색은 화면 상태다. 개인 편집은 기존 staged Plan transaction, 실행 완료는 기존 PoC transition을 재사용한다.
- Item→부모 Plan→원래 opener의 돌아가기, 선택 view/date, focus/scroll 보존을 확인한다.
- standalone도 같은 데이터 구분과 실패 처리를 사용한다. 소스 자산을 수정하고 두 조작형 HTML을 다시 생성한다.

결과 상세 진입점은 기존 runtime별 경로를 유지한다. React는 Text·Todo·Sheet·Calendar에서 Item 편집을 열어 원문·완료 기준·내 메모를 읽고 취소 뒤 원래 탭·Calendar 선택 날짜·초점으로 돌아간다. standalone은 Todo·Calendar에만 상세 opener가 있고 TXT·Sheet에는 없다. 이번 완료 기준 연결을 이유로 새 opener를 만들지 않으며, 두 runtime의 결과 동선 전체가 동일하다고 판정하지 않는다. 이 차이를 포함한 직접 재검사는 [QA EJ-06](./qa.md)에 기록한다.

## 5. 보호 경계와 종료 조건

제품 진입은 exact `/my?personalWorkspacePoc=v1`, 쓰기는 `flow:poc:personal-workspace:v1:*` shadow state 안으로 한정한다. 기본 `/my`, 운영 schema, 완료·메모·날짜·보관·export writer를 바꾸지 않는다. 잘못된 query, unsupported origin, 손상 payload는 fail-closed를 유지한다. `localStorage.clear()`는 금지하며 초기화는 기존 정확한 PoC prefix 계약만 사용한다.

현재 dirty 경로는 미소유로 취급한다. 운영 `/calendar`, 공개 저장, 계정·cloud, AI, 외부 동기화, migration, 배포는 범위 밖이다. 실제 Android/iOS, 보조기술, 관찰 사용자 검사는 이 목표의 완료 조건과 차단 요인에서 제외하고 기존 `NOT_RUN` 기록을 보존한다. 별도 지시 없이 commit·push·PR·Preview·Production을 진행하지 않는다.

기획·UX·설계 이후 React와 standalone 구현, 요구별 before/after, 의미 있는 테스트, 전체 `npm test`, production build, 지정 다섯 viewport 조작, 저장 호출 경계와 운영 fixture byte 비교를 모두 확인해야 종료한다. 실행 목록과 세부 합격 기준은 [qa.md](./qa.md)에 둔다.

## 6. 구현 후 확인한 적용 범위와 제한

일반 `FlowItem`뿐 아니라 `meal_plan`의 `mealSlots`도 해당 slot ID와 `itemDetails.item_id`가 일치할 때 기준을 전달한다. 최초 수정에서 meal slot 경로가 빠진 것을 추가 대조로 찾아 수정하고 전용 회귀 1개를 추가했다. 최종 줄바꿈 수정 이후 관련 자동 검사 58/58, 전체 `npm test` 15개 실행 그룹 합계 2,210/2,210, production build 18/18 페이지, 제품 브라우저 26/26, trace 65/65가 통과했다. 세부 실행과 리포트 QA는 [qa.md](./qa.md)에 둔다.

원문 줄과 Item의 정확한 대응을 보유하지 않은 legacy authored snapshot, 또는 기존 source-update용 disposable projection에는 기준을 추정해서 채우지 않는다. 원문 텍스트나 제목·배열 위치에서 기준을 다시 해석하는 새 정책을 만들지 않았으며, 해당 읽기 증거가 없는 경우 완료 기준 필드는 생략한다. 이 제한을 모든 과거 authored payload까지 완료 기준 표시를 복구한 것으로 표현하지 않는다.

캡처 직접 비교 중 React 상세에서 긴 token이 내부 가로 스크롤을 만들어 텍스트와 왼쪽 헤더가 잘리는 화면 결함 1개를 추가 발견했다. 초기 문서 전체 overflow 0 검사는 이를 놓쳤다. 원문 구획에 `minmax(0, ...)`와 `overflow-wrap:anywhere`를 적용하고 `PersonalWorkspacePocEditorSurface.tsx`의 읽기 전용 행에도 같은 줄바꿈을 반영했다. 검증은 내부 `scrollWidth/clientWidth`와 text range bounds까지 강화했으며 최종 다섯 화면에서 자동 검사와 캡처 직접 비교를 통과했다. 집계는 요구 누락 원인 2개와 검증 중 화면 결함 1개를 분리한다.
