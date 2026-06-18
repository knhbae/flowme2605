# FlowMe Execution Type Roadmap

**Last updated:** 2026-05-31  
**Scope:** My Flow 실행 허브, Flow 타입 모델, 루틴/기간형 체크리스트, Flow 탭, 제작/출력 구조

## Why This Exists

FlowMe is not a routine app. Routine behavior should exist only where it helps a user execute a broader Flow. This roadmap keeps the next work visible outside chat and prevents calendar polish, Flow type decisions, creation UX, and output structure from drifting apart.

## Product Boundary

FlowMe should support routines as a Flow execution pattern, not as a standalone habit platform.

In scope:

- A Flow can have repeated execution items.
- A repeated item can create dated occurrences.
- A routine occurrence can have one current action or a small internal checklist.
- A period goal can distribute a larger checklist across a date range and repeat cadence.
- Users can complete, undo, lightly record, or move one occurrence.

Out of scope for now:

- Habit streaks.
- Advanced statistics or behavior analytics.
- Complex reminder/snooze systems.
- Habit marketplace mechanics.
- AI study coaching or automatic difficulty adjustment.
- Heavy proof/status forms unless user evidence shows they are needed.

## Execution Types

| Type | User-facing meaning | Core fields | Primary surface | MVP status |
|---|---|---|---|---|
| Schedule | A dated action or deadline | title, date, optional time/place/memo | Calendar, Today | Mostly implemented |
| Checklist | A finite list of actions | title, completion state, optional memo | Checklist, Flow tab | Partially implemented |
| Routine | A repeated Flow execution item | repeat rule, occurrence date, current item, progress | Calendar, Routine, Today | Model accepted |
| Period-goal checklist | A large checklist paced across a date range | date range, cadence, ordered items, progress | Calendar, Flow tab, Checklist | Model accepted |
| Memo/record | A lightweight note or observed value | memo/log value, optional file/link | Detail sheet, More | Lightweight implemented |
| Decision/hold | A normal outcome where the user chooses, holds, or rejects | status, next review date, memo | Detail sheet, Flow tab | Lightweight implemented |
| Bucket/long-term goal | A non-urgent goal with milestones | goal, milestones, optional target date | Flow tab, Checklist | Needs decision |

## Accepted Routine Execution Model

Routine in FlowMe means:

> A repeated execution item inside a broader Flow. The Flow category labels the purpose, the repeat rule creates occurrences, and the internal checklist defines what gets completed inside each occurrence.

This is the accepted product model for My Flow P0. FlowMe should not ask “what habit are you building?” It should ask “which part of this Flow repeats while the user works toward the Flow outcome?”

## Routine Data Roles

| Role | Meaning | Example |
|---|---|---|
| Flow category | Describes the broader domain, not the routine behavior | `공부`, `운동`, `이사`, `육아` |
| Repeat rule | Creates dated occurrences | `매일`, `월/수/금`, `매월 1일`, `2026-07-01~2026-07-28 주 5회` |
| Occurrence | The dated instance the user sees today | `2026-07-03 학습` |
| Current action | The next thing to do inside that occurrence | `2장 스프레드시트 1/3` |
| Internal checklist | Optional small ordered work inside the routine | `단어 15개`, `예문 3개`, `복습` |
| Progress | Progress through the Flow work, not habit streak | `항목 4/18` |
| Light record | Optional note/value when the Flow needs it | `오답: 함수 3개`, `반응: 이상 없음` |

Examples:

- `30일 영어 루틴`: category is study, repeat is daily, internal checklist is words/examples/review.
- `4주 러닝 Flow`: category is running, repeat is 3 days per week, internal checklist is warm-up/run/cool-down.
- `이유식 반응 기록`: category is baby food, repeat is daily, occurrence asks for menu/reaction record.
- `월간 차량 점검`: category is car care, repeat is monthly, occurrence has a small inspection checklist.

What this means in UI:

- Calendar shows routine as a light icon, not a heavy event card.
- Selected-day row says the occurrence's current action and progress.
- Detail sheet edits this occurrence first; repeat-rule edits are explicit and staged.
- Completing a routine means completing the current routine item or occurrence, not the entire Flow.
- Moving a routine date moves one occurrence unless the user explicitly changes the series.

## Routine Cases To Support

### 1. Single-Action Routine

Use when one repeated action is enough.

- Example: `매일 단어 20개`, `매주 방 정리`, `월간 차량 상태 확인`.
- Calendar: light routine icon.
- Selected-day row: action title and `이번 항목 완료`.
- Detail: date, optional time/place, repeat summary, memo.
- Completion: one occurrence/action is completed.

### 2. Checklist Routine

Use when one occurrence has a small checklist.

- Example: `홈트 20분`: 스쿼트, 플랭크, 스트레칭.
- Example: `영어 공부`: 단어, 예문, 복습.
- Calendar: light routine icon, overflow if crowded.
- Selected-day row: current checklist item and `항목 n/전체`.
- Detail: current item first, checklist/progress visible, memo secondary.
- Completion: advances the current routine item; undo restores the previous item.

