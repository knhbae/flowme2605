# FlowMe P34-00 Execution CRUD / Goal UX Review

## 판정

`bounded_crud_revision`

FlowMe는 일정, Todo, 체크리스트 실행에 필요한 핵심 데이터 계약과 CRUD를 상당 부분 갖추고 있다. 완료/다시 열기, 날짜 배치/제거, 개인 Item 추가/삭제/복구, source Item 제외/복구, 반복 series/occurrence, Flow 보관/복구/영구 삭제, whole/selected/current export가 서로 다른 상태로 구현되어 있다.

현재 가장 큰 문제는 기능 부재가 아니다. 같은 기능이 public Flow, receipt, My Flow, Calendar, Item detail, export에서 서로 다른 이름과 깊이로 나타나기 때문에 사용자가 하나의 조작 체계로 학습하기 어렵다. 특히 활성 Flow에서 삭제 경로가 보이지 않고, Calendar 키보드 이동과 저장 전 조정 화면의 조작량이 과하다.

따라서 데이터 계약이나 4탭 IA를 다시 쓰는 `structural_crud_reopen`은 필요하지 않다. P33 canonical 정렬을 먼저 production에 반영한 뒤, 명령 문법과 surface composition을 함께 고치는 bounded P34가 적절하다.

## 현재 증거 경계

| 구분 | 현재 사실 | evidenceKind |
| --- | --- | --- |
| Production | P32, `https://flowme2605.vercel.app` | `current_production_interaction` |
| Production route audit | 8 routes x 390/1024, 총 16상태. HTTP 200, horizontal overflow 0, unnamed focusable 0, console/page error 0 | `current_production_interaction` |
| 핵심 1440 화면 | public moving, My Flow 27개, Calendar 20개 fixture 캡처. horizontal overflow 0 | `current_production_interaction` |
| P33 PR | Draft PR #156, branch `codex/p33-integrated-program-plan` | `current_source` |
| 검토 SHA | branch와 local review worktree 모두 `8c54992ce5628ab2a3884a530a83d2c8226223dc` | `current_source` |
| origin/main | `e491d99ca61ecae4fd0dd009f785e737b6a59516` | `current_source` |
| P33 Preview | Vercel 인증 화면으로 이동. 상호작용 검토 불가 | `inaccessible` |
| P33 local source render | `localhost:3001`에서 `/flows`, moving, My Flow, Calendar를 390/1024로 렌더링. Preview interaction으로 간주하지 않음 | `current_source`, `heuristic_simulation` |
| 현재 명령 검증 | lifecycle, item state, undated tray, recurrence, run, export, identity, storage 관련 unit 90/90 통과 | `current_source` |
| 실제 관찰 사용자 | 0명. observed-user evidence 없음 | `heuristic_simulation` |

P33 local source에서 Flow 찾기의 AJD moving은 24개로 정렬되고 `/flow-maps/moving-d30`은 `/f/moving-d30-basic`으로 307 redirect된다. Production P32의 Flow 찾기에는 여전히 5개로 보이므로, P33 배포 전에는 current production의 cross-entry mismatch가 남아 있다.

## 가장 중요한 결론

1. **Flow 삭제는 지원되지만 hidden이다.** 활성 Flow의 `⋯`에는 `보관`만 보이고, 영구 삭제는 보관 후 보관됨 필터의 두 번째 `⋯` 안에 나타난다. 안전한 두 단계 계약은 유지하되 첫 메뉴에서 전체 lifecycle을 예측할 수 있어야 한다.
2. **CRUD 의미 분리는 대체로 정확하다.** 완료, 다시 열기, 건너뛰기, 보류, source Item 제외, 개인 Item 삭제, Flow 보관은 데이터상 분리되어 있다. 그러나 entry, 명칭, feedback의 공통 문법이 부족하다.
3. **저장 전 조정은 기능보다 구성이 무겁다.** moving 24개 조정은 4개 모드와 24개 row를 제공하지만 사용자가 바꾼 결과보다 설정 분류가 먼저 보인다. actual artifact diff가 중심이 되어야 한다.
4. **날짜 없는 Item 계약은 강하다.** My Flow에서 실행하고 Calendar의 placement queue에서 일괄 배치하며 undo와 날짜 제거를 지원한다. 이 기능은 재설계보다 발견성과 키보드 동작을 개선할 대상이다.
5. **Calendar는 포인터 사용에는 충분하지만 키보드 비용이 크다.** 390px에서 월 grid의 각 날짜가 모두 Tab stop이라 tray와 agenda에 도달하기 전에 42개 안팎의 날짜 버튼을 지난다. grid roving focus가 필요하다.
6. **반복 계약은 충분하고 화면 위계만 고치면 된다.** series와 occurrence identity, 이번 회차/이후/전체 scope, 완료/재개가 분리된다. public 설정과 My Flow 상세가 긴 설정 폼처럼 읽히는 것이 문제다.
7. **별도 Goal 객체는 지금 만들지 않는다.** 현재 Flow 진행률, section, completion, run history로 long-running progress를 표현할 수 있다. 독립 Goal 대시보드는 FlowMe를 full planner로 밀어내므로 적용 금지다.

## Goal 대안 판정

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| A. 별도 Goal 객체 없이 Flow 진행률과 완료만 제공 | **권장** | 현재 데이터 계약과 portable execution layer 경계를 유지하면서 학습/이사/루틴 진행을 표현할 수 있다. |
| B. goal/milestone/review-date bounded overlay | **보류** | 실제로 Flow 진행률만으로 부족한 반복 사용 증거가 생길 때 additive personal overlay로 검토한다. P34 범위에는 넣지 않는다. |
| C. 목표 대시보드, 습관, 성과 추적 full planner | **적용 금지** | Notion/Todo/Calendar 대체 제품으로 범위가 확장되고 source-to-artifact loop를 약화한다. |

## P34 실행 순서

1. P33 production publish/smoke gate
2. P34-01 Flow lifecycle command surface
3. P34-02 shared Flow/Item command grammar
4. P34-03 save-before progressive adjustment
5. P34-04 personal draft and Item editor simplification
6. P34-05 Calendar keyboard and dated/undated orchestration
7. P34-06 recurrence series/occurrence hierarchy
8. P34-07 export scope and receipt consistency
9. P34 regression/final gate

P34-03~07은 P34-02의 명령 계약을 고정한 뒤 일부 병렬 진행할 수 있다. 전체 계획은 [p34-backlog.md](./p34-backlog.md)에 있다.

## 산출물

- [상세 감사](./audit.md)
- [통합 검토 보드](./review.html)
- [CRUD capability matrix](./crud-capability-matrix.json)
- [8 personas x 3 sessions scorecard](./persona-journey-scorecard.json)
- [조작 일관성 matrix](./interaction-consistency-matrix.json)
- [Current / proposed wireframes](./current-proposed-wireframes.html)
- [P34 구현 backlog](./p34-backlog.md)
- [Production route audit](./production-route-audit.json)
- [Screenshots](./screenshots/)

## 검토 한계

- P33 Vercel Preview는 인증으로 막혀 실제 preview interaction을 완료하지 못했다.
- P33 local source render는 current source를 브라우저에 렌더링한 heuristic evidence이지 배포 evidence가 아니다.
- fixture는 scale과 density 검토용이며 실제 사용자 도달 상태와 구분했다.
- Figma는 사용하지 않았다. 제안 화면은 repository 안의 HTML wireframe으로 제공한다.
- 자동화, screenshot, unit test, agent simulation은 실제 사용자 검증이 아니다. observed-user count는 0이다.
