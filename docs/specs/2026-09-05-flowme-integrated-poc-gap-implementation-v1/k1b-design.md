# K1-B — standalone Plan·Item의 미저장 변경 보호

작성: 2026-09-05. 상태: **코드 조사·최소 설계 완료 / 제품 구현·새 테스트·새 브라우저 검사 미실행**.

K2-A 검증과 병렬로 준비한 후속 단계다. 이번 작업은 이 문서만 새로 작성했다. K1-A/K2-A 제품 파일, standalone `app.js`·`model.js`는 수정하지 않았다. 조사 중 K2-A의 standalone 모델 작업이 진행되고 있으므로 아래 행 번호는 함수 이름과 함께 확인하고, 구현 직전에 소유권·현재 파일·저장 계약을 다시 확인한다.

## 1. 목표와 정본

J6 개인 계획 편집과 J7 취소·복구의 `K-D1-01`을 닫는다. clean에는 확인을 추가하지 않는다. dirty 이탈은 같은 닫기 판단을 거치고, Item의 미반영 입력과 부모 Plan에 이미 준비한 변경을 구분한다. 저장 중이거나 복구를 확인하지 못한 경우에는 닫기·배경 행동·Undo로 우회하지 못하게 한다.

| 근거 | 적용하는 계약 | 이번 조사 수준 |
|---|---|---|
| `D:/flowme2605/flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md` Product contract·Acceptance 2–3·8 | 네 origin의 staged Plan→Item, dirty Cancel/닫기/backdrop/Escape/Back, 저장 중 닫기 차단, focus 복귀 | 원본 전문 읽기; 과거 배포/QA 숫자는 이번 결과로 사용하지 않음 |
| `../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md` A0-2·A0-6 | React 정본, standalone fixture 동반물; 핵심 UX는 동등, 운영 writer 대신 PoC shadow만 | 기존 승인 경계 |
| `../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md` §4·6·7·9 | Item apply는 부모 draft만, Item discard는 자식만, Plan discard는 staged 전체, synthetic history·복구 상태 | 전문 읽기; 문서의 과거 PASS를 새 실행으로 세지 않음 |
| `../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md` §5, `improvement-design.md` §3.3 | K1-B 범위, 안전한 첫 초점, 부모/자식 snapshot, 같은 close intent와 5 viewport | 현재 실행 계획 |
| `../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.json` K-D1-01, `output/p3k/browser-audit.json` K-J7-standalone-dirty | standalone dirty Plan의 Escape 확인 누락 | **이전 실제 자동 브라우저 재현**; 이번 설계에서 재실행하지 않음 |

운영 `/my`, origin schema/identity, source·완료·실행일·외부 연동 writer는 변경하지 않는다. Plan anchor·포함 항목 owner·날짜 3상태·구간/순서 UI·구조화 저장 영수증의 확장은 각각 K4/K3-B 범위다. K1-B에서 새 필드를 만들거나 기존 nullable 날짜를 새로운 제품 정책으로 확정하지 않는다.

## 2. 현재 코드의 경로별 판정

모든 상대 경로는 이 격리 worktree 기준이다. 이 표는 **코드 확인**이다. 별도 표시한 과거 재현 외에 새 브라우저 PASS/FAIL을 주장하지 않는다.

### 2.1 standalone

기준 파일: `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js`.

