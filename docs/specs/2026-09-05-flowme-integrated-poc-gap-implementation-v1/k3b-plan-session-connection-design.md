# K3-B B1-E — 새 개인 Plan 초안과 편집·복구 세션 연결안

2026-09-05. **읽기 조사·설계만 수행했다. 제품·기존 테스트·builder·생성 HTML·공용 보고서는 수정하지 않았으며, 아래 신규 검증 항목은 아직 실행하지 않았다.** 앞서 완료한 RF/원문 시간 브라우저 결과를 이 E2 연결의 PASS로 세지 않는다.

## 1. 기준과 현재 코드

[B1-G 공개 계약](./k3b-plan-context-contract.md), [B1-G QA](./k3b-plan-context-qa.md), [C 연결 설계](./k3b-checkpoint-plan-connection-design.md), [원본 합성 reader 설계](./k3b-plan-source-reader-design.md), [무손실 gate](./k3b-plan-lossless-gate.md), [K1-B 설계](./k1b-design.md), [복구 보완 계약](./k1b-recovery-addendum.md), [고정 target/journal 쌍](./k2b-checkpoint-contract.md)을 대조했다.

현재 [plan-item-session.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js) 전체와 [app.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)의 열기·입력·저장·복구·child 경로를 읽었다. E2 기준 SHA는 `FD249B599E122E84DF614C89771EE5A31FCF06B01585BC5093810F43387F6AA7`, app은 `887612E0B4382D46E3CC91A1A61FA6982A1E365E717CC8C4436199CDB9E1D28E`다. 조사 중 C 담당자가 새 순수 연결을 구현하고 있으므로 C의 관측 export는 아래처럼 표시하되, E2 통합 시험 완료로 보지 않는다.

| 현재 연결점 | 확인한 사실 | 새 branch에 필요한 차이 |
| --- | --- | --- |
| E2 `validDraft`, L56 | string title/memo, nullable planDate, Plan items 배열 | P의 mode 객체·ItemRef dictionary를 별도 strict 계약으로 다룸 |
| `createSession`/`updateDraft`, L91/114 | immutable baseline·현재 draft·revision·dirty·pendingClose 보존 | 새 discriminator와 genuine context를 분리. invalid 입력 유지와 구조/identity 차단을 구별 |
| `createChildSession`/`applyChild`, L155/168 | local Item id로 찾고 title/memo/planDate만 복사, 적용 시 title.trim | 새 branch는 full Item ref, title/memo/schedule mode를 exact copy. trim·nullable 변환 없음 |
| `beginSave`, L222 | candidate 검증·고정 bytes·active attempt를 발급 | 새 P draft와 다른 candidate를 임의로 묶을 수 없도록 C가 만든 해당 초안 candidate와 연결 |
| `decodeJournal`, L332 | record version1·13개 exact 필드·plan/quick·기존 draft shape | version1은 그대로, 새 Plan은 별도 version/discriminator. Item root journal 금지 유지 |
| `writeDurableAttempt`, L426 | prepared→target→confirmed, 고정 key·legacy base·outcome brand | 같은 프로토콜을 재사용. source-aware guard는 prepare/target/confirm 경계에 별도 연결 |
| `recoverDurableAttempt`/`resumeRecoveredSession`, L530/568 | prepared만 before 복원, verified recovery로 새 session, old base 재확인 | 새 draft는 복원한 checkpoint에서 context를 다시 발급. 저장된 JSON을 opaque context로 취급하지 않음 |
| app `newPlanDraft`, L2123 | source-composed view에서 string/null 폼 생성 | raw checkpoint/P draft를 authority로 사용. 표시 source view와 editable mode를 분리 |
| app `saveEditor`, L1871 | 옛 commit action→C→E2, 32ms 뒤 같은 session/attempt만 실행 | 새 명시 C action과 source/context freshness를 사용. 기존 Quick/legacy 복구 branch는 유지 |
| app `sourceCandidateBlocked`/`writerStorage`, L1314/769 | source의 cached 장애 상태를 열기 때 검사. writerStorage는 fault wrapper일 뿐 source guard 아님 | 별도 source key 변화는 workspace expectedRaw만으로 감지되지 않음. 새 reader 검증이 필요 |

