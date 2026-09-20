# K3-B B0-T — 원문 시간 읽기 RED와 공유 검증 설계

2026-09-05. **제품 수정 0 / 신규 pure 검사 15개 중 10 PASS·5 FAIL / 구현 전 동결**. [K3-B §3 B0-T](./k3b-design.md)와 [기존 실제 브라우저 진단](./k2c-found-k3b-source-time.md)을 따라 원문 시간 누락을 모델에서 재현했다. 이번 브라우저 재실행·UI 수정은 없다.

## 1. 실제 재현과 요구

`materializePersonalWorkspacePocAuthoring`의 실제 CRLF 원문 `시간: 09:30`으로 만든 Flow는 ResultProjection에서 `09:30`을 갖지만 `buildPersonalWorkspacePocTasks`의 `time`은 undefined다. `sourceTimingLabel`에 `09:30`이 있다는 사실만으로 typed time을 만들지 않는다. 명시 개인 placement가 없는 경우에도 **검증된 원문 속성**을 읽어야 한다.

| 신규 검사 | 최종 결과 | 뜻 |
|---|---|---|
| T01 원문09:30, 개인 시간 없음 | FAIL | Result09:30 / Task없음 |
| T02 명시 실행11:45 | PASS | source09:30과 별도 소유, 두 결과11:45 |
| T03 typed time 없는 원문 | PASS | 시간 미정 유지 |
| T04 saved-origin `D-2 · 09:30 · Asia/Seoul` label | PASS | label에서 HH:mm을 추정하지 않음 |
| T05 개인 제목·전체 순서 변경 | FAIL | 원래 ref별09:30/15:20 전달 누락 |
| T06 동명 Flow/Item 두 사본 | FAIL | 각 사본09:30/16:10 전달 누락. 현재 다른 사본 시간을 빌린다는 재현은 아님 |
| T07 unscheduled 실행 날짜 | FAIL | 날짜 없음 유지, 기존 Result는 원문09:30 보존하지만 Task누락 |
| T08 기본 시간 정렬 | FAIL |09:30이13:40보다 먼저 와야 하나 source 배열 순서 사용 |
| T09 명시 date TimelineOrder | PASS | 개인 순서가 시간 기본 정렬보다 우선 |
| T10 raw만 변경해 fingerprint 불일치 | PASS | 기존 Result가 `invalid-authoring-lineage`로 거절 |
| T11 Item 중복 | PASS | 기존 Result가 `duplicate-item-identity`로 거절 |
| T12 동일 제목의 foreign-copy map | PASS | 정확 tuple 불일치 거절 |
| T13 parsed.time 변조 | PASS(guard 진단) | state decoder 거절. 직접 Result는 변조17:45/25:99 수락 — 이를 원하는 동작으로 assert하지 않음 |
| T14 진짜 옛 lineage, typed map 없음 | PASS | 기존 결과 열림, typed time 없음 |
| T15 실제 승인 source-update API | PASS | stable identity 유지, typed map 미제공, 임의 time 생성 안 함 |

기본 정렬과 unscheduled 기대는 기존 Result의 의미와 맞춘 것이다. 새 시간 제거 정책을 만든 것이 아니다. `unscheduled`는 날짜 mode이며 현재 schema에는 별도의 time-clear mode가 없다. 명시 시간은 기존 유효한 placement.time → 검증된 source time → 없음 순서를 유지한다.

## 2. 한 구현으로 재사용할 검증

현재 [result-projection.ts](../../../lib/flow/personal-workspace-poc-result-projection.ts)의 다음 부분을 읽었다.

- `hasValidFlowShape`, `hasValidItemShape`, flow ref 검사와 `sourceItemByRef` 작성(L1380–1406): origin·필수값·정확 tuple·중복 검사.
- `hasValidParsedItemSnapshot`, `sourceAttributesFor`, `resolveResultSource`(L593–787): raw fingerprint, sourceLine identity map, savedCopyId+flowId+itemId, 원래 sourceOrder, 누락/중복 mapping 검사와 기존 속성 DTO.
- `buildPersonalWorkspacePocResultProjection` L1548–1550: 실행 time 우선·source time fallback. occurrence는 기존 별도 계약을 유지한다.
- [state.ts](../../../lib/flow/personal-workspace-poc-state.ts) `isAuthoredFlow` L149–316: 기존 materializer로 raw를 재구성하여 parseResultId·snapshotId·parsedItems·identity map·fidelity·원본 Item 투영을 정확 비교한다.

