# K3-B B1 — standalone 개인 계획 무손실 adapter 준비 gate

2026-09-05. **제품 수정 0. 신규 characterization 18/18 PASS. B1 새 adapter는 미구현이다.** [K3-B §4.2–4.3](./k3b-design.md)의 nullable 날짜·기존 제목·single Undo·session/journal 연결을 현재 코드로 확인했다. 여기서 PASS는 기존 동작과 보존 경계를 재현했다는 뜻이며, 새 편집 계약을 충족했다는 뜻이 아니다.

## 1. 먼저 고정할 사실

| 현재 저장 사실 | 읽기·새 편집의 안전한 해석 | 하면 안 되는 일 |
|---|---|---|
| task.planDate 부재 | 부재 자체 보존. 기존 sourceDate 또는 기존 fallback을 읽되 owner를 따로 표시 | 폼 열기/제목만 저장하면서 null/date를 채움 |
| planDate가 sourceDate와 같은 문자열 | 기존 저장 효과가 그 날짜임. 명시 새 fixed_date도 같은 날짜를 그대로 pin | 같다는 이유로 inherit로 정리 |
| planDate:null | 기존 계획 날짜 없음 효과 보존 | 필드를 제거해 source date가 다시 나타남 |
| sourceTitle 부재 | 현재 제목은 ‘기존 저장 기준’. 실제 원문 제목이었다는 근거는 없음 | 현재 title을 sourceTitle에 써서 원문 owner를 제조 |
| memo 부재 / 빈 문자열 / 문자열 | presence를 보존하고 imported-personal 기준과 명시 지우기를 구별 | source.description과 같은 문자열이라고 삭제 |
| task.date가 sourceDate와 같음 | 기존 실행 위치만 알 수 있음. 상속인지 같은 날짜로 이동했는지는 모름 | 실행 inherit를 추정하거나 Plan 저장으로 실행일 재작성 |
| unknown JSON 필드 | 원래 값·array 순서·부재 보존 | 새 allowlist를 이유로 기존 값 삭제 |

React의 기준은 [Plan draft](../../../lib/flow/personal-workspace-poc-plan-editor.ts)의 text inherit/override, schedule inherit/fixed_date/unscheduled와 [PersonalPlanOverlay](../../../lib/flow/personal-workspace-poc-contract.ts)의 optional title/memo/schedule/sectionTitles/orderedItemRefs다. 메모는 [B0-M 수정 근거](./k3b-memo-owner-qa.md)를 따른다. [P2-C 정본](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md)이 허용한 stable 개인 section만 편집하며, 16 source 속성 편집을 개인 Plan 16필드 편집으로 확대하지 않는다.

원문·운영 schema나 원본 저장 key를 바꾸지 않는다. 별도 Plan 저장 key·독립 Undo·새 writer는 추가하지 않는다. 이전 데이터가 불명확하다는 이유로 자동 이관하지 않는다.

## 2. 현재 코드의 실제 연결점

| 소유 모듈·함수 | 현행 동작 | 새 adapter 전에 필요한 연결 |
|---|---|---|
| [model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js) taskPlanDate L902 | own(planDate) 우선, 없으면 sourceDate/date | presence-aware baseline reader. 기존 효과 보존 |
| model.validate L1775 | 일반 unknown을 보존. 비반복 task의 planDate 자체는 strict 검사하지 않음 | 새 metadata는 별도 strict 검사. invalid 옛 field는 새 편집 기준으로 조용히 채택하지 않음 |
| model.apply commit-personal-plan L2113 | 모든 Item planDate 기록, sourceTitle 부재를 현재 title로 캡처 | 새 계약용 순수 Plan transition 분기 필요. 기존 legacy 복구 경로와 혼용 금지 |
| [app.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js) state L212, newPlanDraft L2105 | source candidate를 읽기 합성한 state에서 string/null 폼 작성 | source/기존 기준/개인 overlay를 분리한 view. 원본 state에 역쓰기 금지 |
| app.saveEditor L1853 | C.transitionCheckpoint → E2.beginSave → durable journal | 같은 target·attempt·single Undo로 새 Plan candidate 전달 |
| [C](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js) stateCheck/transitionCheckpoint | unknown 보존, timelineContextV1만 strict 검사 | optional Plan metadata strict 검사 + 알려진 분기 변경만 허용 |
| C.projectWith/projectGroups | raw checkpoint task.date/time, tasks 배열 순서 사용 | 개인 Plan view/source composition과 실행 owner 의미가 다르지 않게 연결. caller가 임의 날짜 배열을 주입하는 우회는 금지 |
| model.composeSourceCandidateState L2887 | 기존 title와 sourceTitle 차이로 개인 제목 유지, sourceDate·step title 읽기 갱신 | 새 개인 overlay를 source 합성 뒤 적용. raw source/Step membership 수정 없음 |
| [E2](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js) validDraft/createChildSession/applyChild | string title/memo와 nullable date만 검사·복사 | 새 draft discriminator·strict validation·child scope copy를 함께 연결 |
| E2.decodeJournal/loadRecovery/recoverDurableAttempt | 기존 draft를 journal에 보존. prepared는 명시 복원, confirmed는 target rollback 금지 | 옛 journal 먼저 복구. 새 draft를 옛 형식으로 가장하지 않음 |
| [삭제 planner D](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.js) STATE_KEYS/inspectState | 알 수 없는 state 키가 하나라도 있으면 delete-scope-unproven | 새 metadata의 exact Flow/Item owner 삭제를 구현·검증한 뒤 UI 연결 |

