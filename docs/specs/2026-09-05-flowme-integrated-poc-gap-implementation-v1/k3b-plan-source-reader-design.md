# K3-B B1-S — 원본 합성·개인 계획 reader 설계 gate

2026-09-05. 초기 read-only 조사 9/9 뒤 root 승인으로 **Sa-1/2 순수 bound reader를 구현했다. 신규 25 + 기존 P 41 + characterization 9 = 75/75 PASS**다. 기존 4개 raw API/정규화/metadata 동값 규칙은 유지했고 app/C/E2/builder는 연결하지 않았다. [Sa QA](./k3b-plan-source-reader-qa.md)와 [Sb 계약 diff·별도 RED](./k3b-plan-source-intent-contract-diff.md)를 구분한다. [B1-G 계약](./k3b-plan-context-contract.md)의 raw capture와 새 원본 후보를 함께 쓰려면 읽기와 편집 기준을 구분해야 한다. 새 source/실행/반복 정책을 정하거나 개인 편집 전체를 영구 미지원으로 결론짓지 않는다.

## 1. 실제 코드와 충돌

| 근거 | 현재 동작 | 연결할 때의 위험 |
|---|---|---|
| [app.state](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js), 현재 L215 | raw envelope.state → M.composeSourceCandidateState | 단일 state 반환에 source-read 실패 상태가 없음 |
| 같은 app featureWritable/checkFeatureStorage, 현재 L829–887 | source 저장소의 corrupt/read-error/unavailable을 따로 관리. 성공 외부 읽기를 모든 기존 snapshot에 자동 갱신하지 않음 | source store exact bytes를 Plan open/prepare/retry에서 별도로 확인해야 함 |
| app.openPlanEditor/saveEditor, 현재 L1856–1891 | authored Flow는 source feature 장애 때 열기 차단. 저장은 workspace expectedRaw/E2 attempt 중심 | 편집 중 source만 바뀐 경우 raw workspace CAS만으로는 감지 불가 |
| [M.loadSourceCandidateStore](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js), L2843 | null→확인된 empty, 잘못된 JSON/version→corrupt, getItem 예외→read-error, runtime 없음→unavailable | null은 ‘읽기에 실패했다’가 아님. 이 구분을 reader 앞에서 없애면 안 됨 |
| M.composeSourceCandidateState, L2887 | store invalid/runtime missing이면 입력 state 반환. 없는 target은 건너뜀. 기존 task만 exact ref로 갱신 | invalid/missing target/추가 Item 누락을 성공한 원본 합성으로 오인할 수 있음 |
| 같은 composer의 sourceTitle fallback | own sourceTitle가 없으면 현재 title을 원문 기준처럼 비교 | P를 먼저 적용하면 개인 title이 source fallback이 돼 incoming title에 덮임 |
| [P.projectPersonalPlanState](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js) | raw capture를 검증한 뒤 복사본에 overlay 적용 | M 합성본을 P raw로 넣으면 capture stale. 의도된 차단을 풀면 안 됨 |
| [React composition](../../../lib/flow/personal-workspace-poc-composition.ts), applyPersonalPlanOverlay/composePersonalWorkspacePocReadModel | 검증된 source version → 기존 개인 overlay. explicit memo는 own-key로 빈 값도 반영 | 단순 truthy 값 또는 raw/source 설명 비교로 대체하지 않음 |
| [React Plan editor](../../../lib/flow/personal-workspace-poc-plan-editor.ts), normalizePersonalWorkspacePocPlanOverlay/freshContextFailure | 현재 원본 read model 기준 title 정규화, [개인 memo baseline](../../../lib/flow/personal-workspace-poc-plan-memo-baseline.ts) 기준 memo 정규화. 저장 직전 source exact bytes 검사 | raw capture와 normalize 기준은 같은 역할이 아님 |
| [React canonical ownership](../../../lib/flow/personal-workspace-poc-canonical-ownership.ts), composePersonalWorkspacePocEffectiveSourceFlows | store 검사, 없는 target/duplicate/cross-copy 거절, source 결과 뒤 개인 overlay | target/ref 검사 없이 permissive standalone composer만 호출하면 동등하지 않음 |

