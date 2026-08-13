# FlowMe Text Authoring P1-E 원문 후보 갱신 개발 목표

- 승인 ID: `TA-P1-E-SOURCE-UPDATE-20260813-01`
- track/status: `P1-E-SOURCE-UPDATE / APPROVED_FOR_LOCAL_IMPLEMENTATION`
- 기준 commit: `0e02a83664b5c8fb22b6d8619ab7fb2366784d0b`
- target checkout: `D:\flowme2605\flow-text-authoring-p1-e-source-update-20260813`
- target branch: `codex/text-authoring-p1-e-source-update-20260813`
- upstream: `NONE`
- 현재 상태: `LOCAL_INTERNAL_QA_PASS / LOCAL_COMMIT_INCLUDED(authorized)`
- host adapter: `LOCAL_SYNTHETIC_HOST_ADAPTER`
- 게시 경계: `LOCAL_ONLY`
- 외부 side effect: `0`
- 관찰 사용자 세션: `0`

## 0. 승인 근거와 복원 경계

- approved by: FlowMe repository owner / current user
- approved at: `2026-08-13 13:37:57 KST`
- 현재 사용자 승인 문구:

  > TA-P1-E-SOURCE-UPDATE-20260813-01 승인.
  > 직전 답변의 APPROVAL_MANIFEST 전체를 그대로 승인하며,
  > P1-C 완료 커밋 0e02a83664b5c8fb22b6d8619ab7fb2366784d0b에서
  > 새 worktree/branch 생성, P1-E 구현, fresh QA와 target local commit까지 허용한다.
  > LOCAL_SYNTHETIC_HOST_ADAPTER를 사용하고 명시된 제외 범위,
  > LOCAL_ONLY, external side effect 0, observed-user 0 경계를 유지한다.

- session evidence:
  `C:\Users\HUBERT\.codex\sessions\2026\08\13\rollout-2026-08-13T13-37-57-019ff969-a0e6-7aa3-90f2-87f028767846.jsonl:13985`

승인 manifest는 위 사용자 메시지 직전 답변의 exact manifest다. 8월 13일
아카이브 패키지는 이전 계약의 provenance로만 남기며 이 track을 위해 복원하지
않는다. 현재 `flow-mvp` working copy에 canonical manifest 경로가 없으므로 이 goal과
결과 ledger가 현재 target의 지속 실행 기록이다. canonical 파일 복원은 별도 scope다.

## 1. 목표

host가 stable identity와 exact raw bytes를 갖춘 완전한 versioned source candidate를
제공했을 때만 제작자가 `이전 원문 / 내 작업 / 새 원문`을 비교하고,
모든 변경에 대한 명시 선택을 한 번의 atomic transaction으로 적용하게
한다. candidate를 보거나 선택하는 동안에는 WorkingSource·canonical·projection을
바꾸지 않고, 적용 실패·stale·hash 불일치에서 현재 작업과 포커스를 보존한다.

이 track의 완료 경계는 local implementation, fresh QA와 target local commit까지다.
push, PR, merge, deploy, P35, 외부 fetch/write와 관찰 사용자 검증은 포함하지
않는다.

## 2. 사용자 여정

1. 사용자가 원문에서 Flow를 만들고 필요한 값을 직접 고친다.
2. local synthetic host가 완전한 versioned candidate envelope를 전달한다.
3. 결과에 `새 원문이 있어요`를 표시하되 자동 적용하지 않는다.
4. 사용자가 비교를 열면 변경별로 `내 작업 유지 / 새 원문 선택 / 나중에`를
   판단한다.
5. 하나라도 unresolved면 apply를 막는다.
6. 적용 직전에 identity·version·base·hash를 다시 검증한다.
7. 성공하면 WorkingSource+canonical+projection을 한 번에 바꾸고 dirty로
   표시하며 `SourceApplyReceipt`를 남긴다.
8. 적용은 durable save가 아니다. 사용자가 따로 `초안 저장`을 해야 저장된다.
9. `되돌리기` 한 번으로 source+canonical+projection을 모두 적용 전으로
   복원한다.

## 3. current → target → 제외 범위