| 경로·anchor | 현재 동작 | K1-B에서 필요한 변경 |
|---|---|---|
| `newPlanDraft` 945, `open-plan-editor` 3158 | 저장된 Flow/task에서 title·items를 만들지만 immutable baseline/session ID는 없음 | 열 때 baseline과 현재 draft를 분리; 다시 렌더한다고 baseline을 재취득하지 않음 |
| `openItemEditor` 1073–1088 | Flow Item은 부모 `planDraft.items`에서 복사; Quick은 root draft. Item baseline 없음 | 해당 Item을 여는 순간의 부모 값이 자식 baseline. Quick은 별도 root owner |
| input/change 3559–3573·3612 | title/memo/date/folder 값을 메모리 객체에 바로 넣음. 저장은 호출하지 않음 | 입력 뒤 pure dirty/validation 갱신. 입력 이벤트 자체의 storage 0 유지 |
| `closeItemEditor` 1090–1099, click 3115 | dirty 확인 없이 Item draft와 return point를 지우고 이전 screen으로 감 | 모든 close entry를 공통 adapter로 수렴; discard 확정 전 draft 보존 |
| `close-plan-editor` 3159 | `planDraft = null` 후 workspace로 즉시 이동 | baseline 비교 → clean 즉시 / dirty 확인 / locked 차단 |
| keydown 3788–3805 | Item은 close 함수 호출; Plan Escape는 별도 직접 초기화 | Escape의 직접 초기화 제거. 확인 dialog가 먼저 처리하고 전파 차단 |
| `renderPlanEditor` 1036, `renderItemEditor` 1112, `render` 2407 | Plan/Item은 `content.innerHTML`의 **전체 페이지**, 편집 overlay가 아님 | 편집 화면을 modal로 바꾸지 않음. 기존 단일 `#dialog`를 확인에만 재사용 |
| `openDialog` 2442 / `closeDialog` 2452 / native cancel 4067 | 공통 native dialog·opener element 사용. native cancel은 종류와 무관하게 닫음 | editor-confirm 역할에서 close/X/cancel/Escape를 `계속 편집`으로 해석; 원문 도움 등 다른 dialog 동작은 보존 |
| plan/item Escape가 generic dialog Escape 3847보다 먼저 실행됨 | 확인 dialog를 단순 추가하면 Escape가 뒤의 draft를 지우는 우회 위험 | 최상위 editor-confirm 분기를 먼저 처리. 한 입력을 dialog와 editor에 중복 전달하지 않음 |
| `go-workspace` 3035, `go-authoring` 3036, `set-view/open-flow/close-flow` 3098 이후 | 편집 중에도 top/sidebar 탐색이 직접 screen/draft를 바꿈 | 편집 owner가 있는 동안 외부 탐색·배경 mutation은 실행하지 않음. 먼저 기존 취소/돌아가기 경로로 닫도록 동일 owner gate 적용 |
| `undo` 790, render 2412, click 3276 | Undo 유무만 보고 활성화; 편집 owner/저장 상태를 검사하지 않음 | 모든 편집 세션 동안 전역/compact/toast Undo를 UI와 handler 양쪽에서 차단. source/creator Undo로도 우회 금지 |
| `returnFocusSelector` 326 / `focusAfterRender` 314 | 안정 token selector는 일부 있음. 실제 selection·window/container scroll snapshot은 없음 | root/child/확인 복귀점을 구분하고 정확 focus·selection·scroll 복구 |
| `history`, `pushState`, `popstate`, `beforeunload` 검색 | 이 파일에 편집 history 경계가 없음 | 화면의 `←`와 실제 browser Back을 별도 검증. 현재 브라우저 Back 지원으로 표시하지 않음 |

### 2.2 부모가 보이지 않는 직접 Item 진입

현재 `openItemEditor`는 Flow Item 상세에서 직접 열 때도 implicit `planDraft`를 만든다. 하지만 `itemEditorReturn.screen`은 Item 상세라서 취소 후 부모 draft가 보이지 않은 채 메모리에 남는다. `Plan에 반영`을 누르면 그때는 Plan 페이지로 간다. 같은 자식의 취소와 적용이 서로 다른 부모 경로를 쓰는 상태다.

React 정본의 `beginWorkspacePlanItemEditor`(`PersonalWorkspacePocSurface.tsx` 1673)는 부모 Plan을 먼저 열고 같은 Item을 연다. Item 닫기는 부모 Plan으로, Plan 닫기는 실제 외부 opener로 돌아간다. K1-B는 이 기존 계약을 따른다.

- 이미 열린 Plan → Item: Item 닫기/버리기/반영은 부모의 해당 Item 행으로 복귀한다.
- Flow/기간/결과의 Item 상세 → 편집: root Plan return point는 실제 상세/목록 위치로 캡처한다. 자식의 return point는 새 부모 Plan의 정확 Item 행이다. Item 취소도 부모 Plan으로 돌아간다. Plan 취소에서 외부로 복귀한다.
- QuickItem → 편집: 가짜 부모 Plan을 만들지 않는다. 기존 root return point로 복귀한다.
- 기존 부모 Plan이 다른 Flow를 소유하면 재사용하지 않는다. 세션·scope가 불일치하면 열기를 중단하고 현재 draft를 유지한다.

