# K3-B B2 — 구조 편집 세션·journal v4 연결 설계

2026-09-05. **읽기 전용 설계다. E2/P/C/D/PD/S/app/builder/HTML/시험 제품 코드를 변경하지 않았고 v4 시험을 실행하지 않았다.** 진행 순서는 B1 → B2 → B3다. 새 영구 제품 정책, 저장 key, 독립 Undo를 추가하지 않는다.

## 1. 정본과 현행 연결점

[B2 contract diff](./k3b-section-order-contract-diff.md)와 [section/order 설계](./k3b-plan-section-order-design.md), [source journal v3 설계](./k3b-plan-source-journal-v3-design.md)를 전문으로 읽었다. 현재 [E2](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js)는 1,008행 전체를 확인했다. C의 source inspector/등록 context, S의 `journalFamily` 분기도 대조했다. 원본 대화를 새로 전수 조회하거나 아래 기존 시험을 재실행한 기록은 아니다.

| 현행 함수/위치 | B2 연결에 필요한 최소 변경 |
| --- | --- |
| E2 `personalShape:108`, `validPersonalDraft:117`, `updateDraft:292` | v2 draft exact shape와 P captured-structure validation branch. 기존 v1 결과 보존 |
| `createSourceBoundPersonalPlanSession:162`, `checkSourceBinding:179`, `checkSourceBoundPersonalPlanSession:206` | actual source 관측/전체 checkpoint binding 재사용. v4 전용 발급과 public brand 검사 분리 |
| `createPersonalChild:368`, `applyPersonalChild:385`, source child wrappers `400/407` | 자기 Item만 복사·반영; 부모 sectionTitles/order를 버리지 않음 |
| source begin/retry `515/541` | 새 C structure action에서만 candidate 생성. 기존 attempt/retry ledger 재사용 |
| `decodeJournal:630` | strict version 4와 역사 source snapshot → 새 C action 재도출 branch |
| `writeDurableAttempt:752` | genuine 세션 contract로 journal 4 선택; source/target/journal guard와 commit 의미 공유 |
| recover/resume/cleanup `874/914/939/971` | historical 복구와 현재 구조 편집 재개 분리. v3/raw 재개 우회 차단 |
| `finishSave:981` | durable fact와 canResume 구분, 같은 outcome의 중복 close/receipt 금지 유지 |
| C source inspector `198–210` | P genuine context를 whole-checkpoint registry에 등록하는 현재 패턴을 B2에도 사용 가능 |
| S `journalFamily:98–110` | v4+정확 draft contract를 editor 분기로 라우팅. 최종 권한은 E2 actual decoder가 판정 |

읽기 시 SHA256: E2 `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4`, C `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57`, P `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358`. 이후 병행 P/C 구현의 완료를 이 해시로 주장하지 않는다.

## 2. 버전과 자료 모양

고정 pair는 `createForWorkspace('checkpoint-v2')`다. target은 기존 `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`, journal은 기존 `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`다. E0 default legacy-v1과 두 pair allowlist를 바꾸지 않는다.

새 상수 제안:

```js
STRUCTURE_PLAN_RECOVERY_VERSION = 4
STRUCTURE_PLAN_DRAFT_CONTRACT =
  'flowme-standalone-source-bound-personal-plan-draft-v2'
```

E2 세션의 공통 `version:1`, `kind:'plan'|'item'`, UI revision/submission/status/attempt 필드는 그대로다. **세션 공통 버전·draft.version·workspace 버전·metadata 버전·journal 버전은 서로 다른 계약**이다. candidate metadata의 version을 보고 journal을 선택하지 않는다. 새 v2 draft로 core 제목만 바꿔 candidate metadata가 v1이어도 해당 세션의 journal은 v4다.

root의 exact draft:

```js
{
  version: 2, flowRef, savedCopyId, flowId,
  title, items,       // B1 mode·exact memo 의미 유지
  sectionTitles,    // 발급된 editable sectionId 집합 전체의 mode dictionary
  orderedItemRefs,  // 대상 Flow의 모든 full Item ref를 한 번씩
}
```

child의 exact draft:

