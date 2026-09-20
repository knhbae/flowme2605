# B3 호환 — React 큰 Plan 결과 표시 계약 설계

2026-09-06. **읽기 조사와 설계만 완료했다. 이 문서의 새 API·UI·검사는 아직 구현/실행하지 않았다.** 기존 receipt v1의 strict 100개 제한, 운영 writer, PoC 저장 schema는 변경하지 않았다. 순서 표시 [109/109 QA](./k3b-plan-order-display-qa.md)는 실제 React Surface의 큰 Plan 전체 흐름을 검증한 결과가 아니다.

## 1. 결론과 실제 실패 위치

권고는 **Plan 전용 memory-only versioned display 계약 + 전체 목록 보존 + 10행 UI paging**이다. 기존 v1 receipt를 잘라 쓰거나 제한을 늘리지 않는다. Quick·Quick→Flow 등 기존 v1 소비자는 그대로 유지하고, 개인 Plan은 크기와 무관하게 같은 새 표시 경로를 사용한다.

100개를 넘으면 “정상 저장 뒤 성공 receipt에서만 실패한다”고 단정할 수 없다. 현재 일반 UI 경로에는 그보다 앞선 차단이 있다.

| 현재 실제 위치 | 확인한 동작 | 위험 / 필요한 변경 |
| --- | --- | --- |
| Surface `requestPlanCommit` 1824–1869 | full summary를 attempt에 보관하고 controller에 commit 요청. summary0이면 v1 noop도 생성 | summary 수를 저장 허가로 쓰지 않음. 실제 handler preflight 결과가 최종 no-op 근거 |
| `showSavingReceipt` 929 및 `planHandlers.preparePersonalOverlay` 959–986 | **실제 handler/evidence 생성 전에** v1 saving receipt를 생성 | 101 refs 또는 101 fields면 먼저 throw. 실제 prepare/target 쓰기 전 차단될 수 있음. saving부터 새 Plan 표시 경로 필요 |
| `executePreparedPlanCommit` 892–902 | prepare 예외는 read-only 실패로 변환 | 위 표시 오류가 실제 저장 실패처럼 controller에 전달되는 경로. writer가 실패했다는 증거와 구별 |
| Surface failure effect 1552–1589 | 같은 attempt의 full refs/changes로 v1 failure receipt를 다시 생성 | 선행 cap 실패 후에도 같은 cap에서 다시 throw 가능. 오류 표시 경로까지 함께 교체 |
| `finalizeSuccessfulEditorAttempt` 1312–1360 | verified target raw/state와 revision을 확인하고 state를 반영한 **뒤** v1 success 생성 | 이 함수까지 도달한 정상 저장은 표시 validation 실패로 되돌리면 안 됨. 같은 attempt의 verified 사실과 표시 성공을 분리 |
| `planEditorClosed` 1382–1481 | discarded full summary로 v1 canceled 생성 후 guard/owner/history 정리 | 큰 discard가 throw하면 뒤 cleanup을 건너뛸 수 있음. 저장0인 닫기도 표시 오류로 막히면 안 됨 |
| controller `runEffects` 179–184 | `onTransactionClosed` 뒤 return-point 복귀 호출 | close callback 예외는 포커스·scroll 복귀도 건너뛸 수 있음. closed 상태 정리/복귀를 non-throwing 경계로 보호 |
| `ReceiptSurface` 38–56, 94–158 | affectedCount를 ‘변경 수’로 말하고 changes 전체를 한 번에 렌더 | 직접 대상 수와 필드 수를 구분하고 10행씩 표시. 한 owner에 3필드 변경을 ‘1개 변경’으로 축소하지 않음 |
| `ImpactSummary` 283–344 | full changes를 모두 렌더하고 included/excluded 숫자를 표시 | Plan preview도 같은 full-count/page helper 사용. 승인되지 않은 제외 정책을 이 작업에서 추가하지 않음 |
| `undoReceiptChange` 2406–2462 | success receipt/revision 검사 → 명시 workspace undo → v1 undone 생성 | 새 Plan result의 full diff를 그대로 역전해 표시. v1 cap 우회용 부분 receipt를 만들지 않음 |

