# K3-B B2-a — 구간·전체 순서 버전 계약 변경안

2026-09-05. 최초 작성은 **구현 전 검토안과 새 순수 RED 검사**였다. 이후 main이 이 계약과 [독립 검토](./k3b-section-order-independent-review.md)를 읽고 P-only 구현을 승인했다. P 첫 동결 및 실제 실행은 [P 전용 QA](./k3b-section-order-plan-qa.md)에 분리한다. 이 문서의 최초 RED 기록은 유지하며 B2 UI 전체 완료를 뜻하지 않는다. 진행 순서는 기존 승인대로 **B1 UI 검증 → B2 → B3**다. [준비 문서](./k3b-next-batch-readiness.md)의 B3-a 선행 제안은 채택되지 않았다.

## 1. 근거와 이번 완료 범위

[B2 설계](./k3b-plan-section-order-design.md) 전문, [K3-B 설계](./k3b-design.md), [P2-C 정본](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md), 현행 P/C/E2/D/PD와 React의 capability·materializer·Plan editor·composition을 대조했다. 원본 대화를 새로 조회하거나 모든 원자 요구를 재검사한 기록은 아니다.

- `D1-012 / B-T09`: 개인 소유가 증명된 stable section의 개인 별칭. 원본 Step 제목 역수정 금지.
- `B-T10`: 전체 Flow Item의 full-ref 순열. 구간 제목 권한과 독립이며 Step 소속·실행 날짜·완료·수동 TimelineOrder를 바꾸지 않는다.
- `B-T07 / B-T13`: child는 자기 필드만 staged 반영한다. source 합성 뒤 개인 값을 읽고 raw/source/Undo의 다른 owner를 덮지 않는다.
- B1의 opaque source context, C 전체 checkpoint 결합, E2 실제 bytes/epoch·ABA·지속 복구, D의 정확 대상 삭제, PD의 현재/Undo-P gate는 축소하지 않는다.

계약 승인 후 모델을 구현할 수 있게 **이름·자료 모양·호환·미지원 범위**를 정하는 단계다. 아래 12개 RED는 전체 B2 검증 목록이 아니며, 역사 characterization 5개 PASS를 제품 구현 PASS로 바꾸지 않는다. 이번 문서의 버전 번호는 PoC 기술 계약이지 운영 schema나 영구 제품 정책이 아니다.

## 2. 실제 section 소유 근거

| 입력 | 실제 근거 | 이번 B2의 제목/순서 권한 |
| --- | --- | --- |
| React structural personal-draft | `personal-draft-structural-edit.ts:88`의 draft status, `url-draft-` slug, `내 초안` tag, source title 두 값 + read-model `projectFlowSections`의 실제 bundle section id/order/Item membership | 이미 검증된 section만 별칭. origin 문자열만으로 확대하지 않음. 전체 순서는 독립 허용 |
| React authoring-handoff | `personal-workspace-poc-authoring.ts:1085`의 supported 명시 `##` line → 최초 발급 sectionId → `identityMap['section:line:…']`와 Item.sectionId | 최초 저장 ID를 재사용. 수정한 제목/현재 배열 index로 새 owner 생성0 |
| standalone 명시 `##` 작성 저장본 | actual `M.makeHandoff` → `M.apply(commit-authoring)`, exact raw/fingerprint/handoff tuple, 저장 Step id·Item full refs·sourceLine, 원래 parser membership | 아래 검증을 통과한 **명시 구간만** 별칭. 전체 순서 허용 |
| standalone 무구간 작성본/Quick→Flow | parser와 conversion writer가 `할 일`/`step-1`을 자동 생성. React supported `##`와 다른 derived 값 | section readonly. 전체 순서는 허용. 자동 Step을 개인 구간 정책으로 승격하지 않음 |
| standalone memo seed/일반 personal-draft | `outline`이 저장돼 있지만 React imported bundle proof는 없다 | section readonly. 출처 없는 seed catalog 승인은 이번에 하지 않음. 전체 순서는 정확 Flow/Item identity 검증 후 허용 |
| canonical-personal-copy / source-backed-map / legacy-saved-plan | 기존 source-owned/derived Step | section readonly, 전체 순서는 허용 |
| 손상/unknown origin | 기존 M/P/C fail-closed | 정상 편집 후보로 만들지 않음 |

