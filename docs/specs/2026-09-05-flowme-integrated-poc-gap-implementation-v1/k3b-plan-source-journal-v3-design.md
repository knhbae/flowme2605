# K3-B B1-E — source-bound Plan의 v3 복구 근거 제안

2026-09-05. **root가 전체 snapshot·v3·실제 source read wrapper와 아래 §3.2의 연결 계약을 승인했고 E2에 구현했다. [v3 QA](./k3b-plan-source-session-v3-qa.md)는 신규 27 + 기존 154 = 181/181 PASS이며 화면은 미연결이다.** [E01–E15 QA](./k3b-plan-session-context-qa.md)의 raw checkpoint-bound v2 의미는 유지한다. [Sa reader](./k3b-plan-source-reader-design.md), [Sb intent 차이](./k3b-plan-source-intent-contract-diff.md), 현재 [C](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js)/[P](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)의 새 source API를 읽고 비교했다. 이 문서가 해당 병행 구현의 모든 검사를 완료했다고 주장하지 않는다.

## 1. 왜 기존 v2를 그대로 쓸 수 없는가

raw 제목 A, 검증된 source 기본 제목 B에서 명시 A를 저장하면 Sb는 A override를 남겨야 한다. 반대로 명시 B는 no-op이다. raw-only v2의 decoder는 source 없이 원래 A baseline으로 C를 재실행하므로 이 두 intent를 정확히 재도출하지 못한다. v2를 조용히 새 의미로 바꾸거나 `canEdit`, 임의 normalization baseline, `trusted`를 받는 방식은 쓰지 않는다.

새 durable 근거는 서로 다른 질문을 답해야 한다.

| 질문 | 필요한 근거 |
| --- | --- |
| 방금 저장할 입력이 지금도 같은 원본을 보고 있는가 | 실제 source key의 현재 bytes + 관찰 epoch + 메모리 context |
| reload한 prepared/confirmed가 어느 입력에서 만들어졌는가 | 기록에 보관한 과거 원본 근거 + beforeRaw + 정확한 Flow/기본·제출 draft + 단일 C 재도출 |
| 복구/정리 뒤 현재 원본으로 다시 편집 가능한가 | 현재 key를 새로 읽어 발급한 새 context/capability |

과거 원본 근거가 현재 source를 되돌리거나 현재 편집 허가를 대신하지 않는다. 새 source/workspace 두 key를 함께 rollback하는 transaction도 만들지 않는다.

## 2. 대안 비교와 권고

| 근거 방식 | 장점 | 부족한 점 | 이번 권고 |
| --- | --- | --- | --- |
| 기록 당시 source key의 전체 raw `string|null` | 현재 M loader·P provenance·C source-aware transition을 그대로 재사용. exact bytes 비교 가능. 다른 source가 적용돼도 과거 입력 재현 가능 | source store 전체의 private raw/base/mine/incoming/다른 사본을 journal에 한 번 더 보관. 크기와 quota 부담, 미정리 기록의 수명 | **현재 PoC의 단기 journal 근거로 권고**. 수명·실패 제한을 명시 |
| 선택 Flow에 필요한 candidate/effective/undo slice | 다른 사본 노출과 크기를 줄일 수 있음 | 현 M validator는 전체 store 기준이다. candidate/effective/undo/lineage 연결을 lossless로 자르는 새 owner·provenance 계약이 필요. unknown/추가 membership을 빠뜨리면 현재 decoder보다 약해짐 | 후속 최적화. slice validator/negative matrix 승인 전 사용 금지 |
| source hash + 현재 store 조회 | 기록이 작음 | source가 바뀌거나 지워지면 과거 baseline을 복원 못함. hash가 source raw와 같은 provenance를 제공하지도 않음 | 단독 근거로 부적합 |
| title/date normalization baseline만 보관 | 가장 작고 재계산이 쉬워 보임 | 임의 baseline 바꿔치기가 정상 후보로 통과할 수 있음. 원본 lineage·사본·Item membership의 증거가 사라짐 | 사용하지 않음 |
| materialized source view/normalized overlay witness | 현재 source 없이 후보 비교 가능 | 단순 유효 view가 실제 원본의 합성 결과였다는 증거는 아님. source fact와 개인 raw 소유권을 섞을 위험 | 새 검증 계약 없이는 사용하지 않음 |
| 별도 immutable 원본 archive key | 기록 간 중복을 줄일 수 있음 | 새 저장 key·참조 수명·복구·명시 삭제 scrub이 필요. 범위를 넓힘 | 이번 단계 제외 |

