# Reference pattern matrix

기능이나 외형을 복사하지 않는다. **연결 패턴**만 비교하고 `적용 / 변형 필요 / 적용 금지`로 판정한다.
EvidenceKind는 모두 `reference_pattern`(각 제품의 공식 도움말·제품 문서 수준의 일반적 동작)이며, FlowMe 쪽 판단 근거는 `current_production_interaction` 또는 `claude_proposed_artifact`다.

| # | Product | 비교한 연결 패턴 | 판정 | FlowMe 적용 방식 | 적용 금지 범위 |
| --- | --- | --- | --- | --- | --- |
| 1 | Google Calendar | 날짜 있는 항목만 시간 격자에 나타나고, 항목 자체는 원래 목록/앱이 소유한다 | 적용 | `/calendar`를 날짜 lens로 한정. 날짜 없는 항목은 개인 Flow가 소유 | 시간 격자·초대·참석자 같은 일정 관리 기능 도입 금지 |
| 2 | Apple Reminders | 목록(list) context와 오늘/예정(time) lens를 분리하고, 완료는 어느 뷰에서든 같은 원형 토글 | 변형 필요 | My Flow=context, Calendar=time lens 분리는 적용. 완료 토글은 사각 토글로 통일하되 **완료만** 허용 | 스마트 목록·태그·위치 알림 도입 금지 |
| 3 | Todoist | Today 뷰에서 task를 그 자리에서 완료할 수 있고, 세부 편집은 task view를 연다 | 적용 | Calendar 행에서 완료만 가능, 편집은 개인 Flow/Item detail | Karma·라벨·필터 쿼리 언어 금지 |
| 4 | Todoist | 목록에서 task를 누르면 전용 task view가 열린다 | 적용 | 행 tap = Item detail(390은 sheet, wide는 inspector) | 코멘트·협업·알림 금지 |
| 5 | Things | Project(무엇을 하는 묶음)와 Today/Upcoming(언제)을 서로 다른 화면으로 둔다 | 적용 | My Flow는 Flow context, Calendar는 time lens. `/my`에 Today를 만들지 않는다 | Areas·Someday 같은 상위 분류 도입 금지 |
| 6 | TickTick | 한 항목이 목록·달력 뷰에 동시에 존재해도 편집 진입점은 하나로 모은다 | 변형 필요 | 같은 원칙을 쓰되 FlowMe는 편집 진입점을 개인 Flow **하나**로 더 좁힌다 | 습관·포모도로·다중 뷰 전환 UI 금지 |
| 7 | Notion | 같은 데이터의 view(표·보드·캘린더)는 별개 object가 아니다 | 변형 필요 | Calendar·Checklist·Sheet·Memo를 canonical Flow의 projection으로 유지하고 **전역 navigation surface로 만들지 않는다** | 사용자가 view를 자유롭게 추가·전환하는 UI 금지(결과 형태는 콘텐츠가 정함) |
| 8 | Structured | 하루를 한 줄기 타임라인으로 보여주고 항목을 누르면 상세로 간다 | 적용 금지 | FlowMe는 하루 planner가 아니다. 선택일 agenda는 Flow별 그룹이지 시간 타임라인이 아니다 | 일일 타임라인·시간 블록 편집 금지 |
| 9 | Wanderlog | 여행 계획을 날짜 있는 항목과 날짜 없는 후보로 나눠 같은 문서 안에 둔다 | 변형 필요 | 날짜 있는 항목/없는 항목의 공존은 개인 Flow 안에서 해결. 다만 별도 tray를 만들지 않고 같은 목록에 `날짜 없음` 메타로 표기 | 지도·예산·공동 편집 금지 |
| 10 | Nike Training Club / Fitbod | 반복 운동을 series 정의와 개별 세션 기록으로 분리한다 | 적용 | series(요일·시작일·종료)와 이번 회차(완료·다시 열기)를 다른 카드로 분리. 영상은 자료로 분리 | 운동 처방·칼로리·성과 지표 생성 금지(원문에 없는 값) |

## 판정 요약

- **적용 5** — 날짜 lens 한정, time/context 분리, 행 tap = detail, date view 완료, series/occurrence 분리
- **변형 필요 4** — 완료 토글 범위 축소, 편집 진입점 1개로 축소, projection을 전역 뷰로 만들지 않음, undated를 tray 대신 메타로
- **적용 금지 1** — 일일 타임라인 planner

## 이 비교에서 얻은 결정적 근거

Calendar에 **완료만** 남기는 A′의 수정은 3번·2번 패턴(날짜 뷰에서의 즉시 완료)에서 왔고, **편집을 전부 옮기는** 결정은 4번·6번 패턴(상세는 전용 화면)에서 왔다. 두 패턴은 상충하지 않는다 — 성숙한 제품들은 date view에서 *상태 토글*은 허용하고 *편집*은 detail로 보낸다. FlowMe도 같은 선을 긋는다.