### 작성 저장본의 bounded proof

`model.js:621~736,2142~2169`의 최초 저장 알고리즘을 검증기로 재사용하되 **기존 자료의 id 부재를 채우는 materializer로 사용하지 않는다.** 실제 raw를 parse해 확인된 명시 `##` line과 원래 parsed Item sourceLine들을 구하고, 현재 저장된 nonempty·trim-exact·unique Step id, full Flow tuple, Item refs와 소속이 그 최초 결과에 정확히 연결되는지 대조한다. 빈 `##`를 건너뛴 경우 저장 id에 번호가 비는 기존 동작도 보존한다. 같은 제목은 가능하지만 같은 id는 별개 구간으로 인정하지 않는다.

id 비교를 위해 최초 알고리즘의 기대값을 계산하는 것과 누락된 id를 발급하는 것은 다르다. 후자는 금지한다. `standaloneAuthoredFlowForSourceUpdate`의 `step.id || step-N`과 `poc-shadow` 표시는 proof가 아니다. source-confirmed boolean을 새 payload flag로 받지도 않는다. 후속 source update는 원래 저장 raw/proof를 유지하고, strict source reader가 검증한 **동일 full-ref 집합·구간 소속·source 순서** view의 제목만 inherit baseline으로 쓴다. 같은 Item 집합만으로 원문 재정렬을 지원한다고 말하지 않는다(B2R01 정정).

id missing/duplicate/derived인 Step을 일반 M validator에서 새로 거절해 기존 자료 전체를 깨뜨리지 않는다. 명시 handoff의 저장 구조 증명은 Flow 단위로 검사하여 id missing/duplicate로 전체 결합이 깨지면 해당 Flow의 sectionTitles를 비운다. 나머지 id를 이용해 부분 owner를 복구하지 않는다. 증명이 정상이지만 일부 구간이 implicit인 경우에는 그 derived 구간만 readonly다. 독립 full Item identity가 정상이면 전체 순서는 가능하다. raw Step의 현재 index는 **보기 위치**로만 쓸 수 있고 저장 owner가 될 수 없다.

## 3. version diff — 저장 key와 module ABI는 그대로

| 계층 | 현행 | 제안 |
| --- | --- | --- |
| workspace | C `version:2`, 기존 workspace-v2 key | 그대로. 새 storage key/별도 Undo 없음 |
| P module ABI | `VERSION=1`, `CONTRACT=…context-v1` | 기존 상수/함수 유지. 신규 `STRUCTURE_DRAFT_VERSION=2`, `STRUCTURE_METADATA_VERSION=2`, `STRUCTURE_CONTRACT='flowme-standalone-personal-plan-context-v2'` 추가 |
| metadata 위치 | `personalPlanContextV1` | 위치 유지. 이름의 V1이 아니라 **안쪽 version+contract**로 dual decode |
| metadata header | `{version:1,contract:…v1,entries}` | v1 그대로 허용 + `{version:2,contract:…v2,entries}` branch |
| entry | `{binding,legacyPlanFields,overlay}` | v2에서도 이 exact v1 entry 형태 허용. B2를 변경한 선택 entry만 optional strict `structure` 추가 |
| draft | v1 identity/title/items | 새 source-bound **version2** identity/title/items + required `sectionTitles`, `orderedItemRefs` |
| E2 draft contract | source-bound-personal-plan-draft-v1 | 신규 `flowme-standalone-source-bound-personal-plan-draft-v2` |
| E2 recovery payload | version1/2/3 | 기존 decoder 보존 + B2 draft에만 version4. 현재 recovery key 유지 |

### 새 entry의 자료 모양

