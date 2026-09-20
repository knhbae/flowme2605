# K3-B B3 — Plan 변경요약·성공 영수증 연결 설계

2026-09-06. **설계만 작성했다. 제품 수정 0, 신규 시험 등록·실행 0, 브라우저 실행 0.** B2 제품·사용자 HTML에는 손대지 않았다. main이 이 문서를 검토한 뒤 작은 구현 gate를 승인하는 용도다.

## 1. 이번에 충족할 일

사용자는 Item의 변경을 부모 Plan에 모으고, 실제 저장될 차이를 확인한 뒤 한 번 저장한다. 성공 후에는 그 저장에서 바뀐 필드·대상 수와 해당 변경의 Undo를 확인한다. 입력 초안의 차이, durable 저장 사실, 복구 정리 완료, 결과 화면의 표시를 구분한다.

정본은 [K3-B 설계](./k3b-design.md) 전문, [실행 계획 §9](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), 현행 React Plan normalize/receipt와 standalone P/C/E2/app이다. B0-M 이후 메모 baseline 수정, B1 source-bound 보존, B2 구간·순서 계약을 현재 코드로 대조했다. 옛 설계의 “미구현” 문구나 과거 시험 수를 현재 판정으로 재사용하지 않는다.

대상 필드는 Flow 제목, Item 제목·개인 메모·계획 날짜, 지원 구간 제목, 전체 Plan 순서다. anchor/include/exclude, Plan 메모, 개인 장소·반복·시간 제거, 원문 변경·실행 완료·폴더 이동은 새 요약 필드로 추가하지 않는다. 구간·순서가 여러 행의 **표시**에 영향을 준 사실과 여러 Item의 **저장 필드**를 바꾼 사실을 섞지 않는다.

## 2. 확인한 코드와 그대로 복제하면 안 되는 부분

| 현재 근거 | 실제 동작 | B3 연결 판단 |
| --- | --- | --- |
| React `editor-receipt.ts:summarizePersonalWorkspacePocPlanDraftChanges` | baseline/draft의 mode를 붙인 표시 문자열 비교. Flow title·section·order는 Flow ref, Item 필드는 해당 Item ref를 Set에 추가 | owner·field·before/after·고유 ref 의미는 재사용. **표시 문자열을 변경 여부 판정에 사용하지 않음** |
| `plan-editor.ts:textOverrideValue/normalizePersonalWorkspacePocPlanOverlay/preflight…` | source-equal 제목·메모 override 제거, fixed date는 같아도 저장, 실제 transition이 no-op 결정 | 초안 mode 변경과 저장 의미 변화는 구별. 미리보기를 정규화 전 mode만으로 집계하지 않음 |
| `plan-memo-baseline.ts:getPersonalWorkspacePocInheritedMemo` | `existing-personal`의 exact string만 상속; 부재와 빈 문자열 구분 | source.description을 메모 baseline으로 쓰지 않음. B0-M 수정을 유지 |
| React `receipt.ts:parseChanges/parseReceiptInput` | 값/label 160자·제어문자 제한, 고유 field/refs, affectedCount 일치, 성공 revision+1, changes 존재, 최대 100 entries/refs | 전체 계약을 standalone에 그대로 이식하면 큰 Flow·복구 상태를 표현하지 못할 수 있음. 표시 타입과 검증 원칙을 먼저 재사용 |
| React Surface `requestPlanCommit:1833`, `finalizeSuccessfulEditorAttempt:1311` | 같은 attempt에 summary를 저장한 뒤 검증된 target 증거에서 성공 영수증 생성 | 같은 attempt 원칙 유지. summary0은 저장 권한/no-op 판정이 아님 |
| React Editor Surface `impact-summary:300` | 반영 전 확인·field별 before/after. Surface에서 반영 n/제외0도 전달 | 한 요약 영역을 유지. 승인되지 않은 제외 정책을 숫자로 고정 출력하지 않음 |
| P `normalizedSourceIntent:710`, `normalizedStructureIntent:783` | 검증된 source-before-P와 기존 개인 baseline 사용. 변화 없는 저장 intent는 이후 source와 동값이어도 보존 | 실제 planner 내부 정규화와 같은 semantic diff가 필요 |
| E2 `beginSourcePlanSave:577`, `beginCandidateSave:540`, `finishSave:1062` | live source/epoch/C 전체 before 검증, 고정 candidate/attempt, genuine outcome 한 번 소비 | 공개 summary 객체로 이 guard를 대신하지 않음 |
| app `saveEditor:2075`, `finishEditorClose:2007` | durable→cleanup→adopt→return point 복귀→일반 toast. 구조화 변경 요약/영수증 없음 | 정상 종료 뒤 같은 attempt의 Plan 전용 결과를 표시 |
| app `clearEditorConfirmed:2369` | 명시 정리 뒤 canResume/packet 확인, 같은 runtime만 성공 count, reload는 일반 복구 안내 | 상세 영수증 새로 만들기와 저장 사실 확인을 분리 |
| K2C owner 및 app `contextualFacts:589`, `undoContextualResult:743` | exact raw/owner/lane·receipt/editor/recovery 우선권, 명시 C Undo | Plan을 move-order로 가장하지 않고 기존 우선권과 명시 workspace Undo 패턴만 재사용 |

