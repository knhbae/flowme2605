# K3-B B1-C — 개인 Plan metadata의 checkpoint 연결안

2026-09-05. 최초 읽기 전용 설계 뒤 별도 구현 승인을 받아 **C 순수 연결까지 구현했다. 신규 18/18·기존 선정 353/353 PASS, UI·저장 coordinator 연결은 미완료**다. 실행 근거·수정 전 RED·한계는 [B1-C QA](./k3b-checkpoint-plan-context-qa.md)에 분리한다. 아래 C01–C18은 설계상 검사 묶음이며, 실제 등록 `B1C01–B1C18`과 번호가 전부 1:1인 것은 아니다.

## 1. 읽은 근거와 현재 API

[K3-B 설계 §4.2–4.3](./k3b-design.md), [무손실 gate 전체](./k3b-plan-lossless-gate.md), [C 모듈 전체](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js), [B1-G 모듈 전체](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js), [B1-G 시험의 관련 assertion](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.test.cjs), [app의 state·timelineProjection·source guard](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)를 대조했다. 전체 과거 대화나 UX 전 화면을 재검토한 결과는 아니다.

- C의 구현 전 SHA-256: `4CE28DF1EA2FE23C3676A4F5555DDB2A12C2F1F39A235D3411A698BE82AAE3E0`. exact backup 후 승인된 C 파일만 변경했다.
- B1-G 담당자가 안전한 JSON prototype 검증을 보강한 뒤 API 동결을 통지했다. 현재 관측 SHA-256은 `43AFE1678F1BDC33815B94EC9F476AF658098672825BE604A147DC03927199F3`이다. 동결된 [공개 계약 전체](./k3b-plan-context-contract.md)를 추가로 읽었다. 이 문서 작업에서 담당자의 제품 시험을 재실행하지는 않았다.
- 현재 B1-G 공개 함수는 `inspectPlanContext({state,flowRef,legacyBaseRaw?,undo?})`, `normalizePlanDraft(context,draft)`, `projectPersonalPlanState(rawState)`, `planPersonalPlanState({state,context,draft,now})` 네 개다. `sourceCandidateStore` 입력이나 공개 `inspectMetadata` 함수는 **없다**.
- `inspectPlanContext`의 context는 모듈이 발급한 객체 그대로 사용한다. JSON 복원·spread·사용자 플래그로 권위를 만들 수 없다. C가 검사하는 checkpoint에서는 실제 `legacyBaseRaw`와 `undo`를 전달한다. 선택 인자를 생략해 외부 자료 검사를 건너뛰지 않는다.
- P의 changed 결과가 이미 `revision + 1`, `updatedAt`, 정확한 입력 state의 `undo`를 만든다. C는 revision을 한 번 더 올리거나 부분 Undo를 다시 만들지 않는다.

확정한 C API는 `inspectPersonalPlanContext(checkpoint, flowRef, options?)`와 기존 `transitionCheckpoint`의 `{type:'commit-personal-plan-context',context,draft,now}` 명시 분기다. `options.personalPlan`은 테스트·호스트가 제공하는 **신뢰된 모듈 주입**이며 사용자 payload의 신뢰 플래그가 아니다. version/contract/metadata key와 네 필수 함수가 맞아야 한다. metadata 없는 옛 조회는 P 부재에도 계속 동작하지만 새 Plan 검사·전이는 차단된다.

무손실 gate §4의 source 합성 API는 당시 **후보**다. 현재 raw-state API를 그 전체 후보의 구현 완료로 취급하지 않는다. 개인 구간 제목·global Plan 순서도 P18에서 미지원으로 구분되어 있으며, 이 연결안이 그 기능을 추가하지 않는다.

## 2. C에 넣을 최소 경로