```js
{
  version: 2, flowRef, savedCopyId, flowId, itemRef,
  title, memo, schedule,
}
```

child에는 sectionTitles/orderedItemRefs를 넣지 않는다. 그 필드가 비어 있어도 거절한다. root의 readonly section map은 `{}`이고, 전체 순서는 section 제목 capability와 독립이다. derived/missing/duplicate id에 E2가 `step-N`을 발급하거나 title/index로 owner를 복구하지 않는다. 실제 작성 parser와 membership proof는 P가 맡는다.

새 journal의 exact keys는 v3와 같고 **version/contract/baseline·draft 의미만 별도 branch**다.

```js
{
  version: 4, targetKey, phase: 'prepared' | 'confirmed',
  sessionId, kind: 'plan', scopeId: fullFlowRef,
  revision, submission, attemptId,
  beforeRaw: string | null, candidateRaw: string,
  baseline: structureDraftV2, draft: structureDraftV2,
  draftContract: 'flowme-standalone-source-bound-personal-plan-draft-v2',
  sourceReadSnapshot: { version: 1, raw: string | null },
}
```

section capability, opaque context, caller sourceReady/canEdit, epoch, DOM returnPoint, 별도 normalization baseline은 직렬화하지 않는다. v4 `kind:'item'|'quick'`, version/contract 혼합, unknown keys, v3에 새 draft 필드만 붙인 기록은 fallback 없이 차단한다. source snapshot은 실제 fixed source key를 성공적으로 읽은 exact raw이며 read-error를 null로 치환하지 않는다.

## 3. 새 public API와 private 공유 경계

기존 v3 이름의 의미를 확대하지 않는 별도 wrapper를 권고한다. 아래 이름과 signature는 **구현 제안**이며 현재 export가 아니다.

```js
createSourceBoundPersonalPlanStructureSession(storage, {
  checkpoint, flowRef, sessionId, readSourceEpoch, returnPoint?,
}) // genuine frozen session 또는 기존 방식의 명시 오류

checkSourceBoundPersonalPlanStructureSession(storage, session, {
  checkpoint, readSourceEpoch,
}) // {ok, reason?}; actual observation은 내부 전달에만 사용

createSourceBoundPersonalPlanStructureChild(storage, parent, {
  checkpoint, readSourceEpoch, itemRef, sessionId, returnPoint?,
}) // 자기 Item만 있는 frozen child

applySourceBoundPersonalPlanStructureChild(storage, parent, child, {
  checkpoint, readSourceEpoch,
}) // 기존 {ok,parent,child,effect,returnPoint,changed,error?}

beginSourceBoundPersonalPlanStructureSave(storage, session, {
  checkpoint, expectedRaw, readSourceEpoch, attemptId, now,
}) // 기존 {ok,session,attempt?}; semantic no-op이면 attempt 없음

retrySourceBoundPersonalPlanStructureSave(storage, session, {
  checkpoint, readSourceEpoch, attemptId,
}) // 원래 candidate를 보존한 명시 retry

resumeRecoveredSourceBoundPersonalPlanStructureSession(storage, recovery, {
  sessionId, readSourceEpoch, returnPoint?,
}) // {ok:true,session,requiresSourceReopen:false}
   // 또는 {ok:false,reason,requiresSourceReopen:true,review?}
```

`updateDraft/requestClose/continueEditing/discardChanges/locked/finishSave`와 `writeDurableAttempt(storage,session,attempt,{readSourceEpoch})`, `loadRecovery/recoverDurableAttempt/clearConfirmedRecovery`는 공통 entry를 유지할 수 있다. 공통화는 private contract table/brand dispatch에서만 한다. caller가 discriminator·candidate·snapshot·validator callback을 넣어 v4 권위를 만드는 API는 추가하지 않는다. 새 wrapper는 E0에서 실패하고, 기존 raw 및 v3 wrapper는 v4 parent/child/recovery token을 거절한다. v4 wrapper도 v3 owner를 거절한다.

