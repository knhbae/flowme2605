# P35 Round 2 개발 순서와 티켓

> 상태: `OWNER_APPROVED_LOCAL_HANDOFF`
> 목적: 승인 후 개발자가 작은 PR 단위로 순서대로 실행할 수 있는 작업 명세
> Owner 승인: 2026-08-04 · `Q1-B / Q2-B / Q3-B` · `bounded fix`
> 현재 gate: `G0/G1 완료` · [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md) 기준으로 `P0-01`부터 시작
> 전체 운영 정본: [G0/G1·P0-01~10·P1-01~04·V1 단계별 목표](../../specs/2026-08-04-p35-round2-bounded-ux-correction/full-program.md)
> 원칙: 한 PR = 한 검증 가능한 결과, 데이터 계약 선행, UI 후행, migration 별도

## 1. 착수 전에 반드시 닫을 두 gate

### G0. Owner 범위 승인

**상태:** 완료.
**입력:** [Owner 결정안](./02-p35-round2-owner-decisions-ko.md).
**기록:** 2026-08-04 · Q1-B/Q2-B/Q3-B · `bounded fix` · Owner 현재 세션 승인.
**완료 기준:** 세 질문과 scope, 승인일, active spec 경로가 기록됨.
**중지 조건:** 답을 추론해 일반 `/my`, 공개 내보내기, navigation 카피를 먼저 바꾸려는 경우.

### G1. 정본 승격

**상태:** 완료.
**입력:** 승인된 이 패키지와 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md).
**완료 내용:**

1. active spec을 `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/`에 둔다.
2. 이 문서의 승인된 bounded 티켓과 strict order를 연결한다.
3. `DECISIONS.md`에 새 superseding decision을 추가한다. 옛 결정을 고쳐 쓰지 않는다.
4. `STATUS.md`, `ROADMAP.md`, `docs/specs/README.md`에 같은 scope와 owner를 연결한다.
5. 실제 동작이 바뀌는 구현 PR에서만 `SERVICE_STRUCTURE.md`를 갱신하도록 계획한다.

**완료 기준:** 활성 spec 하나, owner 하나, rollback 경로 하나, 측정 가능한 acceptance 하나. 다음 실행 티켓은 `P0-01` 하나다.
**중지 조건:** `flow-mvp`의 현재 dirty 문서를 소유권 확인 없이 덮어쓰는 경우.

## 2. 엄격한 merge 순서

| 순서 | ID | 결과 | 선행 | 독립 merge 가능 |
|---:|---|---|---|---|
| 0 | G0 | Owner 3결정 · B/B/B 기록 완료 | 없음 | 아니오 |
| 1 | G1 | active spec·정본 gate · 로컬 인계 완료 | G0 | 아니오 |
| 2 | P0-01 | fixture·행동 소유권·loss schema 기반 | G1 | 아니오 |
| 3 | P0-02 | Flow Map count parity hard fail 제거 | P0-01 | 아니오 |
| 4 | P0-03 | Item 완료 기준 UI/payload parity 제거 | P0-02 | 아니오 |
| 5 | P0-04 | lifecycle reducer·atomic save·idempotency | P0-03 | 아니오 |
| 6 | P0-05 | 공통 editor transaction 기반 | P0-04 | 아니오 |
| 7 | P0-06 | 공개/저장 Plan·Item editor surface 통합 | P0-05 | 아니오 |
| 8 | P0-07 | capability 결과 preview·행동 소유권 UI | P0-06 | 아니오 |
| 9 | P0-08 | 저장 계획 중심 `내 Flow` IA | Q2-B, P0-07 | 아니오 |
| 10 | P0-09 | 전송 확인·receipt·실패 복구 | Q1-B, P0-08 | 아니오 |
| 11 | P0-10 | 통합 회귀·hard fail 0 gate | P0-09 | 아니오 |
| 12 | P1-01 | Item·Map·시작일 시각 감산 | P0-10 | 아니오 |
| 13 | P1-02 | 승인된 카피·도움/주의 단계 적용 | Q3-B, P1-01 | 아니오 |
| 14 | P1-03 | 형식별 field parity 보강 | P1-02 | 아니오 |
| 15 | P1-04 | 극단값·접근성·legacy 회귀 | P1-03 | 아니오 |
| 16 | V1 | 제한 사용자 관찰 | 내부 gate 통과 | 구현과 분리 |