| 영역             | P1-C baseline current                        | P1-E target                                                                    | 이번에 하지 않음                       |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| candidate origin | 제작 원문·기존 staged update 모델            | 완전한 envelope를 `LOCAL_SYNTHETIC_HOST_ADAPTER`로만 주입                      | URL fetch·auth·crawl·poll/watch        |
| staging          | legacy source update가 document state에 존재 | candidate·decision을 별도 staged state에 보존하고 WorkingSource write `0`      | background apply·auto merge            |
| compare          | 이전/새/내 값을 비교                         | identity/version/hash/base를 내부 재검증하고 변경별 explicit resolution을 받음 | title 유사도 auto-match                |
| transaction      | operation-level source update                | 모든 해결을 한 atomic apply로 source+canonical+projection에 반영               | partial commit                         |
| receipt          | operation revision 기록                      | apply attempt/result를 `SourceApplyReceipt`로 구분                             | P1-B service `CreatorRevision`         |
| save             | 명시 초안 저장                               | apply와 durable save/history를 분리                                            | apply 즉시 저장·publish                |
| recovery         | operation undo·draft 재진입                  | failure·undo·reload·re-entry에 candidate·decision·source/focus 보존            | public/personal/export 역방향 mutation |

로컬 host ingress의 실행 계약은 다음으로 고정한다.

- 독립 gate: `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE=1`
- browser event: `flowme:text-authoring-source-candidate`
- synthetic detail: `{ localSynthetic: { rawText, externalVersion, receivedAt?, providedBy?, sourceOwnerClaim? }, matches?, selectedChangeId?, scrollTop?, creatorPermission?, injectFailure? }`
- complete envelope detail도 허용하되 같은 validation을 통과해야 한다.
- session storage: `flowme:text-authoring:source-candidate-session:v1:<documentId>`
- `creatorPermission`과 `injectFailure`는 local acceptance seam이며 외부 권한이나 provider 성공을 가장하지 않는다.

## 4. candidate envelope 계약

structured compare를 열려면 다음이 모두 있어야 한다.

- stable source identity
- non-empty external version
- exact raw bytes
- content hash
- `collectedAt` / `receivedAt`
- source owner / actor
- base snapshot identity와 base content hash

누락·비어 있음·형식 오류·raw bytes와 content hash 불일치는 structured stage/apply
`0`이다. 일반 URL이나 제목 유사성으로 과거 snapshot·stable identity·version을 만들지
않는다.

## 5. 상태·소유 계약

| 상태              | 사용자에게 보이는 의미              | write 경계                             |
| ----------------- | ----------------------------------- | -------------------------------------- |
| `external-none`   | 새 원문 없음                        | `0`                                    |
| `update-detected` | 완전한 candidate 도착               | WorkingSource `0`                      |
| `comparing`       | 변경과 선택지 확인 중               | WorkingSource `0`                      |
| `conflict`        | 내 작업과 새 원문이 다름            | WorkingSource `0`                      |
| `deferred`        | 나중에 판단                         | candidate·decision 보존, source `0`    |
| `stale-candidate` | base/version이 현재와 다름          | apply `0`                              |
| `applying`        | 한 transaction 검증/적용 중         | partial write `0`                      |
| `applied`         | atomic apply 성공, explicit save 전 | dirty, durable save `0`                |
| `apply-failed`    | 검증·적용 실패                      | source/canonical/projection/focus 보존 |
| `undo-available`  | apply 전 상태로 1-step 복원 가능    | external/public write `0`              |

소유 분리:

- host: complete candidate envelope 제공
- authoring runtime: validation, staging, atomic apply, undo
- creator: 변경별 선택과 explicit save
- P0 storage: coherent source/parser/canonical/projection pair + save receipt
- 이 track 밖: append-only service history, publication, PersonalPlan, ExportSnapshot

## 6. atomic apply 계약

1. candidate stage 전·중 WorkingSource write는 `0`이다.
2. 변경별 decision은 `keep-mine / use-incoming / defer`를 명시적으로 소유한다.
3. unresolved/deferred가 하나라도 있으면 apply는 disabled다.
4. apply 직전 candidate identity/version/base/content hash를 다시 검증한다.
5. 해결된 전체 decision set을 한 transaction으로 적용한다.
6. 성공하면 WorkingSource, canonical, four projections를 함께 갱신하고 dirty로
   표시한다.
