# K3-B — 개인 계획 편집의 필드·결과·영수증 동등성

2026-09-05. 상태: **후속 개발 설계 / 제품 변경 0 / 새 제품 테스트·브라우저 실행 0**. K3-A와 병렬로 준비했다. 이 문서만 새로 작성했으며 기존 판정·보고서·생성 HTML은 수정하지 않았다.

## 1. 범위와 정본

사용자는 같은 Flow의 제목·할 일·개인 메모·계획 날짜·지원되는 개인 구간과 순서를 조정하고, Item은 부모 초안에 반영한 뒤 Plan에서 한 번 저장한다. 원문·개인 계획·실행 배치를 서로 덮어쓰지 않는 것이 먼저다. 이번 설계는 [실행 계획 §9](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)와 [개선 설계 §7.2](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md)의 `K-D1-02,06`을 구체화한다. 발견된 원문 시간 누락도 같은 필드 전달 범위에 연결한다.

| 직접 읽은 근거 | K3-B에 적용하는 내용 | 대체·제외 경계 |
|---|---|---|
| 개발1 My Plan 원본 명세 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md`), Product contract·Acceptance | 네 origin 공통 편집, Item 적용 0쓰기, Plan 최종 저장, dirty·실패·복귀 | 운영 origin writer 재사용은 A0-2에서 PoC shadow로 대체 |
| 개발1 Public Plan 원본 명세 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-08-12-public-plan-edit-surface-unification/spec.md`), 날짜 후속 기록 (로컬 전용 근거: `../../../../flow-mvp/docs/pr-history/2026-08-13-flow-map-item-date-parity.md`) | 같은 날짜 fixed pin 보존, 명시 reset, capability별 필드 | 원래 공개 Map의 unscheduled 제한은 운영 계약. PoC 날짜 3상태는 아래 Stage 3을 따름. anchor 전체 재계산은 K4 |
| 개발1 원본 화면 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`), L846–911 | Plan 조정 → Item 제목·메모·날짜 → 원문/완료 기준 → 저장 전 영향 → 한 번 저장 | 구조적 UI 제안이며 당시 제품 캡처가 아님. 포함 선택과 기준일을 구현된 것처럼 복제하지 않음 |
| [A0-2·A0-6](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md), [Stage 3 §3–9](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md) | React 정본·HTML 검토 동반물, 개인 날짜 3상태, 읽기/쓰기 구획·receipt | 운영 `/calendar`, source 역쓰기 금지. 과거 Stage 3의 section 미지원은 P2-C 범위에서만 대체 |
| [P2-C 개인 편집 계약](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md) 전문 | stable `personal-draft`·`authoring-handoff` section만 `sectionTitles`로 편집, 원문 역수정 금지 | source-owned/derived/canonical/Map/legacy section은 읽기 전용. 16속성 source 편집 승인을 개인 Plan 16필드 편집 승인으로 확대하지 않음 |
| [P3-J 원문 상세 계약](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/spec.md) 전문 | 원문 설명·완료 기준·개인 메모의 정확한 분리와 identity 조인 | 같은 문자열이라고 같은 owner가 아님. 정보 없는 옛 snapshot은 추정 보충하지 않음 |
| [D1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md) 및 JSON의 sources/관련 요구, [회수된 후속 결정](../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-d1-history.json) | 부모 충족 수와 실제 필드 차이 분리. Text 기본과 보류 방향 유지 | 감사의 옛 행 번호·dirty 미구현 판정은 현재 코드로 재확인. 이번에는 원본 대화를 새로 직접 조회하지 않았음 |
| [K1-B 설계 §1–4](./k1b-design.md), [복구 보완 계약](./k1b-recovery-addendum.md), [K2B checkpoint 계약](./k2b-checkpoint-contract.md) | 지금 구현된 session/attempt·prepared/confirmed·복구 우선권과 workspace-v2 보존 | K1-B 초기 문서의 old target은 K2B에서 fixed v2 pair로 대체됨. 새 writer나 key를 임의 추가하지 않음 |

회고·XP·계정·cloud·공개 후보·운영 migration·배포는 제외한다. Figma는 사용하지 않았다. 현재 코드와 승인 문법의 비교 설계이며 새 시각 디자인 산출물은 만들지 않았다. UX 검토에서는 원문·오류·복구 정보를 유지하고, 같은 편집기 진입·기술 설명·가짜 제외 집계만 줄이는 원칙을 적용한다.

## 2. 필드와 저장 owner 대조

아래는 현재 코드 확인이다. `표시 있음`은 모든 origin·viewport에서 새로 실행해 통과했다는 뜻이 아니다. React 기준 파일은 `lib/flow/personal-workspace-poc-contract.ts` L516–584, `personal-workspace-poc-plan-editor.ts` L54–127·541–646·892–954, `components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx` L235–522·685–785·900–964다. standalone 기준은 assets의 `app.js` 함수명과 `model.js` action을 함께 적었다.

| 정보 | 승인 owner / React 현재 | standalone 현재 | K3-B 처리 |
|---|---|---|---|
| Plan 제목 | `personalPlanOverlays[flowRef].title`; draft `inherit/override` | `newPlanDraft.title` → `flow.title`; `sourceTitle` 최초 캡처, 상속 reset UI 없음 | 검증된 baseline과 내 제목을 분리하고 명시 원본 따르기 제공. 제목 빈 값은 오류 |
| Item 제목 | `overlay.items[itemRef].title`; `inherit/override` | `draft.items[].title` → `task.title`; 직접 입력만 | 같은 identity의 title mode/값을 staged 반영. source-equal text의 현재 normalize 규칙과 날짜 pin 규칙은 다름 |
| 장소 | 원문 `ResultSourceAttributes.place`; 개인 Plan overlay 필드 없음 | `task.sourceProperties['장소']`가 결과 Sheet 등에 사용됨. Plan 입력 없음 | 값이 있으면 원문 읽기 전달을 확인. 새 개인 장소 입력은 이번 기존 capability 동등성에 포함하지 않음 |
| 설명·완료 기준 | `getPersonalWorkspacePocItemDetails`의 source 설명·criterion, 읽기 전용 | `M.itemDetails`·`renderItemSourceDetails`로 분리 표시 | 정확 원문 값 유지. 개인 메모 입력과 합치지 않음. 없는 값은 창작하지 않음 |
| 개인 Item 메모 | `overlay.items[ref].memo`; 부재와 `''` 구분. UI inherit=`개인 메모 없음` | `task.memo` 문자열; `''` 유지. mode 없음 | 빈 개인 메모·명시 지우기·기존 개인 baseline의 차이를 지킨다. §3의 React 정규화 후보를 먼저 재현 |
| Plan 설명·Plan 메모 | 해당 Flow-level 개인 필드 없음 | 별도 owner 없음 | Item memo로 대신 저장하지 않음. 미지원으로 분리하며 새 빈 입력칸을 만들지 않음 |
| 개인 계획 날짜 | `schedule` 부재/`fixed_date`/`unscheduled`; UI 세 mode | `task.planDate` 유무 또는 date/null, 폼은 date 입력 하나 | 세 mode와 원래 날짜 복귀를 노출. 같은 날짜 fixed도 명시 pin으로 유지 |
| 실행 날짜 | `placements[ref].scheduleMode/date`; Plan 폼과 별도 | `task.date`; Item Plan commit은 이 값을 쓰지 않음 | Plan 저장과 실행 이동을 분리. 과거 `task.date`의 상속 provenance 문제는 §4 기술 gate |
| 시간·시간대 | 개인 시간은 `placements[ref].time?`; 원문 시간은 검증된 authoring attributes. Plan draft에 time 없음 | handoff의 `parsedItem.time` → `task.time`; `sourceProperties['시간대']` 보존. Plan 입력 없음 | §3의 원문 `09:30` 읽기 누락부터 수정. 개인 시간 지우기/시간대 새 입력 정책은 만들지 않음 |
| 반복·반복 종료 | 원문 attributes의 recurrence, 별도 occurrence placements/completions. Plan draft에 반복 필드 없음 | source properties + `occurrenceOverrides` | 원문 규칙·회차 identity 읽기 및 기존 실행 조작 보존. 개인 Plan 반복 편집으로 확대하지 않음 |
| 완료·다시 열기 | `completions`/`occurrenceCompletions`; Item 폼 내부는 읽기 전용 | `task.done/completedAt` 및 occurrence override; 상세의 별도 action | 부모 초안 반영과 섞지 않음. 원문 `[x]`는 완료 초기값이 아님(K2-A 유지) |
| Plan Item 순서 | `orderedItemRefs`는 모든 ref 정확히 한 번; source membership 불변 | `flow.steps[].itemIds`를 순회. Plan 순서 UI/overlay 없음 | 개인 순서 metadata로 투영. Step 소속을 바꾸거나 date TimelineOrder로 대신 저장하지 않음 |
| 개인 구간 제목 | stable `sectionId` + `editCapability:'poc-shadow'`일 때 `sectionTitles` | step title과 id만으로는 개인 편집 capability가 입증되지 않음 | 검증된 개인 구간에만 별칭 저장. 제목·배열 index로 owner 생성 금지 |
| 폴더·포함 여부 | Flow 폴더는 organization, Item 상속. Plan 포함 owner는 K4 | Flow `folderId`, Item은 null, Quick만 독립 폴더. Plan 전체 items 길이 guard | Item 폴더 UI는 읽기 전용. `기간에서 숨기기`를 Plan 제외로 재사용하지 않음 |
| 원문 복원 | 개인 title/schedule/section의 명시 inherit는 개인 override 제거. source-update Undo는 별도 owner | 원문 표시와 source-update 별도 Undo는 있으나 Plan field reset은 없음 | 버튼은 필드별 `원본 따르기`/`개인 메모 없음`. 원문 파일 수정·source-update Undo·전체 Plan 초기화를 한 버튼으로 합치지 않음 |

핵심 차이는 `app.js:newPlanDraft` L2094–2105, `renderPlanEditor` L2190–2197, `openItemEditor` L2226–2270, `renderItemEditor` L2287–2303와 `model.js:commit-personal-plan` L2113–2142에 있다. 지금의 K1-B 저장·이탈은 구현돼 있으므로 예전 감사의 “dirty 확인 없음”을 새 결함으로 반복 집계하지 않는다.

## 3. 첫 작은 묶음: 읽기·메모 owner부터 확인

### B0-T — 원문 시간 전달

[원문 시간 진단](./k2c-found-k3b-source-time.md)과 별도 RED 시나리오 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts`)를 읽었다. 원문 `시간: 09:30`으로 materialize한 개인 Flow에 placement override가 없을 때, React 기간 행의 `09:30` 표시가 빠진 **기존 브라우저 재현**이다. 이 설계에서는 재실행하지 않았으며 초기 K2-C 검사 수를 다시 더하지 않는다.

