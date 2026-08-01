# P35 consumer / input 인벤토리

**최종 점검:** 2026-08-01

**범위:** P35 프로덕션 모바일 수렴 P0

**판정 기준:** 코드 연결 상태와 확인된 테스트 근거를 구분한다.

Flow 단위 기준은 다음과 같다.

```text
EffectiveFlowSnapshot
  = FrozenSourceContentVersion
  + CurrentPersonalOverlay
  + CurrentExecutionOverlay
```

이 문서의 상태 용어는 다음과 같다.

- **wired:** consumer가 `EffectiveFlowSnapshot` 또는 그 `EffectiveFlowResult`
  행을 직접 사용한다.
- **adapter:** 기존 controller/저장 계약은 유지하면서 공통 행동·복구 계약을
  사용한다.
- **sidecar:** Flow 결과 자체가 아니라 반복 회차 등 인스턴스 실행 상태를
  committed 행에 덧붙인다.
- **open:** 완료 주장을 하지 않는 경계다.

## Layer와 저장 소유권

### Source layer

`FlowBundle`이 안정적인 Flow/Item 식별자, source text, section, item detail,
meal slot/recipe, source URL, risk와 source version을 소유한다. runtime bundle은
[seed-flows.ts](../../../lib/flow/seed-flows.ts),
[source-backed-my-flow.ts](../../../lib/flow/source-backed-my-flow.ts), canonical
registry/merge 경로에서 들어온다. 로컬 작성 bundle은
`flow_builder_mvp_bundles_v11`에 보관한다.

resolver는 bundle을 수정하지 않고 Flow ID, 순서가 있는 source Item ID,
`source_modified_at ?? updated_at`을 source identity로 사용한다. Map의
`flow:map:saved:${mapId}`와 `flow:map:persistence:${mapId}`는 source metadata와
`personalCopy`를 함께 보존하는 합성 bridge record다.

### Personal layer

| 소유자 | 물리 저장 또는 working input | 의미 |
| --- | --- | --- |
| 저장한 Flow header | `flow:saved:${slug}` | 개인 이름, `memo`를 포함한 결과 유형, 날짜 의도/기준일, 요일, routine 정의 |
| 날짜 호환 bridge | `flow:${slug}:anchorDate` | 기존/현재 기준일 의도 |
| Item 값 | `flow:my-flow:item-drafts` | Item 이름, 메모, 설명, schedule overlay |
| Item 날짜 | `flow:my-flow:date-overrides` | 고정 날짜 또는 명시적 unscheduled |
| 포함/순서 | `flow_builder_mvp_item_state_${slug}` | `personalExcluded`, `personalOrder`; legacy 실행 필드와 물리적으로 함께 있음 |
| 구조 복사본 | `flow:my-flow:structural-overlay:${savedCopyId}` | 사용자 생성/삭제 Item, 포함, 순서 |
| source-backed Map 복사본 | 두 Map bridge record의 `personalCopy` | 이름, 포함 Step, Step 이름/날짜/메모 |
| lifecycle | `flow:my-flow:lifecycle:v1` | archive/restore; source 삭제가 아님 |

공개 편집 전 값은 React working state다. Flow 이름, 날짜 의도,
`publicItemPersonalizations`, 포함/순서가 working snapshot에 들어간다. Apply 후
같은 값을 persisted snapshot, save transaction과 export가 사용한다.

내 Flow는 저장 레코드, Map personal copy, structural overlay, Item draft, 날짜
override, routine 정의를 `personalOverlayIdentity`에 포함하고, 확정된
`resolvedRows`를 snapshot 입력으로 넘긴다.

### Execution layer

| 소유자 | 물리 저장 | 의미 |
| --- | --- | --- |
| Item 완료 | `flow_builder_mvp_checks_${slug}` | Flow 단위 완료 상태 |
| legacy Item 실행 | `flow_builder_mvp_item_state_${slug}` | `skipped`, legacy 실행 note |
| 하위 checklist 완료 | `flow:my-flow:step-item-checks` | Item 상세 내부 행 |
| 반복 회차 실행 | `flow:my-flow:occurrence-execution` | occurrence 상태 |
| 전문 실행 상태 | `flow_builder_mvp_workbench_${slug}`, `flow_builder_mvp_comparison_${slug}`, `flow_builder_mvp_reactions_${slug}` | workbench, 비교, 반응 기록 |
| 회고와 비공개 note | `flow:my-flow:completion-feedback:${slug}`, `flow:my-flow:execution-notes:${slug}` | 완료 회고, source correction, 비공개 실행 note |
| 과거 실행 | `flow:run-registry:${slug}` | active/completed run snapshot과 재사용 기록 |

