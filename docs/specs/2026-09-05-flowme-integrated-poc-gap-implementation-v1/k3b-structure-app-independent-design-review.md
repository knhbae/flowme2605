# B2 app 연결 독립 검토 — 구간 이름·Plan 순서·실행 목록

2026-09-06 KST. 코드와 설계를 읽어 정리한 연결 검토다. 최초 읽기 이후 root가 신규 독립 검사 작성을 승인했고, 실제 재현·수정 후 결과는 §8에 따로 기록했다. 제품·기존 테스트·builder·사용자 HTML 수정0, 브라우저0이다. 위치표의 ‘확인’은 코드 경로 확인이며 그 자체로 기능 PASS가 아니다.

## 1. 결론과 남은 연결 판단

구조 편집을 여는 경로만 v4로 바꾸면 부족하다. child 반영, 실패 재시도, prepared 복구 후 재개, 결과/TXT/CSV 네 소비 지점까지 같은 exact 계약을 사용해야 한다. 현재 작업 중인 app에서 이 분기들이 추가되고 있음을 확인했다. 최종 동결본 검증은 별도다.

상세의 기존 실행 순서와 새 Plan 전체 순서는 합쳐 저장하지 않는 것이 가장 작은 연결이다. 현재 상세의 Step별 실행 목록은 그대로 두고 같은 effective 구간 이름을 표시한다. 같은 상세 안의 기존 결과 패널과 Plan 편집 목록은 global `orderedItemRefs`를 그대로 표시한다. 이 방법은 기존 이동 기능을 삭제하지 않는다. 다만 B2 문서에 있는 ‘상세도 같은 선형 순서’는 **상세의 Plan 결과와 실행 목록을 구분하도록 명시적으로 보완해야 한다**. 문구를 그대로 둔 채 전부 충족했다고 판정하면 안 된다.

후속 root 검토에서 이 범위 구분을 채택했다. **이번 B2의 확정된 연결 범위는 ‘상세 실행 목록의 기존 정렬 보존 + effective 구간명, 별도 Plan 결과·Plan 편집의 global 순서’다.** 실행 목록까지 새 전역 순서 writer로 바꾸거나 두 순서 간 새로운 우선순위를 만들지 않는다. 전체 B2 완료 판정은 이 두 lens의 실제 UI 회귀를 통과한 뒤 한다.

## 2. 읽은 근거와 후보 시점

