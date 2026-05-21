# Channel Content And UX Audit - 2026-05-21

## Scope

This audit applies the FLOW quality system to the current creator/official channel content, with emphasis on source-backed flows and exact creator videos.

Primary reviewed surfaces:

- ThankyouBUBU exact video flows
- FITVELY exact video flows
- Samsung Electronics Service source-backed flows
- Q-Net / government source-backed flows
- Current public Flow execution page pattern

## External Source Checks

### ThankyouBUBU

Verified via YouTube oEmbed for exact video IDs.

Findings:

- The ThankyouBUBU exact videos are mostly follow-along workout videos.
- Single-action conversion remains appropriate: schedule the workout, open the video, execute at tolerable intensity, and mark completion.
- Some source titles were too lossy. Example: the original “전신 다이어트 최고의 운동” title includes key modifiers: no jumping, no lying down, no repeats, no talk. The Flow now preserves those execution-relevant constraints.

Decision:

- Keep 1 action for follow-along videos.
- Preserve title modifiers that change user expectations, especially low-impact/no-equipment/no-repeat constraints.

### FITVELY

Verified via YouTube oEmbed for exact video IDs.

Findings:

- FITVELY exact videos are mixed:
  - Diet principle / meal decision videos
  - Nutrition timing videos
  - Workout order / workout programming videos
- Treating all of them as “오늘 적용할 한 가지 식단/운동 행동” was too generic.
- Workout programming videos need “운동표에 기준 반영” language rather than meal-level application language.

Content changes made:

- `real-fitvely-video-body-fat-6kg-method`
  - From: `오늘 적용할 한 가지 행동 실행`
  - To: `다음 식사 한 끼에 감량 기준 적용`
- `real-fitvely-video-workout-split-science`
  - From generic diet action
  - To: `이번 주 분할·세트·휴식 기준 정하기`
- `real-fitvely-video-workout-order`
  - To: `유산소·근력 순서를 오늘 루틴에 반영`
- Other FITVELY exact videos now use video-specific action titles and application targets.

Decision:

- Keep the exact-video UI light, but do not collapse all FITVELY content into the same action.
- Use `diet` language for meal/body-composition principle videos.
- Use `workout-plan` language for programming/order/split videos.

### Samsung Electronics Service

Compared with Samsung source material and Samsung Newsroom summary of air-conditioner pre-check guidance.

Source-backed expectations:

- Before service request: power connection, outdoor unit area, indoor filter, cooling test run, remote control operation.
- For washing machine drain filter: power off, residual water removal, filter cleaning, reassembly, leakage/error check.

Current Flow fit:

- Washer drain filter Flow aligns well with the source shape.
- Air-conditioner seasonal care Flow is close, but should be revised in a future pass to emphasize pre-check before reservation:
  - power/remote control
  - filter cleaning
  - outdoor unit area
  - cooling test run
  - service reservation only if abnormal

### Q-Net / Government Sources

Compared with Q-Net 원서접수 유의사항.

Source-backed expectations:

- Exam start time / entry restrictions
- Test center and admission time
- ID, admission ticket, writing tool, calculator if needed
- Restricted calculator models for some exams
- Misconduct warnings

Current Flow fit:

- Q-Net flows are directionally correct but should avoid generic “시험 준비” phrasing.
- Future pass should make destination explicit:
  - calendar: application deadline and exam day
  - sheet: materials checklist and application status
  - memo: exam-day restrictions and allowed items

## UX/UI Findings

### 1. Source panel competes with first action

Severity: Medium

The source/risk panel is important, but it appears before the execution mode and is open by default. For exact creator videos, this pushes the real job down the page.

Recommended change:

- Keep risk warning visible.
- Collapse detailed source metadata by default on exact-video flows.
- Show the source link near the first action and in the source panel.

### 2. Exact-video pages still show generic builder sequence

Severity: Medium

The page has a strong `오늘 실행` block, then still shows `1. 기준 날짜 선택`, `2. 바로 실행`, `3. 저장/공유`. This is useful, but it reads like a generic template rather than a creator-video-specific path.

Recommended change:

- For exact-video flows, rename the three cards:
  - `1. 요일 정하기`
  - `2. 오늘 실행 체크`
  - `3. 내 Flow로 수정`
- Keep export buttons only in `내 도구로 옮기기`.

### 3. Repetition remains below the fold

Severity: Medium

Exact-video pages still repeat:

- next action card
- whole route overview
- routine setup
- actual item card

For one-action content, this can feel heavier than the Flow itself.

Recommended change:

- For exact-video flows, use a compact one-action renderer after the overview.
- Hide routine setup unless the user changes weekdays or opens “반복 설정”.

### 4. Channel collection pages need maturity language

Severity: High for creator-scale validation

The channel pages mix:

- exact source-backed flows
- broad source-backed flows
- preview-generated flows

Users and creators need to know which are real conversions and which are candidates.

Recommended change:

- Add maturity labels on channel pages:
  - `정확한 출처`
  - `채널 기반 전환`
  - `Flow 후보`
- Add a filter for these maturity levels.

### 5. Destination should be first-class metadata

Severity: High

The UI currently infers destination from structure and buttons. This is why calendar/sheet/memo behavior can feel bolted on.

Recommended change:

- Add metadata to Flow or derived helper:
  - `primary_destination: calendar | sheet | memo | internal_check | hybrid`
- Use it to decide:
  - export buttons
  - labels
  - workbook shape
  - first action copy
  - channel cards

### 6. Preview-generated 400+ flows should not look equally real

Severity: High

The 400+ preview flows are useful for scale testing, but they are not all verified against original source content.

Recommended change:

- Keep them visible for creator-scale concept validation.
- Do not present them as equivalent to exact source-backed Flow.
- On channel pages, separate “실제 출처 Flow” from “Flow 후보”.

## Recommended Next Implementation Order

1. Add `primary_destination` helper or metadata and use it in exact-video UI labels.
2. Collapse detailed source panel for exact-video pages while preserving visible risk warning and source link.
3. Add channel-page maturity filters: exact / broad / preview.
4. Add compact one-action renderer for exact-video flows.
5. Run a second content pass on Samsung, Q-Net, Gov24, Childcare, and automobile flows using official pages.

## Sources Used

- YouTube oEmbed metadata for ThankyouBUBU and FITVELY exact video IDs.
- Samsung Newsroom Korea, Samsung Electronics Service air-conditioner pre-check summary: https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%97%AC%EB%A6%84-%EB%8C%80%EB%B9%84-%EC%97%90%EC%96%B4%EC%BB%A8-%EC%82%AC%EC%A0%84%EC%A0%90%EA%B2%80-%EC%84%9C%EB%B9%84%EC%8A%A4-3
- Samsung Electronics Service air-conditioner maintenance page: https://www.samsungsvc.co.kr/info/maintenance
- Q-Net 원서접수 유의사항: https://www.q-net.or.kr/rcv002.do?gId=&gSite=Q&id=rcv002_baseInfo