결론은 `M → P` 또는 `P → M` 호출 순서만 바꾸는 수정으로 해결할 수 없다는 것이다. **raw 검증·캡처 → 검증된 source 읽기 → 같은 P overlay 적용 구현**의 순서가 필요하다. raw state를 source 합성 결과로 다시 캡처하지 않는다.

## 2. 먼저 연결할 B1-Sa: 저장하지 않는 bound reader

아래 두 API를 Sa에서 구현했다. `sourceEpoch`는 0 이상의 safe integer다. 성공 check는 freshness만 확인하며 편집 허가는 각 `capabilities.flows[flowRef].canEdit`와 기존 draft 검증을 별도로 확인해야 한다.

```ts
readPersonalPlanSourceContext({
  rawState,             // C가 검증한 실제 authoritative state
  legacyBaseRaw, undo,   // 생략하지 않음. 기존 P/C 책임 유지
  sourceRead,           // 필수. 아래 성공/실패 packet 중 하나
  sourceEpoch,          // caller session-local observation epoch
})
  // ok: { context, viewOnly: true, state, capabilities, sourceDiagnostics }
  // fail: { reason, scope: 'source-dependent', canEdit: false }

sourceRead =
  | { ok: true; raw: string | null }
  | { ok: false; reason: 'read-error' | 'unavailable' };

checkPersonalPlanSourceContext(context, {
  rawState, sourceRead, sourceEpoch,
}) // exact snapshot/epoch 재확인. read-only. 실패면 candidate를 만들지 않음.
```

sourceRead 생략·undefined·unknown discriminator는 invalid input, `ok:true,raw:null`만 **API에서 실제로 부재를 읽었다는 caller 결과**다. 저장소 read-error를 `raw:null`로 바꾸지 않는다. pure 함수가 caller의 실제 I/O 성공 여부 자체를 인증할 수 있다고 주장하지 않는다. app는 기존 M.load 결과의 상태와 실제 raw를 정확히 전달해야 하며 UI flag로 ‘검증 완료’를 가장하지 않는다.

### decoder 재사용과 의존 방향

R의 입력은 raw 문자열/명시 read 결과로 좁힌다. 외부가 넘긴 임의 decoded store와 별도 `trusted:true`는 받지 않는다. M.loadSourceCandidateStore에 **정확 SOURCE_CANDIDATE_STORAGE_KEY를 요청할 때만 이미 읽은 raw를 반환하는 read-only 객체**를 주면 기존 parser/store validator를 그대로 재사용할 수 있다. 실제 storage 접근·write/rollback은 이 함수에 없다. descriptor-safe packet 검사는 그 호출 전에 한다. 대안인 source runtime validator 직접 import는 가능하지만 같은 검증을 새 regex/약한 shape check로 복제하지 않는다.

P의 기존 내부 raw metadata 검사·overlay 적용 구현을 공유한다. 새로운 reader 구현 모듈에서 검증 로직을 복사하거나 public `applyTrustedOverlay(view,metadata)` 우회를 만들지 않는다. 권고는 P에 작은 bound-reader entry를 추가하고 내부 `applyValidatedOverlay(copy,validatedMetadata)`를 기존 raw-only entry와 공유하는 방법이다. 기존 네 API의 기본 동작은 유지한다. M/T는 계속 하위 의존성이며 C/E2 역의존은 없다.

### 읽기 처리 순서