- [B2 reader/UI 설계](./k3b-structure-reader-ui-design.md), [Plan 구간·순서 설계](./k3b-plan-section-order-design.md), [E2 journal v4 설계](./k3b-structure-session-v4-design.md), [PD facade 설계](./k3b-structure-display-facade-design.md), [기간 동률 설계](./k3b-structure-timeline-tie-design.md).
- [P2-C 개인 편집 계약](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md): D1-012의 stable section 소유, 동일 effective 구간명, 기존 v4.1 이동 회귀.
- 원본 v4.1 spec은 이 worktree에 없음을 확인한 뒤 `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`를 읽었다. `이 목록의 순서 / 실행 날짜 / 정리 폴더` 구분, 48px 대안 조작, 같은 위치·취소·Escape·pointer cancel의 무변경이 기준이다.
- 실제 [React Flow 상세](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx#L4834), [React Plan 편집](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx#L553), [개인 overlay 합성](../../../lib/flow/personal-workspace-poc-composition.ts#L31), [서비스 구조](../../SERVICE_STRUCTURE.md), [제품 원칙](../../PRODUCT_PRINCIPLES.md).
- 실제 standalone P view, C 구조 inspector, E2 v4 exports/child/save/resume, PD current/실제 Undo 검사, app 소비자와 M의 실행 정렬을 읽었다. 원본 대화를 새로 전수 조회한 작업은 아니다.

| 읽기 후보 | SHA256 |
| --- | --- |
| app.js — 아래 최종 위치표의 기준 | `EE949753AE95808E7777ACD961067CF6A83D52B8D66DD72591F658F4E3D257C7` |
| personal-plan-display.js | `1EF9E1D95BD75E9174706D91E77028981E03DD7D3CC70F196F977A3211AE73D0` |
| plan-item-session.js | `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2` |
| model.js — 구조 결과 연결 전 읽은 후보 | `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67` |
| 사용자 HTML 두 파일 각각 | `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3` |

조사 중 root가 app/PD를 구현했다. 초기 B1 함수의 줄 번호를 최종 코드의 누락 증거로 재사용하지 않았다. 이 표는 병행 개발 중 특정 후보의 읽기 기록이지 전체 소스가 함께 동결됐다는 선언이 아니다. P/C/E2/M 후속 구현·회귀와 사용자 HTML 재생성은 이 검토 범위 밖이다. 사용자 HTML의 B1 FB17과 현재 app 후보를 같은 제품으로 평가하지 않는다.

## 3. 상세 실행 목록과 Plan 전체 순서의 충돌

### 현재 두 소유 경로

| 경로 | 실제 근거 | 순서의 의미 |
| --- | --- | --- |
| standalone 상세 실행 목록 | app `renderFlowDetail`의 `flow.steps` 반복 → `M.viewTaskIds(state(), 'flow:' + flow.id + ':' + step.id)` → `renderTaskList` | 각 Step의 실행 목록. M 778행은 time → raw task index를 기본으로 하고 `state.orders[context]`를 적용한다. |
| 기존 메뉴·키보드·drag 순서 | app `reorderPeerIds`, `commitPeerOrder`, `moveOrder`, `reorderAtPosition` → `transition({type:'reorder',context,ids})` | 같은 context의 exact peers. M 2104행은 그 목록의 순열만 저장하며 다른 목록/날짜/시간을 바꾸지 않는다. |
| B2 Plan 편집 | P의 genuine 구조 draft → E2 updateDraft → 최종 v4 save/C single transition | 전체 Flow의 full-ref 순열. A1/B1/A2가 유효하며 원래 구간 소속은 바뀌지 않는다. |
| React 상세 | Surface 4834행 이후 `buildDateGroupedTodoListViewModel`와 별도 `buildPersonalWorkspacePocResultProjection` | 실행 todos는 날짜별 lens이고 Plan 결과는 별도다. 상세 전체가 항상 무조건 Plan 순서라는 계약은 아니다. |

현재 Step별 목록을 global 순열로 **표시만** 바꾸고 기존 context를 달면 오류가 생긴다. 화면에는 A1/B1/A2가 있는데 이동의 peer는 A1/A2뿐이거나, 다음 render가 Step별 order를 다시 적용한다. 반대로 새 `flow:<id>` context 하나로 바꾸면 기존 `flow:<id>:<step>` 수동 정렬이 보이지 않게 된다. 기존 값을 삭제하지 않았더라도 기존 실행 기능의 의미가 달라진다.

‘개인 Plan 순서 위에 Step 수동 순서를 어떤 방식으로 합친다’는 규칙도 이번 연결에서 임의로 만들지 않는다. 날짜별 수동 TimelineOrder의 우선순위가 있다는 사실만으로 Step order와 Plan order의 새 합성 규칙까지 승인됐다고 볼 수 없다.

### root가 채택한 최소 연결

1. 기존 상세 실행 목록의 context·time·명시 `orders[flow:…:step]`·완료·이동·Undo는 그대로 유지한다. P가 검증한 section membership에서 effective 이름만 읽는다. readonly의 null section ID는 한 dictionary 키로 합치지 않는다.
2. 기존 결과 패널의 TXT/Todo/Sheet 및 Plan 편집 행은 같은 global 순열을 쓴다. 행마다 원래 구간 문맥을 표시하며 다시 Step별로 모으지 않는다. Calendar/기간은 날짜·시간·수동 순서의 기존 우선순위를 유지한다.
3. 기존 실행 목록과 Plan 결과가 다를 수 있는 이유는 영역 수준에서 짧게 구분한다. 행마다 owner badge나 경고를 반복하거나 세 번째 중복 목록을 추가하지 않는다.
4. [B2 설계 §4](./k3b-plan-section-order-design.md)의 상세/결과 문장이 가리키는 범위를 이 문서의 두 lens로 구체화한다. 요구별 판정에서 실행 순서와 Plan 순서를 별도 열로 비교한다. ‘모든 상세 실행 행도 global Plan 순서’라는 판정은 하지 않는다.

P2-C 37행은 상세에 동일 effective 구간명을 요구한다. v4.1 원본은 같은 목록의 실행 순서를 보존한다. 따라서 위 방법은 두 원본 요구를 함께 유지할 수 있다. 새 즉시 global writer를 연결하는 안은 전체저장 전 staged 0쓰기, 별도 실패/복구·Undo·입력 parity까지 추가로 설계해야 하므로 최소 연결로 권고하지 않는다.

### 반드시 비교할 예정 시나리오

- A 구간 A1/A2, B 구간 B1. Plan을 A1/B1/A2로 저장하면 Plan 결과는 그대로이고 각 행의 구간명이 정확하다. 실행 목록의 기존 구간 소속과 수동 순서는 그대로다.
- 먼저 A 실행 목록을 A2/A1로 수동 정렬한 뒤 Plan 순서/별칭을 저장한다. A의 실행 order bytes는 불변이며 B 목록을 바꾸지 않는다. Plan 저장 Undo가 이전 구조를 복원하고 이전 실행 순서도 유지한다.
- Plan 저장 뒤 실행 메뉴/키보드/drag/길게 누르기로 A의 실행 순서만 바꾼다. Plan metadata와 원문은 불변이고 해당 실행 변경만 Undo된다.
- 다른 날짜/시간·명시 TimelineOrder·같은 local id의 다른 사본·source rename·reload를 교차한다. Plan 순서가 실행 날짜나 source membership 변경으로 표현되지 않아야 한다.

이 목록은 계획이며 등록·실행 수가 아니다.

## 4. app 연결 위치 원장

아래 행은 위 app 후보의 함수/행 위치다. root가 이미 추가한 부분도 ‘검증할 연결’로 남긴다. 행 수를 기능 완료 수로 세지 않는다.

| 위치 | 연결·보존할 내용 | 빠뜨릴 위험과 검증 경계 |
| --- | --- | --- |
| 223–249 `sourcePacketFromLoaded`, `adoptPersonalDisplaySource`, `refreshPersonalDisplaySource`, `personalDisplayPacket` | 실제 source raw/status/관찰 epoch와 whole checkpoint cache를 유지한다. | active editor 중에는 원문을 새 baseline으로 재캡처하지 않는다. A→B→A 관찰을 same bytes로 무시하면 안 된다. |
| 251–272 `personalStructurePacket`, `personalResultProjection` | PD의 구조 view를 읽기 옵션에만 사용한다. | current 또는 Undo P가 있으면 실패를 옵션 생략/raw fallback으로 감추지 않는다. no-P 기존 composer 지원과 execution-only 분기는 구분한다. |
| 277 `preflightPersonalDisplay` | before/source와 candidate/candidateSource를 올바르게 짝지어 current/실제 Undo-P 검사. | `ok`는 표시 가능성이지 저장 권한이 아니다. source write와 workspace write의 각각 CAS/owner 검사를 대체하지 않는다. |
| 407 `resultProjectionOptions` | 기존 baseDate/selectedDate/recurrence paging/timeline resolver 보존. | 구조 순서는 별도 읽기 옵션이다. Authoring `authoringProjectionOptions`에 저장 뒤 개인 순서를 주입하지 않는다. |
| 844–895 workspace action gate | active editor, 복구, 불명확한 저장과 표시 오류에서 background mutation 차단. | 신규 Plan 순서 버튼을 일반 workspace 즉시 transition에 연결하지 않는다. |
| 1111/1156–1157/1365 일반 candidate·삭제·transition | 모든 candidate가 기존 PD preflight를 지난 뒤 기존 S/E/D owner로 간다. | 구조 metadata current/Undo가 포함됐다는 이유로 raw state를 다시 만들거나 unknown fields를 버리지 않는다. |
| 1407–1580 source review/open/apply/Undo/refresh | opening raw+epoch, observed stale latch, pre/post-render와 post-preflight 검사, exact M writer CAS 유지. | source rename 후 구조 별칭은 유지하지만 source 순서/membership 교환은 지원 범위 밖이다. old review를 latest cache로 자동 승인하지 않는다. |
| 1598 `undo` | 기존 단일 lane 선택과 실제 C Undo를 유지. | Plan 구조 전용 두 번째 Undo owner를 만들지 않는다. source Undo와 Plan Undo를 혼동하지 않는다. |
| 1779–1795 `isPersonalEditor`, `isStructureEditor`, `isSourceEditor`, `inspectEditorPresentation` | 공통 personal/source family와 exact v3/v4 dispatch를 나눈다. v4는 C 구조 inspector. | string discriminator만으로 권한을 만들지 않는다. E2 public v3는 v4 token을 거절하므로 family 추가만으로는 연결이 되지 않는다. |
| 1802–1840 오류 진단/필드 상태 | v4 captured validator와 section nonblank·trim-exact 이유를 연결한다. | captured validity는 current source 권한이 아니다. core v1 문자열 규칙을 새 section 규칙으로 강화하지 않는다. 입력을 정규화해 지우지 않는다. |
| 1855 `editorPoint`, 1873 `restoreEditorPoint` | full-ref 행의 버튼·section control selector, selection, 화면/스크롤 returnPoint를 유지한다. | 이동 뒤 index로만 복귀하면 이웃 행에 초점이 간다. 재렌더·late RAF는 active session/screen guard를 보존한다. |
| 1916 `beginEditorRoot`, 2052 `openPlanEditor` | 실제 source/epoch와 C presentation, E2 v4 발급, 두 관측의 freshness 교차 확인. | P display view로 쓰기 session을 대신 만들지 않는다. open0쓰기, 원문/기존 Undo0변경. |
| 1957 `updateEditorDraft` | 전체 v2 draft를 genuine E2 update에 넘긴다. | title/items만 새 객체로 만들면 부모 section/order가 손실된다. 동값·경계 이동은 revision/no-op을 검사한다. |
| 1968 `syncEditorUI` | 새 section/move/reset도 submitting/recovery/pending 상태에 잠근다. | generic enable loop가 첫/마지막 순서 버튼을 다시 켜지 않도록 `data-plan-order-boundary` 보존. 현재 후보에 해당 분기 있음. |
| 1998–2050 close/continue/discard | child는 자기 draft만, root는 전체 draft를 버린다. 기존 prompt/history/focus 유지. | section/order만 dirty인 상태도 확인 대상. 계속 편집하면 field/caret/부모 변경을 복구하고 writer0. |
| 2066 `saveEditor` | v4 begin/retry 선택 후 공통 durable write/finish를 사용한다. | metadata header가 v1인 core-only v4 save도 journal v4다. 32ms callback에서 같은 session+attempt 확인, double submit/late outcome의 추가 저장0. |
| 2168 `renderEditorRecoveryGate`, 2179 `checkEditorStorage` | journal.draft를 읽기 보관하고 version-family를 actual E2 decoder가 확인한다. | snapshot 전문을 UI/로그에 노출하지 않는다. prepared와 confirmed를 혼동해 blind rollback하지 않는다. |
| 2223 `resumeEditorRecovery` | v4는 전용 resume, v3는 기존 전용 resume, raw/legacy는 기존 의미 유지. | PD 표시 가능 여부를 확인하기 전에 one-use recovery token을 소비해 editor를 고립시키지 않는다. source changed/broken은 retained draft+명시 재확인. |
| 2311 이후 discard recovered / 2354 confirmed cleanup | source 재개와 저장 확정 사실을 분리한다. | confirmed는 source drift가 있어도 target rollback0. 정리 후 표시가 막히면 읽기 gate를 보이며 성공 UI를 과장하지 않는다. Quick returnPoint를 Plan 경로로 바꾸지 않는다. |
| 2379 popstate / 5626 keydown | 기존 browser Back 소비, topmost confirm, IME Escape 예외를 유지한다. | 새 section textarea의 방향키를 reorder로 가로채지 않는다. Escape 확인창에서 버림/계속만 처리한다. |
| 2505–2563 구조 control/순서/Plan renderer | editable sections만, full-ref 선형 목록, baseline 원래 순서 reset. | readonly/implicit/null ID로 편집 key를 만들지 않는다. `orderedItemRefs`를 다시 Step별 그룹으로 정렬하지 않는다. |
| 2602 `openItemEditor`, 5069 child apply | v4 create/apply wrapper와 정확한 parent/child/ref를 사용한다. | 부모 구간·순서·다른 Item·invalid 입력 보존. child apply0저장, 저장 재시도 중 child 열기는 기존 gate에 따른다. |
| 2760 `renderFlowDetail` 및 `renderItemDetail` | effective section title 공유, 실행 목록/Plan 결과의 범위 구분은 §3 참조. | raw Flow.steps/title/Task 배열을 바꿔 표시하지 않는다. execution-only에서 source-dependent toolbar/result를 새로 열지 않는다. |
| 2471/4533/5111/5115 결과 네 소비 지점 | 결과 패널, `occurrenceFromControl`의 회차 명령 검증, TXT 복사, 다운로드가 `personalResultProjection(flowId)`를 공통 소비한다. | 한 경로만 기존 `M.resultProjection(...resultProjectionOptions())`로 남으면 표시/복사 bytes가 갈라진다. 다운로드의 TXT/CSV 모두 exact ref 순서를 검사한다. |
| 4855 이후 click gate / 5063 순서 actions / 5522 input / 5559 change | active session allowlist에 새 순서 action을 포함하고 section mode/value는 owned dictionary만 수정한다. | click 전달 전 잠금, 잘못된 section/ref0변경. mode 전환 뒤 select 복귀, 값 입력 중 재렌더로 caret를 잃지 않는다. |
| 6130 storage event | v4도 source family로 오류 표시·epoch 증가 대상. | 문자열이 A로 돌아와도 old session의 stale 권한은 살아나지 않는다. 이벤트 주입 시험을 실제 두 탭 관찰이라고 표현하지 않는다. |

일반 순서 경로의 최신 위치는 `reorderPeerIds`, `commitPeerOrder`, `moveOrder`, `moveOrderToBoundary`, `reorderAtPosition` 함수명으로 다시 확인한다. 병행 UI 추가로 행 번호가 이동할 수 있으며 함수 소유 의미는 위 §3과 같다.

## 5. E2·PD에서 app이 소비할 정확한 계약

E2 actual source `C803AA…`에는 다음 v4 wrappers가 있다. 설계 문서의 ‘아직 export 아님’은 설계 작성 당시 상태이며 이 읽기 후보와 구분한다.

| UI 작업 | 실제 API |
| --- | --- |
| 열기 / 현재 owner 확인 | `createSourceBoundPersonalPlanStructureSession(storage, options)` / `checkSourceBoundPersonalPlanStructureSession(storage, session, options)` |
| Item 열기 / 부모 반영 | `createSourceBoundPersonalPlanStructureChild(storage, parent, options)` / `applySourceBoundPersonalPlanStructureChild(storage, parent, child, options)` |
| 전체 저장 / 같은 attempt 재시도 | `beginSourceBoundPersonalPlanStructureSave(storage, session, options)` / `retrySourceBoundPersonalPlanStructureSave(storage, session, options)` |
| prepared 복구 뒤 명시 재개 | `resumeRecoveredSourceBoundPersonalPlanStructureSession(storage, recovery, options)` |

각 wrapper가 actual fixed source key를 읽는다. `readSourceEpoch`는 숫자 관찰 counter만 제공한다. caller `sourceRead/sourceEpoch` packet으로 쓰기 권한을 대체할 수 없다. E2 121–147행은 root v2 exact shape와 captured validator, child의 자기 필드 shape를 구분한다. child에는 sectionTitles/order를 복제하지 않는다. 422행은 부모 전체 draft에서 해당 Item의 title/memo/schedule만 교체한다. 1019행의 resume는 genuine verified recovery, 원래 snapshot과 같은 현재 source, before/journal/legacy 재확인 후 성공할 때만 token을 소비한다.

PD actual `projectPersonalPlanStructureDisplay`는 current/실제 C Undo-P를 검사하고 P read context를 내부에서 사용한 뒤 `{ok,scope:'structure-display-only',structure}`만 반환한다. 공개 editor/save token은 없고 view를 저장 candidate로 사용할 수 없다. 내부 read context 생성까지 0이라고 주장하지 않는다. app fallback은 **current/Undo 모두 P 없음**일 때만 기존 no-P reader를 보존하는 한정 경로다.

## 6. 독립 검토의 우선순위와 UX 감산

| 우선순위 | 남겨야 할 gate | 상태 |
| --- | --- | --- |
| 높음 | 상세 실행 정렬과 Plan 정렬을 섞는 연결 금지, 문서의 lens 범위 명시 | §3 채택. 최종 UI 회귀 필요 |
| 높음 | v4 recovery가 PD 실패 뒤 token을 먼저 소비하지 않음 | SA01 실제 RED → root 최소 수정 → GREEN. 브라우저 복구는 별도 |
| 높음 | Item 구조 실패를 구간 생략으로 숨기지 않음 | SA02 실제 RED → root 명시 gate → GREEN |
| 높음 | current/Undo P fallback0, source apply/Undo CAS0우회 | 신규 4 + 기존 actual VM 11 재검 PASS. 전체 source/UI 합동은 별도 |
| 중간 | field invalid/경계 disabled/child 복귀/순서 버튼 exact-ref focus | 코드 연결 확인. 5 viewport·키보드 실제 검사 필요 |
| 중간 | 결과 네 소비 지점과 상세 구간명 동등성 | 공통 함수 연결 확인. M 구현 후보 및 bytes 비교는 별도 |

`flow-ux-review`의 감산 기준을 적용했다. 실제 제거한 UI는 0이다. 새 중복 Plan 읽기 목록이나 행별 ownership badge를 추가하는 대신 기존 실행/결과 영역의 문맥으로 구분하도록 권고한다. 구간 필드 라벨, readonly 이유, 원문 정보, 오류·보관된 입력·Undo/복구 경로는 안전한 다음 행동에 필요하므로 유지한다.

가시성·이해 가능성·조작성·복구 가능성은 최종 화면에서 평가해야 한다. 이 문서에서 수치 점수나 5 viewport PASS를 만들지 않는다. 원문 보기/TXT 결과/CSV 파일은 서로 다른 소유 자료이며 어느 하나가 정상이면 모두 정상이라고 보지 않는다.

## 7. 인계와 실행 사실

최초 읽기에서는 이 파일만 작성했다. 이후 승인된 신규 테스트 파일 하나를 추가했고 결과는 다음 절에 분리했다. 제품 변경0, 기존 테스트 변경0, 브라우저0, 실제 Android/iOS·OS IME·보조기술 NOT_RUN, 관찰 사용자0이다. 앞서 다른 하위 작업에서 실행한 P/PD/D/E2 결과는 이 검토의 실행 수로 더하지 않았다. 문서 검사 결과는 별도 인계 메시지에 기록한다.

commit·push·PR·Preview·Production은 진행하지 않았다. 기존 dirty 파일은 미소유로 유지했고 운영 키·실제 브라우저 프로필·생성 HTML을 변경하지 않았다.

## 8. 후속 actual app 독립 검사 — 2 RED와 수정 후 15 PASS

신규 파일: [personal-plan-structure-app-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-structure-app-review.test.cjs). 기존 [personal-plan-display-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-display-review.test.cjs)는 수정하지 않고 회귀에 재사용했다.

TypeScript AST로 실제 app 함수 선언을 추출해 Node VM에서 실제 M/C/P/PD/S/E2와 실행했다. 파일 저장소/브라우저/사용자 프로필은 사용하지 않았다. DOM focus와 render 효과는 최소 adapter이며, SA02만 실제 Item HTML renderer의 문자열을 검사한다. 이 검사는 화면 paint나 실제 브라우저 초점 증거가 아니다.

| 검사 | 실제 범위 | 최종 판정 |
| --- | --- | --- |
| SA01 | current no-P와 reachable Undo-P를 각각 실제 C 전이로 만든 뒤, 검증된 persisted pair에서 actual E2 v4 journal을 발급한다. current에만 있는 나중 Flow B의 actual source candidate는 current C/P에 유효하지만 실제 Undo에는 B가 없어 PD가 `source-target-missing`으로 거절한다. prepared를 실제 복구한 app은 그 one-use token을 소비하지 않고 draft/source-reopen을 유지해야 한다. 명시 재확인의 추가 쓰기0. 별도의 정상 v4 복구·한 번 재개 positive도 포함한다. | 첫 RED, 수정 후 PASS |
| SA02 | 동일한 genuine Undo-only 표시 실패에서 actual Item 상세는 구간을 조용히 생략하고 Plan 편집을 노출하면 안 된다. 정상 개인 구간 positive, 실패의 명시 상태+목록으로 나가는 행동, 쓰기0을 비교한다. | 첫 RED, 수정 후 PASS |
| SA03 | 새 section mode에서 Escape→계속 편집을 실제 close/continue reducer로 실행한다. 사라진 이전 textarea 대신 현재 select의 editingPoint와 draft가 유지된다. | 첫 실행부터 PASS. 수정 전 RED를 주장하지 않음 |
| SA04 | actual editorPoint/restoreEditorPoint가 DOM 교체·행 index 변화 뒤에도 full Item ref+direction 버튼을 선택한다. 같은 local Item id의 다른 사본 버튼을 선택하지 않는다. | 추가 후 PASS. 수정 전 RED를 주장하지 않음 |

SA01의 current/Undo pair는 **각각 실제 C가 발급한 상태를 결합한 유효 persisted checkpoint**다. C validator, current C structure inspector, actual PD Undo 실패를 모두 선행 검증했다. 이 pair를 현재 UI의 자연스러운 즉시 한 단계 Undo 이력이라고 주장하지 않는다. 한 Flow에서 단순 source 순서만 바꾸면 C presentation도 먼저 차단하므로 SA01의 전제와 다르다. prepared phase는 실제 E2가 만든 valid journal/candidate를 격리 메모리에서 중단 상태로 만든 fixture다.

| 실행 | 실제 등록·실행 수 | 결과와 후보 |
| --- | --- | --- |
| 최초 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-app-review-first-2026-09-05T15-16-00-976Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-app-review-first-2026-09-05T15-16-00-976Z.log`) | 신규 3개 | 1 PASS / 2 FAIL. app `FEE470490078D67E300396950F75E390845FB009903ACDD2A37C971A07382725`. SA01이 실제 editor를 재개하고 gate를 비웠으며 SA02가 Plan toolbar를 표시했다. 두 실패는 제품 경계 결함이고 하니스 실패가 아니다. |
| 수정 후 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-app-review-corrected-2026-09-05T15-19-11-709Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-app-review-corrected-2026-09-05T15-19-11-709Z.log`) | 신규 4 + 기존 11 = 15개 | 15 PASS / fail·skip·cancel·todo 0. app `6EABC405CA394FC7E03052DE9EDBCAF14C8144CD838B2B3EBF2FC91A6623346B`; 실행 diagnostic과 실행 후 파일 SHA가 같다. |

