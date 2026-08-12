# My Plan Edit And Lifecycle Unification

**Status:** OWNER APPROVED / LOCAL IMPLEMENTATION AND VERIFICATION COMPLETE / COMMIT-PUSH-DRAFT PR-PREVIEW AUTHORIZED / MERGE-PRODUCTION NOT AUTHORIZED / OBSERVED USERS 0

**Owner decision:** 2026-08-12

**Base:** `origin/main` at `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`

## Goal

일반 Flow, Flow Map, 개인 메모·URL 초안, 이전 저장본이 `/my`의 같은 계획 편집 surface와 같은 저장·취소·뒤로가기·focus 복귀 규칙을 사용하게 한다. 지원되지 않는 출처에서 보이기만 하고 동작하지 않는 `수정`을 없애고, 선택한 계획의 공통 상세 화면에서 기존 보관·복구 lifecycle에 도달하게 한다.

## User problem

현재 선택한 계획 화면은 공통 `MyPlanExecutionSurface`를 쓰지만 편집기는 schema-v2 canonical personal copy만 연다. Flow Map·개인 초안·이전 저장본은 보이는 `수정`이 구형 조정 상태로 빠진 뒤 현재 surface에서 렌더링되지 않아 무반응처럼 보인다. 저장 완료 시점, 취소·브라우저 뒤로가기, 항목 편집 후 계획 복귀, 보관 진입도 출처별로 달라 사용자가 같은 계획을 다른 제품처럼 배워야 한다.

## Product contract

### One personal plan editor

- 네 출처 모두 같은 계획 편집 shell, 제목·시작 기준·포함 항목·순서·항목 상세 문법을 쓴다.
- 출처의 실제 capability가 다른 경우에만 필드를 조건부로 잠그거나 숨긴다. 출처 이름 때문에 버튼 의미, 저장 완료 시점, 뒤로가기, 복귀 위치가 달라지지 않는다.
- 항목 편집의 주 action은 `계획에 반영`이며 부모 계획 draft만 갱신한다. localStorage의 최종 변경은 부모의 `변경 저장`에서 한 번 수행한다.
- clean 취소, 닫기, backdrop, Escape, 브라우저 Back은 쓰기 없이 원래 계획과 시작 control로 돌아간다. dirty 상태에서는 같은 변경 취소 확인을 거친다.
- 저장 중 또는 recovery 중에는 닫기를 막고, 쓰기 실패 시 draft를 유지한다.

### Origin adapters, not new identities

- `canonical-personal-copy`, `source-backed-map`, `personal-draft`, `legacy-saved-plan`은 공통 draft를 만들고 각 기존 persistence owner로 다시 저장한다.
- 기존 storage key, record schema/version, Flow·Map·child Flow·source·personal copy·execution identity, export 형식을 바꾸지 않는다.
- legacy record를 schema-v2 personal copy로 암묵 승격하지 않는다.
- Flow Map을 한 Flow로 합치거나 새 personal-copy key를 만들지 않는다. 기존 snapshot/persistence/bridge와 canonical child Item ID를 유지한다.
- 개인 메모·URL 초안은 기존 draft bundle, source fragment, structural overlay와 Item ID를 유지한다.
- source record나 creator version을 수정하지 않으며 merge/version-management UI를 만들지 않는다.

### Lifecycle

- 선택한 active 계획은 공통 header의 한 `계획 관리` entry에서 기존 출처 보기·재사용·보관 command에 접근한다. 보이는 `수정`과 관리 menu 안의 조정 action을 중복하지 않는다.
- 보관은 기존 personal lifecycle store와 undo를 사용하고 계획 목록으로 돌아간다. 마지막 active 계획이면 archived lens를 유지한다.
- archived lens는 기존 직접 `복구`와 영구 삭제 경계를 유지한다. 영구 삭제는 archived 계획에서만 경고와 기존 cleanup transaction을 거친다.
- 보관·복구·삭제 뒤 URL, 선택 항목, focus는 살아 있는 안정 target으로 수렴한다.

## Scope

- `/my` 기본 saved-plan library의 선택 계획과 공통 저장 편집기
- 네 출처 classification, common draft와 출처별 commit adapter
- 중첩 Item 편집, dirty discard, history/focus/scroll 복귀
- active 계획의 보관 진입과 archived 복구 회귀
- unit/component/E2E, 390/1024/1440 responsive matrix, storage/export 회귀
- 현재 control/status/service-ownership 문서

## Out of scope

- storage key/schema migration, account/cloud persistence, source mutation, version merge UI
- 새로운 export destination/format 또는 receipt owner
- Text Authoring `TA-01~TA-06`, Structured Checklist option B, creator/publish work
- `savedPlanLibrary=off`의 구형 UI 재설계
- commit, push, PR, merge, deployment, production smoke. 별도 Owner 승인 전에는 로컬 미게시 상태다.
- observed-user validation. 자동 QA와 내부 화면 검토와 별개이며 현재 관찰 사용자 수는 `0`이다.

## Acceptance criteria

1. 네 출처의 기본 `/my` 선택 계획에서 `my-plan-edit`가 같은 shared editor를 연다.
2. 항목 `계획에 반영` 전후에는 storage가 바뀌지 않고, 계획 `변경 저장` 뒤 reload에서만 편집 결과가 유지된다.
3. cancel/Escape/backdrop/browser Back의 clean·dirty 경로와 discard 문구·focus 복귀가 출처와 화면폭에 무관하게 같다.
4. canonical copy의 schema-v2 identity, Map의 map/child identity, draft의 source/overlay identity, legacy record의 schema variant가 보존된다.
5. 저장 뒤 Text/Todo/Calendar export가 같은 effective edited Item을 사용하며 source·execution·unrelated storage는 변하지 않는다.
6. 선택한 active 계획에서 보관에 도달하고, archived lens에서 reload 후 복구할 수 있다. 보관·복구는 기존 lifecycle key만 변경한다.
7. 관리 menu는 보이는 `수정`을 중복하지 않고 영구 삭제는 archived plan에만 남는다.
8. 390/1024/1440에서 네 출처의 공통 편집 shell, plan -> Item -> Back focus, clean cancel focus, overflow/clipping/sticky action을 검증한다.
9. focused unit/E2E, docs check, production build, 저장·export·lifecycle 관련 회귀가 현재 소스에서 통과한다.
10. 게시 상태와 observed-user evidence를 구현·자동 QA와 분리해 기록한다.

## Superseded UI boundary

[2026-07-05 개인 사본 결정](../../DECISIONS.md#2026-07-05---url-custom-starts-become-personal-my-flow-copies)의 source 보호, 개인 overlay, export, update 보존 규칙은 유지한다. 이 spec은 그 결정의 `quiet settings only` UI 제한만 다시 열어 공통 개인 계획 편집 surface로 대체한다. 이것은 source 편집이나 full version-management 승인이 아니다.
