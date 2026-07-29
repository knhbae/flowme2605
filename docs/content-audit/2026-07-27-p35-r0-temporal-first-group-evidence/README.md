# P35-R0 시간 정합성과 첫 날짜 묶음 evidence

- 작성일: 2026-07-27
- 기준 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 대상 route: `/f/moving-d30-basic`, `/my`, `/calendar`
- 실제 관찰 사용자 수: `0`

## 판정

`P35-R0`의 코드 연결과 자동 검증을 완료했다. 내부 owner 검토에서 저장 전
미리보기와 저장 후 날짜 묶음의 시각 문법이 너무 다르다는 의견이 나왔고,
저장 후 묶음도 저장 전과 같은 날짜 레일·평평한 행 구조를 사용하도록 수정했다.
완료 checkbox는 각 실행 행의 오른쪽에 둔다.

R0는 저장 데이터나 날짜 계산 규칙을 바꾸지 않는다. 기존 effective date를 읽어
My Flow 첫 실행 영역을 시간 순서와 같은 날짜 묶음으로 다시 구성한다.

## 바뀐 사용자 행동

1. 기준일을 입력했을 때 이미 지난 파생 항목이 있으면 저장 전에 한 줄로 알린다.
2. 저장 뒤에는 과거 한 항목보다 오늘 또는 가장 가까운 미래 날짜의 미완료 묶음을
   먼저 보여 준다.
3. 같은 날짜의 미완료 항목은 모두 함께 보여 준다.
4. 미래 항목이 없으면 가장 가까운 과거 미완료 묶음을 사실대로 보여 준다.
5. 나머지 지난 항목은 삭제하거나 자동 완료하지 않고 접힌 목록에 보존한다.
6. 저장 전 Calendar preview와 저장 후 날짜 묶음은 같은 `FlowDateRailGroup`
   primitive를 사용한다.
7. 저장 후 행의 제목 영역은 상세 열기, 오른쪽 checkbox는 완료·다시 열기를
   담당한다. 별도 `열기` 문구는 화면에서 반복하지 않는다.

## 대표 fixture

- 로컬 오늘: `2026-07-27`
- 입력 이사일: `2026-08-03`
- 지난 항목: `9개`
- 지난 범위: `2026-07-04`~`2026-07-24`
- 첫 미래 묶음: `2026-07-31`, `4개`
- 모든 일정이 과거인 fixture:
  - 이사일 `2026-07-25`
  - 첫 과거 묶음 `2026-07-26`, `2개`
  - 지난 항목 disclosure `22개`

## 정합성

- 완료 전 My Flow 묶음: `4개`
- 한 항목 완료 뒤 My Flow 묶음: `3개`
- 즉시 되돌리기 뒤: `4개`
- 다시 완료하고 reload 뒤: `3개`
- Calendar 선택일: 전체 `4개`, 미완료 `3개`
- Calendar에서 다시 열기 뒤: 미완료 `4개`
- My Flow 재진입 뒤: 같은 stable row identity `4개`

날짜 없는 차량 점검과 반복 홈트에는 temporal group을 적용하지 않고 기존 실행
projection을 유지했다.

## Screenshot

- [저장 전 지난 일정 경고 390px](./screenshots/p35-r0-past-date-warning-390.png)
- [My Flow 같은 날짜 묶음 390px](./screenshots/p35-r0-next-date-group-390.png)
- [My Flow 같은 날짜 묶음 1024px](./screenshots/p35-r0-next-date-group-1024.png)

## 검증

- R0 pure adapter unit: `7 / 7` 통과
- 전체 unit:
  - pretest `79 / 79` 통과
  - test `590 / 590` 통과
- R0 targeted Playwright: `3 / 3` 통과
- owner 수정 후 기존 selector 회귀 단독 재실행: `6 / 6` 통과
- `docs:check`: 통과
- production build: 통과
- 첫 full E2E: `358 / 359` 통과
  - 기존 URL-first 장기 시나리오가 상세 편집 버튼 대기 중 4분 timeout
  - 같은 시나리오 단독 직렬 재실행 `1 / 1` 통과
- final full E2E 직렬 재실행: `359 / 359` 통과
- 390px·1024px:
  - horizontal overflow `0`
  - fixed overlap `0`
  - console/page error `0`

## 데이터 영향

- source 변경: 없음
- personal overlay write 변경: 없음
- structural overlay 변경: 없음
- execution run schema 변경: 없음
- recurrence 변경: 없음
- export identity 변경: 없음
- localStorage key/schema/migration 변경: 없음

## Publish

- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- Preview 새 배포: 없음
- Production 배포: 없음

## Owner checkpoint

상태: `approved_after_revision`

Owner 의견:

> 2번 묶음 페이지의 UI가 1번과 비슷하게 생겨야 하며, 1번 UI처럼 구성하고
> 오른쪽에 체크박스를 두는 편이 낫다.

반영 결과:

1. 한 줄 과거 일정 경고는 유지했다.
2. 같은 날짜 4개 항목을 저장 전과 같은 날짜 레일 아래 한 화면에서 읽는다.
3. disclosure는 `저장된 지난 할 일 9개 보기`로 바꿔 보존 상태를 명시했다.
4. 실행 checkbox는 오른쪽으로 이동했고 완료·되돌리기·Calendar identity는
   기존 동작을 유지했다.
