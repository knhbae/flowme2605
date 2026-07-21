# P28 Reference Pattern Notes

분류: `reference_pattern`

확인일: 2026-07-21

이 문서는 외부 제품을 복사하기 위한 기능 목록이 아니다. 최신 사용자 피드백을 평가할 때 사용할 interaction pattern만 공식 help 문서에서 추린다.

## 1. Calendar scope는 무한 chip strip보다 library/sidebar/picker가 자연스럽다

### Google Calendar

[Google Calendar 공식 도움말](https://support.google.com/calendar/answer/37095)은 calendar별 표시/숨김과 색상 관리를 `My calendars` 목록에서 다룬다. FlowMe에 그대로 복제하지는 않지만 다음 패턴은 유효하다.

- 날짜 grid와 scope management를 분리한다.
- 색은 구분 보조 수단이고 이름을 함께 제공한다.
- 많은 calendar를 grid 위 horizontal chip으로 모두 펼칠 필요가 없다.

### Notion Calendar

[Notion Calendar 공식 도움말](https://www.notion.com/help/manage-your-calendars-and-events)은 calendar name을 sidebar에서 열어 upcoming events와 설정을 관리하고, recurring event 수정 범위를 individual/all future로 구분한다.

P28 적용 후보:

- Calendar Flow 선택은 compact trigger + searchable picker.
- selected-day event와 series settings를 분리.
- 여러 event 이동은 별도 batch mode에서 수행.

## 2. Today와 저장한 목록은 같은 object의 다른 view다

### Apple Reminders

[Apple Reminders 공식 도움말](https://support.apple.com/en-us/119953)은 list를 사용자가 만든 container로, Today 같은 Smart List를 여러 list를 가로지르는 자동 view로 구분한다.

### Todoist

[Todoist 공식 filter 문서](https://www.todoist.com/help/articles/introduction-to-filters-V98wIH)는 Today/Upcoming을 built-in view로 두고, filter를 이름·날짜·project·label·priority 등으로 좁히는 custom view로 둔다.

P28 적용 후보:

- My Flow의 `지금`은 cross-Flow 실행 view다.
- `Flow 목록`은 saved Flow container/library다.
- search/filter는 library를 대체하는 첫 화면이 아니라 찾기 utility다.
- Today row와 Flow detail row는 같은 item identity를 공유한다.

## 3. 운동 편집은 전·중·후가 가능하되 한 command surface를 쓴다

### Fitbod

[Fitbod 공식 도움말](https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod)은 시작 전, 진행 중, 완료 후 수정 가능 범위를 설명하며 add/replace/delete/reorder를 한 workout edit 맥락 안에서 제공한다.

FlowMe가 가져올 패턴:

- 홈트만의 독립 planner를 만들지 않는다.
- 저장 전과 저장 후에 field/order vocabulary를 재사용한다.
- 실행 결과와 schedule definition을 한 화면에 항상 모두 펼치지 않는다.

FlowMe가 가져오지 않을 것:

- sets, reps, weight, muscle group 같은 전문 운동 tracking.
- 운동 앱 수준의 coaching/generation.

## 4. 운동 기록 overview와 개별 activity detail을 분리한다

### Strava

[Strava Training Log 공식 도움말](https://support.strava.com/en-us/articles/15402077-training-log)은 주간 activity overview와 sport/tag filter를 분리하고, 개별 activity interaction에서 주요 stats를 보여준다.

P28 적용 후보:

- Calendar와 My Flow의 routine overview는 occurrence summary를 담당한다.
- 강도/몸 상태 note는 해당 occurrence detail에 둔다.
- 운동 status를 별도 전역 completion system으로 만들지 않는다.

## 5. 전체 계획과 개별 항목 편집은 다른 범위다

### TripIt

[TripIt 공식 도움말](https://help.tripit.com/en/support/solutions/articles/103000063302-create_ticket)은 trip high-level detail과 individual plan edit/delete 경로를 구분한다.

P28 적용 후보:

- Flow title/anchor/series end는 Flow-level adjustment다.
- item title/date/memo/resource는 item-level adjustment다.
- Calendar에서 날짜를 옮길 때 Flow 전체, 선택 item, 이번 occurrence 범위를 먼저 보여준다.

## 6. 참고 패턴을 쓰는 기준

다음 질문에 `yes`일 때만 FlowMe에 적용한다.

1. portable execution layer를 더 명확하게 하는가?
2. 기존 source/personal/run/occurrence ownership을 보존하는가?
3. heavy planner로 확장하지 않는가?
4. mobile 390px과 wide 1024px 모두에서 control 수를 줄이는가?
5. Flow content shape가 달라도 같은 interaction grammar를 유지하는가?

공식 help 문서는 패턴의 존재만 증명한다. FlowMe 사용자의 acceptance는 P28 simulation과 이후 owner 판단으로 별도 확인한다.