- `buildPersonalWorkspacePocTasks` L89–104는 `sourceTimingLabel`을 보존하나 `time`에 `placement.time`만 넣는다. 현재 ResultProjection L1548–1550은 `placement.time ?? sourceAttributes.time`을 사용한다.
- `resolveResultSource` L672–768은 raw fingerprint, source line map, `savedCopyId + flowId + itemId`, sourceOrder와 parsed snapshot을 대조한다. 이 검증에서 나온 typed time을 재사용할 read helper가 최소안이다. 전체 결과/회차를 매번 생성해서 Task builder에 넣지는 않는다.
- source helper는 **개인 순서·제목을 적용하기 전의 검증된 source**에서 context map을 만든다. 개인 overlay가 바꾼 `sourceOrder`를 lineage 원본으로 삼거나 제목·index로 다시 조인하지 않는다. 최종 effective Item에는 검증된 exact ref로만 읽기 값을 합친다.
- 표시 우선순위는 기존 결과와 맞춰 유효한 개인 `placement.time` → 검증된 원문 time → 시간 없음이다. `sourceTimingLabel`은 D-offset·timezone도 들어가는 표시문이므로 split/정규식으로 시간을 추정하지 않는다.
- `unscheduled`는 날짜의 mode다. 시간 필드의 명시 제거를 뜻한다고 새로 정의하지 않는다. 현재 `time?: HH:mm`에는 ‘상속과 별개인 시간 제거’ 표현이 없으므로 빈 time을 저장하거나 새 clear mode를 만들지 않는다. 날짜 미정에서 원문 시간 표시 방식도 기존 결과와 대조해 회귀로 고정한다.
- 네 saved origin에 typed source time 근거가 없으면 원문 일정 label은 그대로 읽기 표시하고, 새 HH:mm 정렬값을 만들어 내지 않는다. stale/부분 lineage는 값을 보충하지 않으며 손상 payload의 기존 fail-closed는 유지한다.
- 같은 fixture의 React/standalone 기간·상세·TXT/Todo/Calendar/Sheet를 비교하고 조회 전후 저장 0을 확인한다. 시간순 기본 정렬과 수동 TimelineOrder 우선권도 함께 검사한다.

