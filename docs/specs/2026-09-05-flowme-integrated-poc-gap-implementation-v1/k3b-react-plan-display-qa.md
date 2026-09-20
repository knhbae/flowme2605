# B3 React Plan 표시 모델 QA

2026-09-06. 새 순수 표시 계약과 페이지 함수 **20/20 PASS**, 엄격 TypeScript 검사 **2파일 PASS**다. 기존 receipt v1과 제품 저장 schema를 바꾸지 않았다. **Surface 연결·실제 저장·브라우저 성공을 이 검사로 판정하지 않는다.**

## 0. 현재 후보 합동 재검

승인된 genuine no-op 분류와 freeze가 반영된 PlanEditor `34F10DD8…` 기준으로 기존109+display20+no-op5를 다시 실행했다. **134/134 PASS**이며 Node 총수는 top-level104와 기존 nested30을 포함한다. 같은 실행을 기존109/새20/새5의 별도 성공 수와 중복 합산하지 않는다. SSR10은 별도 실행으로 **10/10 PASS**다.

- 모델134 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/react-plan-current-models134-2026-09-05T17-45-39-956Z.json`) / 27파일 전후 exact (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/current-plan-display-validation-20260906-01/models-hashes-1788630341014.json`)
- SSR10 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/react-plan-current-ssr10-2026-09-05T17-45-41-091Z.json`) / 27파일 전후 exact (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/current-plan-display-validation-20260906-01/ssr-hashes-1788630341819.json`)
- 새 current runner (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/current-plan-display-validation-20260906-01/run-current.cjs`): 기존109의 정확한8개 검사에 신규2개 파일을 추가, 중복 파일0. PlanEditor/새 파일에는 명시 current SHA pin, 나머지 기존109 source/test에는 역사 SHA exact 비교를 적용한다.

그 전에 root가 옛109 runner를 그대로 실행한 0개 실행 종료 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/react-plan-boundaries-existing109-2026-09-05T17-43-06-217Z.json`)는 no-op 수정으로 `B7E90…` 역사 pin이 달라진 데 따른 guard 차단이다. 제품 검사1FAIL이나134검사실패로 세지 않는다. 옛 runner·pin·역사 JSON은 수정하지 않았다.

현재 사용자 HTML2개는 root가 만든 `7D1610AA…`다. 옛889B와 같다고 주장하지 않고 각 실행 중 불변만 기록했다. 모델/SSR는 HTML을 실행하지 않는다. Surface는 `CE825646…`의 파일 hash만 전후 기록했으며, 이는 해당 Surface의 실제 브라우저·mounted 검증 결과가 아니다. 기존 검사가 실행한 storage fixture 결과와 신규 표시 모델의 facts fixture도 분리한다.

## 1. 실제 구현

소유 파일은 신규 [plan-display.ts](../../../lib/flow/personal-workspace-poc-plan-display.ts)와 [plan-display.test.ts](../../../lib/flow/personal-workspace-poc-plan-display.test.ts) 두 개다. 이 QA 외 기존 제품·검사·보고서·사용자 HTML은 수정하지 않았다.

```ts
createPersonalWorkspacePocPlanDisplay(input, sourceFlow)
// { ok:true, display } | { ok:false, error }

selectPersonalWorkspacePocPlanDisplayPage(display, pageIndex)
// { ok:true, page } | { ok:false, error }
```

