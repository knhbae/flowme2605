# K2B-C3 — standalone 전체 호출 전환 실행 설계

2026-09-05. **현재 코드 조사와 실행 설계만 완료. 이 문서 작업의 제품 변경·제품 시험·브라우저 실행은 0건이다.** 소유 파일은 이 문서 하나다. C1/C2 순수·저장 시험 결과는 주 작업자의 QA에 따로 기록하며 아래 예정 시험과 합산하지 않는다.

## 1. 전환 단위와 조사 기준

기간 화면만 새 reader로 바꾸지 않는다. 부팅, 일반 저장, Undo, Plan/Quick 편집, handoff, 초기화, 오류 중 배경 호출, 결과 rank를 같은 checkpoint 권위로 전환한 다음 두 조작 HTML을 함께 생성한다. 기존 domain model의 전역 `M.VERSION`, `M.TODAY`, `M.STORAGE_KEY`를 덮어쓰는 방법은 쓰지 않는다.

근거는 [K2-B 설계](./k2b-design.md), [checkpoint 계약](./k2b-checkpoint-contract.md), [일반 action journal 계약](./k2b-action-journal-addendum.md), [명시 영구 삭제 설계](./k2b-permanent-delete-design.md), 현재 C1/C2 코드다. v4.1의 날짜별 순서, 개발1의 개인 Plan/Item 편집, 개발2의 원문·명시 개인 저장 경계를 함께 보존한다. 새 wizard·전역 테마·운영 schema는 범위 밖이다.

