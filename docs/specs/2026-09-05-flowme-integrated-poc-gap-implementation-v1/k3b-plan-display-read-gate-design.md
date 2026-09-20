# K3-B B1-UI — 표시 읽기와 저장 전 source 호환 gate

2026-09-05. app Plan/Item 연결 중 root가 승인한 **no-P legacy 표시 / P strict 표시 분리**를 구체화한다. [화면 연결 설계](./k3b-plan-ui-connection-design.md), [source reader](./k3b-plan-source-reader-design.md), [source-bound C](./k3b-checkpoint-source-bound-design.md)의 보완이며 새 제품 정책이나 운영 schema가 아니다. 최초에는 읽기 전용 설계였으며 root가 전문 검토 후 신규 순수 facade/test 구현을 승인했다. 기존 app·C/P/M/E2·builder·사용자 HTML 수정은 이 하위 작업에 포함하지 않는다.

## 1. 확인한 현재 동작과 보존 범위

| 실제 코드 근거 | 현재 동작 | 연결 판단 |
|---|---|---|
| [app.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)의 `state()`·`render()`·`feature-storage-status` | raw state를 M composer에 전달한다. source 장애에는 ‘현재 개인 실행 정보는 유지’ 안내와 해당 편집 차단이 있다 | source 장애를 새 정상 source view로 해석하지 않으면서 기존 실행 정보 조회를 유지 |
| [model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js)의 `loadSourceCandidateStore`·`composeSourceCandidateState` | loader는 empty/restored/corrupt/read-error/unavailable을 구분하지만 composer는 invalid/runtime 없음에 raw를 반환한다. 정상 store도 기존 task만 갱신한다 | 명시 loader 결과를 먼저 검사. 실패 store를 composer에 넣는 암묵 raw fallback 금지 |
| [personal-plan-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)의 `validateSourceBindings`·`readPersonalPlanSourceContext` | 모든 pending/deferred/effective source target를 검사하고 membership·base/mine chain 일부를 거절한다. source 합성 뒤 검증된 개인 overlay를 마지막에 적용한다 | 새 P가 없는 기존 source-update 표시를 이 strict 지원 범위로 일괄 축소하지 않음. 새 P 표시·편집에는 strict 경계를 유지 |
| [workspace-checkpoint.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js)의 `projectGroups`·`undoCheckpoint` | 기간 group은 raw id/date/time/done/order를 쓴다. Undo는 저장된 이전 state와 metadata를 복원한다 | P의 title/memo/planDate 표시 때문에 새 group API를 만들지 않음. source 갱신 전 reachable Undo의 표시 호환성도 검사 |

기존 M 표시의 추가 Item 누락·chain 처리 한계가 해결됐다고 판정하지 않는다. **legacy-display 보존은 기존 동작 유지이지 strict source parity 통과가 아니다.** 새 Plan 편집은 P가 아직 없는 Flow여도 항상 C source-bound inspector와 E2 저장 계약을 통과해야 한다. 표시 호환성을 편집 권위로 재사용하지 않는다.

## 2. 읽기 packet: 정상 표시와 제한 조회를 분리

입력은 S/C가 검증한 **실제 checkpoint**, 실제 source key를 읽은 상태와 raw, 관찰 epoch다. 먼저 C current·Undo·legacy provenance 전체 검증이 성공해야 한다. 손상된 P를 ‘P 없음’으로 처리하지 않는다. P 존재는 검증 후 `personalPlanContextV1`의 **own key**로 판단한다.

승인된 두 순수 API는 다음과 같다. 브라우저 UMD 이름은 `FlowPocPersonalPlanDisplay`, CommonJS는 신규 `personal-plan-display.js`다.

```js
projectPersonalPlanDisplay({ checkpoint, sourceRead, sourceEpoch });
// 성공: { ok:true, scope:'display-only', mode, state, sourceStatus,
//         hasReachablePersonalUndo }
// 실패: { ok:false, scope:'display-only', reason, ...진단 } — state 없음

inspectPersonalPlanDisplayCandidate({ checkpoint, candidateCheckpoint,
  sourceRead, candidateSourceRead, sourceEpoch });
// 성공: { ok:true, scope:'candidate-display-check' }
// 실패: { ok:false, scope:'candidate-display-check', reason,
//         pair?:'current'|'candidate', snapshot?:'current'|'undo' }
```