이는 **현재 코드의 경로 대조**다. 이번 조사에서 mounted UI 예외나 101개 실제 클릭을 새로 실행하지 않았다. 이전 [B3-R08](../../../lib/flow/personal-workspace-poc-plan-summary-boundary.test.ts)은 실제 handler 직접 호출로 100/101 모두 저장된 뒤, 100 receipt 성공·101 `invalid-affected-refs`를 확인했다. 그 검사는 Surface의 saving 경로를 건너뛰므로 두 결과는 모순이 아니다.

## 2. 보존해야 하는 값과 100개 경계

기존 [receipt v1](../../../lib/flow/personal-workspace-poc-receipt.ts)의 `parseChanges` 266, `parseReceiptInput` 381–399는 fields와 refs를 각각 최대100으로 제한한다. `affectedCount === affectedRefs.length`, 고유 `(owner,field)`, 상태별 revision/write/rollback, label/value 160자·제어문자 금지를 계속 적용한다. 새 계약을 v1 객체인 것처럼 cast하거나 기존 validator에 `max: Infinity`를 전달하지 않는다.

새 Plan 표시에서는 다음을 모두 별개로 보존한다.

- `changes`: 정규화한 저장 의미가 바뀐 전체 field 배열. owner/field/label/before/after 유지.
- `affectedRefs`: 직접 저장 owner의 전체 고유 ref 배열. full identity 유지.
- `changedFieldCount = changes.length`, `affectedCount = affectedRefs.length`.
- `flowCount`: 변경 field의 직접 owner가 Flow인 경우 1, 없으면0. `itemCount`: 직접 Item owner의 고유 수. `flowCount + itemCount = affectedCount`.
- title/section/order는 Flow owner, Item title/memo/schedule은 해당 Item owner다. 구간 제목이 100개 Item에 보인다고 Item100을 affected에 추가하지 않는다.

예를 들어 Flow 제목·구간 제목·순서·Item 하나의 메모와 날짜를 바꾸면 **필드5, Flow1, 할 일1, 직접 대상2**다. Item101개의 메모를 바꾸면 **필드101, 할 일101**이지 Flow1로 요약할 수 없다. 51개 Item의 메모/날짜는 fields102/refs51이므로 refs만 검사하는 구현도 불충분하다.

`field`가 `item.${itemId}.memo` 형태라고 `.` split으로 소유자를 추정하지 않는다. 실제 같은 Flow의 exact Item refs와 itemId로 만든 허용 field→owner 맵에 대조한다. 다른 사본·이웃 Flow·알 수 없는 field·중복 owner는 표시 검증도 거절한다.

## 3. 대안 비교

| 안 | 변경 범위와 손실 | 판단 |
| --- | --- | --- |
| v1 arrays를100개로 자름 / aggregate Flow1 | 전체 field/ref 손실, count 불일치, old Undo 대상 왜곡 | 금지 |
| 10개씩 v1 receipt를 여러 개 생성 | transaction/receipt id/성공 수·Undo owner가 여러 개로 분열. 페이지별 성공을 실제 저장으로 오인 | 금지 |
| 기존 v1 cap 상향·제거 | 다른 operation·저장/재시도 검증까지 변경. ‘큰 Plan 표시’보다 범위가 큼 | 선택하지 않음 |
| 별도 receipt v2 + 새 transition/parser | 기존6상태/Undo/리트라이 계약을 확장할 수 있으나 version union과 모든 v1 소비자 분기 필요 | 장기 통합 대안. 현재 요구에 비해 넓음 |
| **별도 Plan memory display v1 + private attempt owner** | Plan full summary와 UI만 새 경로. 기존 v1/Quick/schema 유지. 페이지는 순수 조회 | **권고** |