전체 snapshot은 영구 source archive를 추가하는 정책이 아니다. 기존 PoC journal 하나에 성공 판정/복구에 필요한 동안만 두는 기술안이다. [QA의 합성 fixture 한 건](./k3b-plan-source-session-v3-qa.md)에서 source 6,440/journal 68,322 UTF-8 bytes를 측정했다. 최대/평균 사용자 bytes나 실제 quota는 **아직 측정하지 않았다**. 고정 용량·TTL·자동 정리 정책을 만들지 않는다.

## 3. 제안하는 분리된 기록/API

기존 고정 target/journal pair를 그대로 사용한다. 기록의 version만 새 branch `3`으로 구분하고 v1/v2의 decoder를 유지한다. draft의 mode 형태는 같지만 source-bound 의미를 raw wrapper로 넘기지 않도록 다음 명시 wrapper/contract를 승인·구현했다.

```ts
createSourceBoundPersonalPlanSession(storage, {
  checkpoint, flowRef, readSourceEpoch, sessionId, returnPoint,
})
beginSourceBoundPersonalPlanSave(storage, session, {
  checkpoint, expectedRaw, readSourceEpoch, attemptId, now,
})

// 기존 13개 공통 필드의 뜻은 유지한다.
{
  version: 3,
  targetKey, phase: 'prepared' | 'confirmed',
  sessionId, kind: 'plan', scopeId, revision, submission, attemptId,
  beforeRaw: string | null, candidateRaw: string,
  baseline, draft,
  draftContract: 'flowme-standalone-source-bound-personal-plan-draft-v1',
  sourceReadSnapshot: { version: 1, raw: string | null },
}
```

`sourceReadSnapshot`은 성공적으로 읽은 raw만 받는다. read-error/unavailable packet, undefined, unknown version/필드, 임의 decoded store는 보관 가능한 snapshot이 아니다. 실제 key는 현재 M 상수 `flow:poc:personal-workspace:v1:source-candidates` 하나로 고정한다. snapshot에 caller 지정 key/path를 추가하지 않는다.

context, sourceContext, canEdit, sourceReady, source view, caller normalization baseline은 직렬화하지 않는다. `sourceEpoch`는 실시간 관찰용 메모리 수치이며 reload 뒤 이전 epoch를 재사용하지 않는다. history 재도출은 **검증한 snapshot에서 새 context를 발급**한 뒤 한정된 재현 epoch(예: 0)를 같은 inspect/transition 쌍에 주는 것으로 충분하다. epoch가 후보의 stored domain 값에 영향을 주지 않는다는 것을 실제 시험으로 확인해야 한다.

raw v2 API가 반환하는 `sourceBoundary:'not-bound'`를 source-ready로 자동 승격하지 않는다. 새 source wrapper가 source-bound context를 소유한 경우만 별도 branch로 저장한다. UI는 완료 gate 전 이 새 경로를 열지 않는다.

### 3.1 입력 중 검증: 저장·현재 I/O와 분리한 P API 제안

현재 E2의 raw `validPersonalDraft`는 `P.normalizePlanDraft`를 호출한다. 이 함수는 raw context만 받으므로 Sb editor token을 그대로 넣으면 실패한다. 매 keystroke에 임의 `now`를 만들고 C transition을 시험 실행하는 방식은 쓰지 않는다. revision/Undo/후보 생성과 편집 중 문법·domain 검사를 분리하기 위해 아래 작은 P API를 제안한다.

```ts
validateCapturedPersonalPlanSourceDraft({ context, draft })
  -> { ok: true, scope: 'captured-source-draft' }
   | { ok: false, scope: 'captured-source-draft', reason: string }
```

