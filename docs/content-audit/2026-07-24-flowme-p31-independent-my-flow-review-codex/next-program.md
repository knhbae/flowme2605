# P32 My Flow Focused Workspace Program

## 결정

- P31 verdict: `my_flow_structural_reopen`
- 선택안: B `library -> focused workspace`
- 범위: My Flow 내부 command hierarchy와 continuity
- 유지: 4탭 IA, public `/f`, current projection, stable identity, archive/restore/delete 분리
- migration: 없음
- observed-user count: 0

## P32-01 Route/Evidence Correctness

**문제:** P31 정본의 mixed travel route가 production에서 404이며 대체 route는 같은 shape가 아니다.

**범위:** 유효한 mixed date/check/resource fixture를 지정하거나 cell을 blocked로 명시한다. source safety gate는 유지한다.

**비범위:** closed MOFA Flow를 검토 편의로 공개, source 내용 재작성.

**의존성:** 없음. 반드시 첫 slice.

**구현 영향:** docs route manifest, route fixture, 관련 E2E. 앱 route를 추가할 경우 source quality gate 승인이 선행되어야 한다.

**검증:** 390/1024 status 200, date/check/resource role screenshot, route contract unit/E2E.

**rollback:** fixture 문서만 이전 값으로 되돌린다.

**완료 marker:** `P32-MIXED-SHAPE-ROUTE-CONTRACT`

## P32-02 Focused Workspace Command Hierarchy

**문제:** global 3 tabs와 local 3 tabs, management, advanced actions가 동시에 존재한다.

**범위:** Flow drill-in 중 object header, 다음 행동, 빠른 수정, 가져가기, 관리 순으로 재구성한다. back은 목록 filter/scroll을 복구한다.

**비범위:** 4탭 IA 변경, storage/projection 재작성, full planner 기능.

**의존성:** P32-01.

**영향 파일:** `components/flow/AppClient.tsx`, 필요 시 focused header/action component, `FlowExecutionPrimitives.tsx`.

**390 acceptance:** 첫 viewport command 12 이하, competing primary 1개, item edit/export 3단계 이내.

**1024 acceptance:** rail/canvas/inspector를 유지하되 object commands가 canvas/inspector에 한 번만 보인다.

**접근성:** back, menu, quick actions accessible name; drill-in focus 이동과 back focus/scroll 복구.

**테스트:** P31 workspace E2E 확장, 1/5/20/60 scale, six-shape screenshot.

**rollback:** current My Flow workspace renderer로 component-level rollback.

**완료 marker:** `P32-MY-FLOW-FOCUSED-COMMANDS`, `P32-MOBILE-OBJECT-FOCUS`

## P32-03 Quick Item Edit

**문제:** 일반 항목 수정도 전체 계획, 상세 disclosure, edit mode를 거쳐 6단계다.

**범위:** row의 열기에서 title/date/memo quick sheet를 제공한다. recurrence/structure/source fields는 advanced로 유지한다.

**비범위:** universal property editor, source item 원본 수정, recurrence schema 변경.

**의존성:** P32-02.

**영향 파일:** `AppClient.tsx`, `FlowExecutionPrimitives.tsx`, 기존 item detail editor.

**acceptance:** 390/1024에서 수정 저장 3단계 이내, cancel/dirty guard/focus return, Calendar/My Flow/export identity parity.

**rollback:** 기존 detail read/edit disclosure를 fallback으로 유지.

**완료 marker:** `P32-ITEM-QUICK-EDIT`

## P32-04 Anchor, Export, Lifecycle Commands

**문제:** public moving save는 전체 기준일 재조정이 없고 export/lifecycle은 깊고 분리돼 있다.

**범위:** object command sheet에서 전체 기준일, whole/selected/current export entry, archive를 제공한다. 영구 삭제는 archived 상태에서만 제공한다.

**비범위:** archive와 delete 통합, old run overwrite, new export format.

**의존성:** P32-02, P32-03.

**데이터:** 기존 anchor, personal override, lifecycle schema, export receipt를 그대로 사용한다. migration 없음.

**acceptance:** moving anchor 변경 후 개인 고정 날짜 유지, scope/count preflight, archive undo, reload restore, backup-gated delete.

**rollback:** 각 command adapter만 제거하고 current storage는 그대로 둔다.

**완료 marker:** `P32-ANCHOR-REUSE`, `P32-LIFECYCLE-DISCLOSURE`, `P32-EXPORT-SCOPE-ENTRY`

## P32-05 Continuity and Final Gate

**문제:** cross-surface filter/scroll 복구와 60 Flow scale은 현재 일부만 확인됐다.

**범위:** My Flow selected Flow/filter/scroll, Calendar Flow scope/date, export receipt identity를 continuity matrix로 고정한다.

**비범위:** account sync, cross-device, telemetry 기반 personalization.

**의존성:** P32-01..04.

**acceptance:** 24 cells 재실행, 1/5/20/60, six shapes, 390/1024/1440, overflow/fixed overlap/focus/accessibility, unit/build/full E2E.

**rollback:** selected Flow context restoration만 feature boundary로 분리한다.

**완료 marker:** `P32-CONTEXT-RESTORE`, `P32-FINAL-24-CELL-GATE`

## 순서와 병렬성

1. P32-01은 선행.
2. P32-02 다음 P32-03.
3. P32-04의 export/lifecycle visual work는 P32-03과 일부 병렬 가능하지만 anchor integration은 P32-02 이후.
4. P32-05는 마지막 통합 gate.

## 실제 사용자 관찰 전에 닫을 항목

- mixed fixture 404
- public moving anchor 재조정
- item edit/export/archive depth
- 보관/삭제 semantics와 focus
- 24-cell automated/heuristic gate
- security audit high advisory의 별도 release 판단