### B0-M — 메모를 원문 설명과 같다는 이유로 제거하지 않는지 재현

현재 코드에서 불일치 후보를 확인했다. `PersonalWorkspacePocEditorSurface`의 메모 inherit는 `개인 메모 없음`이지만 `normalizePersonalWorkspacePocPlanOverlay` L910은 `textOverrideValue(draft.memo, source.description)`를 호출한다. `editor-receipt.ts:summarizePersonalWorkspacePocPlanDraftChanges`도 inherit 메모의 표시값에 source.description을 사용한다.

이는 아직 새 실행으로 재현한 결함이 아니다. ‘사용자가 원문 설명과 정확히 같은 문자열을 개인 메모로 직접 입력’·‘기존 개인 메모가 있는 baseline으로 inherit 복귀’·‘빈 문자열 명시 제거’ 세 조건을 RED 시험으로 먼저 고정한다. 실패하면 원문 설명이 아닌 **실제 개인 메모 baseline/owner**로 normalize·summary를 맞추는 작은 수정만 한다. 기존 imported-personal 메모와 source description을 모두 지우는 일괄 수정은 금지한다. 이 검사가 끝나기 전에 owner 확인 없이 현재 React 요약을 standalone에 복제하지 않는다.

## 4. 필드 동등성을 위한 최소 adapter와 구현 전 gate

