# FlowMe Text Authoring v5 예외 처리·일정 커버리지 결과

- 작업일: 2026-08-11 KST
- 브랜치: `codex/text-authoring-v5-integration-20260811`
- 기능 기준점: integration commit `f5928d8`
- 상태: `INTEGRATION_QA_PASS / DRAFT_PR_OPEN`
- 관찰 사용자 세션: `0`
- 게시 상태: v5 evidence commit `082eb92` push · Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175) open · GitHub CI와 자동 Vercel PR Preview check PASS · merge, production deploy, P35 integration 미수행

## 1. 현재 구현 결과

[v5 상세 목표](../../specs/2026-08-11-flowme-text-authoring-exception-coverage-v5/00-development-goal-ko.md)에 따라 현재 로컬 구현은 다음 계약을 반영한다.

1. 전체 검토 catalog는 `기본 문법 1 + 검증 예시 30 = 31`개다.
2. validated 그룹은 `기존 콘텐츠 8 / 조건 변경 11 / 호환 입력 6 / 예외 처리 5 / 검토 필요 0`이다.
3. `error-ambiguous-date`, `error-invalid-relative-date`, `error-url-only`는 처리 방침이 확정된 `exception_handling`으로 이동했다. 세 사례의 open/outstanding issue와 URL-only의 blocking 상태는 그대로 유지한다.
4. `change-daily-repeat-until-date`는 `2026-08-11`부터 `2026-08-15`까지 양 끝 날짜를 포함한 5개 회차를 네 결과에 투영한다.
5. `change-same-day-timed-agenda`의 Calendar·ICS는 종일 일정 뒤 `09:00 / 10:00 / 16:30` 순서이고 Todo·Sheet·TXT는 source order를 유지한다.

최종 통합 QA는 Text Authoring `203 / 203`, grammar simulation `30 / 30`, main의 unit lane `173 / 173 + 622 / 622 + 182 / 182`, focused E2E `37 / 37`, legacy 작성기 회귀 `2 / 2`, Next build `18` routes와 v5 browser QA `PASS`다. v2 acceptance matrix의 API 행은 `27 / 27`이고, 현재 UI와 맞지 않는 과거 browser 행 8개는 `pending`으로 남겨 현재 증거에 합산하지 않는다. 현재 UI 증거는 focused E2E와 이 결과 폴더의 v5 browser QA가 소유한다.

## 2. 분류 결과

| 그룹 | count | scenario 변화 |
| --- | ---: | --- |
| 기존 콘텐츠 | 8 | 변화 없음 |
| 조건 변경 | 11 | daily-until, same-day timed agenda 2개 추가 |
| 호환 입력 | 6 | 변화 없음 |
| 예외 처리 | 5 | 기존 2개 + 분류 이동 3개 |
| 검토 필요 | 0 | 세 사례의 처리 방침 확정으로 비어 있음 |

`예외 처리`는 “issue가 해결됨”이 아니라 “fail-closed 처리와 복구 행동이 결정됨”을 뜻한다. 따라서 다음 표시가 동시에 참이다.

- 예시 그룹/result label: `예외 처리`
- 사용자 다음 행동: `원문 수정 필요 1건`
- runtime issue: open + outstanding
- URL-only: blocking

## 3. 새 일정 사례의 기대 결과

| scenario | Calendar | Todo·Sheet·TXT | ICS |
| --- | --- | --- | --- |
| `change-daily-repeat-until-date` | 8월 11~15일 5회 | 같은 날짜 집합 5회 | 같은 bounded occurrence 5개 |
| `change-same-day-timed-agenda` | 종일 → 09:00 → 10:00 → 16:30 | source order | 종일 → 09:00 → 10:00 → 16:30 |

Calendar/ICS의 tie-break는 `date → all-day first → time → source order`다. 이 표시 정렬은 원문을 자동 재작성하지 않는다.

## 4. 서비스·콘텐츠 형태 확장 감사

서비스 이름을 하나씩 예시로 늘리는 대신, 원문 형태와 결과 행동이 실제로 다른지를 기준으로 비교했다. Google Calendar의 반복 일정은 반복 주기와 종료를 함께 다루고, Microsoft To Do는 할 일 아래 단계·메모·파일을 둔다. Notion은 sub-item과 dependency를 구분하며, Excel 표는 header가 있는 행을 정렬·필터 가능한 데이터로 다룬다. 이 공통 패턴을 FlowMe의 Calendar/Todo/Sheet/TXT 계약에 대입한 결과는 다음과 같다.