이름·입력·출력의 제안 계약은 위와 같다. `scope`는 함수가 만드는 고정 사실이며 caller 입력이 아니다. context는 `inspectPersonalPlanSourceEditor`가 발급한 genuine Sb token만 허용한다. raw P token, Sa 읽기 token, clone/JSON/fake token은 `invalid-source-editor-context`로 거절한다. return에는 overlay/candidate/normalized draft/context/canEdit/sourceReady를 싣지 않는다.

검사 순서를 다음으로 고정한다.

1. 입력 record의 정확한 keys `context,draft`와 data descriptor를 검사한다. extra/unknown/getter/prototype 입력을 기존 safe guard로 먼저 거절한다.
2. private `sourceEditorContexts`에서 genuine token을 확인한다. 새 context를 발급하거나 caller baseline으로 대체하지 않는다.
3. 기존 `normalizedSourceIntent`를 재사용해 draft의 version/tuple/ref/membership/mode/빈 title/date를 검사하고 현재 captured inherited 기준으로 정규화한다. 변경하지 않은 stored override 보존도 같은 private 로직을 쓴다.
4. normalized overlay를 private captured raw/source view의 복사본에 적용해 기존 `applyValidatedOverlay`/M effective-domain guard로 검사한다. owner/capture/metadata 조립은 실제 Plan 경로의 private helper를 공유하고 별도의 약한 validator를 만들지 않는다. 반복 schedule 같은 domain 오류는 기존 `invalid-effective-plan` 사유를 유지한다.
5. 성공 여부·scope·기존 reason만 반환한다. 원본/초안 값, revision, updatedAt, Undo는 변경하지 않는다. `now` 인자·Date 조회·실제 storage/DOM I/O·current source read·새 context 발급은 0이다.

이 API의 성공은 **캡처한 기준에서의 입력/domain 유효성**이다. 현재 source bytes/epoch가 그대로라는 뜻이 아니다. E2 source-bound update는 이 결과로 local dirty-valid/invalid를 판단하되, 관측 stale/recovery 잠금을 성공 결과로 해제하지 않는다. child는 지원 문법의 입력을 보존하며 부모에 합친 draft를 검증해 root 저장 여부·domain 사유를 표시한다. 다른 부모 필드가 invalid라는 이유로 유효한 child의 미반영 입력을 지우지 않는다.

실제 begin/retry/target/confirmed에서는 C source-aware transition과 E2의 실제 key read를 다시 수행한다. 이 pure validation을 저장 권한으로 재사용하지 않는다. 기존 raw-only API의 validation 결과·v2 session 의미는 그대로 두며, raw domain 검사의 시점을 새 API 구현과 섞어 소급 변경하지 않는다.

P의 구현·검증은 [captured draft QA](./k3b-plan-source-draft-qa.md)에 따로 기록했다. genuine/wrong token, A→B의 명시 A/B와 unchanged stored intent, invalid/foreign/getter/recurrence, 입력/context raw 불변, Date/storage 접근 0, 실제 planner와 domain 판정 일치가 검사 대상이다. 이 문서의 열거를 실행 수로 세지 않는다.

### 3.2 승인된 actual read·child/retry·복구 signature

위 create/begin signature는 초기 제안의 caller `sourceRead/sourceEpoch` packet을 **대체**한다. E2 wrapper가 actual storage에서 fixed source key를 직접 읽고 C용 packet을 내부 생성한다. packet만 받아 actual source 권위를 주는 public 저장 경로를 추가하지 않는다.

```ts
// 매 경계에서 readSourceEpoch() → fixed source getItem → readSourceEpoch().
// 반환은 safe integer >= 0만 허용하며 두 값과 캡처 epoch가 같아야 한다.
writeDurableAttempt(storage, session, attempt, { readSourceEpoch })

checkSourceBoundPersonalPlanSession(storage, session, { checkpoint, readSourceEpoch })
createSourceBoundPersonalPlanChild(storage, parent, {
  checkpoint, readSourceEpoch, itemRef, sessionId, returnPoint,
})
applySourceBoundPersonalPlanChild(storage, parent, child, { checkpoint, readSourceEpoch })
retrySourceBoundPersonalPlanSave(storage, session, { checkpoint, readSourceEpoch, attemptId })

resumeRecoveredSourceBoundPersonalPlanSession(storage, recovery, {
  sessionId, readSourceEpoch, returnPoint,
})
// same-current-source: { ok:true, session, requiresSourceReopen:false }
// changed/unreadable/stale: { ok:false, reason, requiresSourceReopen:true, review }
```

