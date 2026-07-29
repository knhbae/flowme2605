# P35-R5 메모 결과 우선 문법 evidence

- 작성일: 2026-07-27
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 실제 관찰 사용자: `0`

## 판정

메모 입력 결과는 추가 설명이나 전체 편집 폼보다 먼저 실제 artifact 행으로 보인다.
사용자는 5개 할 일을 확인한 뒤 Flow 제목과 첫 날짜만 빠르게 정하고, 필요한 행만
기존 P35-R2 항목 편집기로 조정할 수 있다.

- 첫 결과 행 수: `5`
- 첫 화면의 보이는 text/date input 수: `2`
- 기본 artifact: 체크리스트 `5개`
- 보조 artifact: 메모 `5개`, 실행표 `5행`
- 첫 행과 둘째 행에 날짜를 지정한 뒤 Calendar 선택 시: `2개`
- 저장 후: 기존 receipt를 거쳐 focused My Flow workspace로 연결

## 데이터 경계

- 메모 분할 parser는 변경하지 않았다.
- source 배열과 source Item은 변경하지 않았다.
- 날짜는 기존 개인 draft의 anchor/day-offset 표현으로 저장한다.
- personal overlay, execution run, occurrence, export identity 계약은 유지한다.
- 새 localStorage key, schema, migration은 없다.
- AI API, crawler, live generation은 연결하지 않았다.

## Screenshot

- [모바일 메모 결과 우선 화면](./screenshots/p35-r5-memo-proposal-390.png)

## 검증

- memo proposal adapter unit: `3 / 3` 통과
- P35-R5 targeted E2E: `2 / 2` 통과
- R5 + Calendar R6 묶음 회귀: `7 / 7` 통과
- production build: 통과
- 390px / 1024px horizontal overflow: `0`
- unnamed focusable: `0`
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