C 현재 구현 후보에는 `inspectPersonalPlanContext(checkpoint,flowRef,options)`와 `transitionCheckpoint(checkpoint,{type:'commit-personal-plan-context',context,draft,now},options)`가 있다. 전자는 C 검증 후 P에 **실제 current state·legacyBaseRaw·undo를 모두 전달**하고, 후자는 P의 단일 revision/Undo를 포장한다. E2 구현 직전에 이 API의 최종 계약·시험 결과를 다시 확인한다.

## 2. 최소 discriminator와 데이터 역할

`kind`는 `plan | item | quick`을 유지한다. 화면·닫기 범위와 초안 문법을 같은 필드에 넣지 않는다. 제안 discriminator는 **E2 session/attempt/journal의 `draftContract: 'flowme-standalone-personal-plan-draft-v1'`**이다. 아직 구현된 export/상수는 아니며 구현 착수 때 이 한 이름을 고정한다.

P의 draft 자체에는 이 필드를 넣지 않는다. 현재 P는 정확히 `{version,flowRef,savedCopyId,flowId,title,items}`만 받으므로 임의 contract 필드를 섞으면 거절해야 한다. 필드가 없는 기존 E2 호출은 기존 string/null 문법이다. 명시된 unknown discriminator를 ‘없음’으로 바꿔 legacy parser에 넘기는 fallback은 금지한다.

| 데이터 | 새 branch의 역할·소유 |
| --- | --- |
| root `scopeId` | full Flow ref. 기존 branch의 local flow id와 discriminator로 구분 |
| P `flowId` | source Flow id. local Flow id가 아님. savedCopyId/flowRef와 함께 P binding 검사 |
| root draft | P의 exact full draft. 모든 Item ref를 한 번씩 포함. dictionary 순서를 Plan 정렬 intent로 해석하지 않음 |
| root baseline | 편집 시작 때 P가 발급한 draft의 deep-frozen copy. P가 별도로 반환하는 `baseline` owner/nullable presence 정보와 구분 |
| P baseline 정보 | 기존 개인 기준·원문 근거 유무를 보여 주는 자료. UI dirty 비교용 draft로 대체하지 않음 |
| child draft | 제안 exact shape `{version:1,flowRef,savedCopyId,flowId,itemRef,title,memo,schedule}`. title/memo는 text mode, schedule은 3mode. 부모 identity와 exact Item ref를 보유 |
| child baseline | 여는 순간 **현재 부모 draft의 해당 Item** 값. root 최초 baseline을 다시 가져오지 않음 |
| Quick | 기존 root kind·draft·nullable date·folder·journal version1 유지. P context나 가짜 Plan 없음 |

개인 section 제목·global Plan 순서는 이 버전에서 **미지원**이다. `sectionTitles`, `orderedItemRefs`, 빈 section/order 필드도 새 draft에 받지 않는다. 날짜별 timeline order·Step membership·회차 순서가 개인 Plan 순서의 대용물이 되어서는 안 된다.

### invalid 입력과 불법 구조를 구별

새 branch용 복사기는 property descriptor를 확인한 뒤 안전한 JSON 값만 복사한다. getter/serialization hook/poison key/holey array 등은 값을 읽거나 JSON stringify하기 전에 차단한다. 현재 `copyData`를 새 P 입력에 바로 적용하면 getter나 Array callback을 먼저 실행할 수 있으므로 안전 검사가 선행해야 한다. P 내부 함수를 우회 호출하거나 이번 이유로 모든 옛 draft 문법을 전면 개편하지 않는다.

빈 title override, 입력 중인 빈 fixed-date처럼 **지원 필드의 편집 중 invalid 값**은 메모리에 남기고 `dirty-invalid`로 표시한다. 반면 unknown key/mode, foreign identity, 누락된 Item dictionary 등은 이전 유효한 세션 구조를 보존하는 차단 결과다. invalid 입력을 버리거나 자동 inherit/null로 바꾸지 않는다. 최종 `valid`는 genuine P context에 대한 `normalizePlanDraft` 결과로 판단하며, 실제 candidate에는 기존 domain/recurrence 검사도 적용한다.