| 연결점 | 최소 변경안 | 보존할 기존 계약 |
|---|---|---|
| `dependencies` | B1-G의 version·contract·필수 함수를 확인하는 작은 lazy 의존성 경로. metadata 또는 새 Plan action이 있을 때 필수 | M/T만 사용하는 기존 checkpoint 경로는 그대로. M이 P/C를 역으로 import하지 않음 |
| `legacyStateCheck` / `baseline` | 옛 state·옛 Undo·각 timeline `legacySnapshot`의 `personalPlanContextV1` own-property를 reserved collision으로 거절 | 다른 unknown JSON 보존. old raw를 새 metadata로 승격하거나 삭제하지 않음 |
| `stateCheck` | 새 키가 **있을 때만** `P.projectPersonalPlanState(rawState)`의 성공 여부를 검사하고 반환 view는 버림 | 기존 timeline record·archive binding·M.validate 검사를 그대로 실행. metadata 없는 옛 비반복 invalid planDate를 자동 수정하지 않음 |
| `validateWith` | current와 Undo 각각에 위 검사를 적용. undo에만 metadata가 있는 경우도 엄격히 검사 | outer 5개 필드와 동일 `legacyBaseRaw` 유지. 한쪽 검사 실패 시 전체 checkpoint 차단 |
| 새 Plan transition | 기존 `transitionCheckpoint`에 명시 분기 또는 작은 전용 exported wrapper 추가. 이름·action shape는 구현 시 확정 | 옛 `commit-personal-plan`에 새 mode 객체를 억지로 전달하지 않음 |
| 일반 transition | Plan metadata의 **부재/존재와 정확 JSON 값**을 before/after 비교하고, candidate 전체를 다시 검증 | timeline metadata 검사 유지. 명시 Plan 분기 외에는 새 metadata 생성·삭제·변경 금지 |
| `undoCheckpoint` | 전체 이전 state를 복원하는 현재 구현을 유지하고 새 strict 검증만 적용 | 기존 `updatedAt` 예외를 제외한 이전 state·revision·metadata 복원. 별도 Plan Undo 없음 |
| `projectWith` / `projectGroups` | 새 strict 검증은 거치되 이번 단계의 grouping input은 기존 raw 실행 date/time으로 유지 | 개인 계획일을 실행일로 추정하지 않음. 기간 order/legacy archive를 Plan 순서로 교체하지 않음 |

`projectPersonalPlanState`는 raw state 전체의 identity와 모든 Plan entry를 검사하며 trashed entry의 읽기 투영도 허용한다. 반대로 `inspectPlanContext`는 편집 대상이 휴지통에 있으면 거절하므로, 이를 모든 Flow에 반복 호출하는 방식으로 checkpoint를 검증하면 정상 휴지통 state까지 막을 수 있다. 공개 projection을 검증용으로 호출하는 안이 현재 API로 가능한 최소안이다. 성능을 이유로 검증 전용 export가 필요하면 P 담당자와 별도 합의하며 private 함수에 직접 접근하지 않는다.

P 담당자도 이 검증 조합을 확인했다. 단, **검사 순서**는 별도로 보완해야 한다. 현재 C의 `validateWith`는 `signature(checkpoint)`를 먼저 호출하고, 그 함수의 배열 분기는 `value[index]`를 직접 읽는다. 새 metadata를 가진 state/Undo의 getter를 먼저 실행한 뒤 P가 거절해서는 P의 복사 전 안전 검증 계약을 지켰다고 할 수 없다. 새 state/Undo를 descriptor-safe하게 확인해 P 검증을 먼저 수행하거나, C signature의 배열 descriptor 검사만 좁게 보완하고 RED→GREEN을 남긴다. 기존 unknown JSON을 지우거나 전역 객체 정책을 바꾸는 근거로 확대하지 않는다.

실제 구현에서는 signature의 배열 descriptor·symbol·표준 prototype 검사를 보완했다. 수정 전 getter 실행 1회를 RED로 확인했고, 수정 후 current/Undo 모두 getter 실행 0으로 거절한다. 다른 VM의 표준 Object/Array 및 기존 own `__proto__` JSON 값 보존 회귀는 유지된다. 위 문단은 수정 전 원인과 선택지 기록이며, 현재 코드가 계속 index getter를 실행한다는 뜻은 아니다.

새 metadata가 없는 old payload에 P 검증을 무조건 적용하지 않는다. P의 새 편집 identity·날짜 검증과 기존 읽기 호환을 섞지 않기 위해서다. 단, old reserved collision 검사는 값이 null이거나 새 shape처럼 보여도 적용한다.

### 명시 Plan 저장의 후보 생성 순서

1. C가 current·Undo·legacy provenance를 검사한다. 편집 진입은 같은 raw state와 실제 legacy/Undo 자료로 P context를 발급한다.
2. 새 분기는 exact action shape, genuine context, current raw, draft, 명시 `now`를 P에 전달한다. source 합성 view나 caller가 만든 effective tasks 배열을 raw로 받지 않는다.
3. `changed:false`면 기존 checkpoint 객체 그대로 반환한다. metadata 캡처·revision·Undo·저장 attempt를 만들지 않는다.
4. changed 결과는 `state: result.state`, `undo: result.undo`, 기존 `legacyBaseRaw`로 감싼다. P의 Undo가 before 전체 state와 동일하고 기존 timeline metadata가 보존됐는지 확인한 뒤 C 전체 검증을 통과시킨다.
5. C는 candidate만 반환한다. 실제 저장은 후속 E2 연결이 기존 target/journal·CAS·prepare/confirm/cleanup 계약으로 처리한다. C가 저장 API를 갖지 않는다.