현재 `sourceSession()`은 v3 하나만 판별한다. 이를 그대로 넓히면 v3 public begin/child/retry가 v4를 받는 우회가 생긴다. **내부 source-family 검사(v3/v4)와 public exact-contract 검사**를 구분해야 한다. `personalSession()`의 brand 확장만으로는 구현이 완료되지 않는다.

### C context와 captured validation 연결 계약

C의 현재 B1 inspector는 P가 발급한 genuine editor token을 그대로 반환하되, 그 객체를 `sourceEditorCheckpoints`에 등록해 전체 checkpoint를 함께 묶는다. [확정된 C 연결 설계](./k3b-structure-checkpoint-design.md)는 B2도 genuine P token을 별도 `sourceStructureEditorCheckpoints`에 등록하도록 정했다. 따라서 E2 private binding의 `context`를 P `validateCapturedPersonalPlanStructureDraft`에 넘길 수 있고, C action은 C registry에 없는 직접 P token을 거절한다. token을 JSON으로 새로 만들거나 별도 wrapper로 바꾸지 않는다.

추후 C가 **별개의 opaque wrapper token**을 반환하도록 바뀌면 E2→P 직접 captured validation은 불가능하다. 이때 P token을 공개/복원하거나 P 검사를 생략하지 말고, C에 genuine C token용 captured-validation 위임 API를 먼저 설계해야 한다. 이번 구현은 위에 확정한 genuine token 등록 관계를 사용한다.

필요 P/C 의존성은 contract diff의 신규 P inspector/captured validator/planner, C `inspectSourceBoundPersonalPlanStructureContext`와 `commit-source-bound-personal-plan-structure-context`다. UMD/CJS는 현재 lazy loader를 유지한다. 새 기능의 module/API 부재는 새 편집·v4 decode만 explicit unavailable이며, 옛 기록을 구조 없는 v1로 읽는 대체 경로가 아니다.

## 4. 입력·child·dirty close·attempt

1. 입력을 평가하기 전에 descriptor-safe `copyPersonalData`를 통과시킨다. unknown key, getter/toJSON, prototype, symbol, holey/추가 속성 배열 거절을 유지한다. JSON 저장본이 아니라 JS API 입력인 경우에도 검사를 약하게 만들지 않는다.
2. root identity와 Item dictionary membership을 baseline에 exact 결합한다. section key 집합과 full-ref 순열은 P의 캡처된 proof를 사용한다. 잘못된 ref·foreign/readonly section은 적용하지 않는다. 빈 제목처럼 **지원 문법의 잘못된 입력**은 지우지 않고 dirty-invalid로 보존한다.
3. P captured-structure validator는 현재 source I/O·새 candidate/now/revision/Undo를 만들지 않는다. E2는 이 결과를 local validity에만 사용한다. observed source/whole-checkpoint stale latch, pendingClose, submitting/recovery 잠금을 해제하지 않는다.
4. child 생성은 실제 source/epoch + 전체 checkpoint 확인 후 해당 full Item ref만 복사한다. parent 객체 identity·UI revision·scope·child ref가 정확히 일치해야 apply된다. parent가 A→B→A 입력으로 돌아와도 revision/객체가 달라지면 옛 child를 붙일 수 없다.
5. child apply는 부모 full draft를 복사한 뒤 해당 `items[itemRef].title/memo/schedule`만 교체한다. sectionTitles/order·부모 제목·다른 Item은 exact 보존한다. 유효 child가 부모의 별도 invalid section 제목을 고치지 않는 것은 정상이다. 부모를 dirty-invalid로 유지하며 child 입력을 임의 폐기하지 않는다.
6. root/child Cancel·Escape·X·backdrop·browser Back은 기존 close reducer를 사용한다. 원래 scope만 버리고 returnPoint/focus/scroll은 UI opaque 값으로 유지한다. child apply/취소·같은 상태·경계 이동·원래 순서 복귀 no-op은 journal까지 0쓰기다.
7. begin에서 실제 source epoch → fixed key read → epoch를 다시 읽고 C 전체 checkpoint와 expectedRaw를 결합한다. 새 C action 한 번만으로 후보를 만들며, P가 발급한 capture를 E2가 재계산해 대체하지 않는다. changed=false면 attempt/journal/새 Undo를 만들지 않는다.
8. retry는 기존 genuine attempt·session revision/submission·replay ledger를 재사용한다. 실제 source/epoch를 다시 확인한다. 타이핑·다른 부모·discard·old callback·double submit으로 옛 attempt를 부활시키지 않는다. localStorage를 native atomic CAS라고 표현하지 않는다.

