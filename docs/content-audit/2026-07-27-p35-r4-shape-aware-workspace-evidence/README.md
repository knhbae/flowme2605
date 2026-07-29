# P35-R4 Shape-aware workspace evidence

- 작성일: 2026-07-27
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 실제 관찰 사용자 수: `0`

## 판정

My Flow 모바일의 고정 `다음 행동 / 전체 계획 / 기록` 3탭을 제거하고
콘텐츠 형태에 맞는 실행 단위를 같은 object frame 상단에 배치했다.

공통 순서는 다음과 같다.

1. Flow header
2. shape-aware execution unit
3. 전체 계획 또는 전체 내용
4. event가 있을 때만 진행 기록

형태별 결과:

- 일정형: 가장 가까운 날짜의 미완료 묶음
- 체크리스트형: 다음 1~3개
- 반복형: current occurrence와 series summary 분리
- 시트형: 현재 행과 다음 행
- 메모형: synthetic next 없이 전체 내용

Item memo는 항목 상세가 소유하고, 완료·회고·지난 실행은 optional history가
소유한다. 새 storage schema는 추가하지 않았다.

## Screenshot

- [모바일 일정형 날짜 묶음](./screenshots/p35-r4-dated-next-group-390.png)
- [모바일 반복 회차](./screenshots/p35-r4-routine-occurrence-390.png)
- [wide 시트 현재/다음 행](./screenshots/p35-r4-sheet-current-1024.png)

## 검증

- shape adapter unit: `4 / 4` 통과
- P35-R4 targeted E2E: `4 / 4` 통과
- production build: 통과
- mobile fixed workspace tab count: `0`
- fresh memo synthetic next count: `0`
- fresh Flow fixed history count: `0`
- 390px / 1024px horizontal overflow: `0`
- console/page error: `0`

전체 회귀는 `P35-R7`에서 다시 실행한다.

## Publish

- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- preview 배포: 없음
- production 배포: 없음

자동화와 screenshot 검증은 실제 사용자 관찰이 아니다.
