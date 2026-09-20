# K3-B B1-G — 개인 계획 adapter 검증

2026-09-05. **신규 순수 contract 41개와 준비 18개, 기존 C/E2/D 200개를 함께 실행해 259/259 PASS**했다. C/E2/D/app/React/생성 HTML 연결은 아직 없다. 제품 전체 개인 편집 동등성이나 실제 저장·브라우저 수용을 완료했다는 결과가 아니다. [구현 계약](./k3b-plan-context-contract.md)과 [이전 준비 gate](./k3b-plan-lossless-gate.md)를 함께 읽는다.

## 1. 소유 파일과 실제 변경

신규 [personal-plan-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js), 신규 [personal-plan-context.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.test.cjs), 위 contract와 이 QA만 변경했다. 기존 M/C/E2/D/app/React/builder/HTML/공용 보고서와 이전 준비 fixture/test는 수정하지 않았다. pre-existing dirty 파일을 stage/정리하지 않았다.

기존 raw title/memo/nullable date를 그대로 두는 optional overlay, exact identity·기준 presence·stale 검사, 읽기-only effective projection, 기존 전체 state를 보존하는 단일 Undo candidate를 구현했다. source 합성·새 E2 draft journal·영구 삭제·UI 저장 연결은 이 모듈의 실행 범위 밖이다.

## 2. 실행 순서 — 실패·하니스·최종 결과 구분

| 실행 근거 | 실제 등록·실행 수 | 판정 |
|---|---:|---|
| 첫 scaffold RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-red-20260905.tap`) | 30: PASS 4 / FAIL 26 | 구현 전에 등록한 contract 시험. not-implemented scaffold였으므로 26개 기존 제품 결함이라고 세지 않는다. 항상 차단으로 통과한 4 negatives도 구현된 검증의 증거가 아니다. |
| 첫 구현 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-green-first-20260905.tap`) | 30/30 PASS | 첫 contract 기대값 유지 |
| 추가 경계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-boundaries-first-20260905.tap`) | 38/38 PASS | 실제 UMD 호출, membership, projection 재입력, stale, 단일 Undo 보강 |
| 첫 합동 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-focused-20260905.tap`) | 256/256 PASS | 신규 38 + 준비 18 + 기존 200 |
| Array 최초 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-array-red-20260905.tap`) | 3: PASS 1 / FAIL 2 | P39 실제 복사 안전 결함. P40은 cross-realm prototype까지 비교한 deepStrictEqual 하니스 오류로 구분 |
| Array 확인 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-array-red-confirmed-20260905.tap`) | 3: PASS 2 / FAIL 1 | P40을 JSON 값·원본 불변 비교로 바로잡음. 제품 수정 없이 P39만 계속 FAIL |
| Array GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-array-green-20260905.tap`) | 3/3 PASS | custom prototype 차단 후 inherited toJSON 실행 0. 표준 cross-realm Array/Object 유지 |
| 최종 합동 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-focused-final-20260905.tap`) | **259/259 PASS** | 신규 41 + 준비 18 + 기존 200, FAIL/skip/cancel/todo 0 |

위 실행 수는 반복 실행을 합산한 고유 테스트 수가 아니다. 최종 고유 등록 수는 259다. 기존 C의 크기 simulation 내부 반복 횟수를 별도 테스트 개수에 더하지 않았다. 최초 하니스 오류를 제품 failure로 남기거나, 실제 P39 failure를 환경 문제로 돌리지 않았다.

최종 명령은 `node --test`에 신규 `personal-plan-context.test.cjs`, 준비 `k3b-plan-lossless-gate.test.cjs`, 기존 `workspace-checkpoint.test.cjs`, `plan-item-session.test.cjs`, `workspace-permanent-delete.test.cjs` 다섯 파일을 명시했다. spec 출력과 별도 TAP을 동시에 기록했다. 전체 `npm test`가 아니다.

## 3. 신규 41개의 실제 범위