### 코드에서 확인한 좁은 위험 후보 — 새 RED 필요

아래는 실제 브라우저 재현이 아니라 읽기 근거다. 구현 시작 때 별도 RED로 확인한다.

1. **축약 후 비교:** React `textValue`가 긴/CRLF 메모를 먼저 `n자`로 바꾸고 `appendChange`가 before===after이면 버린다. 같은 길이의 서로 다른 긴 메모가 요약0이 될 수 있다. 순서는 긴 full-ref 문자열을 비교한 뒤 양쪽을 같은 `n자`로 줄이므로, order-only 성공 영수증의 “모든 before/after가 같다” 거절 조건과 충돌할 수 있다.
2. **정규화 전 요약:** `inherit → 원문과 같은 제목 override`는 초안 mode가 달라도 planner의 저장 후보는 같을 수 있다. 반대로 동일 날짜 fixed pin은 유효한 저장 변경이다. title과 date를 하나의 동값 규칙으로 합칠 수 없다.
3. **실제 label 크기:** source Item/section title을 그대로 label로 쓰므로 160자·CRLF 같은 표시 제한도 전체 receipt 생성 전에 처리해야 한다. 제목 원본을 잘라 저장하면 안 된다.
4. **Plan Undo의 목적지:** app `undo:1606`는 선택 Flow와 source undo가 같으면 `lastUndoLane==='workspace'`여도 source Undo를 먼저 선택할 수 있다. Plan 영수증 버튼이 이 일반 함수를 부르면 “이 변경”과 다른 저장소를 되돌릴 수 있다. B3에서는 exact owner를 확인한 **C.undoCheckpoint → 기존 S workspace writer** 경로를 사용한다. 일반 Undo의 정책 전체를 이 단계에서 바꾸지는 않는다.

## 3. 정규화와 변경 수의 의미

비교 순서는 **검증된 입력 → 실제 planner 정규화 → 필드별 exact 의미 비교 → 고유 ref 집계 → 표시값 축약**이다. UI 문자열·길이·hash·같은 보이는 날짜를 앞 단계의 equality로 쓰지 않는다.