이는 원본 Plan→Item 계약 적용이며 새 개인 계획 정책이 아니다. 제목이나 화면 index로 Item을 다시 찾지 않고 기존 id/ref와 부모 Flow identity를 유지한다.

### 2.3 React에서 재사용할 의미

| 정본 코드 | 확인한 의미 |
|---|---|
| `lib/flow/flow-editor-transaction.ts` `statusForDraft` 333 | baseline과 현재 draft의 구조적 exact equality로 clean 판정; dirty-valid/dirty-invalid 구분 |
| 같은 파일 `closeActiveTransaction` 443 | Item 닫기는 item만 null, Plan 닫기는 plan/item 모두 정리; 복귀점 effect |
| 같은 파일 `request-close` 579–635 | dirty/recoverable-error는 확인, submitting/recovery-required는 차단, browser-back은 rearm effect |
| 같은 파일 `continue-editing/discard-changes` 638–649 | 계속 편집은 pendingClose만 제거; discard는 현재 active level 범위만 닫음 |
| `components/flow/useFlowEditorController.ts` 64–145 | route/query/hash, 실제 focus token, window·scroll container 캡처; 렌더/history 정리 뒤 복귀 |
| `components/flow/FlowEditorSurface.tsx` 157–223·364–409 | 안전한 첫 버튼, 확인 내 Tab 왕복, Escape는 확인만 닫기, submitting/recovery 입력·저장·retry 잠금 |
| `PersonalWorkspacePocEditorSurface.tsx` 536–548·596–601·855–864 | Plan 전체/Item만/QuickItem의 버리는 범위를 별도 문구로 표시 |
| `PersonalWorkspacePocSurface.tsx` `pushEditorHistory/closeEditorHistory` 1198–1240, popstate 1467 | 같은 URL의 editor marker, 소비 flag로 부모의 이중 닫기 방지, 완료 후 정리 |

React controller를 standalone에 통째로 포함하지 않는다. 위 순수 판단·복귀 effect의 의미를 작은 JS adapter로 옮기고 대조 시험한다. React의 현재 문구 `계속 수정/변경 버리기`와 P3-K 설계 문구 `계속 편집/변경 내용 버리기`의 의미는 같다. 이번 standalone 확인은 승인된 P3-K 문구를 사용하고, 이를 이유로 React의 전역 copy를 함께 바꾸지 않는다.

## 3. 기획·UX 상태표

### 3.1 한 가지 닫기 규칙

`취소`, 상단 `←`, 닫기 X(있는 표면만), editor-close에 해당하는 배경, Escape, browser Back은 `requestClose(reason)`에 모인다. 단, 확인창이 이미 열렸으면 최상위 확인 상태만 처리한다.

| 현재 상태 | 닫기 요청 | 화면·draft | storage |
|---|---|---|---|
| clean | 즉시 close effect | active scope만 닫고 정확 return point 복귀 | set/remove/clear 모두 0 |
| dirty-valid / dirty-invalid | discard 확인 | 모든 입력·부모 draft 유지, 안전한 첫 focus | 0 |
| recoverable-error | 사용자가 닫기를 요청하면 같은 확인 | 실패 자체는 자동 취소 아님. 기존 draft/오류/재시도 intent 유지 | 닫기 판단은 0 |
| pending-close | `계속 편집`, 확인 X/Escape/native cancel | pending-close만 제거, 입력 focus/selection/scroll 복구 | 0 |
| pending-close | `변경 내용 버리기` | 해당 범위만 폐기. 실행·저장본·다른 draft 불변 | 0 |
| submitting | 모든 close | 요청 차단, `저장 중…`; 중복 submit·배경 mutation 차단 | close가 추가 호출하지 않음 |
| recovery-required | 모든 close | 자동 닫기/reset/reload 금지, draft와 오류 보존; 자동 retry도 금지 | close가 추가 호출하지 않음 |

dirty는 입력 이벤트 발생 여부가 아니다. 값을 원래대로 되돌리면 clean이다. title 앞뒤 공백·memo 줄바꿈 등 실제 입력이 baseline과 다르면 dirty로 취급한다. 기존 commit의 trim/nullable 날짜 규칙을 dirty 비교에 몰래 섞지 않는다. invalid title/date도 버리기 확인 없이 소실되지 않는다.

