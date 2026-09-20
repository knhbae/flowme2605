# K3-B B1-E v3 — 독립 negative review

2026-09-05. 구현 담당자의 동결본을 받은 뒤 [v3 설계 전문](./k3b-plan-source-journal-v3-design.md), [E2 제품 전문](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js), 기존 v3 시험과 변경 전 diff를 읽었다. **별도 실제 모듈 시험 9/9 PASS, 새 blocking 결함 미발견**이다. 이 말은 모든 경쟁 상태나 통합 UI를 검증했다는 뜻이 아니다. 제품 수정은 0이며 [새 review 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/e2-source-bound-review.test.cjs)과 이 QA만 작성했다.

## 1. 독립 검토 결과

| ID | 복합 실패·우회 시도 | 실제 결과 |
|---|---|---|
| R01 | source mismatch를 관찰한 후 raw 복귀, captured valid 입력, 복제 session/일반 begin 호출 | 입력은 남고 stale owner는 계속 차단. 저장 호출 0 |
| R02 | fixed source getItem 도중 epoch 변경 후 counter 원상 복귀·retry | 관찰 불일치가 binding에 남아 재시도 차단. 저장 호출 0 |
| R03 | v3 prepared 직후 legacy recovery journal 도착 | target 쓰기·명시 복구 모두 차단. 두 기록 보존 |
| R04 | target이 실제로 바뀐 뒤 source drift와 throw-after가 함께 발생 | 자동 rollback 0, prepared로 유지. 명시 target 복원은 source를 되돌리지 않음. 변경 source로 자동 draft 재개 0 |
| R05 | prepared/target 직후 journal을 foreign bytes로 교체 | foreign 기록 덮기·정리·자동 rollback 0. 확정 성공으로 처리하지 않음 |
| R06 | confirmed 쓰기 throw-after + 현재 source 읽기 실패, cleanup remove throw-after | exact confirmed/target는 durable commit으로 유지. 현재 편집은 차단. 명시 cleanup은 부재/target exact 재확인 뒤 성공, source/target rollback 0 |
| R07 | 예전 prepared bytes로 confirmed rollback, 의미만 같은 target whitespace 교체 | 둘 다 exact ownership 실패로 차단, journal 보존 |
| R08 | 실제 C/E UMD에서 shared P 없음 + always-true validator; 이후 corrupt historical source | 항상 true callback으로 우회 불가. P 복구 시 원래 confirmed는 읽기 성공, corrupt snapshot은 차단 |
| R09 | prepared 복구 후 명시 재개 도중 source/epoch 변경 | review/초안 보존·token 미소비·자동 저장 0. 실제 same source를 새로 관찰한 후 한 번만 재개 가능 |

captured validator는 local 입력 유효성만 확인했다. begin/child/retry/writer의 actual fixed-key source 관찰을 대체하지 않았다. historical decoder는 실제 C/P로 before·baseline·draft·snapshot에서 후보를 다시 도출했다. 현재 source의 읽기 오류가 과거 confirmed를 prepared로 바꾸거나 source 전체를 되돌리는 경로는 검토 범위에서 발견하지 않았다.

## 2. 실행 수와 저장 경계

최종 audited log (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/e2-source-bound-review-audited-final-20260905.tap`): **9개 등록, 9 PASS, FAIL/skip/cancel/todo 0**. `node --check` PASS. 첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/e2-source-bound-review-first-20260905.tap`)도 9/9였으나 R08에서 host C의 숨은 host P 의존을 확인해 실제 same-realm C/E+P 부재로 하니스를 강화했다. 강화 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/e2-source-bound-review-final-20260905.tap`)과 counter를 추가한 최종 실행 모두 9/9다. 이를 27개의 고유 시나리오나 제품 수정 근거로 합산하지 않는다.

생성 fixture memory store 10개에서 read 317회(source 58회), target mutation API 8회, journal mutation API 15회, **허용 pair 밖 mutation 0회·clear 0회**였다. 이 수는 throw-after·명시 복원·정리 호출을 포함하며 사용자 성공 변경 수가 아니다. fault fixture가 source/journal map을 외부에서 바꾸는 행동은 제품 API 쓰기와 분리했다. 모든 store의 운영 sentinel과 legacy base exact bytes는 유지됐다. 실제 운영 브라우저 localStorage를 검사한 것은 아니다.

R06에서는 confirmed journal의 transient source snapshot이 cleanup 뒤 없어졌다. cleanup 전 자동 load는 쓰기 0이며, 오류·foreign 기록을 임의 삭제하지 않았다. source key에 대한 제품 writer 호출은 0이었다. 로그에는 사용자 source snapshot을 싣지 않았고, fixture의 판정·횟수만 출력했다.

## 3. 동결 근거

| 대상 | SHA256 |
|---|---|
| E2 제품 — 실행 전후 동일 | `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4` |
| 독립 review test | `14F03F22298C87C7A7A68B125803C400819640A824598101ADFE5F0AD82FF29F` |
| 최종 audited log | `B97FC2F672899CC7A496268385A65DD38897F346EC152DBEA1E3995C29559AE3` |

이전 E2는 구현 전 backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-source-session-v3-20260905-01/plan-item-session.js`)과 비교했다. 독립 검토자가 E2/P/C/S/D/app/builder/기존 시험을 수정하지 않았다. 담당자의 181개 회귀 수를 이 독립 9개 실행으로 대신 인증하지 않는다.

`npm.cmd run docs:check` PASS(required files 16, local links 5,601). 두 소유 path의 scoped closeout을 실행하고 문서의 미추적 상태를 exact path로 별도 확인했다. reporter의 권장 명령은 실행 결과와 구분했다.

## 4. 남은 범위

- S의 journal-family routing, reset/명시 삭제 시 private snapshot의 gate, app 전체 caller 연결과 실제 오류 UI는 별도 통합 검증이 필요하다.
- `readSourceEpoch`는 실제 UI 관찰 counter여야 한다. 임의 callback이 모든 외부 변화를 관찰했다고 이 모듈이 증명할 수는 없다. localStorage 여러 key 호출은 native atomic CAS가 아니며 미관찰 ABA/마지막 검사와 쓰기 사이의 모든 변화를 감지한다고 주장하지 않는다.
- journal 내 snapshot과 후보의 관계 검증은 암호학적 작성 주체 인증이 아니다. 같은 origin에서 전체 기록을 일관되게 다시 쓰는 외부 코드를 막는 계약은 아니다.
- full source snapshot의 실제 사용 데이터 용량·수명·추가 노출과 UI 복구가 필요하다. 무단 TTL/자동 삭제/별도 archive key는 이번 검토에서 도입하지 않았다.
- 이전 source membership/lineage·legacy owner·반복 날짜 capability 제한은 그대로다. 이 9개가 해당 제품 지원 범위를 넓히지 않는다.

전체 npm test/build·브라우저·5 viewport·실제 Android Chrome/iOS Safari·보조기술·운영 key byte 검사 NOT_RUN. 관찰 사용자 0명. commit·push·PR·Preview·Production 없음.
