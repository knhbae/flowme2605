# K3-B B1-G — 개인 계획 순수 adapter 계약

2026-09-05. [B1 준비 gate](./k3b-plan-lossless-gate.md)를 바탕으로 **새 순수 모듈과 시험만 구현**했다. 현재 C/E2/D/app/React/생성 HTML에는 연결하지 않았다. 영구 제품 schema나 실행 날짜 정책을 확정하는 문서가 아니다. 실행 근거는 [B1-G QA](./k3b-plan-context-qa.md)에 분리했다.

## 1. 보존 범위와 의존성

[personal-plan-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)는 저장 전 raw state 검사·draft 정규화·읽기 projection·candidate 생성만 맡는다. UMD 이름은 `FlowPocPersonalPlanContext`다. CommonJS와 UMD 모두 실제 호출 시 기존 M의 domain validator와 T의 날짜 validator를 읽는다. 모듈 초기화 시 의존성을 조회하지 않는다.

- 의존 방향은 새 adapter → M/T다. C/E2/D/app/storage/DOM/실제 시계 의존성은 없다. 후속 C → adapter는 가능하지만 M → adapter 역의존을 만들지 않는다.
- `savedCopyId + sourceFlowId + itemId`와 저장된 local id/Flow ref/Item ref/Step membership을 함께 확인한다. 제목·배열 index·부분 prefix로 대상을 추정하지 않는다.
- 기존 task/flow의 title/memo/planDate/sourceTitle/sourceDate는 candidate에서도 그대로 둔다. `sourceTitle`이 없으면 만들지 않는다. 완료·회차·실행일/시간·폴더·Step 소속·목록 순서도 변경하지 않는다.
- 일반 unknown JSON 값과 배열 순서, nullable field의 부재/값/null을 보존한다. 기존 raw 문자열의 공백까지 보존할 책임은 checkpoint의 `legacyBaseRaw`에 있다. 이 state adapter는 전체 raw envelope를 다시 serialize하지 않는다.
- optional metadata는 첫 명시적 실제 변경 candidate에만 생긴다. 읽기·open·no-op은 metadata/revision/Undo를 만들지 않는다. 별도 key·writer·독립 Undo는 없다.

## 2. 공개 API

상수는 `VERSION=1`, `METADATA_KEY='personalPlanContextV1'`, `CONTRACT='flowme-standalone-personal-plan-context-v1'`다. 실패는 `{ok:false,reason}`이며 raw/private text를 오류 메시지에 싣지 않는다.

| API | 결과와 책임 |
|---|---|
| `inspectPlanContext({state,flowRef,legacyBaseRaw?,undo?})` | `{ok:true,context,draft,baseline}`. raw domain/identity와 존재하는 **모든** Plan metadata entry를 검사한다. 선택 Flow의 presence-aware baseline을 캡처한다. 휴지통 대상은 편집 context를 발급하지 않는다. |
| `normalizePlanDraft(context,draft)` | `{ok:true,overlay}`. WeakMap의 실제 context만 허용하고 text/schedule mode·exact Item 집합을 검사한다. 반환 overlay는 frozen copy다. |
| `projectPersonalPlanState(rawState)` | `{ok:true,viewOnly:true,state}`. 복사본의 개인 title/memo/planDate만 effective 값으로 투영한다. 원본은 변경하지 않는다. |
| `planPersonalPlanState({state,context,draft,now})` | 실제 변경이면 `{ok:true,changed:true,state,undo}`. no-op이면 `{ok:true,changed:false,state:원래입력}`이며 `undo` 속성이 없다. |

`context`는 frozen `{version:1}`의 opaque reference다. private WeakMap에 exact raw state JSON과 baseline/binding을 보관한다. spread·clone·JSON 복원·임의 `{version:1}`은 context 권한이 없다. 반환 draft/baseline도 deep-frozen copy라 외부 변경이 private capture를 오염시키지 않는다. candidate/Undo는 독립 복사본이다.

`legacyBaseRaw`와 `undo`의 생략 또는 null은 해당 추가 입력을 제공하지 않았다는 의미다. **checkpoint 연결 caller는 실제 두 값을 모두 전달해야 한다.** 이 API의 undo 인자는 archive의 reserved collision 검사이며 전체 Undo domain/Plan 검사를 대신하지 않는다. C가 current와 non-null Undo를 각각 검증해야 한다. `legacyBaseRaw`의 v1 envelope 기본 shape와 reserved collision은 검사하지만, 전체 lineage/provenance 검증은 기존 C의 책임이다.

