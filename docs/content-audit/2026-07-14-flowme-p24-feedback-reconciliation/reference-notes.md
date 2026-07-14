# P24 UX Reference Notes

## Purpose

이 문서는 외부 제품을 그대로 복제하기 위한 목록이 아니다. Today/All, 완료 취소, 날짜 없음, 다중 선택, Calendar projection, progressive disclosure에 대한 FlowMe 판단을 공식 문서와 비교한다.

## Todoist

- [Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)는 오늘 예정된 작업을 프로젝트 전체에서 모은 실행 view다. 날짜 없는 task는 Today/Upcoming에 나타나지 않는다.
- [Tasks and completion](https://www.todoist.com/help/articles/introduction-to-tasks-080OAXric)는 task 옆 원형 control로 완료하고, recurring task는 짧은 Undo popup을 제공한다.
- [Multiple tasks](https://www.todoist.com/help/articles/introduction-to-tasks-080OAXric)는 여러 task를 선택해 이동/복제하는 공통 selection pattern을 쓴다.
- [Project CSV export](https://www.todoist.com/help/articles/208821185-Project-templates)는 project를 한 단위로 export한다.

**FlowMe implication:** Today는 유지할 수 있다. 다만 완료 취소를 All/detail로 보내지 않고 즉시 undo와 완료 section을 제공한다. 다중 선택은 selected date move와 selected export가 공유한다.

## Apple Reminders

- [Smart Lists](https://support.apple.com/guide/reminders/view-reminder-lists-remnd854fc47/mac)는 Today, Scheduled, All, Completed를 별도 목적의 view로 둔다.
- 같은 list 안에서 completed reminders를 다시 표시할 수 있다.

**FlowMe implication:** Today/All 분리 자체가 문제는 아니다. 실행 view와 관리 view의 역할을 명확히 하고 완료 기록을 현재 Flow 안에서도 찾게 한다.

## Google Calendar and Tasks

- [Tasks in Calendar](https://support.google.com/calendar/answer/9901136?hl=en-GB)는 날짜가 있는 task만 Calendar에 나타난다고 명시한다.
- Calendar 안에서 task를 만들고 날짜/시간을 수정할 수 있으며 반복 task는 upcoming instances를 보여준다.
- 반복 수정은 next occurrence와 series 전체를 구분한다.

**FlowMe implication:** 날짜 없는 Item을 month grid에 가짜 event로 넣지 않는다. 대신 Calendar 내부 tray에서 발견하고 날짜를 부여한다. recurrence move scope는 occurrence와 series를 구분한다.

## Notion

- [Database views](https://www.notion.com/help/views-filters-and-sorts)는 같은 database를 list, calendar, table 등 여러 view로 투영한다. Calendar는 Date property를 가진 Item을 표시한다.

**FlowMe implication:** My Flow와 Calendar는 별도 데이터가 아니라 같은 effective Item의 다른 projection이어야 한다. 한 화면에서 수정한 날짜가 모든 view와 export에 반영돼야 한다.

## Carbon Design System

- [Forms](https://v10.carbondesignsystem.com/patterns/forms-pattern/)는 필요한 정보만 묻고 추가 input은 관련될 때 progressive disclosure로 보여주라고 권한다.
- [Accordion usage](https://carbondesignsystem.com/components/accordion/usage/)는 mobile/side panel의 긴 부가 정보를 줄이는 데 적합하지만 중요한 내용을 숨길 수 있음을 경고한다.

**FlowMe implication:** 제목, 날짜, 시간, 메모를 기본으로 두고 반복/duration/decision/record를 조건부로 펼친다. 기존 값이 있는 advanced section은 summary로 존재를 드러낸다.

## Rejected Copying

- Todoist처럼 completed recurring occurrence를 짧은 Undo 뒤 영구적으로 reopen하지 못하게 제한하지 않는다. FlowMe는 실행 history와 occurrence state를 이미 구분하므로 과거 회차 reopen 정책을 유지한다.
- Calendar drag-and-drop을 첫 구현으로 삼지 않는다. mobile, keyboard, undo, anchor/fixed semantics가 먼저다.
- Notion식 무제한 property editor를 가져오지 않는다. FlowMe는 실행에 필요한 최소 field만 보인다.