| 사례 | 저장 의미 / 요약 |
| --- | --- |
| 원문 A, 기존 override 없음, 명시 A | 현행 normalize에서 override 없음. 저장 변경 0. 원문 유지라고 보여 주되 성공 변경으로 집계하지 않음 |
| source A→B, 사용자가 명시 A | 검증된 source B와 다른 개인 A. title 변경으로 집계 |
| 저장된 개인 A, 이후 source도 A, 편집하지 않음 | P의 unchanged intent 보존. 읽기·다른 필드 저장으로 개인 A를 자동 제거하지 않음 |
| 위 상태에서 명시 inherit | 개인 owner 제거가 실제 diff다. 값이 A→A여도 `내 계획 → 원본 따르기`를 표시 |
| 같은 날짜 fixed pin | `inherit → fixed_date`는 날짜 값이 같아도 1개 schedule 변경. 명시 inherit만 pin 제거 |
| unscheduled | 계획 날짜 mode만 변경. 원문 날짜/시간·ExecutionPlacement·회차·완료를 삭제했다고 표시하지 않음. 기존 반복 domain 차단이면 저장 가능한 요약을 만들지 않음 |
| imported memo 부재 | 상속 표시 `개인 메모 없음`. source 설명과 무관 |
| imported memo `''` | 존재하는 기존 개인 메모의 빈 값. 부재로 통합하지 않음 |
| memo 명시 `''` | 이전 개인 메모를 비우는 intent. baseline과 같은 경우의 제거 여부는 실제 normalizer가 결정 |
| memo CRLF/공백/같은 길이의 다른 본문 | exact 문자열로 비교. 제어문자 제거/trim은 저장이나 equality에 적용하지 않음 |
| 구간 alias/reset | capability가 확인된 구간만 1개 field 변경, 소유 ref는 Flow. 같은 제목의 다른 구간을 합치지 않음 |
| A1/B1/A2 Plan 순열/reset | 전체 full refs를 비교해 `flow.item-order` 1개 변경. Step membership와 TimelineOrder는 그대로 |

`changedFieldCount`는 의미가 바뀐 필드 수, `affectedRefs`는 그 필드의 직접 저장 owner들의 고유 집합이다. 예: 구간 1개 + 순서 + Item 한 개의 메모/날짜 = 필드4, 직접 대상은 Flow1 + Item1이다. 구간 내 Item 열 개가 새 이름으로 보인다고 affectedRefs를 열 개로 늘리지 않는다. UI는 `Flow 1개 · 할 일 1개 · 변경 4건`처럼 종류를 구별한다. 전체 Item 개수가 필요하면 `전체 n개 유지`로 따로 표시하며 제외0을 만들지 않는다.

## 4. 최소 API 선택

### 권고: P의 사적 정규화에서 captured summary를 만들기

현재 P의 공개 baseline/draft만으로는 “source와 같아진 예전 개인 intent의 보존”까지 안전하게 복제하기 어렵다. app에서 `normalizedStructureIntent`를 새로 구현하거나 가짜 now로 C 전이를 매 타이핑마다 호출하지 않는다.

후속 승인 후보는 **표시 전용 P API 하나**다. 아래 이름·shape는 아직 구현되지 않았다.

```js
P.summarizeCapturedPersonalPlanChanges({
  context,       // genuine source-v3 또는 structure-v4 editor context
  draft,         // 해당 context의 전체 Plan draft
  compareDraft,  // 선택: child 미리보기의 검증된 부모 staged baseline
})
// {ok:true, scope:'captured-plan-changes', changed, changes,
//  affectedRefs, changedFieldCount, flowCount, itemCount}
// 또는 {ok:false, scope:'captured-plan-changes', reason}
```

- compareDraft 부재면 사적으로 보관한 opened draft/overlay/structure와 비교한다. 선택 인자가 있으면 같은 genuine context의 **전체** draft로 strict 검증·정규화한 뒤 비교한다. 이 선택 입력은 비교 기준일 뿐 권한이 아니다. foreign ref/mode/unknown/getter/부분 Plan은 거절한다.
- source-v3와 structure-v4는 기존 private Map으로 구별한다. 버전 숫자나 caller `trusted:true`로 열지 않는다. raw v1/v2를 source-bound로 자동 승격하지 않는다.
- 실제 `normalizedSourceIntent`, `normalizedStructureIntent`, 기존 domain 검사 로직을 공유한다. 비교를 위해 새 저장 candidate/revision/Undo/now를 발급하지 않는다. 내부 검사에 쓰는 임시 state가 있더라도 반환하지 않는다.
- 반환값은 frozen 표시 자료다. rawState, rawText, source raw/hash, source token, editor token, guard, 저장 candidate, retry payload는 포함하지 않는다. summary 성공은 **captured 입력 유효성**이며 현재 freshness·canEdit·저장 허가가 아니다.
- before/after의 실질 비교는 축약 전 private 값/owner/presence로 수행한다. public changes의 값·label만 160자 이하와 제어문자 없는 문자열로 만든다. UI가 다시 그 문자열을 비교해 change를 제거하지 않는다.
- 순서 ref 문자열을 직접 노출하지 않는다. 순서 before/after는 짧은 제목과 위치로 표시하되 내부 field key/full refs는 그대로 보존한다. 동일 제목도 위치와 실제 ref로 구별한다.