### 3.2 버릴 범위와 화면 문구

제목은 `저장하지 않은 변경을 버릴까요?`, 버튼은 `계속 편집` / `변경 내용 버리기`. 추가 설명은 범위를 구별하는 아래 한 문장만 둔다.

| scope | 설명 | 버리기 뒤 보존·복귀 |
|---|---|---|
| Plan | `Flow와 할 일에 준비한 변경을 모두 버리고 원래 화면으로 돌아갑니다.` | 저장된 Flow/Item·원문·실행 상태 그대로. root opener/결과 view·날짜·scroll 복귀 |
| Plan의 Item | `이 할 일에서 준비한 변경만 버리고 Flow 계획으로 돌아갑니다.` | 부모 title·다른 Item·이 Item에 **이전 적용으로 이미 준비한 값**까지 보존; 이번 미반영 입력만 폐기 |
| QuickItem | `빠른 할 일에서 준비한 변경을 버리고 원래 화면으로 돌아갑니다.` | 저장된 QuickItem title/memo/date/folder/status 보존, root opener 복귀 |

부모가 dirty여도 현재 자식이 clean이면 자식 닫기는 즉시다. 자식 반영 직후 새로 열어 추가 입력을 버리는 경우에는 첫 반영까지 지우지 않는다. Plan 전체 discard가 그동안 적용한 모든 자식 변경까지 버리는 유일한 닫기다.

### 3.3 dialog·focus·작은 화면

- Plan/Item 전체 페이지를 유지하고, 기존 `#dialog`에 editor-discard 역할을 부여한다. 별도의 편집 modal 위에 또 modal을 쌓지 않는다.
- 확인을 열거나 닫을 때 편집 페이지 `innerHTML`을 다시 만들지 않는다. 원래 입력 DOM, 브라우저 선택과 textarea scroll을 보존한다.
- 안전 버튼에 첫 focus, Tab/Shift+Tab은 확인 안에서 순환. 확인 Escape/X/native cancel은 `계속 편집`이며 부모 close handler로 전파하지 않는다.
- 현재 전체 페이지에는 React 편집 sheet의 backdrop이 없다. 입력 밖 빈 곳 클릭을 임의로 취소로 바꾸지 않는다. 기존 단일 dialog의 backdrop을 추가 close entry로 만들 경우 그 의미는 **확인 취소/계속 편집**이며 변경을 버리는 행동이 아니다. 아직 없는 전체 페이지 backdrop을 시험한 것으로 보고하지 않는다.
- root/child return point와 확인을 연 직전 editing point를 구분한다. exact token → 재렌더된 같은 id/ref의 selector → 같은 화면 heading 순으로 복귀한다. fallback 사용 이유를 테스트에 남기며 첫 번째 동명 항목을 고르지 않는다.
- `style.css` 326–332·690–692의 visual viewport 높이 제한과 48px dialog 버튼을 재사용한다. 844×390에서도 설명·두 버튼을 dialog body scroll로 끝까지 접근 가능하게 한다. 기존 Plan/Item sticky bar가 native dialog 위로 나오거나 안전 버튼을 가리지 않아야 한다.
- 실패 안내는 오류 요약으로 focus하고 입력/재시도/취소가 함께 도달 가능해야 한다. 짧은 toast 5.2초에만 retry를 맡기지 않는다.

## 4. pure close adapter와 상태 소유

### 4.1 저장하지 않는 세션

권고 새 모듈 위치는 standalone assets 안의 `plan-item-close.js`와 짝 테스트다. 실제 이름·번들 include는 구현 착수 때 정한다. 계약 버전은 PoC in-memory 상수로 두며 localStorage schema/version이나 제품 key를 추가하지 않는다.

세션은 root Plan 또는 QuickItem, 선택적인 child Item을 갖는다. 각 transaction은 `sessionId`, level/scope identity, immutable baseline, draft, revision, `status`, pendingClose reason, return point, optional immutable save attempt를 가진다. 부모 draft와 자식 draft는 객체를 공유하지 않는다.