model/taskPlanDate와 app/planDate의 같은 nullable 로직을 각각 새 해석으로 바꾸지 않는다. 하나의 adapter reader를 소비해야 한다. C의 timeline archive와 date별 order는 이 작업의 Plan 순서로 대체하지 않는다.

## 3. 최소 데이터 후보 — 확정 schema 아님

권고 위치는 **같은 workspace-v2의 state 안 optional `personalPlanContextV1`**이다. 새 key나 workspace-v3로 확장하지 않는다. 아래는 구현 전 검토용 이름/shape다.

```ts
personalPlanContextV1?: {
  version: 1;
  contract: 'flowme-standalone-personal-plan-context-v1';
  entries: Record<FlowRef, {
    binding: {
      localFlowId: string;
      flowRef: string;
      savedCopyId: string;
      sourceFlowId: string;
      items: Array<{ localTaskId: string; itemRef: string; itemId: string }>;
    };
    // Narrow, exact presence-aware capture of the old managed Plan fields.
    // Not a second full checkpoint and not newly asserted source authority.
    legacyPlanFields: {
      flow: { title: string; sourceTitle?: string };
      items: Array<{
        id: string; ref: string; title: string;
        memo?: string; planDate?: string | null;
        sourceTitle?: string; sourceDate?: string | null;
      }>;
    };
    overlay: PersonalWorkspacePocPersonalPlanOverlay;
  }>;
}
```

`overlay`는 React의 기존 의미를 재사용한다. inherited/imported-personal baseline은 **이미 저장된 개인 효과**와 실제 원문 근거를 구별한다. 기존 저장 효과를 baseline으로 쓸 때의 inherit는 그 기존 기준으로 돌아가는 것이며, 그것을 원문 복원으로 표시하지 않는다. 새 handoff 등 source 근거를 확인한 기준만 ‘원본 따르기’로 표시할 수 있다. 이 구분은 기존 imported-personal owner의 적용이며 과거 사용자 intent를 추정하는 정책이 아니다.

old task/flow Plan 필드는 계속 그대로 남기고 새 overlay가 effective view를 만든다. 좁은 legacyPlanFields는 old HTML이 같은 key의 title/memo/planDate를 뒤에서 변경하는 것을 감지하는 비교 근거다. 새 Plan 기록 후 raw managed field가 capture와 다르면 새 값으로 덮거나 overlay로 숨기지 않고 stale로 차단한다. 반면 완료·폴더·실행 날짜·시간의 정상 변경은 이 Plan capture의 비교 대상에 넣지 않는다. source 후보는 별도 검증된 store를 읽기 합성하므로 raw source baseline을 재작성하지 않는다.

이 capture도 개인 텍스트를 보유한다. 따라서 삭제 planner에 exact owner 정리가 없으면 채택하지 않는다. 전체 checkpointRaw 또는 legacyBaseRaw를 metadata에 다시 복사하는 안은 용량과 영구 삭제 검증 범위를 불필요하게 키우므로 권고하지 않는다. 기존 legacyBaseRaw와 timelineContextV1.legacySnapshot은 현재 계약 그대로 보존한다.