**표시 축약 충돌:** 실제 변경인 두 값이 축약 뒤 같으면 `변경 전 · n자 → 변경 후 · n자` 또는 `기존 순서 · n개 → 변경된 순서 · n개`처럼 두 상태를 구분한다. 글자 수는 기존 JS string.length 규칙으로 고정해 구현 간 검산한다. 긴 메모의 내용을 임의로 요약·평가하거나 rawText를 싣지 않는다. 작고 안전한 값은 exact 표시한다.

**큰 Flow:** React receipt validator의 100개 제한을 제품의 편집 한도로 확대하지 않는다. semantic changes/unique refs는 전체를 메모리에서 정확히 집계하고, presenter만 교체 가능한 작은 창으로 나눈다(후보: 최대100개 표시+나머지 수/다음 목록). 누락된 ref를 “영향 없음”으로 집계하지 않는다. 기존 React receipt 객체에 100개 넘는 자료를 억지로 넣거나 affectedRefs를 자르고 count를 다르게 넘기는 안은 금지한다. standalone B3 owner가 표시 창을 소유하고, React의 제한 경계는 별도 compatibility RED 후 좁게 조정한다. 새 저장 schema나 receipt 영구 저장은 필요 없다.

### 대안 검토

| 대안 | 장점 | 채택 판단 |
| --- | --- | --- |
| 현행 React summarize 함수 통째 runtime 변환 | 빠른 UI 형식 공유 | 정규화 전/축약 충돌/100 entries 문제를 그대로 복제하므로 불가 |
| app에서 공개 baseline으로 직접 diff | P 변경 없음 | source-equal 기존 intent 보존을 중복 구현하고 owner 차이를 놓칠 위험. 권고하지 않음 |
| P captured API + 공통 순수 표시 helper | 실제 normalize와 일치, I/O·권한·UI 독립 | 권고. React DTO의 owner/field/value 의미를 재사용하되 validator 전체를 먼저 바꾸지 않음 |

React는 자신의 기존 `normalizePersonalWorkspacePocPlanOverlay`와 저장 preflight 결과를 기준으로 같은 의미를 만들고, 문자열 축약/표현만 공유한다. standalone P를 React로 import하거나 React read-model을 가짜 standalone state로 변환하지 않는다. 같은 fixture에서 summary/no-op/owner/count의 동등성을 검증한다.

## 5. 미리보기와 실제 attempt 연결

