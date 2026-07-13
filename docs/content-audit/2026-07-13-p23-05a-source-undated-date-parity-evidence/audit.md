# Audit

## Root Cause

일반 저장 항목용 manual schedule key와 Calendar projection은 이미 있었지만, editor의 `canEditDate`가 기존 날짜 row, progress Flow, personal draft user item에만 열려 있었다. 또한 Flow 탭 row projection이 legacy manual date override를 다시 읽지 않아 재진입 시 날짜가 숨을 수 있었다.

## Change

1. 원본 row에 날짜가 없고 routine이 아닌 저장 항목을 optional-date 대상으로 판별한다.
2. 같은 detail editor 안에 date input과 명시적 `날짜 없애기`를 노출한다.
3. 저장은 기존 `flow:my-flow:date-overrides`의 `flowSlug::rowId::none` key를 사용한다.
4. Flow 탭 재진입도 같은 key를 읽는다.
5. 제거는 override key만 지워 원본 날짜 없음 상태로 되돌린다.

## Projection

| 상태 | My Flow | Calendar | memo/checklist/sheet | ICS |
| --- | --- | --- | --- | --- |
| 날짜 없음 | 유지 | 제외 | 포함 | 제외 |
| 날짜 지정 | 유지 | 해당 날짜 1건 | 날짜 포함 | all-day 1건 |
| 날짜 제거 | 유지 | 0건 | 날짜 없음 | 0건 |

## Remaining Boundary

- 원래 날짜가 있는 source Item의 날짜를 완전히 없애는 정책은 별도 결정이 필요하다.
- source-backed add/delete/reorder는 source v2 merge와 tombstone 소유권 검증 전에는 열지 않는다.
- Flow Map 직접 저장본의 Flow 전체 기준일 재설정은 P23-05B anchor-only slice로 분리한다.

