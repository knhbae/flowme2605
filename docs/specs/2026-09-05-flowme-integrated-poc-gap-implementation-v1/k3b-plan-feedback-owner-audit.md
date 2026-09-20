# B3 Plan 요약·저장 결과 owner 독립 연결 감사

2026-09-06. [B3 요약·영수증 설계](k3b-plan-summary-receipt-design.md)와 [실제 연결 설계](k3b-plan-feedback-integration-design.md)를 전문으로 읽고 app/E2/S/P의 실제 분기를 대조했다. 제품 구현과 병렬로 진행한 **읽기 감사**다. 제품·시험·보고서 수정 0, 새 모델/VM/브라우저 시험 실행 0이다. 아래 시험은 계획이며 PASS 증거가 아니다.

## 1. 기준과 우선 판단

줄 번호는 B3 수정 전 app (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-b3-app/app.js`)의 `6EABC405CA394FC7E03052DE9EDBCAF14C8144CD838B2B3EBF2FC91A6623346B`를 기준으로 한다. 이 백업과 현재 app을 직접 대조했다. 현재 app은 작성 담당자가 수정 중이며 중간 읽기에서 `99D631D80A3CE1CAB4A49C95B3BCE47D919038DE3E9855DE6530BA13E7A3845B`까지 확인했다. 이 중간본을 최종 동결 후보로 간주하지 않는다.

E2는 `C803AA77…`, S는 `387B90EB…`이다. genuine attempt/outcome, 단일 Undo, 기존 source-bound guard와 복구 문법을 재사용하는 설계가 맞다. 결과의 요약 객체를 저장 권한으로 쓰거나, 성공 전에 별도 Undo snapshot을 만드는 연결은 필요 없다.

우선 확인할 사항은 다음과 같다.

1. **High · 현재 WIP의 child 요약 입력 모양.** `99D631D8`의 `editorChangeSummary()`는 `items[scopeId]`에 `itemSession.draft` 전체를 합친다. E2 `createPersonalChild()`의 child draft에는 `version/flowRef/savedCopyId/flowId`가 있지만 P `normalized()`는 Item 필드를 `itemRef/title/memo/schedule`로 제한한다. 따라서 자식 요약이 `invalid-plan-draft`로 거절되는 코드 경로다. E2 `applyPersonalChild()`와 같은 4필드만 합쳐야 한다. 제품 담당에게 전달했으며 실제 실행 재현은 아직 하지 않았다.
2. **High · 같은 attempt의 confirmed 정리.** `finishSave()`는 genuine outcome을 한 번 소비한다. 명시 정리 분기에서 이 함수를 재호출하거나 outcome을 복제하면 안 된다. 최초의 검증된 durable 사실과 나중 cleanup/adoption을 연결하는 private record가 필요하다.
3. **High · Plan 결과의 Undo 목적지.** 일반 `undo()`는 같은 Flow의 source Undo를 우선할 수 있다. Plan 결과 버튼은 이를 호출하지 않고 exact 결과 owner를 확인한 후 C Undo와 기존 workspace writer만 사용해야 한다.
4. **High · source modal·외부 변경의 owner 무효화.** source 비교는 별도 native dialog가 아니라 Flow 상세 안의 `sourceUpdateSession` overlay다. editor/recovery/pending만 검사하면 결과의 포커스 가능한 버튼이 그 뒤에 남을 수 있다. 관측된 source ABA와 workspace ABA도 영구 무효화가 필요하다.
5. **Medium · 같은 성공의 중복 live.** 현재 저장 경로는 editor feedback·saveStatus·toast를 각각 갱신한다. B3 결과를 덧붙이는 것만으로는 한 안내 owner가 되지 않는다. 실패·복구는 기존 안내를 유지하고 정상 결과만 중복 안내를 대체해야 한다.

2~5는 현재 설계가 이미 요구하는 경계이며 새 결함 재현이나 신규 정책 확정이 아니다. 구현 후 실제 분기별 시험으로 충족을 판정해야 한다.

## 2. 최소 연결 위치

| 기존 위치 | 실제 분기 | 필요한 최소 연결 / 보존할 경계 |
| --- | --- | --- |
| `beginEditorRoot:1925` | workspace 확인 → source 표시 context → genuine E2 root → history | 성공적으로 열린 source-v3/structure-v4 context만 preview에 사용. raw v1/v2·Quick를 source 요약으로 승격하지 않는다. 기존 결과의 중단은 저장된 Undo를 지우는 일이 아니다. |
| `updateEditorDraft:1965`, `syncEditorUI:1977` | immutable session 교체, invalid·retry·recovery 표시 | preview는 actual session.draft에서 계산. UI 임시값이 E2 draft에 들어가기 전의 시점을 저장할 diff로 캐시하지 않는다. invalid summary는 입력이나 기존 오류를 지우지 않는다. |
| Item 열기/반영, E2 `createPersonalChild:405`·`applyPersonalChild:420` | child는 부모 객체·revision·full ref에 묶임, 반영은 0쓰기 | child-open 부모 staged draft를 비교 기준으로 고정한다. Item 4필드만 합치며 부모의 다른 변경을 다시 세지 않는다. parent identity가 바뀌면 새 기준으로 조용히 바꾸지 않는다. |
| `saveEditor:2075`의 retry 분기 | 같은 attempt, 새 immutable submitting session과 submission 번호 | WeakMap key는 attempt 객체로 유지하되 매 dispatch의 active session/submission을 확인한다. 같은 길이 문구나 attemptId 문자열만으로 다른 시도의 요약을 받지 않는다. |
| `saveEditor`의 begin 성공 직후 | E2가 normalized candidate/no-op 결정, PD preflight | 실제 attempt의 expectedRaw/serialized와 frozen P summary를 연결한다. no-op이면 journal/새 결과 0. summary.changed가 false여도 실제 E2 판정을 대체하지 않는다. |
| `saveEditor:2112`의 32ms callback | active session===prepared.session·attempt===prepared.attempt, gate/pending 확인 | 기존 객체 비교를 유지한다. 입력 변경/재개로 생긴 다른 session이나 늦게 도착한 callback이 현재 draft/result를 바꾸지 못한다. |
| `saveEditor:2115`~정상 close | durable write → genuine finishSave → confirmed cleanup → S load/adopt → 원위치 복귀 | 정상 active 결과는 cleanup.canResume·S ready·loaded exact candidateRaw를 모두 확인한 뒤 발행한다. presentation context는 close가 지우기 전에 필요한 공개 요약만 붙잡는다. |
| `clearEditorConfirmed:2369` | runtime에는 active session이 남을 수 있고 reload에는 없음 | genuine 같은 attempt 및 journal의 session/revision/submission/scope/before/candidate 연결을 확인한다. 새 target 쓰기 없이 한 번만 결과 발행. reload의 journal은 상세 성공을 만드는 입력이 아니다. |
| `writeCandidate:1163`·`commitWorkspacePrepared:1110` | C candidate → PD preflight → genuine S preparation → durable/cleanup | Plan Undo도 이 writer를 쓴다. F 전용 feedback 티켓으로 위장하지 않는다. Plan 결과 전용 성공 callback과 일반 toast 억제의 분기를 분명히 한다. |
| `recoverWorkspaceStorage:1064` | confirmed action gate의 onSuccess를 뒤늦게 호출 | callback 실행 전에 원래 결과 owner가 살아 있고 scope/source가 같은지 확인한다. stale면 이미 저장된 Undo 사실은 유지하되 옛 화면에 `undone`을 발행하지 않는다. |
| `contextualFacts:589`, `renderContextualResult:692` | F의 receipt/editor/recovery/pending 차단 | Plan receipt owner를 반영하고 예전 K2C 결과는 중단한다. receipt가 닫힌 뒤 옛 contextual result를 복원하지 않는다. |
| `render:4224` | recovery·PD 실패는 early return, 이후 각 화면·F·toast·status | Plan result는 이 순위 뒤에만 표시한다. recovery, editor, pending, source 비교, authoring receipt가 우선하며 숨긴 결과의 focusable 자식도 없앤다. |
| `openSourceUpdateReview:1415`, `storage:6158`, `invalidateWorkspaceCallbacks:856` | source 변경·화면 전환·workspace gate | source modal 진입과 관측 drift를 명시 owner 종료로 연결한다. A→B→A가 나중 exact raw 비교만으로 살아나지 않게 한다. |
| `finishEditorClose:2007`, `restoreEditorPoint:1880` | history 소비 후 rAF로 opener/scroll 복구 | 결과 삽입이 두 번째 focus/scroll callback으로 원위치 복귀를 덮지 않게 한다. 결과 닫기 후 연결된 원래 행동/같은 Flow 행동/화면 fallback을 사용한다. |

줄 번호가 움직인 현재 파일에서는 같은 함수 이름을 anchor로 찾는다. 기존 summary 페이지의 이전/다음과 결과 닫기는 session/owner 검사만 하고 저장하지 않아야 한다. 페이지 제한 10은 표시 상수이며 전체 field/ref 수나 편집 가능 수를 제한하지 않는다.

## 3. durable 사실과 결과 발행의 세 단계

### 3.1 begin/retry

`attempt → frozen summary + before/candidate raw + source 관측 + returnPoint` 관계는 private WeakMap 안에 둔다. expectedRaw는 최초 저장에서 null일 수 있으므로 진위 비교에 truthy/falsy 치환을 쓰지 않는다. 최종 candidateRaw는 실제 attempt.serialized를 쓴다.

E2 `retryCandidateSave:619`는 **같은 attempt 객체**를 유지하면서 session.submission을 올린다. 최초 summary는 다시 계산하지 않는다. 단, 과거 submission callback을 새 retry의 성공으로 처리하지 않도록 active immutable session과 outcome.submission을 계속 확인한다. 사용자가 입력을 바꿔 attempt가 폐기되면 이전 summary record는 새 attempt의 fallback이 아니다.

### 3.2 최초 finishSave

E2 `finishSave:1062`는 `issuedOutcomes.get(outcome)===session`과 exact attempt/submission을 확인한 뒤 그 outcome을 소비한다. `outcome.status==='committed'`와 `finished.effect==='close'`는 같은 뜻이 아니다. legacy/source 권위의 후속 확인이 실패하면 durable commit이 있어도 `recovery-required`로 남는다.

따라서 record에는 ‘해당 actual outcome이 genuine finishSave에서 받아들여졌는가’, ‘durable commit인가’, ‘정리·권위가 끝났는가’, ‘결과를 이미 발행했는가’를 구별해야 한다. 단순 `status:'committed'` 입력 객체나 summary 성공으로 이 상태를 설정하면 안 된다. 성공 counter는 기존 durable 시점/`editorCommitCounted`를 유지하고 결과가 표시됐다는 이유로 다시 더하지 않는다.

### 3.3 명시 confirmed 정리

`clearConfirmedRecovery()`는 journal을 검증하고 target이 journal.candidateRaw와 같을 때 정리한다. 뒤따르는 `S.loadWorkspace()`가 ready라는 사실만으로 같은 결과를 보장하지 않으므로 **loaded expectedCheckpointRaw===보존 attempt.serialized**를 확인한다. 다른 유효 checkpoint가 끼어든 경우도 막아야 한다.

같은 runtime에서는 원래 attempt와 verified confirmed journal이 맞으면 cleanup 이후 한 번만 결과를 발행할 수 있다. 최초 finishSave를 다시 호출하는 방식은 1회 소비 계약과 충돌한다. reload에서는 해당 메모리 관계가 없으므로 ‘이전에 저장한 상태 확인’만 표시하고 새 상세 diff·새 성공 수를 만들지 않는다.

source가 달라졌어도 confirmed target을 자동 rollback하지 않는다. 정리 완료와 source 재확인/표시 가능 여부를 분리한다. 입력·저장본·기존 recovery 안내는 유지하고, 오래된 요약을 새 source에 자동 이식하지 않는다.

## 4. Plan 전용 Undo와 source 경쟁

### 실제 충돌 분기

수정 전 `undo:1610`의 `preferSource`에는 `selectedFlow && sourceCandidateStore.undo.flowRef===selectedFlow.ref`가 있다. 이 조건이면 `lastUndoLane==='workspace'`여도 source Undo를 먼저 고른다. 따라서 source 적용 이력이 있는 같은 Flow에서 Plan 결과 버튼을 일반 undo에 연결하면 다른 데이터가 바뀔 수 있다.

최소 경로는 다음과 같다.

1. 호출한 DOM의 ownerId가 현재 private result와 정확히 일치하는지 확인한다.
2. 결과가 종료되지 않았고 현재 화면/대상·workspace lane·성공 target raw·source raw/관측 epoch가 같은지 검사한다. editor/history/pending/recovery/source modal이 있으면 쓰지 않는다.
3. 실제 S authority와 C checkpoint의 단일 Undo를 확인한다. 결과 안의 별도 before-state를 사용하지 않는다.
4. `C.undoCheckpoint(workspacePacket.checkpoint)` 결과를 기존 `writeCandidate(...,'undo')`에 보낸다. source/creator writer는 호출하지 않는다.
5. confirmed+cleanup+exact adoption 뒤 현재 owner에만 `undone`을 붙인다. failed면 success diff와 실패 안내를 구별하고, uncertain이면 기존 recovery가 우선한다. old DOM의 반복 Undo는 0쓰기다.

### source guard의 의미를 좁히지 않기

S `sameAuthority:144`는 core checkpoint/legacy/journal key를 검증한다. `prepareWrite:162`의 ordinary undo entries에는 source key가 없다. PD preflight는 **현재 source와 candidate가 함께 표시 가능한가**를 묻는 읽기 gate다. 이는 **이 결과를 만든 당시 source와 같은가**와 다르다. source 제목만 바뀌어도 두 PD 조합이 모두 valid일 수 있다.

그러므로 결과 owner의 exact source raw+epoch를 Undo entry와 prepared dispatch 직전에 다시 확인해야 한다. 실제 읽기는 고정 source key를 쓰고 공개 summary/context 숫자를 권한으로 쓰지 않는다. 관측된 source ABA는 한 번 무효화한 owner를 다시 살리지 않는다. 아직 관측되지 않은 동시 두 key 변경까지 원자적으로 막았다고 주장하지 않는다.

후속 fault 시험에서는 preflight 안의 추가 source 읽기 중 drift가 발생하는 경우와, S target 쓰기 뒤 confirmed 전 source가 바뀌는 경우를 나누어야 한다. 저장을 아직 시작하지 않았다면 0쓰기, 이미 genuine durable 진행이 시작됐다면 실제 S prepared/confirmed 상태를 보존하고 old-result 성공/복구 사실을 혼동하지 않는지가 판정 기준이다. source를 rollback 대상으로 추가하거나 모든 writer의 정책을 바꾸는 설계는 이 감사에서 승인하지 않는다.

## 5. callback·화면·안내의 놓치기 쉬운 분기

- **S confirmed gate callback:** `commitWorkspacePrepared`가 보관한 onSuccess는 나중 `recoverWorkspaceStorage`에서도 호출된다. receipt를 closure에 붙잡았다는 사실만으로 현재 권한이 되지 않는다. 화면을 떠났거나 source가 바뀌었으면 결과 발행을 생략한다. target의 저장 사실은 지우지 않는다.
- **feedback 타입:** 기존 `settleContextualChange()`는 F ticket을 소비한다. Plan success/Undo를 가짜 move-order로 넘기지 않는다. Plan callback은 별도로 구분하되 기존 move feedback 동작은 유지한다.
- **예상치 않은 표시 실패:** P summary 실패는 저장 실패가 아니다. 저장 전에는 설명과 입력을 보존하고, 이미 정상 저장한 뒤 renderer 실패라면 저장된 성공을 rollback하거나 재시도 버튼으로 다시 저장하지 않는다. 상세 결과 대신 확인 가능한 짧은 저장 사실을 남긴다.
- **source modal:** `sourceUpdateSession`은 `elements.dialog.open`과 별개다. 해당 modal을 열 때 결과를 종료하거나 확실히 비활성화하지 않으면 modal 뒤의 Undo가 키보드 경로에 남을 수 있다. modal을 닫아도 종료된 옛 결과를 자동 복원하지 않는다.
- **일반 안내와 Plan 결과:** `setSaveStatus()`는 기존 hidden 상태를 다시 풀 수 있다. 성공 결과가 활성화된 뒤 호출된 후속 saved/noop 안내가 같은 성공을 재발화하지 않는지 확인한다. copy/export 실패나 recovery 오류까지 숨기는 전역 규칙은 피한다.
- **DOM 갱신:** `render()`와 summary paging은 DOM을 다시 만든다. 한 번의 저장에 같은 live 문장을 여러 차례 새 노드로 삽입하면 반복 안내가 될 수 있다. 성공 owner당 한 번의 짧은 알림과 일반 문서 diff를 분리한다.
- **history/rAF:** `finishEditorClose()`는 render 뒤 원래 opener와 scroll을 복원한다. 결과 위치를 맞추는 새 rAF가 이를 덮거나 닫힌 다른 Flow의 버튼에 focus를 옮기지 않도록 session/screen/owner guard를 유지한다.

## 6. root 패치 후 최소 독립 시험 계획

아래 12개는 등록 예정 묶음이다. 현재 새 시험 파일·실행은 없다. 브라우저 담당의 14개와 합쳐 요구 수나 실행 수를 미리 만들지 않는다.

| 계획 ID | actual 함수·genuine fixture의 판정 |
| --- | --- |
| O01 | 실제 E2 v4 부모·child 생성 → 4필드 merge의 child 요약만 집계. 원래 부모의 다른 변경은 제외, child 전체객체 merge는 P가 거절하는 positive/negative control. |
| O02 | 제목 원문동값 no-op과 같은 날짜 fixed pin을 구분. actual E2 no-op은 journal/target/결과 0, pin은 실제 summary/candidate 일치. |
| O03 | 같은 길이 CRLF 메모·구간·order-only의 실제 저장 차이와 frozen summary 일치. Flow/Item 고유 owner 수와 필드 수 구분. |
| O04 | verified 쓰기 실패 → 같은 attempt retry 성공, submission 증가. 값·요약 유지, 실패 중 결과 0, 최종 결과/논리 성공 1. |
| O05 | 첫 submission callback 지연 후 입력/다른 session/attempt 교체. old callback 결과·저장 0, 현재 입력 불변. |
| O06 | genuine committed이나 cleanup 실패 → 결과 0/confirmed 안내 → 같은 runtime 명시 정리 → target 재쓰기 0/결과 1. 중복 정리는 추가 결과 0. |
| O07 | 같은 confirmed raw로 새 runtime reload → 정리는 가능하나 상세 성공 summary와 새 성공 수 0. prepared 복구는 새 명시 저장 전 결과 0. |
| O08 | cleanup 뒤 S load에서 다른 valid checkpoint 주입 → 실제 candidate가 아닌 상태를 성공 결과로 채택하지 않음. 입력/복구 사실 보존. |
| O09 | 같은 Flow에 source Undo와 workspace Undo 모두 존재 → Plan 결과 Undo는 C/S target만 변경, source·creator bytes exact 보존. |
| O10 | source A→B, 관측 A→B→A, workspace observed ABA, 다른 화면/새 editor/source modal/결과닫기 후 old DOM replay는 0쓰기. |
| O11 | Plan Undo prepared/confirmed 오류와 늦은 action-gate callback. 실패·durable·cleanup 구분, stale owner에 undone 발행 0, source rollback 0. |
| O12 | 100개 넘는 actual 전체 diff의 정확 합계/페이지, paging·닫기 0쓰기, invalid/성공 한 live owner. Quick·raw v2 복구의 일반 안내 유지. |

모든 쓰기 시험에는 product target/journal API, source/creator/legacy/운영 sentinel을 구분해 감시해야 한다. 실제 API 수는 실행 후 보고한다. source fault를 fixture가 주입한 쓰기와 제품 writer 호출을 합치지 않는다. 이번 읽기 감사에서 네 origin·다섯 viewport·native IME/실기·보조기술을 검증했다고 표현하지 않는다.

## 7. UX 검토와 종료 범위

`flow-ux-review` 및 필수 quality-rubric/quality-gate/ux-copy를 읽고, 중복 제거·한 주 행동·원문/오류/복구 보존 기준을 적용했다. 제거 제안은 정상 저장의 중복 toast/live뿐이며 실제 오류·복구·Undo·접근 가능한 이름은 유지한다. 제품 수정 권한이 없어 이 감사에서 제거한 UI는 없다.

Rubric: User Need Fit·Execution Clarity는 ‘무엇을 저장하고 무엇을 되돌리는가’의 계약 확인에 한정했다. Content Fidelity·Source/Safety는 원문/개인 owner 분리에 한정했다. Portability는 기존 TXT/Calendar/Todo/Sheet가 요약 데이터로 바뀌지 않도록 확인했다. Cognitive Load·Copy Specificity·Accessibility/Operability는 위 연결 권고이며 브라우저 관찰이나 점수 판정은 미실행이다.

제품 담당이 B3 app을 구현하고, 별도 브라우저 담당이 시나리오를 준비 중이다. 이 문서는 그 병렬 작업의 사전 owner 감사다. 현재 사용자 HTML 889B는 열거나 생성하지 않았다. 실제 기기·관찰 사용자·commit·push·PR·Preview·Production은 모두 이 작업 범위에서 미실행이다.

## 8. 첫 구현 동결본 1192D96E 읽기 후속

root의 첫 구현 `1192D96E4FEA70525EF22F8DE6DDDD9848027B9048C10CD1ACBAB3F9A524EDFE`를 추가로 읽었다. 이 절도 VM·브라우저 실행 결과가 아니다.

확인한 보완:

- child 요약은 E2의 Item 4필드만 merge하도록 바뀌었다. §1-1의 중간본 입력 모양 문제는 코드에서 해소됐으며 실제 시나리오 검사는 별도 담당이 진행한다.
- `bindPlanAttempt`는 실제 attempt 객체와 serialized/before/source 관측을 묶고, genuine `finishSave`가 받은 committed outcome만 durable WeakSet에 표시한다. `clearEditorConfirmed`에서 finishSave를 다시 호출하지 않는다.
- Plan Undo는 명시 C Undo→S writer를 사용한다. 새 `presentation:{kind:'plan-result',isCurrent}`는 F feedback과 분리되고, PD 이후 dispatch 전에 결과 source/화면/authority를 재검사한다. 정상 generic toast 중복을 피한다.
- 결과의 scope/source/exact target/workspaceEpoch와 source modal·editor/history·recovery 우선권이 predicate로 분리됐다. 명시 정리의 늦은 callback도 같은 결과와 exact Undo target을 확인한다.

아래 두 후보는 제품 담당에게 전달했다.

**F01 · High · 관측 workspace ABA 무효화 누락.** 1192의 storage listener에서 checkpoint/legacy/recovery key 이벤트는 `interruptContextualResult()`만 호출한다. 해당 분기는 render도 하지 않는다. Plan 결과의 workspaceEpoch/sourceEpoch가 그대로인 채 관측 target A→B→A가 일어나면 `planResultCurrent()`는 다시 일치하는 A를 받아들일 수 있다. source ABA는 sourceEpoch 증가로 막지만 workspace ABA는 별도 종료가 필요하다. self-tab의 정상 writer가 storage event를 발생시키지 않는 점을 이용해 외부 관측 시 Plan result를 영구 종료하는 최소 수정이 가능하다. root가 실제 브라우저 RED를 별도 담당에게 요청했다. 이 감사에서 RED 실행을 대신했다고 세지 않는다.

**F02 · High · source-bound 결과 발행 실패의 generic Undo fallback.** `saveEditor:2356`은 `issuePlanSaveResult()`가 false면 일반 `showToast(..., envelope.undo!==null)`로 돌아간다. 그 toast의 Undo는 일반 `undo()`라 같은 Flow의 source Undo를 고를 수 있다. 정상 durable 저장 후 source 관측이 달라 상세 결과 발행만 거절된 경우를 분리해 검사해야 한다. source-bound fallback은 확인 가능한 저장 사실만 알리고 ‘해당 변경’ Undo를 만들지 않는 안이 안전하다. raw legacy/Quick의 기존 일반 Undo 동작을 없애는 제안은 아니다.

§8 시점의 남은 두 후보는 구현 판정을 위한 좁은 후속 검사 항목이다. 최초 감사 내용은 보존하고, 실제 수정·재현 결과는 해당 구현/브라우저 QA에서 갱신한다. 이 파일 작성자의 실행은 문서 검사뿐이며 `npm run docs:check`가 통과했다.
