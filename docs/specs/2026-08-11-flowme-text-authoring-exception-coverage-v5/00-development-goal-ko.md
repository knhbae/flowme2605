# FlowMe Text Authoring 예외 처리·일정 커버리지 v5 상세 목표

- 작성일: 2026-08-11 KST
- 작업 브랜치: `codex/text-authoring-v5-integration-20260811`
- 통합 작업 위치: `D:\flowme2605\flow-text-authoring-integration-20260811`
- 상태: `INTEGRATION_QA_PASS / DRAFT_PR_OPEN`
- 선행 기준: [현재 문법·처리 로직](../2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md)
- 적용 화면: `/flows/new?authoringQa=1`, standalone Text Authoring 검토 HTML
- 비범위: AI 작성, 외부 Calendar/Todo/Excel 전송, P35 통합, production 배포, 관찰 사용자 검증
- 결과 기록: [v5 구현·검증 결과](../../content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/README.md)

## 1. 한 문장 목표

처리 방침이 이미 결정된 입력 오류를 `예외 처리`로 정확히 분류하고, 매일 반복 종료일과 같은 날 여러 일정의 시간순 표시를 검토 사례와 네 결과에서 재현 가능하게 고정한다.

## 2. v5가 바로잡는 경계

v4의 Calendar·Todo·Sheet·TXT occurrence 동등성과 실제 월간 Calendar 방향은 유지한다. v5는 아래 두 경계만 구체화한다.

1. `예외 처리`는 outstanding issue가 `0`이라는 뜻이 아니다. 파서가 추정하지 않고 원문을 보존하며, 차단 범위와 사용자의 복구 행동이 결정적으로 정해진 사례를 뜻한다.
2. Calendar와 ICS는 같은 날짜 안에서 종일 일정과 시간 일정을 실제 일정 도구처럼 정렬한다. Todo·Sheet·TXT와 canonical 원문은 작성 순서를 유지한다.

## 3. 예시 분류 계약

standalone 전체 검토 목록은 `기본 문법 1 + 검증 예시 30 = 31`개다.

| 그룹 | count | 현재 의미 |
| --- | ---: | --- |
| `existing_content` | 8 | source-backed 기존 콘텐츠 변환 |
| `condition_change` | 11 | 한 조건을 바꾼 회귀 사례와 v5 일정 사례 |
| `compatibility` | 6 | 읽기는 지원하지만 writer가 새로 만들지 않는 입력 |
| `exception_handling` | 5 | 처리·차단·복구 방침이 정해진 fail-closed 사례. open/outstanding issue가 남을 수 있음 |
| `review_needed` | 0 | 처리 방침 자체가 아직 정해지지 않아 제품 결정을 더 해야 하는 사례 |

`원문 수정 필요`는 사용자가 해야 할 다음 행동이고, `검토 필요` 그룹과 동의어가 아니다. 처리 방침이 확정된 사례가 원문 수정 전까지 open/outstanding 상태를 유지해도 분류는 `예외 처리`다. UI는 선택할 사례가 없는 `검토 필요` optgroup을 렌더링하지 않지만 count ledger와 QA는 `0`을 명시한다.

### 3.1 `review_needed`에서 이동하는 세 사례

| scenario ID | 처리 방침 | issue 상태 |
| --- | --- | --- |
| `error-ambiguous-date` | `8월 3일`을 임의 연도로 추정하지 않고 Calendar를 만들지 않으며 `YYYY-MM-DD` 수정을 안내 | open + outstanding, non-blocking |
| `error-invalid-relative-date` | `내일`을 임의로 `D+1`로 바꾸지 않고 `D-숫자 / D-Day / D+숫자` 수정을 안내 | open + outstanding, non-blocking |
| `error-url-only` | URL 본문을 발명하지 않고 구조 결과를 막으며 본문 직접 입력을 안내 | open + outstanding, blocking |

두 기존 사례 `error-unknown-property`, `error-explanatory-prose`와 합쳐 `exception_handling`은 5개다.

## 4. 추가 condition 사례