| 등록 ID | 확인한 경계 |
|---|---|
| P01, P31 | lazy CommonJS/UMD API. 실제 UMD 함수 호출에서 ambient storage/DOM 접근 trap 0. C/E/D 의존 0 |
| P02–P04 | 기존 기준 owner·nullable presence, 무변경 metadata/revision/Undo 0, Flow 제목 candidate와 view-only 효과 |
| P05, P11, P16, P33 | 실제 같은 제목 Item/Flow도 exact ref로 구별. cross-copy/duplicate identity 거절. 누락·중복·foreign·Step 밖 task 등 membership negatives 6종을 기존 M.validate와 함께 확인 |
| P06–P07, P24 | source description과 같아도 개인 memo owner 유지. 빈 값/부재·공백·CRLF 보존. 기존 개인 기준과 같은 text만 no-op으로 정규화 |
| P08–P10 | 같은 날짜 명시 pin, unscheduled Plan-only 효과, inherit로 마지막 overlay/metadata 제거. raw date/time/completion/source 불변 |
| P12, P26, P36 | unknown JSON·각 timeline archive·다른 Flow entry·정확 before state Undo 보존. 기존 C 포장/Undo에서도 첫 metadata 부재로 복귀 |
| P13–P15, P27 | raw managed drift 차단, 완료 후 fresh context는 유효하나 old context stale, 위조/복제 context 거절. 실제 source update 합성 view로 old context 저장 차단 |
| P17–P21, P25 | draft/metadata/version/contract/unknown keys/invalid date/blank title/빈 section/order/외부 ref/기준 presence·reserved collision 거절. 다른 Flow의 손상 entry도 차단 |
| P22–P23, P34, P38 | getter/poison/non-JSON/prototype·임의 trusted 옵션 거절. 공개 draft/baseline frozen. 반환 candidate를 바꿔도 private context와 다음 candidate 불변 |
| P28–P30, P35 | canonical time/revision overflow, 실제 authored fixture의 private/완료 데이터 보존, 휴지통 편집 차단, 정상 실행일 변경에 새 scheduleMode/planDate 제조 0 |
| P32 | `viewOnly:true` 표시 및 **값이 변경된** effective projection 재입력을 raw capture로 허용하지 않음 |
| P37 | 반복 unscheduled effective Plan이 기존 recurrence 검증에 실패하면 candidate 거절·입력 보존 |
| P39–P41 | inherited toJSON Array 결함 RED→GREEN, cross-realm 표준 JSON container 허용, array symbol/nonenum/getter/cycle 거절과 getter 실행 0 |

P36의 기존 C는 아직 새 metadata를 일반 unknown으로 통과시킨다. 그 PASS는 값과 단일 Undo 보존 근거일 뿐 **C의 새 strict Plan decoder 완료 근거가 아니다**. 준비 G07/G08/G09/G18에서 확인한 C/E2/D 연결 gate는 그대로 남아 있다.

P37도 **기존 recurrence 규칙 보존 차단**의 PASS다. 반복 날짜 3mode 편집을 모두 지원한다는 뜻이 아니다. 후속 UI는 capability·사유를 보여야 하고, React 원본의 반복 anchor/회차/완료와 대조한 별도 gate 없이 차단을 제거하면 안 된다.

## 4. Array 결함과 수정

read-only 동료 검토에서 Array의 own property 검증은 있지만 prototype 검증이 빠진 후보가 나왔다. 실제 시험은 정상 state의 unknown array에 custom prototype과 inherited `toJSON`을 붙였다. RED에서 검증이 true를 반환하고 그 함수가 1회 실행돼 unknown 값이 JSON 복사 과정에서 바뀔 수 있었다.

Array와 Object의 native constructor/prototype identity를 property descriptor로 확인하고 inherited serialization hook이 있는 prototype을 차단했다. GREEN에서 함수 실행은 0이고 검사 결과는 failure다. genuine 다른 VM realm의 표준 Array/Object는 계속 허용된다. P40의 최초 deepStrictEqual 실패는 동일 JSON 값의 realm 차이였으므로 JSON exact 비교로 하니스만 고쳤다. 임의 custom 객체를 plain JSON으로 정규화해서 통과시키거나 기대값을 손실 허용으로 낮추지 않았다.