## 5. journal v4의 candidate 재도출

decoder는 phase가 prepared든 confirmed든 같은 **관계 검증**을 한다. 현재 source key가 달라졌다는 이유로 과거 기록의 source snapshot을 바꾸지 않는다.

1. exact pair/version4/contract/kind/phase/keys를 확인한다. baseline/draft는 version2 exact shape여야 한다.
2. `beforeRaw`와 `candidateRaw`를 actual C validator로 검증한다. null-before는 candidate.legacyBaseRaw에서 actual `C.fromLegacy`로 seed/legacy checkpoint를 만든다. current·실제 Undo·legacy archive의 reserved/unknown guard를 생략하지 않는다.
3. 저장된 `{ok:true,raw:sourceReadSnapshot.raw}`와 replay epoch `0`으로 새 C structure inspector를 호출한다. P가 실제 source parser/lineage/membership/section proof를 재검증한다. 기록이 주장하는 section id/capture를 권한으로 채택하지 않는다.
4. 재발급된 draft와 기록 baseline을 exact JSON-value로 비교한다. 다른 사본·동명 구간·같은 local Step id를 대체하지 않는다. capability가 달라져 재현할 수 없으면 unknown/unavailable로 차단한다.
5. 기록 draft와 `now:candidate.state.updatedAt`으로 C `commit-source-bound-personal-plan-structure-context`를 한 번 실행한다. **ok, changed=true, `JSON.stringify(result.checkpoint) === candidateRaw`**를 모두 요구한다.
6. 이웃 core/structure override, full Undo, rawSteps/capture, order/ref 배열, revision/timestamp, 유효하지만 다른 source snapshot을 바꾼 후보가 C에서 단독 유효하더라도 이 관계가 다르면 거절한다. replay epoch 0/다른 safe integer가 저장 결과에 영향을 주지 않는 회귀가 필요하다.

이 검사는 임의 외부 코드가 localStorage 모든 값을 일관되게 다시 쓴 것을 암호학적으로 인증하지 않는다. 현재처럼 저장 기록 내 provenance와 단일 transition 관계를 검사하는 범위다. 신뢰 flag나 해시만으로 실제 source snapshot을 대체하지 않는다.

## 6. live phase·prepared·confirmed·재개

| 경계 | v4의 처리 | 쓰기/입력 보존 |
| --- | --- | --- |
| open/begin/child/retry | actual source bytes+numeric epoch, whole checkpoint, genuine token | 실패/변경 없음이면 0쓰기. 현재 입력 보존 |
| prepared 직전 | source/old journal/legacy base/target before/현재 journal exact 확인 | 준비 성공 시 journal 1 |
| target 직전 | source+epoch, owned prepared, target before 재확인 | 성공 시 target 1; foreign drift에 rollback0 |
| target readback 실패 | exact 자기 candidate와 live guard가 확인될 때만 before rollback | 확인 불가면 prepared 보존·잠금 |
| confirmed 직전 | source+epoch, candidate target, owned prepared 확인 | confirmed journal 1. throw-after는 실제 phase+target 재확인 |
| confirmed 직후 source 변경 | durable committed fact는 유지, 편집 재개 가능성은 별도 | committed target rollback0; 정상 화면/receipt 과장 금지 |
| startup | 역사 snapshot과 v4 candidate를 읽기 검증 | 자동 복구·cleanup0 |
| prepared 명시 복구 | target가 before/candidate이고 journal을 exact 소유할 때만 before 복원/정리 | source key를 복원하지 않음; 복구 API 수는 새 저장과 분리 |
| confirmed 명시 정리 | 역사 snapshot 검증 + exact confirmed/candidate | journal만 제거, source drift/read-error 때문에 target rollback0 |
| unknown/foreign/unreadable | bytes 보존·gate | fallback/reset/새 editor writer0 |

