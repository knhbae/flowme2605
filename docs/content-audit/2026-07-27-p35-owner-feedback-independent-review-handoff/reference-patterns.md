# FlowMe P35 레퍼런스 비교 기준

이 문서는 다른 제품의 화면을 복제하기 위한 목록이 아니다. FlowMe의 각 surface가
어떤 질문을 소유해야 하는지 비교하기 위한 공식 문서 기반 체크리스트다.

## 1. Todoist

공식 자료:

- [Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)
- [Task view](https://www.todoist.com/help/articles/use-the-task-view-to-manage-tasks-in-todoist-eDeRDO0C)
- [Tasks and completion](https://www.todoist.com/help/articles/introduction-to-tasks-080OAXric)

비교할 패턴:

- Today는 여러 project의 날짜 있는 task를 모으는 시간 lens다.
- 상세 수정과 activity는 task view에 모인다.
- 완료 후 행이 사라지는 문맥에서는 즉시 undo가 중요하고, 다시 찾을 수 있는 완료
  기록 경로도 별도로 존재한다.

FlowMe 질문:

- `다음 행동`이 날짜 lens인지 Flow 문맥인지 구분돼 있는가?
- 항목 제목·설명·날짜 편집이 contextual detail에 모여 있는가?
- 완료 후 현재 목록에서 사라지는 경우에만 undo를 강조할 수 있는가?

## 2. Things

공식 자료:

- [Today, Anytime, Logbook](https://culturedcode.com/things/support/articles/4001304/)
- [Plan projects and next steps](https://culturedcode.com/things/support/articles/8491676/)
- [Schedule tasks](https://culturedcode.com/things/support/articles/2803579/)

비교할 패턴:

- Today, Upcoming, Anytime, Logbook은 서로 다른 시간·상태 질문을 가진다.
- 큰 목표는 project로, 실행 가능한 단계는 task로 나눈다.
- 한 번에 다음 1~3단계에 집중하면서도 전체 project 구조는 잃지 않는다.

FlowMe 질문:

- 저장 직후 전체 Flow와 지금 실행할 묶음을 어떻게 함께 보여 줄 것인가?
- `기록`이 완료 history인지 개인 회고인지 명확한가?
- 날짜 없는 항목은 Calendar가 아니라 개인 Flow에서 자연스럽게 실행되는가?

## 3. Google Calendar Tasks

공식 자료:

- [Create and manage tasks in Google Calendar](https://support.google.com/calendar/answer/9901136?co=GENIE.Platform%3DDesktop&hl=en-uk)

비교할 패턴:

- 날짜가 있는 task는 Calendar에 나타난다.
- 날짜와 시간 수정은 task detail에서 수행한다.
- 날짜가 없거나 아직 완료하지 않은 task를 다시 찾는 별도 목록 문맥이 있다.

FlowMe 질문:

- Calendar를 날짜 lens로 제한하면서 날짜 없는 항목의 위치를 잃지 않는가?
- Calendar event와 개인 Flow Item이 같은 identity와 편집 결과를 읽는가?

## 4. Notion

공식 자료:

- [Database views, filters and sorts](https://www.notion.com/help/views-filters-and-sorts)
- [Database properties](https://www.notion.com/help/database-properties)

비교할 패턴:

- 같은 데이터에 list, table, calendar 등 여러 view를 적용할 수 있다.
- 항목은 title, text, date, status, URL 같은 명시적 property를 가진다.
- list row를 열어 side peek, center peek, full page로 상세를 편집한다.

FlowMe 질문:

- Calendar, Checklist, Sheet, Memo를 별도 Flow로 복제하지 않고 같은 effective Item의
  projection으로 보여 주는가?
- 저장 전 contextual Item edit가 full editor보다 적절한가?

## 5. Wanderlog

공식 자료:

- [Wanderlog Help Center](https://help.wanderlog.com/hc/en-us)
- [Wanderlog product help](https://wanderlog.com/pages/help-center)

비교할 패턴:

- 날짜별 itinerary, reservation/document, list, map을 역할별로 구분한다.
- trip date 변경과 여러 장소 이동처럼 전체 일정에 영향을 주는 행동을 별도 command로
  다룬다.

FlowMe 질문:

- 같은 날짜의 다음 항목을 한 묶음으로 보는 것이 timeline Flow에서 더 자연스러운가?
- 전체 기준일 이동과 개별 날짜 고정을 별도 정책으로 유지하는가?

## 6. Strava와 Nike Training

공식 자료:

- [Strava Training Log](https://support.strava.com/en-us/articles/15402077-training-log)
- [Nike Training Club](https://www.nike.com/gb/ntc-app?redirect=true&vst=nike+training+club)

비교할 패턴:

- routine의 plan, 현재 session, 완료 history는 서로 다른 의미다.
- workout에는 시간, 장비, 프로그램 정보가 필요하지만 실행 상태를 별도 특수 문법으로
  과도하게 늘리지 않는다.

FlowMe 질문:

- routine의 `다음 행동`은 이번 occurrence를 뜻하는가?
- `기록`은 session history로 명확히 좁혀지는가?
- 원본 영상·안내는 실행 Item이 아니라 resource로 구분되는가?

## 7. 적용 원칙

레퍼런스를 비교할 때 다음을 지킨다.

1. FlowMe를 다른 제품의 축소판으로 만들지 않는다.
2. 화면 모양보다 surface ownership과 상태 전이를 비교한다.
3. one primary action, contextual detail, reversible state change 같은 검증 가능한
   패턴만 가져온다.
4. FlowMe의 source, personal overlay, execution run, occurrence, export identity를
   유지한다.
5. reference pattern은 실제 FlowMe 사용자 관찰을 대신하지 않는다.
