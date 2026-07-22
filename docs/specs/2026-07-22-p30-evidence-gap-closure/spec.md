# P30 Interaction Correctness And Evidence Closure Spec

**Date:** 2026-07-22  
**Status:** Approved for staged implementation  
**Owner:** FlowMe owner + Codex implementation, Claude Design comparison review  
**Related roadmap:** [P30 Evidence Gap Closure](../../ROADMAP.md#p30-interaction-correctness-and-evidence-closure)

## Goal

P29 production의 제품 구조를 유지하면서 모바일 nested-state correctness, keyboard reading order, 긴 Flow 조정, My Flow command hierarchy, Calendar scale/evidence를 마감한다. 사용자는 export를 열었을 때 primary action을 가림 없이 실행하고, keyboard로 화면의 의미 순서대로 이동하며, 긴 Flow와 많은 Calendar Flow도 설명 없이 조정할 수 있어야 한다.

## Stage Fit

FlowMe는 source를 개인 실행물로 바꿔 My Flow, Calendar, export로 이어 주는 portable execution layer다. P29에서 이 구조와 주요 surface는 구현됐다. P30은 새 planner 기능을 추가하는 단계가 아니라, 실제 production nested state에서 발견된 오류와 검증 공백을 닫는 release-hardening 단계다.

## User Need

- 모바일 사용자는 export panel을 열어도 고정 CTA/nav에 가리지 않고 결과를 실행해야 한다.
- keyboard 사용자는 header에서 현재 화면 본문을 읽은 뒤 persistent navigation으로 이동해야 한다.
- 긴 Flow 사용자는 전체 item 목록을 먼저 훑지 않고 제목·날짜 같은 일반 조정에 도달해야 한다.
- 반복 사용자와 20~50개 Flow 사용자는 다음 행동, 범위, 날짜 배치를 빠르게 구분해야 한다.

## Scope

### In

- public/My Flow export open state의 fixed-layer collision 제거
- mobile header/main/bottom-nav DOM 및 focus order 교정
- save-before decision surface와 24-item adjustment progressive disclosure
- My Flow detail의 next-action/secondary/overflow hierarchy
- Calendar undated deterministic evidence, 50+ scope, compact month identity
- 필요성이 확인된 routine advanced setting density/copy 보정
- 사용하지 않는 legacy composition의 조건부 제거
- 390/1024/1440 nested-state independent final gate

### Out

- source/personal/run/occurrence/export data contract 변경
- persistence schema 또는 migration
- recurrence/calendar engine 교체
- 새 export format과 외부 OAuth/direct sync
- planner 전면 재설계, 새 탭, Studio 승격
- account/DB/cloud sync, real AI/crawler
- source seed/content 의미 변경

## Preserved Product Contract

| Boundary | P30 rule |
| --- | --- |
| Source | 원문 title/item/schedule/source trace를 UI workaround로 수정하지 않는다. |
| Personal overlay | title/date/memo/include/order 등의 개인 값과 stable ID를 유지한다. |
| Execution run | completion/reopen/skipped/held 상태를 layout state에 복사하지 않는다. |
| Occurrence | series와 current occurrence identity를 유지한다. |
| Export | existing preflight, scope, count, receipt와 builder를 재사용한다. |
| Navigation | Home/Flow 찾기/My Flow/Calendar 4탭을 유지한다. |

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | current route의 primary artifact 또는 next action을 확인하고 필요한 command만 연다. |
| Completion signal | export receipt, saved receipt, adjusted summary, Calendar placement/undo처럼 기존 결과 상태를 사용한다. |
| Artifact destination | Calendar, checklist/todo, sheet, memo, ICS의 existing projection을 유지한다. |
| Source/risk boundary | UI composition만 바꾸고 source/personal/run/occurrence/export ownership은 바꾸지 않는다. |
| Natural artifact | moving Calendar 24 events, routine occurrences, undated placement, whole/selected/current exports를 실제 count로 검증한다. |
| Verification | current command, browser interaction, DOM geometry, keyboard, screenshot, production smoke를 구분한다. |

## Program Rules

1. P30-01과 P30-02는 다른 시각 개선보다 먼저 production에서 닫는다.
2. 한 slice가 green evidence 없이 다음 dependent slice로 넘어가지 않는다.
3. component consumer에서 projection/count/identity 사본을 만들지 않는다.
4. initial state만 보지 않고 export open, sheet open, receipt, selected scope 같은 nested state를 측정한다.
5. screenshot의 미관만으로 완료하지 않고 geometry/focus/accessibility assertion을 함께 둔다.
6. automation과 agent simulation을 observed-user validation으로 표현하지 않는다.

## Program Acceptance Criteria

- `390x844` public/My Flow export open state에서 fixed-primary intersection이 `0`이다.
- `/my`, `/calendar` mobile focus order가 header/skip -> main -> persistent navigation 순서다.
- 24-item Flow에서 제목·날짜 조정은 full item list를 먼저 통과하지 않는다.
- My Flow detail의 visible primary는 next action 하나이며 source/archive는 accessible overflow에 있다.
- Calendar 50+ fixture에서 selected/active/other scope를 검색과 disclosure로 탐색할 수 있다.
- deterministic undated fixture에서 10개 -> 2개 배치 -> undo가 재현된다.
- 1024 month cell은 compact identity를 유지하고 selected-day agenda/accessible name은 full identity를 보존한다.
- P29 stable contract regression은 `0`이다.
- 390/1024/1440에서 horizontal overflow, fixed overlap, unnamed focusable, console/page error가 `0`이다.
- observed-user count는 실제 관찰 전까지 `0`으로 명시한다.

## Success Markers

- `P30-MOBILE-EXPORT-NO-FIXED-OVERLAP`
- `P30-MOBILE-WORKSPACE-FOCUS-ORDER`
- `P30-SAVE-BEFORE-SINGLE-DECISION`
- `P30-LONG-FLOW-CONTEXTUAL-ADJUST`
- `P30-MY-FLOW-COMMAND-HIERARCHY`
- `P30-CALENDAR-UNDATED-EVIDENCE`
- `P30-CALENDAR-SCOPE-SCALE`
- `P30-CALENDAR-COMPACT-IDENTITY`
- `P30-ROUTINE-ADVANCED-DENSITY`
- `P30-NESTED-STATE-GATE`