기존 Result resolver는 raw fingerprint와 snapshot shape를 확인하지만, parsed.time이 실제 raw를 재해석한 값과 같은지는 직접 검사하지 않는다. T13은 raw09:30을 그대로 두고 snapshot.time만17:45/25:99로 바꿨다. `isPersonalWorkspacePocState`는 둘 다 false인데 직접 Result 호출은 둘 다 ok다. 새 helper가 기존 resolver만 복사하면 이 upstream 검증 의존을 놓친다. 새 정규식 검사로25:99만 막아도17:45 변조는 남는다.

따라서 새 parser나 복제된 검증기를 만들지 않는다. source 검증·attribute 작성은 기존 Result 구현을 **이동해 하나로 공유**하고, complete typed handoff는 기존 `isAuthoredFlow`를 본문 변경 없는 좁은 export alias로 함께 호출하는 안을 권고한다. 전체 state를 가짜로 조립하거나 전체 Result·download·occurrence를 생성하여 검증하지 않는다.

## 3. source-update는 기존 handoff와 다른 검증 경로다

T15는 `createPersonalWorkspacePocLocalFixtureEnvelope` → stage → 각 change `use-incoming` → apply → `getPersonalWorkspacePocEffectiveSourceFlow`를 실제 실행했다. 검증된 새 원문은17:00이며 label도17:00이다. 하지만 [canonical-ownership.ts](../../../lib/flow/personal-workspace-poc-canonical-ownership.ts)의 `attachEffectiveAuthoringLineage` L202–229는 effective 원문·fingerprint·`poc-effective:…` parseResultId를 붙일 뿐 parsedItems/map/fidelity를 만들지 않는다.

이 effective Flow는 현재 Result에서 정상 열리고 `itemMapping:legacy-unavailable`, typed time 없음이다. 반면 이 Flow를 원래 persisted authoredFlows로 가장해 state decoder에 넣으면 false다. 그러므로 **모든 effective source에 isAuthoredFlow를 무조건 적용하면 기존 정상 source-update를 차단한다.**

권고되는 provenance 분기는 다음과 같다.

| 입력 근거 | 검증·결과 |
|---|---|
| 완전 typed persisted/preview handoff | 기존 authored source validator + 공유 identity/attribute resolver. invalid snapshot은 전체 실패 |
| 실제 옛 handoff | 기존 옛-lineage validator + 공유 raw/identity 검사. map/typed time 없음으로 명시 |
| 검증된 source-candidate store가 만든 effective source | 기존 store validator·base와 projectedFlow exact identity·effective source composer를 사용. 현재 map 없으므로 typed time 없음. 이전 handoff09:30로 fallback하지 않음 |
| provenance 불명·partial map·duplicated/cross-copy/stale 데이터 | 실패 반환, 부분 time index를 노출하지 않음 |

`parseResultId` 접두어나 caller가 넣은 `trusted:true`만으로 source-update 예외를 허용하지 않는다. source-candidate의 원본 base와 검증된 store를 받아 기존 composer로 다시 확인할 수 있어야 한다. map이 없는 현재 source-update에 제목·행번호·배열 index로 time을 새로 붙이는 일은 이번 최소 수정에 포함하지 않는다. 이 경계는 reader 기술 계약이며 새 저장 schema나 운영 정책이 아니다.

## 4. 제안 API·추출 범위

아래는 **구현 전 후보**다. main이 기존 제품 파일 동결을 해제하고 허용목록을 확장하기 전에는 코드로 연결하지 않는다.