### 4.1 기존 의미를 그대로 사용할 값

재사용할 기준은 `PersonalWorkspacePocPlanTextDraft`, `PersonalWorkspacePocPlanScheduleDraft`, `PersonalWorkspacePocPlanDraft`, `PersonalWorkspacePocPersonalPlanOverlay`의 기존 필드다. standalone의 표시용 `title/items[{id,title,memo,planDate}]`를 이 필드와 무조건 동일하다고 선언하지 않는다. 작은 adapter가 정확한 origin/ref와 capability를 포함한 immutable baseline, editable draft, effective read projection, commit candidate를 분리한다.

| 입력/행동 | 의미 | 무변경·원본 보존 조건 |
|---|---|---|
| title/section `inherit` | 알려진 baseline 제목 읽기 | override만 제거. 빈 override title은 오류. source와 같은 text의 normalize는 기존 계약을 테스트로 고정 |
| memo 부재 / `inherit` | 알려진 imported-personal baseline 또는 개인 메모 없음 | source 설명을 대신 표시하지 않음. `''`의 명시 지우기와 구분 |
| schedule `inherit` | PoC 계획 override 없이 imported-personal/source 계획일 사용 | 기존 실행 placement와 원문 date 그대로 |
| `fixed_date` + source와 같은 date | 같은 표시값이어도 개인 pin | source와 같다고 inherit로 정리하지 않음 |
| `unscheduled` | 개인 계획일 미정 | 원문 날짜·실행일·시간·완료 삭제 안 함 |
| 비어 있는 fixed date | 아직 유효하지 않은 입력 | Item apply/Plan commit 0쓰기, 입력 유지·첫 오류 초점 |
| Item `계획에 반영` | 그 child 초안만 부모에 반영 | 부모의 다른 Item·title·section/order 보존, 저장/journal 0 |
| Plan 순서 변경 | 전체 ref permutation | ref 누락·중복·foreign·source membership 변경 거절, TimelineOrder 불변 |

### 4.2 standalone 데이터 gate — 기존 nullable 값만으로 전부 복원할 수 없음