아래 `A`는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/`다. 행 번호는 이 조사본 기준이며 수정 후 함수 이름으로 다시 대조한다.

| 조사본 | SHA-256 |
| --- | --- |
| `A/app.js` | `870EC65294D792B1C62334DBF953CBCA5C6868D2160405E6047C6B09E49B9EAF` |
| `A/workspace-checkpoint.js` | `4CE28DF1EA2FE23C3676A4F5555DDB2A12C2F1F39A235D3411A698BE82AAE3E0` |
| `A/workspace-storage.js` — 명시 삭제 분기 추가본 | `8EFB1CDAEFA2033FE8C1599EC40E86259610AA36A989DBAF4A23F490F0F8ABDF` |
| `A/plan-item-session.js` | `FD249B599E122E84DF614C89771EE5A31FCF06B01585BC5093810F43387F6AA7` |

C1, 현재 S와 E 모듈 본문, S의 기존 54개 등록 시험 본문을 읽었다. 명시 삭제 분기의 새 전용 검증은 별도 gate이므로 기존 54개 결과로 대신하지 않는다.

### 1.1 이름과 데이터 소유자

| 기호 | 실제 값/모듈 | 맡는 일 |
| --- | --- | --- |
| `M` | `window.FlowMeIntegratedPoc` | 기존 domain·source·draft·creator·result 계약. 전역 교체 금지 |
| `W` | `S.loadWorkspace(storage)`가 발급한 packet | 현재 raw와 checkpoint를 묶은 app의 저장 권위. 함수가 아니라 불변 packet |
| `C` | `window.FlowPocWorkspaceCheckpoint` | 검증·legacy 투영·그룹·transition·Undo. 저장 0 |
| `S` | `window.FlowPocWorkspaceStorage` | core 읽기, 일반 action/handoff/reset/삭제 준비, durable 저장·명시 복구 |
| `E0` | `window.FlowPocPlanItemSession` 기본 legacy-v1 | 이전 v1 편집 journal의 읽기·명시 복구만 |
| `E2` | `E0.createForWorkspace('checkpoint-v2')` | 새 Plan/Quick 세션과 v2 편집 journal |

`W`를 spread/JSON clone한 객체는 저장 권위로 사용할 수 없다. S가 발급한 packet/preparation/receipt와 E의 session/attempt/recovery는 각각의 runtime에 귀속된다. `envelope` 변수를 유지하더라도 정상 화면에서만 `W.checkpoint`를 가리키는 읽기 alias로 취급하며 독립 mutable 권위로 두지 않는다.

`state()`의 source candidate 적용 결과는 **화면용 일회성 projection**이다. 이 결과를 `C.transitionCheckpoint` 후보나 `S.prepareWrite`에 넣지 않는다. 저장할 기준은 `W.checkpoint`, source effective 값은 기존 source 저장소가 소유한다.

## 2. 부팅: seed를 오류 대체 화면으로 쓰지 않기

| 현재 위치 (`A/app.js`) | 확인한 문제/역할 | 전환 |
| --- | --- | --- |
| 36–54 초기 변수 | `M.loadEnvelope`, workspace/draft read-error에서 storage 전체를 memory로 교체 | 저장 객체 획득 → `W=S.loadWorkspace(storage)` → core gate 판정 → 독립 기능 loader 순서 |
| 152 `acquireStorage` | 네 key의 getItem 예외도 API 접근 불가와 같은 catch로 처리 | `window.localStorage` 객체 접근 자체의 예외만 volatile 가능. 얻은 객체의 특정 key 오류는 각 loader 결과로 유지 |
| 45,52,53 / 55–62 | draft/creator/source loader, 오류 때 빈 authoring/library/state로 보일 수 있음 | `loadedDraft.status`, creator/source status를 기능 권위로 보존. 오류를 `empty`로 바꾸지 않음 |
| 192 `state()` | `envelope.state`와 source store를 합성 | W가 ready일 때만 호출. core 실패에서 null checkpoint 대신 seed를 주입하지 않음 |
| 2879 `render`, 2895 `renderSidebar` 호출 | content recovery보다 먼저 sidebar/count와 Undo 계산 | core gate를 최우선 render 분기로 둠. sidebar/Flow/기간 수·receipt/Undo를 먼저 계산하거나 이전 DOM 뒤에 남기지 않음 |
| 4578–4593 startup | E0 journal만 확인; corrupt workspace도 기본 상태 렌더 | S packet → 아래 family 분기. 초기 render 전에 gate를 결정 |
| 2894 footer key | 기존 M.STORAGE_KEY를 표시 | 활성 workspace key는 S.STORAGE_KEY. 구 key는 read-only baseline임을 진단 영역에서 구별 |

| 실제 읽기 결과 | 사용자 화면 / 쓰기 허용 |
| --- | --- |
| API 객체 자체 접근 불가 | 명확한 ‘이 화면에서만 사용 · 새로고침 복원 안 됨’. 실제 저장본이 없다고 주장하지 않음. 실제 localStorage로 자동 복사·재시도 전환 금지 |
| W ready + origin seed | 검증된 예제임을 표시. ‘사용자 마지막 성공 복원’이라고 쓰지 않음. 읽기만으로 v2 key 생성 0 |
| W ready + origin legacy/checkpoint | 검증된 state/undo만 표시. legacy는 원본 읽기 투영이며 아직 새 key에 쓴 것이 아님 |
| core read-error, corrupt/unknown, base drift, 다중 journal | 저장 확인 gate만 표시. seed/기본 Flow/정상 sidebar count 노출 0, 자동 fallback/초기화/merge 0 |
| draft/creator/source만 오류 | 정상 workspace는 유지. 해당 기능 오류 패널과 의존 경로만 잠금. core transaction 중에는 이들도 전역 쓰기 잠금을 따름 |

core gate 문구는 ‘저장된 내용을 확인하지 못했습니다. 기존 값은 바꾸지 않았어요.’를 기본으로 하되, confirmed는 ‘저장은 완료 · 정리 확인 필요’로 구분한다. ‘다시 확인’은 읽기만 한다. 알려지지 않은 값에는 삭제/초기화를 기본 복구 행동으로 주지 않는다. 오류 패널 제목으로 focus를 옮기고, Tab으로 실제 가능한 재확인·복구 행동만 접근하게 한다. Escape/Back으로 정상 seed를 여는 우회는 없다.

## 3. journal 분기와 편집 복구

S packet의 `journals.currentFamily`는 라우팅 정보이며 최종 decoder 성공을 대신하지 않는다. 실패한 decoder를 다른 adapter에 다시 넣지 않는다.

| 상태 | 사용할 API | 이후 처리 |
| --- | --- | --- |
| old journal만 있고 new target/journal 없음 | `E0.loadRecovery(storage, validLegacyEnvelope)` | prepared는 E0.recoverDurableAttempt, confirmed는 E0.clearConfirmedRecovery를 사용자 버튼으로 실행 |
| old journal + new journal 또는 new target | S `multiple-authorities` | 두 기록 보존, v2 rollback/cleanup도 금지. E0를 무조건 먼저 실행하는 우회 없음 |
| v2 currentFamily=editor | `E2.loadRecovery(storage)` | prepared 명시 recover / confirmed 명시 clear. `.ok`뿐 아니라 `.canResume`와 새 W 확인 |
| v2 currentFamily=action | `S.loadActionRecovery(storage)` | `S.recoverAction(storage,{expectedJournalRaw})`가 prepared 복원 또는 confirmed 정리를 담당 |
| unknown/mixed/foreign/read-error | 명시 blocked | raw 보존. reset·다른 writer·자동 journal 삭제 금지 |
| 알려진 복구 뒤 journal 부재 | 원래 expected journal과 target before/after를 해당 복구 API로 확인 | 부재만 보고 gate를 풀지 않음. `S.loadWorkspace`를 새로 발급받아 ready 확인 |

### 3.1 Plan/Quick 정확한 호출 목록

| 현재 함수/행 (`A/app.js`) | 새 연결과 보존할 동작 |
| --- | --- |
| 87 `planItemSessions` | 일반 편집은 E2로 고정. E0는 복구 dispatcher 안에서만 선택 |
| 961–973 active/locked, 1076 syncEditorUI | core/action journal gate와 editor submitting/recovery를 합친 guard. E의 dirtyclose/부모자식 판단 자체는 그대로 |
| 1039 `beginEditorRoot`, 1042–1043 old raw 비교 | `S.sameAuthority(storage,W)` 및 새 읽기 packet 비교. opening ticket은 `W.expectedCheckpointRaw`(null 허용), revision, core 권위. M.loadEnvelope로 v2를 decode하지 않음 |
| 1066 `updateEditorDraft` | E2.updateDraft. pending/recovery/confirm 중 값 변경 금지 유지 |
| 1158 `openPlanEditor`, 1394 `newPlanDraft` | 검증된 개인 state와 표시 source의 역할을 유지. 새 session 소유자는 E2 |
| 1524 `openItemEditor`, 1547 child 생성 | 부모 Plan과 동일 E2 factory. child 적용은 부모 draft의 title/memo/planDate만 변경하고 저장 0 |
| 1169 `saveEditor`, 1181 candidate | `C.transitionCheckpoint(W.checkpoint, action)`. generic result는 `.checkpoint`, 오류는 `.reason/.ok`; 옛 `.envelope/.error`와 혼동 금지 |
| 1189 beginSave | E2.beginSave(session,{attemptId,expectedRaw:openingRaw,candidate:result.checkpoint}); C1 validator가 내부에서도 강제됨 |
| 1174 retrySave, 1196 timer, 1200 durable write | E2 retry/attempt 소유권 유지. 32ms callback 직전에 현재 session/attempt와 core gate/권위를 다시 확인. E2.writeAttempt 단독 사용 금지 |
| 1203 finishSave / 1205–1226 성공·정리 | E2.finishSave + E2.clearConfirmedRecovery. durable outcome의 committed 사실과 close effect를 분리. committed인데 legacy drift이면 성공 사실은 한 번만 기록하고 닫기/다음 쓰기는 잠금 |
| 1239 `validEditorEnvelope` | legacy validator는 E0 분기에만 이름을 분리해 유지. v2는 C.validateCheckpoint(...).ok |
| 1243–1299 recoveryActions/render/check | 현재 owner와 phase 검사 유지. action journal은 별도 S 표시로 라우팅. 읽기 재확인만으로 자동 해제 금지 |
| 1302 `resumeEditorRecovery` | 아래 old/v2 분리를 적용. 복구 성공 후 M.loadEnvelope(recovery.beforeRaw) 금지 |
| 1338 `openVerifiedEditorState` | `S.loadWorkspace`로 core 전체 확인. 특정 target+journal 둘만 확인해 열지 않음 |
| 1356 `clearEditorConfirmed` | 선택한 E0/E2 clear → 새 W ready 확인. journal.candidateRaw를 M.loadEnvelope로 직접 채택하지 않음 |
| 1105–1147 close/continue/discard, 1376 popstate, 3618 child apply | dirty confirmation, history marker, returnPoint, child/parent discard 범위를 보존. 저장 adapter 교체를 이유로 자동 저장/자동 닫기 금지 |

**old 편집 복구 뒤 v2 재편집:** E0로 명시 복구를 끝내고 `S.loadWorkspace`가 반환하는 legacy projection을 새 기준으로 삼는다. E0가 검증한 journal의 baseline/draft 값으로 E2.createSession(새 sessionId) → E2.updateDraft를 실행한다. E0 session/attempt/outcome 객체를 E2에 넘기거나 spread해서 소유권을 위조하지 않는다. opening expectedRaw는 old beforeRaw가 아니라 새 W.expectedCheckpointRaw다. 구 target의 복원은 이전 실패를 해소하는 명시 예외이고, 이어지는 새 저장은 v2다.

**v2 편집 복구 뒤:** E2.recoverDurableAttempt 결과가 ok/canResume일 때 `E2.resumeRecoveredSession(recovery,{storage,sessionId,returnPoint})`를 쓴다. storage 옵션으로 재개 직전 base/journal/target을 다시 확인한다. 새 W를 읽어 ready 확인하고 새 opening raw를 붙인다. 복구 후 입력은 남지만 재저장은 사용자 명시 submit 전까지 0건이다.

confirmed cleanup 실패는 target을 되돌리지 않는다. active 성공 수를 올렸는지와 reload에서 durable 기록을 확인했는지를 구분한다. reload 복구 화면 진입만으로 현재 runtime 성공 수를 1 올리지 않는다.

## 4. 일반 workspace·Undo·handoff·reset 전환 목록

### 4.1 공통 coordinator

`writeCandidate`는 옛 envelope를 쓰는 함수에서 **W에 결박된 후보와 operation을 저장하는 함수**로 바꾼다. 성공 callback은 실제 commit/cleanup과 재발급 W 확인 뒤에만 실행한다.

```text
opening W + action / draft ticket
  → 현재 W 권위 확인 + C.transitionCheckpoint 또는 C.undoCheckpoint
  → no-op / invalid: 0 write, 기존 UI·Undo 유지
  → S.prepareWrite(W, candidate, {operation, operationId, expectedDraftRaw?})
  → S.commitPrepared(storage, prepared)                 [한 번만 dispatch]
  → committed: 성공 사실 1회, S.cleanupCommitted(receipt)
  → cleanup 및 새 S.loadWorkspace ready: 화면/receipt/callback 확정
  → prepared / uncertain / cleanup 실패: owner 보존, 전역 쓰기 잠금