모든 단계는 표 순서대로 직렬 실행한다. 병렬화가 필요하면 구현 전에 active spec과 [전체 프로그램](../../specs/2026-08-04-p35-round2-bounded-ux-correction/full-program.md)을 별도 승인으로 수정한다.

현재 첫 실행은 `P0-01` 하나다. G0/G1 완료는 구현·commit·push·PR·merge·deploy 권한을 자동으로 부여하지 않는다.

## 3. 공통 티켓 양식

모든 활성 티켓은 다음 필드를 채운다.

```text
ID / 제목:
사용자 결과:
해결하는 U ID / hard fail:
선행 결정·의존성:
현재 재현 근거:
구현 범위:
후보 touchpoint:
데이터·상태 효과:
정상 acceptance:
실패·취소 acceptance:
검증 명령·시나리오:
rollback:
명시적 제외:
완료 증거:
```

후보 touchpoint는 현재 review branch 기준의 탐색 시작점일 뿐이다. active branch에서 `rg`와 기존 tests로 실제 owner를 다시 확인한 뒤 수정한다.

## 4. P0 티켓 상세

### P0-01. 결과 계약·소유권·fixture 기반 고정

**사용자 결과:** 이후 UI가 다른 숫자·다른 데이터를 약속하지 않는 공통 기반을 만든다.
**해결:** U01, U05, U07, U09; hard fail 1~3의 공통 원인.
**선행:** G0, G1.
**PR 경계:** UI를 바꾸지 않는 계약·fixture·테스트 PR.

#### 구현 순서

1. 현재 `source/base → public session draft 또는 personal overlay → effective authoring snapshot → execution overlay → effective execution snapshot → projection → artifact/receipt` 경로를 실제 함수와 storage key 기준으로 inventory한다.
2. lifecycle × capability × scope 행동 소유권 표를 활성 spec에 고정한다.
3. 결과 형식 공통 loss schema를 정의한다.
   - preserved/transformed/omitted 필드
   - eligible/held/unavailable count
   - 날짜·시간대·반복·완료 기준·메모·warning/resource/source 처리
   - artifact version·scope·receipt
4. 다음 fixture를 stable ID로 만든다.
   - 날짜가 모두 있는 계획
   - 날짜가 전혀 없는 계획
   - dated/undated mixed 계획
   - Memo 자연 목적지
   - 반복 routine
   - source-backed Map의 `save_all / choose_child / review_hold`
   - 현재 7↔8 불일치를 재현하는 Map
   - 완료 기준·메모·경고·출처가 있는 Item
   - legacy saved copy와 missing base
5. 같은 effective snapshot에서 모든 count를 계산하는 contract test를 먼저 실패 상태로 추가한다.

#### 후보 touchpoint

- `lib/flow/effective-flow-snapshot.ts`
- `lib/flow/effective-flow-export.test.ts` — 현재 snapshot→export builders 경계 test; import를 따라 실제 owner 확인
- `lib/flow/export.ts`
- `lib/flow/flow-experience-projection.ts`
- `lib/flow/export-scope.ts`
- `lib/flow/artifact-recommendation.ts`
- `lib/flow/flow-map-action-contract.ts`
- 대응 `*.test.ts`

#### Acceptance

- 한 fixture에서 public preview, saved detail, export scope가 같은 Item ID 집합을 사용한다.
- 날짜 없는 Item은 Calendar eligible이 아니다.
- held/unavailable Item은 누락이 아니라 이유와 count를 가진다.
- UI나 route 동작은 아직 바뀌지 않는다.

#### 실패·취소

- schema/version을 읽지 못하면 자동 rewrite하지 않고 test가 실패한다.
- fixture가 현재 데이터를 발명하지 않고 실제 repo 구조를 직렬화한다.

#### 검증

```powershell
npx.cmd tsx --test `
  lib/flow/effective-flow-snapshot.test.ts `
  lib/flow/effective-flow-export.test.ts `
  lib/flow/flow-experience-projection.test.ts `
  lib/flow/export-scope.test.ts `
  lib/flow/artifact-recommendation.test.ts `
  lib/flow/flow-map-action-contract.test.ts

npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
git diff --check
```