P의 exact raw 비교는 같게 되돌아온 ABA 자체를 검출하는 session epoch가 아니다. C/E2의 기존 expectedRaw·session/attempt·pending/recovery 검사를 계속 유지한다. `viewOnly:true`도 신뢰할 수 있는 writer 권한 표식으로 사용하지 않는다.

일반 action의 metadata 비교는 `undefined`를 JSON signature 함수에 넘기는 방식이 아니라 `{present,value}`처럼 부재를 명시해 비교한다. 기존 metadata가 없어도 몰래 생기는 경우를 잡아야 한다. 옛 `commit-personal-plan`이 관리 중인 raw title/memo/planDate 또는 sourceTitle을 바꾸면 baseline 불일치로 후보를 거절한다. 충돌을 보정하려고 legacyPlanFields를 새 raw에 다시 묶지 않는다.

## 3. source candidate와 reader의 입력 경계

현재 `app.state()`는 `M.composeSourceCandidateState(envelope.state, sourceCandidateStore)`를 반환하지만 C의 `projectGroups`는 raw checkpoint를 받는다. P는 raw의 managed fields를 exact capture와 비교한다. 따라서 아래 두 조합은 안전한 연결이 아니다.

- source 합성 view를 `checkpoint.state`에 넣고 검증·저장하기: 원문 갱신을 raw 개인 필드로 역기록하거나 capture를 stale로 만들 수 있다.
- P의 effective view를 raw로 다시 넘기기: P32가 차단하는 경로이며, 개인 overlay와 baseline의 구분을 없앤다.

C 단계에서는 authoritative `workspacePacket.checkpoint.state`만 사용한다. source store의 로드 성공 여부와 exact raw·대상 full ref 검증은 기존 app의 source guard가 소유하며, 임의 `sourceReady:true`나 `null` fallback으로 이를 대신하지 않는다. source-store read-error/corrupt를 ‘후보 없음’으로 받아 새 Plan UI를 열지 않는다.

**후속 app 연결의 종료 조건:** 검증된 source candidate를 읽기 합성한 후 개인 overlay를 적용할 명시 reader가 필요하다. raw baseline 검증과 effective projection 입력을 분리하고, 편집 중 source owner가 바뀌면 stale 처리해야 한다. 현재 네 API만으로 source 합성 전체 경로가 닫혔다고 선언할 수 없다. 구현되지 않은 인자를 P에 추가 전달하거나, 현재 source view에 맞게 legacy capture를 다시 만드는 우회는 금지한다.

기간·결과·상세는 이 reader와 같은 owner를 소비해야 한다. 다만 과거 실행 날짜의 상속 여부는 복원하지 않으며, 현재 raw 실행일을 유지한다. 새로운 실행 inherit와 Plan global order의 연결은 별도 gate다. C의 순수 저장 연결만 통과한 단계에서 전체 날짜·화면 동등성을 완료로 표시하지 않는다.

## 4. 신규 회귀 계획

아래 18개는 **계획한 검사 묶음**이다. 실제 등록 테스트 개수·반복 실행·하위 assertion 수는 구현 후 따로 기록한다. 기존 P 시험을 읽은 사실을 C 연결의 새 PASS로 합산하지 않는다.

