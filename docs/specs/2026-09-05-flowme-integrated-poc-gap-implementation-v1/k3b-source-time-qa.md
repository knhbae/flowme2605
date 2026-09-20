# K3-B B0-T — 원문 시간 공통 읽기 모델 구현·집중 검증

2026-09-05. **최종 집중 테스트 121/121 PASS. 원문 시간 누락 RED 5개를 해결했다.** 이 문서는 B0-T 모델 구현과 직접 실행한 검증만 다룬다. Surface 연결, 전체 npm test, production build, 브라우저 검사는 main의 별도 실행 범위이며 이 결과에 합산하지 않는다.

## 1. 원래 요구와 이번 변화

[구현 전 설계·RED 기록](./k3b-source-time-read-design.md)의 T01·T05·T06·T07·T08은 Result에는 원문 `09:30`이 있지만 개인공간 Task에는 시간이 전달되지 않는 문제였다. [K3-B 설계](./k3b-design.md)의 B0-T에 따라 검증된 원문 속성을 읽는 공통 모델을 만들었다. 제목이나 `sourceTimingLabel`에서 시간을 추정하는 parser는 추가하지 않았다.

| 요구 | 구현 결과 | 검증 |
|---|---|---|
| 개인 실행 시간이 없으면 원문 시간 표시 | 검증한 source index에서 exact Item ref로 읽음 | T01 PASS |
| 개인 실행 시간이 있으면 그것을 우선 | placement.time → 검증된 source time → 없음 | T02 PASS |
| 개인 제목·순서가 바뀌거나 동명 사본이 있어도 원본 Item 구별 | savedCopyId+flowId+itemId와 원문 lineage·membership 검증 | T05·T06, S08·S11 PASS |
| 날짜 미정에서 원문 시간 보존 | 기존 Result와 같은 의미. 새 time-clear 정책 없음 | T07 PASS |
| 기본 시간 순서와 명시 개인 순서 구별 | 원문 시간 기반 기본 정렬 복원, TimelineOrder 우선 유지 | T08·T09 PASS |
| 변조·중복·누락·다른 사본·오래된 index 거절 | 실패 시 부분 속성/index를 공개하지 않음 | T10–T13, S04–S12 PASS |
| 기존 네 saved origin·옛 lineage 보존 | typed source 근거가 없으면 시간 미정 | T03·T04·T14, S13·S14 PASS |
| 실제 승인 source-update 보존 | 기존 base+store composer를 통과한 effective source만 허용. 현재 typed map 없음 유지 | T15, S16·S17 PASS |

T06의 기존 실패는 사본별 시간이 모두 누락된 문제였다. 이전 제품이 다른 사본의 시간을 빌렸다는 재현으로 표현하지 않는다. T13은 기존 state decoder가 막던 parsed.time 변조를 직접 Result 호출도 거절하도록 강화했다. 원문 `09:30`을 두고 snapshot만 `17:45` 또는 `25:99`로 바꾸는 두 fixture를 새 시간 정규식으로 처리하지 않고 기존 원문 재해석 검증으로 거절한다.

## 2. 변경 파일과 검증 소유권

| 파일 | 이번 변경 |
|---|---|
| [source-attributes-contract.ts](../../../lib/flow/personal-workspace-poc-source-attributes-contract.ts) | 기존 Result source DTO를 이동한 공통 타입, opaque read-index 타입 |
| [source-attributes.ts](../../../lib/flow/personal-workspace-poc-source-attributes.ts) | 기존 source identity·snapshot·attribute 검증을 한 구현으로 이동. source index 작성·exact 조회 |
| [result-projection.ts](../../../lib/flow/personal-workspace-poc-result-projection.ts) | 기존 검증 중복 제거, 공통 resolver 사용. 기존 DTO import 경로는 재export로 유지. optional sourceIndex |
| [state.ts](../../../lib/flow/personal-workspace-poc-state.ts) | 기존 isAuthoredFlow의 export alias만 추가. 함수 본문·decoder·writer 불변 |
| [view-model.ts](../../../lib/flow/personal-workspace-poc-view-model.ts) | optional source index, Item ref별 source time fallback, invalid index의 부분 Task 차단 |
| [source-time.test.ts](../../../lib/flow/personal-workspace-poc-source-time.test.ts) | 기존 RED 15개의 caller를 명시 source index에 연결. 요구 기대값 유지 |
| [source-attributes.test.ts](../../../lib/flow/personal-workspace-poc-source-attributes.test.ts) | 신규 S01–S18 안전성·기존 입력 호환·런타임 의존 검사 |

기존 세 제품 파일은 시작 전부터 dirty였으므로 HEAD diff 전체를 이번 작업으로 취급하지 않았다. before-source-time 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-source-time/lib/flow/personal-workspace-poc-result-projection.ts`)과 실제 변경을 비교했다. 특히 state.ts는 이번 alias를 제거한 문자열이 백업과 같다는 검사를 실행해 PASS했다. 기존 QuickConversion·다른 단계 변경은 유지했다. Surface·standalone 앱·schema·저장 writer·생성 HTML은 이 하위 작업에서 수정하지 않았다.

## 3. 실제 API와 호출 경계

```ts
buildPersonalWorkspacePocSourceReadIndex({
  baseModel,
  authoredFlows,
  sourceCandidateStore,
}); // { ok: true, index } | { ok: false, reason }