실제 script runner가 다르면 package scripts에 맞춰 조정하되 동일 contract를 실행한 이유와 증거를 남긴다. 실행하지 않은 명령은 PASS로 보고하지 않는다.

**Rollback:** 새 contract/fixture만 제거하면 기존 UI가 그대로 동작해야 한다.
**제외:** 새로운 export provider, OAuth, Map migration, 시각 변경.
**완료 증거:** contract 표, fixture 목록, test output, 변경 전/후 count diff.

### P0-02. Flow Map applied/preview parity hard fail 수정

**사용자 결과:** “7개 적용” 후 주 결과에서 8개가 보이는 모순이 사라진다.
**해결:** U05, Codex hard fail #1.
**선행:** P0-01 PASS.
**PR 경계:** Map parity만 수정. 3칸 시각 감산과 legacy migration은 포함하지 않는다.

#### 구현 순서

1. fixture로 7↔8 경로를 단위·브라우저에서 재현한다.
2. editor selection, save payload, effective snapshot, primary preview가 사용하는 Item ID 집합을 비교한다.
3. 누락/추가된 ID가 adapter, held decision, child default 중 어디서 생기는지 기록한다.
4. count만 덮어쓰지 말고 공통 effective snapshot을 모든 downstream consumer에 전달한다.
5. `save_all`, `choose_child`, `review_hold`, risk, conflict, source relation을 보존한다.

#### 후보 touchpoint

- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `lib/flow/effective-flow-snapshot.ts`
- `lib/flow/flow-map-action-contract.ts`

#### Acceptance

- 선택 수 = 적용 수 = primary preview count = 저장 payload count.
- hold/unavailable이 있으면 각 count가 같은 명명 규칙으로 분리된다.
- old Map fixture를 열기만 해도 데이터가 다시 쓰이지 않는다.

#### 실패·취소

- partial localStorage write를 성공으로 표시하지 않는다.
- 저장 중 Back/retry가 다른 child decision을 만들지 않는다.

#### 검증

- Map 관련 unit tests
- S10 Map scenario를 390px와 1440px에서 재현
- storage 전/후 Item ID 목록 비교

**Rollback:** Map parity 변경만 되돌릴 수 있어야 함.
**제외:** 3칸 UI 삭제(P1-01), `/flow-maps` 제거, schema migration.
**완료 증거:** 동일 fixture의 before 7/8, after N/N 스크린샷·payload diff·test.

### P0-03. Item 완료 기준 UI/export parity hard fail 수정

**사용자 결과:** “체크리스트에 완료 기준이 포함된다”는 안내와 실제 결과가 일치한다.
**해결:** U04, U07; Codex hard fail #2.
**선행:** P0-02 PASS.
**PR 경계:** Item portable list/checklist payload 계약만 수정.

#### 구현 순서

1. UI 약속 문자열과 실제 `my-flow-step-export` payload를 같은 fixture로 캡처한다.
2. 완료 기준의 canonical field와 빈 값/긴 값/다중 줄 처리 규칙을 확인한다.
3. 사용자-facing 외부 결과는 `할 일·체크리스트` 한 계열로 정리하고 내부 Today/Todo lens와 분리한다.
4. loss schema가 보존을 약속하면 payload에 deterministic 형식으로 포함한다. 지원하지 못한다면 구현을 중지하고 active decision을 요청하며, 개발자가 임의로 UI나 loss declaration을 낮추지 않는다.
5. 메모·warning/resource를 완료 기준으로 잘못 합치지 않는다.

#### 후보 touchpoint

- `lib/flow/my-flow-step-export.ts`
- `lib/flow/my-flow-step-export.test.ts`
- `components/flow/FlowExportPanel.tsx`

#### Acceptance

- 완료 기준이 있는 Item은 portable list 결과와 preview에 동일하게 나타난다.
- 없는 Item에 빈 라벨을 만들지 않는다.
- 긴 한국어·줄바꿈·특수문자가 잘리지 않거나 escape되지 않는다.
- 내부 완료 상태와 완료 기준 텍스트가 섞이지 않는다.

