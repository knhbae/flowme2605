# K3-B B1-CS — source-bound Plan의 checkpoint 연결

2026-09-05. [Sa QA](./k3b-plan-source-reader-qa.md)와 [Sb 계약 diff](./k3b-plan-source-intent-contract-diff.md)를 root가 읽고 Sb를 승인한 뒤 작성했다. C의 기존 raw-only Plan entry는 그대로 두고, 실제 source-read context를 요구하는 별도 entry를 연결한다. 이 문서를 작성한 시점에는 새 C 구현·검사 결과가 없다.

## 고정 API와 책임

```js
C.inspectSourceBoundPersonalPlanContext(checkpoint, {
  flowRef, sourceRead, sourceEpoch,
}, options);
// C 전체 검증 → P.readPersonalPlanSourceContext(raw + 실제 legacy/Undo)
// → P.inspectPersonalPlanSourceEditor({sourceContext,flowRef})
// 반환: editor context/draft/baseline/capabilities + 별도 sourceContext

C.transitionCheckpoint(checkpoint, {
  type: 'commit-source-bound-personal-plan-context',
  context, draft, sourceRead, sourceEpoch, now,
}, options);
```

선택 옵션은 기존 trusted model/timeline/personalPlan 모듈 주입에만 쓴다. 사용자 payload의 `trusted`·`sourceReady`는 없다. source API 네 개가 없는 옛 P로 새 entry를 호출하면 의존성 오류로 차단하지만, metadata가 없는 옛 C 조회와 기존 P4 경로는 그대로 유지한다. 새 input/action은 exact own data property로 검사하고 getter·추가 key를 거절한다.

C가 source 저장소를 직접 읽거나 쓰지 않는다. sourceRead packet은 호출자가 실제 source key에서 읽은 성공 raw/null 또는 실패를 전달한다. P가 실제 decoder·binding·source-before-P 기준·opaque token·freshness를 검증한다. C는 source 합성 view를 checkpoint.state로 바꾸거나 metadata를 다시 capture하지 않는다.

source reader token과 편집 token은 다른 객체다. 새 검사 entry는 둘을 명시적으로 구분해 반환한다. 새 전이에는 편집 token만 들어가며, 임의 복제·직렬화·raw-only token과 다른 Flow token으로 권위를 만들 수 없다. source epoch는 caller가 관찰한 변화용이지 storage CAS나 관찰하지 못한 타 탭 ABA 완전 탐지 장치가 아니다.

독립 검토에서 P token의 raw state 결합만으로는 열 당시 Undo/legacy provenance의 exact 값까지 보호하지 않는다는 점을 확인했다. 새 C entry는 발급한 editor token에 checkpoint 전체 signature를 private WeakMap으로 결합한다. C가 직접 발급하지 않은 P-only token과 Undo만 바뀐 유효 checkpoint도 새 action에서 차단한다. C signature는 JSON value/배열 순서/legacy raw 문자열의 결합이며 outer/Undo object key 순서 변경은 같은 값으로 취급한다. 다만 P의 별도 current raw binding은 JSON 직렬화 bytes를 비교하므로 current state의 key 순서 변경은 stale로 거절할 수 있다. E2도 실제 저장 raw bytes·session/epoch를 비교한다. 기존 raw-only C 계약은 바꾸지 않는다.

## candidate 공통 처리

기존 raw-only와 새 source-bound 분기의 결과 처리만 작은 private 함수로 공유한다. P 실패는 unchanged로 전달하고, no-op은 같은 checkpoint 객체를 반환한다. changed 결과는 revision이 정확 +1인지, Undo가 정확 before 전체 state인지, timeline metadata가 보존됐는지 확인한다. 같은 legacyBaseRaw로 감싼 후 C current·Undo·legacy provenance 전체를 다시 검증한다. 새 Undo나 revision을 하나 더 만들지 않는다.

새 entry는 selected Flow/Item title A(raw)→B(source)→명시 A를 저장할 수 있고 명시 B의 불필요 override를 만들지 않아야 한다. source 부재/실패, bytes·epoch 변경, missing target/membership/owner 미지원은 P의 사유를 유지한다. source key는 어떤 경로에서도 쓰거나 되돌리지 않는다.

## E2와 복구의 후속 gate

이 C 연결만으로 E2 source-bound 저장을 개방하지 않는다. E2 E01–15의 version2 journal은 raw P baseline에서 후보를 재도출한다. source-aware A/B intent를 그 기록에 억지로 넣으면 reload 때 같은 후보를 검증할 수 없다. 기존 record version2의 의미를 덮지 않고 별도 기술 계약을 먼저 정해야 한다.

검토할 선택지는 source-bound transaction의 한시적 recovery record에 검증 재현에 필요한 source 근거를 보관하거나, selected owner의 전이 관계를 별도 엄격한 계약으로 검증하는 것이다. 임의 normalizationBaseline flag를 신뢰하거나, source 전체를 운영 데이터에 복제하거나, 복구 시 source store를 rollback하는 방법은 제외한다. 한시적 journal 근거를 택한다면 record version·최소 정보·private before 정리·current source guard·prepared 복구와 confirmed 정리를 함께 검증한다. 아직 특정 대안을 구현 승인한 기록은 아니다.

## 검사할 범위

실제 P/C/M fixture로 정상 읽기·source-title A/B·Item 모드·단일 revision/Undo·raw/source 불변·no-op·source-read 실패·bytes/epoch stale·opaque/foreign token·current/Undo/legacy 손상·getter·dependency missing·기존 raw-only 경로를 검사한다. 기존 C18/P41/Sa25/D23 및 E2 회귀도 안정된 source 이후 재실행한다. source store가 포함된 정상 fixture는 실제 stage/resolve/apply API로 만들고 일반 객체에 `ready:true`를 붙여 대체하지 않는다.

제품 화면과 사용자 두 HTML은 B14A로 동결한다. 실제 저장·브라우저·기기·보조기술은 이 순수 연결 결과에 포함하지 않는다. 관찰 사용자0명, commit/push/PR/Preview/Production 없음.