현재 `task.planDate`의 **부재**는 기존 계획 baseline 사용, 유효 문자열의 존재는 저장된 개인 날짜, null의 존재는 저장된 날짜 없음으로 보존할 수 있다. 옛 Plan 전체 저장이 미수정 Item에도 이 필드를 채웠으므로, 그 존재만으로 사용자가 직접 pin/미정을 선택했다는 이력까지 주장하지 않는다. lossless adapter는 저장된 효과를 유지하며 값 비교로 inherit를 추정하지 않는다. `task.date` 역시 source 초기화와 명시 실행 이동에 같이 쓰이며, 같은 날 고정인지 상속인지 구별할 provenance가 없다. `task.date === task.sourceDate`만으로 실행 inherit를 만들면 사용자의 같은 날짜 pin을 잃을 수 있다.

안전한 권고는 다음과 같다. 아직 구현하지 않은 교체 가능한 PoC adapter 계약이며, 새 영구 schema 확정이 아니다.

1. 기존 v1 raw, workspace-v2의 state/undo, `timelineContextV1.legacySnapshot`은 그대로 보존한다. 읽기나 첫 폼 열기에서 normalize/write하지 않는다. 과거 `sourceTitle`이 없으면 현재 제목을 원문으로 확정 저장하지 말고 ‘기존 저장 기준’으로 분리한다.
2. 기존 구조로 나타낼 수 없는 title/memo/date mode·개인 section·global Plan order는 기존 React overlay 의미를 재사용하는 **버전 명시 개인 Plan adapter 데이터**로 관리한다. 후보 위치는 같은 workspace-v2 state 안의 optional versioned overlay이며, 별도 localStorage key·독립 Undo는 만들지 않는다. 실제 필드명/strict decoder/old checkpoint 호환은 구현 직전 pure gate에서 확정한다.
3. 해당 optional 데이터 부재인 old payload는 읽기 호환으로 유지한다. unknown legacy 필드는 삭제하지 않고, 새 reserved 이름과 충돌하면 자동 채택하지 않는다. 새 데이터는 known fields·version·전체 ref·stable section capability를 strict 검사한다. `M.validate`가 unknown을 통과시킨다는 사실은 새 계약 검증이 아니다.
4. 과거 실행 날짜 provenance가 없는 데이터는 기존 효과를 그대로 유지하고 ‘기존 실행 날짜 유지’로 구분한다. 복구/이관 과정에서 자동 inherit로 바꾸지 않는다. 실행 상속 복귀가 필요하면 기존 실행 이동/복원 intent에서 사용자가 명시 선택한 경우에만 적용한다. 새 handoff의 알려진 초기값과 과거 불명확 값을 같은 규칙으로 재해석하지 않는다.
5. Plan overlay → effective plan → execution placement의 reader를 period/result/detail에 함께 연결한다. `app.state()`는 source candidate composition을 하고, `C.projectGroups()`는 checkpoint raw task.date/time을 직접 읽으므로 한쪽만 새 reader로 바꾸면 다시 서로 다른 날짜가 된다. 이 두 경로와 result rank까지 같은 의미를 소비해야 한다.
6. 새 overlay를 source baseline이나 `flow.steps[].itemIds`, source properties에 덮어쓰지 않는다. 일반 Quick·folder·move·complete·trash·source candidate·reset·영구 삭제·Undo가 같은 envelope의 optional 데이터를 무손실 보존/정리하는지도 gate에 포함한다. 저장 모듈 전면 교체는 하지 않는다.

이 gate에서 보존과 명시 조작만으로 해결되면 사용자에게 같은 A0 결정을 다시 묻지 않는다. 과거 불명확 값을 자동 이관해야만 진행할 수 있다는 안이 나오면 그 처리 선택만 별도 요청한다. 그 전에도 B0-T/B0-M, 순수 fixture 및 receipt 설계는 진행할 수 있다.

### 4.3 K1-B와 연결할 지점

`plan-item-session.js`는 session/attempt·dirty·close·CAS·durable journal을 이미 소유한다. 현재 `createChildSession` L155–163은 `title,memo,planDate`만 baseline 비교하고 `applyChild` L168–181도 그 세 필드만 부모에 복사한다. 새 date/title mode를 UI에만 달면 child 반영·reload recovery에서 사라진다.

