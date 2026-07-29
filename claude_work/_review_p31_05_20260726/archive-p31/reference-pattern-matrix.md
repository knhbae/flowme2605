# Reference Pattern Matrix — My Flow

REVIEWER_ROLE: claude_design · reviewedAt: 2026-07-24 KST · observed-user count: 0
evidenceKind for this file: reference_pattern (공식 문서 관찰) — FlowMe 화면/기능 복제가 아니라 역할·구조 원칙만 번역한다.

> FlowMe는 portable execution layer다. 아래 어떤 제품도 기능 체크리스트로 쓰지 않는다.
> "reference에 있으니 FlowMe에도 필요"는 금지된 결론이다(simulation-output-contract.prohibitedClaims).

| # | 제품 | 관찰한 구조 원칙 | FlowMe 번역 | 복제하지 않을 것 | 개선되는 persona/session | 데이터 계약 영향 |
|---|------|----------------|-------------|-----------------|------------------------|-----------------|
| 1 | Todoist | Today는 여러 프로젝트의 "오늘"만 모으고, 날짜 없는 항목은 프로젝트/필터에서 본다. list·calendar는 같은 task의 다른 표현. | My Flow의 next-action 뷰는 실행 가능한 항목만 모으고, 전체 구조는 workspace가 소유. Calendar와 My Flow가 별도 canonical Item을 만들지 않는다. | priority/label/team/board 등 full planner 기능 | P1-S2, P7-S1 (이어하기 단일화) | 없음(동일 projection 소비) |
| 2 | Things | 시간축(Today/Upcoming/Anytime/Someday)과 컨텍스트축(Project/Area)을 분리. 날짜 제거는 삭제가 아니라 Anytime 복귀. 완료·취소는 Logbook에 남는다. | 날짜 없는 Item을 "실패한 캘린더"가 아니라 실행 가능한 별도 상태로. 완료 기록(완료)은 현재 실행과 분리하되 항상 다시 열 수 있게. | Apple 전용 제스처, Someday 철학 전체 | P2-S1/S2, P7-S2 | 없음 |
| 3 | Apple Reminders | Today/Scheduled/All/Completed 스마트 리스트가 같은 reminder를 "목적"별로 모은다. | My Flow 상단 뷰는 객체 종류가 아니라 사용자 질문("지금 뭐 하지 / 뭐가 있지 / 뭘 끝냈지")에 답해야 한다. | 위치·사람 기반 리마인더, iCloud 협업 | P6-S1, P7 전반 | 없음 |
| 4 | Google Calendar | 날짜·시간 배치와 event detail에 집중. event를 열어 편집하고, calendar 표시를 토글. | Calendar Item detail은 sheet로 열고(현재 P31 방식과 일치), 구조 편집·lifecycle은 My Flow로 위임. 날짜 이동은 명확한 범위+undo. | 게스트/회의/공유 캘린더 권한 | P2-S2, P6-S2 | 없음(effective date 공유) |
| 5 | Notion | 같은 객체가 list/calendar/timeline으로 보이고 row는 side peek / center peek / full page로 단계적으로 열린다. | Flow는 하나의 객체 유지. mobile=focused workspace, wide=rail/canvas/inspector. detail 깊이는 목적에 따라 단계 공개(B안의 핵심 근거). | 사용자에게 database property/view 빌더 전부 노출 | P4-S1/S2, P5-S2 | 없음 |
| 6 | TickTick | list·calendar·detail을 함께 쓰되 각 column 역할이 분명. | wide rail/canvas/inspector 역할 검증. mobile은 세 column을 길게 잇지 말고 drill-in. | habit/Pomodoro/matrix/통계 all-in-one | P6-S2 (wide), P4-S2 | 없음 |
| 7 | Wanderlog | trip 정체성 아래 day-by-day itinerary. Item을 day로 이동/batch move. 전체 trip identity 유지. | 이사/결혼/여행처럼 날짜·단계가 핵심인 Flow는 generic 카드 스택보다 date/phase group 우선. 전체를 먼저 이해하고 Item 이동. | 예약/지도 라우팅/공동작업/경비 | P1(timeline), P4(mixed) | 없음(phase group은 표현) |
| 8 | Hevy | routine(재사용 계획)과 workout(현재 실행/기록)을 구분. routine에서 시작하면 별도 workout run이 열린다. | 반복 Flow 정의, 이번 occurrence, 현재 run, history를 한 카드에 섞지 않는다. "시작" 후엔 이번 실행에 집중, series 설정은 secondary. → **C안이 여기서 강함; B의 routine/long-timeline body에 차용.** | 세트·중량·근육 통계 | P3-S1/S2/S3 | 없음(series/occurrence 계약 기존 유지) |
| 9 | Strava | 완료 activity는 주간 log/filter로 회고하고 현재 plan과 구분. | Flow "기록"은 계획 설명을 반복하지 말고 완료 run·회고·수정 흔적을 시간순으로. | 소셜 피드/segment/스포츠 분석 | P3-S3, P7-S2/S3 | 없음 |

## 종합 가설 (H1–H4)

- **H1 사용자 질문 축**: When(지금/예정/없음/완료) × Context(Flow). 현재 P31은 두 축을 여러 탭·카드로 반복 → 같은 Item이 여러 번 primary로 보임. → B는 When을 "이어서(continue) + 완료(필터)"로 축소하고 Context를 focused workspace가 소유.
- **H2 한 Flow=한 작업 공간**: Notion peek / Wanderlog trip / Hevy active workout처럼 선택 객체 컨텍스트가 지속돼야 한다. 현재는 Flow를 열어도 global Today·다른 Flow·export가 동일 시각 무게 → 재구성 후보(B의 근거).
- **H3 계획과 실행 기록 분리**: 한 시점에 한 역할만 primary. 페이지 수를 늘리는 게 아니라 우선순위를 나눈다.
- **H4 콘텐츠 형태를 숨기지 않는 공통 shell**: 공통 identity/header/action grammar는 유지, body renderer가 timeline/checklist/routine/artifact/mixed/draft를 드러낸다.

## Reference 기반 금지 제안 (준수)

습관/채팅/통계/협업/예약 추가, 5개 artifact 상시 노출, Notion식 범용 편집기, 가짜 인기·사용자 수, Calendar/My Flow 별도 완료 상태, 아름다운 대시보드를 위해 다음 행동을 첫 viewport 아래로 미루기 — 모두 채택하지 않는다.