| pure 입력 | pure 결과/effect | 하지 않는 일 |
|---|---|---|
| open/update | baseline 보존, draft revision·clean/dirty/validation 계산 | DOM·history·storage 접근 |
| request-close(reason) | unchanged / show-confirm / close-active / announce-blocked / rearm-history | 저장, 자동 버리기 |
| continue-editing | pendingClose만 해제·restore-editing-point | 부모/자식 값 변경 |
| discard-changes | active scope 제거·restore-return-point | saved state 변경 |
| apply-item-to-parent | 대상 ref의 child draft만 부모에 반영, 부모 dirty 갱신, child 닫기 | persistent write, completion/date placement 변경 |
| submit/result | attempt와 typed outcome에 맞는 submitting/success/error/recovery 전이 | 수신하지 않은 성공/복구 추정 |

event마다 sessionId·active level·revision을 검사한다. 빠른 이중 클릭, 닫힌 세션의 toast retry, 다른 Item을 연 뒤 도착한 이전 outcome은 새로운 draft에 적용하지 않는다. shape/identity 불일치는 기존 draft를 유지하는 차단 결과다.

### 4.2 UI routing과 배경 우회

`closeItemEditor`, Plan click/Escape의 직접 `draft=null` 분기를 adapter effect 소비로 바꾼다. Item apply와 Plan 저장도 성공 effect가 scope를 닫도록 하며, 화면 함수 안의 별도 초기화를 남기지 않는다.

편집 세션 동안 top/sidebar 이동, 다른 Flow 열기, move/complete/trash/reset, global/compact/toast Undo 등 배경 action은 UI와 최상위 dispatcher 모두에서 차단한다. 이는 원본의 편집 owner 차단과 동일하다. 별도 복잡한 navigation-discard wizard를 새로 만들지 않는다. 사용자는 기존 취소/상단 돌아가기에서 현재 scope를 닫고 탐색한다. 이미 열린 확인 위에 다른 dialog를 열지 않는다. 읽기 전용 정보와 편집 관련 입력/닫기/저장은 유지한다.

이 gate가 PoC 전역 잠금으로 남지 않도록 정상 root close/success에 정리한다. recovery-required일 때만 해당 편집 복구 경계를 유지하고 자동 화면 전환·초기화를 하지 않는다. 실제 browser의 주소 입력, 탭 닫기, 앱 종료 자체를 막는다고 주장하지 않는다.

## 5. 별도 작은 gate — Plan/Quick 최종 저장 outcome

### 5.1 현재 코드의 정확한 한계

- `app.js:422 writeCandidate`는 동기 `M.writeEnvelope` 호출 전 `saving` 문구를 표시하고, catch에서 모두 `이전 내용은 그대로예요`로 안내한다. editor transaction status가 없어 UI·handler 잠금과 실패 owner가 없다.
- **`model.js:2189 writeEnvelope`에는 이미** 이전 bytes 읽기, setItem, readback 비교, catch rollback이 있다. 단순 setItem-only writer가 아니다. rollback set/remove가 던지면 `error.rollbackError`에 보관한다. **rollback 뒤 exact readback 검증은 없다.**
- `writeCandidate`는 `rollbackError`를 구분하지 않는다. 그러므로 catch를 모두 recoverable-error 또는 성공적인 복구라고 단정하면 안 된다.
- Plan commit(3159–3164)은 `transition()`이 즉시 true일 때만 닫는다. 실패 toast의 retry는 `writeCandidate(candidate,message)`만 호출하므로 원래 Plan close continuation이 재실행되지 않는다. Quick 저장(3127–3153)은 onSuccess callback이 있어 다르다. 이 차이는 코드 확인이며 새 browser 재현은 아직 없다.
- native setItem throw에서는 draft를 지우는 성공 callback을 호출하지 않아 입력 객체는 남는다. 다만 실제 before bytes 동일성은 별도 read로 검증해야 한다. write-attempt 수와 최종 data mutation을 혼동하지 않는다.

### 5.2 최소 구현 경계

K1-B 안의 **K1B-S 저장 outcome gate**로 Plan/Quick 최종 저장에만 연결한다. 일반 `writeCandidate`의 모든 호출, Authoring helper/handoff, creator/source-update writer를 전면 교체하지 않는다.

권고 adapter 입력은 immutable `{sessionId, attemptId, expectedRevision, expectedRaw, candidate}`이며 출력은 다음 의미다.