- 최소 adapter 버전을 구별해 baseline/dirty validation·child scope copy·journal draft decode를 함께 확장한다. 이미 남아 있는 old-format prepared/confirmed journal은 old decoder로 복구한 뒤 새 편집을 연다. 다른 shape를 새 mode로 임의 승격하지 않는다.
- 새 session은 `E.createForWorkspace('checkpoint-v2')`의 고정 target/journal pair를 사용한다. old journal 우선, legacy raw drift/read-error 잠금, 외부 target/journal 보존, source candidate 기능 오류 guard를 유지한다.
- 내용 target 한 번 저장은 **성공 논리 transaction 1개와 target write 1회**다. prepared/confirmed journal 쓰기·정리 호출을 합쳐 저장 호출 1회라고 표현하지 않는다.
- candidate readback + confirmed exact readback은 durable commit, cleanup 확인과 `canResume`는 편집 종료/일반 행동 재개 조건이다. confirmed cleanup 실패는 저장 실패로 되돌리지 않으며, before rollback은 소유가 확인된 prepared 복구에만 허용한다.
- `saveEditor` L1843–1928의 고정 attempt retry를 재사용한다. 실패 후 값 수정은 기존 attempt 종료/새 guard 규칙을 따르고, 늦은 callback·다른 session 결과로 새 초안을 닫지 않는다.
- K2-C contextual 이동 결과는 Plan receipt를 대신하지 않는다. 편집·receipt·recovery 우선권을 유지하고 전역 Undo·배경 writer를 편집 중 잠근다.

## 5. 화면·상태 설계

새 wizard나 전역 theme는 만들지 않는다. standalone은 K1-B 전체 편집 페이지와 단일 discard dialog를 유지하고 React는 기존 공통 sheet를 유지한다. 같은 동작과 필드 순서를 맞춘다.

| 화면/상태 | 보일 정보와 주 행동 | 종료·초점·쓰기 |
|---|---|---|
| Plan 열기 | 원본/기존 기준 → 내 Flow 제목 → 지원 개인 구간 → 전체 Item·순서 → 실제 변경 요약 | mode 초기화는 읽기만. 첫 실제 editable control 초점 |
| Item 열기 | 원문 제목·설명·완료 기준·일정 → 내 제목·메모·날짜 3상태 → 실행 위치 읽기 | `계획에 반영`; 완료/폴더 이동 입력 없음 |
| Item 반영 뒤 부모 | 변경된 Item 행·계획 날짜 mode·메모 존재, 부모 변경 요약 | 해당 Item opener 초점, 다른 draft 유지, storage 0 |
| 개인 구간 | stable 개인 구간에만 내 제목/원본 따르기 | 원문 구간과 Item membership 고정. derived/unknown 구간은 읽기만 |
| 순서 | 위/아래 등 기존 비드래그 조작, 원래 Plan 순서 복귀 | 같은 ref 유지. 경계 버튼은 비활성. 날짜 정렬 reset과 구분 |
| 0변경 | `바뀌는 내용이 없습니다.` / `같은 내용이라 저장하지 않았습니다.` | no-op candidate/journal 생성 0. 기존 성공 Undo를 새 성공으로 덮지 않음 |
| dirty 닫기 | K1-B `계속 편집 / 변경 내용 버리기`, Plan/Item 범위 설명 | 안전 버튼 먼저, Escape는 확인만 닫음. 부모/자식 범위 보존 |
| 잘못된 필드 | 해당 field 오류와 입력 유지 | 첫 오류 초점. 엔터·반복 클릭도 submit 0 |
| 저장 중 | 대상과 실제 변경 건수, 입력·닫기·중복 submit 잠금 | 원문/다른 Item 수정 없음. 저장 결과 전 성공 안내 없음 |
| 복구 가능한 실패 | 입력·before 상태 유지, `다시 시도` | 같은 attempt. 오류 live owner 하나. retry/cancel 모두 접근 가능 |
| 미확정/confirmed 정리 필요 | K1-B 복구 상태와 명시 확인/복구·정리 행동 | 자동 초기화·닫기·Undo 없음. reload도 gate 우선 |
| 저장 성공 | 대상, 필드별 before→after, 영향받은 고유 ref 수, Undo | 정상 정리 후 원래 view/date/opener/scroll 복귀. 다른 lane receipt와 경쟁하지 않음 |