선택은 새 영구 제품 정책이 아니라 PoC의 표시 호환 구현안이다. 10은 교체 가능한 표시 상수이며 편집 한도가 아니다.

## 4. 제안 계약 — 아직 미구현

신규 파일 후보: `lib/flow/personal-workspace-poc-plan-display.ts`, `components/flow/personal-workspace-poc/PersonalWorkspacePocPlanResultSurface.tsx`.

```ts
type PlanDisplayV1 = Readonly<{
  version: 1;
  contract: 'flowme-personal-workspace-plan-display-v1';
  displayId: string;
  intentId: string;
  operation: 'commit-personal-plan' | 'apply-item-to-parent-personal-draft';
  status: 'preview' | 'saving' | 'success' | 'noop' | 'failure' | 'canceled' | 'undone';
  scopeRef: string;
  changes: readonly PersonalWorkspacePocReceiptChange[]; // 일부 페이지가 아닌 전체 목록
  affectedRefs: readonly string[];
  changedFieldCount: number;
  affectedCount: number;
  flowCount: number;
  itemCount: number;
  // 상태별 union: revision, 실제 write facts, error/rollback, returnContext, undoOfDisplayId
}>;

createPersonalWorkspacePocPlanDisplay(input) // {ok:true, display} | {ok:false, reason}
selectPersonalWorkspacePocPlanDisplayPage(display, pageIndex) // full totals + rows <=10
```

실제 TypeScript 구현에서는 상태별 union으로 허용 key를 고정한다. 현재 v1 receipt 타입을 상속해 v1이라고 가장하지 않는다.

### 순수 검증 범위

1. exact contract/version/allowed keys와 plain own-data 구조를 검증한다. 함수·getter·cycle·prototype/unknown을 거절하고 frozen 값으로 복사한다.
2. 전체 field/ref의 중복·count 관계·같은 scope membership을 검증한다. 허용 field 집합은 **실제 열린 Plan의 immutable source/baseline**에서 만들고 새 변경 종류를 추가하지 않는다. 큰 입력 때문에 알려지지 않은 arbitrary array를 무제한 수용하는 parser를 만들지 않는다. 최대 행 수는 검증된 Plan의 `3×Item 수 + 지원 구간 수 + Flow 제목/순서2`의 범위 안이다.
3. label/value의 기존 160자·제어문자 규칙과 owner/field 의미는 동일하게 유지한다. 가능하면 기존 v1 parser가 사용하는 작은 value/field validation만 leaf helper로 추출해 공유하되 **v1의 collection cap과 상태 validator는 그대로** 둔다. 부분 자료로 가짜 v1 receipt를 만들어 검증하지 않는다.
4. 입력 summary의 안전한 표시값을 저장 후보로 쓰지 않는다. semantic diff는 기존 normalize와 `summarizePersonalWorkspacePocPlanDraftChanges`의 exact intent 비교가 결정한다. 표시 문자열의 같음으로 변경을 버리지 않는다.
5. `preview/saving/canceled/noop`의 target 변경0, success/undone의 검증된 revision+1/target1을 상태별로 확인한다. failure는 실제 rollback과 evidence의 사실을 보존한다. `successfulTargetMutationCount`는 정상 반환한 API 횟수이지 throw-after까지 포함한 전체 호출 수가 아니다. API 전체 수는 별도 test probe로 측정한다.
6. `retryDescriptor`는 현재도 bounded fingerprint/revision이며 raw draft를 담지 않는다. 큰 Flow가 그 payload 크기 cap을 넘는다고 단정하지 않는다. 새 display에는 retry 권한/guard를 넣지 않고 기존 private attempt에 그대로 유지한다.
7. page 선택은 배열 slice만 수행한다. 페이지 수는 full field 수로 계산하며 모든 페이지를 합치면 원래 배열과 순서·값이 exact 같아야 한다. 빈 목록/page 경계/목록 축소 시 유효 page만 선택한다. 원본 display는 변하지 않는다.