내 Flow snapshot의 execution identity에는 checks, 하위 checks, occurrence,
workbench, comparison, reaction, execution note, completion feedback, completed
run version이 포함된다. occurrence 행 자체는 특정 회차에만 존재하므로 Flow
단위 committed 행을 바꾸지 않고 sidecar projection으로 처리한다.

## Consumer와 adapter 연결 상태

| Consumer | 현재 입력 | resolver / adapter | 상태와 경계 |
| --- | --- | --- | --- |
| 공개 preview `/f/[slug]` | merged `FlowBundle`; working 이름/날짜/Item/포함/순서; checks | `buildEffectiveFlowSnapshot`의 illustrative/committed result | **wired.** 화면의 결과 이름, 개수, 날짜, 행과 export plan이 같은 snapshot에서 나온다. |
| 저장 transaction | 같은 공개 working input; routine 설정 | persisted snapshot, `savedFlowRecordInput`, Item personalization promotion | **wired.** 저장 header와 Item draft/date 호환 저장소에 같은 확정 결과를 쓴다. |
| 저장 결과와 `/f` 재진입 | saved record, anchor, canonical Item draft/date store | receipt의 `EffectiveFlowResult`; reload 후 persisted snapshot 재구성 | **wired.** receipt는 실제 저장 결과와 내 Flow 인계만 보여주며 export를 소유하지 않는다. |
| 내 Flow `/my` | source/Map bundle; saved record; structural overlay; Item draft/date; checks/occurrences/runs | `resolvedRows`를 포함한 `buildEffectiveFlowSnapshot`; `MySavedFlow.effectiveSnapshot`; shape-aware workspace | **wired.** 저장한 `selectedArtifactMode`를 shape의 우선 기준으로 삼아 `memo`도 보존한다. Flow 행·제외 행·버전 identity를 committed snapshot으로 통일하며 occurrence는 sidecar다. |
| Item 상세 | My Flow 행; Item memo facade; date/completion/sub-check 상태 | `getMyFlowEffectiveResultRow`, `buildItemMemoFacade`, 단일 completion owner | **wired + sidecar.** 이름·메모·날짜·기본 완료는 snapshot 행을 읽고, 하위 check/occurrence만 인스턴스 상태를 덧붙인다. |
| 공개 text/XLSX/ICS export | 공개 committed `EffectiveFlowResult`; 형식별 실행 입력 | [export.ts](../../../lib/flow/export.ts)의 effective result 경로 | **wired.** 일반/meal 결과가 같은 행을 사용한다. routine ICS의 표현 불가 필드는 export plan과 UI에 명시한다. |
| 저장한 Flow export | committed snapshot 행; instance schedule/status sidecar; source reference | `getMyFlowScopeExportItems`가 `flow.effectiveSnapshot.committed.rows`를 순회 | **wired + sidecar.** 이름·메모·날짜·완료는 effective 행을 우선하고 recurrence occurrence만 별도 확장한다. |
| 공개 Flow Map | publish package; Step selection; setup anchor; risk/hold | `buildFlowMapActionContract`; 기존 Map save controller; `FlowBottomSheet` atomic editor | **adapter.** 저장/선택/save-all/hold와 호환 record를 보존한다. Map 결과 행·개수는 단일 snapshot이 아니다. |
| 저장한 Flow Map 복구 | saved Map bridge record; canonical copy 상태; conflict 수 | `buildFlowMapRecoveryContract` | **adapter.** 실제 `needs_choice`/conflict일 때만 복구를 노출한다. |

## 주요 연결 근거

- [AppClient.tsx](../../../components/flow/AppClient.tsx)의 공개 Flow는 working,
  applied, explicit-undated, commit 시점에 snapshot을 만들고 save/export에
  committed result를 전달한다.