`readSourceEpoch`는 UI가 실제로 관찰한 source 변경 counter의 숫자 getter다. true/false 권한 callback, source bytes 대체 callback, source token 반환 callback은 아니다. 읽기 예외·잘못된 타입·두 epoch 불일치·captured epoch/raw 불일치는 저장하지 않는다. 실제 I/O 자체는 고정 key를 읽는 E2가 수행한다. counter가 실제 이벤트를 모두 관찰했는지까지 순수 함수가 인증한다고 주장하지 않는다.

관측 mismatch가 한 번 발생하면 private binding을 stale로 남긴다. 이후 raw와 epoch가 되돌아와도 이전 context를 재사용하지 않는다. 보존 draft의 local mode 입력은 captured validation만 하며 stale 상태를 해제하지 않는다. generic raw `beginSave/beginPersonalPlanSave/createChildSession/applyChild/retrySave/resumeRecoveredSession`는 v3 owner를 거절하고 새 wrapper를 요구한다. 같은 함수 이름의 retry나 child 반영으로 actual source 검사를 우회하지 않는다.

prepared 복구 결과에는 `requiresSourceReopen:true`와 동결한 `review:{viewOnly:true,scopeId,baseline,draft}`를 제공한다. context/sourceReady는 없다. 새 resume API는 실제 현재 source를 읽고 **raw가 기록 snapshot과 동일한 경우에만** 새로운 관찰 epoch로 fresh C/P context를 발급한다. target before·journal 부재·legacy guard도 재확인하고, baseline/draft는 새 context와 다시 대조한다. 모든 검사 후 성공할 때만 recovery token을 소비한다.

현재 source가 다르거나 읽을 수 없으면 review/보존 입력을 그대로 반환하고 자동 이식·정규화·저장·token 소비를 하지 않는다. 사용자가 버리거나 현재 source로 새로 여는 행동은 후속 UI의 명시 경로다. old snapshot으로 편집을 재개하거나 그 snapshot을 source key에 되돌려 쓰지 않는다.

## 4. v3 decoder의 필수 재도출

1. 정확한 record keys/version/draftContract/kind/phase/pair를 검사한다. v2에 source field를 붙이거나 v3에서 snapshot을 빼면 거절한다.
2. beforeRaw/candidateRaw를 실제 C validator로 검사한다. null-before는 candidate의 legacyBaseRaw에서 `C.fromLegacy`로 원래 seed/legacy checkpoint를 재구성한다. baseline provenance/current/Undo 검사를 생략하지 않는다.
3. snapshot raw를 P의 기존 Sa reader에 전달한다. Sa는 정확 source key용 읽기 객체로 **실제 M.loadSourceCandidateStore**와 store validator를 재사용한다. source runtime 없음/corrupt/unknown target/foreign tuple/membership 제한은 현행 실패를 유지한다.
4. `C.inspectSourceBoundPersonalPlanContext(before, {flowRef:scopeId,sourceRead:{ok:true,raw:snapshot.raw},sourceEpoch:replayEpoch})`로 fresh editor/context를 만든다. 기록의 baseline은 새 draft와 exact-data 비교한다.
5. `C.transitionCheckpoint(before,{type:'commit-source-bound-personal-plan-context',context,draft,sourceRead,sourceEpoch:replayEpoch,now:candidate.state.updatedAt})`를 **한 번** 재실행한다.
6. changed=true와 candidateRaw byte 재도출 일치를 요구한다. 다른 Flow·다른 사본·추가 overlay·수정한 Undo·revision/timestamp·source snapshot 교체를 포함한 유효 C 후보도 이 관계가 다르면 거절한다.

이 검사는 기록 내 관계를 검증한다. 동일 origin의 외부 코드가 localStorage 전체를 일관되게 다시 작성하는 것을 암호학적으로 인증하는 기능은 아니다. 그보다 강한 보장을 주장하지 않는다. 후보가 유효하다는 이유만으로 baseline·source 근거 검사를 생략하지 않는 것이 현재 경계다.

