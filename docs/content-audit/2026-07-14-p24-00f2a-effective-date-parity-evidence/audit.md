# P24-00F2A Audit

## 원인

Calendar와 상세 화면은 `flow:my-flow:date-overrides`를 source row 위에 투영했지만, My Flow 상단 `다음 할 일`은 투영 전 `flow.rows`의 날짜를 읽었다. 같은 항목이 전체 목록과 Calendar에서는 수정한 날짜로 보이고 Today에서는 원래 날짜 또는 `날짜 없음`으로 보일 수 있었다.

## 변경

`resolveMyFlowEffectiveDate`가 source date, 개인 사본 날짜, 실행 중 override, draft overlay를 한 번에 해석한다. 소비 화면은 같은 stable Item ID와 기존 override key를 유지한 채 이 결과만 읽는다.

적용 소비자:

- My Flow Today/다음 할 일
- My Flow 전체 목록
- Calendar marker와 selected-day agenda
- 완료 run snapshot
- 기존 항목 ICS export에 전달되는 row

## 실제 사용자 경로

1. 모바일 390px `/flows`에서 localStorage를 깨끗이 비움
2. 날짜 없는 `travel-packing-list` 저장 상태 준비
3. `/my` 전체 목록에서 첫 할 일을 열어 `2026-07-24` 지정
4. Today 상단이 `7월 24일`을 표시하는지 확인
5. 전체 목록 행이 `7월 24일`을 표시하는지 확인
6. 항목 ICS의 `DTSTART;VALUE=DATE:20260724` 확인
7. `/calendar` 7월 24일 marker 1건, 7월 23일 0건 확인

fixture로 날짜를 직접 주입하지 않고 기존 사용자 편집 UI로 도달했다.

## 검증

- unit: 480/480 pass
- P24 targeted Playwright: 2/2 pass
- source-backed date/anchor regression Playwright: 3/3 pass
- production build: pass, 18 routes
- mobile 390px screenshots: 2장 확인
- horizontal overflow: 0
- console/page error: 0

## 다음 slice

P24-00F2B에서 `내가 바꾼 날짜 유지`를 선택한 새 실행이 날짜 override snapshot을 실제 active run으로 이관하는지 수정한다. 이번 slice는 reuse 정책을 변경하지 않았다.
