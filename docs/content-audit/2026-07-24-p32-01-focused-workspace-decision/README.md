# P32-01 Focused My Flow Workspace Decision

## 판정

`B1 library_to_focused_workspace_with_cross_flow_queue`를 P32 구현안으로 선택한다.

- `지금 / Flow 목록 / 완료`는 여러 Flow를 가로지르는 질문으로 library 상태에서 유지한다.
- 사용자가 한 Flow를 열면 global My Flow header와 local tabs를 숨기고 선택한 Flow의 object workspace만 보여준다.
- public `/f`, global 4탭, source/personal/run/occurrence/export identity는 변경하지 않는다.
- 데이터 migration은 필요하지 않다.

## Current evidence

2026-07-24 `origin/main` `a2e1d72dadda0104f97682ae662dfbc113a85318`의 clean worktree를 로컬 production-equivalent source로 실행해 확인했다.

| 항목 | 결과 | evidenceKind |
| --- | --- | --- |
| 27개 fixture에서 검색 후 Flow 열기 | 2 interactions | `current_fixture_browser` |
| mobile Flow open 후 global My Flow tabs | 계속 visible | `current_fixture_browser` |
| mobile Flow object workspace | `실행 / 전체 계획 / 기록` visible | `current_fixture_browser` |
| wide Flow open | rail / plan canvas / next-action inspector 존재 | `current_fixture_browser` |
| wide global My Flow header/tabs | focused workspace 위에 계속 visible | `current_fixture_browser` |
| horizontal overflow | 0 | `current_fixture_browser` |
| React console error | list key warning 1건 | `current_fixture_browser` |

이 결과는 library를 없애거나 `지금` projection을 삭제할 근거가 아니라, **Flow open 상태에서 global local navigation을 접어 object context를 우선할 근거**다.

## Mixed route correctness

P31 검토에 사용된 `/f/real-mofa-overseas-travel-prep`는 의도적으로 public route에서 닫혀 있다. P32는 검토 편의를 위해 다시 공개하지 않는다.

- public `travel-packing-list`: undated checklist/resource shape 검증에 사용
- fixture-only `overseas-travel-d14`: mixed date/check/resource shape 검증에 사용
- `personalDraftMixedUserReachableWithoutFixture: false`
- public mixed-route journey cell: `blocked`

## Screenshot

- `screenshots/current-flow-open-390.png`
- `screenshots/current-flow-open-1024.png`

## 다음 gate

P32-02는 이 결정에 따라 한 Flow를 열었을 때:

1. global My Flow header/tabs를 숨긴다.
2. mobile은 object header와 `다음 행동 / 전체 계획 / 기록`만 남긴다.
3. wide는 기존 rail / canvas / inspector를 보존하되 object commands를 한곳에 모은다.
4. 목록으로 돌아가면 query, filter, scroll을 복구한다.

자동 브라우저 측정과 screenshot은 실제 사용자 관찰이 아니다. observed-user count는 `0`이다.
