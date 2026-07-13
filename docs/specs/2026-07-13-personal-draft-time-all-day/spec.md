# P23-02B1 Personal Draft Time And All-day Contract

**Date:** 2026-07-13
**Status:** Contract implemented; runtime consumer connection deferred to P23-02B2
**Scope:** Personal draft schedule normalization and projection only

## Decision

개인 draft의 일정은 별도 `allDay` boolean 없이 schedule의 존재와 유효한 `time` 여부로 세 상태를 구분한다.

| 저장 상태 | 해석 | Calendar/ICS 계약 |
|---|---|---|
| schedule 없음 | 날짜 없는 할 일 | 제외 |
| fixed date + time 없음 | 종일 일정 | 날짜 단위 일정 |
| fixed date + valid `HH:mm` | 시간이 정해진 일정 | 시작 시각과 duration을 가진 일정 |

시간 제거는 날짜를 유지한 종일 일정으로 전환한다. 날짜 제거는 schedule 전체를 제거한다. 완료, 완료 취소, 건너뜀은 execution run이 소유하며 schedule membership을 바꾸지 않는다.

## Current Consumer Inventory

| Consumer | 현재 입력 | P23-02B1 판정 |
|---|---|---|
| My Flow | effective Item과 날짜 중심 personal projection | UI 변경 없음 |
| Calendar screen | `calendarDate` 중심 row | time/all-day consumer 미연결 |
| 개인 항목 ICS | `date`, `time`을 직접 받아 timed면 30분 종료 | 실제 builder 미변경 |
| Flow 전체 ICS | source-backed 날짜 projection | 기존 경로 유지 |
| checklist/sheet/memo | effective title/date/memo 중심 | 실제 builder 미변경 |

기존 개인 항목 ICS UID는 날짜와 시간을 포함해 수정 시 달라진다. P23-02B1은 stable identity 계약만 제공하고, 실제 UID 교체는 P23-02B2에서 Calendar/ICS consumer를 함께 연결할 때 수행한다.

## Additive Persistence Contract

기존 `PersonalStructuralSchedule`에 아래 optional 필드를 추가한다.

```ts
type TimedFields = {
  time?: string;             // HH:mm, local wall-clock start
  durationMinutes?: number; // 5..1440, omitted legacy value defaults to 30
  timeZone?: string;        // valid IANA zone when known
};
```

- storage key와 structural overlay schema version은 바꾸지 않는다.
- 기존 `{ mode: "fixed_date", date, time? }` 레코드를 그대로 읽는다.
- 유효한 legacy `time`에 duration이 없으면 30분으로 projection한다.
- legacy time에 zone이 없으면 `floating_local`로 projection한다.
- 새 P23-02B2 UI는 유효한 기기 IANA zone을 저장하는 것을 기본으로 하되, zone을 얻지 못하면 floating local을 허용한다.
- source-backed schedule과 source Item은 변경하지 않는다.

## Duration Policy

- 기본값: 30분
- 최소값: 5분
- 최대값: 1,440분
- invalid duration: Item과 날짜·시간은 보존하고 30분으로 fallback한다.
- 24시간을 넘는 실행 블록과 다일 일정은 이번 계약 범위가 아니다.

## Time Zone Policy

P23-02B1은 다음 두 timed 정책을 구분한다.

1. `iana`: valid IANA `timeZone`이 저장된 일정이다. P23-02B2 ICS는 `TZID`를 사용해야 한다.
2. `floating_local`: 기존 record처럼 zone이 없는 일정이다. 보는 기기의 local wall-clock 시각으로 해석한다.

종일·날짜 없음 상태에는 timezone이 적용되지 않는다. invalid zone은 제거하고 timed 상태와 duration을 보존한 채 floating local로 낮춘다. 이 정책은 기존 로컬 데이터의 시각을 임의의 특정 지역으로 바꾸지 않는다.

## Pure Schedule Projection

Runtime source: `lib/flow/personal-structural-schedule.ts`.

출력은 다음을 포함한다.

- `scheduleState`: `unscheduled | all_day | timed`
- `calendarDate`
- `startTime`
- `durationMinutes`
- 자정을 넘길 수 있는 `endDate`와 `endTime`
- `timeZone`과 `timeZonePolicy`
- `floatingTime`
- `displayLabel`
- `stableEventIdentitySeed`
- `validationWarnings`

## Stable Event Identity

identity seed는 `savedCopyId + stable Item ID`만 사용한다.

- 날짜 변경: identity 유지
- 시간 변경: identity 유지
- duration 변경: identity 유지
- 순서 변경: identity 유지
- 완료/완료 취소: identity 유지

mutable date/time/order를 UID에 넣지 않는다. 실제 ICS UID 적용은 P23-02B2에서 수행한다.

## Calendar Sort Contract

1. 날짜 오름차순
2. 같은 날짜에서는 종일 일정 우선
3. timed 일정은 시작 시각 오름차순
4. 같은 시각에서는 personal order rank
5. 마지막 tie-breaker는 stable Item ID

현재 UI에서 timed schedule을 만들 수 없으므로 기존 visible route 순서는 바뀌지 않는다.

## Error And Migration Policy

- invalid date: schedule을 날짜 없음으로 낮추되 Item은 보존한다.
- invalid time, including `24:00`: 날짜를 보존한 종일 일정으로 낮춘다.
- invalid duration: timed 일정과 Item을 보존하고 30분을 사용한다.
- invalid timezone: timed 일정과 Item을 보존하고 floating local을 사용한다.
- malformed overlay: 정상 source/user Item을 삭제하지 않는다.
- source/user ID 충돌: 기존 structural resolver가 source를 보존한다.
- completion state는 schedule normalizer에 저장하지 않는다.

## Deferred To P23-02B2

- 시간/종일 사용자 UI
- Calendar agenda의 시간 표시와 timed sort consumer 연결
- actual ICS `TZID`, duration, stable UID 연결
- legacy floating local을 IANA zone으로 바꾸는 사용자 확인 UX
- DST 경계 fixture와 cross-device 검증

## Out Of Scope

- 반복 규칙과 회차별 완료
- source-backed 구조 편집
- AI, DB, cloud sync, OAuth
- 4탭 IA 변경
