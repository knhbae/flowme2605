# My Flow Reference Benchmark

조사일: 2026-07-24

이 문서는 특정 제품을 복제하기 위한 목록이 아니다. 각 서비스가 `지금 할 일`, `전체 계획`, `날짜 배치`, `기록`, `상세 편집`을 어떻게 분리하는지 관찰하고 FlowMe에 적용할 수 있는 원칙과 적용하면 안 되는 부분을 함께 기록한다.

## 비교 원칙

1. 기능 수가 아니라 사용자 객체와 화면 역할을 비교한다.
2. FlowMe는 Todoist, Notion, Calendar를 대체하는 full planner가 아니다.
3. source 콘텐츠를 개인 실행물로 바꾸는 FlowMe의 고유 단계가 사라지는 제안은 채택하지 않는다.
4. reference에서 발견한 패턴은 current production finding과 연결될 때만 backlog가 된다.
5. 서비스의 사용자 수·리뷰·평점은 FlowMe social proof로 전용하지 않는다.

## 패턴 매트릭스

| 서비스 | 공식 근거 | 관찰할 패턴 | FlowMe 번역 | 복제하지 않을 것 |
| --- | --- | --- | --- | --- |
| Todoist | [Today](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs), [view layouts](https://www.todoist.com/help/articles/customize-views-in-todoist-AoHhBxFdZ) | Today는 여러 project의 오늘 task만 모으고 날짜 없는 task는 project/filter에서 찾는다. list/calendar view는 같은 task의 다른 표현이다. | My Flow `지금`은 실행 가능한 항목만, Flow workspace는 전체 구조를 담당해야 한다. Calendar와 My Flow가 서로 다른 canonical Item을 만들면 안 된다. | priority, labels, team assignment, board 등 Todoist 전체 기능 |
| Things | [Today·Upcoming·Anytime·Someday](https://culturedcode.com/things/support/articles/4001304/), [Scheduling](https://culturedcode.com/things/support/articles/2803579/) | 시간 관점과 project/area 관점을 분리한다. 미래 task는 필요할 때까지 물러나고, 날짜 제거는 Anytime으로 돌아간다. 완료·취소는 Logbook에 남는다. | `지금`과 `Flow 목록`의 역할을 명확히 분리하고, 날짜 없는 Item을 실패 상태가 아니라 실행 가능한 별도 상태로 다룬다. 완료 기록은 현재 실행 목록과 분리하되 다시 열 수 있어야 한다. | Apple 전용 gesture, Someday 철학 전체, 숨겨진 task를 무조건 따라 하기 |
| Apple Reminders | [Smart Lists](https://support.apple.com/en-gb/guide/iphone/iphe882772ed/ios) | Today, Scheduled, All, Completed가 같은 reminder를 목적별로 모은다. | My Flow top-level view가 객체 종류가 아니라 사용자 질문에 답해야 한다: 지금 무엇을 하나, 어떤 Flow가 있나, 무엇을 끝냈나. | 위치·사람·메시지 기반 reminder와 iCloud 협업 |
| Google Calendar | [Create/edit event on Android](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en), [mobile browser](https://support.google.com/calendar/answer/65923?hl=en) | Calendar는 날짜·시간 placement와 event detail에 집중한다. event를 열고 edit하며, calendar별 표시를 켜고 끈다. | Calendar Item detail은 sheet/dialog로 열고, Flow 구조 편집과 lifecycle 관리는 My Flow로 연결한다. 날짜 이동은 Calendar에서 명확한 범위와 undo를 제공한다. | meeting guest, conferencing, shared calendar 권한 |
| Notion | [Views, filters, sorts & groups](https://www.notion.com/help/views-filters-and-sorts), [database basics](https://www.notion.com/help/intro-to-databases) | 같은 데이터가 list/calendar/timeline으로 보이고 row detail은 side peek, center peek, full page 중 하나로 열린다. | Flow는 하나의 객체로 유지하고 mobile은 focused workspace, wide는 rail/canvas/inspector를 쓴다. detail 깊이는 사용 목적에 따라 단계적으로 연다. | 사용자에게 database property·view 설정 전체를 노출하는 범용 builder |
| TickTick | [Features](https://ticktick.com/features?language=en_US) | task list, calendar, detail을 함께 쓰되 각 column의 역할이 분명하다. agenda와 multiple view를 제공한다. | wide My Flow의 rail/canvas/inspector 역할을 검증하고, mobile에서는 세 column을 길게 이어 붙이지 않고 drill-in한다. | habit, Pomodoro, matrix, statistics를 한 앱에 추가하는 all-in-one 전략 |
| Wanderlog | [Help Center](https://help.wanderlog.com/hc/en-us), [FAQ](https://wanderlog.com/blog/faq/) | trip은 day-by-day itinerary와 map으로 보며, Item을 day로 이동하거나 batch move/delete한다. 전체 trip identity는 유지된다. | 여행·이사·결혼처럼 날짜/단계가 핵심인 Flow는 generic card stack보다 날짜/phase group을 우선한다. 전체 Flow를 먼저 이해하고 Item을 이동할 수 있어야 한다. | booking, map routing, collaboration, expense tracker |
| Hevy | [Routine vs Workout](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them), [Workout logging](https://help.hevyapp.com/hc/en-us/articles/35361530647959-How-to-Log-a-Workout-in-the-Hevy-App-Step-by-Step-Guide) | routine은 재사용 가능한 계획이고 workout은 현재 실행과 기록이다. routine에서 시작하면 별도 workout run이 열린다. | 반복 Flow 정의, 이번 occurrence, 현재 execution run, history를 같은 카드에 섞지 않는다. `시작` 후에는 이번 실행에 집중하고 전체 series 설정은 secondary로 둔다. | 세트·중량·근육 통계와 운동 전용 analytics |
| Strava | [Training Log](https://support.strava.com/en-us/articles/15402077-training-log) | 완료 activity는 주간 log와 filter로 돌아보고 current workout plan과 구분한다. | Flow `기록`은 계획 설명을 반복하지 않고 완료한 run·회고·수정 흔적을 시간순으로 보여줘야 한다. | social feed, segment, sport analytics |

## My Flow에 적용할 가설

### H1. 사용자 질문 중심의 두 축

다른 서비스는 대체로 아래 두 축을 분리한다.

```text
When: 지금 / 예정 / 날짜 없음 / 완료
Context: Project / List / Trip / Routine / Flow
```

FlowMe My Flow가 두 축을 동시에 여러 tab과 card로 반복하면 사용자는 같은 Item이 왜 여러 번 보이는지 이해하기 어렵다. reviewer는 `지금`을 global execution queue로 유지하고 `Flow 목록`을 context library로 두는 현재 P31 모델이 실제로 분명한지 검증한다.

### H2. 하나의 Flow를 열면 하나의 작업 공간

Notion의 side peek, TickTick의 detail pane, Wanderlog의 trip workspace, Hevy의 active workout처럼 선택한 객체의 context가 지속되어야 한다. Flow를 연 뒤에도 global Today, 다른 Flow, export, history가 같은 시각 무게로 남으면 전면 재구성 후보가 된다.

### H3. 계획과 실행 기록 분리

Hevy의 routine/workout, Things의 project/Logbook 구분처럼 다음을 분리해야 한다.

- reusable Flow definition
- personal structure/schedule
- current execution run
- completed/reopened history
- source correction or review

분리란 별도 페이지를 무조건 늘리는 것이 아니라, 한 시점에 한 역할만 primary가 되게 하는 것이다.

### H4. 콘텐츠 형태를 숨기지 않는 공통 shell

공통 shell은 모든 Flow를 동일한 generic card list로 만드는 것이 아니다.

- 이사/결혼/여행: 날짜 또는 phase group
- 차량 체크: compact checklist와 날짜 없는 상태
- 운동/청소: routine summary와 current occurrence
- 기록형: log rows와 memo
- 개인 draft: editable ordered list

reviewer는 공통 identity/header/action grammar는 유지하되 body renderer가 콘텐츠 형태를 충분히 드러내는지 평가한다.

## Reference 기반 금지 제안

- My Flow에 새로운 습관, 채팅, 통계, collaboration, booking 기능 추가
- 다섯 artifact tab을 항상 노출
- 모든 Item property를 한 번에 편집하는 Notion식 범용 database editor
- 실제 telemetry 없이 인기·사용자 수·리뷰 수 표시
- Calendar와 My Flow가 각각 별도 완료 상태나 Item identity를 가지게 하는 구현
- 아름다운 dashboard를 만들기 위해 다음 행동을 첫 viewport 아래로 미루기