1. descriptor-safe 입력 검사 → P raw domain/모든 metadata entry 검증. C가 current+Undo·legacy provenance를 검증할 책임은 유지한다. source-composed state는 이 단계의 raw 인자가 될 수 없다.
2. sourceRead가 실패면 새 source-dependent 정상 view/context를 반환하지 않는다. 성공 raw만 기존 loader로 decode한다. empty/restored 이외는 이유를 유지한다. corrupt/unknown version을 empty store로 바꾸지 않는다.
3. validated store의 effectiveVersions와 실제 raw Flow를 exact Flow ref/tuple/origin/handoffId로 연결한다. 모든 effective target 존재·중복 없음·source Item ref의 copy/flow/itemId 일치를 확인한다. 삭제된 대상/다른 사본/unknown target을 조용히 건너뛰지 않는다.
4. 원본 lineage를 검사한다. active candidate envelope의 base/mine source와 현재 raw Flow의 정확 rawText·handoff·tuple을 대조한다. fingerprint는 보조 진단이지 byte 비교의 대체가 아니다. 기존 source update validator의 resolution/retained refs/projectedFlow 재계산 검사는 그대로 재사용한다. 이미 갱신된 source를 바탕으로 만들어진 체인이 있다면 기존 sourceRevision 관계로 검증할 별도 fixture가 필요하며 현재 기준에 맞지 않는 체인을 임의 재해석하지 않는다.
5. sourceTitle/sourceDate처럼 raw에 실제 있는 source fact만 명시적으로 비교한다. 없던 sourceTitle을 현재 개인 title로 채워 원문 소유권을 제조하지 않는다. `standaloneAuthoredFlowForSourceUpdate`의 fallback Item id/section/title/time label을 독립 provenance 증거로 쓰지 않는다. sourceTimingLabel을 time으로 파싱하지 않는다.
6. 검증 후 기존 M source composer를 한 번 호출해 disposable source view를 만든다. 허용 source 필드 외 raw completion/date/time/occurrences/folder/orders/membership/unknown/metadata가 바뀌지 않았는지 검증한다. source 정보와 현재 실행 값은 따로 남긴다.
7. raw에서 검증한 P overlay를 **같은 내부 구현**으로 source view에 마지막으로 적용한다. 다시 capture하지 않는다. exact ref가 없는 Item은 부분 적용하지 않는다. 최종 existing M recurrence/domain validator를 그대로 통과해야 한다.
8. frozen 또는 defensive-copy view, opaque context, 정확 owner/capability를 반환한다. context는 private raw/source exact bytes·기준 tuple·epoch를 보유하며 raw text를 user-facing diagnostics/JSON serialization에 싣지 않는다. caller가 view를 write candidate로 보내지 못하도록 C/E2는 계속 raw authority를 요구한다.

전체 state() 호출을 새 reader로 교체할 때 실패 결과를 다시 `envelope.state`로 바꾸면 현재 fallback 문제가 반복된다. source-dependent 화면은 명시 gate/재확인을 보여야 한다. source가 필요 없는 기존 Quick·다른 origin 기능까지 새로 영구 차단하는 정책은 추가하지 않는다. 그 화면이 raw-only 자료를 사용할 경우에도 source 합성 성공이라고 표시하지 않도록 caller를 명시 분리한다.

## 3. 읽기 상태·초안·저장 경계