날짜가 없으면 실제로 날짜 미정이라고 표시한다. 읽기 정보가 없는 origin에 빈 장소/반복/Plan 메모 입력을 추가하지 않는다. `반영 n개 · 제외 0개`를 고정 표시하지 말고 현재 지원이 전체 반영이면 `전체 n개 반영`으로 사실만 보여 준다. 변경 필드 수와 영향 Item/Flow 수는 같은 숫자가 아니므로 구별한다.

Plan receipt는 기존 `summarizePersonalWorkspacePocPlanDraftChanges`·receipt DTO의 의미를 재사용하되 B0-M의 owner 문제를 확인한 뒤 소비한다. 저장 전 요약과 성공 영수증은 동일 attempt의 diff를 쓴다. rawText·source hash·복구 payload를 일반 영수증에 출력하지 않는다. 순서 before/after에는 내부 ref 연결은 유지하되 사람에게는 짧은 Item 제목/순서와 정확 영향 수를 보여 준다. 아주 긴 메모는 기존 bounded 요약을 사용하고 원문 내용을 새 요약으로 바꾸지 않는다.

다섯 viewport의 검증을 각 구현 묶음에 포함한다. 특히 844×390에서 마지막 Item, 날짜 mode, retry/cancel/저장, discard 두 버튼의 전체 사각형과 hit target을 확인한다. 긴 한글·연속 token·CRLF 메모가 내부 가로 스크롤/CTA 가림을 만들지 않아야 한다. 실제 가상 키보드/보조기술을 사용한 것으로 보고하지 않는다.

## 6. 실행 순서와 제안 시험

K3-A 제품 동결·마감과 소유 파일을 조율한 뒤 시작한다. 한 번에 모두 구현하지 않는다.

| 순서 | 기획·UX → 개발 설계 → 구현 → 검증 |
|---|---|
| B0 | 원문/메모 owner 표 확인 → typed time read helper와 memo baseline 최소 계약 → RED를 먼저 확인 후 좁은 수정 → 원문09:30·동일문자 메모·다섯 화면·storage0. 기존 standalone 필드 확장과 독립 가능 |
| B1 | 제목·메모·날짜 3상태와 기존 실행 위치 표 → §4의 lossless pure adapter/optional 계약 gate → Plan/child/session/journal 함께 연결 → 같은날 pin·inherit·미정·실패/reload/Undo/old payload 보존 |
| B2 | capability 있는 개인 구간·Plan 순서만 → stable refs와 effective reader 목록 → source candidate/period/detail/result 일관 연결 → 전 Item·동명 구간·cross-copy·TimelineOrder 불변 |
| B3 | 변경 확인·최종 저장의 주 행동 → same-attempt diff/receipt·K2-C owner 연결 → bounded receipt presenter → no-op/cancel/failure/retry/success/Undo·초점·다섯 화면 최종 동등성 |

아래는 **계획한 케이스 20개**이며 이번 실행 수가 아니다. fixture 반복 횟수·개별 등록 테스트 수·viewport 수는 구현 QA에서 별도로 집계한다.