#### 검증

```powershell
npx.cmd tsx --test lib/flow/my-flow-step-export.test.ts lib/flow/my-flow-cross-flow-todo.test.ts lib/flow/export-scope.test.ts
```

**Rollback:** payload field addition과 카피를 한 PR에서 함께 되돌릴 수 있어야 함.
**제외:** 전체 export UI 재설계, remote Todo provider.
**완료 증거:** fixture preview와 실제 생성 결과의 field-by-field 표.

### P0-04. lifecycle reducer·atomic save·direct handoff

**사용자 결과:** 공개 수정→저장→방금 저장한 계획으로 이동하는 동안 상태가 섞이거나 중복 저장되지 않는다.
**해결:** U01, U07, U08, U09; hard fail #3의 저장 경계.
**선행:** P0-03 PASS. P0-01~02의 acceptance도 현재 ref에서 green이어야 한다.
**PR 경계:** 데이터 상태와 route handoff. My Flow 전체 IA·시각 재설계는 제외.

#### 구현 순서

1. 공개 base, session draft, personal overlay, execution state, artifact receipt를 명시적 state로 분리한다.
2. save intent에 stable source key + user copy key + request idempotency key를 연결한다.
3. 같은 source의 기존 저장본이 있으면 write 전에 `덮어쓰기 / 사본 만들기 / 취소`를 명시적으로 선택하게 하고 자동 merge·자동 overwrite를 금지한다.
4. 선택한 분기의 base reference와 overlay를 atomic하게 저장한다. `취소`는 무변경이고 partial write는 success가 아니다.
5. 성공 시 selected saved plan route/state로 이동하고 `saved/count/undo/source relation` transient save banner를 한 번만 전달한다.
6. 새로고침·Back·double click·같은 source 재진입에서 기존 성공 결과를 복구한다.
7. transient save banner가 사라져도 saved plan 자체의 마지막 저장 정보는 남는다.

#### 후보 touchpoint

- `components/flow/AppClient.tsx`
- 현재 public detail/save handler
- 현재 My Flow storage/reducer와 receipt route
- `lib/flow/effective-flow-snapshot.ts`

#### Acceptance

- 성공 후 별도 save-only 결과 화면이 아니라 선택 계획 상세가 열린다.
- 기존 저장본이 있으면 선택 전 write가 0이고 `덮어쓰기 / 사본 만들기 / 취소` 중 선택한 분기만 실행된다.
- 더블 클릭·retry로 사본이 하나만 생긴다.
- 저장 실패 시 public draft와 기존 saved copy가 모두 보존된다.
- browser Back으로 같은 저장을 다시 실행하지 않는다.

#### 실패·취소

- storage quota, stale base, malformed legacy, simulated partial write를 각각 테스트한다.
- save 시작 전 Cancel은 무변경, 시작 후 중단은 idempotent recovery.

**Rollback:** 새 handoff flag를 끄면 기존 P35 post-save path로 복귀.
**제외:** 일반 `/my` 첫 화면 변경(P0-08), editor 시각(P0-06).
**완료 증거:** state transition log, storage before/after, duplicate test, route capture.

### P0-05. 공통 editor transaction 기반

**사용자 결과:** 공개와 저장본 편집에서 취소·뒤로가기·오류가 같은 규칙으로 작동한다.
**해결:** U08, U09.
**선행:** P0-04.
**PR 경계:** headless transaction/state machine과 tests. 대규모 시각 변경 제외.

#### 구현 순서

1. `context=public-draft | saved-overlay`, `level=plan | item` 입력을 갖는 공통 transaction adapter를 정의한다.
2. `clean / dirty-valid / dirty-invalid / submitting / success / recoverable-error` 상태와 이벤트를 구현한다.
3. origin route/query/scroll/focus와 nested Item return point를 저장한다.
4. Cancel/X/backdrop/Escape/browser Back의 한 계약을 구현한다.
5. validation/runtime/storage 실패에서 draft를 유지한다.
6. public commit은 session projection, saved commit은 overlay storage에만 effect를 보낸다.

#### Acceptance

