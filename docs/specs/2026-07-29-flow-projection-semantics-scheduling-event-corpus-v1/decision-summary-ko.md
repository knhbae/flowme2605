# Flow Projection Lab v1 — 5분 결정 요약

## 결론

현재 `SourceRow → Item → Step → Flow → Map` 구조는 유지한다. 다만
Checklist·Todo·Calendar를 고정 상하관계로 만들지 않고, 같은 Item을
목적지 능력에 맞게 다르게 묶는 adapter 계약을 추가하는 것이 최선이다.

## Todo와 Checklist 차이

- **Checklist**: 한 상황에서 빠뜨리지 않고 끝내는 유한 묶음. Step과
  원문 순서를 보존한다. 예: 이사 당일, 여권 서류, 설치 절차.
- **Todo**: 각각 독립적으로 꺼내고 미루고 재정렬하는 행동·자료 queue.
  예: 볼 영상, 읽을 자료, 서로 독립적인 심부름.

Checklist는 `groups[].orderedEntries[]`, Todo는
`tasks[] + parentTaskId/queuePosition/canDefer/due`로 실제 출력 schema가
다르다.

## 다섯 projection 한 줄 정의

- **Calendar**: 실제 실행·참석 시점을 시간축에 둔다.
- **Checklist**: 한 상황의 누락 없는 완료를 돕는다.
- **Todo**: 독립 작업을 다음 행동 queue로 관리한다.
- **Sheet**: 항목·회차·상태를 행과 열로 비교·추적한다.
- **Memo**: 사람이 읽고 복사하기 쉬운 문서다. canonical raw JSON이 아니다.

## 모든 포맷으로 변환할 수 있나?

canonical JSON에는 모두 보존할 수 있다. Sheet와 Memo도 대부분 만들 수
있다. 그러나 Calendar·Checklist·Todo는 의미가 맞아야 한다.

- 일정 없는 Item → source 기반 Calendar 금지
- 행사 정보뿐이고 행동 의사가 없음 → Todo 금지
- 독립 queue를 Checklist로 만들 수는 있지만 재정렬·연기 의미가 약해짐
- 유한 점검을 Todo로 만들 수는 있지만 “빠뜨리면 안 됨”이 약해짐

따라서 추천도, 생성 가능 상태, 손실 등급을 따로 보여준다.

## 날짜 없는 콘텐츠 일정화

`시작일 + 하루 N개`, `시작일 + 주 N개`, `목표 종료일`,
`허용 요일`, `쉬는 날`, `선호 시간`을 사용자가 확인하면
UserFlowCopy에 pacing policy를 저장한다. 시스템은 원문 순서·dependency를
지키며 각 Item을 정확히 한 번 배치한다. 정책 변경 시 미래 미완료만 다시
계산한다.

이 일정은 source fact가 아니라
`scheduleOwner=user_overlay / derivation=pacing_policy`다.

## Due date와 Calendar 일정

- Due: 그때까지 끝내야 한다 → Todo 또는 VTODO DUE
- Event/time block: 그때 실제 참석·방문·실행한다 → VEVENT

마감만 있는 Todo를 임의 시간 블록 VEVENT로 만들지 않는다.

VEVENT의 기본 단위는 **scheduled Item occurrence**, VTODO의 기본 단위는
**독립 실행 가능한 Item**이다. 둘은 VCALENDAR 안의 형제이며 서로
중첩하지 않는다. 같은 시각·장소·Step session인 Item만 Calendar에서
묶을 수 있고, 이때도 모든 child Item ID와 “외부 Calendar는 개별 완료를
잃는다”는 손실을 보존한다.

## 축제·공연·시험

`Series → Edition → SourceOccurrence/Window/Milestone`을 먼저 저장한다.
사용자가 회차 저장·예매·참석을 선택하면 Item을 만든다.

- 여러 회차 공연: 회차별 Occurrence
- 전시 기간: availability window, 방문 시각 선택 후 VEVENT
- 티켓 오픈: 예매 Todo/VTODO, 선택적 알림
- 시험 시행 기간: 개인 시험 VEVENT가 아님; 배정 시각·장소가 필요
- 매년 날짜가 바뀌는 축제: 연도별 Edition, 거짓 yearly RRULE 금지
- 취소·변경: 기존 Occurrence를 지우지 않고 status와 관계를 보존

## 기획 승인 기본값

1. Item canonical + destination-specific grouping
2. Checklist와 Todo는 sibling projection
3. pacing preview는 draft, 사용자 확인 후에만 실제 일정 생성
4. due-only Item은 자동 VEVENT 금지
5. event source fact와 user attendance Item 분리
6. VTODO portability는 실제 client 왕복 검증 전까지 보장하지 않음

## 검증 경계

이 결과는 corpus·schema·자동 QA와 독립 agent 판정이다. 실제 사용자
검증과 Google/Outlook/Apple Calendar·VTODO 왕복은 모두 `NOT_RUN`이다.
