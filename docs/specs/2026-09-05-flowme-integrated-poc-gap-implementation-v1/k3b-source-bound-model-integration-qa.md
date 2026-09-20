# K3-B — source-bound 모델 합동 회귀 QA

2026-09-05. **24개 시험 파일에서 579/579 PASS**를 확인했다. 기존 19개 파일과 신규 5개 파일을 한 번씩 실행했으며 fail/skip/cancel/todo는 모두 0이다. 제품 모델 8개와 시험 24개는 실행 전후 SHA-256·크기가 동일했다.

이번 작업은 모델·저장 프로토콜의 합동 회귀다. app 연결 작업, 생성 HTML, 전체 npm test, production build, 브라우저 결과를 포함하지 않는다. 제품·시험 파일과 공용 report-data/progress를 수정하지 않았다.

## 1. 실행 근거와 정확한 수

| 구분 | 실제 결과 |
| --- | --- |
| 실행 | 2026-09-05 12:23:25.320–12:23:46.774 UTC |
| Node 등록/실행 | 579 |
| PASS / FAIL | 579 / 0 |
| skipped / cancelled / todo | 0 / 0 / 0 |
| Node duration | 21,362.4392 ms |
| 프로세스 경과 | 21.454초 |
| 명령에 전달한 시험 파일 | 24개, 중복 경로 0 |
| 이번 합동 실행 횟수 | 1회 |

실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-bound-model-integration-final-2026-09-05T12-23-25-318Z.json`)에 실제 Node 경로·명령 전체·시작/종료·카운터가 있다. 전체 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-bound-model-integration-final-2026-09-05T12-23-25-318Z.log`)에는 579개 판정과 진단 출력이 남아 있다.

