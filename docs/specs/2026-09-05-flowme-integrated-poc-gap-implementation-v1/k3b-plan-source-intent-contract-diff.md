# K3-B B1-Sb — 승인된 source-aware intent 계약

2026-09-05. root가 Sa 결과·이 계약 diff·최초 RED를 직접 읽고 승인한 범위로 **Sb 순수 모델을 구현했다.** 새 source-aware 23개를 포함한 focused 98/98, 승인 caller로 바꾼 최초 gate 6/6, 별도 C 70/70·D 72/72 PASS다. 정확한 범위·해시·미실행 항목은 [Sb QA](./k3b-plan-source-intent-qa.md)에 기록했다. app/E2/UI 연결은 이 문서의 완료 범위가 아니다. [Sa QA](./k3b-plan-source-reader-qa.md)는 이전 동결 시점의 75/75 결과다.

## 1. 이미 있는 React 기준

[React Plan editor](../../../lib/flow/personal-workspace-poc-plan-editor.ts)의 `normalizePersonalWorkspacePocPlanOverlay`는 현재 source read model의 title과 비교하고, memo는 [기존 개인 memo baseline](../../../lib/flow/personal-workspace-poc-plan-memo-baseline.ts)과 비교한다. `freshContextFailure`는 편집 중 source exact bytes가 바뀌면 저장하지 않는다. [composition](../../../lib/flow/personal-workspace-poc-composition.ts)은 검증 source 뒤 개인 overlay를 적용한다.

이 기존 결정으로 해결할 수 있다. 새 영구 제품 정책이나 ‘동값이면 언제나 원문’ 추정은 필요 없다. raw capture는 CAS·기준 presence를 보호하고, **normalization baseline은 검증된 현재 source-before-P와 실제 기존 개인 owner**에서 얻는다. 두 역할을 분리해야 한다.

## 2. 구체 차이

| 상황 | 현재 raw-only P | Sb에서 필요한 결과 |
|---|---|---|
| raw source title A → 적용된 source 기본 B → 명시 A | raw A와 같아 overlay 제거, 화면 B | 현재 inherited B와 다른 명시 A overlay 유지 |
| 같은 상태에서 명시 B | raw A와 달라 불필요 B overlay 생성 | 현재 inherited B와 같으므로 새 override/Undo/write 없음 |
| 기존 개인 C → inherit | overlay 제거, bound view B | 그대로 유지 |
| raw sourceTitle 부재 legacy → inherit | 기존 개인 A 기준 | 그대로 유지. 원문 title을 제조하지 않음 |
| memo가 source description과 같음 | 실제 개인 baseline과만 비교 | 그대로 유지. source 설명과 동값이라는 이유로 제거 금지 |
| fixed_date가 inherited 날짜와 같음 | 명시 pin 유지 | 그대로 유지 |

Sa의 `source-aware-normalization-required`는 raw-only 편집 경로의 gate로 유지한다. 새 Sb entry만 사적으로 보관한 검증 baseline을 사용해 해당 사유를 해제한다. 임의로 canEdit만 true로 바꿔 기존 raw API에 넘기지 않는다. sourceTitle 부재·unknown owner·invalid baseline 같은 다른 사유는 해제하지 않는다.

## 3. 확정 API·내부 변경

새 source-bound 편집 entry를 추가하되 기존 네 raw-only API의 normalize 결과를 바꾸지 않았다. title decoder의 제한된 수용 범위 변경은 §4에 따로 적었다.

```ts
inspectPersonalPlanSourceEditor({ sourceContext, flowRef })
  // { ok:true, context, draft, baseline, capabilities }
  // sourceContext와 다른 opaque editor context; draft/baseline/capabilities frozen

planPersonalPlanSourceState({
  context, rawState, sourceRead, sourceEpoch, draft, now,
})
  // exact freshness 재검사 → source-aware normalize → 기존 raw state candidate
  // changed이면 revision +1 / undo=정확 before state, no-op이면 그대로
```

sourceContext는 Sa WeakMap의 실제 token만 받고 serialize/clone/trusted flag는 거절한다. 새 editor context 역시 메모리 전용이다. 반환 draft에 raw source/expected store를 복사하지 않는다. 재조회·source 변경·epoch 변경은 기존 초안을 보존한 채 stale로 차단한다. 새 source를 기준 삼으려면 새 context와 명시 재확인이 필요하다. E2의 실제 storage authority를 대신하는 API는 아니다.

후속 승인된 `validateCapturedPersonalPlanSourceDraft({context,draft})`는 입력 중 검사만 제공한다. 반환은 `{ok,scope:'captured-source-draft',reason?}`이며 현재 source freshness·저장 권한·candidate/Undo를 제공하지 않는다. [별도 QA와 14개 회귀](./k3b-plan-source-draft-qa.md)에 계약·실행을 분리했다.

내부 candidate 생성은 기존 revision/Undo 로직을 공유한다. source view를 저장 state로 바꾸지 않고 검증한 overlay만 raw metadata에 넣는다. title의 normalize baseline은 **PoC overlay 전** source/기존 개인 효과다. overlay가 이미 적용된 표시값을 기준으로 자기 자신을 제거하지 않는다. memo baseline은 항상 실제 기존 개인 memo, 날짜 pin/빈 memo/nullable presence는 기존 규칙을 유지한다.

