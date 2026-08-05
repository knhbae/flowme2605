# P0-01 결과 계약·소유권·fixture closeout

**상태:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 조상으로 둔 local working tree
**실행일:** 2026-08-04 KST
**변경 경계:** contract·fixture·tests·closeout 문서만
**Publish:** commit/push/PR/merge/Preview/Production 모두 미실행
**실제 관찰 사용자:** `0명`

## 1. 결과

이 단계는 화면을 바꾸지 않고 다음 공통 기반을 고정했다.

- Calendar/Checklist/Sheet/Memo가 공유할 field loss 규칙
- canonical Item ID, snapshot layer version, scope, output count, held/unavailable 이유를 담는 manifest
- lifecycle × capability × scope별 단일 primary action owner
- dated/undated/mixed/memo/routine/Map/rich metadata/legacy/missing-base stable fixture
- public preview, saved detail, Map preview/save, export artifact가 같은 Item ID와 count를 비교하는 contract test
- legacy/missing-base raw storage를 자동 rewrite하지 않는 read-only compatibility 분류

핵심 구현은 [effective-flow-contract.ts](../../../lib/flow/effective-flow-contract.ts), fixture 정본은 [effective-flow-contract.fixtures.ts](../../../lib/flow/effective-flow-contract.fixtures.ts)다. 기존 runtime UI는 아직 이 manifest를 읽지 않으며, 연결은 strict order의 P0-02 이후 단계가 소유한다.

## 2. 실제 상태·storage consumer inventory

| 계층 | 실제 owner | storage/version | 현재 소비 surface | P0-01 결론 |
|---|---|---|---|---|
| source/base | `FlowBundle`, seed 및 bundle loader | `flow_builder_mvp_bundles_v11`; 이전 v10~v3 compatibility | 공개 상세, `/my`, Map publish package, export generator | 개인 수정이나 완료 상태로 덮어쓰지 않는다. |
| public session draft | `publicItemPersonalizations`, public adjustment/editor React state | save 전 storage 없음 | `/f/[slug]` preview/editor | 저장 전 session state이며 saved personal copy가 아니다. |
| saved Flow reference | `SavedFlowRecord` | `flow:saved:<slug>`; record 자체 schemaVersion 없음 | entry router, `/my`, 공개 저장 상태 | 제목·artifact·date intent 참조이며 Item 본문 전체를 소유하지 않는다. |
| personal Item overlay | `StoredMyFlowItemDraft`, date override | `flow:my-flow:item-drafts`, `flow:my-flow:date-overrides` | saved detail, saved Item editor, saved export | authoring 값이지만 현재 일부 실행 필드와 같은 record family에 있다. |
| structural overlay | personal structural overlay | `flow:my-flow:structural-overlay:<savedCopyId>`, schema v1 | user-created/reordered/tombstoned Item | strict schema read의 재사용 가능한 선례다. |
| Map personal copy | saved Map snapshot + persistence | `flow:map:saved:<mapId>`, `flow:map:persistence:<mapId>`; persistence v1 | Map save, `/my` source-backed plan | snapshot과 persistence가 순차 write되며 원자적 transaction은 아니다. |
| effective snapshot | `buildEffectiveFlowSnapshot` | 별도 storage 없음; source/personal/execution fingerprint | 일반 public preview/save, saved `/my` detail | 현재 `committed` result 하나에 completion이 포함되지만 layer identity는 분리돼 있다. |
| execution overlay | checks, step checks, occurrences, notes, run/history, workbench | `flow_builder_mvp_checks_*`, `flow:my-flow:*`, `flow:run-registry:*` 등 | Today, Item detail, completion, saved export | authoring membership과 완료 상태를 같은 동작으로 쓰지 않는다. |
| projection | `buildFlowExperienceProjection`, resolved rows adapter | 메모리 | public/saved 일반 Flow | canonical `row.id`가 UI identity, `sourceItemId`는 source metadata join용이다. |
| public artifact | `lib/flow/export.ts` family | Blob/clipboard, artifact storage 없음 | public quick/export | `EffectiveFlowResult`와 원본 bundle을 다시 join한다. |
| saved artifact | `buildMyFlowMultiStepIcs`, personal structural list artifacts | Blob/clipboard, artifact storage 없음 | `/my` export | public generator와 별도 family다. P0-07/P0-09에서 manifest 연결이 필요하다. |
| save confirmation | saved record·URL handoff에서 재계산 | 전용 receipt storage 없음 | 공개 receipt frame, `/my?savedFlow|savedMap` | transient save banner 전용 type이 아직 없다. |
| export receipt | `FlowExportResultReceipt` + component state | storage 없음 | `FlowExportPanel` | 현재는 transient result이며 persistent receipt는 미구현이다. |
| Flow Map preview | publish package `childFlows[].steps` 직접 flat-map | 선택 state는 SaveButton 내부 | `/flow-maps/[map]` | effective snapshot을 우회해 7↔8 불일치를 만든다. P0-02가 연결한다. |