| 서비스·콘텐츠 형태 | 현재 커버 | 예시를 더 늘리지 않은 이유 | 실제 남은 공백 |
| --- | --- | --- | --- |
| Calendar·일정 | D-day, 절대·상대 날짜, 시간, 일·주·월 반복, 횟수·종료일, 같은 날 종일/시간순 | 건강·가족·업무 일정도 현재 문법 구조는 동일 | 매년, n번째 요일, 공휴일 제외, 개별 회차 예외, 여러 날 기간 |
| Todo·체크리스트 | 부모 Item, 한 단계 하위 `- [ ]`, 날짜 없는 할 일, 설명·링크 | 강의·구매·여행·행정·개인 메모로 이미 검증 | 깊은 중첩, 담당자, dependency, 공유 완료 상태 |
| 표·CSV·Excel | TSV, quoted CSV, Markdown 표, 14주 강의·38장 오디오북, 반복 회차 행 | 쇼핑 비교는 기존 CSV와 신차 사례의 구조를 반복 | multiline CSV, escaped pipe, XLSX 원본 입력, 통화·가격 의미 |
| 문서·일반 메모 | 표식 없는 문장 TXT 보존, unknown detail, 안내·주의·자료·출처 | 장문 문서도 단순 문단이면 같은 보존 규칙 | blockquote/code/HTML 구조와 긴 문서의 action 경계 |
| 영상·강의·책·오디오 | 영상 7개, K-MOOC 14주, LibriVox 38장 | 같은 root Item 문법으로 source fidelity를 이미 확인 | feed/목차 URL 가져오기와 구조화된 미디어 metadata |
| 루틴 | daily/weekly/monthly, 종료일·횟수, 네 결과 동일 occurrence | 건강·운동·가사도 반복 규칙 자체는 동일 | 조건 자동 판정, 예외일, timezone 변경, 민감정보 정책 |
| 혼합 레시피 | 재료 표와 조리 체크를 각각은 읽을 수 있음 | 성공 예시로 추가하면 현재 한계를 숨김 | 사실 행인 재료와 실행 행인 조리 단계를 projection별로 분리하지 못함 |
| 프로젝트·협업 | 개인 절차 목록은 Todo로 보존 | 담당자·dependency를 설명 문자열로만 두는 것은 구조 지원이 아님 | assignee/dependency/shared state의 별도 계약 |

따라서 이번에는 구조적으로 새 검증을 만드는 `매일 + 종료일`과 `같은 날 종일 + 시간 일정` 두 사례만 추가했다. 다음 후보는 (1) 날짜 없는 팟캐스트·자료 큐의 긍정 사례와 (2) 재료 표+조리 단계 혼합 레시피의 fail-closed 경계 사례다. 후자는 사실 행이 Todo로 섞이지 않는 역할 계약을 먼저 결정한 뒤 추가해야 한다.