1. 새 `personal-workspace-poc-source-attributes.ts`: Result의 flow/item source validation·`resolveResultSource`·snapshot/attribute 작성 부분을 이동한다. failure reason과 기존 attribute DTO 의미를 유지한다. 부분 성공 map을 반환하지 않는다.
2. 공유 검증 entry는 validated pre-personal source와 exact `itemContextByRef`를 반환한다. Result가 필요로 하는 `sourceItemByRef`도 같은 검증에서 작성해 두 번 다른 검사를 돌리지 않는다. Result의 원본 raw 읽기 계약은 유지하되 Task용 index에는 rawText를 싣지 않는다.
3. `state.ts`는 `isAuthoredFlow`의 export alias만 추가한다. 함수 본문·저장 decoder·writer 변경은 없다. complete typed source 검증에만 사용하고 §3의 검증된 effective source-update 경로와 구별한다.
4. 새 read-index builder 후보 입력은 `{ baseModel, authoredFlows, sourceCandidateStore? }`다. 여기서 source를 검증·합성한 후 개인 overlay 이전의 정확 ref index를 만든다. 출력은 `{ok:true, sourceModel, itemContextByRef}` 또는 `{ok:false, reason}`이며, 실패에 raw나 부분 map을 싣지 않는다. 타입 이름·컴파일 import 위치는 실제 extraction diff에서 확정한다.
5. Result와 Task가 같은 source context를 소비한다. Task에는 개인 title/date/order가 이미 적용된 모델과 source index를 **별도 인자**로 준다. ref+flowRef+savedCopyId+flowId+itemId로 조인하고, 개인 title/sourceOrder를 원문 검증값으로 사용하지 않는다. source index 없는 기존 caller는 시간 추정 없이 기존 안전한 동작을 유지할 수 있으나 실제 Surface caller 누락을 통과로 처리하지 않는다.
6. `PersonalWorkspacePocSurface.tsx` 현재 `resultBaseModel`(L1179–1190)은 이미 source candidate 반영 후·개인 overlay 전이다. 최종 Tasks useMemo(L1193)와 transition 뒤 context-result용 task 재조회(L2903)가 함께 새 read context를 받아야 한다. 조회 하나만 고치면 저장 직후 결과와 기간 행이 다시 어긋난다. 이 두 UI 연결은 main 소유·후속 승인 범위다.

흐름은 **읽기 원본+검증된 source candidate → 공유 source 검증/index → 개인 overlay 모델과 exact-ref 조인 → Task 및 Result**다. `state.authoredFlows`만 읽어 source-update 이전 시간을 가져오는 shortcut도 금지한다.

### 런타임 의존 경계

공유 helper의 런타임 의존은 contract, 기존 authoring/state validator, 필요시 기존 canonical/source-candidate reader뿐이다. source attribute/result source DTO를 기존 Result에서 type-only import하거나 공통 파일로 옮겨 재export한다. **공유 helper가 Result나 view-model을 런타임 import하지 않도록 한다.** Result→공유 helper, view-model→공유 helper의 단방향이어야 한다.

현행 state/authoring/fidelity/canonical-ownership/source-candidates의 관련 import를 읽고 result-projection·view-model로 향하는 import가 없음을 검색했다. 이것은 신규 모듈 cycle0의 완료 증거는 아니다. 실제 구현 후 TypeScript transpile 결과의 runtime imports와 module-load smoke를 검사하고, type-only 역참조가 JS require/import로 남지 않는 것을 확인해야 한다. 기존 Result payload snapshot·preview·old lineage·source-update 긍정 회귀도 실행해야 한다.

## 5. 실행·실패 기록

소유 파일은 [신규 source-time.test.ts](../../../lib/flow/personal-workspace-poc-source-time.test.ts)와 이 설계 문서뿐이다. 새 helper 제품 파일은 아직 만들지 않았다. 기존 제품·기존 test·generated HTML·공용 QA 수정0이다.