```text
personalPlanContextV1 = {
  version: 2,
  contract: 'flowme-standalone-personal-plan-context-v2',
  entries: {
    [fullFlowRef]: {
      binding, legacyPlanFields, overlay,        // 기존 의미·정확 모양
      structure?: {
        version: 1,
        capture: {
          rawSteps,                            // 해당 raw Flow.steps의 exact JSON-value
          originalItemRefs,                    // 최초 raw membership 순서, full refs
          editableSections: [{
            sectionId, sourceLine, itemRefs      // 검증된 명시 source line + exact membership
          }]
        },
        sectionTitles?: { [exactSectionId]: string },
        orderedItemRefs?: string[]
      }
    }
  }
}
```

`structure`가 있다면 sectionTitles/order 중 실제 차이가 하나 이상 있어야 한다. 원래 순서와 같은 배열·빈 map을 저장하는 것은 정규화된 override가 아니다. rawSteps는 선택 Flow 소유의 기존 JSON-value를 캡처하는 것이며, unknown field를 새로 해석하거나 허용 목록 밖 owner를 추정하지 않는다. 현재 raw Steps와 정확히 같아야 한다. raw unknown은 원래 위치에 보존되고 view로 다시 쓰지 않는다. editableSections는 데이터가 주장하는 권한이 아니라 actual parser/tuple/sourceLine 검사로 매번 검증할 증거다.

**구조만 바꿀 수 있어야 한다.** 기존 P `validateOverlay`는 empty core overlay를 거절한다. v2의 유효한 nonempty `structure`를 가진 entry만 core `{flowRef,savedCopyId,flowId,items:{}}`를 허용한다. structure 없는 entry와 v1의 empty-overlay 거절은 유지한다. 이 예외를 unknown field 통과로 구현하면 안 된다.

raw capture와 inherit baseline은 다르다. rawSteps/legacyPlanFields는 옛 원문/개인 baseline 소유를 고정한다. 편집 context의 inherit section title와 원래 순서는 검증된 **현재 source-before-personal view**에서 가져온다. source B가 적용된 후 원래 A를 명시 입력하면 개인 A override이며, raw A와 같다는 이유로 없애지 않는다. 사본의 새 source id를 기존 제목 유사도로 맞추지 않는다.

### 호환과 전환 시점

1. metadata 없음, v1 current/Undo는 기존 그대로 읽는다. 열기·검사·no-op·취소에서 version 승격/저장0.
2. v1 자료에서 처음 **명시 구조 변경을 저장**할 때 선택 entry에만 structure를 만들고 root header를 v2로 바꾼다. 이웃 entry/기존 core capture를 새 baseline으로 자동 재작성하지 않는다. 이전 전체 state가 그대로 Undo여서 v2 current + v1 Undo를 허용한다.
3. 새 v2 context라도 core 필드만 변경했다면 v1 payload를 굳이 승격하지 않는다. 이미 v2인 root는 마지막 structure 제거 후 core entry가 남으면 v2로 유지한다. 아무 entry도 남지 않으면 기존 규칙대로 root를 제거한다. 조회 중 자동 downgrade는 없다.
4. 기존 v1 편집 함수는 새 필드를 받지 않는다. dual metadata 검증 뒤 기존 core 수정이 구조를 exact 보존할 수 있을 때만 그대로 처리한다. 지원하지 않는 결합은 explicit unavailable로 차단하며 구조 삭제/빈 값으로 초기화0. 이웃 v2 entry를 가진 old writer를 무조건 성공시키는 주장도 하지 않는다.
5. C legacyBaseRaw·legacy archive 안의 reserved key는 계속 충돌이다. v2 metadata를 old v1 envelope에 숨겨 넣어 자동 migration하지 않는다. malformed/unknown version은 old fallback0.
6. 예전 client의 후속 old key 쓰기는 기존 C/S exact legacy-base drift gate로 차단한다. v2를 모르는 오래된 binary의 정상 UI 호환을 보장하는 계약은 아니다.

## 4. 신규 순수 API와 source/opaque 경계

