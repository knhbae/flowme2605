# P23-02C2C Audit

## 1. Before

- 개인 draft 상세은 `repeatPreset`의 frequency만 ICS builder에 넘겼다.
- interval, weekday, month day, count/until, series revision, occurrence override가 파일에서 유실됐다.
- Calendar occurrence identity와 ICS event identity가 서로 다른 경로로 계산됐다.
- source-backed export의 기존 RRULE은 별도 경로이므로 개인 draft 계약을 그대로 적용할 수 없었다.

## 2. Connection

`buildPersonalStructuralRecurrenceIcs`가 personal recurrence series를 정본으로 읽는다. `buildMyFlowStepIcs`는 개인 draft user-created Item에 `personalRecurrence`가 있을 때만 이 builder로 위임한다. source-backed/public Flow는 기존 builder를 계속 사용한다.

## 3. Serialization policy

| State | ICS policy |
| --- | --- |
| one active compatible revision | one master VEVENT + stable series UID + RRULE |
| interval | RRULE INTERVAL |
| weekly weekdays | RRULE BYDAY |
| monthly day | RRULE BYMONTHDAY; invalid month day remains skip policy |
| count | RRULE COUNT |
| all-day until | RRULE UNTIL date |
| structural occurrence exclusion | EXDATE |
| structural occurrence reschedule | same UID + RECURRENCE-ID exception VEVENT |
| multiple revisions or timed-until | bounded standalone VEVENT fallback |
| done/reopened/skipped/held execution state | membership unchanged |

UID is based on immutable series identity for RRULE mode. Date, time, title, memo, duration, and personal order changes do not create a new series UID. Finite fallback uses stable occurrence identity per VEVENT.

## 4. Actual user path versus fixtures

- Daily count recurrence is created, downloaded, completed, reopened, and downloaded again through the UI.
- Both actual files have one VEVENT, the same UID, and `RRULE:FREQ=DAILY;COUNT=3`.
- Weekly BYDAY, monthly BYMONTHDAY, EXDATE, RECURRENCE-ID, and multiple-revision fallback are pure fixture coverage. There is no user control yet for one-occurrence structural exclusion/rescheduling or rule revision scope.
- Automated browser QA is not observed-user validation.

## 5. Error defense

- Invalid or unrepresentable one-RRULE rules fall back without deleting the Item.
- Duplicate occurrence overrides are ignored by stable occurrence identity.
- Multiple revisions are bounded to a finite projection range and generation cap; a warning is returned when the cap is reached.
- Export errors do not mutate source, structural overlay, or execution records.

## 6. Remaining gaps

1. **P23-03:** expose coherent done/reopened/skipped/held semantics without treating skip as delete or exclude.
2. **P23-04:** define one-occurrence edit, this-and-future revision, series pause/end, past-run review, and reuse journeys.
3. An imported ICS update is not cloud sync; users must re-import or replace it in their external calendar.
4. Actual Calendar/Outlook/Apple Calendar import compatibility still requires observed external-tool testing.

## 7. Current-run validation

- full unit suite: 471/471 passed
- recurrence/list export unit target: 13/13 passed
- URL-first, public share, and workbench Playwright regression: 63/63 passed
- source-backed portable export and 4-tab Calendar targeted regression: 2/2 passed
- actual mobile/wide recurrence ICS Playwright journey: included in the 63/63 run and passed
- documentation check: passed
- TypeScript check: passed
- production build: passed, 18 static/dynamic app routes generated
- browser console error: 0
- mobile/wide horizontal overflow: 0
- source-backed recurrence controls: 0
- actual observed-user count: 0
