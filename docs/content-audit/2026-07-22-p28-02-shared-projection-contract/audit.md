# P28-02 Contract Audit

## Ownership

| Layer | P28-02 treatment |
| --- | --- |
| source | 원본 Item과 order를 읽기만 함 |
| personal overlay | title/date/memo/order/include override 입력 허용 |
| execution run | completed 표시만 읽고 membership과 분리 |
| occurrence | P28-04에서 occurrence row로 확장 |
| export | P28-07 consumer가 같은 shape row를 사용 |

## Role fallback

명시적 `FlowItem.role`이 정본이다. legacy item은 다음 순서로 추론한다.

1. hold eligible/status -> decision
2. caution-only warning title -> warning
3. link-only resource title -> resource
4. Sheet 기록형 -> record
5. 확인/점검 -> confirmation
6. 나머지 -> action

이 fallback은 migration 전 호환용이며 UI consumer가 별도 slug 분기를 만들기 위한 API가 아니다.

## Destination matrix

| Role | Flow execution | Calendar when dated | Checklist | Sheet | Memo | Completable |
| --- | --- | --- | --- | --- | --- | --- |
| action | yes | yes | yes | yes | yes | yes |
| confirmation | yes | yes | yes | yes | yes | yes |
| decision | yes | yes | yes | yes | yes | yes |
| record | yes | no | no | yes | yes | no |
| resource | yes | no | no | no | yes | no |
| reference | yes | no | no | no | yes | no |
| warning | yes | no | no | no | yes | no |

## Error defense

- invalid date는 Item을 삭제하지 않고 unscheduled로 낮춘다.
- unknown/duplicate order ID는 source Item을 유실하지 않는다.
- legacy `skipped` 중 `excluded_on_start`만 구조 제외로 읽는다.
- source object mutation count는 `0`이다.

## Current verification

- targeted unit: `7 / 7` pass
- source mutation: `0`
- malformed date item loss: `0`
- excluded source deletion: `0`
- UI consumer connected: `false` at this slice
- observed-user count: `0`
