# Study Score Log Workbench Design

## Context

The content audit for `real-sinagong-computer-d30-study` says a certification-study Flow is not complete with a D-30 calendar alone. A learner naturally creates two artifacts after reading the source content:

- A chapter/week progress table that turns the source material into target dates.
- A mock or past-exam score table that records score, wrong answers, and retry dates.

This design adds those artifacts to the existing timeline Workbench without changing the already-tested `study-exam-d30-plan` routine behavior.

## Target Flow

- `real-sinagong-computer-d30-study`
- Title: `시나공 컴활 D-30 학습 Flow`
- Existing structure: timeline, `시험일` anchor, list + month calendar.

## User Scenario

The user is preparing for the Computer Specialist exam and enters:

- `시험일=2026-07-05`
- `과목=컴활 1급 필기`
- `평일공부=90분`
- `주말공부=3시간`
- `기출회차=2026년 2차, 2025년 1차`

They then fill the Workbench like this:

- `1주차 개념 1회독 / 범위=1~3장`
- `1주차 개념 1회독 / 목표일=2026-06-12`
- `1주차 개념 1회독 / 상태=완료`
- `기출 1회차 / 점수=78점`
- `기출 1회차 / 오답=계산 문제 4개`
- `기출 1회차 / 재풀이일=2026-06-15`

## UX Shape

The timeline Workbench keeps its first-screen artifact:

1. `전체 할 일`
2. `월간 캘린더`
3. `챕터 진도표`
4. `기출 점수·오답 기록`

The study tables render as editable spreadsheet-like cards below the list/calendar. Each cell is a native input so the user can quickly tab through the table and the state persists in the browser.

## Study Tables

### 챕터 진도표

Rows:

- `1주차 개념 1회독`
- `2주차 기출 풀이`
- `3주차 오답 보완`
- `마지막 주 실전 점검`

Columns:

- `범위`
- `목표일`
- `상태`
- `메모`

### 기출 점수·오답 기록

Rows:

- `기출 1회차`
- `기출 2회차`
- `기출 3회차`

Columns:

- `풀이일`
- `점수`
- `오답`
- `재풀이일`
- `약점 메모`

## Data Flow

Reuse the existing `FlowWorkbenchState.logRows` map. Keys are stable row ids, and each row stores column-id values:

```ts
{
  logRows: {
    "study-chapter-week-1": {
      scope: "1~3장",
      targetDate: "2026-06-12",
      status: "완료",
      note: "요약노트 작성"
    },
    "study-mock-1": {
      solvedDate: "2026-06-13",
      score: "78점",
      wrongAnswers: "계산 문제 4개",
      retryDate: "2026-06-15",
      weaknessNote: "스프레드시트 함수"
    }
  }
}
```

## Export Behavior

Text export and XLSX `실행판 기록` must use user-facing labels, not raw row or field ids:

- `1주차 개념 1회독 범위: 1~3장`
- `기출 1회차 점수: 78점`
- `기출 1회차 오답: 계산 문제 4개`

Existing generic date-based logs, routine occurrence logs, and memo cards keep their current behavior.

## Related Cleanup

Timeline Workbenches should only render a comparison table when the Flow has a configured comparison artifact. Moving timelines keep the vendor comparison table. Travel timelines keep the emergency memo card without showing an unrelated moving-vendor comparison title.

## Out Of Scope

- No automatic chapter distribution algorithm yet.
- No score analytics or pass-probability calculation.
- No source-material file upload.
- No external Google Sheets sync.
- No changes to `study-exam-d30-plan` routine session behavior.

## Acceptance Criteria

- `real-sinagong-computer-d30-study` renders `챕터 진도표`.
- The same Workbench renders `기출 점수·오답 기록`.
- Study table fields persist after reload.
- Text export includes Korean row and column labels for study progress and mock score fields.
- XLSX `실행판 기록` includes the same Korean labels and values.
- `study-exam-d30-plan` still renders routine occurrence controls.
- Travel Workbench no longer shows a moving-vendor comparison table.