| ID | fixture / action | 완료 조건 |
|---|---|---|
| C01 | metadata 없는 legacy state·Undo·unknown 배열/필드 | fromLegacy/read/open/cancel/no-op의 데이터·부재 보존. 새 reserved field 생성 0 |
| C02 | old state·old Undo·current/Undo의 legacySnapshot에 reserved key | 각 위치를 개별 거절. valid-looking shape도 자동 채택 0 |
| C03 | current만/Undo만/양쪽 recognized metadata | 두 snapshot을 독립 검사. 서로 다른 overlay·metadata 부재를 허용하고 오류 한쪽은 전체 차단 |
| C04 | version·contract·unknown field·foreign/duplicate tuple·baseline presence 손상, 배열 getter/custom prototype | active/Undo 각각 fail-closed. P 이전의 C 검사에서도 getter 실행 0, 입력 mutation 0 |
| C05 | 첫 제목만 변경, 원래 sourceTitle/planDate/memo 일부 부재 | 해당 entry만 생성. source 권위 제조 0, revision 정확 +1, 전체 before Undo |
| C06 | unchanged 및 마지막 override를 명시 inherit | no-op은 동일 checkpoint. 실제 reset만 entry 제거, 다른 Flow entry 보존 |
| C07 | CRLF/공백/빈/부재 memo와 원문 설명과 같은 memo | exact private 값·presence 보존. description 대체 0 |
| C08 | 같은 날 fixed, unscheduled, inherit, 반복 Item의 미지원 미정 | 지원 mode 유지. 기존 recurrence validator의 차단도 유지. raw 실행일·시간·완료·원문·Step membership 그대로 |
| C09 | 새 Plan 저장 → C Undo → 직렬화/parse → 검증 | 처음 metadata가 없던 state까지 복원. 기존 updatedAt 예외 외 손실 0, Undo 두 벌 생성 0 |
| C10 | complete/reopen·실행일/시간 이동·folder·timeline reorder/reset | metadata 부재/값 exact 보존, 새 조회의 baseline 유효. 각 기존 action 의미 유지 |
| C11 | Quick 생성/편집·Flow trash/restore·다른 Flow의 허용 old action | 이웃 Plan entry와 source membership 보존. 휴지통 읽기는 허용, 해당 Plan 새 편집은 거절 |
| C12 | 관리 중인 Flow를 옛 Plan writer로 변경하거나 metadata를 건드리는 주입 모델 | capture drift 또는 unexpected metadata 변경으로 원 후보 거절. 재바인딩 0 |
| C13 | cloned context·current raw drift·다른 사본·effective view 입력 | genuine owner/exact raw가 아니면 candidate 0. 동일 표시 제목으로 fallback 0 |
| C14 | Plan 날짜와 기존 실행일이 다르고 period order가 있는 state | date/undated/overdue 그룹의 기존 실행 owner와 order/archive 유지. 새 Plan 날짜로 자동 이동 0 |
| C15 | source-store 정상/오류/외부 교체와 raw/effective 구분 | C는 raw만 소비. app 연결 전에는 source-aware UI 지원으로 주장하지 않음. 후속 reader/owner 검사를 별도로 등록 |
| C16 | actual browser UMD 및 CJS, lazy P 부재/버전 불일치 | 기존 무metadata 경로 호환, 새 metadata/Plan action은 명확히 차단. DOM·storage 접근 0 |
| C17 | reset·handoff·permanent-delete 저장 coordinator | 후속 통합 검사: 같은 base/Undo metadata 보존 또는 명시 범위 정리. 새 private capture를 삭제 planner가 모르면 UI 연결 보류 |
| C18 | E2 old/new draft·prepared/confirmed·retry·foreign journal | 후속 E2 검사: old 복구 우선, prepared만 소유 복원, confirmed target rollback 0. target write와 journal 호출 별도 집계 |

C01–C14는 C 순수 연결의 우선 검증이다. C15–C18은 caller/storage/E2/삭제 의존성이 있으므로 이 단계의 단위 통과로 대체하지 않는다. 기존 C·timeline·P·general storage·삭제·K1-B 회귀는 영향 범위에 맞춰 선정하고, 테스트 현행화가 필요하면 원본 assertion을 먼저 보존한다.

## 5. 연결 승인 전 확인과 종료 범위

- P 최종 API/hash와 위 projection 검증 조합은 담당자에게 확인했다. C exact backup과 승인 범위 수정, 검사 순서 RED→GREEN을 완료했다. main의 C diff·신규 시험 리뷰 후 요청한 timeline-reset·Quick 편집·반복 차단·cross-realm·missing API assertion도 보강했다.
- module 순서는 후속 builder에서 M/T → P → C를 보장한다. 이 작업에서는 builder·app·E2·삭제 planner·생성 HTML을 변경하지 않았다. 기존 사용자 HTML은 이전 검증본으로 유지한다.
- known metadata에는 엄격한 검증, absent old metadata에는 기존 읽기, 옛 reserved collision에는 차단을 적용한다. 새 운영 schema나 영구 정책을 정하지 않는다.
- C 구현 완료 판정은 실제 순수 검증 결과와 원본 불변 증거까지다. source composition, 개인 구간/순서, 실행 inherit, E2 journal, 삭제 owner가 닫히기 전에는 사용자 HTML에 전체 B1 지원으로 연결하지 않는다.
- 실제 브라우저·5 viewport·Android/iOS·실제 IME·보조기술·관찰 사용자 검증은 이번 설계 작업에서 실행하지 않았다. commit·push·PR·Preview·Production도 진행하지 않았다.