기존 저장된 explicit B가 새 source B와 같아져도 read/reload·clean submit에서 자동 삭제하지 않는다. 편집 시작 시 draft와 각 필드의 mode/value가 그대로면 기존 override의 presence/value를 보존한다. 다른 메모만 바꿔도 untouched title은 남는다. 사용자가 해당 필드를 inherit로 바꾸면 그 override만 제거한다. 반환 candidate를 외부에서 수정해도 private context·다음 candidate·정확 before Undo를 오염시키지 않는다.

## 4. 승인된 metadata validator diff

이전 `validateOverlay`는 저장 title이 raw baseline title과 같으면 거절했다. source A→B 뒤 명시 A는 정상 intent이지만 이 규칙에 걸렸다. C는 source store가 없어도 checkpoint/Undo를 검증해야 하므로 decoder가 현재 source 상태를 읽어 동값 의미를 판단하게 만들지 않았다.

**Flow/Item title의 `value === raw baseline` 거절만 제거**했고, blank/type/exact owner/refs/unknown keys/capture/version/empty record 검사는 유지했다. read/reload에서 값을 자동 제거하지 않는다. 명시 변경의 normalization은 해당 raw-only 또는 source-aware normalizer가 자기 기준으로 담당한다. raw-only 입력에서 동값이 no-op인 기존 결과는 그대로다.

memo는 inherited 기준이 raw 기존 개인 memo이므로 동값 거절을 그대로 유지했다. schedule은 이미 명시 same-date pin을 허용하므로 새 field를 추가하지 않았다. title string이 raw와 같은 저장 shape를 추가 허용한 것은 현재 unpublished PoC strict 계약의 승인된 변경이다. P만 이 작업의 제품 소유 범위이며 C/E2 소비 연결은 별도 담당·gate다.

새 key·독립 Undo·workspace-v3·운영 schema·stored source token·source 전체 복제는 추가하지 않는다. 동값 title을 허용해도 저장 JSON이 우리 writer의 진짜 intent였다고 인증하는 것은 아니다. 기존 strict shape/binding과 명시 편집 경로가 각각의 책임을 가진다.

## 5. 최초 RED와 후속 GREEN

최초 실행 TAP (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-red-20260905.tap`): **6개 중 3 PASS / 3 FAIL**, skip/cancel/todo 0. 당시 raw-only 경로의 source-aware 계약 미충족을 보였다. 승인 후 SB01–03만 새 bound entry로 연결하고 SB04 decoder 기대값, SB05–06 raw-only control을 유지했다. 현재 실행 TAP (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-original-gate-green-20260905.tap`)은 **6/6 PASS**다. `.red.cjs` 파일명은 초기 gate 이력을 보존하며 명시 실행한다.

| ID | 최초 결과 | 실제 근거 |
|---|---|---|
| SB01 | RED | 명시 A가 changed:false가 돼 source B를 표시 |
| SB02 | RED | 명시 B가 changed:true가 돼 불필요 개인 override 생성 |
| SB03 | PASS | 개인 C에서 inherit하면 overlay만 제거하고 B 표시, raw A 보존 |
| SB04 | RED | 명시 title A가 raw와 같다는 이유로 current decoder가 거절 |
| SB05 | PASS | 기존 raw-only A 동값 no-op 유지 — 이 API의 기대값을 바꾸지 않음 |
| SB06 | PASS | sourceTitle 없는 legacy는 기존 개인 기준을 유지하고 raw sourceTitle 생성 0 |

현재 [Sb 23개](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-intent.test.cjs)는 Flow/Item 양쪽 A/B/inherit, 실제 existing-personal title, memo source-equal/빈 값/CRLF, stored overlay read/reload 보존, source-read error/stale/관찰 ABA, 실제 UMD·getter 무실행·후보 오염 방지·기존 반복 차단을 검사한다. changed의 단일 revision/full Undo와 no-op의 state identity/Undo 없음도 확인했다. C current/Undo 및 삭제 회귀는 별도로 실행했다. E2의 실제 prepare/retry/recovery source authority 연결은 아직 후속 범위다.

Sa와 같은 source chain·추가 membership·owner 불명확·반복 규칙 제한은 별도 gate로 유지한다. 임의 실행 날짜/time/회차를 만들어 이 테스트를 통과시키지 않는다. UI에서는 승인된 field부터 canEdit를 열고 owner 문구·빈 값·오류·dirty 취소·키보드·5 viewport를 함께 검사한다.

최초 RED 파일 SHA256: `EECDB86870A09A3CCDFFF0DDA3C2DA5F2DACD5309B44A26188886539CFA6E5AB`. 최초 TAP SHA256: `F99DD9EAE08E7FE2636A08CECD5242950CE2C541AB28DBA5C325B55042D0CEFA`. 현재 caller 변경 파일·제품 해시는 [Sb QA](./k3b-plan-source-intent-qa.md)에 별도 보존한다. 실제 기기/브라우저/사용자 관찰 미실행, 사용자 0명, commit/push/PR/Preview/Production 없음.