P의 기존 Sa/Sb API는 유지하고 아래 **별도 B2 API**를 제안한다. 새 context는 기존 raw context/source read context/B1 editor context와 서로 바꿔 쓸 수 없다.

```text
inspectPersonalPlanStructureEditor({ sourceContext, flowRef })
  -> {ok:true,context,draft,structure} | {ok:false,reason}

validateCapturedPersonalPlanStructureDraft({ context,draft })
  -> {ok:true,scope:'captured-structure-draft'} | {ok:false,reason}

planPersonalPlanStructureState({ context,rawState,sourceRead,sourceEpoch,draft,now })
  -> 기존 planner와 같은 {ok,changed,state,undo,...}

readPersonalPlanStructureView({ sourceContext,flowRef })
  -> {ok:true,viewOnly:true,flowRef,sections,orderedItemRefs} | {ok:false,reason}
```

새 draft exact keys는 `{version:2,flowRef,savedCopyId,flowId,title,items,sectionTitles,orderedItemRefs}`다. title/items의 세 mode와 raw memo 보존은 B1과 같다. sectionTitles는 **editable exact id 집합 전체**만 가지며 각 값은 `{mode:'inherit'}` 또는 `{mode:'override',value}`다. readonly의 map은 비어 있다. orderedItemRefs는 현재 대상 Flow의 모든 full Item ref를 정확히 한 번 포함한다. **새 section 값만** 기존 React `validateTextDraft(allowEmpty:false)`의 nonblank·trim-exact를 따른다. 내부 newline 금지는 원래 검사에 없어 추가하지 않는다. v1/core의 더 넓은 제목 허용과 memo 공백·CRLF는 그대로 보존한다. 최초 문서의 ‘한 줄 기존 규칙’ 표현은 실제 코드와 달랐고 독립 B2R02 검토 후 정정했다.

structure view의 section은 exact 저장 id가 입증되지 않았으면 `sectionId:null`/readonly로 표현할 수 있다. 이를 쓰기 ref로 돌려주지 않는다. valid stored id라도 unproven/derived/source-owned라면 readonly다. `sections`는 표시 catalog이며 `orderedItemRefs`가 전체 선형 순서를 소유한다. 내 별칭과 sourceTitle를 구별하고 raw/opaque 정보를 일반 UI에 노출하지 않는다.

C 신규 `inspectSourceBoundPersonalPlanStructureContext(checkpoint,observation,options?)` → C-issued token을 발급하고 `commit-source-bound-personal-plan-structure-context` action만 받는다. 현재/Undo/legacy 전체 signature binding, exact action keys, candidate revision+1/전 state Undo, raw/source-before→personal-after 검증을 재사용한다. 직접 P token·B1 C token·clone/reconstructed token으로 새 action을 열 수 없다. optional trusted module injection은 테스트/의존성 경계일 뿐 사용자 payload의 permission flag가 아니다.

P capture는 JSON-value와 source byte/epoch를, C는 whole checkpoint를, E2는 실제 storage exact bytes와 관찰 epoch/ABA를 각각 맡는다. source 실패를 `{ok:true,raw:null}`로 바꾸지 않고, reselect만 새 context를 발급한다. getter/toJSON/배열 descriptor·foreign prototype을 평가 전에 거절하고 표준 cross-realm JSON-container는 현재 허용 범위를 유지한다.

## 5. 전체 순서와 소비자 연결

예를 들어 원본 Step A의 A1/A2, Step B의 B1이 있을 때 개인 순서 `A1,B1,A2`는 **세 행 그대로** 읽어야 한다. Step별 flatten으로 `A1,A2,B1`을 다시 만드는 것은 미구현이다. raw `flow.steps`, task 배열, Step.itemIds는 바꾸지 않는다. 각 행에는 원래 section membership과 그 section의 effective 제목이 남는다.

