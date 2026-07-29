# Reference Pattern Matrix

조사일: 2026-07-24. 모든 항목은 공식 도움말을 사용한 `reference_pattern`이며 FlowMe 사용자 관찰이 아니다.

| 제품 | 공식 근거 | 확인한 pattern | FlowMe 판단 | 적용 금지 |
| --- | --- | --- | --- | --- |
| Todoist | [Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs) | Today는 여러 project의 오늘 task를 모으고 날짜 없는 task는 project/filter에 남긴다. | **변형 적용:** My Flow 지금은 실행 queue, Flow 목록은 context library로 유지한다. | priority, team, project 체계 전체 복제 |
| Things | [Today/Upcoming/Anytime/Someday](https://culturedcode.com/things/support/articles/4001304/) | 시간 관점과 project/area context를 분리하며 Logbook에 완료를 둔다. | **적용:** 지금/Flow/완료의 질문을 분리하되 Flow를 연 뒤에는 object focus를 우선한다. | Someday 철학과 Apple 전용 gesture 복제 |
| Apple Reminders | [Smart Lists](https://support.apple.com/en-gb/guide/iphone/iphe882772ed/ios) | Today, Scheduled, All, Completed가 같은 reminder를 목적별로 모은다. | **변형 적용:** stable Item을 유지하며 surface는 projection으로만 다르게 보인다. | location, assignment, iCloud 기능 추가 |
| Google Calendar | [Create/edit events](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en) | 날짜 배치와 item detail을 Calendar context에서 처리한다. 현재 공식 페이지는 이번 browser fetch에서 inaccessible이었다. | **현재 유지:** selected-day agenda와 focus-returning sheet. | Calendar를 Flow structure editor로 확장 |
| Notion | [Views and open pages](https://www.notion.com/help/views-filters-and-sorts) | 같은 database를 여러 view로 보고 page는 side/center/full로 집중해서 연다. | **변형 적용:** mobile drill-in, wide rail/canvas/inspector. | 범용 database property/editor 노출 |
| Hevy | [Workouts vs Routines](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them) | routine은 재사용 계획, workout은 현재 실행 기록이다. | **적용:** series, occurrence, run history를 같은 card state로 합치지 않는다. | 운동 전용 set/weight analytics |
| Wanderlog | [Help Center](https://help.wanderlog.com/hc/en-us) | daily itinerary, place/list, map, batch move를 trip identity 안에서 분리한다. | **변형 적용:** timeline/mixed Flow는 phase/date group body renderer를 쓴다. | booking, map routing, cost planner |

## 결론

- **Keep:** stable object identity, date-first Calendar, routine/run 분리.
- **Adapt:** library에서 focused object workspace로 drill-in, 빠른 수정과 상세 수정 분리.
- **Reject:** 범용 database, social proof, team collaboration, booking, planner 기능 확장.