- 같은 event matrix가 public Plan, public Item, saved Plan, saved Item에 재사용됨.
- submitting 중 이중 commit·닫기로 partial state를 만들지 않음.
- nested Item Back은 상위 Plan draft를 보존.
- focus return과 scroll restore가 자동 test로 확인됨.

**Rollback:** 새 adapter를 끄고 기존 editor handler로 복귀 가능.
**제외:** 카피 전면 전환, format preview, My Flow IA.
**완료 증거:** reducer test table과 네 context의 event parity.

### P0-06. 공개·저장 Plan/Item editor surface 통합

**사용자 결과:** 화면 아래에 갑자기 붙는 편집 영역 대신 예측 가능한 하나의 편집 문법을 쓴다.
**해결:** U04, U08, U09.
**선행:** P0-05.
**PR 경계:** editor surface와 context adapter. lifecycle reducer는 변경하지 않는다.

#### 구현 순서

1. 모바일 full-height sheet의 공통 field order와 sticky action을 만든다.
2. wide에서는 right inspector/dialog를 허용하되 동일 schema·events를 연결한다.
3. 공개/저장 editor의 상태와 commit을 `unsaved-public-draft / apply-public-draft / saved-personal-copy / save-personal-overlay` semantic role로 구분한다. P1-02 전에는 현행 사용자 문구를 유지하고 목표 문구는 inventory에만 기록한다.
4. Item editor를 2단계로 열고 상위 Plan draft로 되돌아가게 한다.
5. 중요한 조건·출처·경고를 editor 안에서도 보존한다.
6. 390px keyboard/viewport, 1024px, 1440px에서 CTA 가림·scroll lock·focus trap을 검증한다.

#### 후보 touchpoint

- `components/flow/AppClient.tsx`
- 현재 public adjustment/editor components
- 현재 My Flow Flow/Item editor components
- 공통 dialog/sheet primitives

#### Acceptance

- 하단 인라인 편집 블록이 main content와 동시에 혼동되게 노출되지 않음.
- mobile/wide가 같은 commit 효과를 사용.
- destructive close는 dirty guard, important warning은 icon-only가 아님.
- `완료`를 save/close 의미로 사용하지 않음.

**Rollback:** surface flag를 끄면 기존 editor UI, 데이터는 그대로.
**제외:** 모든 필드를 한 화면에 펼친 고급 editor, AI 자동 재계획.
**완료 증거:** 네 editor context × 3 viewport 캡처와 keyboard path.

### P0-07. capability 결과 preview·행동 소유권 UI

**사용자 결과:** 한 종류만 보이거나 빈 다섯 형식을 보지 않고, 만들 수 있는 결과와 필요한 조건을 이해한다.
**해결:** U01, U07, U09; hard fail #3의 행동 중복.
**선행:** P0-06 PASS. P0-01~05의 acceptance도 현재 ref에서 green이어야 한다.
**PR 경계:** 공개 상세/preview와 saved entry의 정보·행동 역할. 실제 transfer 처리(P0-09)는 제외.

#### 구현 순서

1. P0-01 capability 결과를 `primary / available / conditional / unavailable` view model로 연결한다.
2. 주 결과는 실제 content preview를 표시하고 보조 결과는 최대 2개만 즉시 노출한다.
3. conditional은 필요한 입력과 예상 결과 수를 보여주고 editor로 연결한다.
4. public main action을 `save-to-personal-plan`, secondary를 `edit-public-draft` semantic role로 고정한다. P1-02 전에는 현행 사용자 문구를 유지하고 Q3-B 목표 토큰 `내 계획에 저장 / 수정`은 inventory에만 기록한다.
5. 저장 상세는 `execute-saved-result` primary 하나와 `edit-saved-plan`, `transfer-to-own-tool` secondary hierarchy를 사용한다. P1-02 전에는 현행 사용자 문구를 유지하고 `수정 / 내 도구로 옮기기` 목표 토큰은 inventory에만 기록한다.
6. Q1-B의 clean·eligible·local 조건을 public quick-result branch의 feature flag/token과 strict guard로 연결한다.

#### 후보 touchpoint

- `lib/flow/artifact-recommendation.ts`
- `components/flow/FlowExportPanel.tsx`
- `components/flow/AppClient.tsx`
- public detail/result preview components

#### Acceptance

