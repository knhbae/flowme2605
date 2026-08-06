# P0-05 공개·저장 Plan/Item 공통 editor transaction closeout

**판정:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 조상으로 둔 local working tree
**실행일:** 2026-08-04 KST
**변경 경계:** headless Plan→Item transaction, 공통 닫기 event matrix, 선언형 commit effect, 원자 Plan commit adapter 계약, 독립 rollback flag, tests
**시각 surface 연결:** 하지 않음 — P0-06 범위
**Publish:** commit/push/PR/CI/merge/Preview/Production 모두 미실행
**실제 관찰 사용자:** `0명`

## 1. 사용자 결과 계약

공개 Flow와 저장한 내 Flow가 서로 다른 임시 상태·취소 규칙을 만드는 대신, 아래 하나의 transaction 규칙을 공유할 기반을 만들었다.

- Plan editor가 부모 draft를 소유한다.
- Item editor는 Plan 안에 한 단계만 중첩되고, Item의 `적용`은 부모 draft만 갱신한다.
- 최종 Plan commit 전에는 Saved Item도 localStorage를 직접 쓰지 않는다.
- Cancel, 상단 X, backdrop, Escape, browser Back은 같은 reducer event를 사용한다.
- clean은 현재 가장 안쪽 editor만 닫고, dirty/error는 `계속 수정 / 변경 버리기`를 먼저 요구한다.
- 중첩 Item을 닫거나 버려도 부모 Plan draft와 원래 route/query/scroll/focus가 남는다.
- validation·runtime·storage 실패는 현재 draft를 유지하며 첫 오류 위치를 effect로 돌려준다.

이번 단계는 이 규칙을 실제 화면에 붙이지 않았다. 공개/저장 editor surface 통합, 실제 saved-overlay writer 연결, browser history·DOM focus effect 실행은 P0-06에서 한다.

## 2. 두 frame session, 여섯 정상 상태와 한 중지 상태

[flow-editor-transaction.ts](../../../lib/flow/flow-editor-transaction.ts)는 하나의 `FlowEditorSession<PlanDraft, ItemDraft>` 안에 Plan root와 선택적 Item child를 둔다. Item은 Plan 없이 열리지 않으며 두 번째 Item이나 submitting/success parent 위의 Item도 열리지 않는다.

각 frame은 다음을 독립적으로 보존한다.

- immutable baseline과 현재 draft
- `context=public-draft | saved-overlay`
- `level=plan | item`
- transaction ID, revision, submission request ID와 attempt
- validation과 first-error focus token
- route/query/hash/history key
- window·editor scroll target과 좌표
- opener focus token과 fallback selector

정상 편집 lifecycle은 명세의 여섯 값을 사용한다. 여기에 저장 전 상태의 복구를 검증하지 못한 경우만 사용하는 예외적 중지 상태 `recovery-required`를 추가했다. 이 값은 정상 오류 복구 흐름이 아니라 partial write를 성공이나 재시도 가능 오류로 오인하지 않기 위한 hard stop이다.

| 상태 | 의미 |
|---|---|
| `clean` | baseline과 현재 draft가 구조적으로 같음 |
| `dirty-valid` | 변경이 있고 현재 validation 통과 |
| `dirty-invalid` | 변경이 있으나 첫 오류가 있음 |
| `submitting` | 한 request/revision의 effect 실행 중 |
| `success` | 해당 request/revision 반영 성공, close 정리 전 |
| `recoverable-error` | draft를 유지한 채 다시 수정하거나 재시도 가능 |
| `recovery-required` | rollback 검증 실패로 persisted state가 불확정이며 수정·재시도·닫기·버리기를 모두 차단 |

사용자가 값을 원래대로 돌리면 단순 `한 번 수정함` flag가 아니라 baseline 구조 비교에 따라 다시 `clean`이 된다. draft는 `structuredClone` 가능한 plain data만 받으며, draft와 return point, effect payload를 복제해 caller의 후속 mutation이 transaction을 바꾸지 못하게 했다.

## 3. 네 context의 effect 소유권

네 context는 reducer와 close matrix를 공유하고 commit role만 다르다.

| Context | Level | Commit role | 허용되는 변경 |
|---|---|---|---|
| Public draft | Plan | `apply-public-draft` | 공개 session projection |
| Public draft | Item | `apply-item-to-parent-public-draft` | 부모 public Plan draft |
| Saved overlay | Plan | `save-personal-overlay` | 최종 personal overlay transaction |
| Saved overlay | Item | `apply-item-to-parent-personal-draft` | 부모 saved Plan draft |

Item effect adapter는 새 부모 draft를 반환하는 순수 merge 계약이며 persisted writer를 받지 않는다. Item 성공 시 부모 draft/revision/validation만 갱신하고 child를 `success`로 만든다. child success를 정리하면 Item return point로 돌아가되 부모는 열린 채 남는다.

