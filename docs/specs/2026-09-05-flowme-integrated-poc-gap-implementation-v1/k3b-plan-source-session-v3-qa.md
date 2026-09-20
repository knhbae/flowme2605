# K3-B B1-E — source-bound Plan v3 저장·복구 QA

2026-09-05. **신규 v3 27개 + E01–E15의 28개 + 기존 session 126개 = 181/181 PASS**다. 실제 source decoder·P/C transition·E2 writer를 테스트용 메모리 저장소에서 호출했다. 화면/브라우저/실제 기기 검증은 아니며 app·builder·두 사용자 HTML에는 연결하지 않았다.

## 1. 구현과 기존 기록의 구분

[승인 설계 §3.2](./k3b-plan-source-journal-v3-design.md)의 actual storage wrapper를 [E2](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js)에 연결했다. [새 시험 파일](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-source-context-session.test.cjs)을 추가했다. 이 하위 작업은 app/C/P/S/D/builder/HTML과 기존 테스트를 수정하지 않았다.

| 경로 | 현재 계약 |
| --- | --- |
| legacy Plan/Quick | 기존 record v1·pair·draft 의미 유지 |
| [E01–E15 raw checkpoint-bound](./k3b-plan-session-context-qa.md) | record v2·raw P normalization·`sourceBoundary:'not-bound'` 유지 |
| source-bound Plan | 새 record v3·source-bound draftContract·`sourceReadSnapshot:{version:1,raw:string|null}` |

v3의 create/begin/child 생성·반영/retry는 actual storage와 숫자 `readSourceEpoch`를 받는다. 실제 bytes는 고정 source key에서 E2가 직접 읽는다. caller source packet이나 bool 권한 callback만으로 통과할 public 경로는 없다. generic raw begin/child/retry/resume는 source-bound owner를 거절한다.

매 저장 경계에서 `epoch → source getItem → epoch`를 확인한다. 두 epoch·캡처 epoch/raw가 정확히 같아야 한다. 실제 raw/epoch mismatch를 한 번 관찰하면 private binding이 stale로 남는다. A→B→A로 돌아와도 이전 context에 권한이 돌아오지 않는다. 읽기 오류 자체는 변경 증거가 아니므로 입력을 유지하고, 후속 명시 retry가 모든 실제 읽기를 다시 수행한다. 오류를 empty source로 바꾸지 않는다.

입력 중 `updateDraft`는 [captured P validation](./k3b-plan-source-draft-qa.md)만 사용한다. 현재 source 읽기·저장 권한을 부여하지 않는다. 이 검사와 실제 I/O를 구분하며, root source draft의 domain 실패는 저장하지 않는 invalid 상태로 남긴다. 화면의 필드별 안내/키보드/초점은 후속 UI 범위다.

## 2. 기록과 복구의 실제 의미

- v3 decoder는 snapshot을 현재 M/P loader로 검증하고, beforeRaw에서 fresh source editor context를 발급해 C 단일 transition을 재도출한다. baseline·제출 draft·candidate bytes가 일치해야 한다. 유효한 다른 Flow 후보라도 채택하지 않는다.
- source context/권한/현재 관찰 epoch는 기록에 저장하지 않는다. 역사 재도출의 epoch 0은 새 inspect/transition 쌍에서만 사용한다. 현재 편집 epoch로 재사용하지 않는다.
- prepared 복구는 exact before만 복원하고 `requiresSourceReopen:true`와 동결된 읽기 전용 review/draft를 반환한다. source key는 복원하지 않는다.
- 같은 현재 source bytes를 명시적으로 다시 읽었을 때만 새 context로 보존 draft를 재개한다. 현재 source가 달라지거나 읽을 수 없으면 review를 유지하고 자동 이식/정규화/저장/token 소비를 하지 않는다.
- confirmed+candidate가 검증되면 이미 성공한 저장이다. 그 뒤 source drift나 cleanup 실패 때문에 target을 rollback하지 않는다. cleanup은 journal만 제거한다. 새 편집은 source를 다시 열어야 한다.

## 3. 실행 이력