| outcome | 필요한 증거 | UI |
|---|---|---|
| committed | candidate의 정확 readback·동일 active attempt | envelope/성공 수/Undo를 한 번 확정한 뒤 scope cleanup·복귀 |
| unchanged 또는 preflight-failed | same draft / validation / stale expectedRaw / 최초 read 실패 | 0 write, 입력 유지; 오류/같은 내용 안내 |
| failed + rollback verified | 실패 뒤 현재 bytes가 exact expectedRaw | recoverable-error, 입력 유지, 같은 attempt 재시도 또는 명시 닫기 |
| recovery-required | read 불가, rollback 실패/불일치, newer external bytes | 성공·복구 단정 금지, 입력/배경/닫기 잠금; 자동 retry/reset/migration 금지 |

기존 `writeEnvelope`의 rollback 분류를 바깥에서 확인하는 것만으로 외부 newer bytes를 덮지 않는다는 보장이 나오지 않으면, **Plan/Quick 전용** 작은 writer adapter로 expectedRaw CAS·candidate readback·exact expected-candidate rollback을 구현한다. key는 기존 `M.STORAGE_KEY` 하나이며 schema·reset·일반 writer는 그대로다. rollback 전에 현재 bytes가 이 attempt의 candidate인지 검사하고, 더 새 외부 값을 덮지 않는다. 이 판단은 저장 안전성의 구현 계약이며 제품 정책을 새로 정하는 일이 아니다.

K1B-S는 구현 전에 throw-before-write, throw-after-write, wrong readback, rollback write throw, rollback wrong readback, 외부 drift를 먼저 재현한다. 이 gate를 통과하기 전에는 `submitting/recovery` 우회 방지 전체를 충족으로 올리지 않는다. 동기 writer라서 실제 UI에 보이지 않은 `saving`을 캡처했다고 주장하지 않으며, 저장 전 상태 렌더 이후 한정된 비동기 경계가 필요하면 같은 attempt 동안 중복입력/닫기를 잠근다.

실패 후 입력이 바뀌면 옛 payload retry를 그대로 실행하지 않는다. 기존 실패 attempt를 무효화하고 현재 draft의 새 명시 submit을 받는다. 입력이 그대로면 동일 attempt를 재시도하며, 성공 continuation·한 번의 닫기·focus 복귀까지 같은 owner가 확정한다. 전역 toast에 남은 callback으로 버린 Plan을 나중에 저장하지 못하게 한다.

## 6. 별도 작은 gate — 실제 browser Back

현재 standalone의 `←`는 button action일 뿐 History API가 아니다. browser Back 검증을 `closeItemEditor()` 호출이나 합성 이벤트로 대체하지 않는다.

**K1B-H history adapter**는 React의 same-URL boundary를 scoped JS로 재사용한다.

1. root Plan/Quick open과 child Item open 때 기존 `history.state`를 보존한 채 PoC editor의 session/level/scope marker를 같은 URL에 push한다. URL/query/hash·운영 route·저장 key는 바꾸지 않는다.
2. 실제 popstate는 active scope의 `request-close('browser-back')`로 전달한다. dirty 또는 locked이면 경계를 rearm한다. 중복 popstate로 부모가 닫히지 않도록 exact marker와 consume flag를 확인한다.
3. 확인 중 추가 Back은 확인 상태의 안전한 복귀로 처리하고, active editor boundary는 유지한다. 한 번의 Back이 확인과 부모 draft를 동시에 닫지 못한다.
4. 명시 close/discard/success는 자신이 만든 active marker만 정리한다. 이전 페이지나 unrelated history entry를 제거하거나 URL을 추정하지 않는다. 같은 내용의 다른 세션 marker도 재사용하지 않는다.
5. root/child cleanup 및 focus/scroll 복원은 정상 렌더와 history 소비 뒤 실행한다. 계속 편집은 route 변화 없이 입력 위치로 복귀한다.
6. file://와 로컬 HTTP 양쪽에서 History API 사용 가능 여부를 확인한다. host 제한으로 실제 Back 경계가 성립하지 않으면 해당 검사는 BLOCKED/NOT_RUN으로 남기고 in-app `←` PASS로 대신하지 않는다. Android/iOS OS Back 검사는 자동 Chromium Back과 별개다.