| 실행 | 실제 결과 | 근거 |
|---|---|---|
| 최초14개 |9 PASS /5 FAIL | red-first (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-red-first-20260905.tap`) |
| 최초 strict TS |4 diagnostics | T09 fixture의 TimelineOrder.revision 누락1, readonly authoring 재할당3. 제품 실패와 구별 |
| fixture 타입만 수정 후14개 |9 PASS /5 FAIL | red-final (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-red-final-20260905.tap`) |
| T15 실제 source-update 단독 |1/1 PASS | source-update-positive (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-source-update-positive-20260905.tap`) |
| 최종15개 |10 PASS /5 FAIL | final15 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-time-final15-20260905.tap`) |

최종 고유 등록15개다. 반복 실행은44회(29 PASS /15 FAIL)이며 동일한 다섯 시간 누락 요구를 세 번 실패한 기록이다. skip/xfail/todo는 사용하지 않았다. T13 내부 두 변조 fixture를 테스트2개로 더하지 않는다. 최초 strict diagnostics 수정 뒤14개·최종15개 타입 검사는 각각 PASS했다. 검사는 직접 `tsx --test`에 새 파일을 나열했으며 package.json 등록이나 전체 npm test/build는 하지 않았다.

모든 source/result·task 조회는 입력 JSON 전후를 비교한다. Storage adapter·운영 writer 없이 실행했고 source raw·state/placements/completions/Undo를 바꾸지 않았다. 실제 localStorage byte audit, 브라우저 저장·reload, Android/iOS·보조기술 검사로 확대하지 않는다.

## 6. 백업·동결·후속 검증

기존 수정된 제품 파일도 미소유로 다루고 exact snapshot만 만들었다. before-source-time (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-source-time/lib/flow/personal-workspace-poc-result-projection.ts`)에 같은 상대경로로 복사했으며 기존 target이 있으면 중단하도록 했다. 원본·백업 hash가 모두 같았다.

| 파일 | 확인 SHA256 |
|---|---|
| result-projection.ts | `26A716C3FD6766B53186B9F1F35EFE76C1604EB09A95B72B2363194B8924F422` |
| state.ts | `CEAC5A42EB5E245CE5E2A5B4CFEA131CF5BCDFA4C1FCC9EF3BB285795D1543A3` |
| view-model.ts | `F3E504CBF2914121A56E77E502EB7372BFCDC0C598CE3C7B8091656A3A096744` |
| 신규 source-time.test.ts 최종 | `E339730EB86C3553AEB96B34565F065E503D203395794C90B7E6BF9B8904DCC3` |

구현 직전 위 hash를 다시 확인해 K3-A 병렬 변경과 구분한다. 검증 함수 추출·state export alias가 승인되면 먼저 기존 Result/State/SourceCandidate/Composition 긍정·거절 회귀를 통과시키고, 새로운 index의 full/legacy/update provenance·partial/duplicate/foreign/raw drift·snapshot tamper·immutable output을 검사한다. 그다음 Task와 Surface의 두 caller를 연결하여 현재 다섯 RED를 그대로 통과시킨다.

화면 검사는 마지막 장식 단계가 아니라 실제 연결과 함께 한다: 기존 원문09:30 browser RED (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts`), 개인 time 우선, 날짜 미정, 개인 순서·원래 정렬·Undo, 같은 제목 두 사본, 다섯 viewport에서 시간/행동 가림·overflow·오류0을 확인한다. invalid provenance는 빈 정상 시간으로 조용히 처리하지 않고 기존 fail-closed gate로 전달한다. source-update의 typed-time 미제공은 지원 범위를 명시하며 화면 완료로 부풀리지 않는다.

이 단계의 browser/device/observed-user 검증은 NOT_RUN/0명이다. commit, push, PR, Preview, Production 없음. K3-A 제품 동결 때문에 기존 코드 수정은 승인 대기이며, 이를 사용자 제품 정책 결정이 필요한 blocker로 바꾸지 않는다.

문서 확인: `npm.cmd run docs:check` PASS(required files16, local links5,146). scoped closeout은 두 소유 경로로 실행했고, 검사 권고와 실제 실행을 구별했다. 위 기존 제품 세 파일의 최종 SHA도 백업 시점과 같다. 해시 재확인 명령의 최초 PowerShell positional 인자 오류는 경로 배열로 고쳐 재실행했으며 제품/테스트 실패가 아니다.