참고한 인접 서비스 문서: [Google Calendar 반복 일정](https://support.google.com/calendar/answer/37115?hl=en-uk), [Microsoft To Do 작업 관리](https://support.microsoft.com/en-US/ToDo/managing-tasks-in-microsoft-to-do), [Notion sub-items와 dependencies](https://www.notion.com/en-gb/help/tasks-and-dependencies?nxtPslug=tasks-and-dependencies), [Excel 표 만들기](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mcaps/documents/fy26/QRG-Create-a-table.pdf). 이는 서비스 패턴 비교 근거이며 FlowMe 사용자 검증이 아니다.

## 5. 정본·생성 산출물

| 역할 | 경로 | 현재 기대 |
| --- | --- | --- |
| scenario 정본 | `lib/flow/text-authoring/grammar-simulation-cases.ts` | 30개, 그룹 `8/11/6/5/0` |
| generated catalog | `components/flow/text-authoring/validated-examples.generated.json` | 30개, 이동 3개 label `예외 처리 · 원문 수정 필요 1건` |
| route E2E | `tests/e2e/text-authoring.spec.ts` | 전체 31개와 새 두 사례 검증 |
| standalone | `docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html` | `2,166,914` bytes, SHA-256 `2919F47DC4EDC07408216EC17360FC8CA0D87F1B6543F6BFA78114DEA848F2EC` |
| grammar JSON | `docs/content-audit/2026-07-31-flowme-text-authoring-grammar-simulation/grammar-simulation-results.json` | `30 / 30`; catalog-mismatch 과거 UI evidence는 미첨부 |
| grammar HTML | `docs/content-audit/2026-07-31-flowme-text-authoring-grammar-simulation/flowme-text-authoring-grammar-simulation-ko.html` | 30 scenario와 현재 filter count로 재생성 |
| browser QA | `docs/content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results/browser-qa.json` | `PASS`, `2026-08-11T06:49:19.381Z`, 5 viewports |

## 6. 최종 QA ledger

| Gate | 기대 | 실제 |
| --- | --- | --- |
| generated JSON sync | 30 validated, `8/11/6/5/0` | `PASS` |
| targeted tests | grammar/demo/recurrence/calendar/projection/export 통과 | `PASS` · Text Authoring suite에 포함 |
| Text Authoring suite | `npm.cmd run test:text-authoring` 통과 | `203 / 203 PASS` |
| main unit lanes | `npm.cmd test` 통과 | pretest `173 / 173`, main `622 / 622`, approved-plan `182 / 182` PASS |
| grammar simulation | 30 scenario 통과, stale UI evidence 미부착 | `30 / 30 PASS` · 과거 UI evidence는 catalog mismatch로 not-attached |
| acceptance matrix | 현재 API 행과 과거 browser 행을 분리 | API `27 / 27 PASS` · 과거 browser `8 pending` |
| focused E2E | 전체 31개 catalog, daily 5회, same-day 순서 | `37 / 37 PASS` |
| legacy 작성기 E2E | `?legacy=1` 기존 NewFlow 경로 | `2 / 2 PASS` |
| Next production build | 성공, route count 측정 | `PASS` · `18` routes |
| standalone build | 실제 bytes 측정 | `2,166,914 bytes` |
| standalone SHA-256 | 실제 파일 hash 측정 | `2919F47DC4EDC07408216EC17360FC8CA0D87F1B6543F6BFA78114DEA848F2EC` |
| standalone HTTP | 실제 server 응답과 body bytes 확인 | `200` · `2,166,914 bytes` |
| browser QA | 5 viewports, error/overflow `0`, scroll end | `PASS` · `2026-08-11T06:49:19.381Z` |
| docs check | 링크·문서 정책 검사 | `PASS` |
| diff check | whitespace/error 검사 | `PASS` · line-ending warning만 있음 |

## 7. 실행 순서

```text
sync:text-authoring-demo-examples
→ targeted tests
→ test:text-authoring
→ full unit
→ fresh Next build
→ focused E2E (stale 3104 server 금지)
→ build:text-authoring-html
→ standalone HTTP server
→ v5 completeness capture
→ current grammar UI capture
→ simulate:text-authoring-grammar
→ optional acceptance result rebuild
→ 실제 수치·bytes·SHA·HTTP·browser QA 기록
→ docs:check
→ git diff --check
```

grammar simulation은 `30 / 30`으로 재생성했다. 기존 UI evidence는 catalog count가 달라 report에 붙지 않았으며, 현재 UI 계약은 아래 v5 completeness capture가 증명한다. standalone capture는 새 standalone build 뒤 실행했다.

## 8. 필수 브라우저 확인

- [x] QA URL에서 전체 `31`, validated `30`, 그룹 `8 / 11 / 6 / 5 / 0`
- [x] product URL 또는 `?authoringQa=0`에서 대표 예시 `5`, QA scenario `0`
- [x] daily-until: Calendar·Todo·Sheet·TXT `5`, 8월 11~15일
- [x] same-day: Calendar 선택일과 ICS `종일 / 09:00 / 10:00 / 16:30`
- [x] 이동한 세 예시: `예외 처리`, `원문 수정 필요 1건`, issue/blocking 상태 보존
- [x] `1440×1000 / 900×700 / 899×700 / 390×600 / 390×844`
- [x] input/result scroll end, horizontal overflow `0`
- [x] actionable console/page/runtime/request error `0`
- [x] desktop broader coverage check `true`
- [x] standalone HTTP `200`, body `2,166,914` bytes, 실제 file bytes와 동일

[v5 browser QA](./browser-qa.json)는 `2026-08-11T06:49:19.381Z`에 `PASS`했고 observed-user session은 `0`이다. [desktop](./browser-1440x1000.png), [mobile 390×600](./browser-390x600.png), [mobile 390×844](./browser-390x844.png), [desktop Calendar](./browser-calendar-1440x1000.png), [mobile Calendar](./browser-calendar-390x844.png), [mobile 선택일 상세](./browser-calendar-detail-390x844.png)를 함께 보관한다.

## 9. 남은 gate

1. owner가 regenerated standalone에서 분류 문구, daily 5회, same-day 정렬과 mobile 도달성을 검토한다.
2. 이번 승인 범위는 commit, push, Draft PR까지다. Vercel PR Preview는 PR 생성으로 자동 실행된 검토용 check이며 production release가 아니다. merge, production deploy와 P35 integration은 별도 승인 전까지 수행하지 않는다.
3. 자동 테스트, simulation, screenshot과 내부 browser QA를 관찰 사용자 검증이라고 부르지 않는다.

현재 상태는 `INTEGRATION_QA_PASS / DRAFT_PR_OPEN`이며 release가 아니다. Draft PR [#175](https://github.com/knhbae/flowme2605/pull/175)는 GitHub run [`31466654229`](https://github.com/knhbae/flowme2605/actions/runs/31466654229)의 두 job과 자동 Vercel PR Preview check가 통과한 검토 상태다. 관찰 사용자 세션은 `0`이며 merge, production deploy, P35 integration은 수행하지 않았다.
