# FlowMe P31 Independent My Flow Review Handoff

작성일: 2026-07-24

## 목적

이 패키지는 P31 production을 다시 구현하기 위한 문서가 아니다. Claude Design과 Codex가 같은 current production을 여러 페르소나의 연속 사용자 여정으로 독립 검토하고, 특히 `My Flow`가 실제 서비스 수준의 실행 공간인지 판단하도록 만든 handoff다.

이번 검토는 기존 구조를 지키는 결론을 미리 정하지 않는다. current evidence가 충분하면 My Flow 내부 정보 구조, 화면 문법, drill-in 방식, 완료·기록·관리 배치를 대폭 재구성할 수 있다. 다만 source, personal overlay, execution run, recurrence occurrence, export identity 같은 안정된 데이터 계약을 UI 불편의 원인으로 단정하거나 근거 없이 다시 만들지는 않는다.

자동화, screenshot, agent simulation은 실제 사용자 검증이 아니다. 실제 관찰 사용자는 여전히 `0`명이다.

## 현재 기준

| 항목 | 값 |
| --- | --- |
| Production | <https://flowme2605.vercel.app> |
| Current `origin/main` | `555da4e013cc9090b76b78cc81619057409772dc` |
| P31 앱 구현 merge | `0227cd2fa7a93ea9ff7d9776b76b0cc33401279b` / [PR #150](https://github.com/knhbae/flowme2605/pull/150) |
| P31 closeout merge | `97f7d31e770cbc77eaae3291eefddbca5adf202b` / [PR #151](https://github.com/knhbae/flowme2605/pull/151) |
| P31 production smoke | `12 / 12` |
| P31 24-cell simulation | supported `21`, partial `3`, blocked `0` |
| 실제 관찰 사용자 | `0` |

`555da4e`는 P31 뒤의 research/harness 보존 변경이며 P31 앱 composition을 다시 바꾸지 않았다. 그래도 reviewer는 production과 current source가 다르면 current source를 우선하고 차이를 명시해야 한다.

## 이번 검토에서 답할 결정

1. Home과 Flow 찾기의 역할 분리가 실제 사용자에게 충분히 다르게 읽히는가.
2. 저장한 Flow를 My Flow에서 찾고 여는 경로가 1개, 5개, 20개, 60개 규모에서도 자연스러운가.
3. 모바일 My Flow의 `지금 / Flow 목록 / 완료`와 Flow workspace의 `실행 / 전체 계획 / 기록`이 서로 다른 역할로 이해되는가.
4. 같은 Flow 또는 Item이 여러 영역에서 동시에 실행 가능한 것처럼 보이지 않는가.
5. 다음 행동, 전체 구조, 개인 수정, 완료·다시 열기, export, 보관·복구가 한 화면에서 경쟁하지 않는가.
6. timeline, checklist, routine, mixed travel plan, record/memo, personal draft가 같은 shell을 쓰면서도 각 콘텐츠의 핵심 형태를 잃지 않는가.
7. My Flow 내부 재배치만으로 해결 가능한가, 아니면 My Flow 정보 구조를 전면 재구성해야 하는가.
8. My Flow 재구성으로도 Home·Find·Calendar 중복이 남을 때만 4탭 IA 재검토가 필요한가.

## 판정 단계

| 판정 | 의미 |
| --- | --- |
| `keep_p31` | 현재 구조를 유지하고 copy·spacing·minor hierarchy만 정리 |
| `bounded_revision` | 한두 surface 또는 command 위치만 제한적으로 수정 |
| `my_flow_structural_reopen` | My Flow 내부 IA와 화면 composition을 다시 설계하되 4탭과 데이터 계약은 유지 |
| `cross_tab_ia_reopen` | My Flow만 고쳐서는 Home·Find·Calendar 역할 중복이 해결되지 않음. 4탭 역할까지 비교 설계 필요 |

`cross_tab_ia_reopen`은 마지막 선택지다. current production에서 재현되는 교차 탭 중복과 더 작은 대안이 실패한 근거가 있어야 한다.

## 검토 정본 순서

1. [Production](https://flowme2605.vercel.app)
2. [P31 evidence README](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/README.md)
3. [P31 route evidence](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/route-evidence.json)
4. [P31 journey results](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/journey-results.json)
5. [P31 production screenshots](https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/production-smoke/screenshots)
6. [STATUS](https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md), [ROADMAP](https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md), [PRODUCT_PRINCIPLES](https://github.com/knhbae/flowme2605/blob/main/docs/PRODUCT_PRINCIPLES.md)
7. [AppClient current source](https://github.com/knhbae/flowme2605/blob/main/components/flow/AppClient.tsx)
8. 이 패키지의 persona, My Flow framework, reference benchmark, output contract

판단 우선순위:

```text
current production interaction
-> current production screenshot
-> current source
-> current P31 structured evidence
-> prior design artifact
-> external reference pattern
```

## 역할

| Reviewer | 주 책임 | 금지 |
| --- | --- | --- |
| Claude Design | mobile/wide hierarchy, interaction grammar, comparative wireframe, visual density, structural alternative | 앱 코드 수정, 긴 설명으로 문제 덮기, reference 화면 복제 |
| Codex | current production 재현, source/data 영향, 접근성, persistence, projection parity, 테스트 가능한 acceptance | 검토 중 앱 코드 수정, prior 수치 재사용, 자동 QA를 사용자 검증으로 표현 |

두 reviewer 모두 같은 8 personas x 3 sessions = 24 cells와 같은 판정 단계를 사용한다.

## 파일

- [unified-review-prompt-ko.md](./unified-review-prompt-ko.md): 한 번에 전달하는 공용 복붙 프롬프트
- [claude-design-prompt-ko.md](./claude-design-prompt-ko.md): Claude Design 전용 진입 프롬프트
- [codex-independent-review-prompt-ko.md](./codex-independent-review-prompt-ko.md): Codex 전용 진입 프롬프트
- [persona-journey-simulation-ko.md](./persona-journey-simulation-ko.md): 8 personas x 3 sessions 상세 시나리오
- [my-flow-structural-review-framework.md](./my-flow-structural-review-framework.md): My Flow 전면 재구성 여부 판단 기준
- [reference-benchmark.md](./reference-benchmark.md): Todoist, Things, Reminders, Google Calendar, Notion, TickTick, Wanderlog, Hevy, Strava 비교
- [review-checklist-ko.md](./review-checklist-ko.md): route·viewport·accessibility·recovery 검토표
- [simulation-output-contract.json](./simulation-output-contract.json): 공통 JSON 결과 규격
- [source-manifest.json](./source-manifest.json): current SHA, evidence, source, reference 목록
- [handoff-preparation-smoke.json](./handoff-preparation-smoke.json): 패키지 작성 시점 production sanity
- [screenshots](./screenshots): current public, receipt, My Flow, Calendar 기준 화면

## Handoff 작성 시점 sanity

2026-07-24에 production을 새 브라우저에서 다시 열어 아래 기준 화면을 캡처했다.

- public moving save-before `390x844`
- moving 저장 receipt `390x844`
- Calendar route의 moving 저장 receipt `390x844`
- My Flow focused workspace `390x844`
- My Flow library/canvas/inspector `1024x768`
- Calendar multi-Flow `390x844`

캡처한 상태에서 horizontal overflow와 이름 없는 visible focusable element는 `0`이었다. 같은 tab session의 console warning/error도 `0`이었다.

이는 검토 패키지의 링크와 current 화면이 열리는지 확인한 preparation smoke다. 24-cell 독립 검토나 실제 사용자 관찰을 대신하지 않는다.

## 필수 산출물

검토자는 다음을 만든다.

```text
README.md
audit.md
review.html
persona-journey-scorecard.json
my-flow-complexity-metrics.json
journey-discontinuity-matrix.json
reference-pattern-matrix.md
decision-matrix.json
next-program.md
route-evidence.json
screenshots/
```

`review.html`에는 current와 최소 3개 proposed My Flow 대안을 390px과 1024px으로 나란히 보여줘야 한다. proposed는 예쁜 정지 화면이 아니라 같은 persona 시나리오를 끝까지 통과할 수 있는 상호작용 구조여야 한다.

## 결과 채택 기준

다음 조건을 모두 만족하는 finding만 후속 구현 후보가 된다.

- current production에서 재현되거나 current source로 입증된다.
- route, viewport, start state, 기대/실제, 사용자 영향이 있다.
- 어떤 persona/session transition을 끊는지 명시한다.
- reference pattern을 그대로 복제하지 않고 FlowMe의 portable execution 역할로 번역한다.
- source/personal/run/occurrence/export 계약 영향과 migration 필요 여부가 있다.
- rollback과 acceptance screenshot/test marker가 있다.
- 자동화로 알 수 있는 것과 실제 사용자에게 물어야 할 것을 분리한다.

실제 social proof 데이터가 없으므로 사용자 수, 리뷰 수, 검증 수를 production 제안에 지어내지 않는다. prototype에서 정보 위치를 실험하려면 `가상 데이터 - production 금지`로 표시한다.
