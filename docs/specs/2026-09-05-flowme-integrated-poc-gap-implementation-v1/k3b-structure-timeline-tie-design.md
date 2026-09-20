# B2 — C 기간 동률의 개인 Plan 순서 연결

2026-09-05. [읽기/UI 연결 설계](./k3b-structure-reader-ui-design.md) 전문과 C/T/rank 실제 구현을 대조한 bounded 설계다. main이 아래 최소안을 승인했다. **C 한 파일의 읽기 투영만** 수정하며 P/E2/M/T/PD/app/S/builder/사용자 HTML은 바꾸지 않는다.

## 적용 지점과 이유

C `projectWith`는 먼저 current/Undo/legacy를 strict validate하고, raw task 배열 index를 `sourceOrder`로 T에 전달한다. T는 time → sourceOrder → inputOrder로 기본 순서를 만들며 명시 canonical/legacy 순서를 별도로 처리한다. `timelineTransition`의 현재 peers·reset과 `timeline-result-rank.createResolver`도 같은 C 투영을 쓴다.

따라서 **검증된 개인 순서를 raw task slot에 대응시키는 private map**을 C의 한 지점에서 만들면 된다. 화면 배열만 재정렬하거나 새로운 caller order/ready flag를 받지 않는다. 새로운 API·schema·writer·time 정책은 필요하지 않다.

1. 기존 `validateWith` 성공 뒤 전체 raw task의 `id → raw array index` map을 만든다.
2. 유효 `personalPlanContextV1.entries[flowRef].structure.orderedItemRefs`가 있는 entry만 읽는다. 이 데이터는 앞서 actual P validator가 root/version/capture/순열/전체 tuple을 검증했다.
3. 해당 entry의 binding.items에서 **full itemRef → localTaskId**를 얻는다. 그 Flow의 기존 raw task index들만 모아 오름차순으로 정렬한다.
4. 개인 orderedItemRefs의 각 localTaskId에 위 slots를 차례로 대응한다. 다른 Flow/Quick의 slot은 그대로다. 여러 Flow의 개인 순서는 서로 겹치지 않는 slot에서 각각 적용한다.
5. raw task 배열은 원래 순서로 map한다. `sourceOrder`만 위 결과를 전달하며 date/time/done/excluded는 기존 그대로다. 동일 tasks를 T canonical selector와 legacy projector에 전달한다.

예: raw `A1,B1,A2,Q,A3,B2`, A의 개인 순서 `A1,A3,A2`라면 동시간 기본 결과는 `A1,B1,A3,Q,A2,B2`다. B1/Q/B2의 slot과 서로의 상대 순서는 그대로다. target A와 비대상 Item 사이의 모든 쌍 관계까지 같다는 뜻은 아니다. 대상 이동에 필요한 관계는 바뀐다.

## 유지되는 우선순위

- **시간이 먼저**다. 개인 Plan 순서가 빠른 시간을 뒤로 보내지 않는다. 단, 기존 명시 수동 순서는 원래처럼 기본 time보다 우선한다.
- canonical TimelineOrder/resolvedContexts, legacy-unambiguous·conflict·unresolved 판정과 잠금은 T의 기존 코드 그대로다. conflict fallback의 ‘시간순’ 안에서 동시간만 새 tie map을 쓴다.
- metadata 없음/v1 core-only/v2 title-only/명시 개인 order reset 뒤에는 **기존 raw task array index**가 기본이다. Step flatten을 새 기본 정책으로 강제하지 않는다. raw 배열과 Step 순서가 원래 다른 유효 자료도 이 호환을 유지한다.
- 날짜 bucket·undated·overdue 제외/완료 필터, trash/숨김, actual occurrence fallback은 기존 계약이다. raw capture·Step membership·timeline 저장 records를 읽기 중 수정하지 않는다.
- 저장된 명시 Plan order는 사본의 raw slots 안에서만 작동한다. source 재정렬·source membership 확대 권한을 새로 주지 않는다.

## 검사 계획

신규 `checkpoint-structure-timeline-tie.test.cjs` **10개**를 구현 전 실행해 실제 동률 누락 RED와 기존 우선순위 PASS를 분리한다. actual M 작성/Quick 생성 → actual C/P structural commit의 fixture를 쓰며, metadata를 임의 성공 형태로 주입하지 않는다.

| ID | 검증 |
| --- | --- |
| B2TT01 | A1/A3/A2 cross-Step 전체 순서가 today/week/month 동일 날짜의 동시간에 적용 |
| B2TT02 | 다른 Flow/Quick이 끼어 있는 raw slots와 두 Flow 독립 개인 순서 |
| B2TT03 | 시간 우선, 날짜/undated/overdue 및 제외·완료 필터 |
| B2TT04 | 첫 reorder의 새 peers 허용/옛 peers 거절, canonical manual 우선, reset default 동일 |
| B2TT05 | legacy-unambiguous/충돌/미확정의 기존 우선·잠금 유지 |
| B2TT06 | metadata/core/title-only/reset의 raw array≠Step fallback 보존 |
| B2TT07 | actual C Undo·JSON reload와 열려 있던 resolver snapshot 안정 |
| B2TT08 | actual rank/M Calendar 동일 결과, 비 Calendar 원문/결과 필드 불변 |
| B2TT09 | malformed current/Undo/capture/순열·getter0·missing dependency fail-closed |
| B2TT10 | frozen input 무변경, 새 writer/권한 flag 없이 동일 projection 재사용 |

기존 C/T/rank와 P source/구조 회귀는 별도 실행한다. 새 10개에 모든 기존 회귀·여러 view 반복을 더해 고유 수를 부풀리지 않는다. 실제 브라우저/5 viewport·device·사용자 HTML 생성은 main의 후속 UI 연결 범위이며 이 순수 검사로 PASS라 하지 않는다.

시작 C exact backup: before-structure-timeline-tie/workspace-checkpoint.js (로컬 전용 근거: `../../../output/k3b/before-structure-timeline-tie/workspace-checkpoint.js`), SHA256 `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`. 검증 후 결과·최종 hash는 별도 QA에 기록한다.