- 날짜 없는 fixture에서 Calendar 0이 첫 탭으로 나오지 않음.
- 고정 5형식을 만들지 않음.
- 동일 효과의 edit/export CTA가 같은 화면에 반복되지 않음.
- public preview와 actual saved transfer가 카피·범위·receipt로 구분됨.

**Rollback:** capability UI flag off에서 기존 result panel로 복귀.
**제외:** provider 연동, saved transfer 처리, 고급 format 설정.
**완료 증거:** fixture별 primary/available/conditional/unavailable 표와 캡처.

### P0-08. 저장 계획 중심 `내 Flow` IA — Q2-B 전용

**사용자 결과:** `내 Flow`에 들어갈 때 저장한 계획의 위치가 항상 예측 가능하고, 저장 직후 방금 저장한 계획을 바로 찾는다.
**해결:** U03, U07, U08.
**선행:** Q2-B, P0-07 PASS. 앞선 lifecycle/editor acceptance도 현재 ref에서 green이어야 한다.
**PR 경계:** general shell·0/1/5/20 상태·selected detail. 실행/Calendar 엔진 재작성 제외.

#### 구현 순서

1. 현재 P35 일반 `/my`를 기준 캡처·fixture·flag-off acceptance로 보존한다.
2. 새 shell을 `compact Today(있을 때만) → recent/active → saved plans`로 구성한다.
3. 0/1/5/20 fixture별 search/filter/empty-state 노출 규칙을 구현한다.
4. save deep-link는 selected plan을 열고 transient save banner를 한 번 표시한다.
5. Today는 같은 execution state에서 파생하며 저장 위치나 별도 canonical이 아니다.
6. route/query/selection/scroll 복구와 flag rollback을 검증한다.

#### Acceptance

- 0개에서 CTA 1개, 1개에서 search 없음, 5개에서 주 행동 경쟁 없음, 20개에서 최소 검색/상태 필터 제공.
- Today 0이면 불필요한 빈 섹션이 없음.
- 저장 직후 선택 계획이 열리고 일반 진입 골격은 변하지 않음.
- flag off에서 현재 P35 `/my` 행동과 storage가 그대로.

**Rollback:** runtime flag/experiment off. 데이터 migration 없음.
**제외:** 고급 필터, 협업, project hierarchy, Calendar ownership 변경.
**완료 증거:** 0/1/5/20 × mobile/wide 캡처·route tests·flag-off diff.

### P0-09. 실제 전송 확인·receipt·실패 복구

**사용자 결과:** 내보내기 전에 무엇을 몇 개 어디로 옮기는지 알고, 실패해도 계획을 잃지 않는다.
**해결:** U01, U07, U09; hard fail #3 종료.
**선행:** Q1-B, P0-08 PASS. 앞선 loss/save/capability acceptance도 현재 ref에서 green이어야 한다.
**PR 경계:** 기존 MVP 로컬 생성/복사 범위. 새 OAuth·원격 provider 제외.

#### 구현 순서

1. saved plan의 effective snapshot과 loss schema로 범위·형식·eligible count를 계산한다.
2. 확인 상태에 version·destination·duplicate/irreversible disclosure를 포함한다.
3. saved transfer는 artifact 생성과 persistent export receipt 기록 순서를 atomic/recoverable하게 정의하고, version/hash/scope/format/destination/IDs/count/omitted/one-way/outcome을 기록한다.
4. clipboard denial, blob/download fail, retry, duplicate generation을 구분한다.
5. Q1-B의 S14 one-shot local path를 별도 capability로 두고 history/remote 기능을 약속하지 않는다. 공개 상세의 quick 진입은 저장 primary를 밀어내지 않는 contextual secondary이고, quick branch 안에서만 파일/복사를 primary로 둔다.
6. 성공 결과를 다시 열거나 같은 saved plan에서 재생성할 수 있게 한다.

#### 후보 touchpoint

- `components/flow/FlowExportPanel.tsx`
- `lib/flow/export-scope.ts`
- `lib/flow/my-flow-step-export.ts`
- 기존 ICS/TSV/Memo 생성기와 receipt storage

#### Acceptance

