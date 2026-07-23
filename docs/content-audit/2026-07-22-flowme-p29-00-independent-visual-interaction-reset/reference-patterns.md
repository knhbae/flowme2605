# P29 reference pattern review

외형이나 기능 목록을 복제하지 않고, Flow 발견 -> 개인화 -> 실행 -> 일정 -> 완료 -> 재사용 연결 방식만 비교했다.

| 제품 | 공식 근거 | Pattern | 판정 | FlowMe 적용 |
| --- | --- | --- | --- | --- |
| Google Calendar | <https://support.google.com/calendar/answer/37095?hl=en> | calendar list에서 표시 범위와 color를 관리 | Adapt | Calendar scope rail/picker. Calendar 자체를 중심 제품으로 만들지는 않음 |
| Apple Reminders | <https://support.apple.com/en-mide/guide/iphone/iph82596cb20/ios> | section/subtask, multi-select 후 contextual action | Apply/Adapt | My Flow batch mode와 selected action bar. 깊은 list hierarchy는 금지 |
| Todoist | <https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs> | Today와 project/library 역할 구분 | Adapt | My Flow `지금`과 `내 Flow` 역할. undated를 Today로 억지 이동하지 않음 |
| Todoist Filters | <https://www.todoist.com/help/articles/introduction-to-filters-V98wIH> | 조건 기반 범위 좁히기 | Adapt | search/filter 보조. query language를 primary IA로 만들지 않음 |
| Notion Calendar | <https://www.notion.com/help/manage-your-calendars-and-events> | sidebar scope, context pane, series edit scope | Adapt | wide Calendar rail/day inspector와 occurrence scope. 복합 event manager는 금지 |
| Fitbod | <https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod> | before/during/after edit를 구분하고 advanced edit를 한 곳에 모음 | Apply | save-before, run, receipt frame 분리와 routine adjust sheet |
| Strava | <https://support.strava.com/en-us/articles/15402077-training-log> | overview와 개별 occurrence detail, filter 분리 | Adapt | routine series overview와 occurrence detail. metrics/social은 제외 |
| TripIt | <https://help.tripit.com/en/support/solutions/articles/103000063302-create_ticket> | trip 전체와 개별 plan 편집 분리 | Apply | Flow 전체 조정과 item 수정 분리. 여행 전용 모델은 제외 |

## 공통 적용 원칙

- 범위 선택은 콘텐츠 canvas와 분리한다.
- 전체 계획과 개별 item 편집은 같은 giant editor에 넣지 않는다.
- 날짜 없는 일은 오류가 아니라 별도 execution/scheduling 상태다.
- 반복 series와 occurrence에 다른 action scope를 준다.
- 완료/reopen은 같은 위치·같은 identity에서 수행한다.
- export는 결과 형태와 범위를 action 전에 보여준다.

## 적용 금지

- planner 기능의 양을 상용 제품과 맞추기
- 5번째 tab 추가
- Calendar/Notion/Todo replacement
- metrics, feed, social, payment, marketplace
- 외부 제품의 외형·brand 복제
