# P23-01D2/D3A Audit

## Consumer Inventory

### My Flow

개인 draft의 My Flow 목록은 P23-01B/C부터 structural resolver의 effective Items를
읽었다. 저장된 제목, 메모, 날짜 값은 `flow:my-flow:item-drafts`와
`flow:my-flow:date-overrides`에 분산돼 있었다.

이번 연결에서는 이 값을 stable Item ID 기준 `PersonalItemValueOverlay`로 정규화한 뒤
P23-01D1 adapter에 전달한다. 날짜를 지우면 item draft에 빈 날짜를 명시적으로 남겨
`scheduleOverride: null`로 해석한다. 기존 date override key는 호환 경로로 유지한다.

### Calendar screen

기존 Calendar는 개인 draft에서도 source 기반 `projectionRows`를 읽어 user-created,
tombstoned, restored, reordered Item을 반영하지 못했다. 이제 개인 draft에 한해
`rowsByDestination.calendarScreen`을 `projectionRows`로 사용한다.

각 Calendar row는 다음을 보존한다.

- stable Item ID
- source 또는 `user_created` ownership
- effective title/date
- personal order rank
- existing execution completion state lookup
- 기존 Flow marker와 selected-day group context

날짜 정렬이 먼저이고, 같은 날짜일 때만 personal order rank가 보조 정렬로 작동한다.
source-backed/published Flow는 기존 source row 경로를 계속 사용한다.

### Calendar ICS

개인 draft의 실제 사용자 entry는 My Flow/Calendar 상세의 항목별 `캘린더 파일 받기`다.
public/full-Flow `buildCalendarIcs` 경로가 아니다. 이 entry는 projection row의
`calendarIcs` eligibility와 기존 `buildMyFlowStepIcs` serializer를 함께 사용한다.

- SUMMARY: effective title
- DTSTART: effective date
- DESCRIPTION: effective title/date/personal memo와 기존 사용자용 context
- UID seed: `flowSlug::stableItemId`

serializer가 date/time을 occurrence identity에 포함하므로 날짜 또는 시간 자체를 바꾸면
UID가 바뀔 수 있다. 구조 reorder만으로는 UID가 바뀌지 않는다.

## State Policy

| 상태 | My Flow | Calendar | ICS |
|---|---:|---:|---:|
| scheduled source Item | 포함 | 포함 | 포함 |
| scheduled user Item | 포함 | 포함 | 포함 |
| unscheduled user Item | 포함 | 제외 | 제외 |
| tombstoned Item | 제외 | 제외 | 제외 |
| restored scheduled Item | 포함 | 재포함 | 재포함 |
| excluded Item | 제외 | 제외 | 제외 |
| title/date/memo override | 반영 | 반영 | 반영 |
| explicit date removal | 포함 | 제외 | 제외 |
| completed/reopened | 포함 | 포함 | 포함 |

skipped의 destination 처리 정책은 기존 execution export 정책을 유지하며 structural
membership에는 넣지 않았다.

## Fixture And Reachability

source draft Item의 제목, 날짜, 메모 수정과 날짜 제거는 기존 상세 편집 경로로 재현했다.
user-created Item은 현재 추가 직후 날짜가 없고, 그 항목에 날짜를 처음 지정할 entry가
없다. 따라서 scheduled user Item은 local structural overlay fixture로 만들었다.

- fixture verification: supported
- user reachability without fixture: false
- follow-up owner: P23-02 date/time/repeat edit UI

자동 fixture 결과를 실제 사용자 발견성으로 표현하지 않는다.

## Error And Regression Guards

- malformed/unknown order ID는 D1 adapter가 경고만 남기고 source row를 보존한다.
- invalid fixed date는 Calendar/ICS eligibility만 제거한다.
- anchor 없는 anchor-offset Item은 억지 날짜를 만들지 않는다.
- source/user ID 충돌은 source ownership을 보존한다.
- projection wrapper가 undefined이면 기존 consumer fallback을 유지한다.
- source-backed Calendar와 per-item ICS targeted E2E는 기존 동작을 유지했다.
- known global `/favicon.ico` 404는 별도 baseline static-asset 이슈이며 앱 runtime error와 분리했다.

## Visual Inspection

390px에서는 same-date source/user Item 두 개가 한 Flow group 아래 개인 순서대로 보였고,
완료 체크박스와 `열기`가 겹치지 않았다. 1024px에서는 month grid와 selected-day agenda가
같은 두 Item을 같은 순서로 표시했다. 두 viewport 모두 horizontal overflow는 0이다.

## Next Slice

P23-01D3B는 `rowsByDestination.checklist`, `sheet`, `memo`를 각 실제 builder에 차례로
연결해야 한다. P23-02는 user-created Item의 날짜 없음/날짜 지정/날짜 제거와 시간·반복
편집을 사용자 경로로 열어야 한다.