페이지 전체 navigation/beforeunload 경고를 새 영구 정책으로 만들지 않는다. 사용자 승인 없이 외부 host·실제 기기 설정을 바꿔 검증을 완성하지 않는다.

## 7. 실행 순서와 예정 테스트 원장

아래 항목은 **설계 항목 수**다. 아직 추가한 test case나 실행 건수가 아니다. 구현 담당은 선택한 구현 파일·신규 테스트·생성 HTML을 먼저 baseline으로 보존하고, 아래 순서별 실제 명령/개수를 따로 기록한다.

| 작은 단계 | 기획·UX/설계 | 개발 | 검증 gate |
|---|---|---|---|
| K1B-C | 세 scope·반환 위치·dirty 상태표 확정(기존 계약 재사용) | pure baseline/close/child-apply adapter, 단일 확인 dialog, event priority/배경 gate | pure close matrix + clean/dirty UI·0 write·focus·5 viewport |
| K1B-S | 실패/재시도/복구의 실제 write 결과 분류 | Plan/Quick final-save outcome 연결, attempt owner와 성공 cleanup | 저장 fault injection·stale retry·중복 submit·recovery 우회 0 |
| K1B-H | `←`와 실제 browser Back 분리 | same-URL marker, rearm/consume, root/child return restoration | 실제 page.goBack/앞뒤 이동, dialog중 Back, parent 이중닫힘0 |
| 최종 통합 | 세 작은 단계와 원본 요구 대조 | standalone 생성물 동기화; React 제품 변경 없음 | 관련 회귀 + npm test + build + 새 browser 여정 + 보호 baseline |

### 7.1 순수 모델·저장 matrix

| ID | 입력/행동 | 완료 기준 |
|---|---|---|
| K1B-M01 | Plan/child Item/Quick clean × 모든 존재하는 close reason | active만 닫음, 확인 없음, pure 입력 불변·write 0 |
| K1B-M02 | title/memo/date, Quick folder 변경·원복·invalid 값 | exact baseline equality로 clean 복귀; invalid dirty도 확인 대상 |
| K1B-M03 | 부모 dirty + 자식 clean/dirty → 계속/버리기 | child discard 후 부모 객체 값·revision·return point 보존 |
| K1B-M04 | child A 적용→A 다시 수정/버림, child B 적용→Plan 버림 | 적용은 부모 메모리만·storage0; child 버림은 최근 미반영만, Plan 버림은 전체 staged만 |
| K1B-M05 | 같은 제목/다른 Flow·origin 4종/authored/Quick | id/ref·부모 scope 유지, 제목/index 기반 재결합0, Quick 가짜 Flow0 |
| K1B-M06 | pending-close에서 반복 Escape/X/Back/빠른 이중 discard | 최상위 한 번 처리, 부모까지 연쇄 초기화0 |
| K1B-M07 | submitting/recovery에서 close/update/Undo/move/다른nav | 새로운 mutation0, draft/attempt 보존, 전역 우회0 |
| K1B-M08 | read 실패/stale expectedRaw/noop/validation 실패 | set/remove/clear 호출0, 성공 수0 |
| K1B-M09 | state write/readback 실패 + rollback 성공 | before bytes exact, draft 유지, recoverable-error; attempted writes 별도 계수 |
| K1B-M10 | rollback throw/틀린 readback/외부 newer bytes | recovery-required, newer bytes 덮기0, 성공/자동reset0 |
| K1B-M11 | 실패→동일 attempt retry→성공 | 저장 확정1·cleanup1·Undo1, 같은 scope, 이전 실패를 성공 mutation으로 세지 않음 |
| K1B-M12 | 실패→입력변경/명시discard/새session→옛 retry | stale attempt write0, 다른 문서/버린 draft 재저장0 |
| K1B-M13 | history marker가 foreign/중복/없음, child pop/confirm pop | exact 소유 marker만 처리, 현재 URL 보존, 부모/외부 entry 삭제0 |
| K1B-M14 | 정상 Plan/Quick 저장·Undo·decode/reload | 기존 source/completion/date placement·원문·다른copy 불변; 기존 writer/Undo 의미 회귀 |

### 7.2 브라우저 여정