| 소비자 | 필요한 변경/불변 |
| --- | --- |
| P source reader | source 합성 뒤 v1/v2 core 표시, 별도 structure catalog/order. source/개인 제목을 역으로 raw에 저장0 |
| PD 표시 facade | current P가 v2여도 strict source gate. 실패 시 raw 정상 fallback0. no-P legacy 지원·실행 전용 표시 유지 |
| Flow/Item 상세·Plan editor | 같은 reader에서 행 ref/order/title. child open/save가 parent section/order를 보존 |
| Text/Todo/Sheet/TXT | 전 ref 순서대로 행을 만들고 각 행의 원래 구간 문맥 표시. 중간 Step 반복을 핑계로 재그룹0 |
| Calendar/기간 | 날짜 bucket 및 명시 time·수동 timeline order/rank 우선. 동일 bucket의 tie baseline만 승인 React effective order와 대조. 날짜순 화면을 Plan 전체 순서로 무조건 바꾸지 않음 |
| C.projectGroups | 지금은 raw 실행 id/date/time/done과 timeline 기록을 소유. 구조 view를 raw로 넣거나 별도 rank writer 만들지 않음 |
| 결과 다운로드 | 기존 source/개인 scope 유지. 화면에서 보이는 개인 순서를 다운로드가 원문 구조로 오인하게 하지 않음. roundtrip 근거 필요 |

기존 React composition은 ordered refs를 effective sourceOrder에 투영하고 수동 TimelineOrder가 우선한다. 그래서 **persistent TimelineOrder/date/time/done가 exact 불변**임을 검사하되 수동 순서 없는 동률의 표시까지 무조건 같다고 주장하지 않는다. React UI에 원래 순서 복귀 control이 실제 있는지는 별도 확인·구현 과제로 남는다.

source added Item/새 section/retained ref 삭제/Step 소속 변화와 **같은 구간 안의 원문 순서 변경**은 현재 standalone strict P가 미지원이다. B2-a/b는 **동일 full-ref 집합·구간 소속·source 순서에서의 source 값 변경**만 연다. 개인 global order는 이 원문 순서와 독립이다. React가 검증된 새 ref를 뒤에 붙이는 read reconciliation은 기존 근거지만 standalone의 raw execution member 초기화/reader 문제를 해결한 것으로 세지 않는다. pending/deferred를 applied로 보거나 source update 쓰기 전 P current/실제 Undo 검사에서 이 제한을 우회하지 않는다.

## 6. E2/S 복구·일반 action·D 삭제 파급

- E2 B2 session은 실제 storage/source 관측으로 C 새 inspector를 호출한다. child draft는 title/memo/schedule만 가지되 parent full version2 draft의 sectionTitles/order는 exact 보존한다. clean/dirty 닫기, 실패 input, focus/scroll, native/history, target/journal0 규칙은 K1-B 그대로다.
- 새 journal version4는 beforeRaw/candidateRaw/updated draft + 실제 sourceReadSnapshot으로 새 C action을 **재계산**해서 검증한다. opaque context를 JSON으로 복원하지 않는다. version1/2/3 decoder와 reopen path는 그대로 유지하고 version4를3으로 낮추지 않는다. S의 current journal classifier도 E2 actual decoder와 함께 연결해야 한다.
- prepared 복구는 exact before, confirmed 정리는 candidate 보존이다. 과거/foreign journal pending이면 새 B2 writer0. read error/Quota/readback/rollback 실패/old-base drift/ABA와 double submit은 같은 authority gate를 사용한다.
- 일반 move/complete/reopen/folder/Quick/trash/restore/Undo와 source candidate action은 v2 metadata를 exact 보존하거나 기존 명시 target만 처리한다. 기존 writer가 몰래 structure를 삭제/정규화하지 못하도록 별도 회귀가 필요하다. Reset은 기존 exact PoC key transaction 범위이며 source gate 우회 permission이 아니다.
- D는 actual P dual validator를 먼저 호출하고 **full tuple에 해당하는 entry 전체**를 scrub한다. structure capture/rawSteps/별칭/order는 그 entry 안에만 있어야 한다. current/Undo에 남아 Undo로 부활하면 안 된다. legacy/archive reserved collision, source pending/effective/Undo owner, 다른 사본/원래 Quick/receipt 보존은 기존 strict owner 검사 그대로다.
- confirmed 삭제 journal에 남은 private candidate/before bytes의 cleanup과 `deletionComplete && canResume`까지 확인해야 삭제 완료다. 새 structure entry 삭제 성공만으로 영구 삭제 전체 완료를 선언하지 않는다.