1. **Plan 열기:** existing `planEditorPresentation.context`와 E2 root session의 동일 source 관측을 유지한다. 최초 summary는 P captured API가 만든다. 읽기만으로 journal/target/성공 수를 바꾸지 않는다.
2. **Item 임시 편집:** child-open 시점의 부모 staged draft를 비교 기준으로 고정한다. 임시 child를 해당 ref 한 곳에 합친 전체 draft를 검증해 `Plan에 반영할 내용`을 표시한다. 부모의 다른 수정·구간/순서는 중복 집계하지 않는다. 아직 부모 반영/저장 성공 영수증이 아니다.
3. **Item 반영:** 기존 E2 scoped apply를 통과한 뒤 부모 summary를 opened Plan 기준으로 다시 계산한다. storage/journal0. 반영 실패/domain 오류면 child 값과 부모 baseline 유지, 오류가 summary보다 우선한다.
4. **Plan 최종 저장:** 현재 입력을 E2에 반영하고 captured summary를 갱신한다. 실제 E2 begin이 live raw/source/epoch/C를 검증한다. begin의 no-op이 최종 판정이며 summary.changed만으로 submit을 열거나 닫지 않는다.
5. **같은 attempt 고정:** begin 성공 후 exact `prepared.attempt`를 key로 메모리 WeakMap에 frozen summary, sessionId/revision, before/candidate raw, returnPoint를 묶는다. UI 요약용 context와 E2 저장 context의 관측이 다르면 저장 전 차단하고 값 유지. candidate의 실제 개인 metadata 차이와 summary의 의미가 맞는지 전용 회귀로 고정한다.
6. **재시도:** 같은 E2 attempt 객체일 때만 같은 summary를 사용한다. 입력 변경으로 attempt가 폐기되면 새로운 요약을 계산한다. summary 때문에 retry attempt/guard를 재발급하거나 source drift를 지우지 않는다.
7. **결과 수신:** active session·attempt·submission 동일 여부와 genuine `finishSave` 결과를 먼저 확인한다. accepted close + committed + cleanup.ok/canResume + S ready + exact candidate adoption 뒤에만 활성 성공 영수증을 발행한다. “저장 중”의 예상 차이가 실패 결과에서 실제 적용된 차이처럼 표시되면 안 된다.

현재 app의 32ms callback owner 검사와 E2 outcome 한 번 소비는 유지한다. 부모/child/다른 Flow/Quick로 초점이나 session이 바뀐 뒤 도착한 callback은 다른 영수증·초안을 덮을 수 없다. summary WeakMap의 값은 화면 닫기·attempt 폐기·정상 완료 후 불필요하게 유지하지 않는다.

## 6. 상태·복구·호환 표

| 상태 | 표시와 행동 | 영수증/저장·복구 경계 |
| --- | --- | --- |
| 정상 초안 | `반영 전 확인` 한 영역. 필드 before→after, 직접 대상·변경 수 | 저장0. 매 키 입력마다 live announcement하지 않음 |
| invalid/domain 불가 | 해당 필드 오류와 한 오류 owner. 필요 시 `입력을 확인하면 변경 내용을 볼 수 있어요` | 성공 가능한 diff로 위장하지 않음. summary 실패가 값 초기화를 유발하지 않음 |
| no-op | `같은 내용이라 저장하지 않았습니다.` | begin/candidate의 판정, target/journal0, 신규 성공/Undo0. 이전 성공을 새 성공처럼 재발행하지 않음 |
| 취소/discard | `저장하지 않은 변경을 버렸어요.` / child는 부모 유지 범위 | 기존 dirty dialog만. discarded preview를 적용 결과로 표시하지 않음 |
| saving | `Plan 변경 n건을 저장하고 있어요.` | 입력·닫기·중복 submit 잠금, 예상 요약은 아직 적용 전 |
| verified 실패 | `저장하지 못했어요. 입력은 유지했습니다.` + retry | 같은 attempt의 적용 예정 요약만 유지. target 변경/성공 수를 미리 올리지 않음 |
| prepared/commit uncertain | 기존 복구 gate와 명시 이전 상태 복구 | 성공 영수증/Undo 없음. before/candidate/journal 소유 확인 없이 자동 복구 쓰기 없음 |
| confirmed, cleanup/canResume 미확인 | `저장은 확인했습니다. 정리 확인이 필요해요.` | durable 사실은 인정, active 성공 영수증과 Undo는 아직 없음. target rollback 금지 |
| 같은 runtime에서 confirmed 정리 성공 | 같은 보존 attempt와 exact candidate가 있으면 1회 성공 영수증 | target 새쓰기0. 기존 성공 count 1회를 중복 가산하지 않음 |
| reload의 confirmed 정리 성공 | `이전에 저장한 상태와 정리를 확인했습니다.` | 원래 memory attempt가 없으므로 상세 신규 성공 영수증·새 runtime 성공 수를 제조하지 않음. 저장된 checkpoint/일반 Undo는 별개 |
| prepared 복구 뒤 같은 source 재개 | 기존 decoder가 돌려준 초안을 명시 재개, 새 session에서 미리보기 | 이전 실패 attempt를 성공으로 복원하지 않음. 새 명시 저장만 새 영수증 |
| source 변경/ABA·복구 보관 | 기존 읽기 보관/reopen gate | raw가 같아져도 epoch가 달랐으면 old summary를 현재 권한으로 사용하지 않음 |
| v1/v2/v3 journal | 각 기존 decoder·복구 문법 그대로 | v4 field/section/order를 제조하지 않음. v3 genuine context는 core summary만, raw v1/v2는 현재 정확한 일반 저장/복구 안내 유지. 명시 새 v4 편집 후에만 새 구조 summary |
| Quick | 기존 독립 root/날짜·메모·폴더 저장 범위 | Plan context/section/order로 변환하지 않음. 기존 Quick receipt/복구 회귀 유지 |