복구 후 v4 review는 현재 v3와 같은 frozen `{viewOnly:true,scopeId,baseline,draft}`다. source snapshot 전문이나 current permission flag를 review에 추가하지 않는다. generic raw 재개와 v3 재개는 v4 recovery token을 거절한다.

v4 재개는 verified one-use recovery token, **새 sessionId**, actual before/journal 부재/legacy guard를 확인하고 현재 source를 실제로 읽는다. 기록 snapshot과 같은 raw일 때만 새 epoch로 fresh C structure context를 만들고 baseline/draft를 재검사한다. 마지막 source/target/journal recheck 후 성공할 때만 token을 소비한다. raw/epoch가 다르거나 source/structure reader가 unavailable이면 보존 draft를 읽기 상태로 남기고 자동 rebase·현재 원문으로 덮기·옛 snapshot 저장0이다.

UI는 PD의 현재/실제 Undo-P 결합 표시도 확인한 뒤 재개해야 한다. B1에서 확인한 **저장 before 복구 성공과 편집 표시 가능 여부의 분리**를 유지한다. 표시가 막혔는데 token을 먼저 소비하고 active editor를 고립시키지 않도록 retained review/명시 재열기 gate를 연결한다. v1/v2의 legitimate 구 draft 역시 새 v4로 자동 변환하지 않는다.

## 7. 호환·삭제·연결 순서

| 기존 대상 | 보존할 동작 |
| --- | --- |
| journal v1 legacy Plan/Quick | 기존 fixed pair·shape·draft·recovery 의미 그대로. 구조 필드 추가0 |
| raw checkpoint-bound v2 | source-unbound 의미 유지. 구조를 source-ready로 간주하거나 v4로 자동 재개0 |
| source-bound v3 | B1 draft version1, v3 snapshot 재도출·실제 source guard·재개 그대로 |
| metadata 없음/v1 current/Undo | 열기·no-op에서 upgrade0. B2 첫 실제 구조 변경 때만 승인된 v2 metadata 생성 |
| v2 metadata current + v1 Undo | C/P dual validation 후 저장/복구. 이웃 entry의 capture/unknown/source/raw 값 exact 보존 |
| v3 core 편집 + v2 metadata | P/C가 structure exact 보존을 검증한 경우만 기존 경로 사용. 불가능하면 명시 차단, silently strip/downgrade0 |
| 옛 binary가 모르는 v4 | 안전 차단이 목적. 옛 binary의 정상 UI 동작까지 보장하지 않음 |

S의 `journalFamily`는 `version===4 && exact draftContract`를 editor 후보로만 분류한다. 이 힌트를 저장 권한으로 쓰지 않고 E2 decode를 반드시 거친다. action contract가 있는 기록은 여전히 S action decoder이며 E2 fallback으로 열지 않는다. old v1 journal pending/read-error가 있으면 v2 pair의 새 v4 save/recovery와 경쟁하지 않는다.

전체 source raw snapshot은 기존 journal에 잠시 추가로 남는다. v4라고 TTL·자동 삭제·별도 archive를 만들지 않는다. 정상 confirmed cleanup/명시 prepared recovery 뒤 없어져야 하며, 오류이면 보존·잠금이다. 로그에는 bytes/hash/count만 남긴다. D는 current/Undo의 exact Flow entry 전체를 scrub해 structure.capture/rawSteps/별칭/order도 함께 제거해야 한다. journal snapshot이 남은 상태에서 `deletionComplete`를 선언하지 않는 기존 S/D/UI gate가 선행한다.

권고 순서는 **P strict v2 + source structure API → C whole-checkpoint 등록/action → E2 v4 + S classifier → D/PD/일반 action 회귀 → app 기존 Plan UI 연결 → 실제 브라우저/생성 HTML**이다. P/C가 준비됐다는 이유만으로 UI 저장부터 켜지 않는다. 새 Item/section 추가·소속 변경은 현 same-membership capability 밖이며 B2 v4가 그 정책을 새로 정하지 않는다.

## 8. 구현 전 확인 사항과 예정 검사

