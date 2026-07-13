# P23-01D3B List Export Projection Evidence

P23-01D1의 개인 structural projection을 개인 draft의 실제 checklist, sheet, memo
builder와 My Flow export 진입부에 연결했다. URL-first miss 또는 메모에서 만든 개인
draft만 대상이며 source-backed/public Flow의 export 경로는 유지했다.

## 연결 결과

- checklist, sheet, memo는 각각 `rowsByDestination.checklist`, `sheet`, `memo`를 읽는다.
- 세 destination은 같은 stable Item ID, personal order, effective title/date/memo를 사용한다.
- unscheduled user Item은 세 list export에 포함된다.
- tombstoned/excluded Item은 세 destination 모두에서 제외된다.
- restore한 Item은 같은 stable ID와 개인 순서로 다시 포함된다.
- 완료와 완료 취소는 목록 membership을 바꾸지 않고 상태 표현만 바꾼다.
- user-created Item의 sheet 행은 `원문 없음`으로 표시해 가짜 원문 정보를 만들지 않는다.
- My Flow 상세의 접힌 `이 Flow 가져가기` 영역에서 메모, 체크리스트, 시트 복사를 제공한다.

## UI 범위

새 페이지나 destination은 추가하지 않았다. 개인 draft의 기존 구조 편집 영역 끝에
compact secondary export entry를 두었고, 390px에서는 세 버튼을 세로로, 1024px에서는
3열로 배치했다. source-backed Flow에는 이 entry가 노출되지 않는다.

## 의도적으로 남긴 범위

- user-created Item의 날짜, 시간, 반복 편집 UI는 아직 없다.
- list export는 기존 portable export 모델과 같이 clipboard 복사를 사용한다.
- source-backed/public full-Flow builder는 이번 adapter를 적용하지 않는다.
- 계정, DB, cloud sync, OAuth, 새 export destination은 추가하지 않았다.

## 증거

- [route-evidence.json](./route-evidence.json): marker와 route/viewport 판정
- [projection-export-fixtures.json](./projection-export-fixtures.json): destination별 fixture 기대값
- [모바일 My Flow](./screenshots/01-personal-draft-list-export-mobile.png): 완료, 제외, unscheduled user Item과 list export entry
- [wide My Flow](./screenshots/02-personal-draft-list-export-wide.png): restore 후 ordered Items와 3열 export entry
- [완료 상태 checklist](./downloads/personal-draft-checklist-completed.txt)
- [완료 취소 상태 checklist](./downloads/personal-draft-checklist-reopened.txt)
- [sheet TSV](./downloads/personal-draft-sheet.tsv)
- [memo text](./downloads/personal-draft-memo.txt)

## 검증

| 항목 | 결과 |
|---|---|
| evidence capture E2E | 1 passed |
| focused structural/Calendar/ICS/list export E2E | 5 passed |
| full URL-first user-surface E2E | 15 passed |
| public share/workbench regression E2E | 44 passed |
| full unit suite | 452 passed |
| production build/type check | passed |
| docs check | passed |

자동 fixture 검증과 실제 사용자 도달 가능성을 구분했다. source Item의 제목, 날짜, 메모,
완료/완료 취소, user Item 추가, reorder, restore, export는 실제 UI 경로로 확인했다.
excluded/tombstoned 혼합 상태는 deterministic localStorage fixture로 준비한 뒤 restore와
export를 사용자 경로로 확인했다.
