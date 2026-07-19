# Adjacent Product Pattern Review

## Review Rule

FlowMe에 다른 앱의 전체 IA를 복제하지 않는다. 다음 질문에 답하는 패턴만 가져온다.

- 복사/저장 직후 전체 artifact를 어떻게 확인하는가?
- 저장된 사본을 언제, 얼마나 자유롭게 수정하는가?
- 오늘 할 일과 전체 project를 어떻게 분리하는가?
- 날짜 없는 일을 Calendar와 어떻게 분리하는가?
- 여러 항목을 한 번에 이동·조정하는가?

## Patterns

### Notion - full copy first, editable afterward

Notion public page duplication은 원본의 sub-page를 포함한 전체 사본을 개인 workspace에 만들고, 이후 일반 page처럼 편집하게 한다.

**FlowMe implication:** 저장은 일부 Today item이 아니라 전체 Flow artifact의 개인 사본이라는 점이 보여야 한다. 저장 직후 전체 구조를 확인할 수 있어야 한다.

Source: <https://www.notion.com/help/duplicate-public-pages>

### Todoist - project contains the whole task set

Todoist project는 관련 task를 한 공간에 모으고, duplicated project는 active task/subtask와 날짜·priority·label을 포함한 독립 사본이 된다.

**FlowMe implication:** My Flow의 Flow view는 Today의 부가 정보가 아니라 저장된 전체 artifact를 확인하고 수정하는 독립적 관리 표면이어야 한다.

Source: <https://www.todoist.com/help/articles/introduction-to-projects-TLTjNftLM>

### Sunsama - undated work stays outside the daily plan

Sunsama backlog는 정확한 날짜를 정하지 않은 task를 보관하고, 날짜를 정할 때 daily column으로 옮긴다.

**FlowMe implication:** 날짜 없는 item을 Calendar grid에 긴 목록으로 펼치지 않는다. 별도 tray에서 발견하고 날짜를 지정한 뒤 grid로 이동한다.

Source: <https://help.sunsama.com/docs/usage-guides/backlog/>

### Google Calendar - only dated tasks appear on the calendar

Google Calendar 도움말은 날짜가 있는 task만 Calendar에 나타나며, pending task는 별도 목록에서 편집·완료·재예약한다고 설명한다.

**FlowMe implication:** Calendar는 dated execution surface로 유지한다. undated work의 존재는 알리되 grid event처럼 취급하지 않는다.

Source: <https://support.google.com/calendar/answer/9901136?hl=en-uk>

### Wanderlog - select first, then move as a group

Wanderlog은 여러 장소를 선택한 뒤 list 또는 itinerary date로 함께 이동·복사·삭제한다.

**FlowMe implication:** 향후 날짜 이동은 하나/선택/전체 범위를 먼저 고르고 날짜를 적용하는 정책이 자연스럽다. 이번 J0/J1의 save adjustment에는 최소 포함 선택만 두고 bulk date move는 별도 후속으로 유지한다.

Source: <https://help.wanderlog.com/hc/en-us/articles/5159691054619-Move-or-delete-multiple-places-at-once>

## What Not To Copy

- Notion의 범용 block editor 전체
- Todoist의 project management depth 전체
- Sunsama의 daily planning 의식 전체
- Google Calendar의 event/task 설정 복잡도 전체
- Wanderlog의 여행 전용 list taxonomy

FlowMe는 `one original source -> one natural artifact -> minimal execution UI`를 유지한다.