### 반드시 먼저 확인할 decode 경계

1. 새 필드 부재인 기존 payload는 읽기·open·cancel·no-op 동안 그대로이며 write 0이다. 첫 **명시 실제 변경**의 candidate에만 필요한 Flow entry를 만든다. Undo는 metadata가 없던 이전 state까지 그대로 보존한다.
2. 일반 old unknown은 삭제하지 않는다. 새 reserved 이름이 원래 old legacyBaseRaw/legacySnapshot에 존재하면 collision으로 차단한다. active old checkpoint의 같은 이름도 shape가 불명확하면 차단하며, 문자열/버전만 보고 채택하지 않는다.
3. recognized metadata는 정확 contract/version/필드 목록/identity tuple/full Item membership/baseline presence/overlay shape를 전부 검사한다. unknown version·unknown record·foreign ref·duplicate ref·blank title·불가능한 fixed date는 fail-closed다.
4. 기존 unknown 값이 우연히 완전한 새 계약과 동일한 구조를 가지는 경우를 출처 인증으로 구별할 수 있다고 주장하지 않는다. nonce/hash만으로 임의 JSON을 ‘우리 writer 산출물’이라고 믿는 안도 쓰지 않는다. 알려진 schema와 현재 exact binding 검증만 허용한다. 일반 충돌 payload를 새 계약으로 승격하는 migration은 없다.
5. 유효하지 않은 기존 비반복 planDate가 현재 C에서 통과하더라도 새 날짜 계약에 묵시적으로 넣지 않는다. 해당 Flow의 새 편집은 이유를 표시하고 잠그며 원래 raw는 보존한다. 기존 미지 값을 null로 고치는 fallback은 금지한다.
6. unversioned 임시 mode를 기존 task 객체에 넣거나 새 `scheduleMode`를 Plan metadata에 슬쩍 섞지 않는다. 이 후보는 개인 Plan overlay이며 실행 mode는 다음 절의 별도 gate다.

## 4. API·원자적 연결 후보

새 제품 모듈은 아직 만들지 않았다. 향후 `FlowPocPersonalPlan` 순수 adapter가 아래 책임을 갖는 안이다. 실제 함수명은 구현 배정 때 고정한다.

| 후보 API | 입출력·책임 | 금지 |
|---|---|---|
| inspectPlanContext(checkpoint, flowRef, sourceCandidateStore) | 현재 C/store 검증 → source/기존 기준/overlay·capability·exact guard 또는 blocked | 제목/index fallback으로 identity 생성, storage 접근 |
| createPlanDraft(context) | React text/schedule mode와 exact identities, 알려진 section만 | source/실행 값을 editable 값으로 혼합 |
| normalizePlanDraft(context,draft) | 기존 React normalize 의미. memo owner·같은 날짜 fixed pin 유지 | source-equal date를 inherit로 축약 |
| planCheckpointTransition(checkpoint,guard,draft,now) | 같은 v2 state candidate + 이전 전체 state Undo. no-op은 원 객체·changed:false | 기존 legacy commit-personal-plan을 호출해 모든 옛 nullable 필드를 채움 |
| projectPlanView(checkpoint,sourceCandidateStore) | source candidate 검증·합성 후 개인 Plan overlay 읽기 projection | task.date 임의 상속 추정, 저장 raw/Step membership 변경 |

E2는 순수 transition candidate를 기존 `beginSave/writeDurableAttempt/finishSave/clearConfirmedRecovery`에 전달한다. 일반 action journal로 Plan session을 가장하거나 별도 save key를 추가하지 않는다. candidate.legacyBaseRaw guard, old journal 우선, foreign target/journal 보존을 유지한다.

새 draft는 `draftContract` 같은 명시 discriminator와 엄격한 mode 구조가 필요하다. E2의 새 draft branch·child baseline 검사·applyChild copy·journal decoder를 같은 단계에서 연결한다. **기존 version 1 journal은 기존 string/null decoder로만 복구**하고, 복구된 옛 draft를 자동으로 새 intent로 승격하지 않는다. 새 draft journal의 version/discriminator는 옛 E2가 미지원으로 차단하게 설계한다. same key 안 새 journal version을 쓰더라도 fixed target/journal pair와 기존 prepared/confirmed 의미는 바꾸지 않는다. Quick은 기존 contract를 그대로 둔다.