## 3. context 수명과 부모·자식 편집

새 root 열기는 `C.validateCheckpoint`와 `C.inspectPersonalPlanContext`를 통과한 authoritative checkpoint에서만 시작한다. 선택 인자인 P의 legacy/Undo를 caller가 생략하지 않도록 이 C wrapper를 기본 진입으로 삼는다. `app.state()` 또는 reader의 effective view를 raw로 넣지 않는다.

P context는 private WeakMap의 genuine 객체다. E2의 JSON draft·journal·history·DOM dataset·오류 메시지에 넣지 않는다. E2 private binding은 root session 계보에 P context, 발급 당시 raw/checkpoint authority, source reader context, 관찰 epoch를 연결한다. 세션을 immutable replace할 때 이 binding을 같은 계보로 전달하되 다른 root에 옮기지 않는다.

| 이벤트 | 유지·무효화 규칙 |
| --- | --- |
| root title/Item 입력 변경 | root 최초 baseline 유지, draft revision 증가. P raw context는 저장본이 그대로면 유지 |
| child open | exact Item ref 한 개를 선택. 부모 session 계보·object/revision·scope·draftContract를 캡처. child baseline과 draft 독립 복사 |
| child apply | 부모 계보/revision/contract/identity와 source 경계를 재확인. 해당 `items[itemRef]`의 title/memo/schedule만 exact copy. 다른 Item·부모 title·root baseline 불변. persistent 호출 0 |
| child cancel/discard | 이번 child 미반영 입력만 폐기. 부모의 이미 반영한 A와 부모 title 유지. 부모 정확 Item 행으로 복귀 |
| child 다시 열기 | 최근 부모 staged 값이 새 child baseline. 이전 적용까지 지우지 않음 |
| root discard/정상 close | staged 전체를 폐기하고 현재 UI owner를 종료. pure close는 effect만 반환; context/epoch/후속 callback 정리는 root lifecycle adapter가 처리 |
| 다른 root/Flow/새 session | 기존 binding 재사용 금지. 표시 제목과 같은 sessionId 문자열만으로 권위 재연결 금지 |
| checkpoint 또는 관찰 source epoch 변경 | 기존 save/retry/child apply ticket 무효. 입력은 남기되 자동 context 재발급·baseline 재설정 없음 |

부모 A→B→A의 값 원복으로 dirty가 clean이 될 수 있어도 revision은 되돌리지 않는다. child는 시작 당시 부모 revision과 맞지 않으면 apply를 거절한다. root raw A→B→A 역시 관찰한 checkpoint/source epoch로 stale 처리한다. 관찰하지 못한 타 탭 ABA를 완전히 탐지한다고 주장하지 않는다.

동일 millisecond의 sessionId 문자열 충돌 가능성은 기존 known limitation이다. 새 기능의 권위는 문자열만이 아니라 genuine session/context·계보·revision·expected bytes에 의존해야 한다. UUID 정책이나 기존 전역 session schema를 이 설계 작업에서 바꾸지 않는다.

## 4. 저장 API 연결 순서

권고는 기존 `createSession/beginSave`의 legacy/Quick API를 그대로 두고, checkpoint-v2 factory에 새 Plan용 좁은 entry를 추가하는 것이다. 이름은 후보 `createPersonalPlanSession` / `beginPersonalPlanSave`이며 **현재 export가 아니다**. 새 wrapper가 C/P context 발급과 candidate 연결을 맡고 기존 durable writer/outcome을 공유한다.

source Sa/Sb를 기다린다는 이유로 모든 E2 작업을 함께 멈추지 않도록 아래 책임을 분리한다. 이름은 구현 시 최종 고정하되 읽기 검증을 넘겨짚는 선택 인자를 만들지 않는다.