### Consumer identity 정본

- 일반 canonical Item: `effectiveSnapshot.committed.rows[].id`
- source metadata join: `row.sourceItemId`
- export scope key: `<flowSlug>::<stableItemId>`
- Map canonical step key: `<flowSlug>::<stepId>`
- count: 동일 canonical ID 집합에서 `eligible / held / unavailable / excluded / output`을 각각 계산
- artifact/receipt: snapshot layer version, hash, scope, canonical/requested/output IDs와 count를 immutable copy

## 3. Action ownership matrix

[FLOW_ACTION_OWNERSHIP_MATRIX](../../../lib/flow/effective-flow-contract.ts#L644)는 동일한 `lifecycle × capability × scope` 조합에 primary owner가 두 개 생기면 실패한다.

| Lifecycle | Capability / scope | Primary owner | Persistence |
|---|---|---|---|
| public preview | 결과 보기 / Flow | public result surface | 없음 |
| public draft | Plan 편집 / Flow | shared Plan editor | session |
| public draft | Item 편집 / Item | shared Item editor | session |
| public draft | 계획 저장 / Flow | public save action | saved plan |
| public quick result | local result / Flow·selected | public quick confirmation | session only |
| saved plan | 결과 보기 / Flow | saved plan detail | saved plan |
| saved plan | Plan·Item 편집 | shared Plan·Item editor | saved plan |
| saved plan | Today lens / Flow | saved plan library | 파생 view만 |
| execution | Item 완료 / Item | Item detail | saved plan execution overlay |
| saved transfer | 결과 생성 / Flow·selected·Item | saved transfer confirmation | persistent receipt |
| artifact result | receipt 확인 / result | persistent export receipt | persistent receipt |
| artifact history | replay / result | export history | persistent receipt |

검증은 [flow-map-action-contract.test.ts](../../../lib/flow/flow-map-action-contract.test.ts#L210)에서 중복 owner 실패, Item completion 단일 owner, public quick session-only, saved transfer 3개 scope를 고정한다.

## 4. Format loss schema

[EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA](../../../lib/flow/effective-flow-contract.ts#L317)는 `preserved / transformed / omitted / held / unavailable` 다섯 처리를 모두 명시한다.

| Field | Calendar/ICS | Checklist | Sheet | Memo |
|---|---|---|---|---|
| canonical Item ID | manifest 보존, UID로 변환 | manifest 보존 | manifest 보존 | manifest 보존 |
| title | SUMMARY로 변환 | 보존 | 보존 | 보존 |
| description | DESCRIPTION으로 변환 | 보존 | 보존 | 보존 |
| date | 있으면 보존, 없으면 held | 있으면 보존 | 있으면 보존 | 있으면 보존 |
| timezone | timed TZID 보존, all-day는 unavailable | timed 문장으로 변환 | timed 열로 변환 | timed 문장으로 변환 |
| repeat | RRULE/series로 변환 | 사용자 언어로 변환 | 사용자 언어/열로 변환 | 사용자 언어로 변환 |
| order | 파일 순서로 변환, 외부 표시 순서 미보장 | 보존 | 보존 | 보존 |
| inclusion | event membership으로 변환 | 결과 membership으로 변환 | 결과 membership으로 변환 | 결과 membership으로 변환 |
| completion criterion | DESCRIPTION 독립 라벨로 변환 | **원문 보존** | 원문 보존 | 원문 보존 |
| personal/execution memo | DESCRIPTION 독립 라벨로 변환 | 각각 보존 | 각각 보존 | 각각 보존 |
| execution completion | VEVENT STATUS로 변환 | checkbox로 변환 | 상태값 보존 | checkbox로 변환 |
| warning/resource/source | DESCRIPTION/URL로 변환 | 명시 라벨로 보존 | 전용 열/셀로 보존 | 명시 라벨로 보존 |
| internal layer version | payload에서는 omitted, manifest에서 보존 | 동일 | 동일 | 동일 |
| artifact version/scope/receipt | manifest·receipt에서 보존 | 동일 | 동일 | 동일 |

날짜 없는 executable Item은 Calendar `held`, warning/resource/reference/record 역할은 Calendar `unavailable`이다. 어떤 경우에도 가짜 날짜나 VEVENT를 만들지 않는다. 반복 routine의 canonical Item N개가 VEVENT 1개 series가 되는 것은 누락이 아니라 `transformed`이며 output count 1로 기록한다.

## 5. Stable fixture와 expected projection

| Fixture | Canonical ID/count | Expected 결과 |
|---|---:|---|
| all-dated | `p0-contract-item-a..c`, 3 | Calendar eligible 3, held 0, output 3 |
| all-undated | 동일 3 | Calendar eligible 0, held 3, output 0 |
| mixed | 동일 3 | Calendar eligible A 1, held B/C 2, output 1 |
| memo-first | `job-change-risk-check` 실제 rows | Memo가 natural primary이며 모든 included ID를 사용 |
| repeated routine | `washer-tub-clean-monthly` 실제 rows | canonical rows는 recurrence series 1개로 transformed |
| Map save_all | 중1 수학 8개 namespaced key | selected=applied=preview=saved=export 8 |
| Map choose_child | child A/B 중 A 1개 | selected=applied=preview=saved=export A 1 |
| Map review_hold | 2개 | held 2, applied/preview/saved/export 0 |
| Map 7↔8 | 중1 수학 canonical 8, selected 7 | legacy preview 8을 재현하되 expected preview=saved=export 7 |
| rich metadata | action/warning/resource 3 | Memo 3, Checklist action 1, Calendar action 1; warning/resource unavailable 이유 보존 |
| legacy saved copy | schema-less saved Flow | `legacy_unversioned`, raw bytes 보존 |
| missing base | base 없는 saved Flow | `held_missing_base`, raw bytes 보존 |
| unsupported/malformed | schema v2 / invalid JSON | `held_unsupported_schema` / `held_malformed`, raw bytes 보존 |

Fixture 정본은 [effective-flow-contract.fixtures.ts](../../../lib/flow/effective-flow-contract.fixtures.ts), consumer 비교는 [effective-flow-snapshot.test.ts](../../../lib/flow/effective-flow-snapshot.test.ts#L588)다.

## 6. Foundation answers

### FND-S10-COMMIT

**현재:** saved Item은 Item editor의 `변경 저장`에서 즉시 item-level commit된다. 상위 Plan transaction에 포함되지 않는다. memo, title/date, Map snapshot/persistence가 서로 다른 key에 순차 write되어 원자적이지 않다.

**후속 계약:** P0-05/P0-06의 flag-on 경로는 Item Apply가 parent personal draft만 갱신하고 최종 Plan Save가 한 번 영속화해야 한다. 기존 즉시-write handler는 flag-off rollback 경로로 유지하며 기존 bytes를 migration하지 않는다.

### FND-RECEIPT

**현재 save confirmation:** 전용 type/storage가 없다. 공개 화면은 saved record 존재 및 `savedFlowAt`, `/my`는 URL handoff에서 현재 rows를 재계산한다. 따라서 목표인 선택 계획 상세의 1회 transient banner와 다르다.

**현재 export receipt:** `FlowExportResultReceipt`가 scope/destination/status/output/omitted/filename/message만 담고 component-local state에 머문다. Item IDs, snapshot hash/version, timestamp, retry identity, persistent storage가 없다.

**후속 계약:** save banner는 session/transient, export receipt는 별도 versioned persistent record다. 두 타입과 storage를 합치지 않는다.

### FND-LEGACY

- bundle: key version v11, compatibility v10~v3
- saved Flow: schemaVersion 없는 legacy record
- saved Map snapshot: Map content `version`만 있고 storage schemaVersion 없음
- Map persistence: type상 schemaVersion 1이나 일부 loader가 version을 엄격히 확인하지 않음
- personal lifecycle: envelope v1
- run registry: schemaVersion 1 strict read
- structural overlay: schemaVersion 1 strict read
- canonical origin/reconciliation metadata: v1 key/envelope
- missing base: bytes는 남지만 `/my` 진행 목록에서 조용히 사라질 수 있음

P0-01 compatibility contract는 `supported / legacy_unversioned / held_missing_base / held_unsupported_schema / held_malformed`로 분류하고 자동 rewrite하지 않는다. 실제 recovery surface 연결은 P1-04 범위다.

### FND-ROLLBACK

현재 검증된 feature off는 `/my?experiment=off`의 cross-Flow Todo rollback뿐이다. 데이터 복구는 allowlisted local backup/restore가 담당하지만 Round 2 전체 flag가 아니다.

후속 단계는 slice별 독립 flag를 사용하고 off일 때 새 reader/migration/writer가 실행되지 않게 해야 한다. byte-preservation 검사는 `flow:*`뿐 아니라 backup allowlist가 포함하는 `flow_builder_mvp_*`, saved Map, overlays, run, canonical key 전체 raw string을 비교한다.

### FND-CONSUMERS

- public 일반 Flow: `buildEffectiveFlowSnapshot` → illustrative/committed projection
- public save: 새 snapshot의 `savedFlowRecordInput`; Item personalization은 별도 overlay로 승격
- public export: `lib/flow/export.ts` + committed result
- saved detail: 여러 storage를 resolved rows로 합성 → `buildEffectiveFlowSnapshot`
- saved export: committed rows → personal structural artifact builders
- Flow Map: publish package steps를 직접 읽어 effective snapshot을 우회

따라서 P0-02는 Map selected/applied/preview/save가 하나의 effective manifest를 사용하게 하고, P0-07/P0-09는 public/saved export generator families가 같은 manifest IDs/count/hash를 읽게 해야 한다.

## 7. 변경 파일과 소유권

### P0-01 소유

- `lib/flow/effective-flow-contract.ts`
- `lib/flow/effective-flow-contract.fixtures.ts`
- `lib/flow/effective-flow-snapshot.test.ts`
- `lib/flow/flow-map-action-contract.test.ts`
- 이 closeout 및 active spec ledger/checklist의 P0-01 행

### 시작 전 dirty·unowned

- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/STATUS.md`
- `docs/specs/README.md`
- 기존 `docs/content-audit/2026-08-03-*` 미추적 경로
- 이 active spec 폴더의 P0-01 외 기존 기획 본문

기존 dirty path는 삭제·정리·stage하지 않았다.

## 8. 검증

| 명령 | 결과 | 증명 범위 |
|---|---|---|
| six targeted contract tests | PASS · 62/62 | loss schema, fixtures, consumer IDs/count, Map modes, legacy read-only |
| `npm.cmd run test:p35-p0` | PASS · 49/49 | P35 P0 snapshot/export/entry/memo/Map 계약 |
| `npm.cmd test` | PASS · pretest 105/105 + test 597/597 | 전체 unit/workflow 회귀 |
| `npm.cmd run build` | PASS · Next 15.5.21, 18/18 static pages | compile, type, production build |
| `npm.cmd run docs:check` | PASS | skill sync·문서 링크/형식 |
| `git diff --check` | PASS | whitespace/error 없음 |

P0-01은 runtime UI/component/route/save writer를 변경하지 않았다. browser QA는 contract-only 티켓이라 필수가 아니며 실행하지 않았다.

## 9. 회귀·rollback·게시 상태

- UI/route/save/`/my`/copy diff: 없음
- source/base mutation: 없음
- storage migration/rewrite: 없음
- rollback: 새 contract·fixture·test를 제거하면 기존 runtime이 그대로 동작
- Local edit: 있음
- Commit/Push/PR/CI/Merge/Preview/Production: 모두 없음
- 자동 검증: 완료
- 브라우저 검증: 이 티켓에서는 미실행
- 실제 사용자 관찰: `0명`

## 10. 다음 gate

P0-01은 PASS다. 다음 strict-order 단계는 **P0-02 Flow Map selected/applied/preview/save parity**이며, 현재 확인된 7↔8 원인을 runtime Map consumer에 연결하는 것만 소유한다. legacy migration, 3칸 grid 감산, `/my` IA, copy 변경은 섞지 않는다.