Plan effect는 임의의 즉시-write callback을 받지 않는다. caller가 읽기 전용 prepare 단계에서 exact pre-state를 잡고 `commit + rollbackAndVerify`를 제공해야 한다. commit 도중 일부 상태를 바꾼 뒤 실패해도 adapter가 rollback과 exact verification을 끝낸 경우에만 일반 `commit-failed`를 반환한다. rollback이 `false`를 반환하거나 throw하면 별도 `commit-recovery-required` event와 `recovery-required` 잠금 상태로 들어간다. P0-06은 실제 writer가 이 계약과 durable recovery를 충족할 때만 flag-on 경로에 연결하며, 불완전 rollback을 재현하면 구현을 중지한다.

## 4. 공통 닫기 event matrix

아래 규칙을 Public Plan, Public Item, Saved Plan, Saved Item에 같은 reducer로 적용했다.

| 현재 상태 | Cancel / X / backdrop / Escape / browser Back |
|---|---|
| `clean` | 가장 안쪽 frame 즉시 닫기 + 해당 return point 복원 effect |
| `dirty-valid` | `계속 수정 / 변경 버리기` confirmation effect |
| `dirty-invalid` | 같은 confirmation effect; invalid draft 유지 |
| `submitting` | 닫기·편집·중복 commit 차단; browser Back history boundary 재설정 effect |
| `recoverable-error` | draft·오류를 유지하고 같은 confirmation effect |
| `recovery-required` | 닫기·편집·재시도·버리기 차단; browser Back history boundary 재설정과 복구 안내 effect |
| `success` | 중복 commit 없이 success 정리 후 return point 복원 |

dirty browser Back은 prompt를 띄우기 전에 history boundary를 다시 세우라는 effect를 함께 낸다. `계속 수정`은 frame·draft·status·부모를 그대로 보존한다. `변경 버리기`는 현재 가장 안쪽 frame만 없애며 Item의 경우 부모 Plan 객체 내용, revision, origin을 바꾸지 않는다.

## 5. validation·오류·중복 제출

- invalid commit은 commit effect를 0개 만들고 `firstErrorFocus`만 반환한다.
- submitting 중 edit, 새 commit, close는 state를 바꾸지 않는다.
- success/failure 응답은 transaction ID + request ID + revision이 모두 현재 submission과 같을 때만 받는다.
- runtime/storage failure는 baseline, draft, revision, submission attempt를 보존한다.
- 오류 뒤 draft를 다시 수정하면 이전 failure를 지우고 현재 validation으로 상태를 다시 계산한다.
- retry는 draft를 바꾸지 않고 attempt를 증가시킨다.
- Plan effect 실패 fault test는 fake persisted state를 실제로 부분 변경한 뒤 throw하고, exact backup 복원과 검증 뒤 persisted state 불변을 확인한다.
- rollback 검증이 `false`이거나 throw하는 두 fault test는 일반 오류로 내려가지 않고 transaction이 `recovery-required`로 잠기는지 확인한다.

## 6. 독립 rollback seam

[p35-round2-flags.ts](../../../lib/flow/p35-round2-flags.ts)에 `editorTransaction=off`를 추가했다.

- 기본값은 on이다.
- 정확히 소문자 `off`만 legacy mode를 선택한다.
- `saveLifecycle=off`와 독립적이다.
- `selectFlowEditorAdapter`가 flag-on shared adapter와 flag-off legacy handler reference 중 하나만 선택한다.

P0-05는 headless 경계이므로 이 flag를 AppClient에 아직 연결하지 않았다. 실제 네 surface의 flag-on/flag-off 분기는 P0-06이 소유한다. 기존 Saved Item 즉시-write handler와 Saved Plan 다중-write handler도 삭제하거나 migration하지 않았다.

## 7. 기존 E2E gate 정합성 보정

필수 회귀 두 파일을 처음 실행했을 때 9개 중 6개가 실패했다. 원인은 P0-05 reducer가 아니라 두 개의 기존 gate drift였다.

1. `openPublicAdjustment`의 지연 callback이 `FlowBottomSheet`가 정한 첫 kind button focus를 다시 panel 자체로 빼앗았다. 시각 구조를 바꾸지 않고 중복 `focus()`만 제거해 기존 initial-focus 계약을 복구했다.
2. P0-04가 공개 저장을 동적 personal-copy identity의 `/my` 상세 직접 이동과 session-only public Apply로 바꿨지만, P26/P35 테스트 일부가 예전 public receipt와 legacy item-state write를 기대했다. 제품 동작을 되돌리지 않고 direct route와 legacy key 불변을 검증하도록 갱신했다.