| ID | 필요한 판정 |
|---|---|
| B-T01 | 기존 RED: source time09:30 + placement 없음 → 같은 기간 행 표시, 조회 storage0, source exact |
| B-T02 | 개인 time 우선·time 없음·date 미정·timezone/relative label·stale lineage. label에서 시간 추정0 |
| B-T03 | 원문 설명과 같은 개인 메모·빈 메모·imported-personal baseline·원문 없는 Item의 normalize/receipt owner |
| B-T04 | 네 saved origin + authored의 같은 필드 순서·capability·read-only 경계; Quick은 별도 root 유지 |
| B-T05 | source와 같은 날짜 fixed pin을 저장·reload·무변경 재저장해도 유지, 명시 inherit만 제거 |
| B-T06 | inherit/fixed/unscheduled 및 source-undated. Plan/date 이동·완료·시간 상호 불변 |
| B-T07 | child 적용 storage/journal0; 부모 다른 title/Item/mode/section/order 보존; child discard는 이번 미반영 값만 |
| B-T08 | 빈 title/section·비어 있는 fixed date·unknown mode·foreign/duplicate ref는0쓰기, 입력 유지 |
| B-T09 | stable 개인 section 별칭1곳 변경→같은 section 전체 Item·결과; source-owned/derived/중복 id는 거절 |
| B-T10 | Plan 전체 ref 순서와 source Step membership, TimelineOrder/date rank 독립; 원래 순서 reset·경계 no-op |
| B-T11 | 이전 nullable planDate의 부재/문자열/null, sourceTitle 없음, legacy unknown·기존 undo의 무손실 읽기·첫 명시 변경 |
| B-T12 | 과거 task.date 동률을 inherit로 추정하지 않음; 신규 명시 execution mode와 old effective 날짜 보존 |
| B-T13 | 원문 업데이트 뒤 기존 개인 title/memo/date/section/order 보존 또는 명시 충돌 차단. raw source/lineage 역쓰기0 |
| B-T14 | 초기 read/Quota/target readback/rollback 실패, 외부 raw/journal/legacy drift. 기존 성공 상태와 입력 보존·불확실 잠금 |
| B-T15 | prepared→reload→명시 복구→원래 draft→재검토 저장; confirmed cleanup 실패→reload→정리, target 추가쓰기0 |
| B-T16 | 같은 attempt retry·double submit·late callback·다른 Plan/Item/Quick session. 중복 성공/다른 draft 변경0 |
| B-T17 | 정확2필드 변경·0변경·취소·실패·재시도·Undo에서 receipt before/after·고유ref수·한 live owner |
| B-T18 | 임시값이 있는 채 Cancel/Escape/Back/계속 편집/버리기, 부모/자식 초점·scroll·result view/date 복귀 |
| B-T19 | 다섯 viewport 정상/빈/긴 내용/오류/receipt, 전체 rect·5point hit·내부 overflow·키보드·비드래그 경로 |
| B-T20 | 읽기0쓰기, target/journal calls 별도 계수, old key·운영 sentinel exact, 금지prefix/clear/운영 writer0; 기본 `/my`·잘못된 gate/corrupt 회귀 |

관련 기존 회귀는 Plan editor·composition·item details·editor receipt·state/storage/transaction, Stage 3 runtime, P2-C section, K1-B session/recovery, K2-A completion, K2B checkpoint/timeline/rank, K2-C contextual result다. 실제 구현 시 focused부터 실행하고 root가 전체 `npm test`·production build·두 runtime 브라우저 결과를 합친다. 테스트 정의를 읽은 사실이나 과거 green 수를 현재 PASS로 보고하지 않는다.

## 7. 완료와 남는 결정

K3-B 완료는 지원 필드가 두 표면에서 같은 의미로 저장/복구되고 source·execution·다른 사본을 보존한다는 새 증거가 있어야 한다. 단순 입력칸 추가, nullable 날짜 세 버튼만 추가, 누적 성공 수 표시로 완료 판정하지 않는다. 기존 부모 26개 충족 수를 올리거나 새로운 필드 수를 갭 해결 수에 더하지 않는다.

Plan anchor/포함·제외는 K4에 남긴다. Plan-level 설명·메모, 개인 장소·반복·시간 제거, 출처 근거 없는 stable section 생성도 이번 승인 필드가 아니다. 운영 owner나 과거 불명확 값을 강제로 재해석해야 하는 선택이 생길 때만 사용자 결정을 요청한다. Figma 파일·전역 theme·새 내보내기 목적지는 필요하지 않다.

이번 결과는 설계 문서 1개다. 새 제품 테스트 0, 새 브라우저 시나리오 0. Android Chrome/iOS Safari·가상 키보드·실 보조기술은 NOT_RUN, 관찰 사용자 0명. commit/push/PR/Preview/Production 없음.

문서 검사: `npm.cmd run docs:check` PASS — required files 16개, local links 5,094개. 이는 제품 검증 수가 아니다.

조사 시점 HEAD는 `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`. 참고 SHA256: Plan 모델 `1874CF0F7A8F40D65D10712CF3A42525E887340F72ABC9B9DF0FA499CD3B9417`, Task view model `F3E504CBF2914121A56E77E502EB7372BFCDC0C598CE3C7B8091656A3A096744`, standalone M `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`, source-time RED `12DFD63585FFBC035070499760D0DD3FD6C3AC755B509B03838F6B6C8B22DDE1`. K3-A 병렬 작업의 제품 변경은 이 문서 작성자의 소유로 세지 않는다. 구현 직전에 해당 함수와 저장 계약을 다시 확인한다.