| 단계 | 등록/실행 | 결과 | 증거 |
| --- | ---: | --- | --- |
| 구현 전 | 20 | 0 PASS / 20 FAIL | v3 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-session-v3-red-20260905-01.tap`). 새 API 미구현 |
| 첫 구현 | 20 | 20 PASS | 첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-session-v3-first-20260905-01.tap`) |
| 추가 오류 주입 + 기존 회귀 | 181 | 181 PASS | 동결 후보 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-session-v3-expanded-20260905-01.tap`), 2,468.0385 ms. skip/cancel/todo 0 |

최종 181은 **27 + 28 + 126**이다. 초기 20개나 이전 154개 실행을 다시 더하지 않는다. V02의 Flow/Item 두 등록, V07의 세 경계 등록과 다른 검사 내부의 matrix 반복을 구분했다. Node after hook의 계수 검사는 추가 등록 시나리오가 아니다. 독립 reviewer의 후속 결과와 parent의 S 라우팅/전체 회귀는 별도 보고다.

```powershell
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-source-context-session.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-session.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs
```

## 4. 신규 27개 수용 범위

| 등록 ID | 실제 확인한 내용 |
| --- | --- |
| V01 | actual-storage wrapper, caller packet 우회·잘못된 숫자 counter 거절 |
| V02-flow | source A→B 뒤 명시 A 유지, 명시 B no-op, 한 Undo/revision |
| V02-item | 같은 의미를 Item에서 확인 |
| V03 | local update의 실제 읽기 0, source child 생성·반영, generic 우회 차단 |
| V04 | 실제 관측 raw A→B→A의 stale 고정 |
| V05 | epoch ABA, source 읽기 앞뒤 epoch 차이 차단 |
| V06 | open/begin의 source read-error가 empty가 되지 않음 |
| V07-prepare | prepared 이전 source drift: target 0 |
| V07-target | prepared 후 source drift: target 0, 기록 보존 |
| V07-confirm | target 후 source drift: target 1, confirmed 성공 아님, source rollback 0 |
| V08 | 실패 retry의 실제 source 재검사, generic retry·stale dispatch 차단 |
| V09 | v3 snapshot/contract, downgrade/unknown/잘못된 kind/snapshot 차단 |
| V10 | 유효한 다른 Flow candidate와 잘못된 baseline 재도출 거절 |
| V11 | 변경된 현재 source에서도 역사 prepared 복원, 보존 draft 읽기 전용 유지 |
| V12 | 같은 source의 명시 재개, 새 epoch/context, token 1회 소비, 자동 저장 0 |
| V13 | source 부재가 확인된 seed·null-before, null snapshot과 target 부재 복원 |
| V14 | 현재 source read-error와 무관한 confirmed 역사 확인/정리, target rollback 0 |
| V15 | confirmed 직후 source drift는 committed를 보존하되 정상 닫기/재개는 차단 |
| V16 | fixture 실제 bytes, 성공 cleanup 뒤 snapshot이 든 journal 제거 |
| V17 | 실제 UMD C/P/E 저장·기록 decode, global storage/DOM 접근 0 |
| V18 | genuine attempt여도 live counter 누락/bool은 dispatch 0 |
| V19 | prepared/target 뒤 source bytes 동일·epoch만 변경된 경우 다음 단계 차단 |
| V20 | 세 durable 경계의 source 읽기 오류. 최초 availability 오류 뒤 명시 retry는 fresh read로만 성공 |
| V21 | corrupt snapshot과 validator-valid empty store를 과거 applied source 대신 넣어도 거절 |
| V22 | prepare quota before/after, target throw-after의 기존 phase/소유 rollback 유지 |
| V23 | cleanup 실패는 snapshot 보존, 성공 retry/중복 cleanup은 target 변경 0 |
| V24 | clone recovery token/target drift/counter 누락 재개 차단, exact 조건 복귀 후 명시 재개 |

이것은 E16–E18의 모델·메모리 오류 주입 범위다. 실제 source event 관찰, 미관찰 다른 탭 ABA, 화면 선택/입력·완료 경험을 검증한 결과로 넓히지 않는다.

## 5. API·원문·운영 데이터 경계

신규 27개 시험의 합계만 산출했다. 기존 154개 호출을 여기에 합치지 않았다.

| 계수 | 값 |
| --- | ---: |
| 새 테스트용 메모리 저장소 | 35 |
| probe 저장소의 전체 getItem | 963 |
| 그중 고정 source key getItem | 196 |
| setItem/removeItem 호출 — 성공/실패 시도 포함 | 76 |
| 허용 pair 밖 mutation / clear | 0 |
| source key setItem/removeItem/rollback | 0 |
| 운영 sentinel 변경 | 0 |

허용 pair는 `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`와 `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`다. **journal key의 이름은 v2, 내부 새 record version은 3**이며 새 key를 만들지 않았다. source는 `flow:poc:personal-workspace:v1:source-candidates`에서만 직접 읽는다.

fault fixture가 source/epoch/foreign target을 Map에 직접 주입한 것은 외부 변경 모사다. 제품 API 쓰기와 분리했다. 그 변경을 보존했는지 확인하며 모든 source key value가 무조건 불변이었다고 표현하지 않는다. 운영 sentinel의 공백·CRLF·한글·emoji bytes는 모든 store에서 끝까지 동일했다. 실제 사용자 localStorage·운영 profile 접근은 0이다.

읽기 계수는 E2가 받은 probe storage 객체의 호출이다. P가 이미 받은 raw를 M decoder에 전달하기 위한 내부 read-only packet shim 호출까지 중복 합산하지 않았다.

## 6. snapshot 크기와 수명

실제 M handoff/source prepare·resolve·apply로 만든 **한 합성 fixture**에서 측정했다. 사용자 원문이나 snapshot 전문은 로그에 출력하지 않았다.

| 측정 | UTF-8 bytes |
| --- | ---: |
| source raw | 6,440 |
| beforeRaw | 19,063 |
| candidateRaw | 32,080 |
| confirmed journal 전체 | 68,322 |

escaping·before/candidate 자체의 원문 중복 때문에 journal은 source raw보다 크다. 이 수치가 실제 localStorage quota, 평균 사용자 데이터 크기, 최대 입력 처리 성능을 보장하지 않는다. 브라우저의 UTF-16 저장량/실제 quota 검사는 미실행이다. 전체 source store를 보관하므로 다른 사본의 private source도 단기 중복될 수 있다.

정상 cleanup 뒤에는 journal과 snapshot이 제거된다. cleanup 실패/읽기 불능이면 기록을 남기고 복구를 기다린다. TTL·자동 clear·무조건 즉시 삭제는 추가하지 않았다. pending editor journal과 명시 영구 삭제의 UI/S 연결 gate는 parent가 별도로 확인해야 한다. 이 모듈은 명시 삭제를 수행하지 않는다.

## 7. 동결 자료

| 자료 | SHA-256 | 크기 |
| --- | --- | ---: |
| v3 구현 전 E2 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-source-session-v3-20260905-01/plan-item-session.js`) | `D65528794CC9C11AB74C80A7D49C5AB777AAF9BE599CC2DBFFD8014A61BA6372` | 55,589 bytes |
| E2 v3 후보 | `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4` | 70,441 bytes |
| v3 신규 시험 | `41540C271AD8E57DAE59C242EFCF4459C1523810DAEB81D4C2D4D5DFF7995410` | 24,775 bytes |

백업 대비 E2는 217줄 추가/21줄 삭제다. E01–E15 QA의 D655/154 실행은 이전 후보의 근거로 유지한다. 사용자 HTML hash나 3182 production build hash가 이 신규 E2를 포함한다고 주장하지 않는다.

## 8. 남은 gate와 공개 상태

독립 review·S의 journal 분류 연결·app의 새 source-aware Plan 읽기/편집 UI·필드 오류/보존 draft 재확인·5 viewport와 실제 브라우저 회귀가 남아 있다. E2 API 성공만으로 화면 통합을 완료했다고 보고하지 않는다. source와 workspace는 별도 key이므로 이 프로토콜이 둘의 원자적 transaction을 제공하지 않으며, 원본 rollback도 하지 않는다.

이 하위 작업의 브라우저/Android Chrome/iOS Safari/실제 IME/보조기술 검사는 NOT_RUN이다. 전체 `npm test`·production build도 여기서 실행하지 않았다. commit/push/PR/Preview/Production 배포는 모두 미실행, 관찰 사용자 0명이다.