- Saved transfer는 preview = confirm = artifact = persistent export receipt의 Item IDs/count/version/hash가 같다.
- Public quick은 preview = artifact = session-only 결과 확인의 Item IDs/count가 같고 persistent receipt/history write는 0이다.
- 날짜 없는 Item이 ICS에 없음.
- 중요한 경고가 icon-only가 아님.
- 실패 시 saved plan·overlay 불변, retry의 중복 위험 명시.
- Q1-B public one-shot action은 엄격한 eligibility guard를 통과할 때만 노출됨.

**Rollback:** saved transfer UI flag off, 기존 생성기는 손대지 않거나 독립 되돌림 가능.
**제외:** 양방향 sync, OAuth, background retry queue, collaboration.
**완료 증거:** artifact 파일 검사, receipt 비교, 실패 injection 결과.

### P0-10. P0 통합 회귀와 내부 gate

**사용자 결과:** 개별 개선이 기존 저장·실행·내보내기 계약을 깨지 않았음을 확인한다.
**선행:** P0-09 PASS. P0-02~09의 targeted acceptance와 rollback evidence가 모두 현재 ref에서 green이어야 한다.
**PR 경계:** 필요한 test/evidence correction만. 새 기능 금지.

#### 실행 순서

1. [인수·QA 매트릭스](./05-acceptance-and-qa-matrix-ko.md)의 S01~S13과 추가 failure states를 실행한다.
2. 390×844, 1024 wide, 1440×1000에서 overflow·sticky CTA·console·failed request를 확인한다.
3. dated/undated/mixed/Map/legacy/50-item/long-Korean fixture를 모두 실행한다.
4. Codex 독립 runtime/data/state 재검토를 blind-first로 수행한다.
5. Claude Design은 구현 결과 캡처만 보고 visual/IA/copy를 독립 검토한다.
6. hard fail 0, active QA acceptance, docs/build/test를 확인한다. 과거 점수 기준은 별도 승인 없이는 판정에 사용하지 않는다.

#### 최소 명령

```powershell
npm.cmd run test:p35-p0
npx.cmd tsx --test lib/flow/my-flow-step-export.test.ts lib/flow/my-flow-cross-flow-todo.test.ts lib/flow/export-scope.test.ts
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
```

targeted browser/E2E script는 active spec에서 현재 package scripts에 맞춰 정확한 이름을 기록한다.

#### Gate

- Codex hard fail 0
- 승인된 HF-01~03과 active QA acceptance 전부 PASS. 과거 core-four/76 점수는 동일 rubric·threshold를 별도 승인하기 전 참고 신호일 뿐 gate가 아님
- console error·failed request·replacement character·390px horizontal overflow 0
- P35 기존 regression green
- 실제 관찰 사용자는 여전히 별도 값으로 기록

**Rollback:** 어떤 slice가 gate를 깨는지 feature flag로 분리 가능해야 함.
**완료 증거:** 명령 output, route matrix, screenshots, payload/storage diff, known limitation.

## 5. P1 티켓 상세

### P1-01. Item·Map·시작일 시각 감산

**해결:** U04, U05, U06.
**선행:** P0-10 PASS.
**범위:**

1. Item 상세의 독립 파란 surface를 주변 hierarchy와 통일한다.
2. `실행할 일` 중복 heading을 삭제한다.
3. `할 일 수정→수정`, 완료를 주 행동으로 유지한다.
4. Flow Map 3칸 grid를 제거하고 선택/전체 수를 CTA 근처 한 줄로 둔다.
5. 시작일 선택 바로 아래 동일 값을 반복하는 echo를 제거한다.

**Acceptance:** 정보 손실 없이 카드·heading·helper text 수가 줄고, 중요 count/경고는 남는다.
**제외:** Map adapter migration, 새 visual system.
**검증:** before/proposal/implemented를 구분한 mobile/wide 캡처와 accessibility tree.

### P1-02. 승인된 용어·CTA·도움/주의 규칙 적용

**해결:** U02, U07, U09, U10.
**선행:** Q3-B, P1-01 PASS.
**범위:**