7. `SourceApplyReceipt`는 candidate/base/result identity·hash, decision set, actor,
   attempted/applied at, outcome과 failure reason을 기록한다.
8. 실패·stale·hash mismatch는 success receipt를 남기지 않고 current source/focus를
   보존한다.
9. 동일 candidate/decision transaction retry는 duplicate apply/receipt를 만들지 않는다.
10. undo 1회는 source+canonical+projection을 적용 전으로 복원하고 candidate·failure
    evidence를 조용히 잃지 않는다.

## 7. UX·접근성 계약

- P0/P1-C 2-pane과 고정 결과 순서를 유지한다.
- banner는 candidate가 complete할 때만 보이고 `원문 변경 확인`과 `나중에`만
  제공한다.
- compare는 desktop dialog/drawer, `<900` staged mobile sheet로 보이되 상시 세 번째
  pane을 만들지 않는다.
- 내 작업·새 원문·이전 원문을 사용자 언어로 구분하고 hash·canonical·receipt
  같은 내부어는 상세에만 두거나 숨긴다.
- apply는 모든 결정 전에 disabled를 색 외의 문구·상태로 알린다.
- dialog/sheet는 focus trap, Escape=`나중에`, trigger focus return을 지원한다.
- apply failure/stale/hash mismatch 후 다음 행동을 한 개만 명확히 제시한다.
- 44px target, logical tab order, 200% reflow, reduced motion과 live-region 과다 반복
  `0`을 지켜야 한다.

## 8. synthetic fixture·권리 경계

| fixture                  | 목적                        | 경계                                  |
| ------------------------ | --------------------------- | ------------------------------------- |
| complete v1→v2 candidate | happy/conflict/atomic apply | 새로 작성한 합성 원문                 |
| incomplete envelope      | stage/apply `0`             | 누락 field만 합성                     |
| stale base/version       | stale fail-close            | local in-memory identity만 사용       |
| hash mismatch            | bytes/hash 무결성           | tampered synthetic bytes              |
| injected apply failure   | rollback·retry·idempotency  | production side effect 없는 test seam |

OSSU exact commit pair은 public permalink·source-shape 근거로만 사용한다. 외부 원문
전체를 fixture에 복제하지 않고, history가 없는 일반 URL에 과거 snapshot을 발명하지
않는다.

## 9. acceptance

| ID        | 유형        | 완료 조건                                                                                |
| --------- | ----------- | ---------------------------------------------------------------------------------------- |
| `P1E-H01` | happy       | complete envelope의 모든 decision 후 source+canonical+projection atomic apply, receipt 1 |
| `P1E-H02` | happy       | apply 후 explicit save/reload에 coherent pair 보존, service CreatorRevision 증가 `0`     |
| `P1E-F01` | failure     | incomplete/hash mismatch candidate structured stage/apply `0`                            |
| `P1E-F02` | failure     | unresolved/deferred가 있으면 apply disabled, partial commit `0`                          |
| `P1E-F03` | failure     | stale·injected apply failure에 source/canonical/projection/focus 보존                    |
| `P1E-P01` | permission  | compare·later·denied actor가 WorkingSource·public/personal/export를 바꾸지 않음          |
| `P1E-I01` | idempotency | 동일 apply/retry에 transaction·receipt·side effect 중복 `0`                              |
| `P1E-R01` | recovery    | undo 1회로 source+canonical+projection 복원, candidate/failure evidence 보존             |
| `P1E-R02` | re-entry    | deferred/failed/applied-unsaved 상태와 source/focus를 reload·breakpoint에 보존           |
| `P1E-G01` | gate        | gate off에 candidate UI/mutation `0`, P0 manual paste/compare·draft 유지                 |

browser acceptance는 `tests/e2e/text-authoring-p1-source-update.spec.ts`의 9개
시나리오로 위 ID를 묶어 검증했다. production build에서 P1-E 단독 `9/9`, 수정 후
targeted `2/2`, P1-E와 기존 Text Authoring 결합 회귀 `75/75`가 통과했다. 상세 명령과
실패 발견·수정 이력은 [결과 ledger](../../content-audit/2026-08-13-flowme-text-authoring-p1-e-source-update-results/README.md)에 남긴다.

