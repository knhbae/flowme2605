# Informed benchmark — 원칙만 가져오고 제품은 복제하지 않기

> 이 표는 Pass 2에서만 공개한다. 공식 문서에 명시된 패턴을 비교 입력으로 쓰되 FlowMe의 current fact나 사용자 선호를 증명하지 않는다.

| 제품·공식 source | 확인할 패턴 | FlowMe MVP에 채택할 원칙 | MVP에서 기각할 확장 | 반증 질문 |
|---|---|---|---|---|
| [Todoist — Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs) | 여러 project의 오늘 날짜 task를 하나의 Today view에 모음 | Today는 저장된 계획을 바꾸지 않는 파생 실행 렌즈로 취급 | Today를 다섯 번째 export로 만들거나 `/my` library를 대체 | 같은 Item이 library와 Today에 나타날 때 identity·완료 상태가 한 번만 변하는가? |
| [Things — Today, Upcoming, Anytime, Someday](https://culturedcode.com/things/support/articles/4001304/) | 시간 관점과 project/area 관점을 분리하고 Today를 focus view로 사용 | 날짜/행동 가능성에 따른 가벼운 노출 순서와 undated 보류 개념 | 모든 기본 list·project·area hierarchy를 복제 | FlowMe의 0/1/5/20 plans에서 시간 분류가 오히려 탐색 부담을 키우지 않는가? |
| [Apple Reminders — Smart Lists](https://support.apple.com/en-gb/guide/iphone/iphe882772ed/ios) | 같은 reminder를 날짜·flag·priority 조건의 파생 list로 모음 | canonical Item을 유지한 채 Today/overdue 같은 파생 lens 사용 | 독립 저장 사본이나 범용 smart-list builder 추가 | overdue/Today lens가 canonical plan과 다른 완료 상태를 만들지 않는가? |
| [Structured — task editor](https://help.structured.app/en/articles/338050), [Inbox와 timeline](https://help.structured.app/en/articles/338178) | 같은 task 편집 문법을 유지하며 undated Inbox와 scheduled timeline을 구분 | Item 역할이 같다면 editor 구조를 공유하고 scheduling state는 분명히 표시 | 모든 Item에 시간·duration·timeline 사용을 강제 | public/saved editor의 shared shell이 Apply/Save transaction 차이를 숨기지 않는가? |
| [Sunsama — guided daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/), [Today view](https://help.sunsama.com/docs/usage-guides/today-view/) | 계획 준비·부하 확인·확정·실행 focus를 단계적으로 분리 | 준비/저장/실행의 상태 전환과 finalization receipt를 명확히 함 | ritual, workload budget, integrations, collaboration을 MVP에 이식 | 단계가 상태 truth를 높이는가, 아니면 불필요한 step을 추가하는가? |
| [Notion — database views](https://www.notion.com/help/views-filters-and-sorts) | 같은 database를 목적에 따라 여러 view로 표현 | 한 canonical plan을 목적지별 preview/result로 투영 | 범용 database, view builder, property 설정 UI 구축 | 각 format이 같은 Item ID/field를 보존하는가, 아니면 별도 콘텐츠처럼 갈라지는가? |

## Pass 2 기록 방법

각 행에 다음을 추가한다.

```text
current evidence → adopt 원칙을 지지/반박 → reject 경계가 필요한 이유
→ FlowMe에서 가장 작은 실험 → owner decision
```

다른 앱과 닮았다는 사실은 PASS 근거가 아니다. FlowMe가 기존 calendar/todo/notes/spreadsheet 사용자가 익숙한 목적지로 결과를 옮기는 MVP라는 범위를 유지한다.