- 같은 파일의 `MySavedFlow` 구성은 개인 overlay와 실행 identity를 포함한
  snapshot을 소유하고, snapshot 행으로 `rows`, `excludedRows`, 결과 유형을
  재구성한다.
- Item 상세는 `effectiveResultRow`의 title, memo, schedule, completed를 우선한다.
- 저장한 Flow export는 `flow.effectiveSnapshot.committed.rows`를 순회한다.
- [storage.ts](../../../lib/flow/storage.ts)와
  [my-flow-shape-aware-workspace.ts](../../../lib/flow/my-flow-shape-aware-workspace.ts)는
  저장한 `memo` artifact mode를 실행 없는 memo workspace로 보존한다.
- [my-flow-step-export.ts](../../../lib/flow/my-flow-step-export.ts)는 사용자 생성
  구조 일정의 time/duration을 portable export로 전달하고,
  [my-flow-local-ia.ts](../../../lib/flow/my-flow-local-ia.ts)는 반복 회차 deep link의
  정확한 occurrence identity를 보존한다.
- [SourceBackedFlowMapPage.tsx](../../../components/flow/SourceBackedFlowMapPage.tsx)와
  [SourceBackedFlowMapSaveButton.tsx](../../../components/flow/SourceBackedFlowMapSaveButton.tsx)는
  Map action contract를 사용한다. 후자는 원자적 전체 높이 편집과 기존 Map
  persistence record를 함께 보존한다.

## 남은 경계

1. **Map 단일 snapshot:** Map은 여러 Flow와 선택 controller를 합성하므로
   Flow 단위 resolver의 직접 consumer가 아니다. 단일화 전에는 selection,
   save-all, hold, personal copy, 기존 bridge record 무손실 테스트가 필요하다.
2. **혼합 물리 저장소:** `itemStates`, Item draft, Map bridge record에는 서로
   다른 논리 layer 필드가 함께 있다. 현재 구현은 소유 필드만 골라 identity에
   넣으며 파괴적 migration을 하지 않는다.
3. **인스턴스 실행 sidecar:** recurrence occurrence와 하위 checklist는 안정적인
   Flow Item 결과를 복제하지 않고 인스턴스 상태로 남긴다. 이를 별도 결과
   resolver라고 부르지 않는다.

전체 Playwright 57개 spec, 413/413은 최종 source와 production build에서
통과했다. 이는 위 경계 세 가지를 제거한다는 뜻이 아니라 현재 adapter와
sidecar 계약이 전체 회귀에서 유지됐다는 근거다.

## P0 수용 상태

| P0 | 현재 근거 | 상태 |
| --- | --- | --- |
| P0-01 Effective snapshot | 공개 + 내 Flow + Item + 저장/공개 export 연결, layer identity, 대표 shape unit | **Flow 단위 완료 / Map adapter 완료, 단일 snapshot은 비차단 후속** |
| P0-02 날짜 연속성 | 세 날짜 의도 unit/E2E, 저장·receipt·내 Flow·export 연결 | **목표 검증 통과** |
| P0-03 공개 수정/export | 이름·설명·날짜·포함·순서 payload 및 round-trip | **목표 검증 통과** |
| P0-04 원자적 편집 | Apply/Cancel, Back/Escape/close/focus, 종류 변경 E2E | **목표 검증 통과** |
| P0-05 shell/receipt | 기본 행동 1개, 한 단계 branch, receipt export 0개, `/f` escape | **목표 검증 통과** |
| P0-06 내 Flow/완료 | 실행형 first-entry, 접힌 계획, 상세 단일 완료, memo형 synthetic execution 0 | **목표 검증 통과** |
| P0-07 메모 | lossless facade, `memo` mode round-trip, backup/restore/privacy fixture, UI E2E | **목표 검증 통과** |
| P0-08 Map/원문/복구 | action/recovery unit, atomic editor와 storage E2E, 조건부 risk/source | **adapter 목표 검증 통과** |

## 현재 정량 근거

- `npm.cmd run test:p35-p0`: **40/40 통과**
- `npm.cmd test`: **597/597 통과**
- 전체 Playwright: **57개 spec, 413/413 통과**
- 관찰 사용자 evidence: **0** — 의도적으로 범위 밖
