# B2 — 기간 동시간 개인 순서 연결 QA

2026-09-05. **C 읽기 연결의 신규 10개와 관련 기존 207개가 통과했다.** 이는 B2 전체 화면 구현 완료가 아니라, 검증된 개인 Plan 순서가 C 기간 기본 순서와 실제 rank bridge까지 전달되는 순수 모델 검사 결과다.

## 변경과 보존 범위

[승인 설계](./k3b-structure-timeline-tie-design.md)에 따라 `workspace-checkpoint.js`의 private `personalPlanTiePositions`와 `projectWith`의 `sourceOrder` 연결만 수정했다. packet current/Undo/legacy와 actual P metadata 검증이 먼저다. full itemRef → localTaskId로 해당 Flow의 기존 raw slots에 개인 순열을 대응한다. 다른 Flow/Quick slots, raw tasks/steps, 원문·capture, 저장된 TimelineOrder는 변경하지 않는다.

시간 우선, canonical 수동 순서, legacy 단일 순서·충돌·미확정의 우선순위와 잠금은 유지한다. 개인 order 없음·core/title-only·order reset은 기존 raw 배열 index를 사용한다. raw 배열과 Step flatten이 다르다고 새로 Step 순서로 바꾸지 않는다. caller order나 ready flag를 새 권한으로 받지 않는다.

제품 변경은 C 한 파일이다. T/R/P/E2/M/PD/S/app/builder/사용자 HTML 및 기존 테스트 파일은 이 작업에서 수정하지 않았다. 신규 파일은 설계, `checkpoint-structure-timeline-tie.test.cjs`, 이 QA다.

## 신규 10개 결과

fixture는 actual M `makeHandoff`/`apply`의 두 작성 Flow와 Quick을 만들고, actual C/P inspector와 structural commit으로 개인 순서를 저장한다. 임의의 성공 metadata를 주입하지 않는다.

| ID | 실제 확인 | 최종 |
| --- | --- | --- |
| B2TT01 | 구간을 가로지르는 A1/A3/A2 순서, Today/주/월의 동일 날짜 동시간 결과 | PASS |
| B2TT02 | A/B/Quick이 섞인 raw slots, A와 B의 독립 개인 순서, 비대상 slots 보존 | PASS |
| B2TT03 | 시간 우선, 날짜/날짜 미정/기한 지남, 제외·완료 필터 | PASS |
| B2TT04 | 첫 reorder의 새 peers 허용·옛 peers 차단, manual 우선, reset과 두 번째 reset no-op | PASS |
| B2TT05 | 유효 legacy 수동 순서 우선, 충돌 및 새 현재 멤버로 불완전해진 legacy의 잠금 | PASS |
| B2TT06 | raw 배열≠Step flatten에서 metadata 없음/core-only/구간 별칭-only/order reset의 기존 기본값 | PASS |
| B2TT07 | actual C Undo, JSON reload, 기존에 만든 rank resolver의 snapshot 독립성 | PASS |
| B2TT08 | actual rank bridge를 통한 M Calendar 순서, source/TXT/Todo/Sheet/다운로드/occurrence 정보 불변 | PASS |
| B2TT09 | current/Undo/capture/order 손상, getter 0회, P dependency 부재의 fail-closed | PASS |
| B2TT10 | frozen input 반복 읽기, raw/capture 불변, caller의 order/ready가 결과 권한이 되지 않음 | PASS |

B2TT08은 Calendar의 기간 rank 연결과 다른 결과 필드 보존 검사다. Text/Todo/Sheet의 새 전체 Plan 순서 UI까지 이번에 연결했다는 뜻이 아니다. 그것은 main의 후속 reader/UI 범위다.

## 실행 이력과 고유 수

