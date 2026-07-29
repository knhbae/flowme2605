# P35-R6 Calendar 선택일 구성 evidence

- 작성일: 2026-07-27
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 실제 관찰 사용자: `0`

## 판정

모바일 Calendar에서 날짜를 선택하면 페이지 아래의 긴 agenda 대신 선택일 하단 시트가
열린다. 와이드에서는 기존 월간 grid와 오른쪽 선택일 agenda 구성을 유지한다.

- 390px: date tap -> selected-day bottom sheet
- 1024px: date tap -> right-side agenda
- 첫 agenda row: 모바일 viewport 안에 표시
- 완료 primitive와 `Flow에서 열기`: 기존 계약 재사용
- Escape: 시트 닫기
- 닫은 뒤: 선택했던 날짜 버튼으로 focus 복귀
- body scroll: 시트가 열린 동안 잠금

## 발견 및 수정

첫 회귀 실행에서 완료 알림이 하단 시트 뒤에 가려지는 fixed-layer 충돌을 발견했다.
Calendar 시트가 열려 있을 때 lifecycle/completion 알림만 시트 위 notice layer로
올리고, 시트가 닫히면 기존 layer로 돌아가게 했다. 데이터나 완료 처리기는 변경하지
않았다.

## Screenshot

- [모바일 선택일 하단 시트](./screenshots/p35-r6-calendar-day-sheet-390.png)
- [와이드 선택일 측면 agenda](./screenshots/p35-r6-calendar-side-agenda-1024.png)

## 검증

- P35-R6 targeted E2E: `2 / 2` 통과
- 기존 Calendar lens 회귀: `3 / 3` 통과
- R5 + Calendar R6 묶음 회귀: `7 / 7` 통과
- production build: 통과
- horizontal overflow: `0`
- fixed bottom navigation overlap: `0`
- console/page error: `0`

전체 회귀는 `P35-R7`에서 다시 실행한다. 자동화와 screenshot은 실제 사용자
관찰이 아니다.

## Publish

- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- preview 배포: 없음
- production 배포: 없음