target 1회와 journal prepared/confirmed set·remove를 합쳐 “저장 API 1회”라고 표시하지 않는다. 정상 E2는 논리 transaction1, target set1, 보조 journal API3인 계약이다. 실패/throw-after/cleanup 재시도는 실제 호출과 durable 사실을 별도 기록하며 B3가 저장 counter를 재정의하지 않는다. 성공 후 표시 실패가 저장된 성공을 rollback시키면 안 된다.

## 7. 영수증 owner·Undo·초점·live

Plan 영수증은 임시 UI owner다. 새 journal field, 독립 Undo snapshot, 새 storage key를 만들지 않는다. 내부로는 exact attempt와 마지막 성공 target raw·workspace/source epoch/lane·scopeRef를 묶고, renderer에는 bounded 공개 값만 넘긴다. 이전 원문/초안 bytes를 data attribute나 export에 넣지 않는다.

우선순위는 **recovery → active editor → pending → 현재 Plan/authoring receipt → K2C 이동 결과**다. `contextualFacts.receiptOwnerId`에 활성 Plan receipt도 반영하고 기존 `F.selectResult`의 receipt 차단을 소비한다. F의 move-date/move-order operation을 Plan 저장처럼 사용하지 않는다. 새 Plan 저장 이후 기존 contextual 결과를 복원하거나 동시에 읽지 않는다.

`이 변경 되돌리기`는 receipt id·same success raw·lane workspace·현재 S authority·hasUndo·editor/recovery/pending0을 확인한 다음 C.undoCheckpoint와 기존 workspace writer를 호출한다. 일반 `undo()`의 source/creator 우선 선택 경로를 호출하지 않는다. 임시 receipt에 before checkpoint를 넣어 독자 복원하지 않는다. Undo 성공은 원래 receipt와 연결한 `undone`, 실패는 원래 success+정확 실패 상태, 외부 변경/다른 lane은 오래된 버튼0쓰기다. 종료·화면 이동·reload로 숨긴 receipt를 old DOM replay로 되살리지 않는다.

배치는 기존 Plan 폼 마지막 목록 다음의 한 요약 영역, 성공 시 원래 복귀 화면의 Flow/결과 제목 가까운 한 결과 영역을 권고한다. 새 페이지·wizard·동일 기능 CTA·별도 고정 하단 바를 만들지 않는다. 현재 `finishEditorClose`의 view/result tab/date/page/scroll/opener 복귀를 먼저 완료한 뒤, 같은 session 종료 callback 안에서 결과를 붙인다. 키보드 초점은 기존 opener→같은 Flow의 접근 가능한 행동→화면 제목 fallback을 보존하고, 자동으로 toast에 옮기지 않는다. `닫기`는 UI0쓰기이며 그 결과 버튼으로부터 합리적인 원래 행동에 복귀한다.

live owner는 하나다. 정상 미리보기는 일반 문서 영역, saving/success는 짧은 atomic polite 문장, invalid/recovery는 기존 한 alert다. saveStatus·toast·영수증이 같은 성공을 세 번 읽지 않도록 Plan receipt 활성 시 기존 반복 live를 끈다. 우선순위 변경 후 숨긴 영역은 aria-hidden만 남기지 말고 포커스 가능한 자식도 제거/비활성화한다. details/paging을 펼쳐도 새로운 저장이나 성공 수를 만들지 않는다.