이 경계는 일반 JSON.parse한 저장 payload보다 넓은 JS API 입력 경계다. 임의 Proxy의 trap 실행까지 막는 보안 sandbox라고 주장하지 않는다.

## 5. 운영·저장·남은 검증

신규 모듈에는 storage API가 없다. 신규 UMD 시험은 storage/DOM 접근 0을 확인했고, 원본 객체와 입력 bytes/value 불변을 검사했다. 기존 E2 회귀의 저장은 메모리 fault fixture에서만 실행했다. target/journal prepare·confirm·cleanup을 포함한 그 호출 수를 ‘실제 운영 데이터 쓰기 수’라고 표현하지 않는다.

실제 운영 브라우저의 flow:* byte-for-byte 전후 측정은 이 하위 작업에서 **미실행**이다. 로컬 운영 데이터에 접근하거나 쓰지 않았다는 코드/시험 범위와, 실제 사용자 저장소 전체 불변 측정은 별도다. 후보 module은 builder/app에 연결하지 않았고 저장 key/schema/배포를 변경하지 않았다.

남은 필수 gate는 C current+Undo metadata validator/Plan transition, 검증된 source-candidate 합성 binding, E2 새 draft/child/journal/retry, D exact owner 삭제다. 그 후 UI 저장과 5 viewport·키보드·Escape·실패/복구/reload를 검증한다. 실행 날짜 inherit 추정, section/global order, 원본 반복 해석은 이번 완료 범위가 아니다.

| 항목 | 이 하위 작업 상태 |
|---|---|
| 순수 모델·관련 protocol 회귀 | 최종 259/259 PASS |
| 전체 npm test / production build | 미실행. root가 통합 범위에서 별도 수행 |
| 브라우저 5 viewport / 실제 UI 저장·Undo | 미실행 |
| 실제 Android Chrome / iOS Safari / 가상 키보드 / 보조기술 | NOT_RUN |
| 관찰 사용자 | 0명 |
| commit / push / PR | 없음 / 없음 / 없음 |
| Preview / Production | 없음 / 없음 |

## 6. 동결 해시

| 파일 | SHA256 |
|---|---|
| personal-plan-context.js | `43AFE1678F1BDC33815B94EC9F476AF658098672825BE604A147DC03927199F3` |
| personal-plan-context.test.cjs | `871F1D20BFA928C5C80B0ECA3BABF8CD0AFD686C60EFBC1F2A6DF9F44609FB9B` |
| plan-context-focused-final-20260905.tap | `08E4BCBAA0C7D3C24A7889E37850CFC807F33CF702E5BED0E11BF68CC90B54D1` |

기존 제품의 읽기 기준 SHA는 [준비 gate §7](./k3b-plan-lossless-gate.md)에 있다. 최종 시험 뒤 M/C/E2의 SHA를 다시 확인해 동일했다. 이번 신규 제품 파일 두 개는 위 최종 실행 뒤 동결했다.

신규 JS/CJS 두 파일의 `node --check` PASS, `npm.cmd run docs:check` PASS(required files 16, local links 5,346)다. 네 소유 파일을 명시한 scoped closeout도 실행했다. reporter는 미추적 directory를 묶어 보여 두 runtime 파일만 scope 항목으로 잡았으므로 문서 두 파일은 `git status --untracked-files=all`로 따로 확인했다. reporter의 권장 검증 목록을 실행 결과로 대신 쓰지 않았다. branch/HEAD는 `agent/personal-workspace-v4-1-poc-20260901` / `6e4b44fe`, upstream 대비 ahead 0/behind 0이다. 전체 dirty 현황은 다른 작업도 포함하며 이번 소유 범위로 확대하지 않았다.