resolvePersonalWorkspacePocSourceFlow(prePersonalFlow, index);
readPersonalWorkspacePocTaskSourceContext(index, personallyComposedFlow);
buildPersonalWorkspacePocTasks(composedModel, state, index);
buildPersonalWorkspacePocResultProjection({ ...existingInput, sourceIndex: index });
```

index는 무저장·일시적인 읽기 문맥이다. 공개 handle은 frozen `{version:1}`뿐이고 실제 값은 모듈 내부 WeakMap에 둔다. rawText·Map·속성을 handle의 JSON에 싣지 않는다. 기존 Result의 원문 보존 DTO에는 원문 rawText가 계속 포함된다. 이를 새 저장 payload로 쓰지 않는다.

Result는 개인 overlay 전 Flow가 index 생성 당시 원본과 JSON 값·순서까지 같은지 확인한다. Task는 개인 제목·메모·날짜·순서 변경을 허용하되 source lineage와 정확한 Item membership을 확인한다. stale/foreign context가 하나라도 있으면 부분 Task를 반환하지 않는다. **Surface가 이를 빈 정상 목록으로 표시해서는 안 된다.** main은 index 작성·composed flow 검증 실패를 기존 `/my` fail-closed 진입과 연결한다. 이 문서의 pure 검사만으로 그 화면 연결 완료를 인증하지 않는다.

전체 authored snapshot은 기존 isAuthoredFlow 구현으로 검증한다. 실제 source-update는 원래 base와 검증된 source candidate store를 기존 composer에 통과시킨다. `trusted:true`나 parseResultId 접두어만으로 예외를 열지 않는다. 지금 effective source-update에는 typed map이 없으므로 새 raw/label이 `17:00`이어도 typed time은 undefined이며, 옛 원문 `09:30`으로 돌아가지 않는다.

### 직접 Result 호출의 영향

- 완전 materialized authoring preview는 index 없는 기존 호출도 정상이며 source-preview/personal-execution 완료 소유권이 그대로다(S15).
- 옛 유효 lineage도 정상이며 mapping/time 없음으로 반환한다(S13).
- 실제 effective source-update는 이제 **base+store에서 작성한 index가 필요하다**. provenance 없는 direct effective Flow는 거절한다(S16). main의 개인공간 Result caller 연결이 필요한 변경이다.
- Tasks의 두 실제 소비 경로(첫 목록, transition 뒤 결과 재조회)도 같은 index를 받아야 한다. optional 인자 미제공 caller는 기존 동작을 유지하지만, 그것을 시간 누락 해결의 근거로 삼지 않는다.

## 4. cache·런타임 의존 검증

초기 구현 검토에서 source/context 값이 TypeScript readonly일 뿐 런타임에서는 수정될 여지가 있었다. input을 JSON 복사한 뒤 값과 중첩 배열·객체를 deep-freeze하고, 조회마다 Map을 복사하도록 수정했다. S03은 rawText·attributes.time·sourceLine·Item 제목·중첩 subcheck 수정 시도와 반환 Map.clear 뒤 재조회가 원래 값 그대로임을 확인한다. S10은 index 작성 후 caller 원본을 바꿔도 cache가 바뀌지 않으며 바뀐 입력 자체는 거절됨을 확인한다.

S18 실제 결과는 `runtimeModules:9, runtimeCycles:0, dtoRuntimeImports:0`이다. TypeScript AST의 type-only import를 제외한 해당 helper의 로컬 정적 import 그래프를 순회했고, Result/ViewModel로 역참조하지 않음을 확인했다. 공통 DTO를 CommonJS로 transpile한 결과에도 require가 없다. 테스트에서 실제 모듈 import도 실행됐다. 이것은 전체 저장소가 cycle-free라는 주장이 아니다.

## 5. 자동 테스트 실행 원장

| 실행 | 등록 테스트 결과 | 실제 로그 |
|---|---|---|
| 구현 전 최초 RED | 14개: 9 PASS / 5 FAIL | red-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-red-first-20260905.tap`) |
| fixture 타입 수정 후 RED | 14개: 9 PASS / 5 FAIL | red-final (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-red-final-20260905.tap`) |
| source-update 긍정 단독 | 1/1 PASS | source-update-positive (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-source-update-positive-20260905.tap`) |
| 구현 전 최종 RED | 15개: 10 PASS / 5 FAIL | final15 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-final15-20260905.tap`) |
| 추출 연결 후 기존 회귀 | 67/67 PASS | existing-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-attributes-existing-first-20260905.tap`) |
| source index caller 연결 후 | 15/15 PASS | time-green-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-green-first-20260905.tap`) |
| cache 수정 포함 신규 안전성 | 18/18 PASS | safety-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-attributes-safety-first-20260905.tap`) |
| **최종 합동 집중 검사** | **121/121 PASS**, skip/cancel/todo 0 | focused-final (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-attributes-focused-final-20260905.tap`) |

최종 실행은 8개 파일을 명시한 `tsx --test`다: source-time 15개 + source-attributes 18개 + 기존 Result/State/ViewModel/Canonical 67개 + SourceCandidate 12개 + CrossSurface 9개 = 121개(신규 33, 기존 88). TAP 최상위 114개에 nested 7개가 있어 runner 합계가 121이다. 5,000-step state simulation과 31-case parity corpus는 각각 등록 테스트 안의 반복이며 별도 5,000개·31개로 더하지 않는다.

구현 전 반복 실행은 44회(29 PASS/15 FAIL)이며 같은 다섯 요구를 세 번 실패한 기록이다. 구현 후 반복 실행은 221회 모두 PASS다. 최종 완료 판정은 반복 합계가 아닌 최종 고유 등록 121개를 사용한다. B0-M의 별도 62개나 main의 Surface·전체 시험은 합산하지 않는다.

최초 strict TS의 4 diagnostics는 테스트 fixture의 TimelineOrder.revision 누락 1개와 readonly authoring 재할당 3개였다. 기대값을 바꾸지 않고 테스트 타입 구성을 고쳤다. 최종 제품·신규 테스트 6개 파일의 `tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck`는 PASS했다. `git diff --check`도 PASS했다. `git diff --no-index`의 exit 1은 백업과의 의도된 diff가 존재한다는 뜻이며 시험 실패가 아니다.

문서 확인은 `npm.cmd run docs:check` PASS(required files 16, local links 5,216)다. 위 소유 경로로 `workflow:closeout`을 실행하고 백업 대비 실제 diff를 별도로 검토했다. closeout의 전체 npm test/build 권고는 실행 결과가 아니며 해당 검사는 main에 인계했다.

## 6. 저장 경계와 남은 검증

공통 reader는 localStorage를 받거나 쓰지 않는다. fixture 조회 전후 JSON을 비교해 원문 raw·state·placements·completions·Undo가 바뀌지 않음을 확인했다. 이 pure 근거를 실제 운영 localStorage byte audit로 표현하지 않는다. schema·운영 writer·새 시간 삭제 정책 변경은 없다.

남은 범위는 main의 Surface fail-closed 연결, production build, 전체 npm test와 실제 브라우저 시나리오다. 원문09:30 행·개인11:45·날짜 미정·기본/개인 순서·Undo·source-update·동명 사본·5 viewport를 확인해야 한다. index 실패를 빈 목록으로 보이는지와 typed map 없는 source-update의 지원 한계도 구별해야 한다. source-update에 typed map을 새로 만드는 작업은 이번 B0-T에 포함하지 않았다.

| 검증·발행 구분 | 이 하위 작업 상태 |
|---|---|
| 집중 자동 테스트 / strict TS | PASS |
| 전체 npm test / production build | main 별도 실행, 여기서는 미실행 |
| 브라우저 / 화면 캡처 | 이 하위 작업 미실행 |
| 실제 Android Chrome / iOS Safari / 보조기술 | NOT_RUN |
| 관찰 사용자 | 0명 |
| commit | 없음 |
| push | 없음 |
| PR | 없음 |
| Preview | 없음 |
| Production | 없음 |

## 7. 최종 해시

| 파일 | SHA256 |
|---|---|
| source-attributes-contract.ts | `57BA65FEA102B5EA1D8CC44A689886C3F294A66FAB5DD765C5F06E8BD857BBDB` |
| source-attributes.ts | `684D5753193FD2B526342DF1A3925DFB1DE9D3BBC42705EF0D2678D3C28C3E4B` |
| source-attributes.test.ts | `EB1AEFAC65E84E705D1B9A60CA41B9D1BA7598AAB29859FD5A52F7C6E6AD98A5` |
| source-time.test.ts | `88497AD57D0A46B42F790A1C551768FCE3F80D70ADD39D43F9C7C0D05C4F0FA8` |
| result-projection.ts | `8CD6F317284DFB23546834ED32A2896E173DCC1DE72EBFF8F2042C3F64E13F17` |
| state.ts | `7FDB9D4E1B117E50DCF30DD36D781CF190FCAC9B0A89D9CCA62BC89D769A4A10` |
| view-model.ts | `B8D0A38315AF5E80A7DBA66567B7C4B394FCE1658D870F0EEDFBFF008CA18F80` |
| focused-final TAP | `91C736FAAAFE32B11EFFC28484AAAC867B7FDDF100534FFAF85EBE2E76DEFA47` |

기존 세 파일의 before SHA는 [구현 전 설계 §6](./k3b-source-time-read-design.md)에 있다. 그 값과 동일한 백업임을 재확인한 뒤 수정했고, 변경 범위는 해당 백업으로 검토했다.