| 독립 단계 | 필요한 입력·출력 | 아직 허용하지 않는 행동 |
| --- | --- | --- |
| E-draft: 새 root/child/dirty/close | C가 검증한 raw checkpoint, P context·draft. 부모/자식 메모리 전이만. source reader 구현 없이 fixture로 독립 검증 가능 | source 부재/최신 확인을 추정하거나 실제 UI 저장을 열지 않음 |
| E-candidate: 순수 제출 후보·journal 연결 검증 | 같은 raw checkpoint+genuine context+draft+now로 C candidate를 산출. version2 journal을 before→draft→candidate 관계로 검사 | source 지원 또는 실제 storage commit 완료라고 보고하지 않음 |
| E-durable: 새 Plan 실제 저장 연결 | 위 candidate/session과 실제 source-read/capability/epoch guard, 기존 target/journal/base 확인 | source guard가 미연결인데 `null`이나 `ready:true`로 우회하지 않음 |

즉 E-draft/E-candidate는 이번 source reader 구현보다 먼저 진행할 수 있다. 이때 ‘source 미연결’은 ‘확인된 empty source’가 아니다. 일반 raw-only 메모리 시험과 source-dependent 실제 쓰기 권한은 별개다. Quick/legacy의 기존 durable API는 유지하며, 새 Plan UI 저장 개방은 E-durable과 삭제 owner gate까지 닫힌 뒤다.

1. root open은 실제 S packet과 C 검증을 거쳐 새 Plan session을 만든다. expectedCheckpointRaw·legacyBaseRaw·source read 결과를 caller가 캡처한다. expectedRaw가 null인 첫 checkpoint도 packet의 raw state/undo/legacy provenance로 검증한다.
2. child apply는 부모 draft만 바꾼다. Item kind는 어떤 contract에서도 `beginSave`/root journal을 만들 수 없다.
3. 사용자 root 저장은 현재 raw/checkpoint/source context와 draft를 검증한다. `now`는 caller가 제공한 canonical ISO 값이며 pure 모델에서 실제 시계를 읽지 않는다.
4. genuine P context와 exact session draft를 C의 `commit-personal-plan-context` action에 전달한다. caller가 전혀 다른 Flow의 유효 candidate를 같은 session에 붙이는 경로를 허용하지 않는다. wrapper가 후보를 직접 만들거나 실제 C 결과에 대한 private ticket을 사용한다.
5. C `changed:false`면 journal/attempt/revision/Undo 생성 0. 입력이 dirty여도 정규화 결과가 같을 수 있다. 편집 중 자동 normalize로 dirty를 지우지 않고, 명시 저장 시 기존 no-op 안내/닫기 의미를 사용한다.
6. changed 결과는 P가 이미 만든 revision +1·직전 전체 state Undo다. E2는 이를 검증·직렬화할 뿐 revision·Plan 전용 Undo를 추가하지 않는다.
7. 32ms 후 callback은 현재 active session **객체**, attempt, submission, workspace/source epoch, recovery/pending gate를 다시 검사한다. 닫힌 root·다른 Item·원복 뒤 이전 callback은 쓰기 0이다.
8. target 쓰기는 기존 fixed checkpoint-v2 pair와 prepare/readback/confirm/cleanup을 사용한다. 성공 횟수·실제 target write·journal 호출·실패 후 rollback은 따로 센다.

같은 입력의 정상 recoverable-error retry는 같은 immutable candidate/attempt를 새 submission으로 실행할 수 있다. 입력·source·checkpoint가 바뀌면 그 retry를 끊고 현재 draft의 명시 새 submit을 받는다. `stale-expected-raw`는 기존처럼 자동 retry하지 않는다. 이전 toast callback이나 소비된 outcome이 root를 다시 닫거나 저장하지 못하도록 `dispatchedSessions`/`issuedOutcomes`의 실제 객체 brand·submission 검사를 유지한다.

## 5. old/new journal decoder와 복구

저장 key는 추가하지 않는다. `legacy-v1`의 old target/recovery:v1, `checkpoint-v2`의 workspace-v2/recovery:v2 두 쌍을 유지한다. key suffix v2와 **레코드 version**은 다른 개념이다.