| 입력·이벤트 | 표시·편집·복구 방향 | mutation |
|---|---|---:|
| source key의 확인된 부재 | 원래 raw+P view. source update 없음. 기존 P 편집 capability 유지 | 0 |
| valid pending/deferred candidate | 검토 중 후보는 source view에 적용하지 않음. 기존 effective version만 사용 | 0 |
| valid applied same-membership source | source 정보와 explicit P override를 분리 표시. Sa는 unsafe normalize field 편집을 차단 | 0 |
| unknown/corrupt/read-error/unavailable | 정상 source view/원문 복원 control을 제공하지 않음. 상태별 재확인 안내. raw/초안 보존 | 0 |
| source key만 편집 중 변경 | 현재 Plan/Item 초안 유지, 저장·retry 중지. ‘편집 중 원본 비교 상태가 바뀌었습니다. 입력은 유지했습니다.’ | 0 |
| source bytes 동일하나 session epoch가 변함 | ABA/late callback을 이전 context로 받아들이지 않음 | 0 |
| target 삭제/foreign copy/unknown ref | 다른 Flow로 자동 연결하지 않음. invalid target 안내 | 0 |
| source에 새 Item/새 membership | 현재 M task view가 표현하지 못하면 `source-membership-not-supported` capability. 새 실행 row/완료 정책을 만들지 않음 | 0 |
| 사용자가 재확인 후 다시 편집 | 이전 ticket을 자동 갱신하지 않음. 새 exact read/context로 재열기·명시 재적용, 초안 보존 범위 확인 | 0 until explicit save |

read-only context는 storage CAS가 아니다. app는 Plan open/child apply/commit prepare/retry에서 최신 source key를 실제로 읽어 검증해야 한다. source key가 workspace key와 별도이므로 **E2 target 쓰기 직전·confirmed 직전에도 source guard가 필요한지 다음 E2 연결 gate에서 확인**한다. 자동 source store rollback/새 복합 writer를 이 reader 안에 넣지 않는다. 저장 실패/불확실 상태에서 기존 K1-B prepared/confirmed 복구 의미를 유지한다. 현재 pure reader는 브라우저의 관찰하지 못한 다른 탭 ABA를 완전히 감지하는 기구가 아니다.

source 적용 중인 candidate는 별도 lane의 명시 동작이다. 편집 open만으로 candidate를 stage/apply/undo하지 않는다. source 성공을 Plan 성공으로 세거나, 후보 변경으로 workspace Undo를 새로 만들지 않는다.

## 4. B1-Sb: 기존 React 원칙으로 source-aware intent 연결

Sa의 편집 capability 차단은 연결 전 임시 안전 gate다. 사용자에게 새 영구 정책 결정을 떠넘기는 종료 조건이 아니다. 후속 작은 계약은 이미 승인된 React의 다음 기준으로 해결한다.

| field | 변경할 수 없는 raw capture | 정규화에 쓸 현재 inherited 기준 | 표시 근거 |
|---|---|---|---|
| 제목 | 기존 local title/sourceTitle presence·정확 bytes | 검증된 source owner라면 source 합성 후 **PoC overlay 전** 값. 실제 existing-personal baseline이 있으면 그 값 | source / existing-personal / poc-personal 구분 |
| memo | raw memo 부재/빈 값/문자열 | 기존 개인 memo baseline. source description은 기준이 아님 | [React memo helper](../../../lib/flow/personal-workspace-poc-plan-memo-baseline.ts)와 동일 |
| 날짜 | raw planDate의 부재/날짜/null, sourceDate의 실제 presence | existing-personal 일정이 있으면 그 효과. source 일정이 확인된 경우만 source 효과 | 같은 날짜라고 execution inherit 추정 금지 |
| 명시 same-date fixed | raw와 무관하게 intent 유지 | 동값 정규화 없음 | 기존 React schedule 의미 |
| sourceTitle가 없는 legacy | 부재 그대로 | 입증되지 않은 source가 아닌 기존 저장 기준 | ‘원문 복원’ 문구/원문 title 제조 금지 |

현재 P는 raw 기준과 같은 text override를 정규화로 없애고, stored metadata에서도 그 동값을 redundant로 거절한다. 예를 들어 raw 제목 A, 새 source 기본 제목 B일 때 사용자가 명시 A를 선택하면 raw-normalizer가 A를 지워 화면은 B가 된다. **이 계약은 source-aware 입력에서 그대로 재사용할 수 없다.** 읽기 연결 중 조용히 수정하지 않는다.

