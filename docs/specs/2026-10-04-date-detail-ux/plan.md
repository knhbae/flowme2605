# 단계 계획

1. 현재: clean 기준선·현재 상세 owner·최신 UX2·피드백과 요구 ID 대조. state/ref·mutate/CAS·날짜 writer는 ProgramSpace에 유지한다.
2. 설계: 상시 날짜·시간 + 기본 접힌 진행 기록/연결·순서. native details 내부는 unmount하지 않는다. 제목/닫기는 짧은 가로에서도 도달한다. 기존 tokens 사용, 새 시각체계·이미지 자산 불필요한 작은 UI 개선으로 imagegen 예외를 적용한다.
3. 조작 HTML: 합성 항목의 날짜/시간·진행·접기·원문/기간 왕복·실패/재시도·Undo·취소를 메모리에서만 시뮬레이션. 원문과 제품 저장 동작의 차이를 명시한다.
4. 구현: 기존 실행 상세 JSX/CSS에 계층 적용. 같은 원문으로 돌아가는 명시 버튼은 기존 openDocument(docId,taskId), 미적용 일정 draft면 먼저 적용/취소하도록 차단. existing generation protection 유지.
5. 검증: 새 컴포넌트/DOM 회귀와 기존 date-roundtrip/private-schedule/문서복귀/recurrence, npm test, production build, 합성 HTTP 브라우저·5 viewport·오류/경계/ID/취소·Undo·reload. 계정 API를 실제로 보내지 않는다.
6. 마감: 초기안과 앱 screenshot 비교·감산 검토·독립 diff·docs/closeout. 원본 증거 로컬 유지, 요약은 정본 qa/results에 기록. 반영은 별도 승인 단계로 남긴다.

참조 패턴: [Things 날짜 선택/기존 날짜 진입](https://culturedcode.com/things/support/articles/2803579/)과 [Todoist의 상세→Date→scheduler](https://www.todoist.com/help/todoist/features/schedule-a-date-and-time-for-your-todoist-tasks-q7VobO)를 2026-10-04 직접 조회했다. 날짜 작업을 먼저 찾게 하는 상호작용만 참고하며 자연어 날짜/마감일/자동 알림이나 IA 전체를 이식하지 않는다.