권고 새 Plan journal은 **record version2 + draftContract**다. 기존 13개 필드의 의미를 유지하고 draftContract를 명시한 exact shape를 사용한다. 새 mode draft를 version1로 기록하면 옛 decoder가 알 수 없는 의미를 정상 처리할 위험이 있으므로 금지한다. Quick과 옛 Plan 복구 기록은 version1 그대로다. 구 E2는 새 version2를 미지원으로 차단하는 것이 맞으며 자동 downgrade/기록 삭제를 하지 않는다.

| journal | decode·후속 처리 |
| --- | --- |
| legacy pair/version1 | 기존 v1 envelope와 string/null draft 검사. 기존 복구 먼저. 새 metadata·mode 문법으로 자동 전환 없음 |
| checkpoint pair/version1 | 기존 C checkpoint validator + 기존 E2 draft branch. pending old draft 복구 의미 유지 |
| checkpoint pair/version2 + 새 Plan contract | current/before candidate C 검증, 같은 legacyBaseRaw, exact Flow tuple·Item membership, baseline/draft mode shape 검사 |
| version2 Quick/Item, unknown contract, 잘못된 targetKey/extra key | fail-closed. 과거 성공 기록 또는 빈 기록으로 해석하지 않음 |

새 decoder는 baseline/draft가 서로 identity만 맞거나 candidate가 단순히 `validCheckpoint`인 것으로 끝나지 않는다. before checkpoint에서 exact Flow ref를 선택해 발급한 P draft와 journal baseline이 exact 일치해야 한다. 그 context에 journal draft를 normalize하고 **C 단일 transition으로 후보를 다시 계산하여, 같은 직렬화 경로의 candidateRaw와 exact 일치**하는지 확인하는 안을 권고한다. 저장된 candidate의 canonical updatedAt을 재계산 입력으로 쓰되 source/clock의 권위를 제조하지 않는다. candidate의 Undo는 before 전체 state여야 한다. unrelated overlay를 추가한 유효 checkpoint, 다른 Flow만 변경한 유효 checkpoint, 같은 제목 다른 사본의 유효 checkpoint로 candidate를 바꾸면 모두 이 연결 검사에서 거절해야 한다.

beforeRaw가 null인 첫 새 checkpoint에서는 검증된 candidate.legacyBaseRaw로부터 `C.fromLegacy`의 직전 메모리 checkpoint를 복원해 비교한다. caller가 임의 baseline state를 주입하거나 candidate.undo 하나만 믿고 같은 owner를 주장하지 않는다. 이 null-before 재구성은 첫 legacy Undo·seed·unknown presence fixture로 별도 검증한다.

### phase별 상태표

| 실제 상태 | 허용 행동 | 금지 |
| --- | --- | --- |
| journal 없음·clean/no-op/invalid·초기 stale/read 실패 | 읽기/안내/현재 입력 보존 | target/journal 쓰기, 성공/Undo 생성 |
| prepared·target before | 명시 복구로 자기 journal 정리·복원 검증. before target 재쓰기 불필요 | 자동 성공·자동 재저장 |
| prepared·target candidate | exact journal/target 확인 후 명시 before 복원·readback·자기 journal 정리 | foreign target 덮기, 일반 restored UI |
| confirmed·target exact candidate | durable commit. 명시 cleanup은 journal만 제거 | target rollback, 같은 변경 재저장, 성공 이중 집계 |
| phase/target/journal/readback 불확실 | 현재 draft 보존·잠금·읽기 재확인 | failed-restored 추측, reset/Undo/다른 writer 우회 |
| old journal 또는 복수 authority | 기존 복구 우선·독립 drift 잠금 유지 | 최신 timestamp 추정·자동 rebase/merge |

복구 후 context는 다시 발급한다. `verifiedRecoveries`의 실제 결과를 소비하고, 복원한 target·journal 부재·old base를 다시 읽은 뒤 C current+Undo+legacy를 검증한다. 새 sessionId로 **복원된 baseline draft**를 만든 다음 보존한 edited draft를 apply한다. opaque P context를 journal에서 JSON parse하거나 `{version:1}`로 재현할 수 없다. 이전 session/attempt/outcome은 재사용하지 않는다.