기준은 이전 19파일·516개 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-bound-model-integration-first-2026-09-05T11-48-35-149Z.json`)의 `command` 배열이다. 실행 전 그 배열에서 19개 경로를 가져와 신규 5개만 더했으며, 24개 경로의 존재와 집합 크기 24를 확인했다.

| 구성 | 등록 수 | 중복 처리 |
| --- | ---: | --- |
| 기존 19파일 목록 | 516 | 이번에도 각 파일 한 번만 실행 |
| captured source draft | 14 | 신규 파일 하나 |
| editor controls 독립 검토 | 5 | 신규 파일 하나 |
| E2 source-bound v3 | 27 | 신규 파일 하나 |
| E2 v3 독립 검토 | 9 | 신규 파일 하나 |
| S editor recovery routing | 8 | ER04 보강 후 파일. 내부 version 반복을 따로 더하지 않음 |
| 합계 | **579** | 실제 Node 총계와 일치 |

이전 516과 이번 579를 더해 1,095개의 서로 다른 검사라고 보고하지 않는다. 개별 보고서의 181·118·62 같은 부분 집합도 579에 다시 더하지 않는다. 이 수는 자동 검사의 등록 수이며 **원본 부모 요구사항 254개·atomic 424개의 커버리지 수나 충족률이 아니다**. 같은 요구를 여러 계층에서 검증하는 검사는 서로 다른 회귀 검사여도 별도 제품 요구로 세지 않는다.

## 2. 실행 파일 원장

모든 파일을 같은 명령에서 한 번씩 실행했다. 과거 파일명에 `.red.cjs`가 남아 있는 source-intent gate도 이번에는 승인된 bound API와 기존 raw 대조를 실행하여 PASS했다. 이름만 보고 미실행이나 현재 FAIL로 판정하지 않았다.

| 순번 | 구성 | 실제 파일 | 검사 범위 |
| --- | --- | --- | --- |
| 1 | 기존 19 | [personal-plan-context.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.test.cjs) | raw Plan metadata·nullable presence·exact owner·unknown 보존 |
| 2 | 기존 19 | [checkpoint-plan-context.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-plan-context.test.cjs) | C와 raw Plan metadata 연결·Undo·구 계약 호환 |
| 3 | 기존 19 | [plan-context-permanent-delete.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-permanent-delete.test.cjs) | Plan metadata의 exact owner 삭제 후보 |
| 4 | 기존 19 | [plan-context-delete-storage.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-delete-storage.test.cjs) | Plan metadata를 포함한 명시 삭제 저장·복구 |
| 5 | 기존 19 | [plan-context-permanent-delete-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-permanent-delete-review.test.cjs) | 삭제 범위·source/seed 복합 독립 회귀 |
| 6 | 기존 19 | [workspace-checkpoint.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.test.cjs) | v2 checkpoint·legacy provenance·timeline transition·Undo |
| 7 | 기존 19 | [timeline-context.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-context.test.cjs) | 순수 날짜 그룹·legacy 순서 판정 |
| 8 | 기존 19 | [plan-item-session.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs) | 기존 Plan/Quick session·v1/v2 journal·fault/recovery |
| 9 | 기존 19 | [workspace-storage.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-storage.test.cjs) | 고정 pair 쓰기·확인·복구·reset·handoff |
| 10 | 기존 19 | [workspace-permanent-delete.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.test.cjs) | 선택 사본 owner scrub·unknown/충돌 차단 |
| 11 | 기존 19 | [workspace-permanent-delete-storage.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete-storage.test.cjs) | 명시 삭제 transaction의 메모리 저장·복구 |
| 12 | 기존 19 | [personal-plan-source-reader.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-reader.test.cjs) | 검증된 source reader·membership·capability |
| 13 | 기존 19 | [personal-plan-source-intent.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-intent.test.cjs) | 현재 source 기준 명시 개인 의도·기존 raw 호환 |
| 14 | 기존 19 | [k3b-plan-source-reader-gate.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-source-reader-gate.test.cjs) | 기존 composer의 한계 재현과 새 reader에 필요한 경계 |
| 15 | 기존 19 | [k3b-plan-source-intent-gate.red.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-source-intent-gate.red.cjs) | 과거 RED 계약의 현행 bound API 회귀·raw 대조 |
| 16 | 기존 19 | [plan-context-session.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-session.test.cjs) | raw Plan session·strict draft·v2 재도출·child |
| 17 | 기존 19 | [checkpoint-source-bound-plan.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-source-bound-plan.test.cjs) | C의 source-bound 단일 candidate·checkpoint binding |
| 18 | 기존 19 | [checkpoint-source-bound-plan-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-source-bound-plan-review.test.cjs) | 다른 사본·Undo-only drift·UMD 독립 회귀 |
| 19 | 기존 19 | [personal-plan-editor-controls.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls.test.cjs) | 순수 입력 제어·HTML 문자열·모드 변경 |
| 20 | 신규 5 | [personal-plan-source-draft.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-draft.test.cjs) | captured draft validation 14개 |
| 21 | 신규 5 | [personal-plan-editor-controls-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls-review.test.cjs) | HTML 직렬화·날짜·모드·라벨 독립 검토 5개 |
| 22 | 신규 5 | [plan-source-context-session.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-source-context-session.test.cjs) | actual storage source-bound session·v3 journal 27개 |
| 23 | 신규 5 | [e2-source-bound-review.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/e2-source-bound-review.test.cjs) | source/target/journal 복합 fault 독립 검토 9개 |
| 24 | 신규 5 | [workspace-editor-recovery-routing.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-editor-recovery-routing.test.cjs) | v2/v3 라우팅·decoder·ER04 정상 준비 대조 8개 |

재현은 실행 JSON의 `command[1..]`을 아래 증거 기록기에 전달한다. 새 실행은 자체 timestamp 경로를 사용하므로 이전 로그를 덮지 않는다.

```powershell
$auditResult = Get-Content output/poc-gap-implementation/k3b/source-bound-model-integration-final-2026-09-05T12-23-25-318Z.json -Raw | ConvertFrom-Json
$auditArgs = @($auditResult.command | Select-Object -Skip 1)
node docs/specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/run-check.cjs k3b source-bound-model-integration-final @auditArgs
```

## 3. 합동으로 확인한 경계

- raw Plan과 source-bound Plan은 다른 권한 경로를 유지한다. source A→B 후 명시 A는 개인 의도로 남고, 명시 B는 현재 상속값과 같으면 새 변경을 만들지 않는다.
- P의 captured draft validity는 현재 source의 freshness나 쓰기 권한이 아니다. E2의 실제 고정 source key 조회와 epoch 검사가 child 적용·저장 준비·target 쓰기·confirmed 경계에 필요하다.
- C의 token은 current뿐 아니라 Undo·legacy provenance를 포함한 전체 checkpoint에 묶인다. 같은 제목의 다른 사본, 유효하지만 다른 후보, 위조·직렬화 context는 허용하지 않는다.
- v3 journal은 역사적 source snapshot으로 before→baseline→제출 draft→C candidate를 다시 도출한다. prepared의 before 복구와 confirmed의 journal 정리를 구분한다. source를 복구 대상으로 쓰지 않는다.
- 명시 삭제의 owner scrub과 기존 저장/복구는 같은 합동 목록에 포함했다. E2 pending 기록이 남아 있을 때 S가 정상 workspace·reset·삭제 준비를 열지 않는 경계도 확인했다.
- ER04는 유효한 trashed Quick과 최종 revision/source raw를 사용한다. pending에서 세 준비가 차단되고, 명시 confirmed 정리 후 같은 준비가 성공한다. 이 검사에서는 실제 삭제/reset/workspace dispatch를 실행하지 않았다.
- controls 검사는 순수 제어·HTML 문자열·React 정적 렌더 대조다. 브라우저 DOM parser, 화면 배치, 포커스, IME, 실제 접근성 검사를 대신하지 않는다.

세부 요구 매핑은 [captured draft QA](./k3b-plan-source-draft-qa.md), [E2 source-bound v3 QA](./k3b-plan-source-session-v3-qa.md), [editor routing QA](./k3b-editor-recovery-routing-qa.md)에 유지한다. 이번 문서가 그 원장을 새 제품 정책으로 바꾸지는 않는다.

## 4. 저장 경계 — 전체와 부분 계수 구분

이번 전체 로그에 실제 출력된 두 probe만 아래에 적었다. 서로 다른 시험 파일의 합성 메모리 저장소 집계이며 전체 579개의 API 총계가 아니다.

| Probe | 메모리 저장소 | getItem | 그중 source 조회 | mutation API | 허용 pair 밖 |
| --- | ---: | ---: | ---: | --- | ---: |
| v3-boundary | 35 | 963 | 196 | 76 | 0 |
| independent-v3-boundary | 10 | 317 | 58 | target 8 + journal 15 | 0 |

E2의 source-bound 저장·복구에서는 source key write/remove/rollback을 허용하지 않는다. 운영 sentinel와 source/legacy bytes 비교는 해당 시험 fixture의 assertion으로 확인했다. 오류 주입을 위한 시험 Map 조작과 제품 API 호출은 구분한다.

명시 영구 삭제 시험은 선택 사본의 PoC 소유 데이터를 scrub하는 별도 계약을 검사하므로, 이 합동 결과 전체를 “source-candidates key 쓰기 0”으로 일반화하지 않는다. 운영 데이터에는 권한을 확장하지 않는다. 실제 사용자 profile/localStorage를 읽고 비교한 증거도 아니다.

v3 snapshot 측정은 source raw 6,440 bytes, journal 68,322 bytes, before 19,063 bytes, candidate 32,080 bytes다. 내용 전문을 로그로 남기지 않았다. 정리 실패 시 snapshot이 journal에 남는 수명과 성공한 정리 후 제거를 시험했으며, 실제 브라우저 quota나 자동 TTL의 증거는 아니다.

## 5. 실행 전후 동결 확인

실행 전 `2026-09-05T12:23:14.403Z`, 실행 후 `2026-09-05T12:24:14.044Z`에 파일 bytes와 SHA-256을 읽었다. 아래 8개 제품/공유 모델과 시험 24개 모두 차이가 없었다. 전체 전후 해시 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-bound-model-integration-final-hashes-20260905-01.json`)에 시험 파일의 해시도 있다.

