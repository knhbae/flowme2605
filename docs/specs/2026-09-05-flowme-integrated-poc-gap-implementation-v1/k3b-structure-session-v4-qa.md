# K3-B B2 — E2 구조 편집 세션 v4 독립 QA

2026-09-05. **동결된 P/C/E2 조합에서 208/208 PASS다. B2 UI 완료를 뜻하지 않는다.** [v4 설계](./k3b-structure-session-v4-design.md)와 [C 연결 계약](./k3b-structure-checkpoint-design.md)을 기준으로 E2만 연결했다. P/C 제품은 다른 담당자가 소유한다.

## 범위와 실제 변경

- 제품: [plan-item-session.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js) 하나. 기존 private source 관측·dirty/child·attempt·durable writer·historical recovery 로직을 공유하고 exact v4 wrapper/shape/decoder를 추가했다.
- 새 시험: [plan-structure-context-session.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-structure-context-session.test.cjs). 18개 등록이다. 한 시험 안의 mode/fault 반복을 별도 등록 개수로 더하지 않는다.
- 기존 P/C/E0/model/S/D/PD/app/CSS/builder/HTML 및 기존 시험 파일은 수정하지 않았다. 기존 제품 파일의 앞선 변경은 그대로 보존했다.

변경 전 E2를 scoped backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-structure-session-v4-20260905-01/plan-item-session.js`)에 복사했다. 원본과 복사의 SHA256은 모두 `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4`였다. 초기 E2 연결본은 `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2`다.

## 실행 기록

| 실제 실행 | 등록/실행 | 결과 | 해석 |
| --- | --- | --- | --- |
| 수정 전 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-red18-20260905-01.log`) | 18/18 | 0 PASS, 18 FAIL, skip0 | 모두 `createSourceBoundPersonalPlanStructureSession unavailable`. E2 신규 API 부재를 실제 실패로 기록했다. memory store 발급0·쓰기0 |
| 연결 중 기존 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-old-regression-intermediate-20260905-01.log`) | 190/190 | 190 PASS, fail/skip0 | generic126 + raw28 + source27 + 독립 source negative9. 기존 v1/v2/v3 경로를 새 E2에서 실행했다 |
| 연결 중 신규 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-partial18-20260905-01.log`) | 18/18 | 0 PASS, 18 FAIL, skip0 | 모두 C의 `source-bound-structure-inspection-failed`. P의 structure inspector/captured validator/planner가 실제 `undefined`인 시점이다. 18 memory stores·쓰기0 |
| 첫 실제 조합 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-first208-20260905-01.log`) | 208/208 | 207 PASS, 1 FAIL, skip0 | 기존190 PASS + 신규17 PASS/1 FAIL. 마지막 UMD legacy fixture의 realm 불일치 하니스 오류 |
| 하니스 수정 후 E4-18 단독 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-focused18-20260905-01.log`) | 1/1 | 1 PASS, fail/skip0 | 같은 VM 안에서 기존 legacy fixture를 만들도록 시험만 수정. E2 제품 변경0 |
| 최종 동결 조합 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-session-v4-final208-20260905-01.log`) | 208/208 | 208 PASS, fail/skip0 | 신규18 + 기존190을 같은 최종 조합에서 전부 재실행. 2.362초 |

190개 실행 시작/끝 SHA가 일치했다: E2 `C803AA77…`, P `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358`, C `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`. 이것은 그 중간 조합의 역호환 결과다. P/C 신규 기능이 완성된 뒤 다시 실행해야 한다. 190 PASS와 신규18 FAIL을 합쳐 전체 완료로 보고하지 않는다.

초기 RED 뒤 새 시험에는 실제 source 관측 값/호출 누락, child unsafe descriptor, readback·rollback-read, v3 recovery→v4 재개 거절을 같은 18개 안에 보강했다. 첫 실제 조합은 E2 `C803AA77…`, P `F5373977CBB9197FF585437605587082B10F77A0A335008A671C22F1730A2B98`, C `835FF432…`로 시작/끝 해시가 같았다. 신규 부분의 42 memory stores에서 API84(target set29/journal set42/journal remove13), outside pair/clear0을 기록했다. source/legacy/운영 sentinel의 외부 fault는 fixture Map에서 분리했고 제품 writer는 두 key만 호출했다.

유일한 실패 E4-18은 v4 저장 → metadata 구조 보존한 기존 v3 저장 → v3 prepared 복구/재개까지 통과한 뒤 발생했다. VM 밖에서 만든 legacy plain object를 VM 안의 기존 `copyData`에 넘겨 realm이 달라 거절됐다. 기존 API를 변경하거나 prototype 검사를 풀지 않고 시험의 legacy fixture를 같은 VM에서 만들었다. 단독 1/1을 앞선 17개와 합산하지 않고, P 최종 동결 뒤 전체208을 다시 실행해 통과했다. 제품/새 시험의 `node --check`도 통과했다.

최종 시작/끝에서 네 제품 해시가 모두 일치했다.

| 파일 | SHA256 |
| --- | --- |
| E2 | `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2` |
| P | `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4` |
| C | `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600` |
| M | `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67` |

새 시험 최종 SHA는 `073945E27CD5F18AD53F5B4E2C7F0513AD80EBAB4EFDBB36303C77A2A47986DB`다. 최종 신규18에서 42 memory stores, API84(target set29, target remove0, journal set42/remove13), 허용 pair 밖/clear0을 확인했다. API84에는 실패·복구·재시도도 포함하므로 84회 성공 저장으로 세지 않는다. API84를 기존190의 호출 수로 확대하지 않는다.

## 구현된 API와 저장 의미

새 상수는 `STRUCTURE_PLAN_RECOVERY_VERSION=4`, `STRUCTURE_PLAN_DRAFT_CONTRACT='flowme-standalone-source-bound-personal-plan-draft-v2'`다. `create/check/createChild/applyChild/begin/retry/resume`의 이름은 설계 §3의 `SourceBoundPersonalPlanStructure…` 7개와 같다. 공개 v3 wrapper가 v4를 받거나 반대 방향으로 받지 않는다. generic child/begin/retry는 source family를 받아 권한을 우회할 수 없다.

genuine v4 root만 baseline/draft version2의 `sectionTitles`와 complete `orderedItemRefs`를 가진다. child는 title/memo/schedule만 갖고 부모 구조를 복사·재생성하지 않는다. 임시 child 반영은 해당 Item만 교체하며 부모의 invalid section·전체 순서·다른 Item을 보존한다. P captured validator는 저장 권한이 아니고 현재 source bytes/epoch와 C 전체 checkpoint는 실제 저장 시작/재시도/각 durable 경계에서 확인한다.

writer는 기존 두 key만 사용한다.

- target: `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- journal: `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`