내부 `inspectMetadata`는 공개 API가 아니다. 현재 공개 입력에는 `sourceCandidateStore`가 없고, omit/null/검증된 store를 구별하는 합성 API도 없다. 임의로 추가 인자를 전달해 원본 합성이 검증됐다고 간주하지 않는다.

## 3. 실제 metadata와 draft

```ts
state.personalPlanContextV1?: {
  version: 1;
  contract: 'flowme-standalone-personal-plan-context-v1';
  entries: Record<FlowRef, {
    binding: {
      localFlowId: string; flowRef: string;
      savedCopyId: string; sourceFlowId: string;
      items: Array<{ localTaskId: string; itemRef: string; itemId: string }>;
    };
    legacyPlanFields: {
      flow: { title: string; sourceTitle?: string };
      items: Array<{
        id: string; ref: string; title: string; memo?: string;
        planDate?: string | null; sourceTitle?: string; sourceDate?: string | null;
      }>;
    };
    overlay: {
      flowRef: string; savedCopyId: string; flowId: string;
      title?: string;
      items: Record<ItemRef, {
        itemRef: string; title?: string; memo?: string;
        schedule?: { mode: 'fixed_date'; date: string } | { mode: 'unscheduled' };
      }>;
    };
  }>;
}
```

`binding.items`와 `legacyPlanFields.items`는 실제 Flow의 Step membership 순서다. capture는 좁은 기존 Plan 필드만 보관한다. 전체 checkpoint/legacy raw/실행 state를 metadata에 다시 복사하지 않는다. 모든 entry의 binding·capture는 현재 raw와 정확히 일치해야 한다. 다른 Flow의 손상 entry도 전체 Plan projection을 차단한다.

draft는 `{version,flowRef,savedCopyId,flowId,title,items}`다. title은 `{mode:'inherit'}` 또는 `{mode:'override',value:string}`이다. `items`는 모든 정확 Item ref를 한 번씩 포함한 dictionary이고 각 값은 `{itemRef,title,memo,schedule}`다. memo도 text mode이며, schedule은 `inherit`, `fixed_date + date`, `unscheduled` 중 하나다. Flow memo·장소·반복·sectionTitles·orderedItemRefs는 이 버전에서 지원하지 않는다. section/order는 빈 배열/객체만 넘겨도 거절한다.

## 4. 값과 owner 해석

| 입력 사실·의도 | 이번 adapter의 의미 |
|---|---|
| 기존 sourceTitle 부재 | baseline owner는 `existing-personal-baseline`. 현재 제목을 원문 제목으로 제조하지 않음 |
| text inherit | 이미 저장된 기존 개인 기준으로 돌아감. 원문 근거가 없으면 ‘원문 복원’으로 표시하면 안 됨 |
| 명시 title/memo가 기존 개인 기준과 같음 | 그 field의 overlay를 만들지 않음. 비교는 trim 전 exact 문자열 |
| 명시 memo가 source description과 같음 | 기존 개인 memo와 다른 값이면 개인 overlay 유지. source text와 같다는 이유로 삭제하지 않음 |
| memo 부재와 `''` | 구별함. 기존 memo 부재에서 명시 `''`는 override, 기존 `''`와 같은 명시 값은 no-op |
| title의 공백·CRLF | blank인지 trim으로 검증하되 저장 값은 정확한 원래 문자열. memo는 빈 문자열 허용 |
| 같은 날짜 fixed_date | 명시 pin 유지. 기존 날짜와 같아도 inherit로 축약하지 않음 |
| unscheduled | effective **개인 계획 날짜**만 null. raw planDate와 실행 date/time은 그대로 |
| schedule inherit | 새 schedule overlay 제거. own(planDate) → sourceDate → 기존 실행 date라는 옛 읽기 효과를 보존할 뿐, 실행 owner를 추정하지 않음 |

기존 일반 완료·폴더·실행일 변경 후에는 새 context를 발급할 수 있다. 그러나 이전 context로 저장하려 하면 전체 raw state exact 비교에서 stale로 차단한다. 저장 후 old HTML이 title/memo/planDate 같은 managed raw를 바꾸면 capture mismatch로 차단한다. 새 raw를 overlay로 숨기거나 임의로 다시 기준 삼지 않는다.

## 5. candidate·Undo·안전 검사