confirmed 정리는 source 상태가 바뀌었다는 이유로 prepared rollback으로 돌아가지 않는다. 내용 commit과 현재 source view의 재확인은 별개다. source가 stale이면 편집 재개를 잠글 수 있으나, 자기 confirmed journal 정리의 권위는 exact target/journal과 기존 legacy recovery guard로 판단한다.

## 6. source reader 연결과 임시 capability gate

[B1-S 설계](./k3b-plan-source-reader-design.md)의 제안 `readPersonalPlanSourceContext({rawState,legacyBaseRaw,undo,sourceRead,sourceEpoch})` / `checkPersonalPlanSourceContext(context,{rawState,sourceRead,sourceEpoch})`를 소비한다. 아직 구현된 API가 아니므로 현재 P에 해당 인자를 추가 전달하고 검증됐다고 주장하지 않는다.

`sourceRead`는 필수 `{ok:true,raw:string|null}` 또는 명시 실패다. 실제 key 읽기 실패를 null/empty로 바꾸지 않는다. context의 raw/source bytes·관찰 epoch를 private 권위로 보유하되 pure 함수가 caller의 실제 I/O 자체를 인증한다고 주장하지 않는다.

| 시점 | 필요한 확인과 실패 효과 |
| --- | --- |
| root/child open, child apply | 최신 실제 source read + reader context/capability + exact checkpoint/parent revision. 실패 시 입력 보존, 새 후보/적용 0 |
| commit prepare·retry·32ms callback | 현재 checkpoint와 source를 다시 읽음. 관찰된 ABA epoch 포함. 불일치면 기존 ticket 무효, 자동 baseline 교체 0 |
| prepared 쓰기 전 | source guard 실패면 target/journal 쓰기 0 |
| target 쓰기 직전 | source guard 실패면 target 쓰기 0. 이미 prepared를 썼다면 전체 API 0이라고 보고하지 않음 |
| confirmed 전환 직전 | exact target candidate·자기 prepared·legacy base와 source guard를 재확인. source가 바뀌었으면 성공 승격하지 않고 prepared 복구 경계 유지 |
| verified prepared 복구 | source store는 쓰거나 되돌리지 않음. 자기 workspace before 복원 가능 여부와 **편집 재개 가능 여부**를 분리 |
| confirmed 확인/cleanup 뒤 | 이미 확정된 target은 보존. source-dependent view만 재검사·필요 시 잠금 |

이를 구현할 때 arbitrary storage-key remap이나 source raw writer를 E2에 넣지 않는다. 새 Plan attempt에만 묶인 검증 경계를 기존 prepare/target/confirm 직전 callback에 연결하는 작은 경로가 필요하다. 외부가 넘긴 `sourceReady:true`·검증 없는 callable 결과를 durable 권위로 신뢰하는 계약은 만들지 않는다. 최종 reader의 실제 opaque token/검증 API가 정해진 뒤 fault injection으로 경계를 입증한다.

**reload에서 source token을 복구했다고 가장하지 않는다.** 신규 journal 최소안은 P context·source raw 전체·DOM/epoch 객체를 직렬화하지 않는다. 따라서 source-bound 편집을 reload 이전과 동일한 검증 ticket으로 자동 재개할 수 없다. prepared의 workspace bytes 복구는 완료해도, 보존 draft는 read-only 검토 상태로 유지하고 fresh source 읽기·capability·명시 대상 재확인 뒤 새 context로만 편집을 연다. source가 달라졌으면 기존 draft를 새 기준으로 조용히 이식하지 않는다. 정확한 source-aware 재개 intent가 필요한 경우, Sb에서 최소 durable source 근거와 명시 재적용 계약까지 닫기 전에는 그 경로를 완료로 표시하지 않는다.

