# P23-02B1 Audit

## Inventory

### Persistence

기존 structural schedule은 `time?: string`을 저장할 수 있었지만 형식 검증, duration, timezone 의미가 없었다. overlay schema version과 storage key는 유지하고 `durationMinutes?`, `timeZone?`만 additive하게 확장했다.

### Calendar

현재 Calendar screen은 structural row의 `calendarDate`만 읽는다. P23-02B1 pure projection에는 timed sort 계약이 추가됐지만, UI consumer는 아직 start time과 all-day 상태를 표시하지 않는다.

### ICS

현재 개인 항목 ICS는 time이 있으면 floating local DTSTART와 30분 DTEND를 만든다. UID에는 step ID뿐 아니라 mutable date/time이 들어가므로 일정 수정 시 같은 이벤트 identity가 유지되지 않는다. Flow 전체 source-backed ICS는 별도 all-day 경로를 쓴다.

P23-02B1에서는 actual builder를 바꾸지 않았다. stable identity seed와 IANA/floating 정책만 pure contract로 먼저 고정했다.

### List export

checklist/sheet/memo는 현재 effective title/date/memo를 읽는다. time 표시 확장은 P23-02B2 consumer 연결 범위에서 다시 판단한다.

## Decisions

### State

- schedule 없음: unscheduled
- date + no time: all-day
- date + valid `HH:mm`: timed
- invalid time: all-day fallback
- date removal: unscheduled

### Duration

- default 30 minutes
- minimum 5 minutes
- maximum 1440 minutes
- invalid value falls back to 30 minutes without dropping the Item

### Timezone

- valid stored IANA zone: `iana`
- missing legacy zone: `floating_local`
- invalid zone: floating local fallback with warning
- all-day/unscheduled: not applicable

### Identity

`savedCopyId + stable Item ID`가 mutable schedule과 order보다 우선한다. 이 seed를 actual ICS UID에 적용하는 작업은 P23-02B2로 남긴다.

## Golden Fixture Findings

필수 14개 시나리오는 schedule adapter fixture 10개와 structural integration fixture 4개로 나눠 검증했다.

1. unscheduled
2. all-day
3. timed with IANA zone
4. all-day to timed
5. timed to all-day
6. time edit stable identity
7. cross-midnight end
8. invalid 24:00
9. invalid duration
10. legacy fixed-date time
11. completion to reopened membership
12. reorder and timed state
13. malformed overlay Item preservation
14. source-backed wrapper non-application

## Remaining Risks

1. 실제 개인 항목 ICS UID는 아직 mutable date/time을 포함한다.
2. floating local 일정은 다른 timezone 기기에서 같은 wall-clock time으로 보인다.
3. DST gap/overlap과 IANA `TZID` 출력은 actual consumer 연결 전에 별도 fixture가 필요하다.
4. 시간 UI가 없으므로 timed 상태는 fixture로만 도달 가능하다.
5. duration이 24시간을 넘는 작업과 다일 일정은 별도 모델이 필요하다.

## P23-02B2 Gate

P23-02B2는 아래를 한 slice에서 닫아야 한다.

- 개인 draft user Item의 종일/시간 지정 UI
- duration input의 최소 UX
- valid device IANA zone capture와 floating fallback 설명
- Calendar agenda start time 표시 및 timed ordering
- ICS DTSTART/DTEND/TZID와 stable UID 연결
- 날짜·시간 변경 전후 같은 event identity E2E
- DST와 cross-device timezone fixture
