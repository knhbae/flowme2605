# FlowMe MECE UX Reset 1차 설계 묶음

- 작성일: 2026-07-26
- 완료 범위: `UXR-00`~`UXR-09`
- 다음 목표: `P35-01` entry router와 3탭 navigation
- 실제 관찰 사용자 수: 0명
- 앱 코드 변경: 없음

## 10분 검토 순서

1. [Interactive current/proposed wireflow](./review.html)
2. [설계 패키지](../p35-spec/design-package.md)
3. [15-cell 시뮬레이션 결과](../p35-spec/simulation.md)
4. [구조화 scorecard](./journey-scorecard.json)
5. [상위 실행 계획](../p35-spec/plan.md)
6. [A′ P35 전체 개발 handoff](../p35-spec/developer-handoff-a-prime-ko.md)
7. [P35-01~08 순차 개발 복붙 프롬프트](../p35-spec/p35-goal-prompts-ko.md)

## 먼저 판단할 세 가지

아래 세 결정은 2026-07-26 사용자 승인으로 `A_prime`에 확정됐다.

### 1. Home

별도 Home을 제거한다. `/`는 저장 Flow가 있으면 `/my`, 없으면 `/flows`로 연결한다.

현재 실제 이용 후기, 이용량, 리뷰 데이터가 없으므로 가상의 사회적 증거를 Home의 역할로 만들지 않는다.

### 2. My Flow

`지금` 실행 mode를 제거하고 저장한 Flow를 찾고 관리하는 library로 한정한다.

Item 실행, 완료, 다시 열기, 날짜, 메모, 가져가기는 열린 개인 Flow가 소유한다.

### 3. Calendar

Calendar는 날짜 lens로 한정한다. inline 메모, 날짜 이동, 날짜 없는 tray는 제거하고 동일 run 상태의 `완료 / 다시 열기` primitive 하나만 남긴다.

Calendar의 일정은 같은 개인 Flow를 여는 입구다.

## Wireflow 조작

- 상단에서 이사, 차량 점검, 반복 홈트, 장기 학습, 개인 메모 사례를 바꾼다.
- `390px`과 `1024px`을 전환한다.
- 1~8 단계로 찾기부터 가져가기까지 이동한다.
- 이사일을 바꾸고 포함 항목과 저장 이름을 조정한다.
- 개인 Flow에서 Item 날짜·메모를 바꾸고 완료·다시 열기를 실행한다.
- Calendar 날짜를 눌러 agenda를 바꾸고 같은 Flow를 연다.
- 가져가기에서 whole, selected, current 범위와 count를 비교한다.

## 주요 screenshot

### Current production

- `screenshots/current-home-390.png`
- `screenshots/current-flows-390.png`
- `screenshots/current-public-moving-390.png`
- `screenshots/current-receipt-moving-390.png`
- `screenshots/current-my-flow-workspace-390.png`
- `screenshots/current-calendar-390.png`
- `screenshots/current-public-moving-1024.png`
- `screenshots/current-my-flow-1024.png`
- `screenshots/current-calendar-1024.png`

### Proposed wireflow

- `screenshots/proposed-discover-390.png`
- `screenshots/proposed-receipt-390.png`
- `screenshots/proposed-my-flow-library-390.png`
- `screenshots/proposed-personal-flow-390.png`
- `screenshots/proposed-calendar-390.png`
- `screenshots/proposed-workout-preview-390.png`
- `screenshots/proposed-vehicle-calendar-390.png`
- `screenshots/proposed-discover-1024.png`
- `screenshots/proposed-calendar-1024.png`

## Evidence 경계

Current production interaction, current source, current screenshot은 현재 상태의 근거다.

Proposed wireflow, scorecard, 자동 브라우저 검사는 구현 전 설계와 heuristic simulation 근거다. 실제 사용자 관찰 또는 production 구현 증거가 아니다.