표시의 `state`는 detached/frozen read copy이며 저장 후보가 아니다. source/editor context·capability·저장 ticket을 발급하지 않는다. 실패에 정상 state를 끼워 넣지 않으며 helper는 storage를 쓰거나 자동 복구하지 않는다. `hasReachablePersonalUndo`는 존재 진단이고 Undo 저장 권한이 아니다. 상위 입력과 중첩 값의 own descriptor를 읽기 전에 검사하고 getter/손실 JSON shape는 거절한다.

| C 상태 / current P | source 읽기 | 표시 packet | 허용·차단 |
|---|---|---|---|
| C 실패 | 무관 | `workspace-blocked`, view 없음 | 기존 workspace/recovery gate. normal sidebar·task loop 진입0 |
| C 성공 / current P 없음 | empty/restored | `legacy-display`, M의 기존 합성 view | 기존 source 표시 유지. 새 Plan 편집의 별도 strict 검사 필수 |
| C 성공 / current P 없음 | read-error/corrupt/unavailable | `personal-execution-only`, 명시 raw 실행 snapshot | 아래 제한 조회만. source 원문·완료 기준·현재 계획 날짜·결과 형식·Plan/Flow Item 편집 차단 |
| C 성공 / current P 있음 | empty/restored | P bound reader 성공 시 `personal-source-display` | actual source → P overlay 순서의 같은 view를 모든 source-dependent 화면에 사용 |
| C 성공 / current P 있음 | 어떤 source 실패 또는 P reader 실패 | `source-projection-blocked`, 정상 view 없음 | 이유와 재확인. raw/M/P-only 정상 view로 대체0 |

source key의 **확인된 부재**만 `sourceRead={ok:true,raw:null}`이다. getItem 예외는 `{ok:false,reason:'read-error'}`, runtime 없음은 `unavailable`로 전달한다. raw 읽기는 성공했으나 corrupt인 경우 exact raw 문자열을 P decoder에 넘겨 `source-read-corrupt`를 유지한다. 오류의 null을 확인된 absence로 바꾸지 않는다. 빈 store를 임의 생성해 정상화하지 않는다.

### 제한 조회가 뜻하는 것

`personal-execution-only`는 raw를 다시 정상 `state()`처럼 사용하는 우회가 아니다. 화면에 ‘원문 상태를 확인하지 못했습니다. 마지막으로 저장된 이름과 개인 실행 정보만 표시합니다.’와 재확인 버튼을 두고, 같은 mode를 렌더러와 행동 guard가 모두 소비한다.

- 목록의 이름은 **마지막 저장 이름**이다. 현재 source title 또는 원문 상속이 확정됐다는 라벨을 붙이지 않는다.
- raw의 완료/완료 시각·개인 실행 date/time·폴더·기간 순서를 읽는다. sourceDate/planDate를 실행 날짜 대신 사용하지 않는다. 기존 개인 memo는 별도 개인 정보로 읽되 source 설명으로 대체하지 않는다.
- source 설명·완료 기준·원문 전체·source 기반 계획 정보·Text/Todo/Calendar/Sheet 결과를 정상 결과처럼 노출하지 않는다. raw의 source 필드가 존재해도 이번 source 읽기 성공 증거는 아니다.
- Flow 목록을 남기더라도 상세의 source 영역·Plan/Flow Item 편집·원문 비교/적용은 제한한다. Quick은 source 비의존 정보와 기존 Quick 문법을 유지한다.
- current와 Undo 모두 P가 없을 때 기존 개인 실행 행동은 **기존 S/C authority·journal guard를 통과하는 범위**에서 유지할 수 있다. 제한 조회만으로 쓰기를 허용하지 않는다. 어느 쪽이든 P가 있으면 §3의 호환 검사 실패 동안 일반 workspace/source 변경과 workspace Undo는 차단한다. 입력과 기존 Undo를 자동 제거하지 않는다.

current P가 없고 Undo에만 P가 있는 경우도 제한 조회 자체는 가능하다. 다만 그 사실을 `hasReachablePersonalUndo`로 별도 보관해 source 실패 상태에서 Undo 복원이나 새 변경을 정상 실행하지 않는다. current P가 있으면 이 제한 조회로 내려가지 않는다.

현재 strict P는 **전체 state의 모든 source record**를 검사한다. 따라서 다른 Flow의 legacy unsupported source가 있어도 current P 표시를 막을 수 있다. 이 경계를 숨기지 않는다. unaffected Flow별 정상 source 표시까지 추가로 열려면 별도 owner-scoped read 계약·exact provenance 검증이 필요하다. 임의 source store 필터링·state 부분 복제·빈 source flag로 기존 P token을 만들지 않는다. 이는 이번 최소 helper 구현 범위가 아니다.

