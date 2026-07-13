# P23-02B1 QA

## Contract Fixtures

1. 날짜 없음 -> `unscheduled`
2. 날짜만 -> `all_day`
3. 날짜 + valid time -> `timed`
4. 종일 -> timed 전환 계약
5. timed -> 종일 전환 계약
6. 시간 변경 후 stable identity 유지
7. 자정을 넘는 종료 시각
8. invalid `24:00` -> 종일 fallback
9. invalid duration -> 30분 fallback
10. legacy fixed-date time -> 30분 floating local
11. 완료/완료 취소 membership 변화 0
12. reorder 후 time 상태와 identity 유지
13. malformed overlay Item loss 0
14. source-backed wrapper 미적용

## Required Assertions

- source mutation count = 0
- malformed schedule Item loss count = 0
- event identity changes after time edit = false
- completion state changed schedule membership count = 0
- legacy fixed-date time migrated = true
- Calendar timed consumer connected = false
- ICS timed consumer connected = false
- app UI changed = false

## Regression

- P23-02A 날짜 지정·변경·제거 유지
- personal add/delete/restore/reorder 유지
- source-backed/public Flow 유지
- Calendar/ICS/list export actual output 미변경
- normal route UI에 시간 control 0 유지

## Manual Sanity

- `/my` 개인 draft route가 기존 날짜 UI를 그대로 렌더링한다.
- `/calendar`가 기존 all-day row를 그대로 렌더링한다.
- console error와 horizontal overflow가 새로 생기지 않는다.

P23-02B1은 새 visible UI를 만들지 않으므로 screenshot 기반 기능 증명 대신 scoped source diff와 대표 route smoke를 UI 무변경 근거로 사용한다.