Sb의 최소 기술안은 raw capture와 normalization baseline을 분리한 opaque context다. 기존 P raw-only entry는 기존 baseline을 계속 사용하고, 새 bound entry만 검증된 `source-before-P + existing-personal ownership`에서 normalization baseline을 발급한다. title/memo 값 비교는 실제 그 baseline으로 한 번만 한다. explicit override가 raw 값과 같더라도 현재 inherited 값과 다르면 개인 intent를 보존한다. read/reload 중 기존 저장 overlay를 ‘이제 같은 값’이라며 자동 제거하지 않는다.

이때 C가 source store 없이도 metadata를 읽어야 하므로 P metadata validator의 ‘raw와 같은 text는 언제나 invalid’ 규칙을 어떻게 좁힐지도 함께 검토한다. **새 key/운영 schema 없이 existing explicit title/memo를 허용하는 기술 보완**이 가능한 후보지만, 현 V1 strict 계약을 바꾸므로 root가 별도 contract diff·RED→GREEN 근거를 읽고 승인한 뒤 구현한다. source-aware normalized 결과를 검증 없이 현재 V1로 저장하거나 의미만 다른 field를 추가하지 않는다.

legacy source owner가 입증되지 않은 field는 기존 개인 baseline을 유지한다. source text가 실제로 같다는 사실만으로 그 field가 원문 상속이었다고 결론짓지 않는다. 확인된 authored lineage·기존 React fieldOwnership으로 표현할 수 있는 범위부터 열고, 미확인 field는 사유와 함께 read-only로 남긴다. 원문 제목을 별도로 보는 기능과 그 제목을 내 계획에 따르게 하는 explicit action을 혼동하지 않는다.

실행 date/time/provenance, 반복 anchor·회차·completion policy는 Sb에도 넣지 않는다. 반복 unscheduled의 기존 validator 차단은 [B1-G P37](./k3b-plan-context-qa.md)을 유지하고 React 원본 대조 gate로 다룬다. source 추가 Item의 동등성도 membership/run 별도 gate이며 이번 날짜 reader에서 task.date를 만들어 해결하지 않는다.

## 5. 실제 characterization 9개와 다음 RED matrix