- Input은 기존 receipt의 `receiptId/intentId/operation/status/createdAt/scopeRef/revision/counts/changes/rollback` 이름을 유지한다. `retryIntent`는 입력/출력에서 금지한다. 상태에 `preview`를 추가했다.
- Output은 별도 `contract:'flowme-personal-workspace-plan-display-v1'`, `version:1`이다. full changes와 full affectedRefs를 보존하고 `changedFieldCount/affectedCount/flowCount/itemCount`를 계산한다. 기존 v1 receipt로 cast하거나 부분 v1 receipt를 여러 개 만들지 않는다.
- `sourceFlow`의 exact Flow tuple·Item tuple/ref/sourceOrder·지원 section을 field→직접 owner 맵으로 대조한다. field/refs 중복, foreign scope, read-only section, 알려지지 않은 Plan field, 허위 aggregate Flow owner를 거절한다. Item ID에 `.`가 있어도 문자열 split으로 소유자를 추정하지 않는다.
- label은 trim-exact·160자, value는 기존 scalar/160자/제어문자 규칙을 유지한다. 표시 factory가 임의로 unsafe input을 잘라 고치지 않는다. 앞선 summary normalizer가 표시용 값을 만든다.
- root success/undone은 해당 상태의 revision+1·target1·실제 변경·rollback 규칙을 요구한다. failure는 errorCode/rollback만 가지며 retry 권한을 반환하지 않는다. child는 preview/noop/canceled와 저장0 failure만 허용한다. child 저장 success/undone/saving을 만들지 않는다.
- 출력과 nested 배열/행은 복사 후 freeze한다. source/draft/raw/guard/Undo snapshot은 반환하지 않는다. 페이지는 10행, 0-based half-open start/end이며 전체 totals를 함께 제공한다. 정상 정수 pageIndex는 마지막 페이지로 clamp, 음수/소수/NaN은 거절한다. 빈 목록은 pageCount1/rows0이다.
- 페이지 함수는 같은 모듈 factory가 발급한 frozen 객체만 받아 cloned/forged display를 거절한다. WeakSet은 **표시 provenance**이며 저장·retry·Undo 권한이 아니다. reload 복구 token으로 사용할 수 없다.

## 2. 실제 등록 검사

| ID | 확인한 범위 |
| --- | --- |
| PD01 | actual opener/summary 100·101개의 full fields/refs/counts 유지, 기존 v1 factory는100허용/101거절 |
| PD02 | 51개 Item×2필드=102fields/51owners, Flow1로 축소하지 않음 |
| PD03 | Flow 제목/구간/순서 + 한 Item 메모/날짜=5fields/2owners, Flow1·Item1 |
| PD04 | preview/saving/noop/failure/canceled/success/undone 7상태의 정상 shape |
| PD05 | revision/write/rollback/상태 extras/fake noop/자기 자신 Undo 거절 |
| PD06 | failure rollback facts, retryIntent 부재·주입 거절 |
| PD07 | 중복 field/ref, count 불일치, 직접 owner set 불일치 거절 |
| PD08 | 동명 다른 사본/tuple drift/중복 Item/foreign scope 거절 |
| PD09 | exact Plan field만 허용, 원문/완료/폴더/read-only section/중복 section 거절 |
| PD10 | child 단일 Item scope·parent-plan 취소·0쓰기 실패, 이웃 field/저장 성공 위장 차단 |
| PD11 | unknown/raw/authority/version/count 주입·필수값 부재·optional undefined 거절 |
| PD12 | input/change/source own getter를 호출0으로 거절 |
| PD13 | cycle/class/array 확장 key/sparse array/symbol/toJSON 거절, toJSON 호출0 |
| PD14 | 표시 문자열·값·식별자·날짜의 unsafe 입력 거절 |
| PD15 | 101/102 전체 행을11페이지로 순서/값 exact 재구성, 각 page≤10·full totals 유지 |
| PD16 | 빈 page/clamp/잘못된 index/clone·foreign display의 명시 결과 |
| PD17 | 원본 입력 불변·복사/freeze·page 조회 후 full display 불변 |
| PD18 | 101개 inverse 표시의 exact fields/refs 보존, 실제 Undo snapshot 생성/소비 없음 |
| PD19 | 상태별 필수 own field 부재 시 inherited getter 실행0, prototype 값 채택0 |
| PD20 | 잘못된 source membership 거절·무관한 source 원문을 출력에 복사하지 않음 |