이 factory의 `ok:true`는 **표시 자료의 정합성**이다. 현재 source·저장 권한이나 genuine commit의 증거가 아니다. raw/state/source bytes, draft, guard, 저장 candidate, undo snapshot, callback은 renderer DTO나 DOM data attribute에 싣지 않는다.

## 5. attempt와 결과 owner의 최소 연결

Surface 내부의 Plan 전용 `useRef/WeakMap`에서 기존 attempt 객체에 다음을 결합한다. 공개 displayId만으로 참조를 재생성하지 않는다.

- current Plan session/transaction id, submission requestId/revision, 실제 captured guard와 draft retryDescriptor.
- frozen full summary와 해당 exact field owner map.
- 실제 prepare가 캡처한 state raw, same-attempt storage evidence, 검증된 successful target raw/state.
- source 관측 raw/epoch, 화면·scope·returnPoint, one-use success/Undo 상태.

현재 `planAttempt`는 string intentId만 가진 UI 객체다. 새 coordinator는 **현재 같은 참조 + controller의 현재 submission + 실제 evidence**를 함께 검사한다. 과거 display DTO·복제 attempt·다른 Flow의 valid state로 성공/Undo 권한을 만들지 않는다.

### source/working/raw guard를 섞지 않기

`beginPlanEditor`는 `findSourceFlow`의 effective source를 표시용 `planSourceFlow`에 넣지만 실제 opener/handler에는 `initialModel`을 넘긴다. source candidate가 이미 적용된 경우 두 source가 다를 수 있다. 새 display가 이 차이를 자체적으로 normalize하거나 source 권한을 고쳐 주면 안 된다.

구현 gate에서 summary source와 actual guard의 canonical source·full identity가 같은지 확인한다. 다르면 성공 가능한 summary나 새 guard를 임의로 제조하지 않고 입력을 유지한 재확인 경로로 보낸다. 현재 source-aware 편집 지원 여부는 별도 기존 계약과 대조한다. **이번 계약이 source update와 Plan 편집의 완전 동등성을 증명하지 않는다.**

성공 결과의 source freshness에는 고정 `PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY`의 실제 read와 관측 epoch가 필요하다. 저장 key도 실제 read한다. `initialModel` 객체나 caller boolean만으로 current source라고 판단하지 않는다. 관측 A→B→A는 irreversible stale이며 same bytes만으로 예전 owner를 되살리지 않는다. 실제 다른 탭 검사는 별도이며 synthetic StorageEvent를 실제 두 탭으로 보고하지 않는다.

## 6. Surface에 필요한 실제 hook

| 연결점 | 최소 변경 / 보존 조건 |
| --- | --- |
| `requestPlanCommit` | full display를 생성하고 같은 attempt에 고정. invalid summary면 값 유지·local 오류. 실제 저장 no-op은 handler/preflight가 최종 결정. Quick 경로 유지 |
| `showSavingReceipt` | Plan만 새 display 상태 사용. 실패 없이 작은 status shell을 먼저 표시. 표시 factory 오류는 writer 예외로 던지지 않음. 검증되지 않은 summary로 저장 권한을 대신하지 않음 |
| Plan failure effect | 기존 inline error가 한 live owner. full 예정 변경은 접힌 읽기 목록, 실패 저장을 적용 결과로 표시하지 않음. 같은 retryDescriptor/guard 경로 유지 |
| `finalizeSuccessfulEditorAttempt` | verified 사실 확인→state adopt/accepted close→same owner success 표시를 분리. 성공 확인 뒤 표시 오류는 `저장은 완료했지만 변경 목록을 표시하지 못했어요`의 제한 안내. rollback/requestCommit 재호출0 |
| `planEditorClosed` | discard full summary는 남기되 canceled 표시 실패가 cleanup/history/returnPoint를 끊지 않음. 완료된 close의 refs 정리는 안전하게 끝내고 callback은 표시 문제를 밖으로 throw하지 않음. recovery-required의 기존 close 차단을 우회하지 않음 |
| Item close/apply | child의 같은 ref만 부모 staged baseline과 비교. child apply는 저장0. 부모의 다른100개 변경을 child 취소/반영 수에 다시 포함하지 않음 |
| `ImpactSummary` / 새 PlanResult | full totals와10행 page. draft 변경 시 page만 clamp. 실제 fields를 삭제하거나 subset summary를 상위로 반환하지 않음 |
| `resultFacts`, `contextualReceiptRef`, receipt owner effect | 새 Plan display owner도 기존 receipt와 같은 우선순위로 K2C 결과를 중단. Quick/source/authoring 결과와 동시에 live/Undo를 노출하지 않음 |
| `commitTransition` 성공 후 `setReceipt(undefined)` | Plan own Undo의 결과 publish를 같은 callback에서 지우지 않도록 Plan presentation owner를 구분. 일반 move 결과는 기존대로 새 owner를 차지함 |
| header/모바일설정/새 결과 Undo | 활성 Plan owner가 있을 때 모두 동일 Plan undo handler로 alias. v1 Quick Undo는 기존 함수 유지 |
| reset/새 편집/화면 이동/source 변경/reload | 새 Plan owner를 명시 무효화. 닫기/paging/읽기0쓰기. reload에서 메모리 결과 재발급0, 저장된 일반 Undo는 별개로 유지 |