[신규 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-source-reader-gate.test.cjs)은 기존 M/P와 실제 candidate stage/resolve/apply API를 호출했다. 첫 TAP (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-reader-characterization-first-20260905.tap`)은 **9/9 PASS, skip/cancel/todo 0**이다. 새 구현을 가장한 test double로 수용 판정을 내리지 않았다.

| ID | 실제 확인 결과 |
|---|---|
| R01 | invalid/undefined/null store가 M composer에서 raw same object로 조용히 반환됨 — gate 필요 |
| R02 | confirmed empty / corrupt JSON·unknown version / key read-error 구별. write API 없음 |
| R03 | 실제 applied source 값은 갱신되며 기존 개인 title/memo/planDate·실행 date/time/done와 원본 객체 유지 |
| R04 | M 합성 뒤 P에 넣으면 `stale-plan-baseline`. raw P는 정상 — 보호 유지 |
| R05 | sourceTitle 없는 raw에서 P→M은 explicit 개인 제목을 view에서 잃음. 저장 metadata와 원본 bytes는 그대로 — 순서 결함 |
| R06 | 별도 source store가 바뀌어도 raw-only P context는 candidate를 만듦 — 별도 freshness 필요 |
| R07 | valid source store의 target이 workspace에 없어도 M은 조용히 같은 JSON view를 반환 — binding 필요 |
| R08 | 같은 identity의 raw source text를 바꿔도 기존 M composer가 이전 source store를 적용 — exact base 필요 |
| R09 | valid applied source에 Item이 추가돼도 standalone raw task membership에는 없어서 view에서 누락 — capability gate 필요 |

R01/R04–09의 PASS는 미지원·위험을 재현한 characterization이다. 새 reader의 fail-closed/합성 지원이 완료됐다는 뜻이 아니다. UI 결함 재현이나 기기 관찰로 표현하지 않는다.

구현 배정 후에는 다음 기대값을 새 reader API로 먼저 RED에 고정한다.

1. exact raw + empty/restored source의 정상 읽기, pending/deferred의 미적용, frozen 결과/입력 불변/ambient 접근 0.
2. corrupt/read-error/unavailable/생략/null 혼동/unknown input·version·extra trusted/getter/prototype를 검사 단계에서 차단.
3. missing/foreign/cross-copy/duplicate target와 ref, raw source drift·handoff mismatch, invalid base lineage, source added/missing membership의 명시 capability.
4. source 합성 후에도 exact 개인 title/빈 memo/CRLF/fixed-date pin/unscheduled/raw nullable presence 유지. raw sourceTitle 생성 0, 실행 date/time/completion/order·archive 변화 0.
5. source 원문 수정·외부 replacement·apply/Undo·동일 bytes ABA epoch·late callback 후 old context commit/retry 0. 새 context는 명시 동작에서만 발급.
6. Sb에서 A(raw)→B(source)→명시 A, 명시 B, inherit 각각의 owner/normalize/receipt/reload를 React와 대조. 기존 stored overlay를 read-only 과정에서 제거 0.
7. 동일 소스 텍스트의 다른 사본과 기존 imported-personal baseline이 혼선 없이 유지. source description이 memo와 같아도 owner가 달라 보존.

## 6. 실행 순서와 소유

**Sa-1 decoder/binding pure → Sa-2 shared overlay read + capability → Sb-1 owner/normalize contract → Sb-2 P/C strict+candidate → E2 source guard/복구 → UI 연결** 순서다. C 담당의 current/Undo metadata strict 연결은 source read 입력 없이 독립 진행할 수 있다. source-aware candidate를 여는 시점에는 C와 E2가 승인된 새 strict 계약을 함께 소비해야 한다.

각 단계는 모델/fixture를 먼저 실행하고 최종 UI에서 owner 문구·빈 값·dirty 취소·에러 재확인·키보드·5 viewport를 함께 검증한다. 현재 제품 HTML을 이 설계만으로 재생성하지 않는다. 정확한 storage target/journal/운영 data 보호·배포 금지 경계는 상위 계획을 유지한다.

초기 조사 소유는 이 문서와 신규 characterization test뿐이었다. 이어 승인된 Sa에서는 P의 공유 overlay reader와 bound entry 2개, 새 25개 시험/QA를 추가했다. Sb는 설계와 명시 RED만 준비했고 normalize/metadata 동값 규칙을 바꾸지 않았다. 전체 npm test/build/browser/실제 Android Chrome/iOS Safari NOT_RUN, 관찰 사용자 0명. commit/push/PR/Preview/Production 없음. 원본 대화 재조회는 없고 연결된 React·standalone 코드/계약과 신규 pure 실행을 근거로 썼다.

초기 read-only 조사 당시 신규 test의 `node --check`와 `npm.cmd run docs:check` PASS(required files 16, local links 5,425). scoped closeout을 실행했고 미추적 directory로 묶인 문서는 `git status --untracked-files=all`로 따로 확인했다. reporter 권고를 실행 증거로 대신하지 않았다. 당시 시험 SHA256은 `051B18076219923C44C1A1CF1B419F0CFFCDBFCD3AA93C1E81ACFFD43AEDCDE4`, TAP은 `CDB50720ADC02D9577976803230138DEC2BDE855C3232A3DAFCBF5C45086FD6D`다. 당시 P/M 제품 SHA는 각각 `43AFE1678F1BDC33815B94EC9F476AF658098672825BE604A147DC03927199F3` / `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`로 시작 기준과 동일했다. 승인 후 Sa 구현으로 바뀐 현재 P 해시와 실제 검증은 [Sa QA](./k3b-plan-source-reader-qa.md)에 분리했다.
