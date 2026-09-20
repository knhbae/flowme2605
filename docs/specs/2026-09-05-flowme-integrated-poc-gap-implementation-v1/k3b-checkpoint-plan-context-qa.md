# K3-B B1-C — checkpoint 개인 Plan 연결 검증

2026-09-05. **순수 C 연결 범위 통과: 신규 18/18, 기존 선정 353/353. 사용자 HTML·E2·삭제·source 합성 연결 완료 판정은 아니다.** main이 C diff와 신규 시험을 읽고 요청한 추가 assertion까지 반영했다. C 제품 파일은 동결했고, 앱과 생성 HTML은 이전 검증본을 유지한다.

## 1. 구현 범위와 API

[연결 설계](./k3b-checkpoint-plan-connection-design.md)와 [P 공개 계약](./k3b-plan-context-contract.md)을 따른다. 변경한 제품 파일은 [workspace-checkpoint.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js) 하나다.

- `inspectPersonalPlanContext(checkpoint, flowRef, options?)`: C의 current·Undo·legacy/archive 검증 후 실제 raw state·legacyBaseRaw·Undo를 P에 전달한다.
- `transitionCheckpoint(checkpoint, {type:'commit-personal-plan-context',context,draft,now}, options?)`: genuine context로 만든 P candidate를 같은 v2 checkpoint에 감싼다. revision을 추가로 올리지 않고 P의 전체 before Undo를 사용한다. no-op은 기존 checkpoint 객체 그대로다.
- `options.personalPlan`: 신뢰된 호스트/시험의 모듈 주입이다. persisted payload나 `sourceReady` 같은 사용자 값은 권한이 아니다. version·contract·metadata key·필수 함수 네 개를 검사한다. P가 없거나 불완전해도 metadata 없는 옛 읽기는 유지하고 새 Plan 기능만 거절한다.
- `personalPlanContextV1`: 존재하는 current/Undo를 각각 strict 검사한다. 옛 state/Undo 또는 timeline archive의 reserved collision은 채택하지 않는다. 일반 action은 metadata의 부재/존재와 정확 값을 보존해야 한다.
- C signature: 배열 값을 읽기 전에 descriptor·symbol·표준 prototype을 확인한다. getter·손실 배열·inherited `toJSON`을 거절하며 다른 VM의 표준 JSON container는 허용한다. 옛 Object JSON의 own `__proto__` 보존 회귀는 그대로 통과했다.

P가 만드는 effective state는 검증용으로만 읽고 버린다. C period grouping은 기존 raw 실행 date/time과 timeline order를 유지한다. 개인 계획 날짜를 근거 없이 실행일로 바꾸지 않는다.

## 2. 실제 실행 이력 — 반복을 고유 수에 합산하지 않음