현재 코드만으로 새 v4를 발급/검증하는 것은 불가능하다. P/C 신규 API·dual metadata 구현이 선행 의존성이다. 이는 사용자에게 새 제품 정책을 요청해야 하는 막힘이 아니라 승인된 계약의 다음 구현 gate다. 일반 personal-draft/derived section에 별칭 권한을 새로 주거나 source membership 제한을 풀려면 별도 근거/계약 검토가 필요하며 이번에는 readonly/명시 unavailable을 유지한다.

아래는 **예정 검사 묶음 18개이며 등록·실행 수가 아니다.** 실제 신규 파일/실행은 구현 승인 뒤 만든다.

| ID | 최소 검증 |
| --- | --- |
| E4-01 | actual M 명시 동명 구간 → C/P genuine 발급; source/section/order/root baseline frozen, open writes0 |
| E4-02 | order-only/section-only/core-only 저장. journal은 모두 v4, metadata 승격은 실제 구조 변경 때만 |
| E4-03 | source A→B 별칭 명시 A/B/inherit·원래 순서 복귀·기존 core/이웃 v1 entry 보존 |
| E4-04 | root readonly/foreign section·잘못된 full permutation·getter/toJSON/prototype·child 구조 필드 주입 거절 |
| E4-05 | child title/메모/날짜 apply와 discard가 부모 section/order exact 보존, parent invalid 이유 유지 |
| E4-06 | 같은 string ID의 다른 genuine parent/다른 copy·revision ABA·old child/recovery/attempt token 거절 |
| E4-07 | semantic no-op·boundary·cancel/Escape/Back의 candidate/journal/새 Undo0 |
| E4-08 | source raw/epoch/whole checkpoint·Undo-only drift, read-error와 관찰 ABA의 latch 및 입력 보존 |
| E4-09 | v1/v2/v3 unchanged positive와 v4 downgrade/unknown fields·wrong kind·cross-pair/public API 우회 negative |
| E4-10 | v4 before/candidate 재도출, null-before seed/legacy, v1 Undo, epoch 독립성 |
| E4-11 | 유효하지만 다른 C candidate·baseline·rawSteps·order·snapshot·이웃 entry·Undo·timestamp 바꿔치기 거절 |
| E4-12 | prepare/target/confirm 각 source read-error·drift·epoch ABA·target/journal/old-base drift에서 정확 호출 수 |
| E4-13 | Quota/readback/throw-after/rollback-write/readback 실패, own candidate만 복구·foreign 보존 |
| E4-14 | prepared before/candidate/foreign와 실제 reload, 현재 source changed/broken이면 읽기 보관·자동 재개0 |
| E4-15 | confirmed throw-after/cleanup fail/reload/현재 source 변화, durable fact 유지·target rollback0 |
| E4-16 | one-use resume/retry/late outcome/이중 submit, raw/v3 recovery는 원 계약 유지·v4 변환0 |
| E4-17 | snapshot cleanup/용량 계측, pending old/general/editor journal 충돌, D/S 삭제 완료 경계 |
| E4-18 | actual UMD/CJS의 missing/new API·S routing·PD 현재/Undo gate·일반 move/complete/Quick/Undo 보존 |

기존 `plan-item-session.test.cjs`, `plan-context-session.test.cjs`, `plan-source-context-session.test.cjs`, 독립 source-bound negative 및 C/P/D/S/PD 회귀를 새 hash에서 다시 실행해야 한다. 이 문서에서 test title을 읽은 것을 PASS로 세지 않는다. 이후 UI 단계는 root/child dirty close·비드래그 순서·복구·원문 합성·5 viewport·actual local file·운영 sentinel을 별도 등록하고, 실제 Android/iOS·관찰 사용자는 미실행으로 분리한다.

이번 하위 작업의 제품/test 구현0, v4 테스트0, 브라우저0, 실제 기기 NOT_RUN, 관찰 사용자0. 앞서 완료한 B1 실제 파일/viewport 검사는 [독립 QA 추가 근거](./k3b-plan-modes-ui-qa.md)에만 기록했으며 B2 증거로 합산하지 않는다. commit/push/PR/Preview/Production 없음.