실제 변경 candidate에서만 revision을 정확히 1 올리고 caller가 제공한 canonical ISO `now`를 updatedAt에 쓴다. `undo`는 변경 직전 전체 state의 정확한 JSON 값·배열 순서·필드 부재를 보존한다. 마지막 override를 inherit로 되돌리면 마지막 entry/metadata도 제거한다. C는 이 결과를 같은 checkpoint에 포장하며 **revision을 다시 올리거나 별도 Undo를 만들면 안 된다**. 기존 C Undo의 timestamp 처리와 영구 삭제의 Undo 예외는 별도 기존 계약이다.

모듈은 actual storage CAS나 session/attempt epoch를 발급하지 않는다. 바뀐 상태를 검사하지만 **완전히 같은 JSON으로 되돌아온 ABA는 snapshot만으로 판별할 수 없다**. C/E2의 existing expectedRaw·session/attempt·pending/recovery·late callback 검사를 계속 사용해야 한다. `viewOnly:true`도 보안 brand가 아니며 실제 raw authority를 대신하지 않는다. 변경된 effective projection을 raw 입력으로 재사용하면 capture stale로 거절하지만, 값이 같다는 이유로 projection을 writer 입력으로 허용하는 contract는 아니다.

안전한 JSON container만 받는다. poison key, symbol, getter, non-enumerable property, holey/cyclic array, undefined/함수/비유한 수, custom prototype을 복사 전에 거절한다. Array/Object native prototype의 constructor identity를 descriptor로 검사하므로 다른 VM realm의 표준 JSON container는 허용한다. custom Array prototype의 inherited `toJSON`으로 unknown 값이 바뀌는 사례는 재현 후 차단했다. 일반 JSON.parse 데이터와 달리 임의 Proxy 자체의 trap 무실행을 보장하는 sandbox는 아니다.

reserved 이름이 기존 legacy raw state/undo 또는 timeline archive에 있으면 채택하지 않는다. metadata의 unknown version/contract/key, foreign/duplicate identity, baseline presence 불일치, blank title, invalid date는 fail-closed다. 의미 없는 빈 metadata/entry/Item override도 저장 계약으로 허용하지 않는다.

## 6. 다음 연결 gate — 아직 완료 아님

1. **C 읽기·transition:** current/Undo strict metadata 검사, old raw/각 archive 보존, candidate 단일 revision/Undo 포장. 기존 일반 action이 metadata를 silently prune하거나 raw managed field를 바꿔 overlay를 무효화하지 않도록 명시 분기한다.
2. **source 합성:** raw-state와 검증된 source-composed state를 구별하는 binding API를 먼저 설계한다. 현재 `projectPersonalPlanState`는 raw 전용이다. source candidate가 적용된 view를 raw로 역전달하거나 capture를 그 view에서 발급하지 않는다.
3. **E2 draft·복구:** 새 draft discriminator/strict child copy/부모-자식 baseline/journal decoder를 함께 연결한다. old prepared journal 먼저 명시 복구, confirmed는 rollback 금지, 저장 retry/외부 drift/새 attempt 경계 유지. Quick은 기존 계약 유지.
4. **D 영구 삭제:** entry/capture/overlay와 current/Undo/legacy archive의 exact owner 삭제를 검증한다. 현재 D의 unknown field 차단을 UI에서 우회하지 않는다.
5. **UI·원본 동등성:** capability·기준 owner·dirty/cancel/no-op/error/retry/recovery/초점과 5 viewport 검증을 함께 수행한 후 저장 UI를 연다. section/global order는 별도 B2 capability gate다.

특히 **반복 Item에서 unscheduled projection이 기존 recurrence validator에 걸리는 경로는 차단을 유지했다(P37)**. 이는 기존 반복 규칙을 보존했다는 PASS이지 B1의 날짜 3mode 전체 동등성 PASS가 아니다. 후속 UI는 지원 불가 사유를 표시해야 한다. 원본 React 동작과 대조한 작은 gate 없이 반복 anchor·회차 ID·완료의 새 의미를 만들지 않는다. 기존 standalone 실행일 provenance가 불명확한 데이터도 같은 날짜라는 이유로 inherit로 바꾸지 않는다.

이번 작업은 운영 writer/key 변경, 실제 저장, 브라우저·기기 검증 또는 관찰 사용자 검증을 수행한 것이 아니다. 해당 검증은 후속 연결에서 별도로 기록한다.