### 표시 실패가 durable 성공을 뒤집지 않게 하기

표시 검증과 렌더를 writer의 `commit()` 내부에 넣지 않는다. writer 완료 후 UI callback은 commit 실패 이벤트를 만들지 않으며 `rollbackAndVerify()`를 호출하지 않는다. accepted close 뒤 summary 표시 오류가 있어도 exact state와 복귀 위치는 유지한다. 검증된 full summary를 가지고 있으면 UI 재시도는 다시 표시하기만 하고 저장0이다. full summary 자체가 부정확하면 count를 추측하거나 Flow1로 대체하지 않고 제한 안내만 표시한다.

성공/실패/취소 모두 한 곳에서 상태를 말한다. 미리보기나 페이지 이동은 live가 아니다. 원래 focused opener 복귀를 먼저 보존하고 긴 결과를 새 fixed toast로 띄우지 않는다. 이 설계에 접근성/5viewport PASS 점수를 부여하지 않는다.

## 7. Plan 전용 Undo — 저장 경로는 기존 것

React의 실제 경로는 `applyPersonalWorkspacePocTransition({type:'undo'})`와 기존 `commitTransition`/PoC storage transaction이다. standalone `C.undoCheckpoint`를 React에 import하지 않는다. source writer나 authoring writer를 호출하지 않는다.

Undo 전 같은 private result owner, exact 성공 raw/state revision, source raw/관측 epoch, 현재 화면/scope, `state.undo`, 편집/pending/recovery0을 확인한다. raw/source 값을 실제로 읽고 확인한다. 같은 제목·다른 사본은 full ref로 분리한다.

기존 `commitTransition`은 rAF 뒤 lock 안에서 target raw를 재확인한다. Plan result의 source/screen/owner 검사는 **진입 전 검사만으로 끝내지 않고 lock 직전/내부 및 결과 발행 직전**에 동일 ticket으로 확인해야 한다. 필요하면 Plan 전용 optional presentation argument를 추가하되 기존 K2C ResultTicket을 위조하거나 일반 transition 저장 validator를 느슨하게 만들지 않는다. source key에 write/rollback은 없다.

Undo는 기존 state의 한 Undo snapshot만 소비한다. display에 별도 before-state를 저장하지 않는다. 성공 뒤 전체 changes 전후를 역전하고 original displayId와 결합한 undone을 한 번 표시한다. 실패/불확실 상태는 기존 실제 복구 경로를 사용하고 과거 result 버튼은 막는다. 결과 닫기나 stale 때문에 Undo를 못 보이게 된 것과 persisted Undo가 삭제된 것은 구별한다.

## 8. 작은 구현 순서와 검증 계획