### 날짜 동등성의 남은 경계

현재 React는 execution placement가 없으면 effective Plan 날짜를 따른다. old standalone은 source 초기화와 명시 실행 이동이 모두 task.date에 기록돼 그 차이를 복원할 수 없다. 따라서 old payload의 실행 위치는 `기존 실행 날짜 유지`로 보존하고, Plan 변경이 곧 실행일 이동이라고 안내하지 않는다(G05·G11).

새 handoff/명시 실행 inherit에서만 React와 같은 연동을 보장하려면 검증 가능한 실행 owner 표현이 필요하다. 이번 후보의 Plan metadata에 새 실행 mode를 추가하는 것은 보류한다. 별도 작은 연결 gate에서 기존 React ExecutionPlacement 의미를 재사용할 수 있는지 확인해야 한다. 날짜가 우연히 같다는 판정으로 이를 대신하지 않는다. 이 gate가 남은 상태에서는 전체 날짜 동등성이 완료됐다고 보고하지 않는다.

## 5. 실제 준비 시험 — 18개, 제품 수용 검사와 구별

[신규 fixture](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-lossless-gate.fixture.cjs)와 [신규 test](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-lossless-gate.test.cjs)를 작성했다. 가짜 새 adapter 구현으로 자신을 검증하지 않고 현재 M/C/E2/D와 실제 source-candidate APIs를 호출했다.

| 등록 ID | 실제 판정 |
|---|---|
| G01 | legacy raw 문자열 exact, state/undo archive·unknown JSON/array 순서 보존 |
| G02 | planDate 부재/같은 날짜/null 구별, 4 기간 읽기 전후 입력 동일 |
| G03 | **미지원 재현:** 옛 제목-only 저장이 미수정 Item planDate 생성 |
| G04 | 일반 완료·single Undo가 unknown·timeline archive를 보존. 기존 Undo timestamp 예외만 반영 |
| G05 | 같은 source/실행 date로 inherit 추정 불가. Plan 날짜만 바꿔도 실행 날짜/시간/완료 보존 |
| G06 | **gate 필요:** 옛 비반복 planDate invalid 문자열이 M/C에서 통과 |
| G07 | **gate 필요:** 새 reserved 이름/version999가 현재 unknown으로 통과·보존됨 |
| G08 | **미지원 재현:** child 새 schedule mode가 부모에 전달되지 않음. 기존 memo·부모 다른 Item은 보존 |
| G09 | **gate 필요:** 새 unknown mode가 기존 draft validator에서 무검증 |
| G10 | **미지원 재현:** 원래 없던 sourceTitle이 옛 commit에서 현재 title로 만들어짐 |
| G11 | 현재 C 기간은 Plan 날짜가 아닌 기존 실행일을 읽음 |
| G12 | 실제 source update 후 source 날짜/제목 갱신, 개인 제목/메모/계획일/실행일과 입력 원본 보존 |
| G13 | 실제 E2가 만든 prepared journal → 읽기-only reload 검사 → 명시 before 복원 → 원래 draft 새 session 복구 |
| G14 | confirmed cleanup은 target rollback 없음, 추가 target write 0 |
| G15 | old journal 존재 시 v2 save mutation 0, old bytes 보존 |
| G16 | 새 title mode 객체를 옛 action에 넘기면 거절·원본 보존 |
| G17 | clean session에서 candidate/attempt 생성 없이 no-op |
| G18 | **gate 필요:** 새 state metadata는 현재 영구 삭제를 delete-scope-unproven으로 안전 차단 |