```

generic S는 오류 때 자동 rollback하지 않는다. ‘이전 내용은 그대로’라는 기존 catch 문구를 복사하면 안 된다. before를 검증한 preflight 실패에는 ‘쓰기를 시작하지 않았어요’, prepared/uncertain에는 ‘저장 상태 확인 필요’, confirmed에는 ‘저장은 완료 · 정리 확인 필요’를 표시한다. 화면에 후보를 성공 상태로 채택하거나 이전 Undo를 먼저 없애지 않는다.

| 현재 함수/행 (`A/app.js`) | 새 API/operation | caller에서 확인할 점 |
| --- | --- | --- |
| 440 `writeCandidate`, 444 M.writeEnvelope | S.prepareWrite → commitPrepared → cleanupCommitted | 후보 closure만으로 재시도하지 않음. raw/base/epoch에 결박 |
| 634 `transition`, 635 M.transitionEnvelope | C.transitionCheckpoint → 공통 coordinator `workspace` | `.changed=false`와 `.ok=false` 분리. M.apply 직접 우회 0 |
| 808 `undo`, 825 M.undoEnvelope | workspace lane만 C.undoCheckpoint → S `undo` | creator/source lane은 기존 전용 wrapper 유지. blocked 기능의 빈 undo를 읽어 fallback하지 않음 |
| 3099/3108 `applyMoveDestination` | move-folder/schedule → C/S workspace | 원본 날짜·Flow 소속 보존. 실패 상태를 finishMoveTransition에서 ‘이전 위치 확정’으로 덮지 않음 |
| 3116 `submitQuickConversion`, 3123 transition, 3144 writer | C/S workspace | receipt는 result.checkpoint에서 읽고 cleanup 뒤 새 Flow로 이동 |
| 3167 `openOccurrenceDateDialog`, 3177 | move-occurrence-date → C/S workspace | occurrence identity, 원 발생일, 원본 Item 유지 |
| 3188 `openQuickDialog`, 3191 | add-quick → C/S workspace | **새 Quick도 v2**. 기존 Quick 편집 E2와 구분 |
| 3196 `openFolderDialog`, 3199 | add-folder → C/S workspace | dialog submit이 공통 guard를 거침 |
| 3713/3716 click 완료 | complete-occurrence/complete → C/S workspace | sourceChecked를 실행 완료 초기값으로 복사하지 않음 |
| 3720/3727 trash/restore | C/S workspace | archived legacy orders 유지, active Undo는 checkpoint 하나 |
| 3748 schedule-task, 3949 date form | C/S workspace | 버튼/메뉴/폼/drag가 별도 writer를 만들지 않음 |
| 3898 delete-folder | C/S workspace | 내용은 미분류, 성공 후에만 화면 전환 |
| 3842 handoff candidate | C.transitionCheckpoint | 원문 명시 확인·identity·duplicate 판정은 M의 기존 domain 의미 유지 |
| 3877 정상 handoff M.writeAuthoringCommit | S.prepareWrite `authoring-handoff` | opening draft exact bytes + W → 새 workspace와 기존 draft 제거를 한 journal로 묶음 |
| 3854 duplicate handoff | **writer 호출 제거, 0 mutation** | 아래 확정 분기. same checkpoint를 가짜 revision으로 변경하지 않음 |
| 3904 reset M.resetPoc | S.prepareReset(storage,W,id) → commit/cleanup | 정확한 5 target. 두 journal이 없어야 시작, confirmed 정리 후 새 W seed |
| 3738 permanent-delete | 별도 §4.3 gate | C.transitionCheckpoint 일반 경로로 실행하지 않음 |

### 4.2 handoff 두 분기와 reset 후처리

정상 handoff는 draft 읽음이 확인되어야 한다. read-error를 null로 바꾸거나 authoring 메모리만 보고 저장하지 않는다. `.status='committed'`라도 정리 실패 시 receipt로 정상 이동하지 않고 confirmed gate에서 저장 사실을 알린다. prepared에서 target만 바뀜, draft까지 제거됨, confirmed 후 reload를 각각 S 복구로 처리한다. 복구 후 다시 명시 저장하기 전에는 handoff 재실행 0건이다.

중복 handoff는 주 작업자가 **같은 checkpoint + draft 보존 + 기존 receipt/Flow 읽기**로 확정했다. 문구는 ‘이미 저장된 Flow예요. 작성 초안은 그대로 두었습니다.’로 실제 동작을 설명한다. 기존 `authoring=freshAuthoring()`도 하지 않는다. 기존 Flow의 handoff identity와 현재 사본이 일치하고 휴지통 밖일 때만 열린다. 삭제/휴지통/identity 불일치면 ‘이전에 저장한 Flow를 지금 열 수 없어요. 작성 초안은 그대로입니다.’로 안내한다. 이는 기존 duplicate/같은 위치 0 mutation 요구에 맞춘 안전 경로 정정이며 새 draft-only journal이나 제품 정책 추가가 아니다.

reset의 5 target은 S.RESET_KEYS 그대로다: 새 workspace, 구 workspace, 작성 draft, creator library, source candidates. journal은 target 목록에 넣지 않는다. confirmed+정리 검증 전에 `M.initialEnvelope()`나 초기 library를 화면 권위로 넣지 않는다. 성공 후 S.loadWorkspace 및 기능 loader를 다시 읽고, pendingRetry·editor/history ticket·move/drag·source review·authoring property ticket/복구 상태·receipt·Undo lane을 무효화한다. 취소/no-op에서는 이 상태들도 함부로 초기화하지 않는다. 임시 모드 reset은 메모리 내 5 target에만 해당한다.

### 4.3 명시 영구 삭제 — 연결 전 별도 gate

현재 C.transitionCheckpoint는 `legacy-retention-conflict`로 차단한다. 별도 순수 삭제 모듈과 S.preparePermanentDelete 분기가 병렬 구현 중이다. 이 분기의 PASS를 확인하기 전에는 옛 M.transitionEnvelope/M.writeEnvelope로 우회하지 않는다.

연결 계약은 `S.preparePermanentDelete(W,{target,confirmed:true,expectedRevision,sourceCandidateRaw,now},operationId)` → 공통 commit/cleanup이다. target은 제목이 아니라 검증된 Flow tuple/ref 또는 Quick id다. source raw read-error는 이 삭제를 차단한다. journal은 새 workspace·구 workspace·source candidate의 고정 3 entry와 intent를 가진다. 구 key 쓰기 예외는 명시 삭제와 reset뿐이다.

confirmed journal에는 제거 전 개인 bytes가 남아 있으므로 **durable commit과 영구 삭제 완료는 다르다**. S의 `requiresDeletionCleanup` / `deletionComplete`를 사용하고, cleanup 검증 전에는 ‘영구 삭제 완료’라고 쓰지 않는다. 다른 사본·CreatorDraft·공유 원문 보존 및 Undo/legacySnapshot 재부활 0을 별도 시험한다.

## 5. 날짜·순서·결과 reader 연결

| 현재 위치 (`A/app.js`, 별도 표시만 model) | 전환 |
| --- | --- |
| 222 dateLabel, 3012 dateDestinationRows | 화면용 localToday를 주입. fixture 상수/원본 날짜/기존 decoder 기준값을 전역 치환하지 않음 |
| 845 sidebar / 857 count | period 4개는 C.projectGroups(W.checkpoint,view,localToday)의 같은 그룹 ids로 count |
| 939 renderPeriodView / 946 ids | today의 오늘+지난 미완료, week 월~일, month 날짜순, undated를 C group 기준 렌더 |
| 900 renderMonthTaskGroups | C range.dates를 월간 빈 날짜에 사용. 날짜별 add-quick은 실제 heading 날짜를 전달 |
| 874 renderTask / 894 renderTaskList | navigation view와 order owner를 분리. row/list/handle에 context+contextKey를 일관되게 전달 |
| 928 folder / 931, 1665 Flow detail / 1671 | M.viewTaskIds의 folder/flow/step 경로 유지. timeline 순서로 Plan/폴더 순서를 덮지 않음 |
| 3025 renderMovePanelBody / 3048 openMovePanel | group의 ids/blocked/manualOrder로 peer·버튼 상태 결정. opening W/revision/localToday/context/key/peer ticket 보관 |
| 3213 reorderPeerIds / 3220 commitPeerOrder | period view 문자열 배열 대신 C group. `timeline-reorder`와 `timeline-reset`을 공통 transition에 전달 |
| 3227/3241/3256/3274 moveOrder/edge/position/before | 같은 peer adapter 사용. 다른 날짜나 aggregate를 한 배열로 엮지 않음 |
| 3742–3745 메뉴 정렬, 4284 Alt+Arrow, 4352 dragstart, 4386 drop, 4448 pointerdown, 4493 pointerup | 모든 입력에서 같은 opening ticket과 apply 함수. drop 직전 현재 localToday·revision·peer 재확인 |
| 108–111 result/authoring calendar anchor, 3588 open-flow 등 초기화 | K2-B 기간 clock과 기존 결과/반복 preview anchor는 별개. `M.TODAY` 전체치환 금지 |
| 230 resultProjectionOptions / 1467 renderResultPanel / 3159 occurrenceFromControl / 3642–3647 복사·다운로드 | 동일 readonly result rank resolver를 옵션으로 전달. 화면만 바꾸고 TXT/캘린더 관련 호출을 남기지 않음 |
| `model.js:989 resultContextRank`, 1236 buildUnifiedResultProjection | 현재 private 함수가 old view orders를 직접 읽음. app 옵션 추가만으로 바뀌지 않으므로 좁은 optional rank hook 소비 지점이 필요 |
| `model.js:1088 resultMonthCells`, 1126 buildResultCalendar | contextOrder 소비 범위(같은 날짜/미정 캘린더 행)만 새 resolver로 연결. 전체 Plan/TXT/표 순서를 timeline으로 재구성하지 않음 |

순서 action은 `{type,context,contextKey,localToday,expectedRevision,currentOrderedRefKeys,orderedRefKeys?,now}`이며 C.transitionCheckpoint의 options에 **독립적으로 읽은** `{currentLocalToday}`를 준다. opening localToday를 그대로 두 번 복사해서 stale 검사를 무력화하지 않는다. 새 `시간순으로 되돌리기`는 해당 group만 `timeline-reset`한다. blocked legacy group은 임시 시간순 표시와 충돌 설명을 제공하고 reorder/reset 둘 다 차단한다.

result hook은 순수 조회다. 날짜가 있으면 그 실제 날짜의 month projection에서 date group을, 미정이면 undated group을 조회한다. 현재 task id가 그 group에 포함될 때만 검증된 rank를 사용한다. 반복 occurrence의 이동 날짜에 원본 task가 없는 경우까지 억지로 source id를 삽입하지 않고 기존 Plan fallback/occurrence identity를 유지한다. 별도 occurrence TimelineOrder를 만들지 않는다. hook 반환값이 유효하지 않으면 오류를 숨기고 옛 today 우선순위를 선택하지 말고 명시적인 기존 Plan fallback 또는 projection 실패로 구분한다. authoring preview에는 새 개인 rank를 주입하지 않는다.

clock 갱신은 shell에서 로컬 연/월/일을 읽어 시작·자정 timer·focus·visibility 복귀에 수행한다. 날짜가 바뀌면 cache와 진행 중 순서 ticket/gesture를 취소하고 읽기만 갱신한다. 이때 저장 0, 성공 수 0, payload date/updatedAt/Undo 변경 0이다. 메모/원문 입력 DOM을 불필요하게 재마운트하지 않는다.

## 6. 독립 draft/creator/source writer와 배경 경로 guard

이 절은 기존 writer를 v2 workspace writer로 바꾸자는 뜻이 아니다. 전용 key/schema와 K1-A native Undo 경로는 유지하고, core pending 중 우회 및 특정 기능 오류 뒤의 덮어쓰기를 막는 app guard를 둔다.

| 기능 / 실제 호출 (`A/app.js`) | 필요한 guard와 재확인 |
| --- | --- |
| draft: 461 persistAuthoringDraft → 465 M.writeAuthoringDraft | core ready/transaction 없음 + draft status empty/restored일 때만. read-error/corrupt를 freshAuthoring 성공으로 취급하지 않음 |
| draft 삭제: 476 discard → 479 M.clearAuthoringDraft; 3533 new-authoring; 3828 cancel-authoring | draft 읽음 확인과 core guard. 오류 때 draft 삭제/새 문서 교체를 진행하지 않음 |
| creator: 493 blocked, 519 writer → 525 writeCreatorDraftCommit / 526 writeCreatorDraftLibrary | creator status 검증. 2-key creator commit은 draft도 usable이어야 함. generic S journal이 있는 동안 호출 0 |
| creator: 549 transition, 564 save, 586 open → 612 draft write | 기존 creator guard뿐 아니라 writer 재진입점에 같은 guard. 열기 retry가 다른 authoring 문서를 덮지 않게 draftId/epoch 확인 |
| source: 644 blocked, 658 review, 711 apply→734 writer, 758 Undo→772 writer, 790 refresh | source key의 exact raw와 상태 유지. 오류 source를 null-empty로 전환해 기존 effective 원문이 없다고 단정하지 않음 |
| source projection: 192 state, 652 preview, 1665 detail/result, 1394 Plan draft | source store 미확인일 때 원문 비교와 그 effective 값에 의존하는 편집을 잠금. 검증된 개인 실행 데이터는 오류 범위를 알린 채 유지; 모르는 원문을 최신이라고 표시하지 않음 |
| native/template: 1806 applyNativeTemplateScaffold→1862 persist, 2091 example→2134 persist, 2199 structure→2240 persist | 실제 원문 mutation **전** core/draft guard. 끝의 persist만 막아 화면 원문만 바뀌게 하지 않음 |
| property/repair: 2603 applyAuthoringSourcePlan, 2627 get draft, 2636 candidate writer, 2663 rollback; 2724 opening ticket | K1-A persist-first/읽기·rollback/IME/native Undo를 보존. core gate를 추가하고 실패를 일반 성공 toast로 덮지 않음 |
| 입력 autosave: 3990 input guard, 4035 persist; 4057 change guard, 4094 folder persist; 3985 beforeinput | beforeinput/input/change 모두 기능 및 core 잠금 확인. disabled DOM만 믿지 않음. pending native transaction 종료 처리와 사용자 입력 차단은 구별 |
| submit: 3914 전역 guard, 3917 conversion, 3922 creator rename, 3928 property, 3949 date, 3956 dialogSubmit | 공통 app guard를 통과한 뒤 기능별 guard. 보관된 dialogSubmit callback에도 opening ticket 확인 |
| retry: 105 pendingRetry, 368 toast 등록/378 timer, 3752 실행; 3208 retryAuthoringCommit | 오래된 candidate/다른 draft/session callback을 실행하지 않음. core/epoch 확인 후 새 preparation이 필요하며 이미 dispatch한 S preparation 재사용 금지 |
| save timer: 1196 / long-press timer: 4458 / drag/drop/pointerup | callback 진입 때 다시 guard. 타이머가 만들어졌을 때 정상이어도 실행 시 journal/pending이면 write 0 |
| direct handle click: 3433 action guard 이전; dragstart 4352, drop 4386, pointer handlers 4448 이후 | recovery guard 전에 열리는 손잡이 분기를 앞단으로 이동/차단. 남아 있는 DOM을 통해 move panel·쓰기가 열리지 않게 함 |
| undo 버튼/keyboard: 808, 1076, 2879, 4098 keydown | core/action/editor recovery를 모든 진입에서 확인. creator/source lane도 미확인 저장소로 우회하지 않음 |
| blur 4419 / resize 4425 / visibility 4440 / pointercancel 4524 / scroll 4539 | 현재는 이동 취소·뷰포트 동작이며 저장 writer가 아님. clock 재확인 추가 시에도 저장하지 않음 |

현재 app에는 unload 자동 저장이나 storage 이벤트 merge writer가 없다. C3에서 새 자동 저장·동기화 경로를 추가하지 않는다. focus/visibility/storage 변화 감지는 권위 재확인과 잠금만 할 수 있다. action recovery가 열린 순간에는 pendingRetry와 지연 gesture를 무효화하되, 실패 form/authoring 텍스트 등 사용자 입력은 지우지 않는다.

일반 retry는 ‘예전 candidate 재전송’이 아니다. preflight 실패에서 원래 opening 권위/문서/clock이 그대로임을 다시 확인한 경우에만 **새** S preparation을 만든다. prepared/uncertain은 명시 복구 후 같은 의도가 여전히 유효한지 확인하고 다시 명시 적용한다. 다른 탭의 변경은 자동으로 최신 권위에 재계산해 저장하지 않는다.

## 7. 실행 순서와 생성 gate

1. **연결 준비:** 필요한 UMD 의존성 C/S/E2/R1-R2와 삭제 gate 상태를 확인한다. core packet·기능 status·transaction owner·화면 clock을 app 내부의 분리된 값으로 선언한다. legacy M 상수는 유지한다.
2. **부팅/복구:** S 우선 읽기, core 오류 화면, E0/E2/S family routing, 명시 재확인/복원/정리부터 연결한다. 이 상태를 아직 사용자 조작 HTML로 생성하지 않는다.
3. **모든 workspace writer:** 일반/Undo/Plan/Quick/정상 및 중복 handoff/reset을 전환하고 feature/background guard를 함께 적용한다. 영구 삭제는 독립 pure+S gate 후 연결하며 미완성 분기를 legacy writer로 남기지 않는다.
4. **같은 context reader/transition:** period count/그룹, 이동 peer, 모든 input 경로, reset, 좁은 result rank hook을 연결한다. legacy 충돌 날짜는 제한을 UI와 모델 양쪽에서 일치시킨다.
5. **정적 누락 검사:** app의 `M.loadEnvelope`는 이름이 분리된 E0 검증에만, `M.writeEnvelope/M.writeAuthoringCommit/M.resetPoc/M.transitionEnvelope/M.undoEnvelope`는 active app에서 0건인지 검색한다. 폴더/Flow의 M.viewTaskIds는 허용하고 period 4개 사용만 제거한다. M.DRAFT/CREATOR/SOURCE key 사용은 허용 경로 목록으로 확인한다.
6. **시험 후 일괄 생성:** root가 focused→전체 npm test→production build→브라우저를 수행한다. `A/build-single-file.cjs:15–17,63–64`에 현재 M+E만 포함되어 있으므로 model → timeline-context → checkpoint → 승인된 permanent-delete → workspace-storage → plan-item-session → app의 의존성을 완성한 후 두 HTML을 같은 buildText로 생성한다. runtime source-update 등의 기존 앞선 bundle은 유지한다.
7. **조작본 인수:** 두 생성물 각각 standalone boot와 script parse/load를 확인한다. 한쪽만 새 reader/옛 writer로 남겨 전달하지 않는다. 역사 HTML 파일명은 유지하되 생성 시점 hash와 빌드 source hash를 기록한다.

## 8. C3 예정 시험과 판정

아래 ID는 **미실행 test inventory**다. fixture 반복·viewport 반복·등록 테스트 수를 실제 실행 후 별도로 센다.

| ID | 실행할 시나리오 | 필수 판정 |
| --- | --- | --- |
| C3-01 | API 접근 자체 불가 vs core 4개 각각 getItem 오류 vs ancillary 3개 각각 오류 | volatile와 특정 key lock 구분, 정상 사용자 state를 seed로 대체 0, 자동 write 0 |
| C3-02 | seed/legacy/new valid; new corrupt/unknown; old byte drift | 우선 권위 정확, corrupt 화면에 예제/정상 count 0, old bytes 보존 |
| C3-03 | old prepared/confirmed, new editor prepared/confirmed, action prepared/confirmed, mixed/foreign/dual journal | 올바른 adapter만 호출, wrong decoder fallback 0, startup write 0 |
| C3-04 | old 편집 명시 복구→E2 새 세션→다시 저장 | 입력/baseline 보존, 새 session/attempt, old 복구 뒤 새 저장은 v2만 |
| C3-05 | 일반 완료/날짜/폴더/추가/변환/trash/restore→Undo→reload | 단일 새 envelope+Undo, legacy raw/archive exact 보존, 운영 prefix 밖 쓰기 0 |
| C3-06 | Plan 부모·child 반영/취소/dirtyclose/Quick 저장; 저장 중 double click/Back/Escape | child 0write, root 한 번, focus/scroll/dirty 범위 유지, 회복 gate 우회 0 |
| C3-07 | 정상 handoff의 prepared/각 target/confirmed/cleanup 오류와 reload | 미확정 receipt 0, draft exact 복구, confirmed target rollback 0, explicit retry만 |
| C3-08 | duplicate handoff; 삭제/휴지통/identity 불일치의 이전 Flow | draft/UI 입력 보존, target/journal/draft mutation 0, 잘못된 Flow 열기 0 |
| C3-09 | reset cancel/no-op/5-key 각 중간 오류/reload/confirmed cleanup | 정확 5 target만, partial reset에서 seed 0, journal cleanup 후에만 seed |
| C3-10 | source/draft/creator 오류 상태에서 모든 관련 버튼·native/template/input/retry/Undo | 오류 feature 덮기 0, 정상 workspace 보존, 일반 journal 중 ancillary writer 0 |
| C3-11 | 저장 실패 후 다른 변경/다른 문서/다른 탭/자정 뒤 toast retry·32ms callback·long-press | stale prepared 재사용 0, 후보 자동 rebase 0, 입력 보존 및 재선택 안내 |
| C3-12 | 같은 날 today/week/month 정렬→reset→Undo→reload; 미정/지난 미완료 | 실제 context 공유, 다른 context/Plan/folder 순서 불변, 구 순서 재등장 0 |
| C3-13 | 메뉴/키보드/drag/350ms 길게 누르기 동일 context; wrong date/cancel/resize/IME | 동일 transition, 취소·같은 위치 0write, synthetic click 누출 0 |
| C3-14 | 결과 네 보기/복사/download/반복 회차/날짜 이동 | 좁은 rank 소비 일치, 원문/sourceChecked/개인완료/회차 identity/Plan 순서 불변 |
| C3-15 | 삭제 gate 후 명시 영구 삭제·오류·복구·cleanup·reload | 선택 owner만 제거, confirmed만으로 완료 주장 0, archive/Undo에서 부활 0, 이웃/CreatorDraft 보존 |
| C3-16 | 두 생성 HTML × 정상 및 recovery × 5 viewport | runtime 누락·가로 넘침·console/page error 0, 핵심 복구/취소/저장 버튼 scroll/hit-test/키보드 접근 |

viewport는 390×844, 375×812, 844×390, 1024×768, 1440×900이다. 실패/복구/중복 안내도 좁은 가로 화면에서 검사한다. 캡처만으로 focus·drag·긴 누름 결과를 대신하지 않는다. 실제 Android Chrome/iOS Safari와 관찰 사용자 검사는 이 자동화의 완료 조건이 아니며 미실행이면 NOT_RUN/0으로 기록한다.

전체 시나리오 전에 비PoC 운영 `flow:*` key/value를 캡처하고 끝에 byte-for-byte 비교한다. 일반 v2 변경은 새 target+v2 journal만, handoff는 정확 draft가 추가된다. old key 변경은 E0의 명시 이전 복구·승인된 reset·명시 영구 삭제만 각각 사유를 붙여 분리 집계한다. `localStorage.clear()` 0, namespace 밖 set/remove 0을 API 감시로 증명한다. 성공 사용자 변경 수, target API 호출 수, journal API 호출 수, 복구 호출 수, reload durable 확인 수를 하나의 숫자로 합치지 않는다.

## 9. 이 문서의 완료 범위

현재 app의 workspace 저장 관련 경로 5종(`writeEnvelope`, `transitionEnvelope`, `undoEnvelope`, `writeAuthoringCommit`, `resetPoc`), 직접 editor target 읽기, 부팅 loader, 전용 draft/creator/source writer, 입력·지연 callback·reorder/result 소비 지점을 함수/행별로 연결했다. transition/Undo 후보 계산 자체는 순수 함수이고 실제 writer와 구별한다. 제품 파일·생성 HTML·실제 사용자 저장소를 수정하지 않았다. 이 설계만으로 C3 구현·브라우저 통과를 주장하지 않는다. commit·push·PR·Preview·Production은 실행하지 않았다.

문서 검증: `npm.cmd run docs:check` PASS(필수 파일 16개, 로컬 링크 4,925개). 실제 Markdown 본문과 함수 anchor를 다시 읽어 대조했다. 이 결과는 제품 동작 검증 수에 포함하지 않는다.
