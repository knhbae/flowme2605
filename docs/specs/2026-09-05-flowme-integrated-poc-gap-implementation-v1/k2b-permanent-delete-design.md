# K2-B 명시 영구 삭제: 소유 데이터 제거와 checkpoint 재결합

상태: 순수 모델 설계·구현 범위. 저장 장치, 복구 journal, 화면에는 아직 연결하지 않는다. 이 문서는 새 보관 정책을 정하지 않는다.

## 1. 기존 요구와 기술 예외

- 개발1 원본 `2026-08-13-plan-edit-trash-structure-unification/spec.md`의 Trash grammar는 휴지통에서 명시 확인한 사본의 영구 삭제와 복원 transaction을 요구한다. 자동 만료·일괄 비우기는 범위 밖이다.
- 같은 checkout `components/flow/AppClient.tsx:23329`는 개인 초안 원문·항목 구성·날짜·메모·완료·회고를 모두 삭제한다고 설명한다. 원본 UI `2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html:948`도 사본·개인 수정·메모·완료 기록 삭제와 공유 원문 보존을 구분한다.
- [A0-2](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md)는 쓰기 소유자를 PoC shadow로 제한한다. 영구 삭제 뒤 개인 payload를 보관해도 된다는 결정은 아니다.
- [checkpoint 계약](./k2b-checkpoint-contract.md)의 일반 동작은 legacy bytes를 보존한다. 이 보존은 영구 삭제의 기존 약속과 충돌하므로, **사용자가 이미 승인한 명시 영구 삭제만** old/new PoC payload를 함께 제거·재결합하는 기술 예외로 취급한다. 자동 부팅·일반 저장에서는 old key에 쓰지 않는다.
- old raw가 `null`이고 삭제 대상이 seed baseline에도 있으면, 제거한 seed의 v1 envelope를 새 old raw로 materialize한 뒤 provenance를 재결합할 수 있다. 삭제와 무관한 seed 정책이나 자동 초기화는 추가하지 않는다.

## 2. 순수 API

`FlowPocWorkspacePermanentDelete.planPermanentDelete(input, options?)`

```js
input = {
  checkpoint,                         // C1에서 검증한 v2 envelope
  target,                             // 아래 정확한 소유자
  confirmed: true,
  expectedRevision,                   // 현재 state.revision과 일치
  sourceCandidateRaw: null | string,   // 읽음이 확인된 값; 누락은 차단
  now                                 // 주입한 ISO timestamp
};
// Flow: {kind:'flow', id, savedCopyId, sourceFlowId, ref}
// Quick: {kind:'quick', id}
// options: model/checkpoint/sourceRuntime의 선택적 의존성 주입
```

반환은 `{ok, changed, reason?, checkpoint, legacyRaw, sourceCandidateRaw, footprint}`다. 성공 때는 `checkpointRaw`도 반환한다. 변경된 old/source에 한해 `writes`에 key와 정확한 before/after raw를 담은 계획을 추가한다. 함수 자체는 storage, DOM, 파일, 실제 clock에 접근하지 않는다. 새 checkpoint의 이전 raw를 읽고 CAS하는 일은 호출자 책임이다. 재직렬화한 checkpoint를 실제 읽은 before raw인 것처럼 제공하지 않는다. 실패·취소·이미 없는 대상은 원래 checkpoint 참조와 raw를 그대로 돌려주며 쓰기 계획은 빈 배열이다.

## 3. 소유자별 제거 범위