현재 P는 raw 제목 A와 같은 명시 override를 지운다. source 기본값이 B로 바뀐 뒤 명시 A를 선택하는 입력은 raw-normalizer로 보존할 수 없다. **Sa에서는 해당 field 편집을 capability로 막는 기존 설계를 유지**한다. 이를 E2의 값 복사나 journal 필드 추가로 우회하지 않는다. Sb의 source-aware normalize·C metadata strict 계약을 승인/검증한 다음에만 해당 편집을 연다. 확인된 empty source 또는 안전한 raw-only 편집부터 연결하며 Quick/다른 source 비의존 기능을 영구 차단하는 새 정책은 만들지 않는다.

## 7. 기획·UX 연결 순서

기존 K1-B의 clean 즉시 닫기, dirty/invalid의 버리기 확인, 저장 중·복구 중 잠금, 정확 부모/자식 복귀, 실제 browser Back 경계를 그대로 사용한다. 새 모드 폼을 달았다는 이유로 scope를 페이지 하나로 합치거나 child에서 바로 저장하지 않는다.

1. context 발급 성공 시 기존 개인 기준·원문 근거·PoC override를 구분해 표시한다. sourceTitle가 없으면 ‘원문 복원’ 문구를 만들지 않는다.
2. Item title/memo/date mode 변경은 staged 입력이다. 부모에 반영했는지, root 저장이 끝났는지를 별개 상태로 알린다.
3. 같은 날짜 fixed-date pin과 inherit는 다른 intent다. 원래 값과 같다고 radio 선택을 자동 바꾸지 않는다. memo 부재/빈 문자열·CRLF도 exact 보존한다.
4. repeated unscheduled가 기존 validator에서 막히면 사유를 보여 주고 입력을 유지한다. 실행 날짜·반복 anchor/회차/완료 의미를 변경해 통과시키지 않는다.
5. source 또는 checkpoint stale 안내는 해당 편집에 붙인다. 재확인 전 기존 draft를 지우거나 새 대상의 제목을 얹지 않는다. 실패는 persistent 지역 안내/재시도/취소 경로를 유지한다.
6. 390×844·375×812·844×390·1024×768·1440×900에서 owner·invalid/실패 문구·마지막 입력·저장/취소/재시도를 같은 시점에 검사한다. 화면 깨짐을 후속 꾸미기 단계로 넘기지 않는다.

## 8. 예정 검증 원장 — 미실행

아래 E01–E20은 **설계한 검사 묶음 20개**다. 아직 생성/등록/실행한 테스트 수가 아니다. 실제 구현자는 독립 test 수·입력 matrix·5 viewport 반복·재실행을 구분해 보고한다.