### 3. Period-Goal Checklist Routine

Use when a large checklist must be paced across a target period.

- Example: `컴활 1급 필기 4주 완주`.
- Example: `4주 러닝 완주`.
- Date range and cadence distribute ordered work into dated occurrences.
- Calendar: the occurrence date shows the assigned work.
- Selected-day row: today’s assigned chapter/session and total progress.
- Detail: assigned work, date, repeat/cadence summary, progress, memo.
- Completion: completes the assigned chunk and moves the Flow progress forward.

### 4. Record Routine

Use only when the repeated action’s output is a note or observed value.

- Example: `이유식 반응 기록`, `수면 상태 기록`.
- Calendar: light routine icon or short assigned title.
- Selected-day row: record prompt, not heavy form.
- Detail: one lightweight record/memo field.
- Completion: record saved or marked done.

## Not Routine In MVP

These should not drive P0/P1 FlowMe behavior:

- streak count,
- habit score,
- long-term analytics,
- automatic rescheduling based on failure,
- advanced snooze/reminder rules,
- habit-only templates unrelated to a broader Flow outcome.

## Period-Goal Checklist Case

The certification-study case should become the reference case for period-goal checklist routines.

Example:

- Flow: `컴활 1급 필기 4주 완주`
- Date range: `2026-07-01` to `2026-07-28`
- Cadence: `월/수/금 40분` or `주 5회`
- Large checklist:
  - 1장 컴퓨터 일반
  - 2장 스프레드시트
  - 3장 데이터베이스
  - 2024년 1회 기출
  - 오답 정리
- Generated occurrence:
  - `오늘: 2장 스프레드시트 1/3`
  - progress: `항목 4/18`
  - action: `이번 항목 완료`

This should not become a study analytics product. MVP should only distribute ordered work across a period and show today's assigned item.

## Accepted Period-Goal Checklist Model

Period-goal checklist in FlowMe means:

> A finite ordered checklist distributed across a target period by a simple cadence. It behaves like a paced Flow, not a habit tracker and not a smart study coach.

### Required Inputs

| Input | Meaning | MVP constraint |
|---|---|---|
| Goal title | The outcome the user wants by the end date | One plain title, e.g. `컴활 1급 필기 4주 완주` |
| Start date | When the pacing starts | Required |
| End date or target date | When the checklist should be completed | Required |
| Cadence | How often work is assigned | Daily, weekdays, selected weekdays, or weekly count |
| Ordered checklist | The work to distribute | Required; can include chapter/session groups |
| Optional session size | How much work per occurrence | Text only for MVP, e.g. `40분` or `1강` |

### Generated Outputs

| Surface | What users should see |
|---|---|
| Calendar | Light study/routine indicator plus assigned work only when useful; dense days collapse behind `+N` |
| Today | The next assigned chunk, total progress, and one completion action |
| Selected-day row | `2장 스프레드시트 1/3`, `항목 4/18`, `이번 항목 완료` |
| Detail sheet | assigned chunk, date, cadence summary, progress, memo/log field |
| Flow tab | goal, date range, remaining period, next assigned work, progress |
| Checklist tab | ordered list grouped by chapter/session, with done/open state |

### Completion Rules

- Completing the current assigned chunk advances Flow progress.
- If the assigned chunk has internal sub-items, completion advances the current sub-item first.
- Undo restores the previous chunk/sub-item.
- Moving the date moves one generated occurrence unless the user explicitly changes the cadence/series.
- Missed work should remain visible as overdue or next open work; do not auto-reschedule in P0.

### Certification Study Reference

This is the default reference for UX and tests:

- Flow: `컴활 1급 필기 4주 완주`
- Date range: `2026-07-01 ~ 2026-07-28`
- Cadence: `월/수/금 40분`
- Checklist:
  - `1장 컴퓨터 일반 1/3`
  - `1장 컴퓨터 일반 2/3`
  - `1장 컴퓨터 일반 3/3`
  - `2장 스프레드시트 1/3`
  - `2장 스프레드시트 2/3`
  - `2장 스프레드시트 3/3`
  - `3장 데이터베이스 1/3`
  - `3장 데이터베이스 2/3`
  - `3장 데이터베이스 3/3`
  - `2024년 1회 기출`
  - `오답 정리`
- Flow tab state: `항목 4/11`, `D-21`, `다음 학습: 2장 스프레드시트 2/3`.

### P0 Non-Goals

- No study time analytics.
- No streaks.
- No automatic difficulty adjustment.
- No AI coaching.
- No complex redistribution algorithm.
- No calendar sync conflict resolution beyond current export/preview assumptions.

## Feature/UX Gap Map