1. copy token inventory로 navigation→CTA→editor title→body 순서 적용.
2. Q3-B의 `계획 찾기 / 내 계획 / 계획 수정`을 핵심 surface에 적용.
3. `완료`를 실행 상태 외 맥락에서 제거.
4. helper text를 삭제/개념 도움/조건 disclosure/안전 경고 네 등급으로 분류.
5. icon-only 도움에 accessible name·keyboard·focus return을 보장.

**Acceptance:** 같은 행동은 같은 동사, 다른 효과는 다른 동사. 안전·중복·비가역 영향은 항상 inline.
**제외:** 내부 route/type rename, 브랜드 리뉴얼.
**검증:** copy inventory diff, screen reader/keyboard, long Korean.

### P1-03. 형식별 field parity 보강

**해결:** U07.
**선행:** P1-02 PASS.
**범위:** 기존 MVP가 지원하는 Calendar/할 일·체크리스트/Sheet/Memo에서 loss schema 준수.

1. saved ICS의 날짜·시간대·반복·설명·출처.
2. Sheet/TSV의 stable column과 long text escaping.
3. Memo의 heading·source·warning/resource 보존.
4. Checklist의 완료 기준·메모·순서.
5. held/unsupported는 별도 count와 이유.

**Acceptance:** saved transfer는 preview/confirm/artifact/persistent receipt가, public quick은 preview/artifact/session-only 확인이 fixture별 field-by-field 일치하며 quick의 persistent receipt/history write는 0.
**제외:** 새로운 다섯 번째 user format, remote provider.
**검증:** 생성 파일 parser round-trip과 golden fixture.

### P1-04. 극단값·접근성·legacy 회귀

**선행:** P1-03 PASS.
**범위:**

- 저장 계획 0/1/5/20, Item 1/8/24/50
- 긴 한국어 제목·메모·완료 기준, emoji·특수문자
- dated/undated/mixed, timezone, DST 후보, repeat, overdue, archived/completed
- keyboard only, screen reader name, focus trap/return, reduced motion
- 390×844, 1024, 1440×1000, zoom 200%
- legacy saved Flow/Map/source-backed snapshot 읽기

**Acceptance:** no clipping/overlap/horizontal overflow, no silent data rewrite, no duplicate save/export.
**제외:** legacy migration 자체. 발견한 migration 필요는 별도 spec 후보로 기록.

## 6. V1. 제한 사용자 관찰

내부 QA가 green이어도 실제 사용자 관찰은 자동 완료되지 않는다.

### 첫 5명에서 볼 과업

1. 공개 계획이 원본인지 내 저장본인지 설명하기
2. 결과 preview를 보고 자연스러운 형식 선택하기
3. 수정 후 `변경 반영`과 `내 계획에 저장` 구분하기
4. 저장 직후 방금 저장한 계획과 다음 행동 찾기
5. Item `완료`와 계획 `저장` 구분하기
6. 내보내기 전 범위·개수·위험 설명하기
7. `계획`/`Flow` 용어가 무엇을 뜻하는지 자기 말로 설명하기

### 기록 규칙

- 관찰 사용자 수를 실제 값으로 기록한다.
- 성공률, 도움 요청, 잘못 누른 행동, 되돌리기, 발화 근거를 분리한다.
- 디자인 평가자가 예상한 행동을 사용자 사실로 쓰지 않는다.
- 5명 결과에서 근본 혼동이 남으면 20명 확대 전에 bounded correction을 다시 정한다.

## 7. 각 PR의 공통 종료 체크리스트

- [ ] 승인된 티켓 한 개만 수정했다.
- [ ] 시작 시 branch/HEAD/upstream/dirty paths를 기록했다.
- [ ] 기존 dirty path를 소유하지 않았고 덮어쓰지 않았다.
- [ ] source/base와 personal overlay 경계를 보존했다.
- [ ] 정상·빈 상태·오류·취소·Back·중복 acceptance가 있다.
- [ ] mobile/wide와 keyboard/focus를 확인했다.
- [ ] console·network·storage·artifact를 확인했다.
- [ ] tests/build/docs check 중 위험에 맞는 검증을 실행했다.
- [ ] 구현 화면, proposal, 내부 QA, 실제 UXR 라벨을 구분했다.
- [ ] rollback 방법과 publish state를 기록했다.
- [ ] commit/push/PR/merge/deploy는 별도 권한 범위에서만 수행했다.