| 파일 | SHA-256 | bytes | 전후 |
| --- | --- | ---: | --- |
| [workspace-checkpoint.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js) | `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57` | 25,706 | 동일 |
| [personal-plan-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js) | `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358` | 38,612 | 동일 |
| [workspace-permanent-delete.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-permanent-delete.js) | `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3` | 18,794 | 동일 |
| [plan-item-session.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js) | `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4` | 70,441 | 동일 |
| [workspace-storage.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-storage.js) | `27135C0BFBE274D7A93216102EE2BB85B0AA0B995CD1809FFA1F436C0778E284` | 24,306 | 동일 |
| [personal-plan-editor-controls.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls.js) | `FC0F35C12C196A10CA9C96EC90530F1CF691612F4D3BAD92F2B5DAE0A4CF4869` | 6,624 | 동일 |
| [timeline-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-context.js) | `3021C76E1AD513FDA92E610E650FE66085E93BE5B856EB9ED39E79480A56BD69` | 14,795 | 동일 |
| [model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js) | `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67` | 175,396 | 동일 |

app·builder·style·생성 HTML은 root의 별도 UI 작업 범위다. 이 해시 목록에 넣거나 이 모델 결과로 후보 동결을 주장하지 않는다. 시작 전 경로 확인에서 존재하지 않는 `workspace-permanent-delete-storage.js`를 조회한 1회 오류는 실제 시험 실행 전의 파일명 조사 오류였다. 실제 삭제 저장 구현은 S 경로이며, 올바른 8개 모델과 24개 시험 파일 목록으로 다시 검산한 뒤 실행했다.

## 6. PASS 해석과 남은 범위

579개에는 실패를 안전하게 거절하는 negative 검사와 기존 composer의 한계를 기록하는 characterization 검사도 있다. 예를 들어 source store 누락/손상 fallback, raw API의 별도 source drift 미감지, source에서 추가된 Item의 membership 미지원 등을 기존 경로에서 재현하는 검사가 PASS할 수 있다. 이는 해당 기능을 구현했다는 뜻이 아니다. 새 bound reader의 capability 차단과 실제 지원 경로 검사는 별도로 구분한다.

이번 실행에서 새 모델 실패는 발견하지 못했다. 다만 다음은 **이 합동 회귀만으로 완료를 주장할 수 없다**.

- app의 Plan/Item 화면 연결·parent/child 입력 보존·복구 안내와 실제 버튼 동작
- 생성 HTML, file URL, React production, 5 viewport, 가림·콘솔·page error
- 개인 구간/전역 Item 순서 등 아직 지원하지 않는 원본 요구
- 실제 Android Chrome/iOS Safari, 실제 IME·보조기술, 관찰 사용자 검증
- 전체 `npm test`, production build, 배포와 운영 데이터의 실제 사용자 저장소 대조

제품·시험 파일 수정 0건, 공용 report-data/progress 수정 0건이다. 새 QA와 실행 증거만 작성했다. commit/push/PR/Preview/Production 배포 미실행, 관찰 사용자 0명이다.
