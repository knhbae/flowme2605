# P31 Reference Patterns

확인일: 2026-07-23

이 문서는 FlowMe를 인접 서비스를 복제하기 위한 목록이 아니다. 각 서비스가 **home, library, execution, detail, recovery**를 어떻게 분리하는지 보고 FlowMe에 맞는 패턴만 차용한다.

## 1. Todoist

공식 자료:

- [Plan your day with the Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)

관찰:

- Today는 여러 project의 오늘 task를 한 실행 surface에 모은다.
- 날짜 없는 task는 Today/Upcoming에 나타나지 않고 project/filter에서 찾는다.

차용:

- Home 또는 My Flow `지금`은 catalog가 아니라 cross-Flow 실행 queue여야 한다.
- 날짜 없는 일은 Calendar에 억지로 나타내지 않고 명시적 placement queue로 둔다.

차용하지 않음:

- FlowMe를 project/task manager 전체로 확장하지 않는다.

## 2. Notion

공식 자료:

- [Navigate with the sidebar](https://www.notion.com/help/navigate-with-the-sidebar)
- [Finding templates on Marketplace](https://www.notion.com/help/finding-templates-on-marketplace)

관찰:

- Home은 attention이 필요한 page/task, recents, favorites 같은 재방문 맥락을 모은다.
- Library/Marketplace는 전체 content와 template 발견을 담당한다.
- Marketplace의 사용 수·review·update 정보는 실제 데이터 계약을 기반으로 한다.

차용:

- Home과 Find 역할 분리
- 재방문 Home의 recent/continue
- catalog의 source/범위/creator/update 신뢰 정보

차용하지 않음:

- telemetry와 review contract 없이 가짜 사용 수·후기 수를 production에 표시하지 않는다.
- Notion의 무한 hierarchy를 My Flow에 복제하지 않는다.

## 3. Google Calendar

공식 자료:

- [Create an event on Android](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en)

관찰:

- event를 먼저 열고, 상세 edit는 별도 상태로 전환한다.
- event/task 종류를 바꿔도 입력 데이터를 가능한 한 보존한다.
- all-day, 반복, 상세는 점진적으로 편집한다.

차용:

- Calendar Item detail을 month/agenda inline 확장과 분리
- quick view -> edit
- 일정 유형 변경 시 개인 값 보존

차용하지 않음:

- drag-and-drop planner와 account sync를 이번 범위에 넣지 않는다.

## 4. Apple Calendar

공식 자료:

- [Create and edit events in Calendar on iPhone](https://support.apple.com/en-ca/guide/iphone/iph3d110f84/ios)
- [Change how you view events in Calendar on iPhone](https://support.apple.com/en-ph/guide/iphone/iphfd1054569/ios)

관찰:

- month view는 compact/stacked/details처럼 밀도를 선택한다.
- event를 열고 별도 edit로 들어간다.
- calendar별 표시와 event detail이 분리된다.

차용:

- month grid는 compact identity
- selected-day와 detail layer 분리
- Flow scope와 Item detail 역할 분리

차용하지 않음:

- FlowMe month grid에 모든 title을 강제로 표시하지 않는다.

## 5. Strava

공식 자료:

- [Activity stats in the feed](https://support.strava.com/en-us/articles/15401664-activity-stats-in-the-feed)
- [Viewing activities](https://support.strava.com/en-us/articles/15401943-viewing-activities)

관찰:

- feed는 activity type과 공간에 따라 가장 중요한 stat만 보여 준다.
- activity를 열면 전체 detail과 edit/delete로 이동한다.

차용:

- Home의 사용 예시는 콘텐츠별 핵심 결과 1~2개만 보여 준다.
- My Flow 목록과 detail을 분리한다.
- 운동 Flow의 default summary는 모든 stat을 펼치지 않는다.

차용하지 않음:

- social feed나 leaderboard를 만들지 않는다.

## 6. Nike Training Club

공식 자료:

- [What does the NTC app offer?](https://www.nike.com/help/a/ntc-info)
- [Nike Training Club](https://www.nike.com/gb/ntc-app)

관찰:

- video/resource, workout session, multi-week program의 역할이 다르다.
- program은 목표와 schedule에 맞춰 구성되고 workout은 실제 실행 단위다.

차용:

- workout resource와 execution Item 분리
- routine definition과 occurrence execution 분리
- compact routine summary와 다음 occurrence

차용하지 않음:

- coaching analytics, 운동 강도 처방, 건강 조언을 추가하지 않는다.

## 7. FlowMe 적용 필터

레퍼런스 패턴은 아래 조건을 모두 통과할 때만 적용한다.

1. FlowMe의 portable execution layer 역할을 강화한다.
2. source/personal/run/occurrence/export 경계를 흐리지 않는다.
3. 기본 frame의 control 수를 늘리지 않는다.
4. 콘텐츠 shape별 예외를 줄인다.
5. 390px에서 한 질문·한 primary 원칙을 지킨다.
6. 실제 telemetry나 account가 필요한 패턴을 가짜 데이터로 흉내 내지 않는다.