| ID | 실제 조작 | 관찰할 결과 |
|---|---|---|
| K1B-B01 | 기존 네 origin+authored의 Plan clean 취소/상단 back | 확인 없이 원래 Flow opener·view/date/scroll, storage0 |
| K1B-B02 | Plan title dirty → 취소 → 계속 → Escape → 버리기 | 첫 focus 안전버튼; 입력 selection/scroll 유지; 버림 뒤 saved state 불변 |
| K1B-B03 | 부모 title/A 반영 후 B title/memo/date 수정 → 취소/버림 | B만 폐기, 부모/A 보존. 다시 Plan 전체 버리면 전체 staged만 폐기 |
| K1B-B04 | 기간/결과 Item 상세에서 직접 편집→취소→Plan취소 | Item→부모 Plan→원래 Item/결과 날짜로 복귀; 숨은 stale parent0 |
| K1B-B05 | Quick root title/memo/date/folder dirty/원복/버림 | 가짜 Plan없음, 상태/폴더 원복·source write0, exact opener |
| K1B-B06 | dialog Tab/Shift+Tab·Escape·X/native cancel·배경 | 최상위만 닫음, 뒤의 draft 유지, focus 누락0; 없는 backdrop 경로는 적용대상아님 표시 |
| K1B-B07 | 실제 browser Back: clean/dirty/child/확인중/locked | same-URL 경계, rearm, 부모 이중닫힘0; `←` 결과와 별도 기록 |
| K1B-B08 | Plan/Quick 실패→동일재시도→저장/옛toast재시도 | 오류·draft·retry 접근, 성공 뒤 정상 cleanup/복귀1, 버린내용 재저장0 |
| K1B-B09 | 편집중 top/sidebar/Undo/toast/move 및 저장중 doubleclick | handler도 차단, background write0, 정상 닫기 후 gate 해제 |
| K1B-B10 | 390×844·375×812·844×390·1024×768·1440×900에서 B02/B03/B08 핵심상태 | overflow0, console/page error0, 마지막 필드·오류·확인양쪽버튼·retry 중앙 hit-test, 키보드 접근·focus 복귀 |

운영 sentinel은 probe를 켜기 전에 준비한다. 각 취소·Item 적용 구간에서 허용 prefix를 포함한 set/remove/clear 호출이 0인지 검사한다. Plan/Quick 성공 저장은 기존 target 쓰기만 측정하고, 실패 시험은 시도/rollback 호출과 최종 before bytes·성공 mutation 수를 분리한다. 전체 여정 전후 PoC prefix 밖 `flow:*` key/value exact equality를 별도 증거로 남긴다.

관련 기존 회귀: `lib/flow/flow-editor-transaction.test.ts`, `components/flow/{FlowEditorSurface,useFlowEditorController}.test.*`, `personal-workspace-poc-{plan-editor,receipt,state,storage-transaction}.test.ts`, `tests/e2e/personal-workspace-stage-3-runtime.spec.ts`의 976행 이후, standalone 기존 모델/실제 브라우저 검사. 과거 Stage 3 report HTML 검사를 새 제품 E2E 수에 섞지 않는다.

## 8. 종료 기준과 이 설계의 한계

K1B-C/S/H 모두 실제 구현·검증되기 전에는 K1-B 전체를 충족으로 바꾸지 않는다. 특히 단일 확인창만 추가한 상태, sync throw만 시험한 상태, 내부 `←`만 시험한 상태는 각각 부분 완료다.

이번 작업은 원본/후속 계약 및 코드 조사, 상태·소유·focus/history/저장 outcome 설계, 예정 검증 원장을 완료했다. 제품 변경 0, 신규 test 파일 0, 새 자동 테스트 실행 0, 새 브라우저 실행 0이다. 실제 Android Chrome/iOS Safari/OS Back/가상키보드/보조기술 검사는 NOT_RUN, 관찰 사용자 0명이다. commit/push/PR/Preview/Production은 이 작업에서 실행하지 않았다.

현재 새 제품 정책을 요청할 사항은 없다. 구현 과정에서 기존 날짜/anchor/포함 owner나 운영 저장 경계를 바꿔야만 해결된다는 근거가 생기면 그 지점만 별도 결정 gate로 되돌린다. 그렇지 않으면 위 순서로 기존 계약을 구현한다.