### 4.1 매일 반복 + 종료일

- scenario ID: `change-daily-repeat-until-date`
- 첫 회차: `2026-08-11 07:30`
- 반복: `매일`
- 반복 종료: `2026-08-15`
- 기대 회차: 시작일과 종료일을 모두 포함한 `2026-08-11`부터 `2026-08-15`까지 5개
- 기대 결과: Calendar·Todo·Sheet·TXT가 같은 5개 회차와 날짜 집합을 사용하고 canonical Item은 1개 유지

### 4.2 같은 날 여러 일정 · 시간순

- scenario ID: `change-same-day-timed-agenda`
- 날짜: `2026-08-20`
- Calendar·ICS 기대 순서: `행사 안내 확인`(종일) → `참가 등록`(09:00) → `발표 세션 참여`(10:00) → `네트워킹 메모 정리`(16:30)
- 동일 시간 tie-break: source order
- Todo·Sheet·TXT 기대 순서: source order
- source rewrite: 사용자가 별도 정렬 action을 실행하지 않는 한 없음

## 5. 정렬·projection 계약

Calendar preview, Calendar projection과 ICS export는 아래 키를 공유한다.

1. resolved date 오름차순
2. 같은 날에는 종일 일정 우선
3. 시간 일정은 `HH:mm` 오름차순
4. 날짜·종일 여부·시간이 같으면 source order

Todo·Sheet·TXT는 이 표시 순서를 원문에 역적용하지 않고 source order를 유지한다. 날짜가 잘못되었거나 없는 Item을 정렬을 위해 Calendar에 만들지 않는다.

## 6. 정본과 영향 경로

| 역할 | 경로 |
| --- | --- |
| scenario 정본 | `lib/flow/text-authoring/grammar-simulation-cases.ts` |
| scenario 의미 검사 | `lib/flow/text-authoring/grammar-simulation.test.ts` |
| demo 분류·label 검사 | `lib/flow/text-authoring/demo-examples.test.ts` |
| 반복 규칙 검사 | `lib/flow/text-authoring/recurrence.test.ts` |
| Calendar model 검사 | `components/flow/text-authoring/calendar-preview-model.test.ts` |
| projection/export 정렬 검사 | `lib/flow/text-authoring/artifact-projection.test.ts`, `lib/flow/text-authoring/file-export.test.ts` |
| 생성된 QA catalog | `components/flow/text-authoring/validated-examples.generated.json` |
| 생성기 | `scripts/content-audit/sync-text-authoring-demo-examples.ts` |
| route E2E | `tests/e2e/text-authoring.spec.ts` |
| standalone build | `scripts/build-text-authoring-standalone.mjs` |
| v5 browser capture | `scripts/content-audit/capture-text-authoring-review-completeness.ts` |
| grammar report build | `scripts/content-audit/build-text-authoring-grammar-simulation.ts` |

생성된 JSON과 standalone HTML을 손으로 고치지 않는다. scenario 정본 변경 뒤 generator와 build를 순서대로 다시 실행한다.

## 7. 필수 QA 순서

1. `npm.cmd run sync:text-authoring-demo-examples`
2. 관련 targeted tests: grammar simulation, demo examples, recurrence, Calendar model, artifact projection, file export
3. `npm.cmd run test:text-authoring`
4. `npm.cmd test`
5. `npm.cmd run build`
6. 기존 `3104` 서버가 stale build를 재사용하지 않는지 확인한 뒤 `tests/e2e/text-authoring.spec.ts --workers=1`
7. `npm.cmd run build:text-authoring-html`
8. standalone 실제 출력 디렉터리를 `127.0.0.1:4184`로 서빙하고 `scripts/content-audit/capture-text-authoring-review-completeness.ts` 실행
9. grammar UI evidence의 출력 경로와 grammar report builder의 입력 경로가 같은지 확인한 뒤 UI capture와 `npm.cmd run simulate:text-authoring-grammar` 실행
10. 필요 시 `npm.cmd run build:text-authoring-v2-results`
11. 실제 count·bytes·SHA-256·HTTP·browser QA를 결과 문서에 기록한 뒤 `npm.cmd run docs:check`, `git diff --check`