수정 후 같은 9개 시나리오는 모두 통과했다. 이 보정은 P0-06의 공통 surface를 미리 구현한 것이 아니며, 현재 AppClient는 새 transaction module이나 editor flag를 import하지 않는다.

## 8. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| 네 context가 같은 event matrix 재사용 | PASS | 4 context × 6 close-relevant status × 5 close event table test |
| submitting 중 double commit·partial reducer state 없음 | PASS | edit/commit/close 무효, transaction/request/revision stale response 거부 |
| clean close가 innermost만 닫고 origin 복원 | PASS | Plan/Item별 exact return-point effect 비교 |
| dirty close가 계속 수정/변경 버리기 명시 | PASS | action ID와 한국어 label 고정, continue/discard 분기 비교 |
| nested Item Back/discard가 부모 보존 | PASS | parent draft/revision/location/scroll/focus exact equality |
| invalid/runtime/storage 오류에서 draft·first-error 보존 | PASS | invalid focus-only, recoverable error, retry test |
| 일반 오류가 persisted state를 바꾸지 않음 | PASS | prepared atomic Plan operation의 부분 write→throw→exact rollback fault test |
| rollback 검증 불완전 상태를 안전한 오류로 오인하지 않음 | PASS · hard stop | false/throw 두 경우 모두 `recovery-required`; edit/retry/close/discard 차단. P0-06 실제 writer에서 발생하면 연결 중지 |
| Public/Saved effect target 분리 | PASS | 네 role 중 matching handler만 1회 호출, Item에서 Plan writer 0회 |
| 독립 rollback 경계 | PASS · headless | query flag와 shared/legacy selector test; runtime wiring은 P0-06 |
| P0-06 시각 surface를 선행 구현하지 않음 | PASS | AppClient에 transaction/flag import 0, 기존 surface 유지 |

## 9. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| transaction + flag targeted | PASS · 138/138 | 네 context close matrix, nested parent, effect owner, verified/incomplete rollback, stale/double submit |
| `npm.cmd run test:p35-p0` | PASS · 191/191 | P35 P0 contract와 새 transaction 회귀 |
| `npm.cmd test` | PASS · pretest 106/106 + P35 191/191 + main 603/603 | 전체 unit/workflow 회귀 |
| `npm.cmd run build` | PASS · Next 15.5.21, 18/18 pages | production compile·type gate |
| P26 quick editor + P35 one-kind Playwright | PASS · 9/9 | mobile/wide editor 회귀, focus, Back, session-only Apply |
| `npm.cmd run docs:check` | PASS | 단계 문서·로컬 링크·형식 |
| `git diff --check` | PASS | whitespace/error 없음 |

이 표의 최종 build/docs/diff 결과는 closeout 직전 최신 파일로 다시 실행한다. 자동·브라우저 검증은 내부 시뮬레이션이며 관찰 사용자 검증이 아니다.

## 10. 소유 파일과 dirty 경계

이번 단계가 소유한 파일:

- `lib/flow/flow-editor-transaction.ts`
- `lib/flow/flow-editor-transaction.test.ts`
- `lib/flow/p35-round2-flags.ts`와 test의 editor flag 범위
- `package.json`의 P35 P0 unit gate
- `components/flow/AppClient.tsx`의 중복 panel focus 1줄 제거
- `tests/e2e/p26-quick-advanced-editor.spec.ts`의 P0-04 direct-save setup 정합화
- `tests/e2e/p35-adjust-one-kind.spec.ts`의 session-only public Apply assertion 정합화
- 이 closeout과 active spec ledger

P0-01~P0-04 변경과 시작 전 dirty였던 `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/specs/README.md`, `docs/content-audit/2026-08-03-*`는 삭제·정리·stage하지 않았다.

## 11. Rollback·제외·다음 gate

- rollback 단위: 위 P0-05 code/test/docs와 `editorTransaction=off` selector seam.
- 공개/저장 editor의 실제 sheet/panel 구성, dirty prompt UI, browser history listener, DOM focus/scroll 실행은 P0-06이다.
- 카피 전환, capability result preview, `/my` library IA는 P0-07·P0-08 이후 범위다.
- execution completion·실행 메모는 authoring transaction에 넣지 않았다.
- Saved Plan writer가 exact rollback/durable recovery를 제공하지 못하거나 Item Apply에 storage write가 필요하면 P0-06 구현을 중지하고 이 계약으로 돌아온다.
- Local edit: 있음
- Commit/Push/PR/CI/Merge/Preview/Production: 모두 없음
- 자동·브라우저 내부 검증: 완료
- 실제 사용자 관찰: `0명`
- 다음 strict-order gate: **P0-06 공개·저장 Plan/Item 공통 editor surface**