| 위치 | 제거 대상 | 보존 대상·차단 조건 |
| --- | --- | --- |
| Flow | savedCopyId + sourceFlowId + canonical ref가 일치하는 선택 사본 | 제목이 같은 다른 사본 보존. 같은 local id가 다른 tuple을 가리키면 차단 |
| Flow Item | 선택 Flow에 속한 Item 전체와 Item 내부 unknown 값 | 다른 사본의 같은 제목·같은 원문은 보존 |
| QuickItem | 기존 계약의 Quick id | generation을 새로 만들지 않음. 같은 id의 Flow Item이 history에 섞였으면 차단 |
| old envelope state/undo, active state/undo | 각 snapshot의 위 소유 데이터 | snapshot마다 독립적으로 처리. 다른 소유자의 객체와 배열 순서 보존 |
| timeline legacySnapshot | 해당 snapshot이 결합된 최초 old state 또는 undo를 제거한 값 | old current로 일괄 덮지 않음. C1 provenance 재검증 |
| orders | 선택 Flow/Step context 삭제, 다른 context에서는 삭제된 Item id만 제거 | 전체 membership 재계산·정렬·reset 금지. owner 불명 context 차단 |
| timeline records | 삭제된 Item id만 `orderedRefKeys`에서 제거 | 다른 순서·revision·resolvedContexts 보존 |
| occurrenceOverrides | 삭제된 source Item ref의 override 전체 | 다른 반복 일정·완료·메모 보존 |
| trashEntries | 선택 kind/id entry 전체 | 이웃 휴지통 entry 보존 |
| lastReceipt | 선택 Flow의 receipt, 또는 삭제할 Quick conversion receipt와 연결된 event | conversionId만으로 제거하지 않는다. 모든 snapshot의 conversionId→flowId·Flow tuple·sourceQuickItemId 연결과 event의 Flow 연결이 일치해야 한다. 이웃 Flow로 모순되거나 owner가 불명이면 차단 |
| quickConversionReceipts | 선택 Flow의 receipt 또는 `sourceQuickItemId`가 선택 Quick인 receipt | Quick에서 **독립 생성한 Flow와 그 내용은 보존**. 같은 문자열 전체 삭제가 아님 |
| source candidates | exact tuple/ref에 속한 envelope(base/mine/incoming/raw/projectedFlow), review, effectiveVersion, undo | 다른 candidate 보존. 실제 source runtime validator로 전후 검증. 다른 owner의 Undo가 삭제 대상 effectiveVersion을 참조하는 등 관계가 불명확하면 차단 |
| CreatorDraft·공유 원문 | 이 함수의 소유 범위가 아님 | 읽기·변경하지 않음 |

일반 v1 unknown은 C1에서 보존하지만, state/envelope 최상단 unknown은 삭제 소유자를 증명할 수 없다. 그 삭제만 `delete-scope-unproven`으로 차단한다. 선택 entity 안 unknown은 객체와 함께 제거하고, 소유자가 확인된 이웃 entity 안 unknown은 그대로 보존한다. 전역 문자열 검색으로 소유자를 추정하지 않는다.

Quick id는 기존 v1이 재사용할 수 있는 id다. 이 모델은 기존 계약대로 같은 id를 같은 owner로 처리하며 불변 generation이 있다는 주장을 하지 않는다. sourceQuick receipt를 제거하되 독립 생성 Flow를 보존한 후 새 Quick/새 변환의 실제 validator 및 duplicate 방지 동작도 시험한다.

## 4. 처리 순서와 반환 불변식

1. 명시 확인, 정확 target, revision, `now`, source raw의 읽음 여부를 확인한다. 현재 휴지통 밖 대상에는 적용하지 않는다.
2. C1 checkpoint와 실제 source candidate runtime으로 입력을 검증한다. target tuple/id의 snapshot 간 충돌과 모든 최상위 owner를 증명한다.
3. old state/undo를 각각 clone하여 제거한다. 원본 JSON 문자열과 입력 객체는 바꾸지 않는다. 변경 없는 old/source raw는 공백까지 원문을 반환한다.
4. active state를 제거하고 모든 legacySnapshot을 자신의 제거된 baseline에 재결합한다. canonical records는 삭제 참조만 제거한다. active undo는 `null`로 만든다. 활성 revision만 1 증가시키고 `updatedAt`은 주입값으로 갱신한다. old history의 날짜·revision은 유지한다.
5. source store의 exact owner만 제거하고 실제 validator로 검사한다. 소유자 교차 의존성은 추정해서 추가 삭제하지 않는다.
6. 후보 old state/undo에 M.validate, 후보 checkpoint에 C1.validateCheckpoint를 다시 적용한다. 실패하면 후보를 반환하지 않고 입력 그대로 차단한다.
7. 실제 저장은 별도 coordinator의 다중 key CAS/복구 계약으로 실행해야 한다. 이 모델 PASS는 저장 원자성·브라우저·기기 검증이 아니다.

C1의 일반 `transitionCheckpoint(permanently-delete-from-trash)` 차단은 유지한다. 이 함수는 명시 삭제를 위한 별도 계획기이며, 일반 전환에 암묵적으로 연결하지 않는다. 되돌릴 수 없다는 기존 의미는 최종 active `undo:null`로 유지하며, old history와 archive에서도 선택 소유 데이터를 제거한다.

## 5. 순수 검증 inventory

아래는 검증 범위다. 실제 실행 결과는 §7에서 따로 집계한다.