테스트 수, standalone bytes/SHA-256, HTTP 결과와 browser QA는 실행 전 추정하지 않고 [v5 결과 ledger](../../content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/README.md)의 실제 측정값만 사용한다.

## 8. 수용 기준

### 분류·count

- [x] validated scenario는 30개이고 전체 QA catalog는 31개다.
- [x] 그룹 count는 `8 / 11 / 6 / 5 / 0`이다.
- [x] 세 오류 사례는 `exception_handling`이며 결과 label은 `예외 처리`, 다음 행동은 `원문 수정 필요 1건`이다.
- [x] open/outstanding/blocking 상태를 분류를 맞추기 위해 거짓으로 닫지 않는다.

### 일정 동작

- [x] 매일 반복 종료일은 양 끝 날짜를 포함해 5회다.
- [x] 같은 날 Calendar·ICS는 종일 → 09:00 → 10:00 → 16:30 순서다.
- [x] Todo·Sheet·TXT와 원문은 source order를 유지한다.
- [x] Text Authoring `203 / 203`, main unit lane `173 / 173 + 622 / 622 + 182 / 182`, focused E2E `37 / 37`, legacy 작성기 E2E `2 / 2`, Next build `18` routes가 통과한다.
- [x] acceptance matrix의 현재 API 행은 `27 / 27`이며, 과거 browser 행 8개는 현재 UI 증거에 합산하지 않고 `pending`으로 둔다.

### 산출물·브라우저

- [x] standalone HTML은 `2,166,914` bytes, SHA-256 `2919F47DC4EDC07408216EC17360FC8CA0D87F1B6543F6BFA78114DEA848F2EC`이며 HTTP `200` body도 같은 bytes다.
- [x] `1440×1000 / 900×700 / 899×700 / 390×600 / 390×844` browser QA에서 전체 31개, 그룹 `8 / 11 / 6 / 5 / 0`, 새 두 사례, scroll end, overflow/error `0`을 확인했다.
- [x] desktop browser QA의 broader coverage check가 `true`다.
- [x] grammar simulation은 `30 / 30`이며 catalog mismatch가 있는 과거 UI evidence를 현재 report에 붙이지 않았다. 현재 UI 증거는 v5 browser QA다.
- [x] 자동 QA를 관찰 사용자 검증으로 표현하지 않는다. 관찰 사용자 세션은 `0`이다.

### 완료 증거

- Text Authoring: `203 / 203 PASS`
- grammar simulation: `30 / 30 PASS`; 과거 UI evidence `not-attached`
- main unit lanes: pretest `173 / 173`, main `622 / 622`, approved-plan `182 / 182 PASS`
- acceptance: API `27 / 27 PASS`, 과거 browser `8 pending`
- focused E2E: `37 / 37 PASS`
- Next production build: `PASS`, `18` routes
- standalone: `2,166,914` bytes, HTTP `200`, SHA-256 `2919F47DC4EDC07408216EC17360FC8CA0D87F1B6543F6BFA78114DEA848F2EC`
- [v5 browser QA](../../content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/browser-qa.json): `PASS`, checkedAt `2026-08-11T06:49:19.381Z`, 5 viewports, errors/overflow `0`, desktop broader coverage `true`

## 9. 명시적 비범위

- 모호한 날짜·상대 날짜·URL 본문 자동 추정
- open/outstanding issue를 분류 count를 맞추기 위해 자동 해결
- 원문의 자동 시간순 재작성
- n번째 요일, 공휴일, 예외일, timezone 변환 정책 확장
- 외부 Calendar/Todo/Excel 실제 쓰기
- P35 adapter 변경, merge, production deploy. Draft PR의 자동 Vercel Preview는 검토용 CI 결과로만 취급한다.
- 관찰 사용자 검증

자동 테스트, 시뮬레이션, screenshot과 내부 browser QA는 구현 증거이며 관찰 사용자 검증이 아니다.