실행: `node --test`에 신규 파일 하나를 명시했다. 첫 실행 TAP (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-lossless-gate-first-20260905.tap`)은 **18/18 PASS, skip/cancel/todo 0**다. G03·06·07·08·09·10·18은 시험 안에 `GATE` 진단을 남겼다. 이 일곱 관찰을 지원 완료로 세지 않는다. 향후 adapter 구현 시 그 해당 동작을 새 API의 거절/무손실/전달 기대값으로 추가 시험해야 한다.

G13·G14·G15의 storage는 실제 브라우저 localStorage가 아닌 fault-capable 메모리 fixture다. target/journal만 mutation을 허용하고 old key/운영 sentinel 불변을 검사했다. target write와 journal prepare/confirm/cleanup 호출을 하나로 뭉쳐 ‘쓰기 1회’라고 보고하지 않는다. 이 준비 단계는 브라우저·실기기 검사나 운영 데이터 실측이 아니다.

## 6. 안전한 소분할과 다음 수용 조건

1. **B1-G 순수 계약:** 위 candidate shape·baseline owner·collision·old/new draft 구분 확정. old raw와 첫 Undo/unknown 보존, same-date fixed, 빈 memo, foreign/duplicate/stale, title-only delta 시험을 먼저 RED로 등록한다. 새 source/실행 정책이 필요하면 그 선택만 별도 gate로 남긴다.
2. **B1-M/C:** adapter + C strict validator/Plan transition/read projection. 같은 envelope 안 single Undo와 기존 일반 action 보존을 검증한다. 이 시점은 UI 연결 전이다.
3. **B1-E/D:** 새 E2 draft·child·prepared/confirmed recovery 및 D owner-aware metadata 정리. old journal/외부 drift/Quota/readback/rollback/retry/late callback/삭제 후 private footprint 0. 이 gate까지 통과하기 전에 새 metadata를 저장하는 UI를 열지 않는다.
4. **B1-UI:** Plan/Item 세 mode·변경 요약·오류/취소/저장/복구를 실제 adapter에 연결. source/개인/실행 owner 문구를 각각 표시한다. 다음 B2에서 검증된 개인 section/전체 Plan 순서와 Result/date rank의 같은 reader 연결을 끝낸다.

각 단계의 UX 검증에는 빈 제목·빈 fixed date·메모 CRLF/긴 token·0변경·dirty 닫기·오류/retry·Escape·키보드 초점 복귀를 넣는다. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 마지막 필드/저장/취소/retry/복구 버튼 전체 rect·hit target·가로 넘침·page/console error를 함께 확인한다. 화면 검사를 마지막 꾸미기 단계로 미루지 않는다.

B2 section capability와 전체 Plan 순서는 저장 이름만 예약해 자동 허용하지 않는다. 안정적인 section ref가 입증되지 않은 origin·derived label은 읽기 전용이다. date TimelineOrder/Step membership/완료·occurrence는 별도 owner로 유지한다. 원문 장소/반복/시간대/Plan-level 메모/anchor/포함 owner는 이번 B1에서 새 편집 필드로 만들지 않는다.

## 7. 범위·동결 증거

이번 소유 파일은 신규 fixture/test와 이 문서뿐이다. M/C/E2/D/app/React/기존 tests/생성 HTML/공용 QA는 수정하지 않았다. 읽은 제품 SHA256은 다음과 같다.

| 제품 | SHA256 |
|---|---|
| model.js | `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67` |
| workspace-checkpoint.js | `4CE28DF1EA2FE23C3676A4F5555DDB2A12C2F1F39A235D3411A698BE82AAE3E0` |
| plan-item-session.js | `FD249B599E122E84DF614C89771EE5A31FCF06B01585BC5093810F43387F6AA7` |

위 세 제품 SHA는 준비 시험 뒤 다시 확인해 동일했다. 신규 fixture SHA는 `D7D4B901B4360C50223C12418F852F5DD8AE6E7EB690BE1D650D6117FEAE8EF1`, test는 `08A564274BB94E7304E541D4F4A86D830B5D426EA4ED0F42E01D69E250D90B1A`, TAP은 `67F978672ED5A4E4708FFEE25B3CAACF55AC3A27D1C726A5AA4EEBA3A69DE12B`다. 두 신규 CJS 파일의 `node --check` PASS, `npm.cmd run docs:check` PASS(required files 16, local links 5,259). scoped closeout을 실행했으며 권고 명령과 실제 실행을 구별했다.

새 browser/build/전체 npm test는 이 하위 작업에서 미실행이다. 실제 Android Chrome/iOS Safari/가상 키보드/보조기술 NOT_RUN, 관찰 사용자 0명. commit·push·PR·Preview·Production 없음. 직접 원본 대화 재조회는 없으며 K3-B에 연결된 현재 코드·계약과 이번 pure 실행 근거만 사용했다.