## 3. 후보 검증: 저장 전에 current와 reachable Undo 확인

`inspectPersonalPlanDisplayCandidate`는 저장 권위를 발급하지 않는 순수 검사다. 사용자가 적용하려는 정확 후보를 먼저 만들고 **어떤 setItem/removeItem/journal 준비 쓰기보다 먼저** 검사한다. 해당 쓰기 경로의 기존 exact-byte CAS·epoch·recovery guard는 그대로 유지한다.

### 공통 검사 단위

1. 실제 현재 checkpoint와 실제 source observation의 freshness를 확인한다. 과거 cache나 UI ready flag만 사용하지 않는다.
2. current와 candidate 각각 C 전체 검증을 통과시킨다. source 변경만이라면 checkpoint는 같은 객체다.
3. 검토할 checkpoint의 current에 P가 있으면 actual `P.readPersonalPlanSourceContext({rawState: checkpoint.state, legacyBaseRaw: checkpoint.legacyBaseRaw, undo: checkpoint.undo, sourceRead, sourceEpoch})`를 실행한다.
4. checkpoint.undo에 P가 있으면 **actual `C.undoCheckpoint(checkpoint)`의 성공 후보**로 같은 P reader를 실행한다. 수동 state/undo envelope를 조립하거나 Undo에 P가 없다고 가정하지 않는다. actual Undo의 timestamp 예외와 undo:null을 그대로 검증한다.
5. current/Undo에 P가 없으면 새 strict P 표시 검사로 legacy source 지원을 좁히지 않는다. 기존 C/source validator는 계속 필요하다.

검사 대상은 **지금 읽을 checkpoint와 명시 변경 뒤 도달할 checkpoint**다. `checkpoint+sourceRead`, `candidateCheckpoint+candidateSourceRead`를 각각 올바른 pair로 검사하며 각 pair 안의 current/actual Undo에 P가 있을 때 strict 검사를 수행한다. 이전 checkpoint를 새 source와 cross-combine하지 않는다. 일반 writer가 Undo를 교체하거나 삭제를 수행한다는 이유로 이전 개인 편집의 source-read 실패를 무시하지 않는다. source 또는 workspace 후보가 만든 새 current/Undo P도 빠뜨리지 않는다. no-P 조합의 성공은 기존 source validator/CAS를 대신하지 않는다.

| 변경 lane | 정확 후보와 preflight 위치 | 실패 시 |
|---|---|---|
| source 적용 | `M.applyLocalSourceCandidate`의 changed store → writer와 동일한 `JSON.stringify(result.store)` → 현재 checkpoint의 current/Undo P를 prospective source로 검사 → source writer | 선택한 검토 결과·입력 유지. source target/journal/workspace/Undo/성공 count 변화0 |
| source Undo | `M.undoLocalSourceCandidate`의 changed store에 같은 검사. 적용 검사만 하고 Undo를 생략하지 않음 | 현재 source 유지, 자동 workspace Undo/원문 rollback0 |
| 일반 workspace 변경 | actual C/S candidate의 current/Undo를 **현재 확인된 source**로 검사. 기존 current/Undo가 P이면 해당 observation도 strict 확인 | target/journal 쓰기 전 차단. projection view를 candidate로 저장0 |
| 새 source-bound Plan 저장 | 기존 C/P/E2의 exact context/captured candidate/source guard를 사용하고 새 current/Undo display도 확인 | old token 재발급·초안 재캡처 없이 실패 사유 유지 |
| workspace Undo | actual `C.undoCheckpoint` candidate를 현재 source로 검사 | P가 복원된 뒤 읽지 못하는 상태를 미리 차단 |
| fixed multi-key 삭제 등 | 승인된 planner의 **최종 workspace+source 조합**으로 검사. transaction 중간 상태를 normal display 후보로 삼지 않음 | 기존 삭제 의미/target 외 소유는 유지. 중간 불일치를 이유로 타 자료 삭제·source 초기화0 |

source apply의 기존 app 위치는 `applySourceUpdate`의 pure result 직후, `M.writeSourceCandidateStore`보다 앞이다. source Undo도 같은 위치다. 저장 직전 source observation이 바뀌면 다시 현재값으로 검토해야 하며 이전 workingStore에 최신 raw만 붙여 덮어쓰지 않는다. preflight는 별도 key 간 원자성을 새로 보장하지 않는다. 진행 중 key drift·확정/불확실 판정은 실제 S/E2 transaction 및 source guard의 책임이다.

