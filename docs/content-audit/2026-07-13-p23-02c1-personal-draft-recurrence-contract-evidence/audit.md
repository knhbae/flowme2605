# P23-02C1 Audit

## 원인

기존 앱에는 세 가지 반복 흔적이 있었지만 책임이 달랐다.

1. source-backed routine 화면은 `expandRoutineOccurrences`로 제한된 기간을 미리 보여준다.
2. generic item draft의 `repeatPreset`은 단순 daily/weekly/monthly export를 지원한다.
3. personal structural schedule의 `repeat`는 단순 frequency/interval만 담았으며 personal draft UI나 Calendar/ICS occurrence consumer가 없었다.

이 상태에서 바로 반복 UI를 추가하면 한 번의 완료가 Item 전체 완료인지 특정 회차 완료인지, 규칙 변경 후 과거 기록이 어디에 붙는지, Calendar와 ICS가 같은 회차를 가리키는지 고정할 수 없었다.

## 소유권

### Personal structural schedule

- series ID와 상태
- rule revision과 effective-from 날짜
- frequency, interval, weekdays, monthly day
- until 또는 count 종료
- all-day/timed schedule template
- 특정 회차 reschedule 또는 structural exclusion

### Occurrence projection

- projection range 안의 local date/time
- revision 기반 occurrence ID
- Calendar/ICS eligibility
- all-day/timed, duration, timezone projection

### Execution run

- pending
- done
- reopened
- skipped
- held
- 상태 전이 시각과 history

완료 상태는 recurrence rule이나 structural overlay의 membership을 바꾸지 않는다. tombstone은 미래 projection을 숨기지만 execution record를 삭제하지 않는다.

## Identity

- Reorder, title, memo, done/reopened edits do not change series or occurrence identity.
- One-occurrence reschedule keeps the original occurrence ID.
- Future rule changes create a new revision ID.
- Past occurrence and execution IDs stay on the prior revision.
- Stable IDs use the saved personal Flow namespace and stable Item ID; mutable date, time, title, and order are not series identity inputs.

## Rule Policy

- Weekly legacy migration uses the start weekday when no weekday set exists.
- Monthly legacy migration uses the start day.
- A missing day such as February 31 is skipped, not clamped.
- Until is inclusive.
- Count counts generated valid occurrences.
- When both until and count are malformedly supplied, until wins and a warning is emitted.
- Open-ended rules require an explicit inclusive range and are capped at 1,000 output rows per call.

## DST And Timezone

C1 generates local schedule values and deliberately does not convert them through UTC. A daily 09:00 IANA occurrence remains 09:00 across a DST boundary. This proves the pure wall-clock contract only. It does not prove final ICS client behavior, which requires RRULE/TZID download tests in P23-02C2.

## Edit Scope

- **This occurrence:** an occurrence override changes or excludes that occurrence while preserving its ID.
- **This and future:** append a revision effective from the selected occurrence.
- **All:** in-place revision replacement is allowed only when no execution history exists. Otherwise append a revision and preserve history.

Occurrence structural exclusion differs from occurrence `skipped`: exclusion changes destination eligibility, while skip remains an execution outcome on an eligible occurrence.

## Migration And Malformed Defense

- Existing structural overlay schema version stays 1.
- Recurrence series has its own schema version 1 under the optional schedule `repeat` field.
- Legacy repeat objects remain readable and can be migrated with stable context.
- Legacy `repeatPreset` remains in its existing storage and can be adapted without rewriting source-backed records.
- Invalid frequency removes recurrence only; the fixed date and Item remain.
- Invalid interval defaults to 1 with a warning.
- Invalid weekday set falls back to the start weekday.
- Duplicate revision IDs are ignored.
- Duplicate occurrence IDs are ignored.
- Invalid occurrence override is ignored.
- Source schedule and source Item objects are never mutated.

## User Reachability

`recurrenceUiChanged` and `appUiChanged` are false. All C1 recurrence cases are unit-fixture reachable only. Existing source-backed routine UI remains real user functionality, but it is not connected to this personal draft adapter.

Representative route sanity used a production build at 390px and 1024px. `/my` and `/calendar` had no new recurrence controls and no horizontal overflow. The only browser console entry was the pre-existing missing `/favicon.ico` request; no application exception was observed.

## P23-02C2 Risk And Recommended Split

1. **C2A rule UI:** user-created personal draft Item only; none/daily/weekly/monthly, interval, weekday, end condition.
2. **C2B occurrence execution:** visible-range Calendar rows and occurrence-level done/reopened/skipped/held without treating the series as complete.
3. **C2C ICS:** stable series UID, RRULE, EXDATE, RECURRENCE-ID, and finite fallback with downloaded-file tests.

The largest unresolved risk is revision semantics at the UI boundary. Users must understand whether a change applies to this occurrence, future occurrences, or the entire series. This should not be hidden behind an implicit default once execution history exists.