root의 수정은 v3/v4 resume **이전** PD current/실제 Undo preflight, 실패 시 genuine recovery 보관, Item 상세 실패 시 source/toolbar 없는 명시 gate다. 새 검사의 초기 RED 기대를 약하게 바꾸지 않았다. source/legacy/sentinel은 정확 bytes로 보존하고 메모리 adapter가 허용 pair 밖 set/remove 및 clear를 거절한다. SA01의 정상 복구 준비/target 복구 쓰기는 명시 복구 작업이므로 ‘전체 0쓰기’라고 하지 않는다. 읽기·실패 상세·recheck의 0쓰기와 구분한다.

최종 신규 테스트 SHA는 `029DD388E4159CD3A60E96C7B9FE7DF6C3BDDE3B575536EF70EF66FFE992353A`, 기존 VM 회귀 파일 SHA는 `C0A72C4656E618C391B3390FA1574410A8797880D37B685CF3FCD8EBD1D1EA92`다. 읽기 비교 원본 `output/poc-gap-implementation/k3b/before-structure-app/app.js`는 B1 `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15`다.

이번 후속 검사에서 새로운 제품 코드 변경은 root가 소유했다. 이 하위 작업은 신규 시험과 이 문서만 수정했다. 결과 15는 이전 3과 중복된 재실행이며 고유 18개로 합산하지 않는다. 생성 HTML/npm/production build/브라우저/실제 기기 검사를 이 15에 포함하지 않는다.