## 7. RED 목록과 후속 통과 gate

신규 [계약 RED test](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-section-order-contract.test.cjs)는 다음 **12개 등록 시나리오**다. 모든 positive 기능 검사는 실제 M 작성/seed와 C 변환/P source reader로 fixture를 먼저 검증한 뒤 존재해야 할 새 API를 `typeof === 'function'`으로 요구한다. API가 없어서 `assert.throws`만 통과하는 negative는 없다.

| ID | 새 검사의 목적 |
| --- | --- |
| B2A01 | explicit same-titled sections의 실제 저장 id와 version2 draft/capability |
| B2A02 | implicit handoff Step은 readonly, 전체 order는 독립 |
| B2A03 | 네 saved origin의 readonly section/order 분리; seed 권한 추정0 |
| B2A04 | 다른 사본 같은 local Step id의 별칭·ref 소유 분리 |
| B2A05 | 교차 Step 전 ref 순서, raw Steps/실행/unknown/TimelineOrder와 exact Undo |
| B2A06 | 누락·중복·foreign order와 readonly/unknown section draft 거절 |
| B2A07 | 구 v1 no-op 승격0, 실제 구조 변경 때 이웃 entry exact·v1 Undo |
| B2A08 | 원래 순서/구간 inherit 복귀, 기존 core 개인 메모 보존 |
| B2A09 | missing/duplicate stored Step id에 owner 보충0, order 독립 |
| B2A10 | source exact bytes/epoch drift 거절·원본 불변 |
| B2A11 | fake/clone/B1 token·getter0·읽기 detached/무변경 |
| B2A12 | C-issued 전체 checkpoint context 및 single revision/exact Undo |

미등록/미실행 후속: E2 child/journal4·prepared/confirmed·storage faults, D actual delete/cleanup, PD current/Undo-P 조합, same-membership source rename/apply/Undo·추가 Item 차단, reader별 결과/다운로드, React 동등성, 두 runtime UI·5 viewport·브라우저 boundary. 위 12개를 나중에 GREEN으로 만들어도 **B2-b 일부 모델 gate**일 뿐 B2 전체 완료가 아니다.

## 8. 실행 기록과 소스 동결

`node --check`는 PASS다. 첫 RED 실행 (로컬 전용 근거: `../../../output/k3b/section-order-contract-red-20260905.tap`)은 **고유 12개, 0 PASS / 12 FAIL**, skipped/cancelled/todo0, 400.8516ms, exit1이다. 11개는 P의 신규 inspector 부재, 마지막1개는 C의 신규 inspector 부재에서 실패했다. 각 시나리오가 사용한 기존 fixture 생성·source/C 검사는 그 앞에서 성공했다. **새 API 이후의 순열·별칭·반환·보존 assertion에는 아직 도달하지 않았다.** 따라서 이 RED로 정책·안전 요구가 충족됐다고 말하지 않는다. 제품 미구현을 긍정 PASS/expected-failure PASS로 감추지 않은 출발 증거다.

전체 npm/build·브라우저·실제 기기·IME/보조기술은 이 하위 작업 범위 밖, 관찰 사용자0. 제품 파일/기존 characterization5/원래 테스트/HTML 변경0. commit/push/PR/Preview/Production 없음. 아래 6개 제품 해시는 검사 전후 모두 동일했다. `npm.cmd run docs:check` PASS(required files16/local links5,725)는 문서 검사이며 제품 테스트 개수에 더하지 않는다.

읽은 제품 SHA256:

- P `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358`
- C `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57`
- E2 `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4`
- D `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3`
- PD `4453A1350EB5A468CBB27860B682F4BE58BB7699665D396EE340325896197458`
- M `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`