workspace/schema/key/독립 Undo를 새로 만들지 않는다. genuine draft contract로 journal v4를 선택하므로 core-only 변경으로 metadata v1이 남아도 journal은 v4다. candidate metadata 버전만으로 source 권한을 판단하지 않는다.

정상 한 저장은 prepared journal set → target set/readback → confirmed journal set/readback, 이후 명시 cleanup의 journal remove다. 이 **4개 API 호출**은 사용자 저장 1회다. prepared/failed/rollback 호출은 성공 횟수가 아니며 최종 시험에서 별도로 집계한다. `localStorage`가 native atomic CAS인 것은 아니다. 정확한 관측·소유 확인 및 durable journal로 검증 가능한 범위다.

v4 decoder는 보관된 before와 actual source snapshot으로 C/P 구조 token을 새로 발급한 뒤 baseline 일치·단일 C 구조 transition·candidate exact bytes를 재도출한다. 현재 source key로 과거 후보를 다시 쓰지 않는다. prepared는 명시 before 복구만 허용하고, confirmed는 target rollback 없이 journal만 정리한다. source가 달라졌을 때는 복구된 입력을 읽기 상태로 보존하며 새 genuine 재개가 성공했을 때만 one-use recovery token을 소비한다.

## 남은 검증

1. root가 S의 v4 family 라우팅과 D/PD·일반 writer·UI 연결을 검증한다. 이 E2 시험이 그 검증을 대신하지 않는다.
2. 실제 source membership/order 변경은 기존 차단을 유지한다. section 추가·새 source order 지원을 v4로 암묵 확대하지 않는다.

현재 실제 Android Chrome/iOS Safari **NOT_RUN**, v4 브라우저 **0**, 관찰 사용자 **0**. 전체 npm test/build/생성 HTML 검증은 root 소유다. commit/push/PR/Preview/Production 없음.