| 실행 | 실제 수와 결과 | 판정·근거 |
|---|---|---|
| 수정 전 getter 재현 | 1개, 0 PASS / 1 FAIL | current 배열 getter가 1회 실행됨. 기대는 0. RED 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-getter-red-20260905.tap`) |
| 수정 전 contract 재현 | 3개, 0 PASS / 3 FAIL | 옛 reserved key·malformed Plan contract·array symbol을 C가 받아들임. RED 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-contract-red-20260905.tap`) |
| 첫 전체 신규 시험 | 18개, 17 PASS / 1 FAIL | getter의 current 경로는 통과한 뒤 Undo fixture에서 실패. 같은 제목을 두 번 저장한 helper가 no-op을 만들어 Undo가 없었던 **시험 fixture 오류**. 첫 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-first-20260905.tap`) |
| fixture 교정 후 | 18/18 PASS | 두 번째 제목을 다르게 하고 helper에 changed=true assertion을 추가했다. 안전 assertion은 유지. GREEN 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-focused-green-20260905.tap`) |
| main 리뷰 후 하위 검사 보강 | 18/18 PASS | timeline-reset, Quick 실제 편집, 반복 미정 차단, cross-realm old/new state, missing API를 기존 case 안에 추가. 최종 신규 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-focused-final-20260905.tap`) |
| 기존 순수 회귀 7파일 | 353/353 PASS | 아래 선정 파일 전체. 신규 18개는 포함하지 않는다. C 제품 hash는 최종과 같고 이후에는 신규 시험만 보강했다. 회귀 로그 (로컬 전용 근거: `../../../output/k3b/checkpoint-plan-existing-regression-first-20260905.tap`) |

**이 단계의 고유 검사 합계는 371개 = 신규 18 + 기존 353이다.** RED 재현 4개, fixture 교정 후 재실행, main 요청 assertion을 독립 테스트로 더하지 않는다. 기존 P의 다른 보고서에 적힌 41/259 등 과거 실행과도 합산하지 않는다.

선정한 기존 7파일은 `workspace-checkpoint.test.cjs`, `personal-plan-context.test.cjs`, `timeline-context.test.cjs`, `workspace-storage.test.cjs`, `workspace-permanent-delete.test.cjs`, `workspace-permanent-delete-storage.test.cjs`, `plan-item-session.test.cjs`다. 파일은 수정하지 않았다. 이 기존 회귀의 E2/삭제 시험은 **기존 계약 보존** 증거이며 새 Plan metadata의 E2/삭제 owner 연결 시험은 아니다.

`node --check`와 C before/after `git diff --no-index --check`도 오류 없이 끝났다. 전체 `npm test`, production build, generated HTML 검사, 브라우저는 이 하위 단계에서 새로 실행하지 않았다.

## 3. 신규 등록 18개별 판정

등록 파일: [checkpoint-plan-context.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-plan-context.test.cjs). 아래 결과는 최종 18개 실행이다. 루프 안 variant는 별도 고유 테스트가 아니다.

| ID | 확인한 행동·경계 | 결과 |
|---|---|---|
| B1C01 | metadata 없는 old current/Undo/unknown 읽기, P 미로딩, 새 Plan no-op 동일 객체·metadata 부재 | PASS |
| B1C02 | old state/Undo와 양쪽 archive의 reserved key: null·빈 객체·valid-looking metadata 각각 거절 | PASS |
| B1C03 | current만·Undo만·양쪽 metadata 검사, 휴지통 entry의 읽기 허용과 새 편집 차단 | PASS |
| B1C04 | contract·unknown field·foreign tuple·duplicate Item·baseline presence·blank title·미지원 order를 current/Undo 각각 거절 | PASS |
| B1C05 | 제목만 변경, revision 정확 +1·정확 before Undo·raw tasks/flows/nullable/sourceTitle 부재·archive 보존 | PASS |
| B1C06 | unchanged no-op, 마지막 override를 명시 inherit로 제거, 기존 raw 보존 | PASS |
| B1C07 | CRLF·공백·빈 문자열·memo 부재와 원문 설명과 같은 개인 메모의 exact 값·owner 보존 | PASS |
| B1C08 | 같은 날 fixed pin·unscheduled·inherit, 실행/source/완료 불변. 실제 반복 fixture의 미지원 unscheduled C 경로 차단 | PASS; 반복 날짜 3mode 전체 지원 아님 |
| B1C09 | C Undo → serialize/parse → 검증. metadata가 원래 없던 전체 state까지 복원, 기존 updatedAt 예외 유지 | PASS |
| B1C10 | 완료/다시 열기·실행 날짜·Flow 폴더·timeline reorder/reset 후 metadata exact 보존 | PASS |
| B1C11 | Quick 생성→실제 update-quick→완료, Flow 휴지통/복원, 다른 Flow의 legacy Plan 편집 후 entry 보존 | PASS |
| B1C12 | 관리 중인 Flow를 old Plan action으로 재작성하거나 주입 모델이 metadata를 생성/삭제하면 candidate 거절 | PASS |
| B1C13 | forged/cloned/stale context·외부 raw 변경·effective state·알 수 없는 action 필드에서 candidate 0 | PASS; snapshot만으로 ABA 검출 주장 안 함 |
| B1C14 | Plan 날짜를 바꿔도 오늘/주/월/미정 그룹과 기존 실행일·timeline archive/order 동일 | PASS |
| B1C15 | current와 Undo의 enumerable 배열 getter를 실행하지 않고 거절 | PASS; getter 호출 0 |
| B1C16 | array symbol·nonenumerable index·hole·custom prototype의 inherited toJSON 거절 | PASS; toJSON 호출 0 |
| B1C17 | 실제 UMD 분기를 VM에서 로드, lazy P 및 잘못된 version/contract/key·필수 API 누락 차단, 다른 VM 표준 Object/Array의 old/new metadata 검증·후속 전이 | PASS; DOM/storage getter 접근 0 |
| B1C18 | 기존 invalid planDate의 옛 읽기는 유지하고 새 Plan inspect만 거절, 자동 migration 0 | PASS |

## 4. 저장·원문 경계 증거의 정확한 범위

C와 신규 18개는 localStorage를 호출하지 않는 순수 모델 시험이다. B1C17은 Node VM에서 **브라우저용 UMD 분기**를 실행하며, 실제 Chromium 브라우저나 기기 검사가 아니다. `localStorage/window/document` 접근용 getter를 설치하고 호출 0을 검사했다.

입력 checkpoint와 raw source fields, exact legacyBaseRaw, 다른 Flow/Quick, timeline archive는 전이 전후 JSON 값·배열 순서·부재를 대조한다. legacyBaseRaw 문자열은 공백까지 같은 값을 유지한다. whole-state Undo에는 기존 archive·unknown JSON도 포함된다. raw 원문의 의미가 같다는 비교만으로 bytes 비교를 대신하지 않는다.

기존 353개 중 저장 시험은 각 파일의 fault-capable 메모리 store와 sentinel 검사다. 이번 보고서는 그 호출 수를 별도로 집계하지 않았으며, 이를 실사용자 브라우저의 운영 `flow:*` 전수 비교나 실제 저장 성공 횟수로 표현하지 않는다. 새 Plan의 target/journal 저장, 재시도·복구·삭제는 아래 후속 범위다.

## 5. 파일·hash와 미연결 범위

| 파일 | SHA-256 |
|---|---|
| C 구현 전 exact backup (로컬 전용 근거: `../../../output/k3b/before-checkpoint-plan/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js`) | `4CE28DF1EA2FE23C3676A4F5555DDB2A12C2F1F39A235D3411A698BE82AAE3E0` |
| C 현재 제품 | `C0ECF88D40037677E8A3D6B2C4E02B1A39AF1F1A969E5958E9FEE13AEA2A496B` |
| 신규 등록 시험 최종 | `5063436CCF434F6EA04C674D6F3B8CEFD524FC76712856B7CCBAB113F89FAA52` |
| 동결 P 의존성, 이 작업에서 수정하지 않음 | `43AFE1678F1BDC33815B94EC9F476AF658098672825BE604A147DC03927199F3` |

추가 문서 변경은 연결 설계와 이 신규 QA다. builder/app/E2/삭제 planner/생성 HTML/React/공용 보고서는 수정하지 않았다. C 소스와 현재 사용자 HTML이 다른 후보인 상태는 의도된 단계 gate다. 새 metadata를 실제 사용자 저장 영역에 쓰기 전에 관련 reader·E2·삭제 연결을 닫아야 한다.

아래는 **이번 단계 미완료**다.

- 설계 C15: 검증된 source candidate를 합성한 view와 raw baseline을 분리하는 reader/caller guard. 기존 P가 source store를 받는다고 가장하지 않는다.
- 설계 C17: 영구 삭제가 새 entry·legacyPlanFields·overlay의 private 값을 current/Undo에서 exact owner로 정리하는 연결. 기존 삭제 시험 통과로 대체하지 않는다.
- 설계 C18: 새 draft discriminator/child staged copy/E2 prepared·confirmed·retry·reload recovery와 actual target/journal 저장. 기존 K1-B 시험 통과로 대체하지 않는다.
- 개인 구간 제목·global Plan 순서 및 과거 provenance가 없는 실행 inherit. 같은 날짜라는 이유로 새 owner를 만들지 않는다.
- 실제 UI/5 viewport/키보드/실제 Chromium 저장 경계, Android Chrome/iOS Safari, 실제 OS IME, 보조기술 검사.

관찰 사용자 0명. commit·push·PR·Preview·Production은 모두 진행하지 않았다.