아래는 **예정 inventory**이며 신규 실행 개수가 아니다. mounted 하니스가 없으면 SSR·source 정규식 검사를 mounted라고 쓰지 말고 실제 React 브라우저 경로로 검증한다. 이번에 조사한 Surface/Receipt/Editor 기존 검사는 소스 대조·SSR·직접 action props 중심이었다.

1. **경계 재현 3등록:** (a)100개 실제 저장/close/receipt positive, (b)101개 저장 시 Surface saving→failure 실제 경로와0쓰기 RED, (c)101개 discard 후 owner/history/focus 정리 RED. 이미 저장된 candidate를 넣어 finalize만 시험하면 실제 사용자 저장 경로와 구분한다.
2. **새 pure display:** full counts·field owner map·100/101·51×2 fields·Flow/section/order복합·동명 사본·unknown/getter/foreign/중복·상태별 사실·페이지 전체 exact·부분 page로 권한 제조0. v1 100/101 기대값은 그대로 별도 PASS해야 한다.
3. **같은 attempt adapter:** 저장1/child0, failure input유지/retry, no-op0, 대량 취소0, success 표시 오류 주입 후 target/Undo 유지, late callback/복제 display/다른 attempt 차단. 성공 evidence와 표시 상태를 함께 기록한다.
4. **실제 React UI:** 첫/마지막 페이지, page0쓰기, large save→Undo→reload, 같은 Flow source Undo 공존, source/workspace observed ABA와 rAF 중 drift, recovery/다른 editor 우선, 큰 cancel 후 다시 Plan 열기. 정상/실패 각각5viewport(390×844,375×812,844×390,1024×768,1440×900)에서 full rect/다점 hit/overflow0·오류0·키보드 복귀 검사.
5. **최종 호환:** 기존109, Receipt/Editor/Surface 관련 테스트, 기존 gate/4origin/authoring/Quick/K2C 회귀, 전체 npm test와 build. 중복 실행·viewport 반복을 고유 기능 수로 합산하지 않는다. 실제 기기·실제 사용자 검증은 별도다.

최소 완료 기준은 101개가 정상 저장되고 모든 full field/ref를 paging으로 다시 읽을 수 있으며, 취소/실패/표시 오류가 저장·복귀·Undo owner를 손상시키지 않는 것이다. helper109만으로 B3 전체를 완료했다고 선언하지 않는다.

## 9. 근거 시점과 범위

| 읽은 현재 파일 | SHA256 |
| --- | --- |
| Surface.tsx | `CD1CAAB49C21A46C5C3FA43243FAFC28924E98D9BA59140725100634641E74DF` |
| ReceiptSurface.tsx | `CD0E181717382F966593C91952E9098761619CA6F86D6CFCD3AF19309F1534CC` |
| EditorSurface.tsx | `09B66424195EEF63CD83277B449229DA9F7E5FEC1E0563B8D5ABBE0330D1306F` |
| receipt.ts | `729E391F29928C271969EB3D2E762A0A9B7947BE9E6865FF901B8EAAAD44BA3D` |
| plan-editor.ts | `B7E90EE067A168D1D0B90A2DF944976D8156A42054CFC3CC2099397F511FB8FA` |

관련 정본: [B3 요약 설계](./k3b-plan-summary-receipt-design.md), [실제 연결 설계](./k3b-plan-feedback-integration-design.md), [기존106 QA](./k3b-plan-summary-react-qa.md), [최신109 QA](./k3b-plan-order-display-qa.md). UX review 기준은 중복 상태/CTA 제거, full content 보존, 오류·복구·Undo 유지에 적용했다. 새 화면 점수·실행 완료 판단은 하지 않았다.

새 제품/검사 수정0, 신규 테스트 실행0, 브라우저0. 실제 Android/iOS·보조기술 NOT_RUN, 관찰 사용자0. commit/push/PR/Preview/Production 없음. 이 문서가 승인되기 전에는 새 contract/API를 제품에서 사용할 수 없다.