## 5. live 저장의 guard 순서

E2는 실제 storage에서 source key를 읽는 좁은 함수를 사용해야 한다. caller가 전달한 snapshot을 ‘현재 read’라고 다시 내주는 callback만으로 durable guard를 통과시키지 않는다. UI의 관찰 epoch는 별도 fresh reader로 확인하며, 임의 bool 권한 callback을 추가하지 않는다.

| 시점 | 검사/행동 | 허용 쓰기 |
| --- | --- | --- |
| open / child 적용 / begin / retry | 실제 현재 source packet·epoch + 전체 checkpoint가 context와 exact 일치, field/domain 검증 | 0 |
| prepared 직전 | 현재 source exact bytes/epoch, old legacy journal 없음, legacyBaseRaw/target/journal expected bytes 재확인 | 통과 시 prepared journal 1 |
| target 직전 | source exact bytes/epoch 재확인, 준비 기록 소유권, target before CAS | 통과 시 target 1 |
| target readback | exact candidate 확인. 실패 시 기존 own-candidate만 rollback 가능 | 소유/guard가 증명될 때만 before 복원 |
| confirmed 직전 | source exact bytes/epoch·target candidate·owned prepared 재확인 | 통과 시 confirmed journal 1 |
| confirmed 뒤 | exact confirmed+candidate가 durable 성공 근거. 그 직후 source drift는 새 source 재확인 상태와 분리 | target rollback 0 |

source 변경이 prepared 뒤 발견되면 기록을 보존하고 저장/재시도를 멈춘다. target 뒤 confirmed 전에 발견되면 성공으로 표시하지 않고 prepared recovery로 남긴다. source가 실제로 바뀐 상태에서 자동 rollback까지 진입해 두 key의 시점을 맞추려 하지 않는다. 기존 E2처럼 명시 복구 경로로 넘긴다.

동일 JS turn 사이 다른 탭에서 일어난 모든 ABA를 순수 함수가 감지할 수 있다고 주장하지 않는다. 실제 storage event로 관찰한 A→B→A는 epoch로 차단하고, 미관찰 ABA의 한계는 별도로 기록한다.

## 6. reload·복구·정리의 의미

| 기록/현재 target | 자동 load | 명시 행동 | source key |
| --- | --- | --- | --- |
| prepared / before | 역사 snapshot으로 기록 검증만. 쓰기 0 | owned journal 정리, 보존 draft 제공 | 읽기 필요성은 재편집과 구분. 쓰기 0 |
| prepared / candidate | 기록/소유관계 검증, 성공으로 간주하지 않음 | 기존 exact guard로 target before 복원 후 journal 정리 | 현재 source는 복원하지 않음 |
| prepared / foreign·unreadable | 차단 | 덮어쓰기/자동 폐기 없음 | 변경 없음 |
| confirmed / candidate | 과거 source snapshot과 C 재도출로 이미 성공한 저장 확인 | owned confirmed 정리만. source drift 때문에 target을 rollback하지 않음 | 현재 source와 달라도 역사 성공 의미 유지 |
| confirmed / foreign·unreadable | 차단 | target/기록 덮어쓰기 없음 | 변경 없음 |
| snapshot corrupt/runtime unavailable | 기록 검증 불가 | 복구/정리 우회 금지. bytes 보존·명시 상태 | 변경 없음 |

prepared 복구로 before를 되살린 뒤 **old source ticket을 재발급해서 현재 편집처럼 사용하면 안 된다.** 보존 draft의 소유 Flow/ref는 유지하되 현재 source를 실제로 새로 읽고 새 context/capability로 재확인한다. 원본 B가 C로 바뀌었으면 old baseline/draft를 자동 정규화하거나 저장하지 않는다. 명시 재확인 전에는 draft가 보관된 읽기 상태로 남는다.

현재 E2의 `canResume`는 legacy base/old journal 조건을 뜻한다. 새 v3에서는 그것만으로 source 편집 재개를 허용하지 않는다. 새 결과에 `requiresSourceReopen:true`처럼 분리된 사실을 두거나 source wrapper 전용 재개 결과를 반환하는 쪽을 권고한다. raw v2 재개 함수로 v3를 우회하지 못하게 해야 한다. 구체 반환 이름은 구현 전 확정한다.

