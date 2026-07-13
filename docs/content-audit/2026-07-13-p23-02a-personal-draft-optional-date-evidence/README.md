# P23-02A Personal Draft Optional Date Evidence

개인 draft에서 사용자가 추가한 날짜 없는 할 일에 실제 UI로 날짜를 지정하고,
날짜를 바꾸거나 다시 날짜 없음으로 돌릴 수 있게 했다. user-created Item의 날짜는
personal structural overlay가 소유하며, source Item의 기존 schedule과 execution run의
완료 상태는 변경하지 않는다.

## 구현 결과

- My Flow의 개인 draft 항목 편집에 `날짜 없음` / `날짜 지정` 선택을 추가했다.
- `날짜 지정`을 선택하면 native date input이 나타나며, 저장 후 새로고침해도 유지된다.
- `날짜 지우기`는 user-created Item의 structural schedule만 제거한다.
- stable personal Item ID, 제목, 메모, 개인 순서, 완료·완료 취소 상태는 날짜 변경과
  독립적으로 유지된다.
- source-backed Flow에는 새 structural date control을 노출하지 않는다.
- 시간, 시간대, 종일, 반복 입력은 user-created Item 편집에서 열지 않았다.

## Projection 결과

| 상태 | My Flow | Calendar | ICS | checklist | sheet | memo |
|---|---:|---:|---:|---:|---:|---:|
| 날짜 없음 | 포함 | 제외 | 제외 | 포함 | 포함 | 포함 |
| 날짜 지정 | 포함 | 포함 | 포함 | 포함 | 포함 | 포함 |
| 날짜 변경 | 포함 | 새 날짜 1건 | 새 날짜 1건 | 포함 | 포함 | 포함 |
| 날짜 제거 | 포함 | 0건 | 0건 | 포함 | `날짜 없음` | 포함 |

Calendar와 ICS는 같은 effective title/date/stable identity를 사용한다. checklist, sheet,
memo는 날짜 제거 후에도 항목과 사용자 메모를 보존한다. 완료와 완료 취소는 destination
membership을 바꾸지 않는다.

## 사용자 도달 가능성

P23-01D2/D3A에서는 scheduled user Item을 fixture로만 만들 수 있어
`personalDraftScheduleUserReachableWithoutFixture`가 `false`였다. 이번에는 다음 실제 경로로
날짜를 지정한다.

`/flows` miss → 초안 저장 → `/my` → 내 Flow → 항목 열기 → 수정 → 날짜 지정 → 저장

따라서 해당 marker는 `true`로 닫혔다. fixture는 기존 structural 혼합 상태 회귀에만
사용하며, 날짜 지정·변경·제거 자체는 UI로 수행했다.

## Evidence

- [route-evidence.json](./route-evidence.json): route, viewport, 필수 marker
- [projection-export-fixtures.json](./projection-export-fixtures.json): 날짜 상태 전이와 destination 결과
- [모바일 날짜 편집](./screenshots/01-personal-draft-date-edit-mobile.png)
- [모바일 Calendar 반영](./screenshots/02-personal-draft-calendar-date-set-mobile.png)
- [wide 날짜 변경](./screenshots/03-personal-draft-date-moved-wide.png)
- [모바일 날짜 제거](./screenshots/04-personal-draft-date-removed-mobile.png)
- [날짜 지정 ICS](./downloads/personal-draft-user-item-date-set.ics)
- [날짜 제거 후 checklist](./downloads/personal-draft-date-removed-checklist.txt)
- [날짜 제거 후 sheet](./downloads/personal-draft-date-removed-sheet.tsv)
- [날짜 제거 후 memo](./downloads/personal-draft-date-removed-memo.txt)

## 검증

전용 E2E는 실제 UI로 날짜 지정·변경·제거를 수행하고 Calendar, ICS, 세 list export를
확인한다. structural 단위 테스트는 invalid date 방어, source Item 미적용, stable ID,
Calendar/ICS eligibility, 완료 상태 분리를 고정한다. 전체 검증 수치는
[route-evidence.json](./route-evidence.json)의 `verification`에 기록한다.

## 남은 범위

- 시간·시간대·종일 모델과 UI는 P23-02B 대상이다.
- 반복 규칙과 회차별 완료 모델은 P23-02C 대상이다.
- 현재 persistence는 localStorage 기반이므로 계정 간 동기화는 지원하지 않는다.
- 실제 사용자 관찰을 통한 날짜 control 발견성 검증은 자동 E2E와 별도로 필요하다.