## 8. 승인 후 작은 실행 순서와 검사

| 묶음 | 구현 전→구현→검증 |
| --- | --- |
| B3-A 의미 모델 | RISK1–4 RED fixture부터 → P captured summary + 필요한 shared presenter만 → 정상/동값 title·same-date pin·메모 owner/CRLF·same-length collision·구간/순서·source update·opaque/unknown/domain negative |
| B3-B 같은 attempt UI | E2 저장 전후/cleanup의 exact 연결 설계 확인 → Plan/child preview, memory attempt binding, 한 receipt owner → failed/noop/canceled/double/retry/late callback/foreign epoch·old recovery·Quick 회귀 |
| B3-C Undo·전체 동등성 | explicit C Undo와 source/creator 경쟁 fixture → 기존 writer 연결 → 실제 4 origin+authored 저장/reload/Undo, 5 viewport, 키보드·초점·live·복사/결과 불변, 전체 test/build |

예정 순수 시험은 12~18개 등록 묶음으로 제한해 먼저 실패를 확인한다. 핵심은 ① 같은 raw 표시와 다른 owner ② normalize 후 no-op ③ fixed 동값 pin ④ imported memo 부재/빈/CRLF ⑤ 동일 길이 메모·order 축약 충돌 ⑥ section/order Flow ref 집계 ⑦ 전체 ref/field 중복·unknown ⑧ 큰 Flow의 정확 total과 표시 창 ⑨ genuine context/foreign/부분/invalid ⑩ candidate와 summary의 exact 동등성 ⑪ 실패/cleanup/recovery ⑫ late callback와 명시 Undo다. 숫자는 계획이며 실행 수가 아니다.

브라우저는 한 smoke 후 12~16개 bounded 시나리오로 묶는다. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 첫/마지막 필드·요약·저장/취소·retry·영수증 Undo/닫기의 full rect와 다점 hit target, 가로 넘침·console/page error0을 확인한다. 특히 긴 동일 길이 CRLF memo, 구간 여러 개, 전체 order-only 저장, source Undo가 있는 같은 Flow의 Plan Undo를 필수로 넣는다. target/journal API와 논리 성공 수·child0/최종1을 분리하고 운영 sentinel을 exact 비교한다.

## 9. 현재 인계 상태

이 설계의 스킬 검토는 flow-ux-review의 중복 제거/한 주 행동/원문·오류·복구 보존, ui-ux-pro-max의 제출 feedback·contextual live status 지침에 한정했다. 관련 local UX 검색 결과를 확인했으며 전역 디자인 시스템은 만들지 않았다. Figma routing은 검토했으나 문서·코드 계약 대조가 목표라 Figma를 사용하지 않았다. 접근성 점수나 화면 PASS를 새로 부여하지 않는다.

조사 기준 SHA: React summary `5FAABE99E4F218B170FD5673B3C3550C324FD95423286A4DEA5ECC529F0AD716`, Plan model `64FFBC4D91469586B7ECFA4253C3AE5A29F64BA6454728E446FA5463841317C5`, receipt DTO `729E391F29928C271969EB3D2E762A0A9B7947BE9E6865FF901B8EAAAD44BA3D`, E2 `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2`, app 읽기 시점 `6EABC405CA394FC7E03052DE9EDBCAF14C8144CD838B2B3EBF2FC91A6623346B`. app은 main의 B2 후보이므로 구현 직전 함수·hash를 다시 확인한다.

제품/테스트/브라우저 새 실행 0. 실제 Android/iOS·가상 키보드·실 보조기술 NOT_RUN, 관찰 사용자0. commit/push/PR/Preview/Production 없음. 지금 필요한 결정은 위 **P captured API와 표시 창/영수증 owner 계약의 구현 승인**이며, 새 영구 제품 정책을 사용자에게 확정하도록 요청하는 단계가 아니다.
