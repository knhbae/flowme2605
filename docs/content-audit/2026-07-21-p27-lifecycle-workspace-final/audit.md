# P27 상세 감사

## 1. 감사 경계

이 감사는 `codex/p27-lifecycle-workspace`의 현재 implementation commit과 로컬 production build를 대상으로 한다. 이전 P26/P27 review, Claude Design `(10)`, Input Composer v1.1은 비교 자료다. 자동 테스트와 agent 시뮬레이션은 실제 사용자 관찰이 아니다.

## 2. 시작 상태

- 기준 브랜치: `origin/main` `63ea6416cf720d4e3015a48268a70aba8dfb4d0e`
- P27 구현 commit: `118dec90de9ddcfea2150e2279cc57d6dda53e8b`
- 구현 branch: `codex/p27-lifecycle-workspace`
- 원래 dirty worktree: 변경하지 않음
- 데이터 migration: additive lifecycle/resource overlay만 사용
- 4탭 IA: 유지

## 3. 사용자 문제별 판정

### 3.1 저장한 Flow와 Item 제거

판정: `supported_reversible`

- Flow 기본 제거는 `보관하기`다.
- 즉시 snackbar `되돌리기`와 새로고침 뒤 `보관된 Flow` 복구가 모두 존재한다.
- 보관은 saved record, personal overlay, execution history를 삭제하지 않는다.
- source Item은 source mutation 없이 personal exclusion으로 숨기고 복구한다.
- user-created Item은 기존 structural tombstone 계약을 사용한다.

영구 삭제는 기본 UI에서 의도적으로 제외했다.

### 3.2 홈트 4주와 반복 실행

판정: `supported_with_truthful_horizon`

- public preview는 `미리보기 4주`라고 표시한다.
- 같은 화면에 series end `종료일 없음`을 별도 표시한다.
- 저장 후 series definition과 occurrence execution이 분리된다.
- Calendar occurrence는 한 행, 한 완료 control을 사용한다.
- video URL은 완료 checkbox가 없는 resource다.

### 3.3 저장 전 조정

판정: `supported_progressive`

처음 구현은 24개 행에 checkbox, title, memo, date, reorder를 동시에 노출했다. 최종 visual inspection에서 여전히 과밀하다고 판단해 다음 네 모드로 다시 분리했다.

1. `항목 고르기`
2. `날짜`
3. `제목·메모`
4. `순서`

초기 `항목 고르기` mode에서 title/date/reorder input count는 모두 `0`이고 include checkbox만 활성화된다. 각 mode 변경값은 같은 personal overlay/order 계약에 저장되고 post-save outline에 반영된다.

### 3.4 My Flow 탐색과 전체 보기

판정: `supported_adaptive`

- 3개 fixture: compact library, search `0`, filter chrome `0`.
- 12개 fixture: search visible.
- 검색 결과 `가져가기`는 selected Flow scope를 바꾸고 전체 Flow workspace를 연다.
- `지금`은 같은 날짜를 한 frame으로 묶고 `Flow 목록`은 저장한 전체 Flow를 관리한다.
- 보관된 Flow는 일반 실행 목록과 Calendar에서 빠진다.

### 3.5 확인 항목과 자료

판정: `supported_contextual`

- source subcheck와 source resource는 별도 ownership을 유지한다.
- personal subcheck는 add/edit/remove/reorder가 가능하다.
- personal resource는 label/add/remove가 가능하다.
- source resource URL은 personal change로 덮어쓰지 않는다.
- subcheck completion과 task completion은 다른 control level이다.

### 3.6 Calendar

판정: `supported`

- scope filter는 grid, selected-day agenda, undated placement에 같은 projection을 사용한다.
- routine wrapper는 `role=group`, named label, `tabindex=-1`이다.
- nested icon은 accessible name을 가진다.
- 긴 undated title은 wide rail에서 ellipsis로 identity를 잃지 않는다.
- archive/exclusion은 Calendar membership에서 제외된다.

### 3.7 저장 결과와 export

판정: `supported_compact`

- receipt metrics와 action hub는 `compact` layout이다.
- 저장된 전체 Flow 5개 행이 first-save frame에 보인다.
- export panel은 처음에는 닫혀 있다.
- 열면 `Flow 전체 · 5개`, eligible Calendar count, detail/resource loss notice를 표시한다.
- 이전의 `1 범위 / 2 예상 결과 / 3 형식` 반복 문구는 없다.

## 4. 소유권 영향

| 계층 | P27 영향 |
| --- | --- |
| Source | canonical item, source resource, source schedule 불변 |
| Personal overlay | archive, source exclusion, nested subcheck/resource, save-before title/date/memo/order 변경 저장 |
| Execution run | completion/reopen/skip/hold 기록 불변 |
| Occurrence | preview horizon과 series end 분리, occurrence identity 유지 |
| Export | 기존 scope plan과 output receipt 사용, UI 재계산 없음 |

## 5. Evidence 수치

| Marker | 결과 | 근거 |
| --- | --- | --- |
| `activeEditOperationCount` | `1` | automated_browser, targeted_e2e |
| `flowArchivePreservesRunHistory` | `true` | targeted_e2e |
| `flowArchiveUndoVisible` | `true` | automated_browser, targeted_e2e |
| `flowArchivePersistentRestoreVisible` | `true` | targeted_e2e |
| `sourceItemMutationCount` | `0` | unit, targeted_e2e |
| `recurrencePreviewMutatesSeriesEndCount` | `0` | unit, automated_browser |
| `resourceCompletionLikeControlCount` | `0` | unit, automated_browser |
| `smallSetSearchChromeCount` | `0` | automated_browser |
| `searchResultOpensWholeFlowWorkspace` | `true` | targeted_e2e, automated_browser |
| `tabbableRoutineWrapperCount` | `0` | automated_browser |
| `horizontalOverflowCount` | `0` | automated_browser |
| `consolePageErrorCount` | `0` | automated_browser |
| `unnamedVisibleControlCount` | `0` | automated_browser |

## 6. 검증

| 명령/검증 | 결과 |
| --- | --- |
| `npm.cmd test` | pretest `24/24`, unit `571/571` |
| `npm.cmd run build` | pass, 18 routes |
| `npm.cmd run test:e2e -- tests/e2e/p27-foundation.spec.ts --workers=1` | `12/12` |
| `npm.cmd run test:e2e -- --workers=1` | `339/339` |
| final browser capture | 8 app screenshots, overflow/error/unnamed control 0 |
| review board render | mobile/wide 2 screenshots, overflow/console error 0 |
| `git diff --check` | errors 0; Windows line-ending warnings only |

## 7. 실제 사용자에게 남은 질문

1. 저장 전 조정을 열었을 때 첫 mode가 `항목 고르기`인 것이 자연스러운가?
2. 저장한 Flow가 적을 때 검색이 없는 것이 더 쉬운가, 아니면 검색 위치를 찾지 못하는가?
3. `보관하기`를 삭제 대안으로 이해하는가?
4. `미리보기 4주`와 `종료일 없음`을 다른 의미로 이해하는가?
5. 영상과 확인 항목의 위치를 설명 없이 구분하는가?

이 질문은 구현 회귀가 아니라 observed-user gate다. 현재 관찰 수는 `0`이다.