- lazy UMD/CommonJS, 입력 deep-freeze, storage/DOM 접근 0.
- Flow의 원문·Item 메모·완료·원문속성·target 내부 unknown이 old state/undo와 active/archive 후보 raw에서 제거되고 이웃 사본은 exact 보존.
- initial old state/undo가 서로 다를 때 archive 각각 재결합, C1 검증 PASS.
- null seed baseline 삭제 materialization과 baseline에 없는 새 Quick 삭제의 null 유지.
- 같은 제목 다른 사본, 다른 local id의 같은 tuple, local id의 다른 tuple, Quick/Flow Item kind 충돌.
- 순서 배열에서 삭제 ref만 제거, 이웃 순서·folder·timeline resolution 불변, 다른 날짜·완료 기록 불변.
- 반복 override, lastReceipt, Flow 변환 receipt 제거, source Quick 삭제 뒤 독립 생성 Flow 보존 및 새 Quick 생성/변환.
- source pending/applied/undo의 target owned copies 제거와 다른 사본 source byte/value 보존; invalid/unknown/cross-owner 조합 차단.
- cancel/not-in-trash/stale/unknown top/invalid dependency·payload에서 changed false, 동일 입력 참조, 빈 writes.
- 성공 후 active Undo 없음, serialize/reload 검증, 후속 일반 변경·Undo로 삭제된 데이터가 부활하지 않음.

## 6. 연결 전 남는 검증

실제 multi-key writer/journal 실패·rollback·reload 복구, 화면 확인 문구, key 전후 CAS, 5개 viewport, 브라우저 시나리오는 이 순수 모듈 밖이다. 운영 데이터 및 독립 CreatorDraft는 그대로 보호한다. commit·push·PR·Preview·Production·관찰 사용자 검증은 이 작업에 포함하지 않는다.

## 7. 실행 기록 — 2026-09-05

- 신규 `workspace-permanent-delete.test.cjs`: 첫 완료는 31/31 PASS. 독립 리뷰의 receipt owner 오류를 보완한 최종 실행은 **34/34 PASS**다. 위 inventory와 리뷰 회귀를 D01–D34에 매칭했다. D01의 storage/DOM getter 접근은 0건이다. 실제 브라우저 storage를 검사했다는 뜻은 아니다.
- 기존 `workspace-checkpoint.test.cjs` 40개 + `timeline-context.test.cjs` 35개 + 최초 신규 31개 실행은 106/106 PASS였다. 리뷰 보완 뒤 최종 신규 34개를 합친 회귀는 **109/109 PASS**다. 반복 실행을 새 테스트 수에 더하지 않았다.
- 신규 두 JavaScript 파일 `node --check` 통과. 문서 검사는 최초 16 required files, 4,921 local links, 리뷰 수정 후 16 required files, 4,925 local links로 통과했다(각 실행 당시 공유 worktree 기준).
- 첫 신규 24개 실행은 24/24 PASS. 7개를 추가한 중간 실행은 30/31이었다. 실패 1건은 frozen source runtime 반환값을 직접 바꾼 D26 테스트 fixture 오류였고, 입력 clone으로 고친 뒤 31/31을 재실행했다. 제품 실패를 숨겨 PASS로 바꾼 것이 아니다.
- D26은 실제 source validator가 다른 Flow의 `previousEffectiveVersion`을 가진 Undo 조합도 유효로 받는 것을 확인했다. 삭제 계획기는 이 교차 owner 조합을 `delete-scope-unproven`으로 차단한다. source runtime 자체는 변경하지 않았다.
- D02는 다른 owner 안에 같은 문자열이 남는 것이 올바른 보존임을 확인한다. D03/D18은 **선택 owner에만 존재하는 sentinel**이 성공 후보 raw들에서 사라지는지 검사한다. 전역 문자열이 모두 사라졌다는 주장은 하지 않는다.
- 독립 리뷰는 `lastReceipt.flowId`가 이웃 Flow를 가리키는데 conversionId만 선택 Quick의 과거 receipt와 같은 경우, 이웃 receipt를 지우는 오류를 발견했다. 수정 전 D32 단독 1/1 FAIL, 관련 D32–D34 3/3 FAIL을 재현했다. 세 검사는 하나의 owner-join 결함과 그 변형이며 결함 3개라는 집계가 아니다. 모든 snapshot의 conversionId와 source Quick·Flow id/tuple 연결을 검사한 뒤 모순은 `delete-scope-unproven`으로 차단하도록 최소 수정했다. 기존 정상 D27도 함께 4/4 PASS이며 이력에만 receipt가 있고 현재 event 연결이 올바른 경우는 계속 지원한다.

재현 명령(저장소 루트):

```powershell
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.test.cjs
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-context.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.test.cjs
npm.cmd run docs:check
```

이 기록은 새 순수 모델과 재사용 회귀에 한정한다. npm 전체 테스트, production build, 실제 저장 transaction, 화면 연결, 브라우저, 실제 Android/iOS, 관찰 사용자 검증은 이 하위 작업에서 실행하지 않았다. 기존 C1·model·app·builder·storage 파일은 수정하지 않았다.
