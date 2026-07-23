# P32 My Flow Focused Workspace Final Review

작성일: 2026-07-24

판정: `local_verification_green_publish_pending`

기준 SHA: `a2e1d72dadda0104f97682ae662dfbc113a85318`

선택안: `B1 library_to_focused_workspace_with_cross_flow_queue`

데이터 migration: 없음

실제 관찰 사용자: `0`

## 결과

P32는 My Flow의 global IA를 바꾸지 않고, 한 Flow를 열었을 때 선택한 object에 집중하도록 화면 문법을 정리했다.

- library 상태: `지금 / Flow 목록 / 완료`, 검색, 여러 Flow 탐색
- focused 상태: Flow 제목, `다음 행동 / 전체 계획 / 기록`, 기준일·가져가기·관리
- Item detail: 제목·날짜·메모 빠른 수정
- mobile return: 이전 검색어와 library 상태 복구
- wide return: `전체 보기`로 library 복귀

## 핵심 수치

| 항목 | 결과 |
| --- | --- |
| Flow 열기 | `<=2` interactions |
| Item 빠른 수정 form | `<=3` interactions |
| whole export preflight | `<=3` interactions |
| archive | `<=3` interactions |
| restore | `<=4` interactions |
| P32 targeted E2E | `4 / 4` |
| full Playwright | `314 / 314` |
| unit | `587 / 587` |
| horizontal overflow | `0` |
| fixed/sticky overlap | `0` |
| unnamed focusable | `0` |
| console/page error | `0` |
| screenshots | `10` |

## 유지한 계약

- 4탭 IA
- public `/f` 저장 전 shell
- source / personal overlay / execution run / occurrence / export identity
- 기존 localStorage key와 저장 schema
- 완료/다시 열기
- whole/selected/current export scope
- 보관/복구/보관 후 영구 삭제
- Calendar와 portable export projection

## Route 정합성

`/f/real-mofa-overseas-travel-prep`는 의도적으로 닫힌 route다. P32는 검토를 위해 다시 공개하지 않았다.

- public undated checklist/resource: `travel-packing-list`
- mixed date/check/resource: fixture-only `overseas-travel-d14`
- public mixed route 사용자 여정: `blocked`
- `personalDraftMixedUserReachableWithoutFixture: false`

## 파일

- [상세 audit](./audit.md)
- [HTML review](./review.html)
- [route evidence](./route-evidence.json)
- [journey results](./journey-results.json)
- [screenshot manifest](./screenshot-manifest.json)
- [독립 검토 프롬프트](./prompt-ko.md)
- [screenshots](./screenshots/)

자동 테스트, 브라우저 측정, screenshot은 실제 사용자 검증이 아니다.