| 실행 | 실제 결과 | 해석과 로그 |
| --- | --- | --- |
| 수정 전 신규 10개 | 1 PASS / 9 FAIL | malformed strict 차단만 PASS. 나머지는 실제 순서·stale peers·rank 기대 불일치. RED (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-red-20260905.tap`) |
| C 연결 후 첫 신규 10개 | 9 PASS / 1 FAIL | B2TT05의 마지막 하위 fixture에서 `invalid-order`. 과거 snapshot 자체를 불완전하게 만들던 하니스 오류가 앞선 실패 해결 후 드러남. 파일명의 green은 통과 판정이 아님. 첫 연결 로그 (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-green-20260905.tap`) |
| fixture 정정 후 신규 10개 | 10 PASS / 0 FAIL | 유효 legacy를 보존하고 actual C `add-quick`으로 현재 멤버만 추가. 기존 conflict/unresolved 및 mutation 차단 assertion은 유지. 412.5804ms. 최종 (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-final-20260905.tap`) |
| 기존 관련 11개 파일 | 207 PASS / 0 FAIL | 1888.7624ms. 기존 회귀 (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-existing-20260905.tap`) |

최종 선정 고유 테스트는 **217개 = 신규 10 + 기존 207**다. 신규 10개를 세 번 실행한 이력과 view/fixture 반복 assertion을 별개 고유 테스트로 합산하지 않았다. 모든 위 실행에서 skipped/cancelled/todo는 0이다. 다른 단계에서 이미 실행한 동일 기존 테스트와 전체 고유 수로 다시 합산하면 안 된다.

기존 11개 파일: `workspace-checkpoint.test.cjs`, `timeline-context.test.cjs`, `timeline-result-rank.test.cjs`, `checkpoint-plan-context.test.cjs`, `checkpoint-source-bound-plan.test.cjs`, `checkpoint-source-bound-plan-review.test.cjs`, `checkpoint-structure-plan.test.cjs`, `personal-plan-section-order-contract.test.cjs`, `personal-plan-structure-review.test.cjs`, `personal-plan-display.test.cjs`, `personal-plan-display-review.test.cjs`.

C와 신규 테스트의 `node --check`도 통과했다. `docs:check`는 필수 파일 16개·로컬 링크 5,875개를 확인해 통과했다(로그 (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-docs-check-20260905.log`)). 전체 `npm test`, production build, generated HTML 검사는 이 bounded 작업에서 실행하지 않았다.

## 동결 증거

- C before: 정확 복사 (로컬 전용 근거: `../../../output/k3b/before-structure-timeline-tie/workspace-checkpoint.js`), SHA256 `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`.
- C final: SHA256 `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314`.
- 신규 test: SHA256 `CEE48ED4A8D92717E9B7D21689D31B2E32FAA99ABB6F2B981DD2E9218407971C`.
- 실제 변경 대조: C scoped diff (로컬 전용 근거: `../../../output/k3b/structure-timeline-tie-final.diff`).
- 검사 시 P: `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4`.
- 검사 시 T: `3021C76E1AD513FDA92E610E650FE66085E93BE5B856EB9ED39E79480A56BD69`.
- 검사 시 R: `98DC1232190C0BB61156087F6CE2DC96FA8D96FA1A1704F81692C236AAFA8AAA`.

## 아직 증명하지 않은 범위

이 검사는 Node의 실제 순수 모듈 호출이다. storage/browser API나 사용자 프로필을 읽고 쓴 실행이 아니므로 운영 실데이터 byte-for-byte 검증, API 호출 감시, 브라우저 viewport/hit 영역, 모바일 native 입력을 통과했다고 표현하지 않는다. fixture 원문·raw 배열·capture·timeline record의 불변과 실제 C Undo/JSON round-trip은 위 테스트가 확인했다.

B2 UI 입력/저장/전체 결과 reader 연결, 실제 HTML 생성 및 그 후보에 대한 브라우저 검사는 main의 후속 통합 검증이다. Android Chrome, iOS Safari, 보조기술, 관찰 사용자 검증은 이 작업에서 미실행이다. 관찰 사용자 수 0. commit/push/PR/Preview/Production 모두 진행하지 않았다.