prepared/confirmed **복구**는 일반 쓰기와 분리한다. 해당 journal의 exact ownership·recomputation·source/recovery guard를 그대로 따른다. display가 실패했다고 prepared의 정당한 복구나 confirmed 정리를 막는 순환 gate를 만들지 않는다. confirmed를 rollback하지 않고, 복구 후에도 표시가 미지원이면 명시 gate를 유지한다. 새로운 source 초기화나 임의 이전본 선택을 복구 버튼에 넣지 않는다.

## 4. 기간·상세·결과의 소비와 cache

`C.projectGroups`는 검증된 **raw checkpoint**에서 id/date/time/done/order를 계산한다. P가 바꾸는 title/memo/planDate는 실행 위치나 membership이 아니므로 이 단계에 새 C group API가 필요하지 않다. group IDs를 받은 각 행은 **같은 read packet의 view**에서 exact local id/ref를 찾아 제목/메모 등 표시 정보만 가져온다. planDate를 task.date로 바꾸거나 group order를 P 배열 순서로 다시 계산하지 않는다.

`taskById`가 null을 반환한 뒤 기존 `renderTask`에 넘겨 빈 화면/오류를 만드는 방식은 금지한다. `render()`가 sidebar·기간/상세/결과 정상 분기에 들어가기 **전에** mode를 결정한다. source-projection-blocked이면 해당 gate로 분기한다. 제한 조회는 그 목적의 필드와 행동만 읽는 별도 renderer/guard를 쓴다.

cache key는 checkpoint 객체/whole authority, workspace 관찰 epoch, source exact raw, source 읽기 status, source 관찰 epoch를 포함한다. `adoptWorkspace`, `reloadFeatureStores`, `checkFeatureStorage('source')`, source apply/Undo/refresh, 외부 변경 관찰 때 폐기한다. 같은 raw여도 실패→정상이나 관찰된 ABA는 이전 editor token을 살리지 않는다. revision만으로 cache를 재사용하지 않는다. 렌더 cache와 저장 전 실제 key 재확인은 다른 책임이다.

## 5. 구현 후 검증할 항목 — 아직 실행하지 않음

| ID | fixture / 행동 | 종료 조건 |
|---|---|---|
| DR01 | no-P + 정상 same-membership/기존 membership·chain store | 기존 M 표시와 동일. 새 strict gate로 지원 축소0. 기존 추가 Item 표시 한계는 별도 유지 |
| DR02 | no-P + read-error/corrupt/runtime 없음, P 없음/Undo-P 두 가지 | 명시 제한 조회. source 정보·편집 정상 노출0. Undo-P에서는 관련 writer0. 오류 null을 empty로 변환0 |
| DR03 | P + source A→B + 개인 override A/빈 memo/공백/CRLF/명시 fixed date | source 뒤 P 적용, source 설명≠개인 memo, 원문·metadata bytes 불변 |
| DR04 | P + read 오류/손상/membership·chain 미지원/foreign target | 정상 view·M/raw fallback0, gate/재확인 접근 가능, 기존 입력·P 보존 |
| DR05 | current-P 및 **Undo-only-P** + unsupported source 적용/Undo 후보 | pure 후보 이후 source/workspace/journal mutation0, working resolutions·Undo 보존 |
| DR06 | 실제 workspace 변경·Undo가 P를 보존/복원하는 후보 | source 호환 preflight 전후 검사. unsupported 후보 쓰기0, 정상 후보 기존 성공 수/Undo 의미 유지 |
| DR07 | 외부 source 변경·관찰 ABA·실패→정상·late callback | cache/token stale 차단, exact 최신 read로 명시 재검토. read-only 재확인0쓰기 |
| DR08 | P 제목/메모/planDate 변경 전후 C 기간 group | raw 실행 date/time/done/id·TimelineOrder 동일, 기간·상세·결과의 표시 owner 일치 |
| DR09 | prepared 복구/confirmed 정리 + source 표시 실패 | 기존 정당한 recovery 경로 유지, confirmed rollback0, 완료 뒤도 정상 표시 불가면 gate |

최초 읽기 전용 설계 작성 뒤 `npm.cmd run docs:check`는 required files 16/local links 5,621 PASS였다. 이어 승인된 신규 순수 facade/test의 실행 이력은 별도 QA에 기록한다. 기존 app·builder·사용자 HTML은 이 하위 작업에서 수정하지 않는다. 현재 코드와 연결 문서를 읽었으며 원본 세션 대화 전체를 재조회하지 않았다. 실제 Android/iOS·OS IME·보조기술 검사 NOT_RUN, 관찰 사용자0. commit/push/PR/Preview/Production 없음.