추가 불변 검증:

- old public version, PersonalPlan, ExportSnapshot hash 불변
- source update 적용 전·후 durable service history 증가 `0`
- Calendar/Todo/Sheet/TXT 동일 revision 투영
- P1-C raw/long-table 보존과 P0 bounded recurrence parity
- external request/write, credential, provider receipt `0`

## 10. 구현·검증 순서

1. repo/Git/ownership 기준을 다시 확인한다.
2. 기존 staged source-update 작동을 characterization test로 고정한다.
3. pure envelope·hash·identity·decision·transaction·receipt·gate 계약을 구현한다.
4. failure injection, stale, idempotency, rollback, undo를 pure test한다.
5. complete candidate만 기존 Text Authoring 2-pane의 compare UX에 연결한다.
6. user-facing copy에서 내부 상태·hash·receipt 용어를 제거한다.
7. targeted → shared Text Authoring → full test/build → browser/a11y로 확대한다.
8. subtraction·scope audit 후 target local commit 하나로 고정한다.

fresh browser matrix:

- `320 / 360 / 390 / 899 / 900 / 1024 / 1280 / 1440`
- keyboard-only, dialog/sheet trap·Escape·origin focus return
- 44px target, 200% text/reflow, reduced motion
- active/disabled/error를 색 외의 방식으로 전달
- source/result focus·dirty·candidate state 재진입
- console/page/runtime error, failed external request, U+FFFD `0`

## 11. rollback·중단

P1-E 독립 gate가 off면 host candidate stage/apply UI와 mutation을 제거하고 P0 manual
paste/compare로 돌아간다. candidate raw·decision·failure receipt·현재 WorkingSource는 조용히
삭제하지 않는다.

다음이 하나라도 발생하면 apply를 kill하고 P0 fallback으로 돌아간다.

- incomplete/tampered/stale candidate apply 1건
- stage/compare 중 WorkingSource write 1건
- partial source/canonical/projection write 1건
- source/private/unsaved bytes loss 1건
- permission bypass 1건
- duplicate transaction/receipt/side effect 1건
- source에 없는 정보 생성 1건
- old public/personal/export mutation 1건
- P1-B history·P2·provider·publication 의존이 필요한 경우

## 12. 명시적 제외

- URL fetch, credential, auth, crawl, watch, polling, background refresh
- title 유사성 auto-match, auto merge/apply, two-way sync
- P1-A 검색·필터, P1-B service revision/history/trash, P1-F export history
- P1-C 장문·표 범위 확장, P1-D advanced recurrence, P1-G linked Flow
- P2 experience/reviewer/publication/AI, feed·ranking·collaboration
- external Calendar/Todo/Excel/P35 write, production data·network side effect
- push, PR, merge, deploy

## 13. 완료 보고 상태 분리

결과 ledger는 다음을 각각 기록한다.

- local edits
- local commit
- push
- PR
- merge
- deploy
- P35/external side effect
- observed-user sessions

`LOCAL_INTERNAL_QA_PASS`는 local automated/browser QA만 뜻하며 release·실제 사용성
검증을 뜻하지 않는다.

## 14. 완료 근거

- 승인 baseline은 `0e02a83664b5c8fb22b6d8619ab7fb2366784d0b`이며 P1-E 변경 inventory는
  승인된 `14`개 path다.
- focused contract/UI `44/44`에는 source-update domain `9/9`가 포함되며, shared Text
  Authoring `276/276`, TypeScript no-emit, full `npm.cmd test`, production build
  `19` pages가 통과했다.
- 최종 production-build browser 회귀는 `75/75`를 통과했고 `P1E-R02`의 deferred
  reload, 8개 width, 200% reflow, reduced motion을 포함한다.
- local hash는 FNV-1a 32-bit 기반의 결정적 consistency guard일 뿐 암호학적 무결성이나
  보안 보증으로 사용하지 않는다.
- P1-A/B/D/F/G와 P2는 수정하지 않았고 push·PR·merge·deploy·P35·external side
  effect·observed-user session은 모두 `0`이다.
