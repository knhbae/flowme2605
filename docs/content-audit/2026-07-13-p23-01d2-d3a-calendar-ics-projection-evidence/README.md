# P23-01D2/D3A Calendar & ICS Projection Evidence

P23-01D1의 개인 structural projection 계약을 실제 개인 draft Calendar 화면과
My Flow 항목별 ICS 다운로드에 연결했다. 적용 대상은 URL-first miss 또는 메모에서
만든 개인 draft뿐이며 source-backed/published Flow consumer는 유지했다.

## 연결 결과

- Calendar marker와 선택일 agenda는 `rowsByDestination.calendarScreen`을 읽는다.
- 개인 draft 항목별 ICS는 같은 projection row의 `calendarIcs` eligibility를 읽는다.
- title/date/memo personal value overlay가 Calendar와 ICS에 함께 반영된다.
- tombstoned/excluded/unscheduled 항목은 Calendar와 ICS에서 제외된다.
- restore한 scheduled 항목은 같은 stable Item ID로 다시 나타난다.
- 같은 날짜에서는 personal order rank가 보조 정렬로 적용된다.
- 완료와 완료 취소는 Calendar membership이나 ICS eligibility를 바꾸지 않는다.
- reorder 전후 ICS UID는 동일하다.

## 의도적으로 남긴 범위

- user-created Item에 날짜를 처음 지정하는 UI는 아직 없다. scheduled user Item 검증은
  structural overlay fixture를 사용했으며 `personalDraftScheduleUserReachableWithoutFixture`는
  `false`다.
- checklist/sheet/memo builder는 아직 structural projection에 연결하지 않았다.
- public `/f` full-Flow ICS와 source-backed per-item ICS는 변경하지 않았다.
- 새 날짜, 시간, 반복 control은 추가하지 않았다.

## 증거

- [route-evidence.json](./route-evidence.json): 목표 marker와 route/viewport 판정
- [projection-export-fixtures.json](./projection-export-fixtures.json): 상태별 projection/ICS 기대값
- [모바일 Calendar](./screenshots/01-personal-draft-calendar-mobile.png): same-date source/user Item, 완료 control, 상세/ICS entry
- [wide Calendar](./screenshots/02-personal-draft-calendar-wide.png): same-date personal order와 month/agenda parity
- [reorder 전 ICS](./downloads/personal-draft-user-item-before-reorder.ics)
- [reorder 후 ICS](./downloads/personal-draft-user-item-after-reorder.ics)

## 검증

| 항목 | 결과 |
|---|---|
| focused structural/ICS unit tests | 37 passed |
| Calendar/ICS + 기존 draft/source-backed targeted E2E | 4 passed |
| evidence capture E2E | 1 passed |
| URL-first/public share/workbench regression E2E | 58 passed |
| production build/type check | passed |
| full unit suite | 450 passed |
| docs check | passed |

콘솔 검증은 애플리케이션 runtime 오류를 기준으로 0건이다. 저장소 전역의 기존
`/favicon.ico` 404 한 건은 기능 경로와 무관한 baseline static-asset 요청으로 별도
식별해 runtime error count에서 제외했다.