| Area | Status | Evidence / current shape | P0 decision |
|---|---|---|---|
| Calendar date selection | Done | Date tap selects date without opening detail; selected date has active style | Keep |
| Calendar item click | Done | Schedule event click opens detail and marks event active | Keep |
| Routine icon display | Done | Routine indicators are lightweight icons; active routine gets explicit emphasis | Keep |
| Routine occurrence move | Done | Detail date edit and drag move one occurrence | Keep one-occurrence default |
| Routine edit staging | Done | Repeat changes have save/cancel and explicit scope | Keep |
| Detail input complexity | Done | Primary fields are title/date/time/place/memo; extra metadata behind more details | Keep calendar/reminder-level complexity |
| Memo/record | Partial | Lightweight log/memo fields exist, but period-goal record use is not modeled in data | Keep lightweight; revisit by Flow type |
| Decision/hold | Partial | Decision status and next review exist in detail; overview signal remains light | Keep as secondary type |
| Period-goal checklist | Partial | Concept now accepted; no canonical seed/demo implementation yet | Next implementation candidate |
| Flow tab status board | Done | `Flow 상태판` now summarizes active Flow count, average progress, next execution, and overdue count before priority cards and the secondary inventory | Keep status-first layout |
| Feature/UX gap tracking | Done for P0 docs | This map records done/partial/missing/deferred | Keep updated per batch |
| Flow creation MVP | Missing | No accepted creation model for period/cadence/checklist input | P1 |
| Creator/channel MVP | Missing | Public/private/source-backed boundary not finalized | P1 |
| Output/category/connection rules | Partial | Destination-specific labels exist; system rules not fully documented | P1 |
| Bucket/long-term goal | Missing | Not decided as first-class type vs checklist+milestones | P1 |
| Caution/risk UI | Deferred | `reference_caution` remains secondary/pending | Wait for sensitive representative Flow evidence |
| Proof/status forms | Deferred | Memo/files/links are enough for now | Wait for observed need |
| Habit analytics/streaks | Deferred | Outside FlowMe P0/P1 routine boundary | Do not build |

## Flow Tab Status Board Audit

Mobile follow-up evaluation: [flow-tab-mobile-evaluation.md](./flow-tab-mobile-evaluation.md)

Design lens: Galaxy Calendar, Samsung Reminder, Apple Calendar, and iOS Reminders all bias the first view toward state and next action. Management controls are present, but they do not compete with the user's immediate question: what needs attention now?

Findings:

1. Medium / Cognitive load: the Flow tab already had priority cards, but the surrounding `전체 Flow 운영` and inventory/search language still made the screen feel like a catalog manager.
2. Medium / Execution clarity: users needed a fast summary of active Flow count, average progress, next execution count, and overdue count before opening the full list.
3. Low / Operability: the collapsed inventory pattern is good for 6+ and 20+ Flows, but it should read as a secondary list, not the main job of the tab.

Accepted P0 changes:

- Add a `Flow 상태판` block at the top of the Flow tab.
- Show four scan-first metrics: `진행 중`, `평균 진행`, `다음 실행`, `밀림`.
- Keep priority cards directly below the status board.
- Rename the full inventory area from `전체 Flow 운영` to `전체 Flow 목록`.
- Keep search/filter/inventory controls, but treat them as secondary navigation.

P0 completion criteria:

- Flow tab first screen answers “what is going on?” before “which Flow can I manage?”.
- Priority cards still open the relevant Calendar detail.
- Full inventory remains collapsed when many Flows exist.
- E2E covers the presence of `Flow 상태판` and absence of `전체 Flow 운영`.

## Priority Queue

### P0

- [x] Finalize the routine execution model and write the accepted wording into this document.
- [x] Define the period-goal checklist model using certification study as the reference case.
- [x] Build a feature/UX gap map with `done`, `partial`, `missing`, and `deferred` columns.
- [x] Audit the Flow tab as a status board: next action, progress, remaining period, and state should beat catalog/management controls.

### P1

- [ ] Review UX sufficiency by Flow type: schedule, checklist, routine, period-goal checklist, memo/record, decision/hold, bucket/long-term goal.
- [ ] Decide whether bucket/long-term goals need a first-class type or can be checklist plus milestones.
- [ ] Define Flow creation MVP: source input, structure choice, date/period/cadence, item editing, preview, and save/publish boundary.
- [ ] Define creator/channel MVP: public source-backed Flows, private drafts, ownership, and version boundary.
- [ ] Clarify output/category/connection rules: calendar, checklist, sheet, memo, and My Flow internal state.

### P2 / Deferred

- [ ] Caution/risk first-class UI.
- [ ] Proof/status evidence forms.
- [ ] Habit streaks, analytics, and advanced reminder controls.
- [ ] Public marketplace mechanics.

## Execution Rule

Work this roadmap from top to bottom. Each item should land with:

- a task/spec update,
- a narrow UX or model decision,
- targeted tests if UI or behavior changes,
- and preview deployment when user-facing UI changes.