20은 등록 검사 수다. PD01의100/101, PD04의7상태, PD15의11페이지, 여러 negative loop를 별도 검사로 더하지 않았다.

## 3. 실행 이력과 재현

| 실행 | 결과 | 근거 |
| --- | --- | --- |
| 첫18 | 18/18 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-display-first18-2026-09-05T17-10-28-013Z.json`) |
| 첫 strict | exit0 | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-display-strict-first-2026-09-05T17-10-29-317Z.json`) |
| own-field negative 보강 후20 | **20/20 PASS**, fail/skip/cancel0 | 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-display-final20-2026-09-05T17-13-09-800Z.json`) |
| 최종 strict | **exit0**, 대상2파일 | 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-display-strict-final-2026-09-05T17-13-12-320Z.json`) |

새 모듈은 처음부터 구현과 함께 등록했다. 이번20이 기존 제품에서 RED→GREEN으로 재현됐다고 쓰지 않는다. strict와 순수 검사는 JSON의 실제 command로 재현할 수 있다. 각 JSON은 전체 로그 경로도 포함한다.

```powershell
node docs/specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/run-check.cjs k3b plan-display-check node_modules/tsx/dist/cli.mjs --test lib/flow/personal-workspace-poc-plan-display.test.ts
```

## 4. 저장·권한 경계

이번 검사는 actual Plan opener와 summary로 fixture를 만들지만 **실제 저장 handler는 호출하지 않는다.** input의 `targetWriteCount:1` 등은 상태 validation용 facts fixture이지 이번 실행에서 발생한 API 수가 아니다. 이전 순서 표시109 QA의20 API와도 합치지 않는다.

모듈은 storage/DOM/network/clock callback을 받지 않으며 writer를 호출하지 않는다. `createdAt`은 caller가 준 ISO 문자열을 검증할 뿐 생성하지 않는다. 전체 변경과 totals를 검사해도 실제 저장 성공·현재 권한이 증명되는 것은 아니다.

`sourceFlow` 검증은 display field identity/membership에 한정한다. source 내 기존의 일반 데이터는 읽고 소유자 계산에 쓰지 않는 부분을 반환하지 않는다. 완전한 원문 fidelity/현재 source freshness/편집 가능성을 이 factory가 판정한다고 주장하지 않는다. genuine opener와 actual source/working/raw guard는 root의 Surface/handler가 유지해야 한다.

기존 v1 receipt 파일 SHA는 계속 `729E391F29928C271969EB3D2E762A0A9B7947BE9E6865FF901B8EAAAD44BA3D`다. 기존 cap 기대값을 고치지 않았고, 신규 PD01이 동일 v1 factory의100/101 결과를 직접 대조했다. 기존 전체109를 이번 단계에서 다시 실행한 결과는 아니다.

## 5. 동결 파일과 남은 통합 검증

| 파일 | SHA256 |
| --- | --- |
| plan-display.ts | `859C1C4BB588B06E7CAC005CFA8AE207B1B0E21186535295151EE5EB03FB5E01` |
| plan-display.test.ts | `E66A5F00F7FF8EF03B500D91E2D22F6B169EA94C917885703339D3FDDBAF39FD` |

남은 gate는 [큰 Plan 설계](./k3b-react-large-plan-receipt-design.md)의 Surface saving/failure/cancel/finalize/Undo 전체 연결이다. root는 실제 attempt/evidence·non-throwing close·source/workspace drift·paging/live/focus를 별도로 검증한다. 순수 factory가 fake facts를 형식상 받아들였다는 이유로 success/Undo 권한을 부여하면 안 된다.

이 하위 단계의 전체 npm test·production build·브라우저/5viewport·실기기·보조기술은 NOT_RUN, 관찰 사용자0. commit 없음 / push 없음 / PR 없음 / Preview 없음 / Production 없음. 기존 `/my`·운영 데이터·사용자 HTML·기존 보고서는 변경하지 않았다.