## 7. snapshot 수명·크기·명시 삭제

- snapshot은 workspace metadata/Undo나 CreatorDraft에 넣지 않고 현재 복구 journal에만 둔다. 정상 confirmed cleanup 또는 명시 prepared recovery가 끝나면 같은 journal 제거와 함께 없어져야 한다.
- cleanup 실패/읽기 불능이면 snapshot을 보존하고 재확인 상태를 보여 준다. 임의 TTL, 자동 clear, 오래된 기록 삭제를 추가하지 않는다. ‘항상 즉시 지운다’고 약속하지 않는다.
- 문자열 escaping 때문에 실제 journal bytes는 source raw 길이보다 커질 수 있다. before/candidate 자체에도 raw가 들어 있어 중복 비용을 측정해야 한다. prepared quota 실패는 target 0write이며, 실패 입력을 유지해야 한다.
- 같은 origin PoC localStorage이지만 전체 store를 복제하면 다른 사본의 private raw도 하나 더 생긴다. 로그·QA·오류 메시지에 snapshot 전문을 싣지 말고 bytes/hash/count만 기록한다. 재현 fixture 외 사용자 raw를 보고서에 복사하지 않는다.
- 기존 명시 영구 삭제는 pending editor journal이 있으면 같은 복구 gate를 먼저 해결해야 한다. 새 snapshot이 남아 있는데 ‘선택 사본의 모든 private 데이터 삭제 완료’로 표시하면 안 된다. 이미 승인된 삭제 owner 경계와 충돌하지 않는지 D/S/UI 연결 전에 재검사한다.
- snapshot을 줄이려면 target별 candidate/effective/undo slice의 완전성과 unknown owner를 입증하는 별도 extractor/validator부터 만든다. 검사 부담을 없애려고 source hash나 title 배열만 남기지 않는다.

## 8. 수용 조건과 후속 검증

아래는 초기 E16–E18/v3 수용 조건 묶음이며 실제 테스트 개수가 아니다. 실제 신규 27개 및 기존 회귀의 매핑은 [v3 QA](./k3b-plan-source-session-v3-qa.md)를 따른다. 화면·실제 기기·실제 quota 등 남은 검사를 PASS로 올리지 않는다.

1. **정상/정규화:** 실제 source A→B에서 Flow/Item 명시 A 유지, 명시 B no-op, inherit, memo 빈 값/기존 개인 기준, 같은 날짜 pin. revision/Undo/source write 수 확인.
2. **버전/재도출:** v1/v2 unchanged; v3 unknown keys/contract/snapshot/null-before; 다른 유효 source snapshot·같은 제목 사본·이웃 overlay/Undo·revision 바꿔치기 거절.
3. **실시간 경계:** open/begin/retry/prepare/target/confirm에서 source-only drift, read-error, 관찰 ABA. prepared 뒤에는 journal API 수를 숨기지 않고 target/rollback/source 수를 분리.
4. **phase/복구:** prepared before/candidate/foreign/unreadable, confirmed cleanup 실패·중복·현재 source 변경·runtime 불가. source rollback 0, confirmed target rollback 0.
5. **수명/용량:** 정상 cleanup 뒤 snapshot 없음, quota before/after, 큰 실제 validator-valid fixture의 bytes, cleanup 불확실 시 기록 보존, 명시 삭제와 pending journal 경계.
6. **재편집:** 복구 후 새 현재 source로만 context 발급, old baseline 자동 교체 0, 보존 입력·정확 사본·field 사유 확인. source 정규화가 필요한 invalid child 입력의 부모 domain 오류 유지.
7. **통합:** 기존 E01–15/126회귀, C/P/S/D, UI 잠금/초점/Back/5 viewport와 운영 key byte 불변. 순수 오류 주입과 브라우저·실기기 결과를 분리.

전체 snapshot을 단기 journal 증거로 쓰는 안을 root가 승인해 E2 wrapper/writer를 구현했다. 화면 연결은 아직 없고, source/workspace 복합 rollback·새 영구 제품 정책·배포도 진행하지 않았다. 저장·복구 모듈의 통과를 제품 통합 완료로 보고하지 않는다.
