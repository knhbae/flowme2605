# P23-01A Implementation Plan

## Phase 1: Inventory

- 현재 personal copy와 URL draft 저장 구조 확인
- localStorage key와 backup allowlist 확인
- canonical source / personal overlay / execution run 소유권 확인
- stable ID와 source version merge 위험 기록

## Phase 2: Contract

- schema v1 type 정의
- user-created Item, tombstone, order override, selection 정의
- personal value overlay와 execution state 입력 경계 정의
- additive migration과 malformed fallback 정의

## Phase 3: Pure Resolver

- source와 user Item을 stable ID로 결합
- tombstone/restore 처리
- mixed order 처리
- source v2 신규/제거 Item safe merge
- projection eligibility 계산
- execution state가 구조를 바꾸지 않는지 보장

## Phase 4: Persistence

- versioned localStorage key adapter
- legacy included/excluded migration
- malformed record preserve policy
- Flow clear와 run reset 범위 분리
- backup/restore allowlist 포함

## Phase 5: Golden Fixtures

1. source checklist unchanged
2. source Item tombstone
3. source Item restore
4. user Item add
5. user Item delete and restore
6. source/user mixed reorder
7. source v2 new Item
8. source v2 removed Item
9. memo/date value overlay with reorder
10. completed execution state with reorder
11. malformed/duplicate personal ID
12. legacy included/excluded migration

## Phase 6: Verification

- structural overlay unit tests
- storage clear and run reset boundary tests
- backup/restore tests
- existing storage/source-backed/export tests
- docs check
- build
- targeted route sanity showing no UI change
- task-only commit and push

## Deferred

- P23-01B personal draft add/delete/undo UI
- reorder UI
- source-backed UI adapter
- Calendar/export builder adoption
- source ID remapping review UI

## P23-01B Goal Candidate

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P23-01B Personal Draft Structural Edit UI를 구현한다. P23-01A structural overlay contract와 resolver를 재사용해 URL-first miss에서 만든 개인 draft Flow만 대상으로 항목 1개 추가, 항목 삭제, 삭제 직후 undo를 모바일 390px My Flow 상세에 연결한다. source-backed Flow와 reorder UI, Calendar/export builder 전환은 이번 범위에 포함하지 않는다.

핵심 원칙:
- source-backed 원본 Flow에는 구조 편집 UI를 노출하지 않는다.
- user-created Item은 stable personal ID와 provenance:user_created를 가진다.
- 삭제는 record 제거가 아니라 tombstone이다.
- undo는 같은 stable ID와 이전 위치를 복구한다.
- 완료 상태는 execution run에 유지하고 structural overlay에 넣지 않는다.
- 기존 title/date/memo personal value overlay와 완료/완료 취소를 유지한다.
- 설명 카드나 full editor를 만들지 않는다.

구현 범위:
1. 개인 draft Flow 판별 adapter를 만든다.
2. My Flow 상세 목록 하단에 짧은 `할 일 추가` entry를 둔다.
3. 제목을 입력해 user-created Item 1개를 저장한다.
4. 개인 draft Item row에서 삭제를 실행하면 tombstone을 저장한다.
5. 삭제 직후 한 번의 undo를 제공한다.
6. resolver effectiveItems를 My Flow 목록에 반영한다.
7. 새로고침 후 add/delete/undo 상태 유지 여부를 검증한다.
8. source-backed Flow에는 같은 controls가 0건인지 검증한다.

검증:
- 모바일 390px 개인 draft My Flow add/delete/undo
- 새로고침 persistence
- 완료/완료 취소와 edit entry 회귀
- source-backed Flow structural controls 0
- structural overlay unit tests
- targeted Playwright E2E
- npm.cmd test
- npm.cmd run docs:check
- npm.cmd run build
- git diff --check

완료 기준:
- 개인 draft Flow에서 항목을 추가하고 삭제 후 즉시 복구할 수 있다.
- source-backed 원본은 바뀌지 않는다.
- 같은 resolver가 저장 전후 stable ID와 순서를 유지한다.
- Calendar/export/reorder는 후속 slice로 명시된다.
```