| ID | 입력·여정 | 완료 조건 |
| --- | --- | --- |
| E01 | legacy/Quick absent discriminator, 새 Plan discriminator, unknown/잘못된 kind 조합 | 기존 문법 유지, unknown fallback 0, 새 Item root save 0 |
| E02 | P context genuine/clone/JSON/fake와 C current/Undo/legacy collision | genuine+전체 provenance만 context 발급. 선택 legacy/Undo 생략 우회 0 |
| E03 | 새 draft extra key/foreign ref/missing Item, getter/prototype, 빈 title/fixed date | 안전 검사 먼저, getter 실행 0. invalid 입력 보존과 불법 구조 차단 구별 |
| E04 | 같은 제목 다른 Flow/copy/Item, local id와 source flowId 혼합 | full tuple/ref 정확 적용, 제목/index fallback 0 |
| E05 | 부모 title+A 반영 후 B dirty/cancel, A 재열기/버림, root discard | 미반영 child만 폐기, 부모/다른 Item/최근 staged 값 보존, 쓰기 0 |
| E06 | 부모 revision 변화·A→B→A·다른 parent object·same-ms session 문자열 | stale child apply 0, current owner 이외 저장 0 |
| E07 | whitespace/CRLF/빈 memo/부재, raw와 같은 text, 같은 날짜 fixed pin | exact intent/owner 유지, trim/null 제조 0, 정규화 no-op은 attempt/journal 0 |
| E08 | source 없는 첫 제목 변경 → 저장 → Undo → decode/reload | managed raw/원문/실행/Step/다른 copy 불변, revision +1, 전체 before Undo 한 벌 |
| E09 | v1 legacy journal 및 v1 checkpoint journal prepared/confirmed | 기존 decoder·명시 복구 유지, 새 draft 자동 승격 0 |
| E10 | 새 v2 journal baseline/draft/tuple/unknown field·candidate 바꿔치기. 이웃 overlay 주입/다른 Flow/같은 제목 다른 copy의 **유효 C 후보** 포함 | before→exact Flow·baseline→제출 draft→C 단일 transition의 재도출 candidateRaw exact 불일치 시 차단·쓰기 0. validCheckpoint만으로 채택 금지 |
| E11 | null-before seed/legacy/current old Undo/unknown presence → 준비 journal → 복구 | 첫 메모리 checkpoint 재구성 정확, 보관 draft 새 context/session으로만 재개 |
| E12 | prepare·target·readback·confirm·cleanup 각각 throw-before/after/wrong read | 기존 phase/owner 의미 유지, write/rollback/journal 별도 계수 |
| E13 | prepared reload target before/candidate/foreign/unreadable | 읽기 자동쓰기 0, 소유 복원만 허용, foreign 보존 |
| E14 | confirmed cleanup 실패/reload/중복 cleanup/source drift | target rollback 0, durable 성공과 정리/재검증 구별, 이중 성공 0 |
| E15 | 실패 → 같은 입력 retry → 입력 변경/close → 옛 retry/outcome | 정확 attempt/submission만 적용, late callback 저장/close 0 |
| E16 | source key only change/관찰 ABA/read-error/unknown/corrupt at open/apply/prepare/retry | draft 유지·stale 표시·candidate 0, failure를 empty로 바꾸지 않음 |
| E17 | source 변경을 prepared 후/target 전/confirmed 전 주입 | 경계별 source guard, 이미 쓴 journal은 API 수에 포함, source rollback 0 |
| E18 | source-aware A(raw)→B(source)→명시 A와 추가 source membership | Sa capability 차단 유지; Sb 승인 전 성공 처리 0, 개인 section/order 여전히 미지원 |
| E19 | dirty 확인 Tab/Escape/native cancel/browser Back, root/child/locked | 한 owner만 닫기, 부모 이중 닫힘 0, 정확 focus/selection/scroll·배경/Undo 잠금 |
| E20 | 5 viewport 정상/invalid/실패/recovery + 모든 전후 운영 sentinel | 가로 넘침·page/console error·핵심 행동 가림 0, 허용 prefix 밖 set/remove/clear 0 |

E01–E15는 새 E2 단위·메모리 fault fixture가 우선이다. E16–E18은 실제 reader 계약과 C의 새 Plan action을 함께 연결한 뒤 검사한다. E19–E20은 제품 UI가 승인된 단계에서 실제 Chromium 조작으로 실행하며, `←` 클릭을 browser Back으로 표현하거나 합성 이벤트를 실제 IME/실기기 터치로 표현하지 않는다.

기존 [plan-item-session.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs), C/P/D 회귀, K1-B 브라우저 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k1b-dirty-close.spec.ts`), K2C 이동·Undo, 기본 `/my` exact-query/네 origin 경계를 영향 범위에 맞춰 재실행한다. 과거 QA의 259나 16/16을 이 새 계약의 실행 수로 옮기지 않는다.

## 9. 다음 구현 gate와 이 문서의 종료 범위

순서는 **C 최종 순수 연결 확인 → 새 E2 draft/child branch → version2 journal round-trip/복구 → source guard·capability → 삭제 owner 검증 → UI 연결/5 viewport**다. source reader Sa/Sb가 아직 닫히지 않은 조합은 이유를 남기고 그 조합의 편집만 제한한다. 삭제 planner가 새 private capture/overlay를 처리하지 못하는데 UI부터 저장하도록 열지 않는다.

이 문서는 새 파일 하나만 소유한다. 제품 구현·신규 test 작성·새 모델/브라우저 실행 0, 실제 Android/iOS/IME/보조기술 NOT_RUN, 관찰 사용자 0명이다. commit/push/PR/Preview/Production은 진행하지 않았다. 문서 링크/정적 문서 검사는 별도 수행하되 이를 제품 검증으로 세지 않는다.
